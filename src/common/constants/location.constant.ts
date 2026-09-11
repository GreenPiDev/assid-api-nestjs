/**
 * Locations are fixed by the platform (not admin-managed data), so they live
 * here as a constant instead of a database collection. Member records
 * reference these slugs.
 */
export const LOCATIONS = [
  { slug: 'avm', name: 'AVM' },
  { slug: 'ofis-plaza', name: 'Ofis / Plaza' },
  { slug: 'fabrika-sanayi-tesisi', name: 'Fabrika / Sanayi Tesisi' },
  { slug: 'hastane-saglik-tesisi', name: 'Hastane / Sağlık Tesisi' },
  { slug: 'okul-universite', name: 'Okul / Üniversite' },
  { slug: 'otel', name: 'Otel' },
  { slug: 'restoran-kafe', name: 'Restoran / Kafe' },
  { slug: 'magaza-ticari-alan', name: 'Mağaza / Ticari Alan' },
  { slug: 'konut-site', name: 'Konut / Site' },
  { slug: 'depo-lojistik-merkezi', name: 'Depo / Lojistik Merkezi' },
  { slug: 'stadyum-spor-tesisi', name: 'Stadyum / Spor Tesisi' },
  { slug: 'havalimani', name: 'Havalimanı' },
  { slug: 'liman-marina', name: 'Liman / Marina' },
  { slug: 'kamu-binasi', name: 'Kamu Binası' },
  { slug: 'fuar-kongre-merkezi', name: 'Fuar / Kongre Merkezi' },
  { slug: 'insaat-santiye', name: 'İnşaat / Şantiye' },
  { slug: 'akaryakit-istasyonu', name: 'Akaryakıt İstasyonu' },
  { slug: 'ulasim-tesisi-terminal', name: 'Ulaşım Tesisi / Terminal' },
  { slug: 'park-acik-alan', name: 'Park / Açık Alan' },
  { slug: 'kultur-eglence-tesisi', name: 'Kültür / Eğlence Tesisi' },
  { slug: 'diger', name: 'Diğer' },
] as const;

export type LocationSlug = (typeof LOCATIONS)[number]['slug'];

export const LOCATION_SLUGS = LOCATIONS.map((l) => l.slug) as LocationSlug[];
