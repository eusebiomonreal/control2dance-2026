/**
 * API endpoint para registrar la aceptación de newsletter y notificar al admin
 * POST /api/auth/newsletter-opt-in
 */

import type { APIRoute } from 'astro';
import { sendNewsletterAcceptanceNotification } from '../../../services/emailService';
import { processNewsletterSubscription } from '../../../services/newsletterService';
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

        // Usar el servicio unificado
        const result = await processNewsletterSubscription({
            email,
            name: userName,
            source: 'registration_or_checkout',
            ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            user_agent: request.headers.get('user-agent')
        });

        if (!result.success) {
            return new Response(
                JSON.stringify({ error: result.error }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, already_subscribed: result.already_subscribed }),
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
