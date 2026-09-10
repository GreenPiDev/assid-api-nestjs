import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly envFolder: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.config.getOrThrow<string>('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = this.config.getOrThrow<string>('R2_BUCKET_NAME');
    this.publicBaseUrl = this.config.getOrThrow<string>('R2_PUBLIC_BASE_URL').replace(/\/$/, '');

    // Defaults to "development" unless NODE_ENV is explicitly "production",
    // so a local run can never accidentally write into the production
    // folder just because NODE_ENV was left unset.
    this.envFolder = config.get<string>('NODE_ENV') === 'production' ? 'production' : 'development';
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string,
    // resourceType kept for drop-in compatibility with the old Cloudinary
    // service signature; R2 stores raw objects either way.
    _resourceType: 'image' | 'auto' = 'image',
  ): Promise<string> {
    const key = `ASSID/${this.envFolder}/${folder}/${randomUUID()}${extname(file.originalname)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );
    return `${this.publicBaseUrl}/${key}`;
  }
}
