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
}

interface WordPressOrderItem {
    product_id: string;
    product_name: string;
}

interface WordPressOrder {
    order_id: string;
    order_number: string;
    items: WordPressOrderItem[];
}

interface WordPressExport {
    products: WordPressProduct[];
    orders: WordPressOrder[];
}

function normalize(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTrackName(fullName: string): string | null {
    // Try to extract "Track Name" from "Artist - Track Name" or "Artist – Track Name"
    const parts = fullName.split(/\s*[-–]\s*/);
    if (parts.length >= 2) {
        return parts[parts.length - 1].trim(); // Return the last part (track name)
    }
    return null;
}

async function remapSmart() {
    console.log('🧠 Re-mapeo INTELIGENTE (con extracción de título)...\\n');

    const jsonPath = path.join(__dirname, 'wordpress-plugin', 'edd-export-2026-01-28-230807.json');
    const jsonData: WordPressExport = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    console.log('📦 WordPress JSON: ', jsonData.products.length, 'productos');

    const { data: supabaseProducts } = await supabase
        .from('products')
        .select('id, name');

    if (!supabaseProducts) {
        console.error('❌ Error cargando productos');
        return;
    }

    console.log('💾 Supabase:', supabaseProducts.length, 'productos\\n');

    // Multi-level matching maps
    const wpProductMap = new Map<string, string>();
    jsonData.products.forEach(wp => {
        wpProductMap.set(wp.id.toString(), wp.name);
    });

    // Supabase maps: both full name and potential track-only names
    const fullNameMap = new Map<string, string>();
    const trackNameMap = new Map<string, string>();

    supabaseProducts.forEach(sb => {
        const normalizedFull = normalize(sb.name);
        fullNameMap.set(normalizedFull, sb.id);

        // Also index by potential track name if it might be from "Artist - Track"
        const trackOnly = extractTrackName(sb.name);
        if (trackOnly) {
            trackNameMap.set(normalize(trackOnly), sb.id);
        }
    });

    console.log('🗺️  Índices creados:');
    console.log('  - Full names:', fullNameMap.size);
    console.log('  - Track-only names:', trackNameMap.size);
    console.log('');

    let totalItems = 0;
    let matched = 0;
    let matchedByFull = 0;
    let matchedByTrack = 0;
    let updated = 0;

    const matchExamples: Array<{ wp: string, sb: string, method: string }> = [];

    for (const wpOrder of jsonData.orders) {
        const { data: sbOrder } = await supabase
            .from('orders')
            .select('id')
            .eq('order_number', parseInt(wpOrder.order_number))
            .single();

        if (!sbOrder) continue;

        for (const wpItem of wpOrder.items) {
            totalItems++;

            const wpProductName = wpProductMap.get(wpItem.product_id) || wpItem.product_name;
            const normalizedWP = normalize(wpProductName);
            let sbProductId: string | undefined;
            let matchMethod = '';

            // Strategy 1: Try exact full name match
            sbProductId = fullNameMap.get(normalizedWP);
            if (sbProductId) {
                matchMethod = 'full';
                matchedByFull++;
            }

            // Strategy 2: Try extracting track name from "Artist - Track"
            if (!sbProductId) {
                const trackOnly = extractTrackName(wpProductName);
                if (trackOnly) {
                    const normalizedTrack = normalize(trackOnly);
                    sbProductId = fullNameMap.get(normalizedTrack);
                    if (sbProductId) {
                        matchMethod = 'track-exact';
                        matchedByTrack++;
                    }
                }
            }

            if (sbProductId) {
                matched++;

                if (matchExamples.length < 10) {
                    const sbName = supabaseProducts.find(p => p.id === sbProductId)?.name || 'unknown';
                    matchExamples.push({
                        wp: wpProductName,
                        sb: sbName,
                        method: matchMethod
                    });
                }

                const { error } = await supabase
                    .from('order_items')
                    .update({ product_id: sbProductId })
                    .eq('order_id', sbOrder.id)
                    .eq('product_name', wpItem.product_name);

                if (!error) {
                    updated++;
                    if (updated % 100 === 0) {
                        console.log(`📝 Actualizados ${updated}...`);
                    }
                }
            }
        }
    }

    console.log('\\n' + '='.repeat(70));
    console.log('📊 Resumen - Matching INTELIGENTE:');
    console.log('='.repeat(70));
    console.log(`📦 Items procesados: ${totalItems}`);
    console.log(`✅ Matches totales: ${matched} (${((matched / totalItems) * 100).toFixed(1)}%)`);
    console.log(`  - Por nombre completo: ${matchedByFull}`);
    console.log(`  - Por título solo: ${matchedByTrack}`);
    console.log(`💾 Items actualizados: ${updated} `);
    console.log('='.repeat(70));

    if (matchExamples.length > 0) {
        console.log('\\n✅ Ejemplos de matches:');
        matchExamples.forEach(ex => {
            console.log(`  [${ex.method}]WP: ${ex.wp} `);
            console.log(`         SB: ${ex.sb} `);
            console.log('');
        });
    }

    console.log('✅ Completado!');
}

remapSmart();
