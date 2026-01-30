import 'dotenv/config';
import { sendOrderEmails } from '../src/services/emailService';

async function runTest() {
    console.log('🧪 Iniciando prueba de email con imágenes...');

    const testData = {
        orderId: 'TEST-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        customerEmail: 'hola@control2dance.es', // Enviamos al admin para que lo vea
        customerName: 'Prueba de Diseño',
        items: [
            {
                product_id: '23f8c87f-3459-4a3b-80f3-82591b0af12f',
                product_name: 'Emo Dj - Scratch EP',
                product_catalog_number: 'C2D-8690',
                product_image: 'https://api.control2dance.es/storage/v1/object/public/covers/scratch-ep-emo-dj/cover.webp',
                price: 9.99,
                quantity: 1
            },
            {
                product_id: 'another-fake-id', // Caso con fallback
                product_name: 'Disco de Prueba Sin Imagen',
                product_catalog_number: 'TEST-001',
                price: 5.50,
                quantity: 1
            }
        ],
        total: 15.49,
        stripeSessionId: 'cs_test_mock',
        downloadUrl: 'https://dev.control2dance.es/dashboard/downloads'
    };

    try {
        const result = await sendOrderEmails(testData);
        console.log('✅ Resultado del envío:', result);
        if (result.customer && result.admin) {
            console.log('🚀 ¡Emails enviados con éxito! Revisa hola@control2dance.es');
        } else {
            console.log('⚠️ Hubo algún problema con el envío (revisa logs de Resend)');
        }
    } catch (error) {
        console.error('❌ Error ejecutando prueba:', error);
    }
}

runTest();
