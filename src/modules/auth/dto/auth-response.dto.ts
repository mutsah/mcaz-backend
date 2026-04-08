// Data Transfer Object for authentication response

import { ApiProperty } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

export class AuthResponseDto {
  @ApiProperty({
    description: 'The access token for the user',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ98...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'The refresh token for the user',
    example: 'd1f2e3c4b5a6g7h8i9j0k1l2m3n4o5p6q7r81..',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'The user information associated with the tokens',
    example: {
      id: '12345',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+263771234567',
      role: 'USER',
      status: 'VERIFIED',
    },
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: Role;
    status: UserStatus;
  };
}
