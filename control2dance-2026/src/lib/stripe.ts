import Stripe from 'stripe';

// Use process.env for server-side runtime variables
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not configured. Payment features will not work.');
}

export const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2025-12-15.clover'
});

export interface LineItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  catalogNumber?: string;
}

export async function createCheckoutSession(
  items: LineItem[],
  customerEmail: string,
  successUrl: string,
  cancelUrl: string,
  userId?: string
) {
  const baseUrl = process.env.PUBLIC_SITE_URL || import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321';

  const lineItems = items.map(item => {
    // Convertir URL relativa a absoluta si es necesario
    let imageUrl = item.image;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${baseUrl}${imageUrl}`;
    }

    return {
      price_data: {
        currency: 'eur',
        product_data: {
          name: item.name,
          description: item.catalogNumber || undefined,
          images: imageUrl ? [imageUrl] : undefined,
          metadata: {
            product_id: item.id
          }
        },
        unit_amount: Math.round(item.price * 100), // Convertir a céntimos
      },
      quantity: item.quantity,
    };
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    customer_email: customerEmail,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      app: 'c2d-2026',
      product_ids: items.map(i => i.id).join(','),
      user_id: userId || ''
    }
  });

  return session;
}

export async function getCheckoutSession(sessionId: string) {
  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer']
  });
}

export function constructWebhookEvent(payload: string | Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
