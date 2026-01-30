import type { APIRoute } from 'astro';
import { sendOrderEmails } from '../../services/emailService';

export const GET: APIRoute = async () => {
    const testData = {
        orderId: 'DEBUG-' + Date.now(),
        customerEmail: 'hola@control2dance.es',
        customerName: 'Debug User',
        items: [
            {
                product_id: 'test-id',
                product_name: 'Debug Product (New Template)',
                product_catalog_number: 'DEBUG-001',
                price: 10,
                quantity: 1
            }
        ],
        total: 10,
        stripeSessionId: 'debug_session',
        downloadUrl: 'https://dev.control2dance.es/dashboard/downloads'
    };

    console.log('🔍 Debug Endpoint Hit: /api/debug-email');

    try {
        const result = await sendOrderEmails(testData);
        return new Response(JSON.stringify({
            success: true,
            result,
            message: 'Email debug triggered. Check your inbox and terminal logs.'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
