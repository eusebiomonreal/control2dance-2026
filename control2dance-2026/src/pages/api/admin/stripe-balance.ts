/**
 * API endpoint para obtener el balance de Stripe
 * Compara con los datos de Supabase para verificar consistencia
 */

import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';
import { createServerClient } from '../../../lib/supabase';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Verificar que es admin (simplificado - en producción usar auth)
    const supabase = createServerClient();

    // Obtener balance de Stripe
    const balance = await stripe.balance.retrieve();
    
    // Obtener checkout sessions pagadas (últimos 30 días)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    // Filtrar solo los pagados
    const paidSessions = sessions.data.filter(s => s.payment_status === 'paid');
    
    // Calcular totales de Stripe
    const stripeTotal = paidSessions.reduce((sum, s) => sum + (s.amount_total || 0), 0) / 100;

    // Obtener totales de Supabase (últimos 30 días)
    const thirtyDaysAgoISO = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: orders, error } = await supabase
      .from('orders')
      .select('stripe_session_id, total, status, created_at')
      .gte('created_at', thirtyDaysAgoISO);

    if (error) {
      console.error('Error fetching orders:', error);
    }

    const paidOrders = (orders || []).filter(o => o.status === 'paid');
    const supabaseTotal = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const supabaseOrders = paidOrders.length;
    const stripeSessionCount = paidSessions.length;

    // Verificar cuántas sesiones de Stripe NO están en Supabase
    const supabaseSessionIds = new Set(paidOrders.map(o => o.stripe_session_id));
    const missingSessions = paidSessions.filter(s => !supabaseSessionIds.has(s.id));

    // Balance disponible en Stripe
    const availableBalance = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
    const pendingBalance = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

    return new Response(JSON.stringify({
      stripe: {
        available: availableBalance,
        pending: pendingBalance,
        last30Days: stripeTotal,
        refunded30Days: 0,
        charges30Days: stripeSessionCount,
        currency: balance.available[0]?.currency?.toUpperCase() || 'EUR'
      },
      supabase: {
        last30Days: supabaseTotal,
        orders30Days: supabaseOrders
      },
      sync: {
        difference: Math.abs(stripeTotal - supabaseTotal),
        missingCount: missingSessions.length,
        ordersMatch: missingSessions.length === 0,
        amountMatch: Math.abs(stripeTotal - supabaseTotal) < 1 // Tolerancia de 1€
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching Stripe balance:', error);
    return new Response(JSON.stringify({ 
      error: 'Error al obtener balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
