import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// GET - Listar todos los usuarios con sus roles
export const GET: APIRoute = async ({ request }) => {
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

  // Obtener todos los usuarios de auth
  const { data: authUsers, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    return new Response(JSON.stringify({ error: 'Error fetching users' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Obtener todos los roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('user_id, role');

  // Combinar usuarios con sus roles
  const usersWithRoles = authUsers.users.map(u => {
    const role = roles?.find(r => r.user_id === u.id);
    return {
      id: u.id,
      email: u.email,
      role: role?.role || 'user',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at
    };
  });

  return new Response(JSON.stringify(usersWithRoles), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

// POST - Cambiar rol de un usuario
export const POST: APIRoute = async ({ request }) => {
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

  // Obtener datos del body
  const body = await request.json();
  const { userId, role } = body;

  if (!userId || !role) {
    return new Response(JSON.stringify({ error: 'userId and role are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!['admin', 'user'].includes(role)) {
    return new Response(JSON.stringify({ error: 'Invalid role. Must be "admin" or "user"' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // No permitir que un admin se quite el rol a sí mismo
  if (userId === user.id && role !== 'admin') {
    return new Response(JSON.stringify({ error: 'No puedes quitarte el rol de admin a ti mismo' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (role === 'admin') {
    // Añadir o actualizar como admin
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });

    if (error) {
      return new Response(JSON.stringify({ error: 'Error updating role' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    // Quitar rol (eliminar de la tabla)
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return new Response(JSON.stringify({ error: 'Error removing role' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ success: true, userId, role }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
