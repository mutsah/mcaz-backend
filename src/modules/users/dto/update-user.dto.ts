import { ApiProperty } from '@nestjs/swagger';
import { IsMobilePhone, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ description: 'User first name', example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({
    description: 'User phone',
    example: '+263771234567',
    required: false,
  })
  @IsOptional()
  @IsMobilePhone(
    undefined,
    {},
    { message: 'Please provide a valid phone number' },
  )
  phone?: string;
}
