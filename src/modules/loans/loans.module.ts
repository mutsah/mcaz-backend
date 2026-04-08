import { Module } from '@nestjs/common';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';
import { InterestScheduler } from './interest.scheduler';
import { KycModule } from '../kyc/kyc.module';

@Module({
  imports: [KycModule],
  controllers: [LoansController],
  providers: [LoansService, InterestScheduler],
})
export class LoansModule {}
