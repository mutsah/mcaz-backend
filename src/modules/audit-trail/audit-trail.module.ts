import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuditTrailController } from './audit-trail.controller';
import { AuditTrailInterceptor } from './audit-trail.interceptor';
import { AuditTrailService } from './audit-trail.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuditTrailController],
  providers: [
    AuditTrailService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditTrailInterceptor,
    },
  ],
  exports: [AuditTrailService],
})
export class AuditTrailModule {}
