import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb } from 'pdf-lib';
import { PdfService } from '../pdf/pdf.service';
import { getSectorName } from '../common/utils/search.util';

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const HEADER_HEIGHT = 92;
const FOOTER_HEIGHT = 42;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT - 26;
const CONTENT_BOTTOM = FOOTER_HEIGHT + 24;

// assid-frontend-react/src/index.css'teki --color-assid-* token'larıyla
// birebir aynı palet — PDF, sitenin marka renkleriyle tutarlı olsun diye.
const BRAND = rgb(0x12 / 255, 0x3a / 255, 0x63 / 255); // --color-assid-green
const BRAND_DARK = rgb(0x08 / 255, 0x1f / 255, 0x38 / 255); // --color-assid-green-dark
const INK = rgb(0x0d / 255, 0x1b / 255, 0x2a / 255); // --color-assid-ink
const MUTED = rgb(0x62 / 255, 0x70 / 255, 0x7d / 255); // --color-assid-muted
const PAPER = rgb(0xf2 / 255, 0xf5 / 255, 0xf8 / 255); // --color-assid-paper
const LINE = rgb(0xdb / 255, 0xe3 / 255, 0xea / 255); // --color-assid-line
const WHITE = rgb(1, 1, 1);

export interface MembershipApplicationPdfData {
  applicationDate: Date;
  fullName: string;
  companyName?: string;
  title?: string;
  companyAddress?: string;
  phone?: string;
  mobilePhone?: string;
  email: string;
  sectors: string[];
  businessActivityTypes?: string[];
  references?: string;
  membershipType?: string;
  birthPlace?: string;
  birthDate?: Date;
  nationality?: string;
  nationalId?: string;
  maritalStatus?: string;
  faxPhone?: string;
  personalMobilePhone?: string;
  affiliatedOrganizations?: string;
  contactPreference?: string;
  documentLabels: string[];
  collectionType?: string;
  // Giriş Aidatı (tek seferlik) için tam tarih; Aylık Aidat/Her İkisi
  // (tekrarlayan) için ayın günü (1-31).
  autoDebitDate?: Date;
  autoDebitDayOfMonth?: number;
  // Ödeme talimatının "Üye / Firma Bilgileri" bölümüne yazılır — genel
  // başvuru bilgilerinden (fullName, companyName vb.) bilinçli olarak
  // ayrıdır, formda ayrıca girilir.
  paymentHolderFullName?: string;
  paymentHolderCompanyName?: string;
  paymentHolderTitle?: string;
  paymentHolderCompanyAddress?: string;
  cardNumberLast4?: string;
  paymentConsent: boolean;
  bylawsAcknowledged: boolean;
  // Kurum kimliği (dernek adı/adresi vb.) hiçbir yerde hardcode edilmiyor —
  // header/footer/beyan metinlerindeki dernek bilgileri admin panelinden
  // (/panel/organizasyon-bilgileri) setlenen OrganizationSettings'ten gelir.
  orgName: string;
  orgShortName?: string;
  orgAddress?: string;
  orgPhone?: string;
  orgEmail?: string;
  orgWebsite?: string;
  // Logo görseli PNG/JPEG ise gömülür; webp/svg gibi pdf-lib'in
  // gömemediği formatlarda veya logo yoksa header metin tabanlı fallback'e
  // düşer (bkz. PageCursor.drawHeader).
  logoImage?: { bytes: Uint8Array; format: 'png' | 'jpg' };
}

const REQUIRED_DOCUMENTS = [
  '2 Adet Fotoğraf',
  'Adli Sicil Kaydı',
  'Kimlik Fotokopisi',
  'Ticaret Sicil Gazetesi (Kurumsal)',
  'Vergi Levhası (Kurumsal)',
  'İmza Sirküleri (Kurumsal)',
];

const BUSINESS_ACTIVITY_LABELS: Record<string, string> = {
  manufacturer: 'Üretici',
  importer: 'İthalat',
  exporter: 'İhracat',
  seller: 'Satıcı',
  service_other: 'Hizmet/Diğer',
};

const CONTACT_PREFERENCE_LABELS: Record<string, string> = {
  email: 'E-Posta',
  sms: 'SMS',
  phone: 'Telefon',
};

const MARITAL_STATUS_LABELS: Record<string, string> = {
  married: 'Evli',
  single: 'Bekar',
};

const COLLECTION_TYPE_LABELS: Record<string, string> = {
  entry_fee: 'Giriş Aidatı',
  monthly_fee: 'Aylık Aidat',
  both: 'Her İkisi',
};

