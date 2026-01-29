
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, serviceKey);

const duplicatesToDelete = [
    '74f3a7f1-8eb3-48e0-be24-027a259dd1cf', // mariodz2004.md@gmail.com
    '5cfb8142-2f3b-464a-913e-9cb7c39dac0b', // alabanza-perillas.9r@icloud.com
    '7d6b0d0f-00d1-4ce9-ae07-af0ffe1f6745', // alopezp80@gmail.com
    '95c923f4-0e3e-499c-b723-d7fc2a2632b6', // nachomartinezdj@gmail.com
    '90127777-9f24-4b6c-82f5-d72bb2bd7908'  // jose.djsancho@gmail.com
];

async function deleteDuplicates() {
    console.log(`Deleting ${duplicatesToDelete.length} duplicate orders...`);

    // Borrar items primero por FK
    const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', duplicatesToDelete);

    if (itemsError) {
        console.error('Error deleting order items:', itemsError);
        return;
    }

    // Borrar pedidos
    const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .in('id', duplicatesToDelete);

    if (ordersError) {
        console.error('Error deleting orders:', ordersError);
        return;
    }

    console.log('Successfully deleted all duplicates.');
}

deleteDuplicates();
