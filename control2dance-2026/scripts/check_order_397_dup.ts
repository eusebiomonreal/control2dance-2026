import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function checkDup() {
    const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*, download_tokens(*))')
        .eq('order_number', 397);

    console.log(`Encontrados ${orders?.length} pedidos con #397:\n`);

    orders?.forEach((order, idx) => {
        console.log(`=== Pedido ${idx + 1} (${order.id}) ===`);
        console.log(`Email: ${order.customer_email}`);
        console.log(`User ID: ${order.user_id}`);
        console.log('Items:');
        order.order_items.forEach(item => {
            console.log(`  - ${item.product_name}`);
            console.log(`    PID: ${item.product_id}`);
            console.log(`    Tokens: ${item.download_tokens?.length || 0}`);
        });
        console.log('');
    });
}

checkDup();
