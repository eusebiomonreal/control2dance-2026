
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const JSON_FILE = 'scripts/wordpress-plugin/edd-export-2026-01-28-230807.json';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function debugMatch() {
    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const { data: dbOrders } = await supabase.from('orders').select('customer_email, created_at').limit(5);

    console.log('--- Supabase Sample ---');
    dbOrders?.forEach(o => console.log(`${o.customer_email} - ${o.created_at}`));

    console.log('\n--- JSON Sample (First 5) ---');
    data.orders.slice(0, 5).forEach((o: any) => console.log(`${o.customer_email} - ${o.created_at}`));
}

debugMatch();
