import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuditTrailService } from './audit-trail.service';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';
import { AuditLogListResponseDto } from './dto/audit-log-response.dto';

@ApiTags('audit-trail')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-trail')
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  @Get('admin/list')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all audit trail activity (admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Audit trail retrieved successfully.',
    type: AuditLogListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async findAll(
    @Query() query: QueryAuditLogsDto,
  ): Promise<AuditLogListResponseDto> {
    return this.auditTrailService.findAllForAdmin(query);
  }
}
