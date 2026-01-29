import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function auditUnmapped() {
    console.log('🕵️‍♂️ Auditando items SIN ENLACE (product_id = null)...\n');

    // 1. Get unmapped items
    const { data: items, error } = await supabase
        .from('order_items')
        .select('id, product_name')
        .is('product_id', null);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`📉 Total items sin enlazar: ${items.length}`);

    // 2. Group by name
    const grouped: Record<string, number> = {};
    items.forEach(item => {
        grouped[item.product_name] = (grouped[item.product_name] || 0) + 1;
    });

    const uniqueNames = Object.keys(grouped);
    console.log(`📦 Productos únicos afectados: ${uniqueNames.length}\n`);

    // 3. Search for matches
    console.log('🔍 Buscando posibles coincidencias en DB:\n');

    for (const name of uniqueNames) {
        // Clean name for search (remove generic words?)
        // Try to extract key terms. Simple approach: try partial matches.

        // Strategy: Split by " - " if exists, take 2nd part. Else take full name.
        let searchTerm = name;
        if (name.includes(' - ')) {
            searchTerm = name.split(' - ')[1].trim();
        } else if (name.includes(' – ')) { // Em dash
            searchTerm = name.split(' – ')[1].trim();
        }

        // Limit search term length to avoid errors or huge results
        searchTerm = searchTerm.substring(0, 20);

        const { data: matches } = await supabase
            .from('products')
            .select('id, name')
            .ilike('name', `%${searchTerm}%`)
            .limit(3);

        console.log(`🔴 [${grouped[name]} pedidos] "${name}"`);
        if (matches && matches.length > 0) {
            console.log('   ✅ Sugerencias:');
            matches.forEach(m => console.log(`      -> ${m.name} (${m.id})`));
        } else {
            console.log('   ❌ Sin coincidencias obvias');
        }
        console.log('');
    }
}

auditUnmapped();
