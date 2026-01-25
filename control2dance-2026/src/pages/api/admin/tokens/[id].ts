import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const tokenId = params.id;
  
  if (!tokenId) {
    return new Response(JSON.stringify({ error: 'Token ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar autenticación admin
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'No authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
  const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!serviceKey) {
    return new Response(JSON.stringify({ error: 'Service key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const supabase = createClient(supabaseUrl!, serviceKey);

  // Verificar que el usuario es admin
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar rol admin
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (userRole?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Resetear token de descarga
  const { data, error } = await supabase
    .from('download_tokens')
    .update({ 
      download_count: 0,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('id', tokenId)
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: 'Error resetting token' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
