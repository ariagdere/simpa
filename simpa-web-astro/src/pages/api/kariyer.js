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

    // GEÇİCİ TEŞHİS: RESEND_API_KEY worker'a gerçekten bağlanmış mı, en baştan kontrol et.
    if (!env.RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Sunucu tarafında e-posta anahtarı bulunamadı.',
          debug: 'env.RESEND_API_KEY tanımsız/boş — Worker Settings → Variables and Secrets kısmını kontrol et.',
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // NOT: 'from' adresi contact.js'de kullanılan domain ile birebir aynı olmalı — ikisi de
    // cont.simpaelektrik.com.tr üzerinden gönderiyor olmalı, orada farklıysa güncelle.
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
      // GEÇİCİ TEŞHİS: asıl Resend hatasını response'a ekliyoruz, kök sebep bulununca kaldıracağız.
      return new Response(
        JSON.stringify({
          error: 'Başvuru gönderilirken bir sorun oluştu. Lütfen tekrar deneyin.',
          debug: `HTTP ${resendRes.status}: ${errText}`,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Kariyer form error:', err);
    return new Response(
      JSON.stringify({
        error: 'Beklenmeyen bir hata oluştu.',
        debug: String((err && err.message) || err),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
