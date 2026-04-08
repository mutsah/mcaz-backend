import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { KycService } from '../kyc/kyc.service';
import { buildAmortizationSchedule } from './amortization.util';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { QueryAdminLoansDto } from './dto/query-admin-loans.dto';
import { ReviewLoanDto } from './dto/review-loan.dto';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kycService: KycService,
  ) {}

  async apply(userId: string, dto: ApplyLoanDto) {
    await this.kycService.assertUserKycApproved(userId);

    const activeLoan = await this.prisma.loan.findFirst({
      where: { userId, status: LoanStatus.ACTIVE },
      select: { id: true },
    });

    if (activeLoan) {
      throw new BadRequestException(
        'Only one active loan is allowed at a time',
      );
    }

    return this.prisma.loan.create({
      data: {
        userId,
        principal: new Prisma.Decimal(dto.principal),
        termMonths: dto.termMonths,
        purpose: dto.purpose,
        status: LoanStatus.PENDING,
      },
    });
  }

  async myLoans(userId: string) {
    return this.prisma.loan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(loanId: string, requester: { id: string; role: Role }) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        schedule: {
          orderBy: { installmentNo: 'asc' },
        },
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    this.assertOwnerOrAdmin(loan.userId, requester);

    const [interestAgg, unpaidPrincipalAgg, nextInstallment] =
      await Promise.all([
        this.prisma.interestLedger.aggregate({
          _sum: { dailyInterest: true },
          where: { loanId },
        }),
        this.prisma.amortizationSchedule.aggregate({
          _sum: { principalDue: true },
          where: { loanId, paid: false },
        }),
        this.prisma.amortizationSchedule.findFirst({
          where: { loanId, paid: false },
          orderBy: { dueDate: 'asc' },
        }),
      ]);

    return {
      ...loan,
      dashboard: {
        outstandingPrincipal:
          unpaidPrincipalAgg._sum.principalDue?.toNumber() ??
          loan.principal.toNumber(),
        accruedInterestToDate: interestAgg._sum.dailyInterest?.toNumber() ?? 0,
        nextPaymentDue: nextInstallment?.dueDate ?? null,
      },
    };
  }

  async getSchedule(loanId: string, requester: { id: string; role: Role }) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    this.assertOwnerOrAdmin(loan.userId, requester);

    return this.prisma.amortizationSchedule.findMany({
      where: { loanId },
      orderBy: { installmentNo: 'asc' },
    });
  }

  async getInterestLedger(
    loanId: string,
    requester: { id: string; role: Role },
  ) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    this.assertOwnerOrAdmin(loan.userId, requester);

    return this.prisma.interestLedger.findMany({
      where: { loanId },
      orderBy: { date: 'desc' },
    });
  }

  async adminAll(query: QueryAdminLoansDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where = query.status ? { status: query.status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.loan.count({ where }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminReview(loanId: string, dto: ReviewLoanDto) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    if (loan.status !== LoanStatus.PENDING) {
      throw new BadRequestException('Only pending loans can be reviewed');
    }

    if (dto.status === LoanStatus.REJECTED) {
      return this.prisma.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.REJECTED,
        },
      });
    }

    if (dto.annualRate === undefined) {
      throw new BadRequestException(
        'annualRate is required when approving a loan',
      );
    }
    const annualRate = dto.annualRate;

    const disbursedAt = new Date();
    const schedule = buildAmortizationSchedule(
      loan.principal.toNumber(),
      annualRate,
      loan.termMonths,
      disbursedAt,
    );

    return this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: LoanStatus.ACTIVE,
          annualRate: new Prisma.Decimal(annualRate),
          disbursedAt,
        },
      });

      await tx.amortizationSchedule.createMany({
        data: schedule.map((row) => ({
          loanId,
          installmentNo: row.installmentNo,
          dueDate: row.dueDate,
          principalDue: new Prisma.Decimal(row.principalDue),
          interestDue: new Prisma.Decimal(row.interestDue),
          totalDue: new Prisma.Decimal(row.totalDue),
          paid: false,
        })),
      });

      return updatedLoan;
    });
  }

  async accrueDailyInterest(date = new Date()) {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const activeLoans = await this.prisma.loan.findMany({
      where: { status: LoanStatus.ACTIVE },
      select: { id: true, annualRate: true, principal: true },
    });

    for (const loan of activeLoans) {
      const alreadyLogged = await this.prisma.interestLedger.findUnique({
        where: { loanId_date: { loanId: loan.id, date: normalizedDate } },
      });

      if (alreadyLogged || !loan.annualRate) {
        continue;
      }

      const unpaidPrincipal = await this.prisma.amortizationSchedule.aggregate({
        _sum: { principalDue: true },
        where: { loanId: loan.id, paid: false },
      });

      const balance =
        unpaidPrincipal._sum.principalDue?.toNumber() ??
        loan.principal.toNumber();
      const dailyRate = loan.annualRate.toNumber() / 365;
      const dailyInterest = balance * dailyRate;

      await this.prisma.interestLedger.create({
        data: {
          loanId: loan.id,
          date: normalizedDate,
          dailyInterest: new Prisma.Decimal(dailyInterest.toFixed(6)),
          balanceSnapshot: new Prisma.Decimal(balance.toFixed(2)),
        },
      });
    }

    return { processed: activeLoans.length, date: normalizedDate };
  }

  private assertOwnerOrAdmin(
    ownerId: string,
    requester: { id: string; role: Role },
  ) {
    if (requester.role !== Role.ADMIN && requester.id !== ownerId) {
      throw new ForbiddenException('You do not have access to this loan');
    }
  }
}
