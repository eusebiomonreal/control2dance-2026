import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function analyzeMigration() {
    console.log('📊 Análisis de pedidos migrados de WordPress\n');

    // Get all paid orders
    const { data: paidOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'paid');

    console.log('Total pedidos pagados:', paidOrders?.length || 0);

    // Get order items with and without product_id
    const { data: allItems } = await supabase
        .from('order_items')
        .select('id, product_id, product_name')
        .in('order_id', paidOrders?.map(o => o.id) || []);

    const withProduct = allItems?.filter(i => i.product_id) || [];
    const withoutProduct = allItems?.filter(i => !i.product_id) || [];

    console.log('\nItems de pedidos pagados:');
    console.log('  Total items:', allItems?.length || 0);
    console.log('  ✅ Con product_id:', withProduct.length);
    console.log('  ❌ Sin product_id:', withoutProduct.length);
    console.log('  📊 Porcentaje válido:', ((withProduct.length / (allItems?.length || 1)) * 100).toFixed(1) + '%');

    // Check how many have tokens
    const { count: tokenCount } = await supabase
        .from('download_tokens')
        .select('*', { count: 'exact', head: true });

    console.log('\nTokens de descarga:');
    console.log('  Tokens existentes:', tokenCount);
    console.log('  Items que podrían tener token:', withProduct.length);
    console.log('  Cobertura:', ((tokenCount! / withProduct.length) * 100).toFixed(1) + '%');

    // Sample of products without ID
    console.log('\nEjemplos de productos sin ID (primeros 10):');
    withoutProduct.slice(0, 10).forEach(item => {
        console.log('  -', item.product_name);
    });
}

analyzeMigration();
