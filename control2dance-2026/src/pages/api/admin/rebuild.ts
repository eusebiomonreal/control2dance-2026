/**
 * API Endpoint: Rebuild del sitio
 *
 * POST /api/admin/rebuild
 *
 * Dispara un rebuild del sitio estático.
 * Solo accesible para usuarios admin.
 */

import type { APIRoute } from 'astro';
import { createServerClient } from '../../../lib/supabase';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Verificar autenticación
    const supabase = createServerClient();

    // Obtener token de la cookie o header
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || cookies.get('sb-access-token')?.value;

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar usuario
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verificar rol admin
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Acceso denegado' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Ejecutar rebuild en background
    // En producción, esto debería:
    // 1. Disparar un webhook a tu sistema de CI/CD
    // 2. O ejecutar el build en el servidor
    // 3. O llamar a la API de Vercel/Netlify para rebuild

    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // En producción, ejecutar build
      // Nota: Ajusta el comando según tu setup (pm2, systemd, etc.)
      try {
        // Ejecutar en background sin esperar
        exec('npm run build && pm2 restart control2dance 2>&1 &', {
          cwd: process.cwd()
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Rebuild iniciado. El sitio se actualizará en unos minutos.'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (buildError: any) {
        console.error('Build error:', buildError);
        return new Response(
          JSON.stringify({
            error: 'Error iniciando rebuild',
            details: buildError.message
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // En desarrollo, solo simular
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Rebuild simulado (desarrollo). En producción se ejecutará el build real.'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Rebuild API error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
