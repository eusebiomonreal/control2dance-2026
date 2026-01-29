import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function fixExpiration() {
    console.log('📅 Ajustando fecha de expiración de tokens (Compra + 30 días)...');

    // 1. Get tokens with their order creation date
    const { data: tokens, error } = await supabase
        .from('download_tokens')
        .select('id, expires_at, order_item:order_items(order:orders(created_at))');

    if (error) {
        console.error('Error fetching tokens:', error);
        return;
    }

    console.log(`🔍 Encontrados ${tokens.length} tokens.`);

    let updated = 0;

    for (const token of tokens) {
        const orderDate = (token.order_item as any)?.order?.created_at;

        if (orderDate) {
            // Calculate correct expiration: Order Date + 30 days
            const purchaseDate = new Date(orderDate);
            const correctExpiresAt = new Date(purchaseDate);
            correctExpiresAt.setDate(purchaseDate.getDate() + 30);

            // Update only if different (ignoring milliseconds diffs)
            const currentExpires = new Date(token.expires_at);

            if (Math.abs(currentExpires.getTime() - correctExpiresAt.getTime()) > 60000) { // > 1 min diff
                const { error: updateError } = await supabase
                    .from('download_tokens')
                    .update({ expires_at: correctExpiresAt.toISOString() })
                    .eq('id', token.id);

                if (!updateError) {
                    updated++;
                    if (updated % 50 === 0) process.stdout.write('.');
                }
            }
        }
    }

    console.log(`\n✅ Fechas corregidas: ${updated} tokens actualizados.`);
}

fixExpiration();
