import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import { PdfService } from '../pdf/pdf.service';
import { getSectorName } from '../common/utils/search.util';

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.4, 0.4, 0.4);

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
  location?: string;
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
  cardNumberLast4?: string;
  paymentConsent: boolean;
  bylawsAcknowledged: boolean;
}

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

const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  individual: 'Bireysel',
  corporate: 'Kurumsal',
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

class PageCursor {
  y: number;
  constructor(
    private readonly doc: PDFDocument,
    public page: PDFPage,
    private readonly regular: PDFFont,
    private readonly bold: PDFFont,
  ) {
    this.y = PAGE_HEIGHT - MARGIN;
  }

  newPage(): void {
    this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensureSpace(height: number): void {
    if (this.y - height < MARGIN) this.newPage();
  }

  title(text: string): void {
    const size = 15;
    const lines = this.wrapText(text, this.bold, size, CONTENT_WIDTH);
    for (const line of lines) {
      this.ensureSpace(20);
      this.page.drawText(line, { x: MARGIN, y: this.y, size, font: this.bold, color: BLACK });
      this.y -= 20;
    }
    this.y -= 4;
  }

  sectionHeader(text: string): void {
    this.ensureSpace(22);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y + 4 },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y + 4 },
      thickness: 0.5,
      color: GRAY,
    });
    this.page.drawText(text, { x: MARGIN, y: this.y - 10, size: 11, font: this.bold, color: BLACK });
    this.y -= 26;
  }

  field(label: string, value: string, xOffset = 0, width = CONTENT_WIDTH): void {
    this.ensureSpace(16);
    const x = MARGIN + xOffset;
    this.page.drawText(`${label}:`, { x, y: this.y, size: 9, font: this.bold, color: GRAY });
    const labelWidth = this.bold.widthOfTextAtSize(`${label}: `, 9);
    const maxValueWidth = width - labelWidth;
    const truncated = this.fitText(value || '—', this.regular, 10, maxValueWidth);
    this.page.drawText(truncated, { x: x + labelWidth, y: this.y, size: 10, font: this.regular, color: BLACK });
    this.y -= 16;
  }

  fieldRow(fields: [string, string][]): void {
    const colWidth = CONTENT_WIDTH / fields.length;
    this.ensureSpace(16);
    fields.forEach(([label, value], i) => this.field(label, value, i * colWidth, colWidth - 10));
  }

  checkbox(label: string, checked: boolean, xOffset = 0): number {
    const x = MARGIN + xOffset;
    this.page.drawRectangle({
      x,
      y: this.y - 1,
      width: 9,
      height: 9,
      borderColor: BLACK,
      borderWidth: 1,
      color: checked ? BLACK : undefined,
    });
    this.page.drawText(label, { x: x + 13, y: this.y, size: 9, font: this.regular, color: BLACK });
    return this.regular.widthOfTextAtSize(label, 9) + 20;
  }

  checkboxRow(items: [string, boolean][]): void {
    this.ensureSpace(16);
    let x = 0;
    for (const [label, checked] of items) {
      x += this.checkbox(label, checked, x);
    }
    this.y -= 18;
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

  paragraph(text: string, size = 8, lineHeight = 10, width = CONTENT_WIDTH, xOffset = 0): void {
    for (const paraLine of text.split('\n')) {
      const lines = this.wrapText(paraLine, this.regular, size, width);
      for (const line of lines) {
        this.ensureSpace(lineHeight);
        this.page.drawText(line, { x: MARGIN + xOffset, y: this.y, size, font: this.regular, color: BLACK });
        this.y -= lineHeight;
      }
    }
  }

  bulletList(items: string[], size = 9, lineHeight = 12): void {
    for (const item of items) {
      const lines = this.wrapText(item, this.regular, size, CONTENT_WIDTH - 14);
      lines.forEach((line, i) => {
        this.ensureSpace(lineHeight);
        this.page.drawText(i === 0 ? '•' : '', { x: MARGIN, y: this.y, size, font: this.bold, color: BLACK });
        this.page.drawText(line, { x: MARGIN + 14, y: this.y, size, font: this.regular, color: BLACK });
        this.y -= lineHeight;
      });
    }
  }

  spacer(height: number): void {
    this.y -= height;
  }

  signatureBox(label: string): void {
    this.ensureSpace(40);
    this.y -= 20;
    this.page.drawLine({
      start: { x: PAGE_WIDTH - MARGIN - 180, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.5,
      color: GRAY,
    });
    this.page.drawText(label, { x: PAGE_WIDTH - MARGIN - 180, y: this.y - 12, size: 8, font: this.regular, color: GRAY });
    this.y -= 20;
  }
}

// Fiziksel "assid-uyelik-formu.pdf" başvuru formunu taban alarak, başvuru
// sırasında toplanan verilerle A4 formatında yeni bir PDF üretir (mevcut
// taranmış şablonun üzerine koordinat bazlı basmak yerine — bakım kolaylığı
// ve pdf-lib'in font subsetting sınırlamaları nedeniyle bu yol seçildi).
// Fiziksel formda dernek yönetiminin doldurduğu/kullandığı bölümler (Sektör
// Durumu, Dernek İçi Kullanım, imza kutuları, Ücretler tablosu) boş/statik
// şablon olarak basılır.
@Injectable()
export class MembershipApplicationPdfService {
  constructor(private readonly pdfService: PdfService) {}

  async generate(data: MembershipApplicationPdfData): Promise<Buffer> {
    const doc = await this.pdfService.create();
    const { regular, bold } = await this.pdfService.embedTrFonts(doc);
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const c = new PageCursor(doc, page, regular, bold);

    // --- Sayfa 1: Genel / Üyelik Sınıfı / Kişisel Bilgiler ---
    c.page.drawText(`BAŞVURU TARİHİ: ${formatDate(data.applicationDate)}`, {
      x: PAGE_WIDTH - MARGIN - 160,
      y: c.y,
      size: 9,
      font: regular,
      color: GRAY,
    });
    c.title('ÜYELİK BAŞVURU FORMU');
    c.paragraph('* Lütfen formu eksiksiz doldurunuz. Başvurunuz Yönetim Kurulunun değerlendirmesine sunulacaktır.', 8, 11);
    c.spacer(8);

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
    c.field('Lokasyon', data.location ?? '');
    c.field('Faaliyet Alanı / Sektör', data.sectors.map(getSectorName).join(', '));
    c.checkboxRow(
      Object.entries(BUSINESS_ACTIVITY_LABELS).map(([key, label]) => [
        label,
        data.businessActivityTypes?.includes(key) ?? false,
      ]),
    );
    c.field('Referanslar', data.references ?? '');
    c.spacer(6);

    c.sectionHeader('2 — ÜYELİK SINIFI');
    c.checkboxRow([
      ['Bireysel', data.membershipType === 'individual'],
      ['Kurumsal', data.membershipType === 'corporate'],
    ]);
    c.paragraph('Sektör Durumu (Sektör İçi / Sektör Dışı): * Bu kısım Yönetim Kurulu tarafından doldurulacaktır.', 8, 11);
    c.paragraph('* Sınıflandırma ve nihai üyelik sınıfı Yönetim Kurulu değerlendirmesiyle kesinleşir.', 7, 10);
    c.spacer(6);

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
    c.paragraph('Sektör İçi Bireysel: 10.000₺   |   Sektör İçi Kurumsal: 20.000₺   |   Sektör Dışı Bireysel: 50.000₺', 8, 12);
    c.paragraph('Sektör Dışı Kurumsal: 80.000₺   |   Aylık Aidat: 1.000₺', 8, 12);
    c.paragraph('* Kesin üyelik sınıfı ve tutar, Yönetim Kurulu onayı sonrası belirlenir.', 7, 10);
    c.spacer(8);

    c.sectionHeader('5 — EKLER');
    c.bulletList(data.documentLabels.length > 0 ? data.documentLabels : ['(Başvuruyla birlikte ek belge yüklenmedi)']);
    c.spacer(4);

    c.sectionHeader('6 — İLETİŞİM TERCİHİ');
    c.checkboxRow(
      Object.entries(CONTACT_PREFERENCE_LABELS).map(([key, label]) => [label, data.contactPreference === key]),
    );
    c.spacer(6);

    c.sectionHeader('7 — DERNEK İÇİ KULLANIM');
    c.paragraph('Yönetim Kurulu Karar ve Tarih Sayısı: ____________________', 9, 14);
    c.spacer(30);
    c.fieldRow([
      ['Genel Sekreter (imza)', ''],
      ['Sayman (imza)', ''],
      ['Genel Başkan (imza)', ''],
    ]);

    // --- Sayfa 3: Beyan/Onay, EK-1, EK-2, Tüzük Okuma Beyanı ---
    c.newPage();
    c.sectionHeader('8 — ÜYELİK BAŞVURU BEYANI VE ONAYI');
    c.bulletList(APPLICATION_DECLARATION_ITEMS, 8, 11);
    c.spacer(6);

    c.sectionHeader('EK-1 — DERNEK TÜZÜĞÜ (Özet)');
    c.paragraph(EK1_BYLAWS_TEXT, 7, 9.5);
    c.spacer(6);

    c.sectionHeader('EK-2 — KVKK AYDINLATMA METNİ');
    c.paragraph(EK2_KVKK_TEXT, 7, 9.5);
    c.spacer(10);

    c.sectionHeader('9 — TÜZÜK OKUMA BEYANI');
    c.checkboxRow([['Dernek tüzüğünü okudum anladım.', data.bylawsAcknowledged]]);
    c.field('Tarih', formatDate(data.applicationDate));
    c.signatureBox('Tarih / İmza (fiziksel imza için ayrılmıştır)');

    // --- Sayfa 4: Kredi Kartı / Otomatik Ödeme Talimatı ---
    c.newPage();
    c.title('KREDİ KARTI ÖDEME TALİMATI (MAIL ORDER) / OTOMATİK ÖDEME TALİMATI');
    c.sectionHeader('Üye / Firma Bilgileri');
    c.field('Adı Soyadı', data.fullName);
    c.field('Şirket / Kurum Adı', data.companyName ?? '');
    c.field('Görevi / Ünvanı', data.title ?? '');
    c.field('Şirket / Kurum Adresi', data.companyAddress ?? '');
    c.spacer(6);

    c.sectionHeader('Tahsilat Türü');
    c.checkboxRow(
      Object.entries(COLLECTION_TYPE_LABELS).map(([key, label]) => [label, data.collectionType === key]),
    );
    c.spacer(6);

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
    c.spacer(6);

    c.sectionHeader('Kart Bilgileri');
    c.paragraph(
      data.cardNumberLast4
        ? `Kart Numarası: **** **** **** ${data.cardNumberLast4}  (güvenlik nedeniyle bu PDF'de tam numara ve güvenlik kodu gösterilmez; tam veri sistemde şifreli saklanır)`
        : 'Kart bilgisi başvuru sırasında girilmedi.',
      8,
      11,
    );
    c.spacer(6);

    c.sectionHeader('Yetkilendirme Metni');
    c.paragraph(
      "Bu form kapsamında; seçtiğim tahsilat türü ve tutar(lar) doğrultusunda, kredi kartımdan Ankara Siteler Sanayici ve İş İnsanları Derneği (ASSİD) tarafından tahsilat yapılmasına muvafakat ederim. Otomatik ödeme talimatı seçilmişse, iptal bildirimime kadar talimatın yürürlükte kalacağını kabul ederim.",
      8,
      11,
    );
    c.checkboxRow([['Karttan çekime rıza gösteriyorum', data.paymentConsent]]);
    c.spacer(6);

    c.sectionHeader('Banka Havalesi / EFT Bilgileri (Alternatif Ödeme)');
    c.paragraph('Hesap Sahibi / Ünvan: Ankara Siteler Sanayici ve İş İnsanları Derneği (ASSİD)', 8, 11);
    c.paragraph('IBAN: TR13 0006 2000 6380 0006 2951 19', 8, 11);
    c.signatureBox('Tarih / İmza (fiziksel imza için ayrılmıştır)');

    return this.pdfService.save(doc);
  }
}
