import { ApiProperty } from '@nestjs/swagger';
import { KycDocumentType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class SubmitKycDto {
  @ApiProperty({ enum: KycDocumentType, example: KycDocumentType.NATIONAL_ID })
  @IsEnum(KycDocumentType)
  documentType: KycDocumentType;
}
