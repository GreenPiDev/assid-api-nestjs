import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { extname } from 'path';

export interface DownloadedFile {
  body: Readable;
  contentType?: string;
  contentLength?: number;
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly apiPublicUrl: string;
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
    // Cloudflare'in genel "pub-xxxx.r2.dev" URL'i Türkiye'de ISP seviyesinde
    // engelleniyor/yönlendiriliyor (middlebox redirect + TLS handshake hatası
    // gözlemlendi) — bu yüzden dosyalar hiç public R2 URL'i ile servis
    // edilmiyor, backend'in kendi `/files?key=...` proxy ucundan akıtılıyor
    // (bkz. FilesController). Aynı çözüm 3-bi-yeni/bi-backend projesinde de
    // uygulanmış (docs/VARSAYIMLAR.md V34).
    this.apiPublicUrl = this.config.getOrThrow<string>('API_PUBLIC_URL').replace(/\/$/, '');

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
    return `${this.apiPublicUrl}/api/files?key=${encodeURIComponent(key)}`;
  }

  async download(key: string): Promise<DownloadedFile> {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return {
      body: result.Body as Readable,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }
}
