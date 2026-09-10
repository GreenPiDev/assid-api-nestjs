import {
  Equals,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import {
  BusinessActivityType,
  CollectionType,
  ContactPreference,
  MaritalStatus,
  MembershipType,
} from '@prisma/client';
import { SECTOR_SLUGS, SectorSlug } from '../../common/constants/sector.constant';

/**
 * Public membership-application payload. Deliberately narrower than
 * CreateMemberDto: it omits applicationStatus, logo and notes so a public,
 * unauthenticated submitter can never set those (class-validator's global
 * whitelist:true strips any such fields from the request body).
 */
export class ApplyMemberDto {
  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  companyAddress?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsEmail()
  email: string;

  @IsArray()
  @IsIn(SECTOR_SLUGS, { each: true })
  sectors: SectorSlug[];

  @IsOptional()
  @IsArray()
  @IsEnum(BusinessActivityType, { each: true })
  businessActivityTypes?: BusinessActivityType[];

  @IsOptional()
  @IsString()
  references?: string;

  @IsOptional()
  @IsEnum(MembershipType)
  membershipType?: MembershipType;

  // "Sektör Durumu" (Sektör İçi / Sektör Dışı) bilinçli olarak burada yok:
  // fiziksel başvuru formunda "Bu kısım Yönetim Kurulu tarafından
  // doldurulacaktır" notuyla ayrılmış — admin panelinden setlenir.

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  birthPlace?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @Matches(/^[0-9]{11}$/, { message: 'TC Kimlik No 11 haneli sayısal olmalıdır' })
  nationalId?: string;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsString()
  faxPhone?: string;

  @IsOptional()
  @IsString()
  personalMobilePhone?: string;

  @IsOptional()
  @IsString()
  affiliatedOrganizations?: string;

  @IsOptional()
  @IsEnum(ContactPreference)
  contactPreference?: ContactPreference;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  activityAreas?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productsAndServices?: string[];

  @Equals(true, { message: 'KVKK Aydınlatma Metni onaylanmalıdır' })
  kvkkConsent: boolean;

  @Equals(true, { message: 'Dernek tüzüğü onaylanmalıdır' })
  bylawsAcknowledged: boolean;

  @Equals(true, { message: 'Bilgilerin doğruluğu onaylanmalıdır' })
  infoAccuracyConfirmed: boolean;

  // --- Ödeme tercihi (opsiyonel) — ödeme entegrasyonu yok, çekim işlemini
  // dernek yönetimi bu verilerle manuel yapar. Kart alanları sağlanmışsa
  // paymentConsent zorunlu hale gelir (controller'da doğrulanır).
  @IsOptional()
  @IsEnum(CollectionType)
  collectionType?: CollectionType;

  // Giriş Aidatı (tek seferlik) seçildiğinde tam tarih; Aylık Aidat/Her
  // İkisi (tekrarlayan) seçildiğinde ayın günü (1-31) kullanılır.
  @IsOptional()
  @IsDateString()
  autoDebitDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  autoDebitDayOfMonth?: number;

  @IsOptional()
  @IsString()
  cardHolderName?: string;

  @IsOptional()
  @IsString()
  cardNumber?: string;

  @IsOptional()
  @IsString()
  cardExpiry?: string;

  @IsOptional()
  @IsString()
  cardCvc?: string;

  @IsOptional()
  paymentConsent?: boolean;
}
