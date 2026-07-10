// src/pages/api/kariyer.js
import { env } from 'cloudflare:workers';

export const prerender = false;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST({ request }) {
  try {
    const body = await request.json();
    const {
      name,
      gender,
      birthDate,
      email,
      phone,
      militaryStatus,
      licenseClasses,
      school,
      languages,
      department,
      lastWorkplace,
      lastWorkplaceDates,
      references,
      note,
      turnstileToken,
    } = body;

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

    const licenseText =
      Array.isArray(licenseClasses) && licenseClasses.length ? licenseClasses.join(', ') : '—';

    const languagesText =
      Array.isArray(languages) && languages.length
        ? languages.map((l) => `${l.lang} (${l.level})`).join(', ')
        : '—';

    const rows = [
      ['İsim Soyisim', name],
      ['Cinsiyet', gender || '—'],
      ['Doğum Tarihi', birthDate || '—'],
      ['E-posta', email],
      ['Telefon', phone || '—'],
    ];

    // Askerlik durumu yalnızca cinsiyet Erkek işaretlendiyse anlamlı; boşsa dahi
    // e-postada satır olarak görünür ama '—' basılır.
    if (gender === 'Erkek') {
      rows.push(['Askerlik Durumu', militaryStatus || '—']);
    }

    rows.push(
      ['Sürücü Ehliyeti Sınıfı', licenseText],
      ['Son Mezun Olduğu Okul', school || '—'],
      ['Bildiği Diller ve Seviyeleri', languagesText],
      ['Başvurulan İş Birimi', department || '—'],
      ['Son Çalıştığı İş Yeri', lastWorkplace || '—'],
      ['Çalışma Tarihleri', lastWorkplaceDates || '—'],
      ['Referanslar', references || '—'],
      ['Not', note || '—'],
    );

    const htmlBody = `
      <h2>Yeni İş Başvurusu</h2>
      ${rows
        .map(
          ([label, value]) =>
            `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value).replace(/\n/g, '<br>')}</p>`,
        )
        .join('\n')}
    `;

    if (!env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY tanımsız');
      return new Response(
        JSON.stringify({ error: 'Başvuru şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Simpa Elektrik Kariyer <web@cont.simpaelektrik.com.tr>',
        to: ['info@simpaelektrik.com.tr'],
        reply_to: email,
        subject: `Yeni İş Başvurusu: ${name}${department ? ' — ' + department : ''}`,
        html: htmlBody,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend error:', resendRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Başvuru gönderilirken bir sorun oluştu. Lütfen tekrar deneyin.' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Kariyer form error:', err);
    return new Response(JSON.stringify({ error: 'Beklenmeyen bir hata oluştu.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
