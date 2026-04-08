import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { KycStatus, Role } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryKycQueueDto } from './dto/query-kyc-queue.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

  async submit(
    userId: string,
    dto: SubmitKycDto,
    frontFileUrl: string,
    backFileUrl?: string,
  ) {
    return this.prisma.kycSubmission.create({
      data: {
        userId,
        documentType: dto.documentType,
        frontFilePath: frontFileUrl,
        backFilePath: backFileUrl ?? null,
        status: KycStatus.SUBMITTED,
      },
    });
  }

  async getOwnStatus(userId: string) {
    return this.prisma.kycSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminQueue(query: QueryKycQueueDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.kycSubmission.findMany({
        where: { status: KycStatus.SUBMITTED },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.kycSubmission.count({
        where: { status: KycStatus.SUBMITTED },
      }),
    ]);

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminById(id: string) {
    const submission = await this.prisma.kycSubmission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('KYC submission not found');
    }

    return {
      ...submission,
      frontFileUrl: `/api/kyc/file/${submission.id}/front`,
      backFileUrl: submission.backFilePath
        ? `/api/kyc/file/${submission.id}/back`
        : null,
    };
  }

  async review(id: string, adminId: string, dto: ReviewKycDto) {
    const submission = await this.prisma.kycSubmission.findUnique({
      where: { id },
    });
    if (!submission) {
      throw new NotFoundException('KYC submission not found');
    }

    if (submission.status !== KycStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted KYC can be reviewed');
    }

    return this.prisma.$transaction(async (tx) => {
      const reviewed = await tx.kycSubmission.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedBy: adminId,
          rejectionNote:
            dto.status === KycStatus.REJECTED ? dto.rejectionNote : null,
        },
      });

      if (dto.status === KycStatus.APPROVED) {
        await tx.user.update({
          where: { id: submission.userId },
          data: { status: 'VERIFIED' },
        });
      }

      return reviewed;
    });
  }

  async assertUserKycApproved(userId: string): Promise<void> {
    const latest = await this.prisma.kycSubmission.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { status: true },
    });

    if (!latest) {
      throw new ForbiddenException(
        'You must submit KYC before applying for a loan',
      );
    }

    if (latest.status === KycStatus.SUBMITTED) {
      throw new ForbiddenException(
        'Your KYC is still under review. Loan application is not allowed yet',
      );
    }

    if (latest.status === KycStatus.REJECTED) {
      throw new ForbiddenException(
        'Your KYC was rejected. Update and get approval before applying for a loan',
      );
    }
  }

  async assertAdmin(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user || user.role !== Role.ADMIN) {
      throw new BadRequestException('Admin role required');
    }
  }
}
