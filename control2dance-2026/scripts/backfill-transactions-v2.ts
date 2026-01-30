
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const JSON_FILE = 'scripts/wordpress-plugin/edd-export-v11-2026-01-30-151230.json';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function backfill() {
    console.log('🚀 Iniciando Backfill de Transacciones V2...');

    if (!fs.existsSync(JSON_FILE)) {
        console.error(`❌ Archivo no encontrado: ${JSON_FILE}`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log(`📦 Procesando ${data.orders.length} pedidos...`);

    let successCount = 0;
    let skippedCount = 0;

    for (const o of data.orders) {
        if (!o.order_number) {
            skippedCount++;
            continue;
        }

        const updateData: any = {};

        // 1. Normalizar método de pago
        if (o.payment_method) {
            updateData.payment_method = o.payment_method.toLowerCase().includes('paypal') ? 'paypal' : o.payment_method;
        }

        // 2. Mapear Transaction ID
        if (o.transaction_id) {
            const txId = o.transaction_id;
            if (txId.startsWith('cs_')) {
                updateData.stripe_session_id = txId;
            } else {
                // Para pi_, ch_, o IDs de PayPal, lo guardamos en stripe_payment_intent
                // ya que es el campo que usa nuestra UI para los links directos.
                updateData.stripe_payment_intent = txId;
            }
        }

        if (Object.keys(updateData).length === 0) {
            skippedCount++;
            continue;
        }

        const { error } = await supabase
            .from('orders')
            .update(updateData)
            .eq('order_number', o.order_number.toString());

        if (error) {
            console.error(`   ❌ Error en #${o.order_number}:`, error.message);
        } else {
            successCount++;
        }

        if ((successCount + skippedCount) % 100 === 0) console.log(`   Progreso: ${successCount + skippedCount}...`);
    }

    console.log(`\n✨ Finalizado. Actualizados: ${successCount}, Saltados: ${skippedCount}`);
    console.log('NOTA: Si Actualizados es 0, es que el JSON no tiene transaction_id o ya estaban actualizados.');
}

backfill();
