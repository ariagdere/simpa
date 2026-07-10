// src/pages/api/contact.js
import { env } from 'cloudflare:workers';

export const prerender = false;

export async function POST({ request }) {
  try {
    const body = await request.json();
    const { name, email, phone, product, message, turnstileToken } = body;

    if (!name || !email) {
      return new Response(JSON.stringify({ error: 'İsim ve e-posta zorunludur.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return new Response(JSON.stringify({ error: 'Geçerli bir e-posta adresi girin.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: turnstileToken,
        remoteip: request.headers.get('CF-Connecting-IP') || undefined,
      }),
    });
    const turnstileData = await turnstileRes.json();
    if (!turnstileData.success) {
      console.error('Turnstile doğrulaması başarısız:', turnstileData['error-codes']);
      return new Response(JSON.stringify({ error: 'Doğrulama başarısız oldu. Lütfen tekrar deneyin.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const htmlBody = `
      <h2>Yeni Web Sitesi Talebi</h2>
      <p><strong>İsim Soyisim:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-posta:</strong> ${escapeHtml(email)}</p>
      <p><strong>Telefon:</strong> ${escapeHtml(phone || '—')}</p>
      <p><strong>İlgili Ürün:</strong> ${escapeHtml(product || '—')}</p>
      <p><strong>Mesaj:</strong></p>
      <p>${escapeHtml(message || '—').replace(/\n/g, '<br>')}</p>
    `;

    // Resend API ile e-posta gönderimi. RESEND_API_KEY Cloudflare Worker ortam değişkeni (secret) olarak eklenmeli.
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Simpa Elektrik Web Sitesi <web@cont.simpaelektrik.com.tr>',
        to: ['info@simpaelektrik.com.tr'],
        reply_to: email,
        subject: `Yeni Talep: ${name}${product ? ' — ' + product : ''}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', errText);
      return new Response(JSON.stringify({ error: 'E-posta gönderilirken bir sorun oluştu. Lütfen tekrar deneyin.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Contact form error:', err);
    return new Response(JSON.stringify({ error: 'Beklenmeyen bir hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
