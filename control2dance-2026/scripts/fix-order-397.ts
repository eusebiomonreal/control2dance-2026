import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const MAPPING = {
    'R.D.B – No More Trouble': 'cbade658-2c27-4cbb-88eb-769cab2059fc', // No More Trouble
    'Scratch – Scratch Ep': 'd1dd66e0-b8af-47b5-bb05-b8050368403c'     // Scratch Ep
    // Note: Also mapped 'Scratch - Scratch Ep' just in case of dash diffs
};

async function fixOrder397() {
    console.log('🛠️ Arreglando pedido #397...');

    // 1. Get items for order 397 (both duplicate orders)
    const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, user_id')
        .eq('order_number', 397);

    if (!orders || orders.length === 0) {
        console.error('Pedido no encontrado');
        return;
    }

    for (const order of orders) {
        const { data: items } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id);

        if (!items) continue;

        for (const item of items) {
            // Find manual match
            const targetId = MAPPING[item.product_name] ||
                (item.product_name.includes('No More Trouble') ? 'cbade658-2c27-4cbb-88eb-769cab2059fc' : null) ||
                (item.product_name.includes('Scratch Ep') ? 'd1dd66e0-b8af-47b5-bb05-b8050368403c' : null);

            if (targetId) {
                console.log(`✅ Enlazando "${item.product_name}" -> ID: ${targetId}`);

                // Update item
                await supabase
                    .from('order_items')
                    .update({ product_id: targetId })
                    .eq('id', item.id);

                // Check if token exists
                const { data: tokens } = await supabase
                    .from('download_tokens')
                    .select('id')
                    .eq('order_item_id', item.id);

                if (!tokens || tokens.length === 0) {
                    console.log('  ➕ Creando token...');

                    // Calculate expiration: created_at + 30 days
                    const purchaseDate = new Date(order.created_at);
                    const expiresAt = new Date(purchaseDate);
                    expiresAt.setDate(purchaseDate.getDate() + 30);

                    await supabase.from('download_tokens').insert({
                        token: randomUUID(),
                        user_id: order.user_id,
                        product_id: targetId,
                        order_item_id: item.id,
                        max_downloads: 3,
                        download_count: 3, // EXHAUSTED by default policy
                        expires_at: expiresAt.toISOString(),
                        is_active: true
                    });
                }
            } else {
                console.log(`⚠️ No se encontró mapping para "${item.product_name}"`);
            }
        }
    }

    console.log('✅ Reparación completada.');
}

fixOrder397();
