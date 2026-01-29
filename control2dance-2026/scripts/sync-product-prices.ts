import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

// Initialize Supabase Client with Service Role Key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const JSON_FILE = 'scripts/wordpress-plugin/edd-export-2026-01-28-230807.json';

async function syncPrices() {
    console.log('🚀 Starting Price Synchronization from WordPress...');

    if (!fs.existsSync(JSON_FILE)) {
        console.error(`❌ File not found: ${JSON_FILE}`);
        return;
    }

    const rawData = fs.readFileSync(JSON_FILE, 'utf8');
    const data = JSON.parse(rawData);
    const wordpressProducts = data.products;

    console.log(`📦 Loaded ${wordpressProducts.length} products from WordPress export.`);

    // 1. Fetch all products from Supabase
    console.log('\n--- Fetching current products from Supabase ---');
    const { data: dbProducts, error: dbError } = await supabase
        .from('products')
        .select('id, slug, price, name');

    if (dbError) {
        console.error('❌ Error fetching products:', dbError.message);
        return;
    }

    console.log(`✅ Current products in DB: ${dbProducts.length}`);

    // Create a map for quick lookup
    const dbProductMap = new Map();
    dbProducts.forEach(p => {
        dbProductMap.set(p.slug, p);
    });

    // 2. Compare and Update
    console.log('\n--- Comparing and Updating Prices ---');
    let updatedCount = 0;
    let ignoredCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (const wpProduct of wordpressProducts) {
        const dbProduct = dbProductMap.get(wpProduct.slug);

        if (!dbProduct) {
            // Try to match by name if slug fails (some slugs might have changed during import)
            const matchedByName = dbProducts.find(p => p.name === wpProduct.name);
            if (matchedByName) {
                // If found by name, proceed
                await updatePrice(matchedByName, wpProduct);
            } else {
                notFoundCount++;
                // console.log(`   ⚠️ Not found in DB: ${wpProduct.name} (${wpProduct.slug})`);
                continue;
            }
        } else {
            await updatePrice(dbProduct, wpProduct);
        }
    }

    async function updatePrice(dbProd: any, wpProd: any) {
        const wpPrice = parseFloat(wpProd.price);
        const dbPrice = parseFloat(dbProd.price);

        if (wpPrice !== dbPrice) {
            const { error: updateError } = await supabase
                .from('products')
                .update({ price: wpPrice })
                .eq('id', dbProd.id);

            if (updateError) {
                console.error(`   ❌ Error updating ${dbProd.name}:`, updateError.message);
                errorCount++;
            } else {
                console.log(`   ✅ Updated ${dbProd.name}: ${dbPrice}€ ➔ ${wpPrice}€`);
                updatedCount++;
            }
        } else {
            ignoredCount++;
        }
    }

    console.log('\n--- Final Summary ---');
    console.log(`✅ Updated:    ${updatedCount} products`);
    console.log(`⏩ Unchanged:  ${ignoredCount} products`);
    console.log(`❓ Not Found:  ${notFoundCount} products (slags mismatch)`);
    console.log(`❌ Errors:     ${errorCount}`);
    console.log('\n✨ Price sync finished!');
}

syncPrices().catch(err => {
    console.error('💥 Fatal error:', err);
});
