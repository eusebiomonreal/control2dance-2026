/**
 * Email Service - Envío de emails transaccionales con Resend
 */

import { Resend } from 'resend';

const resendApiKey = import.meta.env.RESEND_API_KEY || process.env.RESEND_API_KEY;
const siteUrl = import.meta.env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || 'https://dev.control2dance.es';
const adminEmail = import.meta.env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'hola@control2dance.es';

interface OrderItem {
  product_name: string;
  product_catalog_number?: string;
  price: number;
  quantity: number;
}

interface OrderEmailData {
  orderId: string;
  customerEmail: string;
  customerName?: string;
  items: OrderItem[];
  total: number;
  stripeSessionId: string;
  stripePaymentIntent?: string;
  receiptUrl?: string;
  downloadUrl: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(price);
};

const emailHeader = `
<style>
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .vinyl-disc {
    animation: spin 3s linear infinite;
    transform-origin: center center;
  }
</style>
`;

const vinylSection = `
<tr>
  <td align="center" style="padding: 30px 0 20px;">
    <div style="position: relative; display: inline-block;">
      <!-- Glow effect -->
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
        <!-- Disco principal -->
        <circle cx="70" cy="70" r="68" fill="url(#vinyl-gradient)" stroke="#ff4d7d" stroke-width="1" stroke-opacity="0.5"/>
        <!-- Surcos -->
        <circle cx="70" cy="70" r="60" fill="none" stroke="#333" stroke-width="0.5"/>
        <circle cx="70" cy="70" r="52" fill="none" stroke="#2a2a2a" stroke-width="1"/>
        <circle cx="70" cy="70" r="44" fill="none" stroke="#333" stroke-width="0.5"/>
        <circle cx="70" cy="70" r="36" fill="none" stroke="#2a2a2a" stroke-width="1"/>
        <!-- Galleta con fondo rosa -->
        <circle cx="70" cy="70" r="28" fill="#ff4d7d"/>
        <image href="${siteUrl}/logo-blanco.svg" x="42" y="42" width="56" height="56" clip-path="url(#label-clip)" preserveAspectRatio="xMidYMid slice"/>
        <circle cx="70" cy="70" r="28" fill="none" stroke="#e6366a" stroke-width="1.5"/>
        <!-- Agujero central -->
        <circle cx="70" cy="70" r="4" fill="#0a0a0f"/>
        <!-- Brillo -->
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

/**
 * Genera el HTML del email de confirmación para el cliente
 */
function generateCustomerEmailHtml(data: OrderEmailData): string {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
        <strong style="color: #1a1a1a;">${item.product_name}</strong>
        ${item.product_catalog_number ? `<br><span style="color: #888; font-size: 12px;">${item.product_catalog_number}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: center; color: #666;">${item.quantity}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a1a; font-weight: 600;">${formatPrice(item.price)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de compra - Control2Dance</title>
  ${emailHeader}
