import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover' as any
});

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

async function handleRefundManual(paymentIntentId: string) {
    console.log(`💸 Simulando reembolso para PI: ${paymentIntentId}`);

    try {
        // Buscar la orden
        const { data: order, error: findError } = await supabase
            .from('orders')
            .select('id, status')
            .eq('stripe_payment_intent', paymentIntentId)
            .single();

        if (findError || !order) {
            console.log('❌ Orden no encontrada en Supabase para este PI');
            return;
        }

        console.log(`✅ Orden encontrada: ${order.id} (Estado actual: ${order.status})`);

        // Consultar el estado real en Stripe
        const charges = await stripe.charges.list({ payment_intent: paymentIntentId });
        const charge = charges.data[0];

        if (!charge) {
            console.log('❌ No se encontró el cargo en Stripe');
            return;
        }

        console.log(`💳 Estado del cargo en Stripe: refunded=${charge.refunded}`);

        // Aplicar lógica de handleRefund
        let newStatus = 'partially_refunded';
        if (charge.refunded === true) {
            newStatus = 'refunded';
        }

        console.log(`🔄 Actualizando a: ${newStatus}`);

        const { error: updateError } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', order.id);

        if (updateError) {
            console.error('❌ Error al actualizar orden:', updateError);
        } else {
            console.log('✨ Orden actualizada correctamente');
        }

        if (newStatus === 'refunded') {
            const { data: items } = await supabase
                .from('order_items')
                .select('id')
                .eq('order_id', order.id);

            if (items && items.length > 0) {
                const itemIds = items.map((i: any) => i.id);
                await supabase
                    .from('download_tokens')
                    .update({ is_active: false })
                    .in('order_item_id', itemIds);
                console.log('🔒 Tokens desactivados');
            }
        }

    } catch (err) {
        console.error('💥 Error fatal:', err);
    }
}

handleRefundManual('pi_3SvKddHCyCgBVPlp1qE8MEQK');
