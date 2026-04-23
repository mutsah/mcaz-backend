import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { CaptureDrugDto } from './dto/capture-drug.dto';
import { DrugListResponseDto, DrugResponseDto } from './dto/drug-response.dto';
import { QueryDrugsDto } from './dto/query-drugs.dto';
import { ReviewDrugDto } from './dto/review-drug.dto';
import { DrugsService } from './drugs.service';

@ApiTags('drugs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @Post()
  @ApiOperation({ summary: 'Capture a new drug/medicine application' })
  @ApiBody({ type: CaptureDrugDto })
  @ApiResponse({ status: 201, type: DrugResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({
    status: 409,
    description: 'Registration number already exists',
  })
  async capture(
    @Body() dto: CaptureDrugDto,
    @GetUser('id') userId: string,
  ): Promise<DrugResponseDto> {
    return this.drugsService.capture(dto, userId);
  }

  @Get()
  @ApiOperation({
    summary:
      'List all drug applications, optionally filtered by status or date range',
  })
  @ApiResponse({ status: 200, type: DrugListResponseDto })
  async findAll(@Query() query: QueryDrugsDto): Promise<DrugListResponseDto> {
    return this.drugsService.findAll(query);
  }

  @Get('report')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Generate tracking report for applications within a date range (admin only)',
  })
  @ApiResponse({ status: 200, type: DrugListResponseDto })
  async trackingReport(
    @Query() query: QueryDrugsDto,
  ): Promise<DrugListResponseDto> {
    return this.drugsService.getTrackingReport(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single drug application with full status history',
  })
  @ApiParam({ name: 'id', description: 'Drug application UUID' })
  @ApiResponse({ status: 200, type: DrugResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DrugResponseDto> {
    return this.drugsService.findOne(id);
  }

  @Patch(':id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve a pending drug application (admin only)' })
  @ApiParam({ name: 'id', description: 'Drug application UUID' })
  @ApiBody({ type: ReviewDrugDto })
  @ApiResponse({ status: 200, type: DrugResponseDto })
  @ApiResponse({ status: 400, description: 'Application is not PENDING' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDrugDto,
    @GetUser('id') adminId: string,
  ): Promise<DrugResponseDto> {
    return this.drugsService.approve(id, dto, adminId);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reject a pending drug application (admin only)' })
  @ApiParam({ name: 'id', description: 'Drug application UUID' })
  @ApiBody({ type: ReviewDrugDto })
  @ApiResponse({ status: 200, type: DrugResponseDto })
  @ApiResponse({ status: 400, description: 'Application is not PENDING' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewDrugDto,
    @GetUser('id') adminId: string,
  ): Promise<DrugResponseDto> {
    return this.drugsService.reject(id, dto, adminId);
  }
}
