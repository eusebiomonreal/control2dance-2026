import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Package, CreditCard, Calendar, Receipt, Download, Loader2, AlertCircle, FileText } from 'lucide-react';

interface OrderDetailProps {
  orderId: string;
}

interface Order {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  customer_email: string;
  customer_name: string;
  stripe_payment_intent: string | null;
  items: {
    id: string;
    product_name: string;
    product_catalog_number: string;
    price: number;
    product?: {
      cover_image: string | null;
    };
  }[];
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(cover_image)
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !data) {
      setError('Pedido no encontrado');
    } else {
      setOrder(data as Order);
    }
    setLoading(false);
  };

  const downloadInvoice = async () => {
    if (!order?.stripe_payment_intent) return;
    
    setInvoiceLoading(true);
    setInvoiceError(null);
    
    try {
      const response = await fetch(`/api/stripe/invoice?payment_intent=${order.stripe_payment_intent}`);
      const data = await response.json();
      
      if (!response.ok) {
        setInvoiceError(data.error || 'Factura no disponible');
        return;
      }
      
      if (data.invoice_pdf) {
        window.open(data.invoice_pdf, '_blank');
      } else {
        setInvoiceError('Factura no disponible todavía');
      }
    } catch (err) {
      setInvoiceError('Error al obtener la factura');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-500/10 text-green-400 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-400 border-red-500/20',
      refunded: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    };
    const labels = {
      paid: 'Pagado',
      pending: 'Pendiente',
      failed: 'Fallido',
      refunded: 'Reembolsado',
    };
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Error</h3>
        <p className="text-zinc-400 mb-4">{error || 'Pedido no encontrado'}</p>
        <a
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a pedidos
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a
          href="/dashboard/orders"
          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </a>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Pedido</h1>
          <p className="text-sm text-zinc-400">#{order.id.slice(0, 8).toUpperCase()}</p>
        </div>
        {getStatusBadge(order.status)}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fecha */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Fecha</span>
          </div>
          <p className="text-white">{formatDate(order.created_at)}</p>
          {order.paid_at && order.paid_at !== order.created_at && (
            <p className="text-xs text-zinc-500 mt-1">Pagado: {formatDate(order.paid_at)}</p>
          )}
        </div>

        {/* Método de pago */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Método de pago</span>
          </div>
          <p className="text-white">Tarjeta de crédito/débito</p>
          <p className="text-xs text-zinc-500 mt-1">Procesado por Stripe</p>
        </div>
      </div>

      {/* Productos */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Productos</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {order.items?.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-5">
              <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {item.product?.cover_image ? (
                  <img
                    src={item.product.cover_image}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-6 h-6 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{item.product_name}</p>
                <p className="text-sm text-zinc-400">{item.product_catalog_number}</p>
              </div>
              <p className="text-white font-medium">€{item.price.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
            <Receipt className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Resumen</h2>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Subtotal</span>
            <span className="text-white">€{order.subtotal.toFixed(2)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Impuestos</span>
              <span className="text-white">€{order.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-zinc-800 flex justify-between">
            <span className="font-medium text-white">Total</span>
            <span className="font-bold text-xl text-white">€{order.total.toFixed(2)}</span>
          </div>
        </div>

        {order.stripe_payment_intent && (
          <p className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
            Referencia: {order.stripe_payment_intent}
          </p>
        )}
      </div>

      {/* Acciones */}
      {order.status === 'paid' && (
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/dashboard/downloads"
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-colors"
          >
            <Download className="w-5 h-5" />
            Ir a mis descargas
          </a>
          {order.stripe_payment_intent && (
            <button
              onClick={downloadInvoice}
              disabled={invoiceLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {invoiceLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
              Descargar factura
            </button>
          )}
        </div>
      )}

      {invoiceError && (
        <p className="text-sm text-amber-400 text-center">{invoiceError}</p>
      )}

      {/* Info cliente */}
      <div className="text-xs text-zinc-500 space-y-1">
        <p>Cliente: {order.customer_name}</p>
        <p>Email: {order.customer_email}</p>
      </div>
    </div>
  );
}
