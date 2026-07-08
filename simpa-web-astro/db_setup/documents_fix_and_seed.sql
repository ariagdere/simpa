DROP TABLE IF EXISTS documents;
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_tr TEXT,
  title_en TEXT,
  doc_type TEXT,
  category_id INTEGER REFERENCES categories(id),
  file_url_tr TEXT,
  file_url_en TEXT,
  sort_order INTEGER DEFAULT 0
);
CREATE INDEX idx_documents_category ON documents(category_id);
INSERT INTO documents (title_tr, title_en, doc_type, category_id, file_url_tr, file_url_en, sort_order) VALUES
('2026 Ocak Fiyat Listesi', '2026 January Price List', 'fiyat_listesi', NULL, 'Simpa_Ocak_2026_Liste_Fiyatlari.xlsx', NULL, 1),
('Simpa Ürün Kataloğu', 'Simpa Product Catalogue', 'katalog', NULL, 'SimpaKatalog2026.pdf', 'SimpaCatalogue2026.pdf', 2),
('Superpress Ürün Kataloğu', 'Superpress Product Catalogue', 'katalog', NULL, 'SUPERPRESS_Catalogue2026.pdf', 'SUPERPRESS_Catalogue2026.pdf', 3);
