# Simpa Elektrik — Web Sitesi (Astro + Cloudflare Pages + D1 + R2)

## Bu Paketin İçeriği

Faz 2'nin ilk çalışan parçası: **ürün detay sayfası** (`/urunler/[code]`), tamamen D1'den
gerçek veriyle besleniyor. `SKP-S3`, `SP-HSP/300` gibi kodlarla test edildi; künye,
teknik veri tablosu, teknik çizim, sertifikalar, ürün açıklaması, uyumlu ürünler ve
"bu kategorideki diğer ürünler" bölümleri veriye göre otomatik gösteriliyor/gizleniyor.

## ÖNEMLİ — Pages Değil, Workers Kullanıyoruz

Astro'nun Cloudflare adapter'ı (v14, Astro 7 ile) **artık Cloudflare Pages'i desteklemiyor** —
sadece **Cloudflare Workers (Static Assets ile)** hedefliyor. Bu yüzden önceden kurduğumuz
"Pages projesi" bu proje ile uyumlu değil; D1 binding eklemek "tutmuyor" ve GitHub push'ları
otomatik deploy tetiklemiyor çünkü Cloudflare o projeyi hâlâ eski Pages formatında bekliyor.

### Yapman Gerekenler (Cloudflare Dashboard'da)

1. **Eski Pages projesini kullanmayı bırak** (silmene gerek yok, sadece artık kullanmıyoruz)
2. **Workers & Pages → Create Application → "Import a repository"** (Pages sekmesi DEĞİL, bu
   doğrudan Workers tarafındaki Git entegrasyonu — "Workers Builds" olarak adlandırılıyor)
3. Aynı GitHub reponu seç, bağlan
4. Build komutu: `npm run build`
5. **Deploy command:** `npx wrangler deploy --config dist/server/wrangler.json`
   (Cloudflare bunu build ayarlarında "Deploy command" alanına yazman istenecek)
6. Bağlantı kurulunca **Settings → Bindings** kısmından D1'i ekle: `DB` = `simpa-db`
   (Bu sefer gerçekten kalıcı olacak — çünkü artık proje türü uyumlu)
7. Bundan sonra her `git push` otomatik build + deploy tetikleyecek (Workers Builds ile)

## Kurulum

```bash
npm install
```

## wrangler.toml — Database ID'yi Doldur

`wrangler.toml` dosyasında şunu gerçek D1 database ID'niz ile değiştirin
(Cloudflare Dashboard → Workers & Pages → D1 → simpa-db → Settings'te görünür):

```toml
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

## Yerel Geliştirme

Yerel D1 simülasyonuna şema + veriyi yükleyin (bir kere yapılır):

```bash
npx wrangler d1 execute simpa-db --local --file=db_setup/schema.sql
for f in db_setup/seed_data_part*.sql; do npx wrangler d1 execute simpa-db --local --file=$f; done
npx wrangler d1 execute simpa-db --local --file=db_setup/documents_fix_and_seed.sql
npx wrangler d1 execute simpa-db --local --file=db_setup/color_translations_update.sql
npx wrangler d1 execute simpa-db --local --file=db_setup/r2_url_update.sql
```

Sonra:

```bash
npm run build
npx wrangler dev --config dist/server/wrangler.json
```

Tarayıcıda: `http://localhost:8788/urunler/SKP-S3`

## Cloudflare Pages'e Deploy

GitHub reposuna push edin, Cloudflare Pages projesi zaten GitHub'a bağlı olduğu için
otomatik build/deploy tetiklenecek. **Pages projesinin ayarlarında D1 binding'ini
eklemeyi unutmayın** (Settings → Functions → D1 database bindings → `DB` = `simpa-db`).

## Proje Yapısı

```
src/
  layouts/Layout.astro       — ortak header/footer/global CSS
  lib/queries.js             — tüm D1 sorguları (tek yerden yönetiliyor)
  pages/
    index.astro              — geçici ürün listesi (Faz 2 devam ederken)
    urunler/[code].astro     — ürün detay sayfası (asıl iş burada)
    api/documents.js         — genel katalog/fiyat listesi API'si
  styles/global.css          — prototipten aktarılan tüm CSS
```

## Bilinen Sınırlamalar (Sıradaki İterasyonlar)

- **Sadece TR dili aktif.** EN route'u (`/en/urunler/[code]` gibi) henüz eklenmedi —
  `queries.js` fonksiyonları zaten `lang` parametresi alıyor, sadece sayfa routing'i eklenecek.
- **Çizimi olan ama teknik tablosu olmayan ürünler** (örn. bazı aletler) şu an çizimi göstermiyor,
  çünkü çizim paneli sadece Teknik Veriler sekmesi içinde render ediliyor. İstersen bunu
  künye kutusunun yanına bağımsız bir görsel olarak da ekleyebiliriz.
- Ana sayfa, kategori sayfaları, kombine sayfa gibi diğer prototip sayfaları henüz D1'e bağlanmadı —
  sırada bunlar var.
- Galeri thumbnail tıklama davranışı (büyük görseli değiştirme) henüz JS ile bağlanmadı.
