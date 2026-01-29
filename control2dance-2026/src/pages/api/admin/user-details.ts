import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ request, url }) => {
    try {
        const userId = url.searchParams.get('id');
        if (!userId) return new Response(JSON.stringify({ error: 'ID required' }), { status: 400 });

        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
        const serviceKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // 1. Verificar autenticación del admin
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401 });

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !adminUser) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 });

        // 2. Verificar rol de admin
        const { data: roleData } = await supabaseAdmin
            .from('user_roles')
            .select('role')
            .eq('user_id', adminUser.id)
            .single();

        if (roleData?.role !== 'admin') return new Response(JSON.stringify({ error: 'Not authorized' }), { status: 403 });

        // 3. Obtener datos del usuario objetivo
        const { data: { user: targetUser }, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId);

        if (targetError || !targetUser) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

        return new Response(JSON.stringify({
            id: targetUser.id,
            email: targetUser.email,
            user_metadata: targetUser.user_metadata,
            created_at: targetUser.created_at
        }), { status: 200 });

    } catch (err) {
        console.error('User details error:', err);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
};
