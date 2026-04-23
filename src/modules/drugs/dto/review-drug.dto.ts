import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewDrugDto {
  @ApiProperty({
    description: 'Optional note for approval or rejection',
    example: 'All documentation verified',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