</head>
<body style="margin: 0; padding: 0; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" valign="top" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background: linear-gradient(180deg, #0a0a0f 0%, #0f0f18 10%, #151520 20%, #1c1c2a 30%, #252535 40%, #353548 50%, #505065 58%, #707085 65%, #9090a5 72%, #b0b0c0 78%, #d0d0da 85%, #e8e8ef 92%, #ffffff 100%); border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5; box-shadow: 0 8px 32px rgba(0,0,0,0.15);">
          <tr>
            <td style="padding: 40px 30px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <img src="${siteUrl}/logo-blanco.svg" alt="Control2Dance" style="max-width: 280px; height: auto;" />
                  </td>
                </tr>
                ${vinylSection}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 35px 40px; background: #ffffff;">
              <h2 style="margin: 0 0 14px; color: #1a1a1a; font-size: 24px; font-weight: 700; text-align: center;">
                🎉 ¡Gracias por tu compra! 🎧
              </h2>
              <p style="margin: 0 0 28px; color: #666666; font-size: 14px; line-height: 1.7; text-align: center;">
                Hola${data.customerName ? ` <strong>${data.customerName}</strong>` : ''}, tu pedido ha sido procesado correctamente. 🔥
              </p>
              
              <!-- Order Summary -->
              <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #1a1a1a; font-size: 14px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px;">
                  📦 Pedido #${data.orderId.substring(0, 8)}
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <thead>
                    <tr>
                      <th style="padding: 8px 0; text-align: left; color: #888; font-size: 11px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #ddd;">Producto</th>
                      <th style="padding: 8px 0; text-align: center; color: #888; font-size: 11px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #ddd;">Cant.</th>
                      <th style="padding: 8px 0; text-align: right; color: #888; font-size: 11px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #ddd;">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="padding: 15px 0 0; text-align: right; font-weight: 600; color: #1a1a1a;">Total:</td>
                      <td style="padding: 15px 0 0; text-align: right; font-weight: 700; color: #ff4d7d; font-size: 18px;">${formatPrice(data.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <!-- Download CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 0 0 25px;">
                    <a href="${data.downloadUrl}" style="display: inline-block; background-color: #ff4d7d; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 1px;">
                      ⬇️ DESCARGAR MIS ARCHIVOS 💿
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #888888; font-size: 12px; line-height: 1.6; text-align: center;">
                También puedes acceder desde tu <a href="${siteUrl}/dashboard/downloads" style="color: #ff4d7d; text-decoration: none; font-weight: 600;">panel de usuario</a> 👤<br>
                ⏰ Los enlaces expiran en 30 días · 3️⃣ Máximo 3 descargas por archivo
              </p>
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
}

/**
 * Genera el HTML del email de notificación para el admin
 */
function generateAdminEmailHtml(data: OrderEmailData): string {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
        <strong style="color: #1a1a1a;">${item.product_name}</strong>
        ${item.product_catalog_number ? `<br><span style="color: #888; font-size: 12px;">${item.product_catalog_number}</span>` : ''}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: center; color: #666;">${item.quantity}</td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: #1a1a1a; font-weight: 600;">${formatPrice(item.price)}</td>
    </tr>
  `).join('');

  const stripePaymentUrl = data.stripePaymentIntent
    ? `https://dashboard.stripe.com/payments/${data.stripePaymentIntent}`
    : `https://dashboard.stripe.com/checkout/sessions/${data.stripeSessionId}`;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva venta - Control2Dance</title>
  ${emailHeader}
</head>
<body style="margin: 0; padding: 0; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center" valign="top" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background: linear-gradient(180deg, #0a0a0f 0%, #0f0f18 10%, #151520 20%, #1c1c2a 30%, #252535 40%, #353548 50%, #505065 58%, #707085 65%, #9090a5 72%, #b0b0c0 78%, #d0d0da 85%, #e8e8ef 92%, #ffffff 100%); border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5; box-shadow: 0 8px 32px rgba(0,0,0,0.15);">
          <tr>
            <td style="padding: 40px 30px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="text-align: center;">
                    <img src="${siteUrl}/logo-blanco.svg" alt="Control2Dance" style="max-width: 280px; height: auto;" />
                  </td>
                </tr>
                ${vinylSection}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 35px 40px; background: #ffffff;">
              <h2 style="margin: 0 0 14px; color: #1a1a1a; font-size: 24px; font-weight: 700; text-align: center;">
                💰 ¡Nueva Venta!
              </h2>
              
              <!-- Customer Info -->
              <div style="background: linear-gradient(135deg, #f8f8f8 0%, #fff 100%); border-radius: 12px; padding: 15px 20px; margin-bottom: 20px; border-left: 4px solid #ff4d7d;">
                <p style="margin: 0 0 5px; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">👤 Cliente</p>
                <p style="margin: 0; font-size: 16px; color: #1a1a1a;"><strong>${data.customerName || 'Sin nombre'}</strong></p>
                <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${data.customerEmail}</p>
              </div>
              
              <!-- Order Details -->
              <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #1a1a1a; font-size: 14px; margin: 0 0 15px; text-transform: uppercase; letter-spacing: 1px;">
                  🛒 Detalle del pedido
                </h3>
                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                  <thead>
                    <tr>
                      <th style="padding: 8px 0; text-align: left; color: #888; font-size: 11px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #ddd;">Producto</th>
                      <th style="padding: 8px 0; text-align: center; color: #888; font-size: 11px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #ddd;">Cant.</th>
                      <th style="padding: 8px 0; text-align: right; color: #888; font-size: 11px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #ddd;">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colspan="2" style="padding: 15px 0 0; text-align: right; font-weight: 600; color: #1a1a1a;">Total:</td>
                      <td style="padding: 15px 0 0; text-align: right; font-weight: 700; color: #ff4d7d; font-size: 20px;">${formatPrice(data.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              <!-- Actions -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 0 0 12px;">
                    <a href="${stripePaymentUrl}" style="display: inline-block; background-color: #635bff; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 1px;">
                      💳 VER EN STRIPE →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 0 0 20px;">
                    <a href="${siteUrl}/admin/orders/${data.orderId}" style="display: inline-block; background-color: #ff4d7d; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 13px; font-weight: 600; letter-spacing: 1px;">
                      📋 VER PEDIDO EN ADMIN →
                    </a>
                  </td>
                </tr>
              </table>
              
              ${data.receiptUrl ? `
              <p style="margin: 0; text-align: center;">
                <a href="${data.receiptUrl}" style="color: #888; font-size: 12px; text-decoration: none;">Ver recibo de Stripe</a>
              </p>
              ` : ''}
              
              <p style="margin: 20px 0 0; color: #888888; font-size: 11px; line-height: 1.6; text-align: center;">
                Order ID: ${data.orderId}
              </p>
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
}

/**
 * Envía el email de confirmación al cliente
 */
export async function sendCustomerOrderEmail(data: OrderEmailData): Promise<boolean> {
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);
    const html = generateCustomerEmailHtml(data);

    const result = await resend.emails.send({
      from: 'Control2Dance <noreply@control2dance.es>',
      to: data.customerEmail,
      subject: `✅ Confirmación de compra #${data.orderId.substring(0, 8)}`,
      html
    });

    if (result.error) {
      console.error('Error sending customer email:', result.error);
      return false;
    }

    console.log('✉️ Customer confirmation email sent to:', data.customerEmail);
    return true;
  } catch (e) {
    console.error('Error sending customer email:', e);
    return false;
  }
}

/**
 * Envía el email de notificación al admin
 */
export async function sendAdminOrderEmail(data: OrderEmailData): Promise<boolean> {
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);
    const html = generateAdminEmailHtml(data);

    const result = await resend.emails.send({
      from: 'Control2Dance <noreply@control2dance.es>',
      to: adminEmail,
      subject: `💰 Nueva venta: ${formatPrice(data.total)} - ${data.customerName || data.customerEmail}`,
      html
    });

    if (result.error) {
      console.error('Error sending admin email:', result.error);
      return false;
    }

    console.log('✉️ Admin notification email sent');
    return true;
  } catch (e) {
    console.error('Error sending admin email:', e);
    return false;
  }
}

// ... existing code ...

/**
 * Notificar al admin sobre aceptación de términos de newsletter
 */
export async function sendNewsletterAcceptanceNotification(userData: { name: string; email: string }): Promise<boolean> {
  if (!resendApiKey) {
    console.error('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nuevo suscriptor</title>
</head>
<body style="font-family: sans-serif; padding: 20px;">
  <h2>📰 Nuevo suscriptor a la Newsletter</h2>
  <div style="background: #f4f4f5; padding: 20px; border-radius: 8px;">
    <p><strong>Usuario:</strong> ${userData.name}</p>
    <p><strong>Email:</strong> ${userData.email}</p>
    <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}</p>
    <p style="margin-top: 20px; color: #10b981; font-weight: bold;">
      ✅ Ha aceptado los términos y condiciones de la newsletter.
    </p>
  </div>
</body>
</html>
    `;

    await resend.emails.send({
      from: 'Control2Dance System <noreply@control2dance.es>',
      to: adminEmail,
      subject: `📰 Nuevo suscriptor Newsletter: ${userData.name}`,
      html
    });

    return true;
  } catch (e) {
    console.error('Error sending newsletter notification:', e);
    return false;
  }
}

/**
 * Envía ambos emails (cliente y admin)
 */
export async function sendOrderEmails(data: OrderEmailData): Promise<{ customer: boolean; admin: boolean }> {
  const [customer, admin] = await Promise.all([
    sendCustomerOrderEmail(data),
    sendAdminOrderEmail(data)
  ]);

  return { customer, admin };
}