const EK1_BYLAWS_TEXT = `Madde 1 — Derneğin Adı: Derneğin adı Ankara Siteler Sanayici ve İş İnsanları Derneği'dir. (Kısaca: ASSİD)
Madde 2 — Merkezi: Dernek merkezi Ankara'dır. Yönetim Kurulu kararı ile yurt içinde temsilcilik/şube açılabilir.
Madde 3 — Amaç: Dernek; Ankara Siteler başta olmak üzere sanayi ve iş dünyasında faaliyet gösteren üyeler arasında dayanışmayı güçlendirmek, mesleki/ekonomik gelişimi desteklemek, sektörün ortak sorunlarına çözüm üretmek ve üyelerin kurumsal temsilini artırmak amacıyla faaliyet yürütür.
Madde 4 — Faaliyet Konuları: Üye buluşmaları düzenlemek; proje geliştirmek, raporlama/araştırma yapmak; kamu kurumları, üniversiteler, STK'lar ve özel sektörle iş birliği geliştirmek; üyeler arası iletişim ve iş ağı faaliyetleri yürütmek; sektörel gelişim programları yürütmek; mevzuata uygun temsil ve tanıtım çalışmaları yapmak.
Madde 5 — Üyelik Türleri: Dernekte üyelik; Bireysel Üyelik ve Kurumsal Üyelik olarak sınıflandırılabilir. Üyelik sınıfları/alt kırılımlar (örn. sektör içi-sektör dışı) Dernek kararlarıyla uygulanabilir.
Madde 6 — Üyelik Başvurusu ve Kabul: Üyelik başvurusu, başvuru formu ve istenen ek belgelerle yapılır. Üyeliğe kabul Yönetim Kurulu kararı ile kesinleşir. Başvurunun yapılması tek başına üyelik hakkı doğurmaz.
Madde 7 — Üyelerin Hakları: Üyeler; dernek faaliyetlerine katılma, görüş bildirme, genel kurulda oy kullanma (tüzükteki şartlara göre), dernekten bilgi alma ve dernek hizmetlerinden yararlanma hakkına sahiptir.
Madde 8 — Üyelerin Yükümlülükleri: Üyeler; tüzük ve dernek kararlarına uymak, aidat ve mali yükümlülükleri zamanında yerine getirmek, derneğin saygınlığına uygun davranmakla yükümlüdür.
Madde 9 — Üyeliğin Sona Ermesi: Üyelik; istifa, vefat, üyeliğin düşmesi veya çıkarılma hallerinde sona erer. Üyelikten çıkarılma/üyeliğin düşmesi, tüzükte öngörülen usul ve Yönetim Kurulu kararı çerçevesinde yürütülür.
Madde 10 — Derneğin Organları: Genel Kurul, Yönetim Kurulu, Denetim Kurulu (gerekirse Danışma/Disiplin/Onur kurulları oluşturulabilir).
Madde 11 — Genel Kurul: Genel Kurul; derneğin en yetkili karar organıdır. Toplanma, çağrı, gündem ve karar usulleri tüzük hükümlerine göre yürütülür.
Madde 12 — Yönetim Kurulu: Yönetim Kurulu; derneği temsil eder, faaliyetleri planlar ve yürütür, üyelik kabul/ret süreçlerini yönetir, bütçe ve mali işlemleri tüzük ve mevzuata uygun şekilde yürütür.
Madde 13 — Denetim Kurulu: Derneğin idari ve mali işlemlerini tüzük ve mevzuat çerçevesinde denetler; raporlarını ilgili organlara sunar.
Madde 14 — Gelirler ve Mali Hükümler: Derneğin gelirleri; giriş aidatı, aidatlar, bağış/yardımlar, etkinlik gelirleri ve mevzuata uygun diğer gelirlerden oluşur. Tüm mali işlemler yasal mevzuata uygun yürütülür.
Madde 15 — Tutulacak Defterler: Dernek, ilgili mevzuat kapsamında zorunlu defter ve kayıtları tutar.
Madde 16 — Tüzük Değişikliği ve Fesih: Tüzük değişikliği ve fesih; Genel Kurul'un tüzükte belirlenen karar nisaplarıyla gerçekleştirilir. Fesih halinde mal varlığının devri tüzük ve mevzuata göre yapılır.
Not: Bu metin bilgilendirme amaçlı özet olup, bağlayıcı hükümler derneğin yürürlükteki tüzüğünde yer alır.`;

