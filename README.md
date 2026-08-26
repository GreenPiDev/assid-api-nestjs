# Dernek Yönetim Sistemi — Backend

NestJS + PostgreSQL (Prisma) ile yazılmış, dernekler için beyaz etiketli (white-label) bir üyelik/içerik yönetim API'si. Kod tabanında herhangi bir derneğe özel isim/marka hardcode edilmemiştir; kuruluşa özel bilgiler (isim, logo, iletişim) `organization-settings` modülünden yönetilir.

## Modüller

| Modül | Açıklama |
| --- | --- |
| `members` | Üye başvuruları ve firma kayıtları. `isApproved` alanı ile admin onayı gerektirir; onaylanmamış üyeler herkese açık listelerde görünmez. |
| `news` | Sektörel haberler / duyurular (`Event`'ten bağımsız bir içerik türü). |
| `events` | Derneğin etkinlikleri (tarih, yer, açıklama). |
| `organization-settings` | Tek kayıtlık (singleton) kuruluş profili: isim, logo, adres, iletişim, sosyal medya. |
| `sectors` (common) | Sektörler admin tarafından yönetilmez, sistemde sabit bir enum'dur (`common/constants/sector.constant.ts`). |

## Kurulum (Local Development)

```bash
npm install
cp .env.example .env        # DATABASE_URL vb. kendi ortamına göre düzenle
docker compose up -d        # local PostgreSQL container'ını başlatır (host port 5434)
npx prisma migrate deploy   # migration'ları local veritabanına uygular
npm run start:dev
```

API varsayılan olarak `http://localhost:4000/api` altında çalışır. `npm run start:dev` watch modunda çalışır (dosya değişince otomatik yeniden başlar).

Local `docker-compose.yml` sadece geliştirme için bir PostgreSQL container'ı tanımlar; production PostgreSQL'den tamamen bağımsızdır.

## Örnek Veri (Seed)

```bash
npm run seed
```

`src/seed/data/*.seed.json` içindeki örnek üye, haber ve etkinlik verilerini veritabanına yazar (mevcut members/news/events koleksiyonlarını temizleyip yeniden doldurur).

## Notlar

- Sektör listesi frontend ile birebir aynı slug'ları kullanır (`src/common/constants/sector.constant.ts`).

## Deployment

### Branch stratejisi

```text
main          → staging / geliştirme branch'i
production    → gerçek production branch'i
```

Akış: `main` üzerinde geliştirme ve test yapılır → değişiklikler `production` branch'ine merge/push edilir → GitHub Actions otomatik olarak VPS'e deploy eder.

### GitHub Actions

`.github/workflows/deploy-production.yml` workflow'u **sadece `production` branch'ine push olduğunda** çalışır. Workflow, SSH ile VPS'e bağlanır ve `/opt/apps/assid` dizininde şu adımları uygular:

1. `git fetch` / `git reset --hard origin/production` ile repository'yi günceller (VPS'teki `.env` dosyası git tarafından takip edilmediği için etkilenmez)
2. `docker compose -f docker-compose.prod.yml build` ile yeni image'ı build eder
3. `docker compose -f docker-compose.prod.yml run --rm assid npx prisma migrate deploy` ile migration'ları **var olan** production veritabanına uygular (veritabanını silmez/recreate etmez)
4. `docker compose -f docker-compose.prod.yml up -d` ile `assid` container'ını günceller
5. `curl` ile `/api/sectors` endpoint'ine health check yapar; başarısız olursa workflow fail olur

Production PostgreSQL, VPS üzerinde ayrı ve önceden var olan bir container'dır (`postgres`, `backend` network'ü). Bu repodaki compose dosyaları PostgreSQL'i **hiçbir zaman** tanımlamaz/oluşturmaz/silmez.

### Gerekli GitHub Secrets

| Secret | Açıklama |
| --- | --- |
| `VPS_HOST` | VPS sunucu adresi |
| `VPS_USER` | SSH kullanıcısı (`deploy`) |
| `VPS_SSH_KEY` | VPS'e bağlanmak için kullanılan private SSH key |
| `VPS_PORT` | (opsiyonel) SSH portu, belirtilmezse 22 kullanılır |

Production `.env` dosyası GitHub Secrets'a taşınmaz; VPS üzerinde zaten mevcuttur ve deployment onu değiştirmez.

### VPS tarafı ön koşulları

- `/opt/apps/assid` altında repository'nin `production` branch'ine checkout edilmiş bir klonu bulunmalı (GitHub'a SSH ile authenticate olmuş `deploy` kullanıcısı üzerinden).
- Aynı dizinde, git tarafından takip edilmeyen bir production `.env` dosyası bulunmalı (bkz. `.env.example` ve aşağıdaki liste).
- `backend` adında bir Docker network'ü ve bu network'te çalışan `postgres` container'ı önceden var olmalı.

Production `.env` içermesi gereken değişkenler: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_PASS`, `FRONTEND_URL`.

Production `DATABASE_URL` formatı (container'dan container'a, host portu değil Postgres'in container portu kullanılır):

```env
DATABASE_URL=postgresql://assid_user:PRODUCTION_PASSWORD@postgres:5432/assid_db?schema=public
```

### Manuel deployment (ihtiyaç halinde)

```bash
cd /opt/apps/assid
git fetch origin production
git checkout production
git reset --hard origin/production
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml run --rm assid npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
docker logs assid --tail 50
```
