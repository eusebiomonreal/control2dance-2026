import { supabase } from '../lib/supabase';
import { sendNewsletterAcceptanceNotification } from './emailService';

interface SubscribeParams {
    email: string;
    name?: string;
    source?: string;
    ip_address?: string | null;
    user_agent?: string | null;
}

/**
 * Procesa una suscripción a la newsletter de forma unificada.
 * Hace la comprobación, notifica al admin y guarda en BD.
 */
export async function processNewsletterSubscription({
    email,
    name,
    source = 'checkout',
    ip_address,
    user_agent
}: SubscribeParams) {
    try {
        if (!email) return { success: false, error: 'Email requerido' };

        const userName = name || email.split('@')[0];

        // 1. Verificar si ya es un suscriptor activo
        const { data: existingSubscriber } = await supabase
            .from('newsletter_subscribers')
            .select('is_active')
            .eq('email', email)
            .maybeSingle();

        if (existingSubscriber?.is_active) {
            console.log(`ℹ️ [Newsletter] Subscriber already active: ${email}. Skipping.`);
            return { success: true, already_subscribed: true };
        }

        console.log(`📧 [Newsletter] New subscription attempt for: ${email}`);

        // 2. Notificar al admin por email
        try {
            await sendNewsletterAcceptanceNotification({ name: userName, email });
        } catch (emailErr) {
            console.error('❌ [Newsletter] Error sending admin notification:', emailErr);
            // Seguimos adelante aunque el email falle
        }

        // 3. Guardar en base de datos para cumplimiento GDPR
        const { error: dbError } = await supabase
            .from('newsletter_subscribers')
            .upsert({
                email,
                name: userName,
                is_active: true,
                source,
                consent_given: true,
                consent_text: 'Quiero recibir novedades y lanzamientos exclusivos en mi email',
                subscribed_at: new Date().toISOString(),
                ip_address,
                user_agent
            }, { onConflict: 'email' });

        if (dbError) {
            console.error('❌ [Newsletter] Error saving to DB:', dbError);
            return { success: false, error: dbError.message };
        }

        return { success: true };
    } catch (error: any) {
        console.error('❌ [Newsletter] Unexpected error:', error);
        return { success: false, error: error.message };
    }
}
