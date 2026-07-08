// src/pages/api/documents.js
export const prerender = false;

export async function GET({ locals }) {
  const db = locals.runtime.env.DB;
  const { results } = await db
    .prepare('SELECT title_tr, title_en, doc_type, file_url_tr, file_url_en FROM documents ORDER BY sort_order')
    .all();
  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
  });
}
