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

const BAD_IDS = [
    '4514be9f-704a-48ef-b103-d9bf133f0600', // Da Nu Style Vol 4
    '70d6edae-2dbc-440a-866f-f605ec71b720', // Da Nu Style Vol.2
    '11e47e3a-5faa-4a89-b72d-79adf0893664', // Pack DJ RUBEN SANCHEZ
    'e83ad337-49c6-4b6d-a256-bfee36a00fdc', // Searching 4 why
    'af6fe512-e6f6-4f0b-bc64-c4f545526706'  // Can You Feel The Rhythm
];

// Map of C2D versions to update to correct prices
const GOOD_VERSIONS = [
    { slug: 'control2dance-da-nu-style-vol-2', price: 2.99 },
    { slug: 'control2dance-pack-dj-ruben-sanchez', price: 4.99 },
    { slug: 'dj-cheno-038-sr-pely-searching-4-why', price: 2.99 }
    // Note: Da Nu Style Vol 4 and Can You Feel The Rhythm don't seem to have direct C2D- matches by slug or name in the previous search
    // I will check for them by name to be sure
];

async function restore() {
    console.log('🚀 Starting Restoration of Curated Products...');

    // 1. Delete imported duplicates (only if no orders exist, which I already checked)
    console.log('\n--- Deleting duplicate (EDD) products ---');
    const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .in('id', BAD_IDS);

    if (deleteError) {
        console.error('❌ Error deleting duplicates:', deleteError.message);
    } else {
        console.log('✅ Deleted 5 duplicate products.');
    }

    // 2. Reactivate and update prices for premium versions
    console.log('\n--- Restoring Premium versions ---');
    for (const item of GOOD_VERSIONS) {
        const { data, error } = await supabase
            .from('products')
            .update({ is_active: true, price: item.price })
            .eq('slug', item.slug)
            .select('name');

        if (error) {
            console.error(`❌ Error restoring ${item.slug}:`, error.message);
        } else if (data && data.length > 0) {
            console.log(`✅ Restored and updated price for: ${data[0].name} (${item.price}€)`);
        } else {
            console.log(`⚠️ Premium version of ${item.slug} not found.`);
        }
    }

    // 3. Search for the missing ones by name to see if they were renamed or had different catalog numbers
    const missingNames = ['Da Nu Style Vol 4 - Chris-Maxxx', 'Can You Feel The Rhythm'];
    for (const name of missingNames) {
        const { data: found } = await supabase
            .from('products')
            .select('id, name, slug, price')
            .ilike('name', `%${name.split(' - ')[0]}%`)
            .neq('catalog_number', 'EDD-%'); // Exclude already deleted or other EDD imports if they still exist

        if (found && found.length > 0) {
            const bestMatch = found[0];
            const price = name.includes('Pack') ? 4.99 : 2.99;
            await supabase
                .from('products')
                .update({ is_active: true, price: price })
                .eq('id', bestMatch.id);
            console.log(`✅ Found and restored match for "${name}" by partial name: ${bestMatch.name} (${price}€)`);
        }
    }

    console.log('\n✨ Restoration finished!');
}

restore().catch(err => {
    console.error('💥 Fatal error:', err);
});
