import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

const JSON_PATH = 'scripts/wordpress-plugin/edd-export-2026-01-29-211753.json';

async function backfillNames() {
    console.log('🔄 Rellenando nombres de clientes desde JSON...');

    // 1. Load JSON
    const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
    const jsonData = JSON.parse(rawData);
    const jsonOrders = jsonData.orders || [];

    console.log(`📂 JSON cargado con ${jsonOrders.length} pedidos.`);

    // Create a map for fast lookup: order_number -> customer_name
    const nameMap = new Map<string, string>();
    jsonOrders.forEach((o: any) => {
        if (o.order_number && o.customer_name) {
            nameMap.set(o.order_number.toString(), o.customer_name);
        }
    });

    // 2. Get DB orders
    // We only care about orders that might be missing names or have placeholders
    const { data: dbOrders, error } = await supabase
        .from('orders')
        .select('id, order_number, customer_name')
        .not('order_number', 'is', null);

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    console.log(`🗄️  Encontrados ${dbOrders.length} pedidos en base de datos.`);

    let updated = 0;
    let skipped = 0; // Already had same name
    let missing = 0; // Not found in JSON

    for (const order of dbOrders) {
        const jsonName = nameMap.get(order.order_number.toString());

        if (jsonName) {
            // Check if update is needed
            if (order.customer_name !== jsonName) {
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ customer_name: jsonName })
                    .eq('id', order.id);

                if (!updateError) {
                    updated++;
                    if (updated % 50 === 0) process.stdout.write('.');
                } else {
                    console.error(`❌ Error actualizando pedido #${order.order_number}:`, updateError.message);
                }
            } else {
                skipped++;
            }
        } else {
            // Only log missing if it's an old order (low ID/numeration)
            if (parseInt(order.order_number) < 1000) {
                // console.log(`⚠️ Pedido #${order.order_number} no encontrado en JSON.`);
                missing++;
            }
        }
    }

    console.log(`\n\n✅ Proceso completado:`);
    console.log(`  📝 Actualizados: ${updated}`);
    console.log(`  ⏭️  Saltados (ya correctos): ${skipped}`);
    console.log(`  ❓ No encontrados en JSON: ${missing}`);
}

backfillNames();
