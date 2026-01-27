import type { APIRoute } from 'astro';
import { constructWebhookEvent, stripe } from '../../../lib/stripe';
import { createServerClient } from '../../../lib/supabase';
import { nanoid } from 'nanoid';
import { sendOrderEmails } from '../../../services/emailService';

// Desactivar verificación de origen para webhooks externos
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Stripe envía webhooks desde sus servidores, no verificar origen
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

  // Obtener user_id del metadata de la sesión
  const userId = session.metadata?.user_id || null;
  console.log('User ID from metadata:', userId);

  // Obtener detalles adicionales del Payment Intent
  let paymentMethod = null;
  let receiptUrl = null;
  
  if (session.payment_intent) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent, {
        expand: ['latest_charge']
      });
      const charge = paymentIntent.latest_charge as any;
      paymentMethod = charge?.payment_method_details?.type || 'card';
      receiptUrl = charge?.receipt_url || null;
    } catch (e) {
      console.log('Could not fetch payment intent details:', e);
    }
  }

  // 1. Crear orden en Supabase
  const { data: order, error: orderError } = await (supabase
    .from('orders') as any)
    .insert({
      user_id: userId || null,
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent,
      stripe_customer_id: session.customer,
      customer_email: session.customer_email || session.customer_details?.email,
      customer_name: session.customer_details?.name,
      customer_country: session.customer_details?.address?.country || null,
      payment_method: paymentMethod,
      stripe_receipt_url: receiptUrl,
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
    const { data: orderItem, error: itemError } = await (supabase
      .from('order_items') as any)
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

    const { error: tokenError } = await (supabase
      .from('download_tokens') as any)
      .insert({
        order_item_id: orderItem.id,
        user_id: userId || null,
        product_id: productId || null,
        token,
        max_downloads: 3,
        download_count: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

    if (tokenError) {
      console.error('Error creating download token:', tokenError);
    }
  }

  // 4. Si es compra de invitado (sin user_id), crear cuenta automáticamente
  const customerEmail = session.customer_email || session.customer_details?.email;

  if (!userId && customerEmail) {
    try {
      const newUserId = await createGuestAccount(supabase, customerEmail, session.customer_details?.name);

      if (newUserId) {
        // Actualizar la orden con el nuevo user_id
        await (supabase
          .from('orders') as any)
          .update({ user_id: newUserId })
          .eq('id', order.id);

        // Actualizar los download_tokens con el nuevo user_id
        await (supabase
          .from('download_tokens') as any)
          .update({ user_id: newUserId })
          .eq('order_item_id', order.id);

        console.log(`✅ Guest account created and linked: ${customerEmail}`);
      }
    } catch (e) {
      console.log('ℹ️ Could not create guest account (may already exist):', e);
    }
  }

  // 5. Enviar emails de confirmación
  const customerEmail = session.customer_email || session.customer_details?.email;
  const siteUrl = process.env.PUBLIC_SITE_URL || 'https://dev.control2dance.es';
  
  // Preparar datos de los items para el email
  const orderItems = lineItems.data.map(item => {
    const product = item.price?.product as any;
    return {
      product_name: item.description || product?.name || 'Producto',
      product_catalog_number: product?.description || null,
      price: (item.amount_total || 0) / 100,
      quantity: item.quantity || 1
    };
  });

  // Enviar emails (cliente y admin)
  try {
    const emailResult = await sendOrderEmails({
      orderId: order.id,
      customerEmail: customerEmail,
      customerName: session.customer_details?.name,
      items: orderItems,
      total: (session.amount_total || 0) / 100,
      stripeSessionId: session.id,
      stripePaymentIntent: session.payment_intent,
      receiptUrl: receiptUrl,
      downloadUrl: `${siteUrl}/dashboard/downloads`
    });

    if (emailResult.customer) {
      console.log('✅ Customer confirmation email sent');
    }
    if (emailResult.admin) {
      console.log('✅ Admin notification email sent');
    }
  } catch (e) {
    console.error('⚠️ Error sending order emails:', e);
    // No lanzar error - los emails no son críticos
  }

  console.log(`Order ${order.id} created successfully for ${customerEmail}`);
}

/**
 * Crea una cuenta para el usuario invitado después del pago
 * Si el email ya existe, no hace nada
 */
async function createGuestAccount(
  supabase: ReturnType<typeof createServerClient>,
  email: string,
  name?: string
): Promise<string | null> {
  // Verificar si ya existe un usuario con este email
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  if (existingUser) {
    console.log(`User already exists: ${email}`);
    return existingUser.id;
  }

  // Crear nuevo usuario con invitación (les llega email para establecer contraseña)
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: {
      name: name || email.split('@')[0],
      created_via: 'guest_checkout'
    },
    redirectTo: `${process.env.PUBLIC_SITE_URL || 'https://dev.control2dance.es'}/auth/set-password`
  });

  if (error) {
    console.error('Error creating guest account:', error);
    return null;
  }

  console.log(`✉️ Invitation sent to: ${email}`);
  return data.user.id;
}
