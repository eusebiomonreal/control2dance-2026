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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%); padding: 40px 30px; text-align: center;">
              <img src="${siteUrl}/logo-blanco.svg" alt="Control2Dance" style="width: 200px; height: auto;">
            </td>
          </tr>
          
          ${headerText ? `
          <!-- Header Text -->
          <tr>
            <td style="padding: 30px 30px 0; text-align: center;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0;">${headerText}</p>
            </td>
          </tr>
          ` : ''}
          
          <!-- Products -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #333; font-size: 20px; margin: 0 0 20px; text-align: center;">🎵 Nuevos Vinilos</h2>
              ${products.map(product => `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border: 1px solid #eee; border-radius: 12px; overflow: hidden;">
                  <tr>
                    <td width="120" style="vertical-align: top;">
                      <a href="${siteUrl}/catalogo/${product.id}" style="display: block;">
                        <img src="${product.cover_image || `${siteUrl}/placeholder.jpg`}" alt="${product.name}" style="width: 120px; height: 120px; object-fit: cover; display: block;">
                      </a>
                    </td>
                    <td style="padding: 15px; vertical-align: top;">
                      <a href="${siteUrl}/catalogo/${product.id}" style="text-decoration: none;">
                        <h3 style="margin: 0 0 8px; font-size: 16px; color: #333;">${product.name}</h3>
                      </a>
                      <p style="margin: 0 0 5px; font-size: 13px; color: #666;">${product.catalog_number}</p>
                      <p style="margin: 0 0 5px; font-size: 13px; color: #888;">${[product.label, product.year].filter(Boolean).join(' · ')}</p>
                      <p style="margin: 10px 0 0; font-size: 18px; font-weight: bold; color: #ff4d7d;">${formatPrice(product.price)}</p>
                    </td>
                  </tr>
                </table>
              `).join('')}
              
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${siteUrl}/catalogo" style="display: inline-block; background-color: #ff4d7d; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Ver catálogo completo</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          ${footerText ? `
          <!-- Footer Text -->
          <tr>
            <td style="padding: 0 30px 20px; text-align: center;">
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">${footerText}</p>
            </td>
          </tr>
          ` : ''}
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 4px solid #ff4d7d;">
              <p style="color: #888; font-size: 12px; margin: 0;">
                Control2Dance · El archivo digital del DJ
              </p>
              <p style="color: #aaa; font-size: 11px; margin: 10px 0 0;">
                <a href="${siteUrl}" style="color: #ff4d7d; text-decoration: none;">control2dance.es</a>
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
          from: 'Control2Dance <onboarding@resend.dev>',
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
