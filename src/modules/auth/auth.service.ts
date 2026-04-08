import {
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { OtpType, UserStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 12;
  private readonly OTP_TTL_MINUTES = 10;
  private readonly MAX_OTP_ATTEMPTS = 3;
  private readonly TX_MAX_WAIT_MS: number;
  private readonly TX_TIMEOUT_MS: number;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {
    this.TX_MAX_WAIT_MS = Number(
      this.configService.get<string>('TX_MAX_WAIT_MS') ?? 10000,
    );
    this.TX_TIMEOUT_MS = Number(
      this.configService.get<string>('TX_TIMEOUT_MS') ?? 30000,
    );
  }

  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { email, phone, password, firstName, lastName } = registerDto;

    try {
      await this.prisma.$transaction(
        async (tx) => {
          const existingByEmail = await tx.user.findUnique({
            where: { email },
          });
          if (existingByEmail) {
            throw new ConflictException('User with this email already exists');
          }

          const existingByPhone = await tx.user.findUnique({
            where: { phone },
          });
          if (existingByPhone) {
            throw new ConflictException('User with this phone already exists');
          }

          const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

          const user = await tx.user.create({
            data: {
              firstName,
              lastName,
              email,
              phone,
              passwordHash,
              status: UserStatus.PENDING,
            },
          });

          await this.issueRegistrationOtp(tx, user.id, email, firstName);
        },
        {
          maxWait: this.TX_MAX_WAIT_MS,
          timeout: this.TX_TIMEOUT_MS,
        },
      );
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Unknown email transport error';
      this.logger.error(`Registration OTP email failed: ${message}`);
      throw new BadRequestException(`Failed to send OTP email: ${message}`);
    }

    return {
      message: 'Registration successful. Verify OTP sent to your email.',
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email };
    const refreshId = randomBytes(16).toString('hex');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync({ ...payload, refreshId }, { expiresIn: '7d' }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hashedRefreshToken = await bcrypt.hash(
      refreshToken,
      this.SALT_ROUNDS,
    );
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  private async issueRegistrationOtp(
    tx: Prisma.TransactionClient,
    userId: string,
    email?: string,
    firstName?: string,
  ): Promise<void> {
    const otp = String(randomInt(100000, 1000000));
    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000);

    await tx.otpRecord.updateMany({
      where: { userId, type: OtpType.REGISTRATION, verified: false },
      data: { expiresAt: new Date(), updatedAt: new Date() },
    });

    await tx.otpRecord.create({
      data: {
        userId,
        otpHash,
        expiresAt,
        attempts: 0,
        type: OtpType.REGISTRATION,
      },
    });

    if (email && firstName) {
      await this.mailService.sendOtp(email, otp, firstName);
      this.logger.log(`OTP email dispatched to ${email}`);
    } else {
      this.logger.warn(`OTP for user ${userId}: ${otp} (no email provided)`);
    }
  }

  async verifyRegistrationOtp(
    verifyOtpDto: VerifyOtpDto,
  ): Promise<{ message: string }> {
    const { email, otp } = verifyOtpDto;

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otpRecord = await this.prisma.otpRecord.findFirst({
      where: {
        userId: user.id,
        type: OtpType.REGISTRATION,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord || otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired. Please request a new OTP.');
    }

    if (otpRecord.attempts >= this.MAX_OTP_ATTEMPTS) {
      await this.prisma.otpRecord.update({
        where: { id: otpRecord.id },
        data: { expiresAt: new Date() },
      });
      throw new BadRequestException(
        'OTP attempts exceeded. Please resend OTP.',
      );
    }

    const isMatch = this.hashOtp(otp) === otpRecord.otpHash;
    if (!isMatch) {
      const attempts = otpRecord.attempts + 1;
      await this.prisma.otpRecord.update({
        where: { id: otpRecord.id },
        data: {
          attempts,
          expiresAt:
            attempts >= this.MAX_OTP_ATTEMPTS
              ? new Date()
              : otpRecord.expiresAt,
        },
      });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.$transaction([
      this.prisma.otpRecord.update({
        where: { id: otpRecord.id },
        data: { verified: true },
      }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.VERIFIED },
      }),
    ]);

    return { message: 'OTP verified. Your account is now active.' };
  }

  async resendRegistrationOtp(
    resendOtpDto: ResendOtpDto,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.$transaction(
        async (tx) => {
          const user = await tx.user.findUnique({
            where: { email: resendOtpDto.email },
          });
          if (!user) {
            throw new NotFoundException('User not found');
          }

          if (user.status === UserStatus.VERIFIED) {
            throw new BadRequestException('User already verified');
          }

          await this.issueRegistrationOtp(
            tx,
            user.id,
            user.email,
            user.firstName,
          );
        },
        {
          maxWait: this.TX_MAX_WAIT_MS,
          timeout: this.TX_TIMEOUT_MS,
        },
      );
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const message =
        error instanceof Error
          ? error.message
          : 'Unknown email transport error';
      this.logger.error(`Resend OTP email failed: ${message}`);
      throw new BadRequestException(`Failed to send OTP email: ${message}`);
    }

    return { message: 'A new OTP has been sent.' };
  }

  async refreshTokens(userId: string): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        phone: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.VERIFIED) {
      throw new ForbiddenException(
        'Account is not verified. Please verify OTP first. Redirect: /verify-account',
      );
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
}
