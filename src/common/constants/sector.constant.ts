/**
 * Sectors are fixed by the platform (not admin-managed data), so they live
 * here as a constant instead of a database collection. Member records and
 * news items reference these slugs.
 */
export const SECTORS = [
  { slug: 'mobilya-ve-dekorasyon', name: 'Mobilya ve Dekorasyon' },
  { slug: 'insaat-ve-yapi', name: 'İnşaat ve Yapı' },
  { slug: 'mimarlik-ve-tasarim', name: 'Mimarlık ve Tasarım' },
  { slug: 'uretim-ve-sanayi', name: 'Üretim ve Sanayi' },
  { slug: 'metal-ve-makine', name: 'Metal ve Makine' },
  { slug: 'tekstil-ve-ev-tekstili', name: 'Tekstil ve Ev Tekstili' },
  { slug: 'ticaret-ve-dis-ticaret', name: 'Ticaret ve Dış Ticaret' },
  { slug: 'reklam-medya-ve-matbaa', name: 'Reklam, Medya ve Matbaa' },
  { slug: 'otomotiv', name: 'Otomotiv' },
  { slug: 'lojistik-ve-tasimacilik', name: 'Lojistik ve Taşımacılık' },
  { slug: 'gayrimenkul-ve-finans', name: 'Gayrimenkul ve Finans' },
  { slug: 'bilisim-ve-teknoloji', name: 'Bilişim ve Teknoloji' },
  { slug: 'gida-turizm-ve-hizmet', name: 'Gıda, Turizm ve Hizmet' },
  { slug: 'saglik-ve-profesyonel-hizmetler', name: 'Sağlık ve Profesyonel Hizmetler' },
] as const;

export type SectorSlug = (typeof SECTORS)[number]['slug'];

export const SECTOR_SLUGS = SECTORS.map((s) => s.slug) as SectorSlug[];
