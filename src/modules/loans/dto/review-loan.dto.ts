import { ApiProperty } from '@nestjs/swagger';
import { LoanStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class ReviewLoanDto {
  @ApiProperty({
    enum: [LoanStatus.ACTIVE, LoanStatus.REJECTED],
    example: LoanStatus.ACTIVE,
  })
  @IsEnum(LoanStatus)
  status: 'ACTIVE' | 'REJECTED';

  @ApiProperty({ required: false, example: 0.18 })
  @IsOptional()
  @ValidateIf((dto) => dto.status === LoanStatus.ACTIVE)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  annualRate?: number;
}
