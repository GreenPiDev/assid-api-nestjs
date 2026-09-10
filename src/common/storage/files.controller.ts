import { BadRequestException, Controller, Get, NotFoundException, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service';

// Yüklenen tüm görsel/PDF içerikleri (logo, haber görseli, üyelik belgeleri
// vb.) R2'den okuyup tarayıcıya proxy'ler. Bu içerikler zaten (ör. üye
// profili, haber sayfası gibi) kimlik doğrulaması gerektirmeyen public
// endpoint'ler üzerinden erişilebilir olduğundan bu uç da bilinçli olarak
// public bırakıldı — asıl amaç R2'nin `pub-xxxx.r2.dev` genel URL'inin
// Türkiye'de ISP seviyesinde engellenmesini aşmak (bkz. storage.service.ts).
@Controller('files')
export class FilesController {
  constructor(private readonly storageService: StorageService) {}

  @Get()
  async getFile(@Query('key') key: string | undefined, @Res() res: Response): Promise<void> {
    if (!key || !key.startsWith('ASSID/')) {
      throw new BadRequestException('Geçersiz dosya anahtarı');
    }

    let file;
    try {
      file = await this.storageService.download(key);
    } catch {
      throw new NotFoundException('Dosya bulunamadı');
    }

    res.setHeader('Content-Type', file.contentType ?? 'application/octet-stream');
    if (file.contentLength !== undefined) {
      res.setHeader('Content-Length', String(file.contentLength));
    }
    // Anahtar UUID tabanlı ve pratikte değişmez olduğundan uzun süre/agresif cache.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    // Farklı origin'deki (frontend) <img> etiketlerinden gömülebilmesi için.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    file.body.pipe(res);
  }
}
