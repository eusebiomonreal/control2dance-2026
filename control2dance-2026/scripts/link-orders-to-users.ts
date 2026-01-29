import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function linkOrders() {
    console.log('🔗 Enlazando pedidos huérfanos a usuarios por email...');

    // 1. Get all orders with null user_id
    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, customer_email')
        .is('user_id', null);

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    console.log(`🔍 Encontrados ${orders.length} pedidos sin usuario asignado.`);

    // 2. Get all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 10000 });

    if (usersError) {
        console.error('Error fetching users:', usersError);
        return;
    }

    // Create email -> id map
    const userMap = new Map<string, string>();
    users.forEach(u => {
        if (u.email) userMap.set(u.email.toLowerCase(), u.id);
    });

    console.log(`👥 Usuarios cargados: ${userMap.size}\n`);

    let updated = 0;
    let skipped = 0;

    for (const order of orders) {
        if (!order.customer_email) {
            skipped++;
            continue;
        }

        const userId = userMap.get(order.customer_email.toLowerCase());

        if (userId) {
            const { error: updateError } = await supabase
                .from('orders')
                .update({ user_id: userId })
                .eq('id', order.id);

            if (!updateError) {
                updated++;
                if (updated % 50 === 0) process.stdout.write('.');
            } else {
                console.error(`❌ Error actualizando pedido ${order.id}:`, updateError.message);
            }
        } else {
            skipped++;
        }
    }

    console.log(`\n\n✅ Enlace completado:`);
    console.log(`  🔗 Pedidos actualizados: ${updated}`);
    console.log(`  ⏭️ Pedidos sin usuario encontrado: ${skipped}`);
}

linkOrders();
