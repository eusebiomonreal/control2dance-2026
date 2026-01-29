import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { decode } from 'html-entities';

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

function normalizeProductName(name: string): string {
    // Decode all HTML entities first
    let normalized = decode(name);

    // Normalize dashes
    normalized = normalized
        .replace(/–/g, '-')
        .replace(/—/g, '-')
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '-');

    // Normalize whitespace and case
    normalized = normalized
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .trim();

    return normalized;
}

async function remapProductsImproved() {
    console.log('🔄 Re-mapeando productos con matching mejorado...\\n');

    // 1. Load WordPress JSON
    const jsonPath = path.join(__dirname, 'wordpress-plugin', 'edd-export-2026-01-28-230807.json');
    const jsonData: WordPressExport = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    console.log('📦 Cargado JSON de WordPress:');
    console.log('  - Productos:', jsonData.products.length);
    console.log('  - Pedidos:', jsonData.orders.length);
    console.log('');

    // 2. Load all Supabase products
    const { data: supabaseProducts, error: productsError } = await supabase
        .from('products')
        .select('id, name, catalog_number');

    if (productsError) {
        console.error('❌ Error cargando productos de Supabase:', productsError);
        return;
    }

    console.log('💾 Productos en Supabase:', supabaseProducts.length);
    console.log('');

    // 3. Create multiple mapping strategies
    // Strategy 1: By WordPress product ID → product name → Supabase
    const wpProductMap = new Map<string, string>();
    jsonData.products.forEach(wpProduct => {
        wpProductMap.set(wpProduct.id.toString(), normalizeProductName(wpProduct.name));
    });

    // Strategy 2: By normalized name → Supabase ID
    const nameToSupabaseId = new Map<string, string>();
    supabaseProducts.forEach(product => {
        const normalizedName = normalizeProductName(product.name);
        nameToSupabaseId.set(normalizedName, product.id);
    });

    console.log('🗺️  Mapas creados:');
    console.log('  - WP Products:', wpProductMap.size);
    console.log('  - Supabase Names:', nameToSupabaseId.size);
    console.log('');

    // 4. Process orders and update order_items
    let totalItems = 0;
    let itemsMatched = 0;
    let itemsNotMatched = 0;
    let itemsUpdated = 0;
    let updateErrors = 0;

    const unmatchedProducts = new Set<string>();
    const matchedExamples: Array<{ wp: string, sb: string }> = [];

    for (const wpOrder of jsonData.orders) {
        // Find order in Supabase by order_number
        const { data: supabaseOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('order_number', parseInt(wpOrder.order_number))
            .single();

        if (!supabaseOrder) {
            continue; // Skip orders not found in Supabase
        }

        // Process each item in the order
        for (const wpItem of wpOrder.items) {
            totalItems++;

            // Try to match using WordPress product ID first
            const wpProductName = wpProductMap.get(wpItem.product_id);
            let supabaseProductId: string | undefined;

            if (wpProductName) {
                supabaseProductId = nameToSupabaseId.get(wpProductName);
            }

            // Fallback: try normalizing the item name directly
            if (!supabaseProductId) {
                const normalizedItemName = normalizeProductName(wpItem.product_name);
                supabaseProductId = nameToSupabaseId.get(normalizedItemName);
            }

            if (supabaseProductId) {
                itemsMatched++;

                // Save example matches for debugging
                if (matchedExamples.length < 5) {
                    matchedExamples.push({
                        wp: wpItem.product_name,
                        sb: supabaseProducts.find(p => p.id === supabaseProductId)?.name || 'unknown'
                    });
                }

                // Update order_item with the correct product_id
                const { error: updateError } = await supabase
                    .from('order_items')
                    .update({ product_id: supabaseProductId })
                    .eq('order_id', supabaseOrder.id)
                    .eq('product_name', wpItem.product_name);

                if (updateError) {
                    console.error(`❌ Error actualizando "${wpItem.product_name}":`, updateError);
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
    console.log('📊 Resumen del Re-mapeo Mejorado:');
    console.log('='.repeat(70));
    console.log(`📦 Total de items procesados: ${totalItems}`);
    console.log(`✅ Items encontrados (match): ${itemsMatched} (${((itemsMatched / totalItems) * 100).toFixed(1)}%)`);
    console.log(`❌ Items no encontrados: ${itemsNotMatched} (${((itemsNotMatched / totalItems) * 100).toFixed(1)}%)`);
    console.log(`💾 Items actualizados en DB: ${itemsUpdated}`);
    console.log(`⚠️  Errores de actualización: ${updateErrors}`);
    console.log('='.repeat(70));

    if (matchedExamples.length > 0) {
        console.log('\\n✅ Ejemplos de matches exitosos:');
        matchedExamples.forEach(ex => {
            console.log(`  WP: ${ex.wp}`);
            console.log(`  SB: ${ex.sb}`);
            console.log('');
        });
    }

    if (unmatchedProducts.size > 0) {
        console.log('\\n⚠️  Productos sin match (primeros 20):');
        Array.from(unmatchedProducts).slice(0, 20).forEach(name => {
            console.log(`  - ${name}`);
        });
        if (unmatchedProducts.size > 20) {
            console.log(`  ... y ${unmatchedProducts.size - 20} más`);
        }
    }

    console.log('\\n✅ Re-mapeo completado!');
    console.log('💡 Ahora ejecuta: npx tsx scripts/create-missing-tokens.ts');
}

remapProductsImproved();
