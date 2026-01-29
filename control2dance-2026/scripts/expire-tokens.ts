import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function expireTokens() {
    console.log('🔒 Marcando tokens migrados como AGOTADOS...');

    // 1. Get all tokens created today (since we just created them)
    // And that belong to older orders (e.g. created before 2026-01-01)
    // Actually, simpler: update ALL tokens created today by our script
    // for orders with status 'paid'.

    // Let's filter by created_at > today's date start (approx)
    const today = new Date().toISOString().split('T')[0];

    const { data: tokens, error } = await supabase
        .from('download_tokens')
        .select('id, max_downloads, download_count')
        .gte('created_at', today)
        .lt('download_count', 3); // Only those not already maxed out

    if (error) {
        console.error('Error fetching tokens:', error);
        return;
    }

    console.log(`🔍 Encontrados ${tokens.length} tokens para agotar.`);

    let updated = 0;

    // Update in batches
    for (const token of tokens) {
        const { error: updateError } = await supabase
            .from('download_tokens')
            .update({ download_count: token.max_downloads }) // Set count = max
            .eq('id', token.id);

        if (!updateError) {
            updated++;
            if (updated % 100 === 0) process.stdout.write('.');
        }
    }

    console.log(`\n✅ Completado. ${updated} tokens marcados como agotados (3/3).`);
    console.log('💡 Los usuarios verán "Límite alcanzado" pero el admin puede resetearlos.');
}

expireTokens();
