// src/pages/api/documents.js
import { env } from 'cloudflare:workers';

export const prerender = false;

export async function GET({ url }) {
  const db = env.DB;
  const brand = url.searchParams.get('brand');
  const lang = url.searchParams.get('lang') || 'tr';
  const excludeFiyatListesi = lang === 'en';
  const { results } = await db
    .prepare(
      `SELECT title_tr, title_en, doc_type, file_url_tr, file_url_en, brand FROM documents
       WHERE (brand IS NULL OR brand = ?) AND (? = 0 OR doc_type != 'fiyat_listesi')
       ORDER BY sort_order`
    )
    .bind(brand || '', excludeFiyatListesi ? 1 : 0)
    .all();
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
}
