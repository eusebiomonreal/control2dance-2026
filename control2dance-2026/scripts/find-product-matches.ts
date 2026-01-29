import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function searchMatches() {
    console.log('🔍 Buscando coincidencias para items del pedido 397...\n');

    const terms = ['Trouble', 'Scratch', 'More', 'R.D.B', 'RDB'];

    for (const term of terms) {
        const { data } = await supabase
            .from('products')
            .select('id, name')
            .ilike('name', `%${term}%`);

        if (data && data.length > 0) {
            console.log(`✅ Coincidencias para "${term}":`);
            data.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
            console.log('');
        } else {
            console.log(`❌ Sin coincidencias para "${term}"`);
        }
    }
}

searchMatches();
