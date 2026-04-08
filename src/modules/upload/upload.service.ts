import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = config.getOrThrow<string>('CLOUDFLARE_ACCOUNT_ID');
    this.bucket = config.getOrThrow<string>('CLOUDFLARE_R2_BUCKET_NAME');
    this.publicUrl = config
      .getOrThrow<string>('CLOUDFLARE_R2_PUBLIC_URL')
      .replace(/\/$/, ''); // strip trailing slash

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.getOrThrow<string>('CLOUDFLARE_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>(
          'CLOUDFLARE_SECRET_ACCESS_KEY',
        ),
      },
    });
  }

  /**
   * Uploads a file buffer to Cloudflare R2 and returns the public URL.
   * @param file - Multer file object (memory storage)
   * @param folder - Subdirectory key prefix inside the bucket (e.g. "kyc")
   */
  async upload(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<string> {
    const ext = extname(file.originalname).toLowerCase() || '.bin';
    const key = `${folder}/${randomUUID()}${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentLength: file.size,
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException(
        `Failed to upload file to R2: ${(err as Error).message}`,
      );
    }

    return `${this.publicUrl}/${key}`;
  }

  /**
   * Deletes a file from R2 given its full public URL.
   */
  async delete(publicFileUrl: string): Promise<void> {
    const key = publicFileUrl.replace(`${this.publicUrl}/`, '');
    try {
      await this.s3.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch {
      // best-effort delete — don't crash the request
    }
  }
}