const EK2_KVKK_TEXT = `Veri Sorumlusu: Ankara Siteler Sanayici ve İş İnsanları Derneği (ASSİD). Adres: Güneşevler Mah. 21 Cad. No: 5/8 Altındağ, Ankara. E-posta: info@assid.com.tr. Tel: +90 530 233 27 43

1) İşlenen Kişisel Veriler: Başvuru ve üyelik süreçleri kapsamında; kimlik (ad-soyad, T.C. kimlik no vb.), iletişim (telefon, e-posta, adres), mesleki (unvan, şirket bilgileri), üyelik başvuru bilgileri, referans bilgileri, imza ve başvuru eklerinde yer alan bilgiler işlenebilir.
2) Kişisel Verilerin İşlenme Amaçları: Üyelik başvurusunun alınması, değerlendirilmesi ve sonuçlandırılması; üyelik kayıtlarının oluşturulması ve üyelik ilişkisinin yürütülmesi; dernek faaliyetlerinin planlanması ve üyelerin bilgilendirilmesi; mali süreçlerin (aidat/ödemeler) takibi; mevzuattan doğan yükümlülüklerin yerine getirilmesi amaçlarıyla işlenebilir.
3) Hukuki Sebepler: Kişisel verileriniz, KVKK'nın 5. maddesinde belirtilen; kanunlarda öngörülmesi, sözleşmenin kurulması/ifası, veri sorumlusunun hukuki yükümlülüğü ve meşru menfaat hukuki sebeplerine dayanarak işlenebilir. Gerekli hallerde açık rızanız alınır.
4) Aktarım: Kişisel verileriniz; amaçlarla sınırlı olmak üzere, mevzuatın izin verdiği ölçüde; yetkili kamu kurumları, mali/denetim süreçlerinde hizmet alınan tedarikçiler ve ilgili iş ortaklarına aktarılabilir.
5) Saklama Süresi: Kişisel verileriniz, işleme amacının gerektirdiği süre boyunca ve ilgili mevzuatta öngörülen zaman aşımı/saklama süreleri kapsamında saklanır; süre sonunda silinir, yok edilir veya anonim hale getirilir.
6) KVKK Kapsamındaki Haklarınız: KVKK'nın 11. maddesi kapsamında; kişisel verilerinize ilişkin bilgi talep etme, düzeltme, silme, işlemeye itiraz ve diğer haklara sahipsiniz. Başvurularınızı yazılı olarak veya e-posta üzerinden Derneğe iletebilirsiniz. Başvuru İletişimi: info@assid.com.tr`;

const APPLICATION_DECLARATION_ITEMS = [
  'Bu başvuru formunda ve eklerinde beyan ettiğim bilgi ve belgelerin doğru, güncel ve eksiksiz olduğunu; değişiklikleri derneğe yazılı olarak bildireceğimi kabul ederim.',
  "Üyeliğe kabulün, Dernek Yönetim Kurulu değerlendirmesi ve kararı ile kesinleşeceğini; başvurunun tek başına üyelik hakkı doğurmadığını kabul ederim.",
  'Üyeliğe kabul edilmem halinde, üyelik sınıfıma göre belirlenen giriş aidatı ile yürürlükteki aidat ve diğer mali yükümlülükleri derneğin bildireceği usul ve sürelerde ödeyeceğimi kabul ederim.',
  'KVKK Aydınlatma Metni\'ni okuduğumu ve anladığımı; kişisel verilerimin üyelik işlemlerinin yürütülmesi, dernek faaliyetlerinin planlanması ve ilgili mevzuat kapsamındaki yükümlülüklerin yerine getirilmesi amaçlarıyla işlenebileceğini kabul ederim.',
  'Dernek tüzüğü, etik ilkeleri ve iç düzenlemelerine uygun hareket edeceğimi; aykırılık halinde tüzükte öngörülen süreçlerin uygulanabileceğini kabul ederim.',
];

function formatDate(date?: Date): string {
  if (!date) return '';
  return date.toLocaleDateString('tr-TR');
}

interface Branding {
  name: string;
  shortName: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoImage?: PDFImage;
}

class PageCursor {
  y: number;
  page: PDFPage;

  constructor(
    private readonly doc: PDFDocument,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
    private readonly org: Branding,
  ) {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.drawHeader();
    this.y = CONTENT_TOP;
  }

