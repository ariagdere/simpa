-- ═══════════════════════════════════════════════════════════
-- SIMPA ELEKTRİK — D1 VERİTABANI ŞEMASI
-- ═══════════════════════════════════════════════════════════

PRAGMA foreign_keys = ON;

-- 1. KATEGORİLER
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0
);

-- 2. ÜRÜNLER (= ürün ailesi, site'deki tekil ürün sayfası)
CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prod_code TEXT UNIQUE NOT NULL,
  title_tr TEXT,
  title_en TEXT,
  category_id INTEGER REFERENCES categories(id),
  material TEXT,              -- kısa kod: AL / CU / Pirinç (filtre için)
  origin TEXT,                -- Yerli / İthal
  brand TEXT,                 -- Simpa / Superpress
  has_variant_table INTEGER NOT NULL DEFAULT 0,  -- 0/1: Teknik Veriler sekmesi
  drawing_ref TEXT REFERENCES technical_drawings(ref_key),
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_products_category ON products(category_id);

-- 3. VARYANTLAR (60 ürünün "Alt Ürün Kodu" satırları)
CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_code TEXT UNIQUE NOT NULL,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- 4. VARYANT TEKNİK ÖZELLİKLERİ (esnek EAV — d1,d4,a,L... + adet/ağırlık)
CREATE TABLE variant_attributes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id),
  attr_key TEXT NOT NULL REFERENCES field_labels(attr_key),
  attr_value TEXT,
  group_key TEXT  -- 'boyut' | 'kunye_filtre' | 'ek_ozellik' | 'adet_agirlik'
);
CREATE INDEX idx_variant_attrs_variant ON variant_attributes(variant_id);
CREATE INDEX idx_variant_attrs_key ON variant_attributes(attr_key);

-- 5. ALAN ETİKETLERİ (TR/EN sözlük — künye + teknik + adet-ağırlık, TEK kayıt)
CREATE TABLE field_labels (
  attr_key TEXT PRIMARY KEY,
  label_tr TEXT,
  label_en TEXT,
  unit TEXT,
  group_key TEXT,
  sort_order INTEGER DEFAULT 0
);

-- 6. ÜRÜN KÜNYESİ (dinamik key-value, sadece dolu alanlar gösterilir)
-- attr_key seti: MATERYAL, KAPLAMA, BAGLANTI, BORU_ET_KALINLIGI, KABLO_GIRISI,
-- DIN_NORMU, IZOLASYON, SIKMA_ARALIGI, UZUNLUK, AGIRLIK, SIKMA_SEKLI,
-- AGIZ_ACIKLIGI, SIKMA_KUVVETI, KESME_ARALIGI, CALISMA_SICAKLIGI  (künye kutusu, 15 alan)
-- + OZELLIKLER   (künyede DEĞİL — Ürün Açıklaması sekmesinin içeriği)
-- + SPECIAL_NOTE (künyenin hemen altı, ayrı blok)
CREATE TABLE product_specs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  attr_key TEXT NOT NULL REFERENCES field_labels(attr_key),
  value_tr TEXT,
  value_en TEXT
);
CREATE INDEX idx_specs_product ON product_specs(product_id);
CREATE UNIQUE INDEX idx_specs_product_attr ON product_specs(product_id, attr_key);

-- 7. TEKNİK ÇİZİMLER (bir çizim birden fazla ürüne bağlanabilir)
CREATE TABLE technical_drawings (
  ref_key TEXT PRIMARY KEY,
  file_url TEXT
);

-- 8. GÖRSELLER
CREATE TABLE product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id),
  file_url TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_images_product ON product_images(product_id);

-- 9. SERTİFİKALAR
CREATE TABLE certificates (
  tag TEXT PRIMARY KEY,
  name TEXT,
  file_url_tr TEXT,
  file_url_en TEXT
);

CREATE TABLE product_certificates (
  product_id INTEGER NOT NULL REFERENCES products(id),
  cert_tag TEXT NOT NULL REFERENCES certificates(tag),
  PRIMARY KEY (product_id, cert_tag)
);

-- 10. UYUMLULUK (alet ↔ seri ilişkisi — üstte "Uyumlu Ürünler" olarak gösterilir)
CREATE TABLE product_compatibility (
  product_id INTEGER NOT NULL REFERENCES products(id),
  compatible_product_id INTEGER NOT NULL REFERENCES products(id),
  PRIMARY KEY (product_id, compatible_product_id)
);

-- 11. RENK ÇEVİRİ SÖZLÜĞÜ (variant_attributes'taki RENK değerleri için)
CREATE TABLE color_translations (
  color_tr TEXT PRIMARY KEY,
  color_en TEXT
);

-- 12. BELGELER (kataloglar, fiyat listeleri — genel, ürün/kategoriyle eşleşmiyor)
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_tr TEXT,
  title_en TEXT,
  doc_type TEXT,               -- 'katalog' | 'fiyat_listesi' | 'diger'
  category_id INTEGER REFERENCES categories(id),  -- şimdilik hep NULL, ileride kullanılabilir
  file_url_tr TEXT,
  file_url_en TEXT,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_documents_category ON documents(category_id);
