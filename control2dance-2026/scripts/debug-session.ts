import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { nanoid } from 'nanoid';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2025-12-15.clover' as any
});

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

async function reprocess(sessionId: string) {
    console.log(`🔍 Reprocessing session: ${sessionId}`);

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['line_items', 'customer']
        });

        console.log('✅ Session retrieved');
        console.log('Metadata:', session.metadata);

        if (session.metadata?.app !== 'c2d-2026') {
            console.log('❌ App metadata mismatch');
            return;
        }

        // Logic from handleCheckoutComplete
        const userId = session.metadata?.user_id || null;

        let paymentMethod = null;
        let receiptUrl = null;

        if (session.payment_intent) {
            const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
                expand: ['latest_charge']
            });
            const charge = paymentIntent.latest_charge as any;
            paymentMethod = charge?.payment_method_details?.type || 'card';
            receiptUrl = charge?.receipt_url || null;
        }

        console.log('Creating order in Supabase...');
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: userId || null,
                stripe_session_id: session.id,
                stripe_payment_intent: session.payment_intent as string,
                stripe_customer_id: session.customer as string,
                customer_email: session.customer_email || (session.customer_details?.email),
                customer_name: session.customer_details?.name,
                customer_country: session.customer_details?.address?.country || null,
                payment_method: paymentMethod,
                stripe_receipt_url: receiptUrl,
                subtotal: (session.amount_subtotal || 0) / 100,
                total: (session.amount_total || 0) / 100,
                status: 'paid',
                paid_at: new Date().toISOString()
            })
            .select()
            .single();

        if (orderError) {
            console.error('❌ Error creating order:', orderError);
            return;
        }

        console.log('✅ Order created:', order.id);

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
            expand: ['data.price.product']
        });

        for (const item of lineItems.data) {
            const product = item.price?.product as any;
            const productId = product?.metadata?.product_id;

            const { data: orderItem, error: itemError } = await supabase
                .from('order_items')
                .insert({
                    order_id: order.id,
                    product_id: productId || null,
                    product_name: item.description || product?.name || 'Producto',
                    product_catalog_number: product?.description || null,
                    price: (item.amount_total || 0) / 100,
                    quantity: item.quantity || 1
                })
                .select()
                .single();

            if (itemError) {
                console.error('❌ Error creating order item:', itemError);
                continue;
            }

            const token = nanoid(32);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            const { error: tokenError } = await supabase
                .from('download_tokens')
                .insert({
                    order_item_id: orderItem.id,
                    user_id: userId || null,
                    product_id: productId || null,
                    token,
                    max_downloads: 3,
                    download_count: 0,
                    expires_at: expiresAt.toISOString(),
                    is_active: true
                });

            if (tokenError) console.error('❌ Error token:', tokenError);
        }

        console.log('✨ Success!');

    } catch (error) {
        console.error('💥 Fatal error:', error);
    }
}

const sessionId = 'cs_live_a1q1Oyf3t73DeVbNVTZjbIfWmp6Btf2QKUbMWzpvosyitZ2NPEAbgfd0on';
reprocess(sessionId);
