
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkUserOrders(email: string) {
    console.log(`Checking orders for: ${email}`);

    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, customer_email, total, created_at, status')
        .eq('customer_email', email);

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    console.log(`Total orders found: ${orders.length}`);
    orders.forEach(o => {
        console.log(`- Order ${o.id}: ${o.total}€ - ${o.created_at} (${o.status})`);
    });

    // Check auth user
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    const authUser = users.users.find(u => u.email === email);

    if (authUser) {
        console.log(`\nAuth User ID: ${authUser.id}`);
        const { data: userOrders, error: userOrdersError } = await supabase
            .from('orders')
            .select('id')
            .eq('user_id', authUser.id);

        console.log(`Orders linked by user_id: ${userOrders?.length || 0}`);
    } else {
        console.log('\nAuth user not found.');
    }
}

const targetEmail = 'mariodz2004.md@gmail.com';
checkUserOrders(targetEmail);
