import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

interface OrderItem {
    id: string;
    order_id: string;
    product_id: string | null;
    product_name: string;
}

interface Order {
    id: string;
    user_id: string;
    order_number: number;
    status: string;
    created_at: string;
}

async function createMissingTokens() {
    console.log('🔍 Searching for paid orders without download tokens...\n');

    // Get all paid orders
    const { data: paidOrders, error: ordersError } = await supabase
        .from('orders')
        .select('id, user_id, order_number, status, created_at')
        .eq('status', 'paid');

    if (ordersError) {
        console.error('❌ Error fetching orders:', ordersError);
        return;
    }

    console.log(`📦 Found ${paidOrders.length} paid orders\n`);

    let tokensCreated = 0;
    let tokensSkipped = 0;
    let errors = 0;

    for (const order of paidOrders) {
        // Get order items
        const { data: items, error: itemsError } = await supabase
            .from('order_items')
            .select('id, order_id, product_id, product_name')
            .eq('order_id', order.id);

        if (itemsError) {
            console.error(`❌ Error fetching items for order #${order.order_number}:`, itemsError);
            errors++;
            continue;
        }

        for (const item of items || []) {
            // Skip items without a product_id
            if (!item.product_id) {
                console.log(`⚠️  Skipping "${item.product_name}" (no product_id)`);
                tokensSkipped++;
                continue;
            }

            // Check if token already exists
            const { count, error: countError } = await supabase
                .from('download_tokens')
                .select('*', { count: 'exact', head: true })
                .eq('order_item_id', item.id);

            if (countError) {
                console.error(`❌ Error checking token for "${item.product_name}":`, countError);
                errors++;
                continue;
            }

            // Skip if token already exists
            if (count && count > 0) {
                tokensSkipped++;
                continue;
            }

            // Create new download token
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

            const token = {
                token: randomUUID(),
                user_id: order.user_id,
                product_id: item.product_id,
                order_item_id: item.id,
                max_downloads: 3,
                download_count: 0,
                expires_at: expiresAt.toISOString(),
                is_active: true
            };

            const { error: insertError } = await supabase
                .from('download_tokens')
                .insert(token);

            if (insertError) {
                console.error(`❌ Error creating token for "${item.product_name}":`, insertError);
                errors++;
                continue;
            }

            console.log(`✅ Created token for order #${order.order_number}: ${item.product_name}`);
            tokensCreated++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Tokens created: ${tokensCreated}`);
    console.log(`⏭️  Tokens skipped (already exist): ${tokensSkipped}`);
    console.log(`❌ Errors: ${errors}`);
    console.log('='.repeat(60));
}

createMissingTokens();
