import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApplicationStatus, DosageForm } from '@prisma/client';

export class DrugStatusActorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;
}

export class DrugStatusHistoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ApplicationStatus })
  status: ApplicationStatus;

  @ApiPropertyOptional()
  changedBy: string | null;

  @ApiPropertyOptional({ type: DrugStatusActorDto })
  changedByUser?: DrugStatusActorDto | null;

  @ApiPropertyOptional()
  note: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class DrugResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Amoxicillin' })
  genericName: string;

  @ApiProperty({ example: '500mg' })
  strength: string;

  @ApiProperty({ enum: DosageForm })
  dosageForm: DosageForm;

  @ApiProperty({ example: 'ZIM0001S' })
  registrationNumber: string;

  @ApiProperty({ example: 'South Africa' })
  countryOfOrigin: string;

  @ApiProperty({ enum: ApplicationStatus })
  status: ApplicationStatus;

  @ApiProperty({ description: 'User ID of the person who captured this drug' })
  capturedBy: string;

  @ApiPropertyOptional({ type: DrugStatusActorDto })
  capturedByUser?: DrugStatusActorDto | null;

  @ApiPropertyOptional({
    description: 'User ID of the person who approved/rejected',
  })
  approvedBy: string | null;

  @ApiPropertyOptional({ type: DrugStatusActorDto })
  approvedByUser?: DrugStatusActorDto | null;

  @ApiProperty()
  dateCaptured: Date;

  @ApiPropertyOptional()
  dateApproved: Date | null;

  @ApiProperty({ description: 'Expiry date (3 years from date captured)' })
  expiryDate: Date;

  @ApiPropertyOptional({
    description: 'Number of days in PENDING status (only for pending drugs)',
  })
  daysInPending?: number;

  @ApiProperty({ type: [DrugStatusHistoryDto] })
  statusHistory: DrugStatusHistoryDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class DrugListResponseDto {
  @ApiProperty({ type: [DrugResponseDto] })
  items: DrugResponseDto[];

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}
