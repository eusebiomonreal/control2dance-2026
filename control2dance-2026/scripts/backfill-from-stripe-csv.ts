import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const CSV_FILE = 'scripts/wordpress-plugin/unified_payments.csv';
// El mapeo se generará con el plugin v15. Si aún no existe, el script avisará o usará email+amount.
const MAPPING_FILE = fs.readdirSync('scripts/wordpress-plugin')
    .filter(f => f.startsWith('edd-id-mapping-v15-') && f.endsWith('.json'))
    .sort()
    .reverse()[0];

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
    console.log('🚀 Iniciando cruce Stripe CSV -> Supabase...');

    if (!fs.existsSync(CSV_FILE)) {
        console.error('❌ No se encuentra el archivo CSV:', CSV_FILE);
        return;
    }

    let idMapping: Record<string, string> = {};
    if (MAPPING_FILE) {
        console.log(`🔗 Cargando mapeo desde: ${MAPPING_FILE}`);
        const mappingContent = JSON.parse(fs.readFileSync(path.join('scripts/wordpress-plugin', MAPPING_FILE), 'utf-8'));
        idMapping = mappingContent.mapping || {};
    } else {
        console.log('⚠️ No se ha encontrado archivo de mapeo v15. Se usará Email + Amount como fallback.');
    }

    const content = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');

    const idxId = headers.indexOf('id');
    const idxEmail = headers.indexOf('Customer Email');
    const idxAmount = headers.indexOf('Amount');
    const idxCustomerId = headers.indexOf('Customer ID');
    const idxDescription = headers.indexOf('Description');

    console.log(`📊 Procesando ${lines.length - 1} filas del CSV...`);

    // Obtener todos los pedidos actuales para cruzar en memoria
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, customer_email, total');

    if (ordersError || !orders) {
        console.error('❌ Error cargando pedidos de Supabase:', ordersError);
        return;
    }

    let updatedCount = 0;
    let skipCount = 0;
    let matchFail = 0;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Split respetando comillas
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

        const stripeId = parts[idxId]?.replace(/"/g, '');
        const email = parts[idxEmail]?.replace(/"/g, '').toLowerCase().trim();
        const amountStr = parts[idxAmount]?.replace(/"/g, '').replace(',', '.').trim();
        const amount = parseFloat(amountStr);
        const customerId = parts[idxCustomerId]?.replace(/"/g, '');
        const description = parts[idxDescription]?.replace(/"/g, '') || '';

        if (!stripeId || stripeId === 'id') continue;

        let targetOrder: any = null;

        // ESTRATEGIA 1: Por ID de Pedido en la descripción (100% fiable)
        const orderIdMatch = description.match(/Order ID: (\d+)/);
        if (orderIdMatch && idMapping[orderIdMatch[1]]) {
            const orderNum = idMapping[orderIdMatch[1]];
            targetOrder = orders.find(o => o.order_number === orderNum);
        }

        // ESTRATEGIA 2: Fallback por Email + Amount (Muy fiable)
        if (!targetOrder && email && !isNaN(amount)) {
            const matches = orders.filter(o =>
                o.customer_email?.toLowerCase().trim() === email &&
                Math.abs(o.total - amount) < 0.01
            );
            if (matches.length === 1) {
                targetOrder = matches[0];
            }
        }

        if (targetOrder) {
            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    stripe_payment_intent: stripeId,
                    stripe_customer_id: customerId
                })
                .eq('id', targetOrder.id);

            if (!updateError) {
                updatedCount++;
                if (updatedCount % 20 === 0) console.log(`   Progreso: ${updatedCount} actualizados...`);
            } else {
                console.error(`❌ Error actualizando pedido ${targetOrder.order_number}:`, updateError);
            }
        } else {
            matchFail++;
        }
    }

    console.log(`\n✨ ¡Proceso finalizado!`);
    console.log(`✅ Pedidos vinculados con Stripe: ${updatedCount}`);
    console.log(`❓ Filas sin coincidencia clara: ${matchFail}`);
}

run();
