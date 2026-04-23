import { ApiProperty } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  lastName: string;

  @ApiProperty({ description: 'User phone number', example: '+263771234567' })
  phone: string;

  @ApiProperty({ enum: Role, example: 'USER' })
  role: Role;

  @ApiProperty({ enum: UserStatus, example: 'VERIFIED' })
  status: UserStatus;

  @ApiProperty({
    description: 'User created date',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User updated date',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}

export class AdminUserSummaryDto extends UserResponseDto {}

export class AdminUserListResponseDto {
  @ApiProperty({ type: [AdminUserSummaryDto] })
  items: AdminUserSummaryDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;
}
