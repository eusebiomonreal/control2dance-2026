import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const paymentIntentId = url.searchParams.get('payment_intent');

  if (!paymentIntentId) {
    return new Response(
      JSON.stringify({ error: 'payment_intent requerido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Buscar facturas asociadas al payment intent
    const invoices = await stripe.invoices.list({
      limit: 10,
    });

    // Buscar la factura que corresponde a este payment intent
    // Las facturas de checkout sessions tienen el payment_intent en los datos
    let targetInvoice = null;
    
    for (const invoice of invoices.data) {
      if (invoice.payment_intent === paymentIntentId) {
        targetInvoice = invoice;
        break;
      }
    }

    // Si no encontramos por payment_intent directo, buscar por charge
    if (!targetInvoice) {
      // Obtener el payment intent para ver el charge
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Buscar invoice por el charge si existe
      if (paymentIntent.latest_charge) {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
        if (charge.invoice) {
          targetInvoice = await stripe.invoices.retrieve(charge.invoice as string);
        }
      }
    }

    if (!targetInvoice) {
      return new Response(
        JSON.stringify({ error: 'Factura no encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        invoice_pdf: targetInvoice.invoice_pdf,
        hosted_invoice_url: targetInvoice.hosted_invoice_url,
        number: targetInvoice.number,
        status: targetInvoice.status
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return new Response(
      JSON.stringify({ error: 'Error al obtener la factura' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
