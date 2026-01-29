
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'orders' });

    if (error) {
        // Fallback: if RPC doesn't exist, try a simple select to see what comes back
        const { data: selectData, error: selectError } = await supabase.from('orders').select('*').limit(1);
        if (selectError) {
            console.error('Error fetching orders:', selectError.message);
        } else {
            console.log('Columns found in orders table:', Object.keys(selectData[0] || {}));
        }
    } else {
        console.log('Columns:', data);
    }
}

checkSchema();
