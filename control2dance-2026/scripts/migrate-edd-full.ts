import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

// Initialize Supabase Client with Service Role Key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const JSON_FILE = 'scripts/wordpress-plugin/edd-export-2026-01-28-230807.json';

async function migrate() {
    console.log('🚀 Starting Full Migration (Linking existing products)...');

    if (!fs.existsSync(JSON_FILE)) {
        console.error(`File not found: ${JSON_FILE}`);
        return;
    }

    const rawData = fs.readFileSync(JSON_FILE, 'utf8');
    const data = JSON.parse(rawData);

    console.log(`📦 JSON Data: ${data.products.length} products, ${data.customers.length} customers, ${data.orders.length} orders`);

    // 1. Fetch all existing products from Supabase to map slug -> UUID
    console.log('\n--- Mapping Existing Products ---');
    const { data: dbProducts, error: dbProdError } = await supabase.from('products').select('id, slug');
    if (dbProdError) {
        console.error('❌ Error fetching products:', dbProdError.message);
        return;
    }

    const slugToId: Record<string, string> = {};
    dbProducts?.forEach(p => { slugToId[p.slug] = p.id; });
    console.log(`✅ Mapped ${Object.keys(slugToId).length} existing products.`);

    // 2. Migrate ALL Customers
    console.log('\n--- Migrating Customers ---');
    const customerEmailToId: Record<string, string> = {};
    let customersCreated = 0;
    let customersExisting = 0;

    for (const c of data.customers) {
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: c.email,
            password: Math.random().toString(36).slice(-12),
            email_confirm: true,
            user_metadata: { full_name: c.name }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                // Find existing user ID (unfortunately we need to fetch or list)
                // Optimization: in a real big migration we would fetch all users, 
                // but let's just use getUser per existing if needed or assume we'll match by email in order migration
                customersExisting++;
            } else {
                console.error(`   ❌ Error creating ${c.email}:`, authError.message);
            }
        } else if (authUser?.user) {
            customerEmailToId[c.email] = authUser.user.id;
            customersCreated++;
        }
    }
    console.log(`✅ Customers: ${customersCreated} created, ${customersExisting} already existed.`);

    // 3. Migrate ALL Orders
    console.log('\n--- Migrating Orders ---');
    let ordersSuccess = 0;
    let ordersErrorCount = 0;

    for (const o of data.orders) {
        // If we don't have the user ID in memory, try to find it via email
        let userId = customerEmailToId[o.customer_email];

        if (!userId) {
            const { data: userList } = await supabase.auth.admin.listUsers();
            const user = userList?.users.find(u => u.email === o.customer_email);
            if (user) {
                userId = user.id;
                customerEmailToId[o.customer_email] = userId;
            }
        }

        const orderData = {
            user_id: userId || null,
            customer_email: o.customer_email,
            customer_name: o.customer_name,
            total: parseFloat(o.total || '0'),
            subtotal: parseFloat(o.subtotal || o.total || '0'),
            tax: parseFloat(o.tax || '0'),
            status: o.status === 'publish' || o.status === 'complete' || o.status === 'edd_subscription' ? 'paid' : 'pending',
            created_at: o.created_at,
            paid_at: o.completed_at || (o.status === 'complete' ? o.created_at : null),
            order_number: o.order_number.toString()
        };

        const { data: insertedOrder, error: orderError } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();

        if (orderError) {
            console.error(`   ❌ Order #${o.order_number} (${o.customer_email}):`, orderError.message);
            ordersErrorCount++;
        } else {
            ordersSuccess++;

            // Migrate order items
            for (const item of o.items || []) {
                // Find product ID by slug (not ID, as IDs changed)
                // EDD export should have slug in item or we match by search
                const productSlug = item.product_slug; // Assuming we have this, let's check
                let supabaseProductId = slugToId[productSlug];

                // Fallback: if slug not directly in item, try to find product in JSON to get slug
                if (!supabaseProductId) {
                    const productRef = data.products.find((p: any) => p.id === item.product_id);
                    if (productRef) supabaseProductId = slugToId[productRef.slug];
                }

                const itemData = {
                    order_id: insertedOrder.id,
                    product_id: supabaseProductId || null,
                    product_name: item.product_name,
                    price: parseFloat(item.price || '0'),
                    quantity: parseInt(item.quantity) || 1
                };

                const { error: itemError } = await supabase.from('order_items').insert(itemData);
                if (itemError) console.error(`      ❌ Item error (${item.product_name}):`, itemError.message);
            }
        }

        if (ordersSuccess % 50 === 0) console.log(`   Processed ${ordersSuccess} orders...`);
    }

    console.log(`\n✨ Migration finished! Success: ${ordersSuccess}, Errors: ${ordersErrorCount}`);
}

migrate().catch(err => {
    console.error('💥 Fatal error:', err);
});
