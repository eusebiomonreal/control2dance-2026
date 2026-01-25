/**
 * API endpoint para obtener todos los usuarios de Supabase
 * Requiere autenticación de admin
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request }) => {
  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
    const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!serviceKey) {
      return new Response(JSON.stringify({ error: 'Service key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Cliente con service key para acceder a auth.admin
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verificar que el usuario actual es admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si es admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener todos los usuarios
    const { data: authData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      return new Response(JSON.stringify({ error: usersError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener pedidos para enriquecer datos
    const { data: ordersData } = await supabaseAdmin
      .from('orders')
      .select('id, customer_email, total, created_at, status, order_items(id)')
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    // Agrupar pedidos por email
    const ordersByEmail: Record<string, { 
      count: number; 
      total: number; 
      lastOrder: string;
      orders: Array<{ id: string; total: number; created_at: string; items_count: number }>;
    }> = {};
    
    (ordersData || []).forEach(order => {
      const email = order.customer_email;
      if (!ordersByEmail[email]) {
        ordersByEmail[email] = { count: 0, total: 0, lastOrder: order.created_at, orders: [] };
      }
      ordersByEmail[email].count++;
      ordersByEmail[email].total += order.total || 0;
      if (order.created_at > ordersByEmail[email].lastOrder) {
        ordersByEmail[email].lastOrder = order.created_at;
      }
      ordersByEmail[email].orders.push({
        id: order.id,
        total: order.total,
        created_at: order.created_at,
        items_count: order.order_items?.length || 0
      });
    });

    // Combinar datos de usuarios con pedidos
    const users = authData.users.map(u => ({
      id: u.id,
      email: u.email || '',
      name: u.user_metadata?.name || u.user_metadata?.full_name || null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      email_confirmed_at: u.email_confirmed_at,
      orders_count: ordersByEmail[u.email || '']?.count || 0,
      total_spent: ordersByEmail[u.email || '']?.total || 0,
      last_order_at: ordersByEmail[u.email || '']?.lastOrder || null,
      orders: ordersByEmail[u.email || '']?.orders || []
    }));

    return new Response(JSON.stringify({ users }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