  private drawHeader(): void {
    this.page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - HEADER_HEIGHT,
      width: PAGE_WIDTH,
      height: HEADER_HEIGHT,
      color: BRAND,
    });

    if (this.org.logoImage) {
      const maxWidth = 230;
      const maxHeight = HEADER_HEIGHT - 24;
      const scale = Math.min(maxWidth / this.org.logoImage.width, maxHeight / this.org.logoImage.height, 1);
      const w = this.org.logoImage.width * scale;
      const h = this.org.logoImage.height * scale;
      this.page.drawImage(this.org.logoImage, {
        x: (PAGE_WIDTH - w) / 2,
        y: PAGE_HEIGHT - HEADER_HEIGHT + (HEADER_HEIGHT - h) / 2,
        width: w,
        height: h,
      });
    } else {
      const shortSize = 22;
      const shortWidth = this.bold.widthOfTextAtSize(this.org.shortName, shortSize);
      this.page.drawText(this.org.shortName, {
        x: (PAGE_WIDTH - shortWidth) / 2,
        y: PAGE_HEIGHT - HEADER_HEIGHT / 2 - 4,
        size: shortSize,
        font: this.bold,
        color: WHITE,
      });
      const nameSize = 8;
      const nameWidth = this.regular.widthOfTextAtSize(this.org.name, nameSize);
      this.page.drawText(this.org.name, {
        x: (PAGE_WIDTH - nameWidth) / 2,
        y: PAGE_HEIGHT - HEADER_HEIGHT / 2 - 20,
        size: nameSize,
        font: this.regular,
        color: WHITE,
      });
    }
  }

  newPage(withCompactTitle = true): void {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.drawHeader();
    this.y = CONTENT_TOP;
    if (withCompactTitle) {
      this.page.drawText('ÜYELİK BAŞVURU FORMU', { x: MARGIN, y: this.y, size: 12, font: this.bold, color: INK });
      this.y -= 15;
      this.paragraph('* Lütfen formu eksiksiz doldurunuz. Başvurunuz Yönetim Kurulunun değerlendirmesine sunulacaktır.', 7.5, 10);
      this.y -= 6;
    }
  }

  ensureSpace(height: number): void {
    if (this.y - height < CONTENT_BOTTOM) this.newPage();
  }

  title(text: string, width = CONTENT_WIDTH, size = 22): void {
    const lines = this.wrapText(text, this.bold, size, width);
    for (const line of lines) {
      this.ensureSpace(size + 6);
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font: this.bold, color: INK });
      this.y -= size + 6;
    }
    this.y -= 2;
  }

  dateBox(label: string, value: string): void {
    const width = 170;
    const height = 34;
    const x = PAGE_WIDTH - MARGIN - width;
    const y = this.y + 14;
    this.page.drawRectangle({ x, y: y - height, width, height, borderColor: LINE, borderWidth: 1, color: PAPER });
    this.page.drawText(label, { x: x + 10, y: y - 13, size: 7.5, font: this.bold, color: MUTED });
    this.page.drawText(value, { x: x + 10, y: y - 27, size: 11, font: this.bold, color: INK });
  }

  sectionHeader(text: string): void {
    this.ensureSpace(24);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 11.5, font: this.bold, color: BRAND });
    this.y -= 6;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 1.2,
      color: BRAND,
    });
    this.y -= 16;
  }

  field(label: string, value: string, xOffset = 0, width = CONTENT_WIDTH): void {
    const boxHeight = 17;
    this.ensureSpace(boxHeight + 6);
    const x = MARGIN + xOffset;
    const labelSize = 8.5;
    // Sütun genişliği normalde sabit bir orana göre belirlenir, ama uzun
    // etiketler (örn. "Üye Olduğu Oda veya Dernekler") bu payı aşarsa
    // etiketin kendi metin genişliğine göre büyütülür — aksi halde üstüne
    // çizilen kutu, etiketin son harflerini örter.
    const labelWidth = Math.min(width * 0.55, Math.max(132, this.bold.widthOfTextAtSize(label, labelSize) + 10));
    this.page.drawText(label, { x, y: this.y - 5, size: labelSize, font: this.bold, color: MUTED });
    const boxX = x + labelWidth;
    const boxWidth = Math.max(width - labelWidth, 20);
    this.page.drawRectangle({
      x: boxX,
      y: this.y - boxHeight + 4,
      width: boxWidth,
      height: boxHeight,
      color: PAPER,
      borderColor: LINE,
      borderWidth: 1,
    });
    const truncated = this.fitText(value, this.regular, 9.5, boxWidth - 12);
    this.page.drawText(truncated, { x: boxX + 6, y: this.y - boxHeight + 9, size: 9.5, font: this.regular, color: INK });
    this.y -= boxHeight + 8;
  }

  // field()'ın çok satırlı hali: değer, kutu genişliğine sığmayan uzun
  // metinlerde (örn. çok sayıda sektör seçilmesi) tek satıra sığdırılıp
  // kesilmek yerine alt satırlara sarılır; kutu bu satır sayısına göre
  // büyür ve sonraki içerikler buna göre aşağı kayar.
  fieldMultiline(label: string, value: string, xOffset = 0, width = CONTENT_WIDTH): void {
    const labelSize = 8.5;
    const textSize = 9.5;
    const lineHeight = 12;
    const x = MARGIN + xOffset;
    const labelWidth = Math.min(width * 0.55, Math.max(132, this.bold.widthOfTextAtSize(label, labelSize) + 10));
    const boxX = x + labelWidth;
    const boxWidth = Math.max(width - labelWidth, 20);
    const lines = value ? this.wrapText(value, this.regular, textSize, boxWidth - 12) : [''];
    const boxHeight = 17 + (lines.length - 1) * lineHeight;
    this.ensureSpace(boxHeight + 6);
    this.page.drawText(label, { x, y: this.y - 5, size: labelSize, font: this.bold, color: MUTED });
    this.page.drawRectangle({
      x: boxX,
      y: this.y - boxHeight + 4,
      width: boxWidth,
      height: boxHeight,
      color: PAPER,
      borderColor: LINE,
      borderWidth: 1,
    });
    lines.forEach((line, i) => {
      this.page.drawText(line, {
        x: boxX + 6,
        y: this.y - 12 - i * lineHeight,
        size: textSize,
        font: this.regular,
        color: INK,
      });
    });
    this.y -= boxHeight + 8;
  }

  fieldRow(fields: [string, string][]): void {
    const gap = 14;
    const colWidth = (CONTENT_WIDTH - gap * (fields.length - 1)) / fields.length;
    const startY = this.y;
    fields.forEach(([label, value], i) => {
      this.y = startY;
      this.field(label, value, i * (colWidth + gap), colWidth);
    });
  }

  checkbox(label: string, checked: boolean, xOffset = 0): number {
    const x = MARGIN + xOffset;
    this.page.drawRectangle({
      x,
      y: this.y - 1,
      width: 10,
      height: 10,
      borderColor: checked ? BRAND : LINE,
      borderWidth: 1.2,
      color: checked ? BRAND : WHITE,
    });
    this.page.drawText(label, { x: x + 15, y: this.y, size: 9, font: this.regular, color: INK });
    return this.regular.widthOfTextAtSize(label, 9) + 26;
  }

  checkboxRow(items: [string, boolean][]): void {
    this.ensureSpace(18);
    let x = 0;
    for (const [label, checked] of items) {
      x += this.checkbox(label, checked, x);
    }
    this.y -= 20;
  }

  private fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 1 && font.widthOfTextAtSize(truncated + '…', size) > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '…';
  }

  private wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  paragraph(text: string, size = 8, lineHeight = 10, width = CONTENT_WIDTH, xOffset = 0, color = MUTED): void {
    for (const paraLine of text.split('\n')) {
      const lines = this.wrapText(paraLine, this.regular, size, width);
      for (const line of lines) {
        this.ensureSpace(lineHeight);
        this.page.drawText(line, { x: MARGIN + xOffset, y: this.y, size, font: this.regular, color });
        this.y -= lineHeight;
      }
    }
  }

  bulletList(items: string[], size = 9, lineHeight = 12): void {
    for (const item of items) {
      const lines = this.wrapText(item, this.regular, size, CONTENT_WIDTH - 14);
      lines.forEach((line, i) => {
        this.ensureSpace(lineHeight);
        if (i === 0) this.page.drawText('•', { x: MARGIN, y: this.y, size, font: this.bold, color: BRAND });
        this.page.drawText(line, { x: MARGIN + 14, y: this.y, size, font: this.regular, color: INK });
        this.y -= lineHeight;
      });
    }
  }

  spacer(height: number): void {
    this.y -= height;
  }

  // Fiziksel imza için ayrılmış, kenarlıklı boş bir kutu (sağ üstte).
  signatureBox(label: string, width = 180, height = 50): void {
    this.ensureSpace(height + 6);
    const x = PAGE_WIDTH - MARGIN - width;
    this.page.drawRectangle({ x, y: this.y - height, width, height, borderColor: LINE, borderWidth: 1 });
    this.page.drawText(label, { x: x + 8, y: this.y - 14, size: 8, font: this.regular, color: MUTED });
    this.y -= height + 8;
  }

  signatureRow(labels: string[]): void {
    const height = 60;
    this.ensureSpace(height + 6);
    const colWidth = CONTENT_WIDTH / labels.length;
    labels.forEach((label, i) => {
      const x = MARGIN + i * colWidth;
      this.page.drawRectangle({ x, y: this.y - height, width: colWidth, height, borderColor: LINE, borderWidth: 1 });
      const labelWidth = this.bold.widthOfTextAtSize(label, 9);
      this.page.drawText(label, { x: x + (colWidth - labelWidth) / 2, y: this.y - height + 10, size: 9, font: this.bold, color: INK });
    });
    this.y -= height + 8;
  }

  table(headers: string[], rows: string[][], colRatios: number[]): void {
    const rowHeight = 20;
    const totalRatio = colRatios.reduce((a, b) => a + b, 0);
    const colWidths = colRatios.map((r) => (CONTENT_WIDTH * r) / totalRatio);
    this.ensureSpace(rowHeight * (rows.length + 1) + 4);

    let x = MARGIN;
    this.page.drawRectangle({ x: MARGIN, y: this.y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: BRAND });
    headers.forEach((header, i) => {
      this.page.drawText(header, { x: x + 8, y: this.y - rowHeight + 6, size: 9.5, font: this.bold, color: WHITE });
      x += colWidths[i];
    });
    this.y -= rowHeight;

    rows.forEach((row) => {
      x = MARGIN;
      this.page.drawRectangle({
        x: MARGIN,
        y: this.y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: WHITE,
        borderColor: LINE,
        borderWidth: 1,
      });
      row.forEach((cell, i) => {
        this.page.drawText(cell, { x: x + 8, y: this.y - rowHeight + 6, size: 9.5, font: this.regular, color: INK });
        x += colWidths[i];
      });
      this.y -= rowHeight;
    });
    this.y -= 8;
  }
}

