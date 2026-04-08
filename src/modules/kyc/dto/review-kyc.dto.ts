import { ApiProperty } from '@nestjs/swagger';
import { KycStatus } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class ReviewKycDto {
  @ApiProperty({
    enum: [KycStatus.APPROVED, KycStatus.REJECTED],
    example: KycStatus.APPROVED,
  })
  @IsEnum(KycStatus)
  status: 'APPROVED' | 'REJECTED';

  @ApiProperty({
    required: false,
    example: 'Please upload a clearer back image.',
  })
  @IsOptional()
  @ValidateIf((dto) => dto.status === KycStatus.REJECTED)
  @IsString()
  @MaxLength(500)
  rejectionNote?: string;
}
