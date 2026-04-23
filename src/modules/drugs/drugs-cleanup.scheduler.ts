import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DrugsService } from './drugs.service';

@Injectable()
export class DrugsCleanupScheduler {
  private readonly logger = new Logger(DrugsCleanupScheduler.name);

  constructor(private readonly drugsService: DrugsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async deleteStalePendingApplications(): Promise<void> {
    this.logger.log(
      'Running scheduled cleanup of stale PENDING drug applications...',
    );
    const deleted = await this.drugsService.cleanupStalePending();
    this.logger.log(
      `Cleanup complete. Deleted ${deleted} stale application(s).`,
    );
  }
}
