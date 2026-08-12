# Dernek Yönetim Sistemi — Backend

NestJS + MongoDB (Mongoose) ile yazılmış, dernekler için beyaz etiketli (white-label) bir üyelik/içerik yönetim API'si. Kod tabanında herhangi bir derneğe özel isim/marka hardcode edilmemiştir; kuruluşa özel bilgiler (isim, logo, iletişim) `organization-settings` modülünden yönetilir.

## Modüller

| Modül | Açıklama |
| --- | --- |
| `members` | Üye başvuruları ve firma kayıtları. `isApproved` alanı ile admin onayı gerektirir; onaylanmamış üyeler herkese açık listelerde görünmez. |
| `news` | Sektörel haberler / duyurular (`Event`'ten bağımsız bir içerik türü). |
| `events` | Derneğin etkinlikleri (tarih, yer, açıklama). |
| `organization-settings` | Tek kayıtlık (singleton) kuruluş profili: isim, logo, adres, iletişim, sosyal medya. |
| `sectors` (common) | Sektörler admin tarafından yönetilmez, sistemde sabit bir enum'dur (`common/constants/sector.constant.ts`). |

## Kurulum

```bash
npm install
cp .env.example .env   # MONGODB_URI ve PORT'u kendi ortamına göre düzenle
npm run start:dev
```

API varsayılan olarak `http://localhost:3000/api` altında çalışır.

## Ortam Değişkenleri

```
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/your-db-name
```

## Örnek Veri (Seed)

```bash
npm run seed
```

`src/seed/data/*.seed.json` içindeki örnek üye, haber ve etkinlik verilerini veritabanına yazar (mevcut members/news/events koleksiyonlarını temizleyip yeniden doldurur).

## Notlar

- Kimlik doğrulama / admin girişi henüz eklenmedi; üye ve admin panelleri için ayrı bir auth modülü gerekecek.
- Sektör listesi frontend ile birebir aynı slug'ları kullanır (`src/common/constants/sector.constant.ts`).
