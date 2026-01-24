import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
  
  // Solo mostramos los últimos 4 caracteres por seguridad
  const maskedStripe = stripeKey ? `...${stripeKey.slice(-8)}` : 'NOT SET';
  const maskedSupabase = supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET';
  
  return new Response(JSON.stringify({
    stripe_key_ending: maskedStripe,
    supabase_url_start: maskedSupabase,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
