/**
 * API endpoint para reconciliar pagos de Stripe con Supabase
 * Detecta pagos que no se sincronizaron y permite importarlos
 */

import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';
import { createServerClient } from '../../../lib/supabase';
import { nanoid } from 'nanoid';

export const GET: APIRoute = async ({ request }) => {
  try {
    const supabase = createServerClient();
    const url = new URL(request.url);
    const days = url.searchParams.get('days');
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');

    let gteTimestamp: number;
    let lteTimestamp: number = Math.floor(Date.now() / 1000);
    let gteISO: string;
    let lteISO: string = new Date().toISOString();

    if (startDateParam) {
      // Rango personalizado
      const startDate = new Date(startDateParam);
      gteTimestamp = Math.floor(startDate.getTime() / 1000);
      gteISO = startDate.toISOString();

      if (endDateParam) {
        const endDate = new Date(endDateParam);
        if (endDateParam.length === 10) {
          endDate.setHours(23, 59, 59, 999);
        }
        lteTimestamp = Math.floor(endDate.getTime() / 1000);
        lteISO = endDate.toISOString();
      }
    } else {
      // Rango predefinido por días
      const periodDays = Math.min(parseInt(days || '30'), 90); // Máximo 90 días para reconcile
      gteTimestamp = Math.floor(Date.now() / 1000) - (periodDays * 24 * 60 * 60);
      gteISO = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    }

    // Obtener pagos exitosos de Stripe
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      created: {
        gte: gteTimestamp,
        lte: lteTimestamp
      },
      expand: ['data.line_items']
    });

    // Filtrar solo los pagados
    const paidSessions = sessions.data.filter(s => s.payment_status === 'paid');

    // Obtener pedidos de Supabase
    const { data: orders, error } = await supabase
      .from('orders')
      .select('stripe_session_id, stripe_payment_intent, total, created_at')
      .gte('created_at', gteISO)
      .lte('created_at', lteISO) as { data: { stripe_session_id: string; stripe_payment_intent: string; total: number; created_at: string }[] | null; error: any };

    if (error) {
      console.error('Error fetching orders:', error);
    }

    const supabaseSessionIds = new Set((orders || []).map(o => o.stripe_session_id));
    const supabasePaymentIntents = new Set((orders || []).map(o => o.stripe_payment_intent));

    // Encontrar sesiones de Stripe que no están en Supabase
    const missingSessions = paidSessions.filter(session =>
      !supabaseSessionIds.has(session.id) &&
      !supabasePaymentIntents.has(String(session.payment_intent || ''))
    );

    // Calcular totales
    const stripeTotal = paidSessions.reduce((sum, s) => sum + (s.amount_total || 0), 0) / 100;
    const supabaseTotal = (orders || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const missingTotal = missingSessions.reduce((sum, s) => sum + (s.amount_total || 0), 0) / 100;

    return new Response(JSON.stringify({
      stripe: {
        total: stripeTotal,
        sessions: paidSessions.length
      },
      supabase: {
        total: supabaseTotal,
        orders: (orders || []).length
      },
      missing: {
        total: missingTotal,
        count: missingSessions.length,
        sessions: missingSessions.map(s => ({
          id: s.id,
          payment_intent: s.payment_intent,
          amount: (s.amount_total || 0) / 100,
          customer_email: s.customer_email || s.customer_details?.email,
          customer_name: s.customer_details?.name,
          created: new Date(s.created * 1000).toISOString(),
          line_items: s.line_items?.data?.length || 0
        }))
      },
      difference: stripeTotal - supabaseTotal,
      days: days || 'custom'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error reconciling:', error);
    return new Response(JSON.stringify({
      error: 'Error al reconciliar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST para importar sesiones faltantes (sin cambios necesarios aquí)
export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = createServerClient();
    const { sessionId } = await request.json();

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener sesión de Stripe con todos los detalles
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items.data.price.product', 'payment_intent.latest_charge']
    });

    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Sesión no pagada' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar que no existe ya
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', sessionId)
      .single() as { data: { id: string } | null; error: any };

    if (existing) {
      return new Response(JSON.stringify({ error: 'Pedido ya existe', orderId: existing.id }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener detalles del payment intent
    const paymentIntent = session.payment_intent as any;
    const charge = paymentIntent?.latest_charge as any;
    const paymentMethod = charge?.payment_method_details?.type || 'card';
    const receiptUrl = charge?.receipt_url || null;

    // Crear orden
    const { data: order, error: orderError } = await (supabase
      .from('orders') as any)
      .insert({
        user_id: session.metadata?.user_id || null,
        stripe_session_id: session.id,
        stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
        customer_email: session.customer_email || session.customer_details?.email,
        customer_name: session.customer_details?.name,
        customer_country: session.customer_details?.address?.country || null,
        payment_method: paymentMethod,
        stripe_receipt_url: receiptUrl,
        subtotal: (session.amount_subtotal || 0) / 100,
        total: (session.amount_total || 0) / 100,
        status: 'paid',
        paid_at: new Date(session.created * 1000).toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(JSON.stringify({ error: 'Error creando pedido', details: orderError }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear order_items y download_tokens
    const lineItems = session.line_items?.data || [];

    for (const item of lineItems) {
      const product = item.price?.product as any;
      const productId = product?.metadata?.product_id;

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
      expiresAt.setDate(expiresAt.getDate() + 30);

      await (supabase.from('download_tokens') as any).insert({
        order_item_id: orderItem.id,
        user_id: session.metadata?.user_id || null,
        product_id: productId || null,
        token,
        max_downloads: 3,
        download_count: 0,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });
    }

    return new Response(JSON.stringify({
      success: true,
      orderId: order.id,
      items: lineItems.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error importing session:', error);
    return new Response(JSON.stringify({
      error: 'Error al importar',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
