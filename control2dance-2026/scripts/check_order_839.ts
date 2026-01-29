import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkOrder() {
    const { data: order } = await supabase
        .from('orders')
        .select('*, order_items(*, download_tokens(*))')
        .eq('order_number', 839)
        .single();

    if (!order) {
        console.log('❌ Pedido 839 no encontrado');
        return;
    }

    console.log(`📦 Pedido #${order.order_number} (${order.customer_email})`);
    console.log('Items:');

    order.order_items.forEach(item => {
        console.log(`  - ${item.product_name}`);
        console.log(`    Product ID: ${item.product_id || '❌ MISSING'}`);
        if (item.download_tokens && item.download_tokens.length > 0) {
            const token = item.download_tokens[0];
            console.log(`    Token: ${token.download_count}/${token.max_downloads} (Active: ${token.is_active})`);
        } else {
            console.log('    Token: ❌ NONE');
        }
        console.log('');
    });
}

checkOrder();
