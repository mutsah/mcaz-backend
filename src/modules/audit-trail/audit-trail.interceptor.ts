import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { AuditTrailService } from './audit-trail.service';

const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'otp',
  'otphash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'secret',
  'pass',
]);

@Injectable()
export class AuditTrailInterceptor implements NestInterceptor {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse();
    const startedAt = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const path = this.normalizePath(request.originalUrl ?? request.url);
        const actorId = request.user?.id;

        void this.auditTrailService.logActivity({
          actorId,
          action: `${request.method} ${path}`,
          method: request.method,
          path,
          statusCode: response.statusCode,
          responseTimeMs: Date.now() - startedAt,
          ipAddress: this.extractIpAddress(request),
          userAgent: request.get?.('user-agent') ?? undefined,
          metadata: {
            params: this.redactValue(request.params ?? {}),
            query: this.redactValue(request.query ?? {}),
            body: this.redactValue(request.body ?? {}),
          } as Prisma.InputJsonValue,
        });
      }),
    );
  }

  private normalizePath(path: string): string {
    return path.split('?')[0] || '/';
  }

  private extractIpAddress(request: RequestWithUser): string | undefined {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0];
    }

    if (typeof forwardedFor === 'string') {
      return forwardedFor.split(',')[0]?.trim();
    }

    return request.ip;
  }

  private redactValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redactValue(item));
    }

    if (typeof value !== 'object') {
      return value;
    }

    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, unknown>
    >((accumulator, [key, nestedValue]) => {
      const normalizedKey = key.toLowerCase();

      accumulator[key] = REDACTED_KEYS.has(normalizedKey)
        ? '[REDACTED]'
        : this.redactValue(nestedValue);

      return accumulator;
    }, {});
  }
}
