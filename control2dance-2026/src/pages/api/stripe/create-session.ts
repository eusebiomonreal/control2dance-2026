import type { APIRoute } from 'astro';
import { createCheckoutSession, type LineItem } from '../../../lib/stripe';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { items, customerEmail } = body as {
      items: LineItem[];
      customerEmail: string;
    };

    // Validaciones
    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Se requieren items para crear la sesión' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!customerEmail || !customerEmail.includes('@')) {
      return new Response(
        JSON.stringify({ error: 'Email inválido' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const siteUrl = import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';
    const successUrl = `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/checkout`;

    const session = await createCheckoutSession(
      items,
      customerEmail,
      successUrl,
      cancelUrl
    );

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Error al crear la sesión de pago'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
