import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import {
  AuditLogListResponseDto,
  AuditLogResponseDto,
} from './dto/audit-log-response.dto';

type AuditLogPayload = {
  actorId?: string;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  responseTimeMs: number;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditTrailService {
  private readonly logger = new Logger(AuditTrailService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logActivity(payload: AuditLogPayload): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: payload.actorId,
          action: payload.action,
          method: payload.method,
          path: payload.path,
          statusCode: payload.statusCode,
          responseTimeMs: payload.responseTimeMs,
          ipAddress: payload.ipAddress,
          userAgent: payload.userAgent,
          metadata: payload.metadata,
        },
      });
    } catch (error) {
      this.logger.error('Failed to persist audit log', error as Error);
    }
  }

  async findAllForAdmin(
    query: QueryAuditLogsDto,
  ): Promise<AuditLogListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const fromDate = query.from
      ? this.parseQueryDate(query.from, false)
      : undefined;
    const toDate = query.to ? this.parseQueryDate(query.to, true) : undefined;

    const where: Prisma.AuditLogWhereInput = {
      ...(query.method ? { method: query.method } : {}),
      ...(query.statusCode ? { statusCode: query.statusCode } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { path: { contains: query.search, mode: 'insensitive' } },
              { action: { contains: query.search, mode: 'insensitive' } },
              {
                actor: {
                  is: {
                    email: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
              {
                actor: {
                  is: {
                    firstName: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
              {
                actor: {
                  is: {
                    lastName: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      data: logs as AuditLogResponseDto[],
    };
  }

  private parseQueryDate(value: string, isEndBoundary: boolean): Date {
    const hasTimeComponent = value.includes('T');

    if (!hasTimeComponent) {
      const boundary = isEndBoundary ? 'T23:59:59.999Z' : 'T00:00:00.000Z';
      return new Date(`${value}${boundary}`);
    }

    return new Date(value);
  }
}
