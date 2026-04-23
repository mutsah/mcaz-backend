import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DrugsCleanupScheduler } from './drugs-cleanup.scheduler';
import { DrugsController } from './drugs.controller';
import { DrugsService } from './drugs.service';

@Module({
  imports: [PrismaModule],
  controllers: [DrugsController],
  providers: [DrugsService, DrugsCleanupScheduler],
  exports: [DrugsService],
})
export class DrugsModule {}
