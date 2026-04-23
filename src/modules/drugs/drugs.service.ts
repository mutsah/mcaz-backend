import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomInt } from 'crypto';
import { ApplicationStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CaptureDrugDto } from './dto/capture-drug.dto';
import { DrugListResponseDto, DrugResponseDto } from './dto/drug-response.dto';
import { QueryDrugsDto } from './dto/query-drugs.dto';
import { ReviewDrugDto } from './dto/review-drug.dto';

@Injectable()
export class DrugsService {
  private readonly logger = new Logger(DrugsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async capture(
    dto: CaptureDrugDto,
    capturedBy: string,
  ): Promise<DrugResponseDto> {
    const dateCaptured = new Date();
    const expiryDate = new Date(dateCaptured);
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);

    const maxAttempts = 50;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const registrationNumber = this.generateRegistrationNumber();

      try {
        const drug = await this.prisma.drug.create({
          data: {
            genericName: dto.genericName,
            strength: dto.strength,
            dosageForm: dto.dosageForm,
            registrationNumber,
            countryOfOrigin: dto.countryOfOrigin,
            status: ApplicationStatus.PENDING,
            capturedBy,
            dateCaptured,
            expiryDate,
            statusHistory: {
              create: {
                status: ApplicationStatus.PENDING,
                changedBy: capturedBy,
                note: 'Application submitted',
              },
            },
          },
          include: this.drugInclude,
        });

        return this.mapToDto(drug);
      } catch (error) {
        if (this.isUniqueConstraintViolation(error)) {
          continue;
        }
        throw error;
      }
    }

    throw new ConflictException(
      'Unable to generate a unique registration number. Please retry.',
    );
  }

  async findAll(query: QueryDrugsDto): Promise<DrugListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = this.buildCapturedDateWhere(query);

    const [drugs, total] = await this.prisma.$transaction([
      this.prisma.drug.findMany({
        where,
        include: this.drugInclude,
        orderBy: { dateCaptured: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.drug.count({ where }),
    ]);

    return {
      items: drugs.map((d) => this.mapToDto(d)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<DrugResponseDto> {
    const drug = await this.prisma.drug.findUnique({
      where: { id },
      include: this.drugInclude,
    });
    if (!drug) throw new NotFoundException('Drug application not found');
    return this.mapToDto(drug);
  }

  async approve(
    id: string,
    dto: ReviewDrugDto,
    adminId: string,
  ): Promise<DrugResponseDto> {
    const drug = await this.prisma.drug.findUnique({ where: { id } });
    if (!drug) throw new NotFoundException('Drug application not found');
    if (drug.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING applications can be approved. Current status: ${drug.status}`,
      );
    }

    const now = new Date();
    const updated = await this.prisma.drug.update({
      where: { id },
      data: {
        status: ApplicationStatus.APPROVED,
        approvedBy: adminId,
        dateApproved: now,
        statusHistory: {
          create: {
            status: ApplicationStatus.APPROVED,
            changedBy: adminId,
            note: dto.note,
          },
        },
      },
      include: this.drugInclude,
    });

    return this.mapToDto(updated);
  }

  async reject(
    id: string,
    dto: ReviewDrugDto,
    adminId: string,
  ): Promise<DrugResponseDto> {
    const drug = await this.prisma.drug.findUnique({ where: { id } });
    if (!drug) throw new NotFoundException('Drug application not found');
    if (drug.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING applications can be rejected. Current status: ${drug.status}`,
      );
    }

    const updated = await this.prisma.drug.update({
      where: { id },
      data: {
        status: ApplicationStatus.REJECTED,
        approvedBy: adminId,
        dateApproved: new Date(),
        statusHistory: {
          create: {
            status: ApplicationStatus.REJECTED,
            changedBy: adminId,
            note: dto.note,
          },
        },
      },
      include: this.drugInclude,
    });

    return this.mapToDto(updated);
  }

  async getTrackingReport(query: QueryDrugsDto): Promise<DrugListResponseDto> {
    if (!query.from || !query.to) {
      throw new BadRequestException(
        'Both "from" and "to" date parameters are required for the tracking report',
      );
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = this.buildProcessedDateWhere(query);

    const [drugs, total] = await this.prisma.$transaction([
      this.prisma.drug.findMany({
        where,
        include: this.drugInclude,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.drug.count({ where }),
    ]);

    return {
      items: drugs.map((drug) => this.mapToDto(drug)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async cleanupStalePending(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 5);

    const result = await this.prisma.drug.deleteMany({
      where: {
        status: ApplicationStatus.PENDING,
        dateCaptured: { lt: cutoff },
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Auto-deleted ${result.count} stale PENDING drug application(s) older than 5 days`,
      );
    }

    return result.count;
  }

  private readonly drugInclude = {
    capturer: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    },
    approver: {
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    },
    statusHistory: {
      orderBy: { createdAt: 'asc' as const },
      include: {
        actor: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    },
  } satisfies Prisma.DrugInclude;

  private buildCapturedDateWhere(query: QueryDrugsDto): Prisma.DrugWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.from || query.to
        ? {
            dateCaptured: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to
                ? { lte: new Date(query.to + 'T23:59:59.999Z') }
                : {}),
            },
          }
        : {}),
    };
  }

  private buildProcessedDateWhere(query: QueryDrugsDto): Prisma.DrugWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      statusHistory: {
        some: {
          createdAt: {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to + 'T23:59:59.999Z') } : {}),
          },
        },
      },
    };
  }

  private generateRegistrationNumber(): string {
    const digits = randomInt(0, 10000).toString().padStart(4, '0');
    const letter = String.fromCharCode(65 + randomInt(0, 26));
    return `ZIM${digits}${letter}`;
  }

  private isUniqueConstraintViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }

  private mapToDto(drug: any): DrugResponseDto {
    const dto: DrugResponseDto = {
      id: drug.id,
      genericName: drug.genericName,
      strength: drug.strength,
      dosageForm: drug.dosageForm,
      registrationNumber: drug.registrationNumber,
      countryOfOrigin: drug.countryOfOrigin,
      status: drug.status,
      capturedBy: drug.capturedBy,
      capturedByUser: drug.capturer
        ? {
            id: drug.capturer.id,
            email: drug.capturer.email,
            firstName: drug.capturer.firstName,
            lastName: drug.capturer.lastName,
          }
        : null,
      approvedBy: drug.approvedBy ?? null,
      approvedByUser: drug.approver
        ? {
            id: drug.approver.id,
            email: drug.approver.email,
            firstName: drug.approver.firstName,
            lastName: drug.approver.lastName,
          }
        : null,
      dateCaptured: drug.dateCaptured,
      dateApproved: drug.dateApproved ?? null,
      expiryDate: drug.expiryDate,
      statusHistory: (drug.statusHistory ?? []).map((h: any) => ({
        id: h.id,
        status: h.status,
        changedBy: h.changedBy ?? null,
        changedByUser: h.actor
          ? {
              id: h.actor.id,
              email: h.actor.email,
              firstName: h.actor.firstName,
              lastName: h.actor.lastName,
            }
          : null,
        note: h.note ?? null,
        createdAt: h.createdAt,
      })),
      createdAt: drug.createdAt,
      updatedAt: drug.updatedAt,
    };

    if (drug.status === ApplicationStatus.PENDING) {
      const msPerDay = 1000 * 60 * 60 * 24;
      dto.daysInPending = Math.floor(
        (Date.now() - new Date(drug.dateCaptured).getTime()) / msPerDay,
      );
    }

    return dto;
  }
}
