// src/pages/sitemap.xml.js
export const prerender = false;

import { getCategoriesWithCounts, getAllProducts } from '../lib/queries.js';
import { env } from 'cloudflare:workers';

const BASE = 'https://simpaelektrik.com.tr';

const STATIC_PAGES = [
  { tr: '/', en: '/en', priority: '1.0' },
  { tr: '/kategori/', en: '/en/category/', priority: '0.9' },
  { tr: '/hakkimizda', en: '/en/about', priority: '0.7' },
  { tr: '/sertifikalar', en: '/en/certificates', priority: '0.6' },
  { tr: '/iletisim', en: '/en/contact', priority: '0.6' },
  { tr: '/kariyer', en: '/en/careers', priority: '0.5' },
  { tr: '/gizlilik-ve-guvenlik', en: '/en/privacy-security', priority: '0.3' },
  // Banka Bilgilerimiz: yalnızca TR, EN karşılığı yok
  { tr: '/banka-bilgilerimiz', en: null, priority: '0.3' },
];

function urlEntry(trPath, enPath, priority) {
  const trLoc = `${BASE}${trPath}`;
  const alt = enPath
    ? `    <xhtml:link rel="alternate" hreflang="en" href="${BASE}${enPath}" />\n    <xhtml:link rel="alternate" hreflang="tr" href="${trLoc}" />\n`
    : '';
  return `  <url>\n    <loc>${trLoc}</loc>\n${alt}    <priority>${priority}</priority>\n  </url>\n`;
}

function urlEntryEn(enPath, trPath, priority) {
  const enLoc = `${BASE}${enPath}`;
  return `  <url>\n    <loc>${enLoc}</loc>\n    <xhtml:link rel="alternate" hreflang="tr" href="${BASE}${trPath}" />\n    <xhtml:link rel="alternate" hreflang="en" href="${enLoc}" />\n    <priority>${priority}</priority>\n  </url>\n`;
}

export async function GET() {
  const db = env.DB;

  const [catsTr, catsEn, prodsTr, prodsEn] = await Promise.all([
    getCategoriesWithCounts(db, 'tr'),
    getCategoriesWithCounts(db, 'en'),
    getAllProducts(db, 'tr'),
    getAllProducts(db, 'en'),
  ]);

  const enSlugs = new Set(catsEn.map((c) => c.slug));
  const enCodes = new Set(prodsEn.map((p) => p.prod_code));

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';

  // Statik sayfalar
  for (const p of STATIC_PAGES) {
    xml += urlEntry(p.tr, p.en, p.priority);
    if (p.en) xml += urlEntryEn(p.en, p.tr, p.priority);
  }

  // Kategori sayfaları (TR her zaman, EN sadece name_en dolu olanlar için)
  for (const c of catsTr) {
    const trPath = `/kategori/${c.slug}`;
    const enPath = enSlugs.has(c.slug) ? `/en/category/${c.slug}` : null;
    xml += urlEntry(trPath, enPath, '0.8');
  }
  for (const c of catsEn) {
    xml += urlEntryEn(`/en/category/${c.slug}`, `/kategori/${c.slug}`, '0.8');
  }

  // Ürün detay sayfaları (TR her zaman, EN sadece title_en dolu olanlar için)
  for (const p of prodsTr) {
    const trPath = `/urunler/${encodeURIComponent(p.prod_code)}`;
    const enPath = enCodes.has(p.prod_code) ? `/en/products/${encodeURIComponent(p.prod_code)}` : null;
    xml += urlEntry(trPath, enPath, '0.7');
  }
  for (const p of prodsEn) {
    xml += urlEntryEn(`/en/products/${encodeURIComponent(p.prod_code)}`, `/urunler/${encodeURIComponent(p.prod_code)}`, '0.7');
  }

  xml += '</urlset>';

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'application/xml; charset=UTF-8' },
  });
}
