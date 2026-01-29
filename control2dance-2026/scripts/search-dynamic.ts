import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

async function searchDynamic() {
    const terms = ['Dynamic', 'Hooters', 'Goats'];

    console.log('🔍 Buscando Dynamic Beats...\n');

    for (const term of terms) {
        const { data } = await supabase
            .from('products')
            .select('id, name')
            .ilike('name', `%${term}%`);

        if (data && data.length > 0) {
            console.log(`✅ Coincidencias para "${term}":`);
            data.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
        } else {
            console.log(`❌ Sin coincidencias para "${term}"`);
        }
        console.log('');
    }
}

searchDynamic();
