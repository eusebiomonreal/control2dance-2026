
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const JSON_FILE = 'scripts/wordpress-plugin/edd-export-2026-01-29-211753.json';

async function backfill() {
    console.log('🚀 Starting Payment Method Backfill...');

    if (!fs.existsSync(JSON_FILE)) {
        console.error(`File not found: ${JSON_FILE}`);
        return;
    }

    const rawData = fs.readFileSync(JSON_FILE, 'utf8');
    const data = JSON.parse(rawData);

    if (!data.orders || !Array.isArray(data.orders)) {
        console.error('Invalid JSON: orders array not found');
        return;
    }

    console.log(`📦 Loaded ${data.orders.length} orders from JSON`);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const o of data.orders) {
        if (!o.order_number || !o.payment_method) {
            skippedCount++;
            continue;
        }

        const cleanMethod = o.payment_method.toLowerCase().includes('paypal') ? 'paypal' : o.payment_method;

        const { error } = await supabase
            .from('orders')
            .update({ payment_method: cleanMethod })
            .eq('order_number', o.order_number.toString());

        if (error) {
            console.error(`❌ Error updating order #${o.order_number}:`, error.message);
            errorCount++;
        } else {
            successCount++;
        }

        if ((successCount + errorCount + skippedCount) % 50 === 0) {
            console.log(`   Processed ${successCount + errorCount + skippedCount}...`);
        }
    }

    console.log('\n✨ Backfill completed!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
}

backfill().catch(err => {
    console.error('💥 Fatal error:', err);
});
