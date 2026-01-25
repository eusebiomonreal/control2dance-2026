/**
 * Script para sincronizar un pago de Stripe que no se registró en Supabase
 * 
 * Uso: node scripts/sync_stripe_payment.cjs <checkout_session_id o payment_intent_id>
 * Ejemplo: node scripts/sync_stripe_payment.cjs cs_live_xxxx
 *          node scripts/sync_stripe_payment.cjs pi_xxxx
 */

require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function syncPayment(paymentId) {
  console.log(`🔍 Buscando pago: ${paymentId}\n`);

  let session;
  let paymentIntent;

  try {
    // Determinar si es checkout session o payment intent
    if (paymentId.startsWith('cs_')) {
      session = await stripe.checkout.sessions.retrieve(paymentId, {
        expand: ['line_items', 'customer', 'payment_intent']
      });
      paymentIntent = session.payment_intent;
      console.log('✅ Checkout Session encontrada');
    } else if (paymentId.startsWith('pi_')) {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
      // Buscar la session asociada
      const sessions = await stripe.checkout.sessions.list({
        payment_intent: paymentId,
        limit: 1
      });
      if (sessions.data.length > 0) {
        session = await stripe.checkout.sessions.retrieve(sessions.data[0].id, {
          expand: ['line_items', 'customer']
        });
      }
      console.log('✅ Payment Intent encontrado');
    } else {
      throw new Error('ID debe empezar con cs_ (checkout session) o pi_ (payment intent)');
    }

    // Verificar estado del pago
    if (paymentIntent && paymentIntent.status !== 'succeeded') {
      console.log(`⚠️  Estado del pago: ${paymentIntent.status}`);
      console.log('Solo se sincronizan pagos completados (succeeded)');
      return;
    }

    // Mostrar info del pago
    console.log('\n📋 Detalles del pago:');
    console.log(`   Email: ${session?.customer_details?.email || session?.customer?.email || 'N/A'}`);
    console.log(`   Monto: ${(session?.amount_total || paymentIntent?.amount) / 100} ${session?.currency?.toUpperCase() || paymentIntent?.currency?.toUpperCase()}`);
    console.log(`   Fecha: ${new Date((session?.created || paymentIntent?.created) * 1000).toLocaleString()}`);

    // Verificar si ya existe el pedido
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session?.id || paymentId)
      .single();

    if (existingOrder) {
      console.log(`\n⚠️  Este pedido ya existe en Supabase (ID: ${existingOrder.id})`);
      return;
    }

    // Obtener productos del checkout
    const lineItems = session?.line_items?.data || [];
    console.log(`\n🛒 Productos (${lineItems.length}):`);
    
    const items = [];
    for (const item of lineItems) {
      console.log(`   - ${item.description} x${item.quantity}`);
      
      // Buscar producto en Supabase por nombre
      const { data: product } = await supabase
        .from('products')
        .select('id, name')
        .ilike('name', `%${item.description}%`)
        .single();

      items.push({
        product_id: product?.id || null,
        product_name: item.description,
        quantity: item.quantity,
        price: item.amount_total / 100
      });
    }

    // Buscar o crear usuario
    const email = session?.customer_details?.email || session?.customer?.email;
    let userId = null;

    if (email) {
      const { data: user } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      
      userId = user?.id || null;
      console.log(`\n👤 Usuario: ${email} ${userId ? `(ID: ${userId})` : '(no registrado)'}`);
    }

    // Crear pedido
    const downloadToken = nanoid(32);
    const order = {
      user_id: userId,
      stripe_session_id: session?.id || paymentId,
      stripe_payment_intent_id: typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id,
      customer_email: email,
      items: items,
      total: (session?.amount_total || paymentIntent?.amount) / 100,
      currency: session?.currency || paymentIntent?.currency,
      status: 'completed',
      download_token: downloadToken,
      download_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
      created_at: new Date((session?.created || paymentIntent?.created) * 1000).toISOString()
    };

    console.log('\n📝 Creando pedido...');
    const { data: newOrder, error } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single();

    if (error) {
      console.error('❌ Error al crear pedido:', error);
      return;
    }

    console.log(`✅ Pedido creado exitosamente!`);
    console.log(`   ID: ${newOrder.id}`);
    console.log(`   Token de descarga: ${downloadToken}`);
    console.log(`   URL: https://dev.control2dance.es/download/${downloadToken}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.statusCode === 404) {
      console.log('El pago no fue encontrado en Stripe');
    }
  }
}

// Ejecutar
const paymentId = process.argv[2];
if (!paymentId) {
  console.log('❌ Uso: node scripts/sync_stripe_payment.cjs <checkout_session_id o payment_intent_id>');
  console.log('   Ejemplo: node scripts/sync_stripe_payment.cjs cs_live_xxxx');
  console.log('            node scripts/sync_stripe_payment.cjs pi_xxxx');
  process.exit(1);
}

syncPayment(paymentId);
