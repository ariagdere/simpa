// src/lib/queries.js
// D1 veri erişim katmanı — ürün sayfası için gereken tüm sorgular burada.

/**
 * Ürünü prod_code'a göre getirir. Dil görünürlük kuralı burada uygulanır:
 * TR sitede title_tr NULL ise, EN sitede title_en NULL ise ürün bulunamaz sayılır.
 */
export async function getProduct(db, prodCode, lang) {
  const titleCol = lang === 'en' ? 'title_en' : 'title_tr';
  const row = await db
    .prepare(
      `SELECT p.*, c.name_tr as category_name_tr, c.name_en as category_name_en, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.prod_code = ? AND p.${titleCol} IS NOT NULL AND p.is_active = 1`
    )
    .bind(prodCode)
    .first();
  return row || null;
}

/** Künye kutusu: product_specs'ten OZELLIKLER ve SPECIAL_NOTE hariç, dolu olan alanlar, field_labels sırasına göre. */
export async function getProductSpecs(db, productId, lang) {
  const valueCol = lang === 'en' ? 'value_en' : 'value_tr';
  const { results } = await db
    .prepare(
      `SELECT ps.attr_key, ps.${valueCol} as value, fl.label_tr, fl.label_en, fl.sort_order
       FROM product_specs ps
       JOIN field_labels fl ON fl.attr_key = ps.attr_key
       WHERE ps.product_id = ?
         AND ps.attr_key NOT IN ('OZELLIKLER','SPECIAL_NOTE')
         AND ps.${valueCol} IS NOT NULL
       ORDER BY fl.sort_order`
    )
    .bind(productId)
    .all();
  return results;
}

/** Ürün Açıklaması sekmesi içeriği (Özellikler alanından). NULL ise sekme gösterilmez. */
export async function getProductDescription(db, productId, lang) {
  const valueCol = lang === 'en' ? 'value_en' : 'value_tr';
  const row = await db
    .prepare(`SELECT ${valueCol} as value FROM product_specs WHERE product_id = ? AND attr_key = 'OZELLIKLER'`)
    .bind(productId)
    .first();
  return row ? row.value : null;
}

/** Künye kutusunun hemen altındaki özel not (varsa). */
export async function getSpecialNote(db, productId, lang) {
  const valueCol = lang === 'en' ? 'value_en' : 'value_tr';
  const row = await db
    .prepare(`SELECT ${valueCol} as value FROM product_specs WHERE product_id = ? AND attr_key = 'SPECIAL_NOTE'`)
    .bind(productId)
    .first();
  return row ? row.value : null;
}

/** Teknik çizim URL'i (varsa). */
export async function getDrawing(db, drawingRef) {
  if (!drawingRef) return null;
  const row = await db
    .prepare('SELECT file_url FROM technical_drawings WHERE ref_key = ?')
    .bind(drawingRef)
    .first();
  return row ? row.file_url : null;
}

/** Ürün görselleri (galeri), sıralı. */
export async function getImages(db, productId) {
  const { results } = await db
    .prepare('SELECT file_url, is_primary FROM product_images WHERE product_id = ? ORDER BY sort_order')
    .bind(productId)
    .all();
  return results;
}

/** Sertifika rozetleri. */
export async function getCertificates(db, productId) {
  const { results } = await db
    .prepare(
      `SELECT c.tag, c.name FROM product_certificates pc
       JOIN certificates c ON c.tag = pc.cert_tag
       WHERE pc.product_id = ?`
    )
    .bind(productId)
    .all();
  return results;
}

/**
 * Teknik veriler tablosu: her varyant + her varyantın attribute'ları.
 * Sadece products.has_variant_table = 1 olan ürünlerde çağrılır.
 * Dönen yapı: { columns: [{attr_key,label,unit,group_key}], rows: [{variant_code, values: {attr_key: value}}] }
 */
