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

// Initialize Supabase Client with Service Role Key (to bypass RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Path to exported JSON
const JSON_FILE = 'scripts/wordpress-plugin/edd-export-2026-01-28-230807.json';

async function migrate() {
    console.log('🚀 Starting Trial Migration...');

    if (!fs.existsSync(JSON_FILE)) {
        console.error(`File not found: ${JSON_FILE}`);
        return;
    }

    const rawData = fs.readFileSync(JSON_FILE, 'utf8');
    const data = JSON.parse(rawData);

    console.log(`📦 Loaded ${data.products?.length || 0} products`);
    console.log(`📦 Loaded ${data.customers?.length || 0} customers`);
    console.log(`📦 Loaded ${data.orders?.length || 0} orders`);

    // 1. Migrate first 5 products
    const productsToMigrate = data.products.slice(0, 5);
    const eddIdToSupabaseId: Record<number, string> = {};

    console.log('\n--- Migrating Products ---');
    for (const p of productsToMigrate) {
        const catalog_number = p.sku || `EDD-${p.id}`;

        // Map audio previews from EDD files
        const audio_previews = Object.values(p.files || {}).map((f: any) => ({
            url: f.file,
            track_name: f.name
        }));

        const productData = {
            name: p.name,
            slug: p.slug,
            catalog_number: catalog_number,
            description: p.description,
            price: parseFloat(p.price),
            cover_image: p.cover_image,
            audio_previews: audio_previews,
            is_active: p.status === 'publish',
            genre: p.categories?.[0] || 'Unknown',
            styles: p.tags || [],
            created_at: p.created_at,
            updated_at: p.modified_at
        };

        const { data: insertedProduct, error } = await supabase
            .from('products')
            .upsert(productData, { onConflict: 'slug' })
            .select()
            .single();

        if (error) {
            console.error(`❌ Error migrating product ${p.name}:`, error.message);
        } else {
            console.log(`✅ Migrated product: ${insertedProduct.name} (${insertedProduct.id})`);
            eddIdToSupabaseId[p.id] = insertedProduct.id;
        }
    }

    // 2. Migrate related customers (those who bought these products or just first 5 for trial)
    // Let's migrate customers found in orders associated with these products
    console.log('\n--- Migrating Customers (Trial) ---');
    const customersToMigrate = data.customers.slice(0, 5);
    const customerEmailToId: Record<string, string> = {};

    for (const c of customersToMigrate) {
        // Create user in Auth (if not exists)
        // password will be random since they need to reset it
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: c.email,
            password: Math.random().toString(36).slice(-12),
            email_confirm: true,
            user_metadata: { full_name: c.name }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                // Get existing user
                const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
                const user = existingUsers?.users.find(u => u.email === c.email);
                if (user) {
                    console.log(`ℹ️ Customer ${c.email} already exists (${user.id})`);
                    customerEmailToId[c.email] = user.id;
                }
            } else {
                console.error(`❌ Error creating auth user ${c.email}:`, authError.message);
            }
        } else if (authUser?.user) {
            console.log(`✅ Created customer: ${c.email} (${authUser.user.id})`);
            customerEmailToId[c.email] = authUser.user.id;
        }
    }

    // 3. Migrate orders
    console.log('\n--- Migrating Orders (Trial) ---');
    // Only migrate orders for our migrated customers or just first 5 for trial
    const ordersToMigrate = data.orders.slice(0, 5);

    for (const o of ordersToMigrate) {
        const userId = customerEmailToId[o.customer_email];

        const orderData = {
            user_id: userId || null,
            customer_email: o.customer_email,
            customer_name: o.customer_name,
            total: parseFloat(o.total),
            subtotal: parseFloat(o.subtotal || o.total),
            tax: parseFloat(o.tax || '0'),
            status: o.status === 'publish' || o.status === 'complete' ? 'paid' : 'pending',
            created_at: o.created_at,
            paid_at: o.completed_at || (o.status === 'complete' ? o.created_at : null)
        };

        const { data: insertedOrder, error: orderError } = await supabase
            .from('orders')
            .insert(orderData)
            .select()
            .single();

        if (orderError) {
            console.error(`❌ Error migrating order #${o.order_number}:`, orderError.message);
        } else {
            console.log(`✅ Migrated order #${o.order_number} (${insertedOrder.id})`);

            // Migrate order items
            for (const item of o.items || []) {
                const supId = eddIdToSupabaseId[item.product_id];
                const itemData = {
                    order_id: insertedOrder.id,
                    product_id: supId || null,
                    product_name: item.product_name,
                    price: parseFloat(item.price),
                    quantity: parseInt(item.quantity) || 1
                };

                const { error: itemError } = await supabase.from('order_items').insert(itemData);
                if (itemError) console.error(`   ❌ Error migrating order item:`, itemError.message);
            }
        }
    }

    console.log('\n✨ Trial migration completed!');
}

migrate().catch(err => {
    console.error('💥 Fatal error:', err);
});
