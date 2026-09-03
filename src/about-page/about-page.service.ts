import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateAboutPageDto } from './dto/update-about-page.dto';
import { withMongoId } from '../common/utils/prisma-response.util';

const DEFAULT_ABOUT_PAGE: Prisma.AboutPageCreateInput = {
  title: 'ASSİD',
  subtitle: 'Siteler Sanayisinin Kurumsal Gücü',
  bodyParagraph1:
    'Ankara Siteler Sanayici ve İş İnsanları Derneği (ASSİD), Türkiye mobilya, dekorasyon ve imalat sektörünün kalbi olan Siteler Bölgesi’nin kurumsal gücünü temsil eden en etkin sivil toplum kuruluşudur. Bölgenin ekonomik potansiyelini en üst seviyeye taşımak hedefiyle yola çıkan ASSİD, Siteler’in köklü üretim mirasını modern vizyonla birleştirerek üyelerinin ulusal ve uluslararası rekabet gücünü artırmayı misyon edinmiştir.',
  bodyParagraph2:
    'Derneğimiz, kurulduğu ilk günden itibaren şeffaf, katılımcı ve çözüm odaklı bir yönetim anlayışını benimsemiştir. Üyelerimizin ticari, ekonomik ve sosyal haklarını koruyarak; eğitim, iş birliği ve teknolojik dönüşüm yoluyla üretim kalitesini uluslararası standartlara ulaştırmayı taahhüt ederiz.',
  visionText:
    'Siteler’i, mobilya ve imalat sektörlerinde ulusal ve uluslararası alanda öncü, teknoloji odaklı bir üretim üssü haline getirmektir.',
  missionText:
    'Üyelerimizin rekabet gücünü artırarak, bölgesel kalkınmayı desteklemek ve Siteler sanayisinin menfaatlerini en üst düzeyde, kararlılıkla temsil etmektir.',
};

/**
 * There is exactly one "Hakkımızda" content record per deployment, so this
 * service always operates on a single row instead of exposing list/CRUD-by-id.
 */
@Injectable()
export class AboutPageService {
  constructor(private prisma: PrismaService) {}

  async get() {
    const existing = await this.prisma.aboutPage.findFirst();
    if (existing) return withMongoId(existing);
    const created = await this.prisma.aboutPage.create({ data: DEFAULT_ABOUT_PAGE });
    return withMongoId(created);
  }

  async update(dto: UpdateAboutPageDto) {
    const data = dto as Prisma.AboutPageUpdateInput;
    const existing = await this.prisma.aboutPage.findFirst();
    if (existing) {
      const updated = await this.prisma.aboutPage.update({ where: { id: existing.id }, data });
      return withMongoId(updated);
    }
    const created = await this.prisma.aboutPage.create({ data: data as Prisma.AboutPageCreateInput });
    return withMongoId(created);
  }

  setImage1(url: string) {
    return this.update({ image1: url });
  }

  setImage2(url: string) {
    return this.update({ image2: url });
  }
}
