/**
 * API endpoint para enviar newsletters
 * POST /api/admin/newsletter/send
 */

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;
const resendApiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;

interface Product {
  id: string;
  name: string;
  catalog_number: string;
  cover_image: string | null;
  price: number;
  year: string | null;
  label: string | null;
  genre: string | null;
  slug?: string | null;
}

interface NewsletterRequest {
  subject: string;
  headerText?: string;
  footerText?: string;
  products: Product[];
  recipientType: 'all' | 'test';
  testEmail?: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

const generateEmailHtml = (data: NewsletterRequest, siteUrl: string) => {
  const { subject, headerText, footerText, products } = data;

  const vinylSection = `
    <tr>
      <td align="center" style="padding: 30px 0 20px;">
        <div style="position: relative; display: inline-block;">
          <div style="position: absolute; inset: -40px; background: radial-gradient(circle, rgba(255,50,100,0.6) 0%, rgba(255,77,125,0.3) 40%, transparent 70%); border-radius: 50%; filter: blur(30px);"></div>
          <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg" style="width: 160px; height: 160px; position: relative;" class="vinyl-disc">
            <defs>
              <clipPath id="label-clip">
                <circle cx="70" cy="70" r="28"/>
              </clipPath>
              <radialGradient id="vinyl-gradient" cx="30%" cy="30%">
                <stop offset="0%" stop-color="#3a3a3a"/>
                <stop offset="100%" stop-color="#0a0a0a"/>
              </radialGradient>
              <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="rgba(255,255,255,0.1)"/>
                <stop offset="50%" stop-color="rgba(255,255,255,0)"/>
                <stop offset="100%" stop-color="rgba(255,255,255,0.05)"/>
              </linearGradient>
            </defs>
            <circle cx="70" cy="70" r="68" fill="url(#vinyl-gradient)" stroke="#ff4d7d" stroke-width="1" stroke-opacity="0.5"/>
            <circle cx="70" cy="70" r="60" fill="none" stroke="#333" stroke-width="0.5"/>
            <circle cx="70" cy="70" r="52" fill="none" stroke="#2a2a2a" stroke-width="1"/>
            <circle cx="70" cy="70" r="44" fill="none" stroke="#333" stroke-width="0.5"/>
            <circle cx="70" cy="70" r="36" fill="none" stroke="#2a2a2a" stroke-width="1"/>
            <circle cx="70" cy="70" r="28" fill="#ff4d7d"/>
            <image href="https://dev.control2dance.es/logo-blanco.svg" x="42" y="42" width="56" height="56" clip-path="url(#label-clip)" preserveAspectRatio="xMidYMid slice"/>
            <circle cx="70" cy="70" r="28" fill="none" stroke="#e6366a" stroke-width="1.5"/>
            <circle cx="70" cy="70" r="4" fill="#0a0a0f"/>
            <circle cx="70" cy="70" r="68" fill="url(#shine)"/>
          </svg>
        </div>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding-top: 15px;">
        <span style="display: inline-block; background: linear-gradient(90deg, #ff4d7d, #ff6b9d); color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 3px; padding: 8px 20px; border-radius: 20px; box-shadow: 0 4px 15px rgba(255,77,125,0.3);">
          ✦ DIGITAL ARCHIVE ✦
        </span>
      </td>
    </tr>
  `;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .vinyl-disc {
      animation: spin 6s linear infinite;
      transform-origin: center center;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f2f2f2;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" valign="top" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background: linear-gradient(180deg, #0a0a0f 0%, #0f0f18 10%, #151520 20%, #1c1c2a 30%, #252535 40%, #353548 50%, #505065 58%, #707085 65%, #9090a5 72%, #b0b0c0 78%, #d0d0da 85%, #e8e8ef 92%, #ffffff 100%); border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5; box-shadow: 0 8px 32px rgba(0,0,0,0.15);">
          <tr>
            <td style="padding: 40px 30px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <a href="${siteUrl}" style="text-decoration: none;">
                      <img src="${siteUrl}/logo-blanco.svg" alt="Control2Dance" style="max-width: 280px; height: auto; border: 0;" />
                    </a>
                  </td>
                </tr>
                ${vinylSection}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 35px 40px; background: #ffffff;">
              <h2 style="margin: 0 0 14px; color: #1a1a1a; font-size: 24px; font-weight: 700; text-align: center;">
                🎵 Nuevos Vinilos
              </h2>
              
              ${headerText ? `
              <div style="margin: 0 0 28px; color: #666666; font-size: 14px; line-height: 1.7; text-align: center;">
                ${headerText}
              </div>
              ` : ''}
              
              <!-- Product List Box -->
              <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #1a1a1a; font-size: 14px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #ddd; padding-bottom: 10px;">
                  🛒 Novedades en Catálogo
                </h3>
                
                ${products.map(product => `
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #eaeaea; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <tr>
                      <td style="padding: 0;">
                        <a href="${siteUrl}/catalogo/${product.slug || product.catalog_number}" style="display: block; text-decoration: none;">
                          <img src="${product.cover_image || `${siteUrl}/placeholder.jpg`}" alt="${product.name}" style="width: 100%; max-width: 100%; height: auto; display: block; border-bottom: 1px solid #f0f0f0; border: 0;">
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 20px; text-align: center;">
                        <h4 style="margin: 0 0 6px; font-size: 18px; font-weight: 700; line-height: 1.3;">
                          <a href="${siteUrl}/catalogo/${product.slug || product.catalog_number}" style="text-decoration: none; color: #1a1a1a;">${product.name}</a>
                        </h4>
                        <p style="margin: 0 0 4px; font-size: 14px; color: #444; font-weight: 600; letter-spacing: 0.5px;">${product.catalog_number}</p>
                        <p style="margin: 0 0 20px; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px;">${product.label || ''}</p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="${siteUrl}/catalogo/${product.slug || product.catalog_number}" style="display: inline-block; background-color: #ff4d7d; color: #ffffff; padding: 12px 28px; border-radius: 50px; font-size: 13px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
                                VER REFERENCIA
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                `).join('')}
                
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="right" style="padding-top: 5px;">
                       <span style="font-size: 12px; color: #888; font-weight: 600;">Total Vinilos: ${products.length}</span>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 0 0 25px;">
                    <a href="${siteUrl}/catalogo" style="display: inline-block; background-color: #ff4d7d; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 1px;">
                      VER TODAS LAS NOVEDADES →
                    </a>
                  </td>
                </tr>
              </table>
              
              ${footerText ? `
              <div style="margin: 0; color: #888888; font-size: 12px; line-height: 1.6; text-align: center;">
                ${footerText}
              </div>
              ` : ''}

            </td>
          </tr>
          <tr>
            <td style="padding: 18px 30px; background-color: #ffffff; border-top: 4px solid #ff4d7d;">
              <p style="margin: 0; color: #888888; font-size: 10px; text-align: center; letter-spacing: 0.5px;">
                © 2026 Control2Dance Records · Makina · Hard House · Bumping
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Validate env vars
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY no configurado' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase no configurado' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data: NewsletterRequest = await request.json();

    // Validate required fields
    if (!data.subject?.trim()) {
      return new Response(
        JSON.stringify({ error: 'El asunto es obligatorio' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!data.products?.length) {
      return new Response(
        JSON.stringify({ error: 'Selecciona al menos un producto' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize clients
    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get site URL for links
    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'https://dev.control2dance.es';

    // Generate email HTML
    const html = generateEmailHtml(data, siteUrl);

    // Get recipients
    let recipients: string[] = [];

    if (data.recipientType === 'test') {
      if (!data.testEmail?.includes('@')) {
        return new Response(
          JSON.stringify({ error: 'Email de prueba inválido' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      recipients = [data.testEmail];
    } else {
      // Get all unique customer emails from paid orders
      const { data: orders, error } = await supabase
        .from('orders')
        .select('customer_email')
        .eq('status', 'paid')
        .not('customer_email', 'is', null);

      if (error) {
        console.error('Error fetching customers:', error);
        return new Response(
          JSON.stringify({ error: 'Error al obtener destinatarios' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Get unique emails
      const uniqueEmails = new Set<string>();
      orders?.forEach(order => {
        if (order.customer_email) {
          uniqueEmails.add(order.customer_email.toLowerCase());
        }
      });
      recipients = Array.from(uniqueEmails);
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay destinatarios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send emails (Resend supports batch sending)
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send in batches of 50 (Resend limit)
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      try {
        // Use BCC for batch sending to avoid revealing email addresses
        const result = await resend.emails.send({
          from: 'Control2Dance <noreply@control2dance.es>',
          to: batch[0], // First recipient as "to"
          bcc: batch.slice(1), // Rest as BCC
          subject: data.subject,
          html: html,
        });

        if (result.error) {
          console.error('Resend error:', result.error);
          failed += batch.length;
          errors.push(result.error.message);
        } else {
          sent += batch.length;
        }
      } catch (e: any) {
        console.error('Send error:', e);
        failed += batch.length;
        errors.push(e.message || 'Error desconocido');
      }
    }

    // Log the newsletter send
    try {
      await supabase.from('activity_log').insert({
        user_id: '00000000-0000-0000-0000-000000000000', // System user
        action: 'newsletter_sent' as any,
        description: `Newsletter enviado: ${data.subject}`,
        metadata: {
          subject: data.subject,
          products: data.products.length,
          recipients: recipients.length,
          sent,
          failed
        }
      });
    } catch (e) {
      console.error('Error logging newsletter:', e);
    }

    return new Response(
      JSON.stringify({
        success: failed === 0,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (e: any) {
    console.error('Newsletter API error:', e);
    return new Response(
      JSON.stringify({ error: e.message || 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
