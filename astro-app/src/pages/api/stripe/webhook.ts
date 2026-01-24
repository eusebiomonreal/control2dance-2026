import type { APIRoute } from 'astro';
import { constructWebhookEvent, stripe } from '../../../lib/stripe';
import { createServerClient } from '../../../lib/supabase';
import { nanoid } from 'nanoid';

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('stripe-signature');

  console.log('🔔 Webhook received');
  console.log('Signature:', signature?.substring(0, 20) + '...');

  if (!signature) {
    console.error('❌ No stripe-signature header');
    return new Response('No signature', { status: 400 });
  }

  let event;

  try {
    const body = await request.text();
    console.log('Body preview:', body.substring(0, 100));
    event = constructWebhookEvent(body, signature);
    console.log('✅ Webhook verified:', event.type);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      { status: 400 }
    );
  }

  // Manejar el evento
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('💳 Processing checkout:', session.id);

    try {
      await handleCheckoutComplete(session);
      console.log('✅ Checkout processed successfully');
    } catch (error) {
      console.error('❌ Error processing checkout:', error);
      // Devolver 200 para evitar reintentos innecesarios de Stripe
      // pero loggear el error para investigación
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

async function handleCheckoutComplete(session: any) {
  const supabase = createServerClient();

  console.log('📦 handleCheckoutComplete - Session:', session.id);
  console.log('Email:', session.customer_email);

  // 1. Crear orden en Supabase
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      stripe_customer_id: session.customer,
      customer_email: session.customer_email || session.customer_details?.email,
      customer_name: session.customer_details?.name,
      subtotal: (session.amount_subtotal || 0) / 100,
      total: (session.amount_total || 0) / 100,
      status: 'paid',
      paid_at: new Date().toISOString()
    })
    .select()
    .single();

  if (orderError) {
    console.error('❌ Error creating order:', orderError);
    throw orderError;
  }

  console.log('✅ Order created:', order.id);

  // 2. Obtener line items de la sesión
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ['data.price.product']
  });

  // 3. Crear order_items y download_tokens
  for (const item of lineItems.data) {
    const product = item.price?.product as any;
    const productId = product?.metadata?.product_id;

    // Crear order_item
    const { data: orderItem, error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: productId || null,
        product_name: item.description || product?.name || 'Producto',
        product_catalog_number: product?.description || null,
        price: (item.amount_total || 0) / 100,
        quantity: item.quantity || 1
      })
      .select()
      .single();

    if (itemError) {
      console.error('Error creating order item:', itemError);
      continue;
    }

    // Crear download_token
    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 días

    const { error: tokenError } = await supabase
      .from('download_tokens')
      .insert({
        order_item_id: orderItem.id,
        product_id: productId || null,
        token,
        max_downloads: 5,
        download_count: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

    if (tokenError) {
      console.error('Error creating download token:', tokenError);
    }
  }

  // 4. Log de actividad (si el usuario está autenticado)
  // TODO: Enviar email de confirmación con enlaces de descarga

  console.log(`Order ${order.id} created successfully for ${session.customer_email}`);
}
