import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabase = createClient(
    process.env.PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

interface WordPressProduct {
    id: number;
    name: string;
    sku: string;
    slug: string;
}

interface WordPressOrderItem {
    product_id: string;
    product_name: string;
    quantity: string;
    price: string;
    subtotal: string;
    tax: string;
}

interface WordPressOrder {
    order_id: string;
    order_number: string;
    status: string;
    date: string;
    customer_email: string;
    customer_name: string;
    total: string;
    items: WordPressOrderItem[];
}

interface WordPressExport {
    products: WordPressProduct[];
    orders: WordPressOrder[];
    customers: any[];
}

function aggressiveNormalize(name: string): string {
    return name
        // Replace ALL HTML entities with their equivalents
        .replace(/&amp;/g, '&')
        .replace(/&#038;/g, '&')
        .replace(/&#8211;/g, '-')
        .replace(/&#8212;/g, '-')
        .replace(/&ndash;/g, '-')
        .replace(/&mdash;/g, '-')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#8217;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        // Replace all types of dashes with standard dash
        .replace(/–/g, '-')
        .replace(/—/g, '-')
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '-')
        .replace(/\u2010/g, '-')
        .replace(/\u2011/g, '-')
        .replace(/\u2012/g, '-')
        // Replace all types of quotes with standard quotes
        .replace(/['']/g, "'")
        .replace(/[""]/g, '"')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        // Remove special characters that might differ
        .trim()
        .toLowerCase();
}

async function remapProductsAggressive() {
    console.log('🔄 Re-mapeando con normalización AGRESIVA...\\n');

    // 1. Load WordPress JSON
    const jsonPath = path.join(__dirname, 'wordpress-plugin', 'edd-export-2026-01-28-230807.json');
    const jsonData: WordPressExport = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    console.log('📦 JSON de WordPress:');
    console.log('  - Productos:', jsonData.products.length);
    console.log('  - Pedidos:', jsonData.orders.length);
    console.log('');

    // 2. Load all Supabase products
    const { data: supabaseProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, catalog_number');

    if (productsError) {
        console.error('❌ Error:', productsError);
        return;
    }

    console.log('💾 Productos en Supabase:', supabaseProducts.length);
    console.log('');

    // 3. Create AGGRESSIVE normalization maps
    // WP Product ID → normalized name
    const wpProductMap = new Map<string, string>();
    jsonData.products.forEach(wpProduct => {
        wpProductMap.set(wpProduct.id.toString(), aggressiveNormalize(wpProduct.name));
    });

    // Normalized name → Supabase product ID
    const nameToSupabaseId = new Map<string, string>();
    const supabaseNameExamples = new Map<string, string>(); // For debugging
    supabaseProducts.forEach(product => {
        const normalized = aggressiveNormalize(product.name);
        nameToSupabaseId.set(normalized, product.id);
        supabaseNameExamples.set(normalized, product.name);
    });

    console.log('🗺️  Mapas creados con normalización agresiva');
    console.log('  - WP Products:', wpProductMap.size);
    console.log('  - Supabase Names:', nameToSupabaseId.size);
    console.log('');

    // Test a few examples
    console.log('🧪 Prueba de normalización:');
    const testWP = 'Victor Conca &#8211; Go Time';
    const testSB = 'Victor Conca – Go Time';
    console.log(`  WP: "${testWP}" → "${aggressiveNormalize(testWP)}"`);
    console.log(`  SB: "${testSB}" → "${aggressiveNormalize(testSB)}"`);
    console.log(`  Match: ${aggressiveNormalize(testWP) === aggressiveNormalize(testSB) ? '✅' : '❌'}`);
    console.log('');

    // 4. Process orders and update order_items
    let totalItems = 0;
    let itemsMatched = 0;
    let itemsNotMatched = 0;
    let itemsUpdated = 0;
    let updateErrors = 0;
    let skippedOrders = 0;

    const unmatchedProducts = new Set<string>();
    const matchedExamples: Array<{ wp: string, sb: string, normalized: string }> = [];

    for (const wpOrder of jsonData.orders) {
        const { data: supabaseOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('order_number', parseInt(wpOrder.order_number))
            .single();

        if (!supabaseOrder) {
            skippedOrders++;
            continue;
        }

        for (const wpItem of wpOrder.items) {
            totalItems++;

            // Get normalized names from WP product
            const wpProductName = wpProductMap.get(wpItem.product_id);
            let supabaseProductId: string | undefined;
            let matchedNormalizedName = '';

            // Try matching via WP product map first
            if (wpProductName) {
                supabaseProductId = nameToSupabaseId.get(wpProductName);
                matchedNormalizedName = wpProductName;
            }

            // Fallback: try normalizing the item name directly
            if (!supabaseProductId) {
                const normalizedItemName = aggressiveNormalize(wpItem.product_name);
                supabaseProductId = nameToSupabaseId.get(normalizedItemName);
                matchedNormalizedName = normalizedItemName;
            }

            if (supabaseProductId) {
                itemsMatched++;

                // Save examples
                if (matchedExamples.length < 5) {
                    matchedExamples.push({
                        wp: wpItem.product_name,
                        sb: supabaseNameExamples.get(matchedNormalizedName) || 'unknown',
                        normalized: matchedNormalizedName
                    });
                }

                // Update order_item
                const { error: updateError } = await supabase
                    .from('order_items')
                    .update({ product_id: supabaseProductId })
                    .eq('order_id', supabaseOrder.id)
                    .eq('product_name', wpItem.product_name);

                if (updateError) {
                    updateErrors++;
                } else {
                    itemsUpdated++;
                    if (itemsUpdated % 100 === 0) {
                        console.log(`📝 Actualizados ${itemsUpdated} items...`);
                    }
                }
            } else {
                itemsNotMatched++;
                unmatchedProducts.add(wpItem.product_name);
            }
        }
    }

    console.log('\\n' + '='.repeat(70));
    console.log('📊 Resumen - Normalización AGRESIVA:');
    console.log('='.repeat(70));
    console.log(`📦 Total items procesados: ${totalItems}`);
    console.log(`✅ Items matched: ${itemsMatched} (${((itemsMatched / totalItems) * 100).toFixed(1)}%)`);
    console.log(`❌ Items no matched: ${itemsNotMatched} (${((itemsNotMatched / totalItems) * 100).toFixed(1)}%)`);
    console.log(`💾 Items actualizados: ${itemsUpdated}`);
    console.log(`⚠️  Errores: ${updateErrors}`);
    console.log(`⏭️  Pedidos no encontrados: ${skippedOrders}`);
    console.log('='.repeat(70));

    if (matchedExamples.length > 0) {
        console.log('\\n✅ Ejemplos de matches exitosos:');
        matchedExamples.forEach(ex => {
            console.log(`  WP: ${ex.wp}`);
            console.log(`  SB: ${ex.sb}`);
            console.log(`  →  ${ex.normalized}`);
            console.log('');
        });
    }

    if (unmatchedProducts.size > 0) {
        console.log('⚠️  Productos sin match (primeros 15):');
        Array.from(unmatchedProducts).slice(0, 15).forEach(name => {
            console.log(`  - ${name} → ${aggressiveNormalize(name)}`);
        });
        if (unmatchedProducts.size > 15) {
            console.log(`  ... y ${unmatchedProducts.size - 15} más`);
        }
    }

    console.log('\\n✅ Completado!');
    console.log('💡 Ahora ejecuta: npx tsx scripts/create-missing-tokens.ts');
}

remapProductsAggressive();
