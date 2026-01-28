/**
 * API endpoint para registrar la aceptación de newsletter y notificar al admin
 * POST /api/auth/newsletter-opt-in
 */

import type { APIRoute } from 'astro';
import { sendNewsletterAcceptanceNotification } from '../../../services/emailService';
import { supabase } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
    try {
        const data = await request.json();
        const { email, name } = data;

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Faltan datos requeridos' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const userName = name || email.split('@')[0];

        // 1. Notificar al admin por email
        await sendNewsletterAcceptanceNotification({ name: userName, email });

        // 2. Guardar en base de datos para cumplimiento GDPR
        const { error: dbError } = await supabase
            .from('newsletter_subscribers')
            .upsert({
                email,
                name: userName,
                is_active: true,
                source: 'registration_or_checkout',
                consent_given: true,
                consent_text: 'Quiero recibir novedades y lanzamientos exclusivos en mi email',
                subscribed_at: new Date().toISOString(),
                ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
                user_agent: request.headers.get('user-agent')
            }, { onConflict: 'email' });

        if (dbError) {
            console.error('Error saving subscriber to DB:', dbError);
            // No fallamos la request si falla la DB, pero lo logueamos
        }

        return new Response(
            JSON.stringify({ success: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (e: any) {
        console.error('Error en newsletter opt-in:', e);
        return new Response(
            JSON.stringify({ error: e.message || 'Error interno' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
};
