/**
 * API endpoint para gestionar reembolsos de Stripe
 */

import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY || '';

function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// GET - Obtener reembolsos de un payment intent
export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const paymentIntentId = url.searchParams.get('payment_intent');

    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: 'payment_intent requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener reembolsos de este payment intent
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
      limit: 10
    });

    return new Response(JSON.stringify({
      refunds: refunds.data.map(r => ({
        id: r.id,
        amount: r.amount / 100,
        status: r.status,
        reason: r.reason,
        created: new Date(r.created * 1000).toISOString()
      })),
      total_refunded: refunds.data.reduce((sum, r) => sum + r.amount, 0) / 100
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching refunds:', error);
    return new Response(JSON.stringify({ 
      error: 'Error al obtener reembolsos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Crear un reembolso
export const POST: APIRoute = async ({ request }) => {
  try {
    const supabase = getSupabaseAdmin();
    const { orderId, paymentIntentId, amount, reason } = await request.json();

    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: 'paymentIntentId requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear reembolso en Stripe
    const refundParams: any = {
      payment_intent: paymentIntentId,
    };

    // Si se especifica amount, es reembolso parcial (en céntimos)
    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    // Razón del reembolso
    if (reason) {
      refundParams.reason = reason; // 'duplicate', 'fraudulent', 'requested_by_customer'
    }

    const refund = await stripe.refunds.create(refundParams);

    // Actualizar estado del pedido en Supabase
    if (orderId) {
      // Obtener el payment intent para ver si es reembolso total o parcial
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      const totalRefunded = paymentIntent.amount_received - (paymentIntent.amount_received - refund.amount);
      const isFullRefund = totalRefunded >= paymentIntent.amount;

      await supabase
        .from('orders')
        .update({ 
          status: isFullRefund ? 'refunded' : 'partially_refunded',
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', orderId);

      // Desactivar tokens de descarga si es reembolso total
      if (isFullRefund) {
        // Obtener order_items del pedido
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id')
          .eq('order_id', orderId);

        if (orderItems) {
          for (const item of orderItems as { id: string }[]) {
            await supabase
              .from('download_tokens')
              .update({ is_active: false } as any)
              .eq('order_item_id', item.id);
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        created: new Date(refund.created * 1000).toISOString()
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating refund:', error);
    return new Response(JSON.stringify({ 
      error: 'Error al crear reembolso',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
