import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verify() {
    console.log('🔍 Verifying Supabase Data...');
    console.log(`URL: ${SUPABASE_URL}`);

    const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
    console.log(`📀 Total Products: ${productCount}`);

    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    console.log(`🛒 Total Orders: ${orderCount}`);

    const { data: latestOrders } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('\n📅 Latest 5 Orders:');
    console.table(latestOrders?.map(o => ({ id: o.id, email: o.customer_email, total: o.total, created: o.created_at })));

    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('❌ Error listing auth users:', authError.message);
    } else {
        console.log(`\n👥 Total Auth Users: ${authUsers.users.length}`);
        console.log('Latest 5 Users:');
        console.table(authUsers.users.slice(0, 5).map(u => ({ id: u.id, email: u.email, created: u.created_at })));
    }
}

verify();
