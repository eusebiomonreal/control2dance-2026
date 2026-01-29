import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

// Manual overrides for tricky cases
const MANUAL_MAP: Record<string, string> = {
    // "Dynamic Beats - Hooters & Goats" to "Hooters &#038; Goats"
    'Dynamic Beats – Hooters & Goats': 'a46cca8d-5e26-4756-a2b8-eb698213d106',
    'Dynamic Beats - Hooters & Goats': 'a46cca8d-5e26-4756-a2b8-eb698213d106',
    // Others found in audit could be added here if needed, but smart match should catch them
};

async function resolveUnmapped() {
    console.log('🚑 Rescatando items sin enlace...\n');

    // 1. Get unmapped items
    const { data: items } = await supabase
        .from('order_items')
        .select('id, product_name, order_id')
        .is('product_id', null);

    if (!items || items.length === 0) {
        console.log('✅ No hay items sin enlace.');
        return;
    }

    console.log(`📋 Procesando ${items.length} items...`);

    let fixed = 0;
    let failed = 0;

    for (const item of items) {
        let targetId: string | null = MANUAL_MAP[item.product_name] || null;

        // Smart Match Strategy if not valid manual map
        if (!targetId) {
            // Extract title part (after dash)
            let cleanName = item.product_name;
            if (item.product_name.includes(' – ')) cleanName = item.product_name.split(' – ')[1].trim();
            else if (item.product_name.includes(' - ')) cleanName = item.product_name.split(' - ')[1].trim();

            // Try exact match on clean name
            const { data: exact } = await supabase
                .from('products')
                .select('id')
                .eq('name', cleanName)
                .maybeSingle();

            if (exact) targetId = exact.id;

            // If failed, try partial match (ilike)
            if (!targetId) {
                const { data: partial } = await supabase
                    .from('products')
                    .select('id, name')
                    .ilike('name', `%${cleanName}%`)
                    .limit(1); // Take best single match

                if (partial && partial.length > 0) {
                    // Ensure reasonable similarity? For now, trust the audit findings
                    targetId = partial[0].id;
                }
            }

            // Special case for "Hooters" if fuzzy matched because of entity
            if (!targetId && (cleanName.includes('Hooters') || cleanName.includes('Goats'))) {
                targetId = 'a46cca8d-5e26-4756-a2b8-eb698213d106';
            }
        }

        if (targetId) {
            // 1. Update Mapping
            await supabase
                .from('order_items')
                .update({ product_id: targetId })
                .eq('id', item.id);

            // 2. Create Token if needed
            // Get order date for expiration
            const { data: order } = await supabase.from('orders').select('created_at, user_id').eq('id', item.order_id).single();

            if (order) {
                // Check if token exists
                const { data: existingToken } = await supabase
                    .from('download_tokens')
                    .select('id')
                    .eq('order_item_id', item.id);

                if (!existingToken || existingToken.length === 0) {
                    const purchaseDate = new Date(order.created_at);
                    const expiresAt = new Date(purchaseDate);
                    expiresAt.setDate(purchaseDate.getDate() + 30);

                    await supabase.from('download_tokens').insert({
                        token: randomUUID(),
                        user_id: order.user_id,
                        product_id: targetId,
                        order_item_id: item.id,
                        max_downloads: 3,
                        download_count: 3, // Exhausted
                        expires_at: expiresAt.toISOString(),
                        is_active: true
                    });
                }
            }
            fixed++;
            process.stdout.write('.');
        } else {
            failed++;
            console.log(`\n❌ Falló mapping para: "${item.product_name}"`);
        }
    }

    console.log(`\n\n🏁 Resumen:`);
    console.log(`✅ Arreglados: ${fixed}`);
    console.log(`❌ Fallidos: ${failed}`);
}

resolveUnmapped();
