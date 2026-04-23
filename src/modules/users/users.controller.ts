import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UsersService } from './users.service';
import {
  AdminUserListResponseDto,
  UserResponseDto,
} from './dto/user-response.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { QueryUsersDto } from './dto/query-users.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getProfile(@GetUser('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.findOne(userId);
  }

  @Get('admin/list')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get all users (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Users with summary retrieved successfully.',
    type: AdminUserListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(
    @Query() query: QueryUsersDto,
  ): Promise<AdminUserListResponseDto> {
    return this.usersService.findAllForAdmin(query);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully.',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  async updateProfile(
    @GetUser('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(userId, updateUserDto);
  }
}
