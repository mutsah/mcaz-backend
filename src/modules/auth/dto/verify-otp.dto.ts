import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail({}, { message: 'Valid email is required' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}
