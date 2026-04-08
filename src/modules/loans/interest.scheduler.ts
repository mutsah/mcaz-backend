import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LoansService } from './loans.service';

@Injectable()
export class InterestScheduler {
  private readonly logger = new Logger(InterestScheduler.name);

  constructor(private readonly loansService: LoansService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async accrueDailyInterest() {
    const result = await this.loansService.accrueDailyInterest();
    this.logger.log(
      `Daily interest accrual complete for ${result.processed} active loans on ${result.date.toISOString().slice(0, 10)}`,
    );
  }
}
