
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const JSON_FILE = 'scripts/wordpress-plugin/edd-export-2026-01-28-230807.json';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function backfill() {
    console.log('🚀 Starting robust backfill for order numbers...');

    if (!fs.existsSync(JSON_FILE)) {
        console.error(`File not found: ${JSON_FILE}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`📦 Loaded ${data.orders.length} orders from WordPress JSON.`);

    const { data: dbOrders, error: fetchError } = await supabase
        .from('orders')
        .select('id, customer_email, created_at, order_number, total');

    if (fetchError) {
        console.error('❌ Error fetching orders from DB:', fetchError.message);
        return;
    }

    console.log(`📋 Found ${dbOrders.length} orders in Supabase.`);

    let successCount = 0;
    let skipCount = 0;
    let matchErrorCount = 0;

    for (const dbOrder of dbOrders) {
        if (dbOrder.order_number) {
            skipCount++;
            continue;
        }

        // Robust matching:
        // Try exact email + date first
        // If not found, try email + date with 1h/2h offset (timezone issues)
        const dbTime = new Date(dbOrder.created_at).getTime();

        const match = data.orders.find((o: any) => {
            const emailMatch = o.customer_email.toLowerCase() === dbOrder.customer_email.toLowerCase();
            const jsonTime = new Date(o.created_at).getTime();
            const timeDiff = Math.abs(jsonTime - dbTime);

            // Match within 5 seconds OR exactly 1h (3600000ms) or 2h (7200000ms) difference
            const isTimeMatch = timeDiff < 10000 ||
                Math.abs(timeDiff - 3600000) < 10000 ||
                Math.abs(timeDiff - 7200000) < 10000;

            return emailMatch && isTimeMatch;
        });

        if (match) {
            const { error: updateError } = await supabase
                .from('orders')
                .update({ order_number: match.order_number.toString() })
                .eq('id', dbOrder.id);

            if (updateError) {
                console.error(`   ❌ Failed to update ${dbOrder.id}:`, updateError.message);
            } else {
                successCount++;
            }
        } else {
            matchErrorCount++;
        }
    }

    console.log(`\n✨ Backfill finished!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ No match: ${matchErrorCount}`);

    if (matchErrorCount > 0) {
        const sample = dbOrders.filter(o => !o.order_number).slice(0, 3);
        console.log('\n--- Debug Samples of Unmatched Orders ---');
        sample.forEach(o => {
            console.log(`Supabase: ${o.customer_email} - ${o.created_at} (${o.total}€)`);
            const potential = data.orders.filter((jo: any) => jo.customer_email.toLowerCase() === o.customer_email.toLowerCase());
            if (potential.length > 0) {
                console.log('   Potential JOSN matches:');
                potential.forEach((jo: any) => console.log(`   - JSON: ${jo.created_at} (${jo.total}€)`));
            } else {
                console.log('   No matching email in JSON.');
            }
        });
    }
}

backfill();