export async function getVariantTable(db, productId, lang) {
  const labelCol = lang === 'en' ? 'label_en' : 'label_tr';

  const { results: variants } = await db
    .prepare('SELECT id, variant_code FROM product_variants WHERE product_id = ? ORDER BY sort_order')
    .bind(productId)
    .all();

  if (variants.length === 0) return { columns: [], rows: [] };

  const variantIds = variants.map((v) => v.id);
  const placeholders = variantIds.map(() => '?').join(',');
  const { results: attrs } = await db
    .prepare(
      `SELECT va.variant_id, va.attr_key, va.attr_value, va.group_key, fl.${labelCol} as label, fl.unit, fl.sort_order
       FROM variant_attributes va
       JOIN field_labels fl ON fl.attr_key = va.attr_key
       WHERE va.variant_id IN (${placeholders})
       ORDER BY fl.sort_order`
    )
    .bind(...variantIds)
    .all();

  // Hangi kolonlar kullanılıyor (bu ürün ailesinde dolu olan attr_key'ler) — sırayla, tekil
  const columnMap = new Map();
  for (const a of attrs) {
    if (!columnMap.has(a.attr_key)) {
      columnMap.set(a.attr_key, { attr_key: a.attr_key, label: a.label, unit: a.unit, group_key: a.group_key, sort_order: a.sort_order });
    }
  }
  const columns = [...columnMap.values()].sort((x, y) => x.sort_order - y.sort_order);

  // Varyant bazlı değer haritası
  const byVariant = new Map(variants.map((v) => [v.id, { variant_code: v.variant_code, values: {} }]));
  for (const a of attrs) {
    byVariant.get(a.variant_id).values[a.attr_key] = a.attr_value;
  }

  return { columns, rows: [...byVariant.values()] };
}

/** Künye kutusunda gösterilecek "Kablo Kesiti: 16-240mm²" / "Civata: M5-M16" gibi aralıklar. */
export async function getKunyeRanges(db, productId, lang) {
  const { results } = await db
    .prepare(`SELECT attr_key, attr_value FROM variant_attributes WHERE variant_id IN (SELECT id FROM product_variants WHERE product_id = ?) AND attr_key IN ('KABLO_KESITI','CIVATA')`)
    .bind(productId)
    .all();

  const kesitVals = [...new Set(results.filter((r) => r.attr_key === 'KABLO_KESITI').map((r) => r.attr_value))];
  const civataVals = [...new Set(results.filter((r) => r.attr_key === 'CIVATA').map((r) => r.attr_value))];

  const ranges = [];
  if (kesitVals.length) {
    const nums = kesitVals.map((v) => parseFloat(v.replace(',', '.'))).filter((n) => !isNaN(n)).sort((a, b) => a - b);
    const val = nums.length > 1 ? `${nums[0]}–${nums[nums.length - 1]} mm²` : `${nums[0]} mm²`;
    ranges.push({ attr_key: 'KABLO_KESITI', label: lang === 'en' ? 'Cable Section' : 'Kablo Kesiti', value: val });
  }
  if (civataVals.length) {
    const nums = civataVals.map((v) => ({ raw: v, n: parseInt(v.replace(/\D/g, ''), 10) })).filter((x) => !isNaN(x.n)).sort((a, b) => a.n - b.n);
    const val = nums.length > 1 ? `${nums[0].raw}–${nums[nums.length - 1].raw}` : nums[0].raw;
    ranges.push({ attr_key: 'CIVATA', label: lang === 'en' ? 'Bolt' : 'Civata', value: val });
  }
  return ranges;
}


export async function getCompatibleProducts(db, productId, lang) {
  const titleCol = lang === 'en' ? 'title_en' : 'title_tr';
  const { results } = await db
    .prepare(
      `SELECT p.prod_code, p.${titleCol} as title
       FROM product_compatibility pcm
       JOIN products p ON p.id = pcm.compatible_product_id
       WHERE pcm.product_id = ? AND p.${titleCol} IS NOT NULL AND p.is_active = 1`
    )
    .bind(productId)
    .all();
  return results;
}

/** Aynı kategorideki diğer ürünler (mevcut ürün hariç). */
export async function getRelatedProducts(db, categoryId, excludeProductId, lang, limit = 6) {
  if (!categoryId) return [];
  const titleCol = lang === 'en' ? 'title_en' : 'title_tr';
  const { results } = await db
    .prepare(
      `SELECT p.prod_code, p.${titleCol} as title,
              (SELECT file_url FROM product_images pi WHERE pi.product_id = p.id ORDER BY is_primary DESC, sort_order LIMIT 1) as image
       FROM products p
       WHERE p.category_id = ? AND p.id != ? AND p.${titleCol} IS NOT NULL AND p.is_active = 1
       ORDER BY p.sort_order LIMIT ?`
    )
    .bind(categoryId, excludeProductId, limit)
    .all();
  return results;
}
