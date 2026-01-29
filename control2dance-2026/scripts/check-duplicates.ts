
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

async function findDuplicates() {
    console.log('Searching for duplicate orders...');

    const { data: orders, error } = await supabase
        .from('orders')
        .select('id, customer_email, total, created_at, status');

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    const map = new Map();
    const duplicates: any[] = [];

    orders.forEach(o => {
        // Key: email + total + timestamp
        const key = `${o.customer_email}|${o.total}|${o.created_at}`;
        if (map.has(key)) {
            duplicates.push({
                email: o.customer_email,
                total: o.total,
                created_at: o.created_at,
                ids: [map.get(key).id, o.id]
            });
        } else {
            map.set(key, o);
        }
    });

    if (duplicates.length === 0) {
        console.log('No duplicates found based on email, total, and exact timestamp.');
    } else {
        console.log(`Found ${duplicates.length} potential duplicates:`);
        duplicates.forEach(d => {
            console.log(`- ${d.email}: ${d.total}€ at ${d.created_at}`);
            console.log(`  IDs: ${d.ids.join(', ')}`);
        });
    }
}

findDuplicates();
