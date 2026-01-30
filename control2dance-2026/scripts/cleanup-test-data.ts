import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    console.log('🧹 Iniciando limpieza de datos de prueba...');

    // 1. Identificar pedidos de prueba (sin order_number o de usuarios conocidos de test)
    const { data: testOrders, error: findError } = await supabase
        .from('orders')
        .select('id, order_number, customer_email')
        .or('order_number.is.null,customer_email.eq.fernandoconserjeria@gmail.com');

    if (findError) {
        console.error('❌ Error buscando pedidos:', findError);
        return;
    }

    if (!testOrders || testOrders.length === 0) {
        console.log('✅ No se encontraron pedidos de prueba para eliminar.');
        return;
    }

    console.log(`📋 Se han encontrado ${testOrders.length} pedidos de prueba.`);

    // Filtrar para estar 100% seguros de no tocar el 840 o inferiores
    const ordersToDelete = testOrders.filter(o => !o.order_number || o.order_number > 20000); // Suponiendo que los de prueba no tienen numero o tienen uno muy alto

    if (ordersToDelete.length === 0) {
        console.log('✅ Ningún pedido cumple los criterios estrictos de eliminación.');
        return;
    }

    const idsToDelete = ordersToDelete.map(o => o.id);
    console.log(`🗑️ Eliminando datos asociados a ${ordersToDelete.length} pedidos...`);

    // 1. Obtener IDs de tokens de descarga asociados a estos pedidos
    const { data: tokens } = await supabase
        .from('download_tokens')
        .select('id')
        .in('product_id', await (async () => {
            const { data: items } = await supabase.from('order_items').select('product_id').in('order_id', idsToDelete);
            return (items || []).map(i => i.product_id);
        })());

    // En realidad, es mejor buscar tokens por order_item_id
    const { data: items } = await supabase.from('order_items').select('id').in('order_id', idsToDelete);
    const itemIds = (items || []).map(i => i.id);

    if (itemIds.length > 0) {
        const { data: tokensData } = await supabase.from('download_tokens').select('id').in('order_item_id', itemIds);
        const tokenIds = (tokensData || []).map(t => t.id);

        if (tokenIds.length > 0) {
            console.log(`   - Limpiando ${tokenIds.length} tokens y sus logs...`);
            await supabase.from('download_logs').delete().in('download_token_id', tokenIds);
            await supabase.from('download_tokens').delete().in('id', tokenIds);
        }
    }

    // 2. Eliminar items de pedido
    await supabase.from('order_items').delete().in('order_id', idsToDelete);

    // 3. Eliminar los pedidos
    const { error: delError } = await supabase
        .from('orders')
        .delete()
        .in('id', idsToDelete);

    if (delError) {
        console.error('❌ Error eliminando pedidos:', delError);
    } else {
        console.log('✨ Limpieza completada con éxito.');
        ordersToDelete.forEach(o => console.log(`   - Eliminado: ${o.customer_email} (ID: ${o.id})`));
    }
}

run();
