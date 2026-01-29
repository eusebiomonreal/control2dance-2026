import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request, cookies }) => {
    try {
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
        const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Verificar autenticación del admin
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !adminUser) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });
        }

        // 2. Verificar rol de admin
        const { data: roleData } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', adminUser.id)
            .single();

        if (roleData?.role !== 'admin') {
            return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });
        }

        // 3. Procesar solicitud
        const { userId, action } = await request.json();

        if (action === 'start') {
            if (!userId) return new Response(JSON.stringify({ error: 'User ID required' }), { status: 400 });

            // Verificar que el usuario a impersonar existe
            const { data: targetUser, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId);
            if (targetError || !targetUser) {
                return new Response(JSON.stringify({ error: 'Target user not found' }), { status: 404 });
            }

            // Establecer cookie (expira en 1 hora por seguridad)
            cookies.set('impersonated_user_id', userId, {
                path: '/',
                httpOnly: false, // Necesitamos leerla desde el cliente (authStore)
                maxAge: 3600,
                sameSite: 'lax'
            });

            return new Response(JSON.stringify({ success: true, message: 'Impersonation started' }), { status: 200 });
        } else if (action === 'stop') {
            cookies.delete('impersonated_user_id', { path: '/' });
            return new Response(JSON.stringify({ success: true, message: 'Impersonation stopped' }), { status: 200 });
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
    } catch (err) {
        console.error('Impersonation error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
};