// Fiziksel "assid-uyelik-formu.pdf" başvuru formunun görsel diline (koyu
// lacivert başlık/altbilgi bantları, kutulu alanlar, tablo) sadık kalarak,
// başvuru sırasında toplanan verilerle A4 formatında yeni bir PDF üretir
// (mevcut taranmış şablonun üzerine koordinat bazlı basmak yerine — bakım
// kolaylığı ve pdf-lib'in font subsetting sınırlamaları nedeniyle bu yol
// seçildi). Fiziksel formda dernek yönetiminin doldurduğu/kullandığı
// bölümler (Sektör Durumu, Dernek İçi Kullanım, imza kutuları, Ücretler
// tablosu) boş/statik şablon olarak basılır.
@Injectable()
export class MembershipApplicationPdfService {
  constructor(private readonly pdfService: PdfService) {}

  async generate(data: MembershipApplicationPdfData): Promise<Buffer> {
    const doc = await this.pdfService.create();
    const { regular, bold } = await this.pdfService.embedTrFonts(doc);

    let logoImage: PDFImage | undefined;
    if (data.logoImage) {
      try {
        logoImage =
          data.logoImage.format === 'png'
            ? await doc.embedPng(data.logoImage.bytes)
            : await doc.embedJpg(data.logoImage.bytes);
      } catch {
        logoImage = undefined; // bozuk/desteklenmeyen görsel — metin fallback'ine düşülür
      }
    }

    const org: Branding = {
      name: data.orgName,
      shortName: data.orgShortName || data.orgName,
      address: data.orgAddress,
      phone: data.orgPhone,
      email: data.orgEmail,
      website: data.orgWebsite,
      logoImage,
    };

    const c = new PageCursor(doc, regular, bold, org);

    // --- Sayfa 1: Genel / Üyelik Sınıfı / Kişisel Bilgiler ---
    c.title('ÜYELİK BAŞVURU FORMU');
    c.dateBox('BAŞVURU TARİHİ', formatDate(data.applicationDate));
    // Not metni sağ üstteki tarih kutusuyla çakışmasın diye genişliği
    // kutunun bıraktığı alanla sınırlandırılıyor.
    c.paragraph(
      '* Lütfen formu eksiksiz doldurunuz. Başvurunuz Yönetim Kurulunun değerlendirmesine sunulacaktır.',
      8,
      11,
      290,
    );
    c.spacer(20);

    c.sectionHeader('1 — GENEL BİLGİLER');
    c.field('Adı Soyadı', data.fullName);
    c.field('Şirket / Kurum Adı', data.companyName ?? '');
    c.field('Görevi / Ünvanı', data.title ?? '');
    c.field('Şirket / Kurum Adresi', data.companyAddress ?? '');
    c.fieldRow([
      ['Telefon / Faks', data.phone ?? ''],
      ['Cep Telefonu', data.mobilePhone ?? ''],
    ]);
    c.field('E Posta', data.email);
    c.fieldMultiline('Faaliyet Alanı / Sektör', data.sectors.map(getSectorName).join(', '));
    c.checkboxRow(
      Object.entries(BUSINESS_ACTIVITY_LABELS).map(([key, label]) => [
        label,
        data.businessActivityTypes?.includes(key) ?? false,
      ]),
    );
    c.field('Referanslar', data.references ?? '');
    c.spacer(4);

    c.sectionHeader('2 — ÜYELİK SINIFI');
    c.checkboxRow([
      ['Bireysel', data.membershipType === 'individual'],
      ['Kurumsal', data.membershipType === 'corporate'],
    ]);
    c.paragraph('Sektör Durumu (Sektör İçi / Sektör Dışı): * Bu kısım Yönetim Kurulu tarafından doldurulacaktır.', 8, 11);
    c.paragraph('* Sınıflandırma ve nihai üyelik sınıfı Yönetim Kurulu değerlendirmesiyle kesinleşir.', 7, 10);
    c.spacer(4);

    c.sectionHeader('3 — KİŞİSEL BİLGİLER');
    c.fieldRow([
      ['Doğum Yeri', data.birthPlace ?? ''],
      ['Doğum Tarihi', formatDate(data.birthDate)],
    ]);
    c.fieldRow([
      ['Uyruğu', data.nationality ?? ''],
      ['T.C. Kimlik No', data.nationalId ?? ''],
    ]);
    c.field('Medeni Durumu', data.maritalStatus ? MARITAL_STATUS_LABELS[data.maritalStatus] : '');
    c.fieldRow([
      ['Telefon / Faks', data.faxPhone ?? ''],
      ['Cep Telefonu', data.personalMobilePhone ?? ''],
    ]);
    c.field('Üye Olduğu Oda veya Dernekler', data.affiliatedOrganizations ?? '');
    c.signatureBox('Tarih / İmza (fiziksel imza için ayrılmıştır)');

    // --- Sayfa 2: Ücretler / Ekler / İletişim / Dernek İçi Kullanım ---
    c.newPage();
    c.sectionHeader('4 — ÜCRETLER');
    c.table(
      ['Üyelik Sınıfı', 'Tutar'],
      [
        ['Sektör İçi Bireysel', '10.000₺'],
        ['Sektör İçi Kurumsal', '20.000₺'],
        ['Sektör Dışı Bireysel', '50.000₺'],
        ['Sektör Dışı Kurumsal', '80.000₺'],
        ['Aylık Aidat', '1.000₺'],
      ],
      [0.65, 0.35],
    );
    c.paragraph('* Kesin üyelik sınıfı ve tutar, Yönetim Kurulu onayı sonrası belirlenir.', 7, 10);
    c.spacer(8);

    c.sectionHeader('5 — EKLER');
    c.paragraph(
      'Aşağıdaki evraklar, bu form çıktısıyla birlikte fiziksel olarak derneğe ulaştırılmalıdır:',
      7,
      10,
    );
    for (const doc of REQUIRED_DOCUMENTS) {
      c.checkboxRow([[doc, false]]);
    }
    c.spacer(4);

    c.sectionHeader('6 — İLETİŞİM TERCİHİ');
    c.checkboxRow(
      Object.entries(CONTACT_PREFERENCE_LABELS).map(([key, label]) => [label, data.contactPreference === key]),
    );
    c.spacer(4);

    c.sectionHeader('7 — DERNEK İÇİ KULLANIM');
    c.field('Yönetim Kurulu Karar ve Tarih Sayısı', '');
    c.spacer(16);
    c.paragraph('İlgili İmzalar', 9, 12, CONTENT_WIDTH, 0, INK);
    c.spacer(4);
    c.signatureRow(['Genel Sekreter', 'Sayman', 'Genel Başkan']);

    // --- Sayfa 3: Beyan/Onay, EK-1, EK-2, Tüzük Okuma Beyanı ---
    c.newPage();
    c.sectionHeader('8 — ÜYELİK BAŞVURU BEYANI VE ONAYI');
    c.bulletList(APPLICATION_DECLARATION_ITEMS, 8, 11);
    c.spacer(6);

    c.sectionHeader('EK-1 — DERNEK TÜZÜĞÜ (Özet)');
    c.paragraph(EK1_BYLAWS_TEXT, 7, 9.5, CONTENT_WIDTH, 0, INK);
    c.spacer(6);

    c.sectionHeader('EK-2 — KVKK AYDINLATMA METNİ');
    c.paragraph(EK2_KVKK_TEXT, 7, 9.5, CONTENT_WIDTH, 0, INK);
    c.spacer(10);

    c.sectionHeader('9 — TÜZÜK OKUMA BEYANI');
    c.checkboxRow([['Dernek tüzüğünü okudum anladım.', data.bylawsAcknowledged]]);
    c.field('Tarih', formatDate(data.applicationDate));
    c.signatureBox('Tarih / İmza (fiziksel imza için ayrılmıştır)');

    // --- Sayfa 4: Kredi Kartı / Otomatik Ödeme Talimatı ---
    c.newPage(false);
    c.title('KREDİ KARTI ÖDEME TALİMATI (MAIL ORDER) / OTOMATİK ÖDEME TALİMATI', CONTENT_WIDTH, 15);
    c.sectionHeader('Üye / Firma Bilgileri');
    c.field('Adı Soyadı', data.paymentHolderFullName ?? '');
    c.field('Şirket / Kurum Adı', data.paymentHolderCompanyName ?? '');
    c.field('Görevi / Ünvanı', data.paymentHolderTitle ?? '');
    c.field('Şirket / Kurum Adresi', data.paymentHolderCompanyAddress ?? '');
    c.spacer(4);

    c.sectionHeader('Tahsilat Türü');
    c.checkboxRow(
      Object.entries(COLLECTION_TYPE_LABELS).map(([key, label]) => [label, data.collectionType === key]),
    );
    c.spacer(4);

    c.sectionHeader('Tutar ve Otomatik Çekim Günü');
    if (data.collectionType === 'entry_fee') {
      c.field('Otomatik Çekim Tarihi', formatDate(data.autoDebitDate));
    } else if (data.collectionType === 'monthly_fee' || data.collectionType === 'both') {
      c.field(
        'Otomatik Çekim Günü',
        data.autoDebitDayOfMonth ? `Her ayın ${data.autoDebitDayOfMonth}'i` : '',
      );
    } else {
      c.field('Otomatik Çekim Tarihi / Günü', '');
    }
    c.paragraph('Tutar: Yönetim Kurulu onayı sonrası kesinleşen üyelik sınıfına göre belirlenir.', 8, 11);
    c.spacer(4);

    c.sectionHeader('Kart Bilgileri');
    c.paragraph(
      data.cardNumberLast4
        ? `Kart Numarası: **** **** **** ${data.cardNumberLast4}  (güvenlik nedeniyle bu PDF'de tam numara ve güvenlik kodu gösterilmez; tam veri sistemde şifreli saklanır)`
        : 'Kart bilgisi başvuru sırasında girilmedi.',
      8,
      11,
    );
    c.spacer(4);

    c.sectionHeader('Yetkilendirme Metni');
    c.paragraph(
      `Bu form kapsamında; seçtiğim tahsilat türü ve tutar(lar) doğrultusunda, kredi kartımdan ${org.name} tarafından tahsilat yapılmasına muvafakat ederim. Otomatik ödeme talimatı seçilmişse, iptal bildirimime kadar talimatın yürürlükte kalacağını kabul ederim.`,
      8,
      11,
      CONTENT_WIDTH,
      0,
      INK,
    );
    c.checkboxRow([['Karttan çekime rıza gösteriyorum', data.paymentConsent]]);
    c.spacer(4);

    c.sectionHeader('Banka Havalesi / EFT Bilgileri (Alternatif Ödeme)');
    c.paragraph(`Hesap Sahibi / Ünvan: ${org.name}`, 8, 11, CONTENT_WIDTH, 0, INK);
    c.paragraph('IBAN: TR13 0006 2000 6380 0006 2951 19', 8, 11, CONTENT_WIDTH, 0, INK);
    c.signatureBox('Tarih / İmza (fiziksel imza için ayrılmıştır)');

    // --- Alt bilgi bandı: tüm sayfa sayısı belli olduktan sonra tek geçişte çizilir ---
    const pages = doc.getPages();
    pages.forEach((page, index) => {
      this.drawFooter(page, regular, bold, org, index + 1, pages.length);
    });

    return this.pdfService.save(doc);
  }

