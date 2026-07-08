// src/pages/api/documents.js
import { env } from 'cloudflare:workers';

export const prerender = false;

export async function GET({ url }) {
  const db = env.DB;
  const brand = url.searchParams.get('brand');
  const { results } = await db
    .prepare('SELECT title_tr, title_en, doc_type, file_url_tr, file_url_en, brand FROM documents WHERE brand IS NULL OR brand = ? ORDER BY sort_order')
    .bind(brand || '')
    .all();
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
}
