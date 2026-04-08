import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { KycService } from './kyc.service';
import { UploadService } from '../upload/upload.service';
import { QueryKycQueueDto } from './dto/query-kyc-queue.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';

@ApiTags('kyc')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('kyc')
export class KycController {
  constructor(
    private readonly kycService: KycService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('submit')
  @Roles(Role.USER)
  @ApiOperation({
    summary: 'Submit KYC documents (upload files + save record)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['documentType', 'frontFile'],
      properties: {
        documentType: {
          type: 'string',
          enum: ['NATIONAL_ID', 'PASSPORT'],
          example: 'NATIONAL_ID',
        },
        frontFile: {
          type: 'string',
          format: 'binary',
          description: 'Front side of the document',
        },
        backFile: {
          type: 'string',
          format: 'binary',
          description: 'Back side (optional for passports)',
        },
      },
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'frontFile', maxCount: 1 },
        { name: 'backFile', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
          const allowed = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
          ];
          if (!allowed.includes(file.mimetype)) {
            return cb(
              new BadRequestException(
                'Only jpeg, png, webp, and pdf files are allowed',
              ),
              false,
            );
          }
          cb(null, true);
        },
      },
    ),
  )
  async submit(
    @GetUser('id') userId: string,
    @Body() dto: SubmitKycDto,
    @UploadedFiles()
    files: {
      frontFile?: Express.Multer.File[];
      backFile?: Express.Multer.File[];
    },
  ) {
    if (!files?.frontFile?.[0]) {
      throw new BadRequestException('Front document file is required');
    }

    const frontFileUrl = await this.uploadService.upload(
      files.frontFile[0],
      'kyc',
    );
    const backFileUrl = files.backFile?.[0]
      ? await this.uploadService.upload(files.backFile[0], 'kyc')
      : undefined;

    return this.kycService.submit(userId, dto, frontFileUrl, backFileUrl);
  }

  @Get('status')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Get own KYC status history' })
  async status(@GetUser('id') userId: string) {
    return this.kycService.getOwnStatus(userId);
  }

  @Get('admin/queue')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List pending KYC submissions' })
  async adminQueue(@Query() query: QueryKycQueueDto) {
    return this.kycService.getAdminQueue(query);
  }

  @Get('admin/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get one KYC submission detail' })
  async adminOne(@Param('id') id: string) {
    return this.kycService.getAdminById(id);
  }

  @Patch('admin/:id/review')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve/reject KYC submission' })
  async review(
    @Param('id') id: string,
    @GetUser('id') adminId: string,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.review(id, adminId, dto);
  }

  @Get('file/:id/:side')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get KYC document URL' })
  async file(@Param('id') id: string, @Param('side') side: 'front' | 'back') {
    const submission = await this.kycService.getAdminById(id);
    const fileUrl =
      side === 'front' ? submission.frontFilePath : submission.backFilePath;

    if (!fileUrl) {
      throw new BadRequestException('File not found');
    }

    return { url: fileUrl };
  }
}
