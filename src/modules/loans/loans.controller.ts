import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { ApplyLoanDto } from './dto/apply-loan.dto';
import { QueryAdminLoansDto } from './dto/query-admin-loans.dto';
import { ReviewLoanDto } from './dto/review-loan.dto';
import { LoansService } from './loans.service';

@ApiTags('loans')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post('apply')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Apply for a loan' })
  async apply(@GetUser('id') userId: string, @Body() dto: ApplyLoanDto) {
    return this.loansService.apply(userId, dto);
  }

  @Get('my')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'List current user loans' })
  async myLoans(@GetUser('id') userId: string) {
    return this.loansService.myLoans(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan detail with dashboard totals' })
  async one(
    @Param('id') id: string,
    @GetUser() requester: { id: string; role: Role },
  ) {
    return this.loansService.findOneForUser(id, requester);
  }

  @Get(':id/schedule')
  @ApiOperation({ summary: 'Get full amortization schedule' })
  async schedule(
    @Param('id') id: string,
    @GetUser() requester: { id: string; role: Role },
  ) {
    return this.loansService.getSchedule(id, requester);
  }

  @Get(':id/interest')
  @ApiOperation({ summary: 'Get daily interest ledger entries' })
  async interest(
    @Param('id') id: string,
    @GetUser() requester: { id: string; role: Role },
  ) {
    return this.loansService.getInterestLedger(id, requester);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all loans with filters (admin)' })
  async adminAll(@Query() query: QueryAdminLoansDto) {
    return this.loansService.adminAll(query);
  }

  @Patch('admin/:id/review')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve/reject pending loan (admin)' })
  async adminReview(@Param('id') id: string, @Body() dto: ReviewLoanDto) {
    return this.loansService.adminReview(id, dto);
  }
}
