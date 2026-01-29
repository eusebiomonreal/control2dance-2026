import { createClient } from '@supabase/supabase-js';
import { decode } from 'html-entities';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function fixNames() {
    console.log('🧹 Limpiando nombres de productos en order_items...');

    // 1. Get all items with potential entities
    const { data: items, error } = await supabase
        .from('order_items')
        .select('id, product_name')
        .or('product_name.ilike.%&%,product_name.ilike.%#%');

    if (error) {
        console.error('Error fetching items:', error);
        return;
    }

    console.log(`🔍 Encontrados ${items.length} items con caracteres extraños.`);

    let updated = 0;

    for (const item of items) {
        const cleanName = decode(item.product_name);

        if (cleanName !== item.product_name) {
            const { error: updateError } = await supabase
                .from('order_items')
                .update({ product_name: cleanName })
                .eq('id', item.id);

            if (!updateError) {
                updated++;
                if (updated % 50 === 0) process.stdout.write('.');
            }
        }
    }

    console.log(`\n✅ Limpieza completada. ${updated} nombres corregidos.`);
}

fixNames();
