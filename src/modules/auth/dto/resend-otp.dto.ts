import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;
}
