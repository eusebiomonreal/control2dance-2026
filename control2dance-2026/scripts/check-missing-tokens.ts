import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function checkMissingTokens() {
    console.log('Checking for orders without download tokens...\n');

    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find(u => u.email === 'fernandoconserjeria@gmail.com');

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`Checking user: ${user.email} (${user.id})\n`);

    // Get paid orders
    const { data: orders } = await supabase
        .from('orders')
        .select('id, order_number, created_at')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log(`Found ${orders?.length || 0} paid orders\n`);

    for (const order of orders || []) {
        console.log(`Order #${order.order_number}:`);

        const { data: items } = await supabase
            .from('order_items')
            .select('id, product_id, product_name')
            .eq('order_id', order.id);

        for (const item of items || []) {
            const { count } = await supabase
                .from('download_tokens')
                .select('*', { count: 'exact', head: true })
                .eq('order_item_id', item.id);

            const status = count === 0 ? '❌ MISSING' : '✅ EXISTS';
            console.log(`  ${status} - ${item.product_name} (${count} tokens)`);
        }
        console.log('');
    }
}

checkMissingTokens();