  private drawFooter(page: PDFPage, regular: PDFFont, bold: PDFFont, org: Branding, pageNum: number, totalPages: number): void {
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: FOOTER_HEIGHT, color: BRAND_DARK });

    const addressLabel = `${org.shortName} Genel Merkezi adresi: `;
    const addressValue = org.address ?? '';
    const labelSize = 7.5;
    page.drawText(addressLabel, { x: MARGIN, y: FOOTER_HEIGHT / 2 - 3, size: labelSize, font: bold, color: WHITE });
    const labelWidth = bold.widthOfTextAtSize(addressLabel, labelSize);
    page.drawText(addressValue, {
      x: MARGIN + labelWidth,
      y: FOOTER_HEIGHT / 2 - 3,
      size: labelSize,
      font: regular,
      color: WHITE,
    });

    const contactParts = [org.website, org.email, org.phone].filter(Boolean) as string[];
    if (contactParts.length > 0) {
      const contactText = contactParts.join('  /  ');
      const contactWidth = regular.widthOfTextAtSize(contactText, labelSize);
      page.drawText(contactText, {
        x: PAGE_WIDTH - MARGIN - contactWidth,
        y: FOOTER_HEIGHT / 2 - 3,
        size: labelSize,
        font: regular,
        color: WHITE,
      });
    }

    const pageText = `sayfa ${pageNum}/${totalPages}`;
    const pageTextSize = 7;
    const pageTextWidth = regular.widthOfTextAtSize(pageText, pageTextSize);
    page.drawText(pageText, {
      x: PAGE_WIDTH - MARGIN - pageTextWidth,
      y: 8,
      size: pageTextSize,
      font: regular,
      color: rgb(1, 1, 1),
    });
  }
}
