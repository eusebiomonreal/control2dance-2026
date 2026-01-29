import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function syncTokenUsers() {
    console.log('🔄 Sincronizando user_id de tokens con sus pedidos...');

    // 1. Get tokens with inconsistent user_id
    // We'll just iterate all tokens to be safe, or fetch those where user_id is null
    const { data: tokens, error } = await supabase
        .from('download_tokens')
        .select('id, user_id, order_item:order_items(order:orders(id, user_id))')
        .is('user_id', null);

    if (error) {
        console.error('Error fetching tokens:', error);
        return;
    }

    console.log(`🔍 Encontrados ${tokens.length} tokens sin usuario asignado.`);

    let updated = 0;

    for (const token of tokens) {
        // TypeScript safe navigation
        const orderUserId = (token.order_item as any)?.order?.user_id;

        if (orderUserId) {
            const { error: updateError } = await supabase
                .from('download_tokens')
                .update({ user_id: orderUserId })
                .eq('id', token.id);

            if (!updateError) {
                updated++;
                if (updated % 50 === 0) process.stdout.write('.');
            }
        }
    }

    console.log(`\n✅ Sincronización completada. ${updated} tokens corregidos.`);
}

syncTokenUsers();
