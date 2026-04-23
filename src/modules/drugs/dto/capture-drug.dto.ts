import { ApiProperty } from '@nestjs/swagger';
import { DosageForm } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CaptureDrugDto {
  @ApiProperty({
    description: 'Generic name of the drug',
    example: 'Amoxicillin',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  genericName: string;

  @ApiProperty({
    description: 'Strength of the drug (e.g., 5g, 2mg, 100ml)',
    example: '500mg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  strength: string;

  @ApiProperty({
    enum: DosageForm,
    description: 'Dosage form of the drug',
    example: 'ORAL',
  })
  @IsEnum(DosageForm)
  dosageForm: DosageForm;

  @ApiProperty({ description: 'Country of origin', example: 'Zimbabwe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  countryOfOrigin: string;
}
