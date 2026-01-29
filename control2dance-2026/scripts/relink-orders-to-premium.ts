import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function recover() {
    console.log('🚀 Starting Order Recovery and Relinking...');

    // 1. Recreate "Can You Feel The Rhythm"
    console.log('\n--- Recreating "Can You Feel The Rhythm" ---');
    const { data: newProd, error: prodError } = await supabase
        .from('products')
        .insert({
            name: 'Class - Can You Feel The Rhythm',
            catalog_number: 'C2D-13340',
            slug: 'class-can-you-feel-the-rhythm',
            price: 2.99,
            is_active: true,
            cover_image: 'https://control2dance.es/wp-content/uploads/edd/2023/10/class-can-you-feel.jpg',
            description: 'Can You Feel The Rhythm - Class',
            audio_previews: [
                { url: 'https://control2dance.es/wp-content/uploads/edd/2023/10/Class-Can-You-Feel-The-Rhythm-Groove-Mix.wav', track_name: 'Groove Mix' },
                { url: 'https://control2dance.es/wp-content/uploads/edd/2023/10/Class-Can-You-Feel-The-Rhythm-Original-Mix.wav', track_name: 'Original Mix' },
                { url: 'https://control2dance.es/wp-content/uploads/edd/2023/10/Class-Can-You-Feel-The-Rhythm.wav', track_name: 'Can You Feel The Rhythm' }
            ]
        })
        .select()
        .single();

    if (prodError) {
        console.error('❌ Error recreating product:', prodError.message);
    } else {
        console.log(`✅ Recreated product: ${newProd.name} (${newProd.id})`);
    }

    // 2. Mapping of names to IDs
    const ID_MAP: Record<string, string> = {
        'DJ Cheno \u0026 SR Pely \u2013 Searching 4 why': '0bde576c-bade-4aeb-a5b2-08928dbc940c',
        'DJ Cheno & SR Pely - Searching 4 why': '0bde576c-bade-4aeb-a5b2-08928dbc940c',
        'DJ Cheno &#038; SR Pely &#8211; Searching 4 why': '0bde576c-bade-4aeb-a5b2-08928dbc940c',

        'Pack DJ RUBEN SANCHEZ': '5c801548-e53d-416b-ae5a-1a04f1ee50c0',

        'Da Nu Style Vol.2': '0c84eb54-eb1c-4232-bf74-2f957b13d5ca',

        'Da Nu Style Vol 4 \u2013 Chris-Maxxx': '3154cd1d-1676-4a41-a804-8ac7d2242919',
        'Da Nu Style Vol 4 &#8211; Chris-Maxxx': '3154cd1d-1676-4a41-a804-8ac7d2242919',
        'Chris-Maxxx': '3154cd1d-1676-4a41-a804-8ac7d2242919',

        'Class \u2013 Can You Feel The Rhythm': newProd?.id,
        'Class &#8211; Can You Feel The Rhythm': newProd?.id,
        'Class - Can You Feel The Rhythm': newProd?.id
    };

    console.log('\n--- Relinking order_items ---');
    let totalUpdated = 0;

    for (const [name, productId] of Object.entries(ID_MAP)) {
        if (!productId) continue;

        const { data: updated, error: updateError } = await supabase
            .from('order_items')
            .update({ product_id: productId })
            .is('product_id', null)
            .eq('product_name', name)
            .select('id');

        if (updateError) {
            console.error(`❌ Error relinking "${name}":`, updateError.message);
        } else if (updated && updated.length > 0) {
            console.log(`✅ Relinked ${updated.length} items for "${name}" ➔ ${productId}`);
            totalUpdated += updated.length;
        }
    }

    console.log(`\n✨ Recovery finished! Total records relinked: ${totalUpdated}`);
}

recover().catch(err => {
    console.error('💥 Fatal error:', err);
});
