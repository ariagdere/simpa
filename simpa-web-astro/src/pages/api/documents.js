// src/pages/api/documents.js
import { env } from 'cloudflare:workers';

export const prerender = false;

export async function GET() {
  const db = env.DB;
  const { results } = await db
    .prepare('SELECT title_tr, title_en, doc_type, file_url_tr, file_url_en FROM documents ORDER BY sort_order')
    .all();
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
}
