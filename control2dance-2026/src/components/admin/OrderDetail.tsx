/**
 * OrderDetail - Página de detalle de pedido para admin
 */

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  CreditCard,
  Package,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  ExternalLink,
  Activity,
  Globe,
  Monitor,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';

interface DownloadLog {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  downloaded_at: string;
  product_id: string | null;
}

interface DownloadToken {
  id: string;
  token: string;
  download_count: number;
  max_downloads: number;
  expires_at: string;
  is_active: boolean;
  download_logs?: DownloadLog[];
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_catalog_number: string;
  price: number;
  download_tokens?: DownloadToken[];
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
  customer_country: string | null;
  payment_method: string | null;
  stripe_payment_intent: string | null;
  stripe_receipt_url: string | null;
  items: OrderItem[];
}

interface Refund {
  id: string;
  amount: number;
  status: string;
  reason: string | null;
  created: string;
}

interface Props {
  orderId: string;
}

export default function OrderDetail({ orderId }: Props) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resettingToken, setResettingToken] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [totalRefunded, setTotalRefunded] = useState(0);
  const [refunding, setRefunding] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('requested_by_customer');

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {
    if (order?.stripe_payment_intent) {
      loadRefunds();
    }
  }, [order?.stripe_payment_intent]);

  const loadRefunds = async () => {
    if (!order?.stripe_payment_intent) return;
    
    try {
      const res = await fetch(`/api/admin/refund?payment_intent=${order.stripe_payment_intent}`);
      if (res.ok) {
        const data = await res.json();
        setRefunds(data.refunds || []);
        setTotalRefunded(data.total_refunded || 0);
      }
    } catch (e) {
      console.error('Error loading refunds:', e);
    }
  };

  const handleRefund = async () => {
    if (!order?.stripe_payment_intent) return;
    
    setRefunding(true);
    try {
      const amount = refundAmount ? parseFloat(refundAmount) : undefined;
      
      const res = await fetch('/api/admin/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          paymentIntentId: order.stripe_payment_intent,
          amount,
          reason: refundReason
        })
      });

      if (res.ok) {
        setShowRefundModal(false);
        setRefundAmount('');
        await loadOrder();
        await loadRefunds();
        alert('Reembolso procesado correctamente');
      } else {
        const data = await res.json();
        alert(data.error || 'Error al procesar reembolso');
      }
    } catch (e) {
      console.error('Error refunding:', e);
      alert('Error al procesar reembolso');
    }
    setRefunding(false);
  };

  const loadOrder = async () => {
    setLoading(true);
    setError(null);

    try {
      // Obtener token de sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('No autenticado');
        setLoading(false);
        return;
      }

      // Usar API admin que tiene acceso a todos los pedidos
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Error loading order:', data.error);
        setError(data.error || 'Pedido no encontrado');
      } else {
        const data = await res.json();
        setOrder(data);
      }
    } catch (e) {
      console.error('Error loading order:', e);
      setError('Pedido no encontrado');
    }

    setLoading(false);
  };

  const parseUserAgent = (ua: string | null): string => {
    if (!ua) return 'Desconocido';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('iPad')) return 'iPad';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('Mac')) return 'Mac';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Linux')) return 'Linux';
    return 'Navegador';
  };

  const resetDownloadToken = async (tokenId: string) => {
    setResettingToken(tokenId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('No autenticado');
        setResettingToken(null);
        return;
      }

      const res = await fetch(`/api/admin/tokens/${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        console.error('Error resetting token:', data.error);
        alert('Error al resetear el token');
      } else {
        await loadOrder();
      }
    } catch (e) {
      console.error('Error resetting token:', e);
      alert('Error al resetear el token');
    }
    
    setResettingToken(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'Pedido no encontrado'}</p>
        <a href="/admin/orders" className="text-indigo-400 hover:text-indigo-300">
          ← Volver a pedidos
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a
            href="/admin/orders"
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Pedido #{order.id.substring(0, 8).toUpperCase()}
            </h1>
            <p className="text-zinc-400">{formatDate(order.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {order.status === 'paid' && order.stripe_payment_intent && (
            <button
              onClick={() => setShowRefundModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reembolsar
            </button>
          )}
          
          {order.status === 'refunded' ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-red-500/10 text-red-400">
              <RotateCcw className="w-4 h-4" />
              Reembolsado
            </span>
          ) : order.status === 'partially_refunded' ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-orange-500/10 text-orange-400">
              <RotateCcw className="w-4 h-4" />
              Parcial
            </span>
          ) : order.status === 'paid' ? (
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Pagado
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full bg-amber-500/10 text-amber-400">
              <Clock className="w-4 h-4" />
              Pendiente
            </span>
          )}
        </div>
      </div>

      {/* Reembolsos existentes */}
      {refunds.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="font-medium text-red-400">Reembolsos ({formatCurrency(totalRefunded)})</h3>
          </div>
          <div className="space-y-2">
            {refunds.map(refund => (
              <div key={refund.id} className="flex items-center justify-between bg-zinc-900/50 rounded-lg p-3">
                <div>
                  <p className="text-sm text-white">{formatCurrency(refund.amount)}</p>
                  <p className="text-xs text-zinc-500">{formatDate(refund.created)}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  refund.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  {refund.status === 'succeeded' ? 'Completado' : refund.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de reembolso */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Procesar Reembolso</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">
                  Importe (dejar vacío para reembolso total: {formatCurrency(order.total - totalRefunded)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={order.total - totalRefunded}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Máx: ${(order.total - totalRefunded).toFixed(2)}`}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-2">Razón</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="requested_by_customer">Solicitado por el cliente</option>
                  <option value="duplicate">Pago duplicado</option>
                  <option value="fraudulent">Fraudulento</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRefund}
                  disabled={refunding}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {refunding ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Reembolsar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Info del cliente */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Cliente</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-400">Nombre</p>
                <p className="text-white">{order.customer_name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-400">Email</p>
                <p className="text-white">{order.customer_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-400">Fecha de pago</p>
                <p className="text-white">{order.paid_at ? formatDate(order.paid_at) : '-'}</p>
              </div>
            </div>
            {(order.payment_method || order.stripe_payment_intent) && (
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">Pago</p>
                  <div className="flex items-center gap-2">
                    {order.payment_method && (
                      <span className={`text-xs px-2 py-0.5 rounded uppercase font-medium ${
                        order.payment_method === 'paypal' 
                          ? 'bg-[#0070BA]/10 text-[#0070BA]' // PayPal Blue
                          : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {order.payment_method}
                      </span>
                    )}
                    {order.payment_method === 'paypal' && order.stripe_payment_intent ? (
                      <a 
                        href={`https://www.paypal.com/activity/payment/${order.stripe_payment_intent}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#0070BA] hover:text-[#005ea6] text-sm flex items-center gap-1"
                      >
                        PayPal <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : order.stripe_payment_intent && (order.stripe_payment_intent.startsWith('pi_') || order.stripe_payment_intent.startsWith('ch_')) ? (
                      <a 
                        href={`https://dashboard.stripe.com/payments/${order.stripe_payment_intent}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                      >
                        Dashboard <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : order.stripe_payment_intent ? (
                      <span className="text-xs text-zinc-500 font-mono" title="ID de Transacción">
                        {order.stripe_payment_intent.substring(0, 12)}...
                      </span>
                    ) : null}
                    {order.stripe_receipt_url && (
                      <a 
                        href={order.stripe_receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-1"
                      >
                        Recibo <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            {order.customer_country && (
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-zinc-500" />
                <div>
                  <p className="text-sm text-zinc-400">País</p>
                  <p className="text-white">{order.customer_country}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Productos */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Productos</h2>
          <div className="space-y-4">
            {order.items?.map((item) => {
              const token = item.download_tokens?.[0];
              return (
                <div key={item.id} className="bg-zinc-800/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-white font-medium">{item.product_name}</p>
                      <p className="text-sm text-zinc-400">{item.product_catalog_number}</p>
                    </div>
                    <p className="text-lg font-bold text-white">{formatCurrency(item.price)}</p>
                  </div>
                  
                  {/* Token de descarga */}
                  {token && (
                    <div className="pt-3 border-t border-zinc-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Download className="w-4 h-4 text-zinc-400" />
                          <div>
                            <p className="text-sm text-white">
                              Descargas: {token.download_count} / {token.max_downloads}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Expira: {formatDate(token.expires_at)}
                            </p>
                          </div>
                          {!token.is_active && (
                            <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded">Desactivado</span>
                          )}
                          {new Date(token.expires_at) < new Date() && (
                            <span className="text-xs px-2 py-1 bg-red-500/10 text-red-400 rounded">Expirado</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {token.download_logs && token.download_logs.length > 0 && (
                            <button
                              onClick={() => setShowLogs(showLogs === token.id ? null : token.id)}
                              className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                            >
                              <Activity className="w-4 h-4" />
                              Logs ({token.download_logs.length})
                            </button>
                          )}
                          <button
                            onClick={() => resetDownloadToken(token.id)}
                            disabled={resettingToken === token.id}
                            className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                          >
                            {resettingToken === token.id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            Resetear
                          </button>
                        </div>
                      </div>
                      
                      {/* Logs de descarga */}
                      {showLogs === token.id && token.download_logs && token.download_logs.length > 0 && (
                        <div className="mt-4 bg-zinc-900 rounded-lg p-4 space-y-3">
                          <h4 className="text-sm font-medium text-white flex items-center gap-2">
                            <Activity className="w-4 h-4 text-indigo-400" />
                            Historial de descargas
                          </h4>
                          <div className="space-y-2">
                            {token.download_logs.map((log: DownloadLog) => (
                              <div key={log.id} className="bg-zinc-800 rounded-lg p-3 text-sm">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-zinc-400">{formatDate(log.downloaded_at)}</span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="flex items-center gap-1 text-zinc-400">
                                    <Globe className="w-3 h-3" />
                                    IP: <span className="text-white font-mono">{log.ip_address || 'N/A'}</span>
                                  </span>
                                  <span className="flex items-center gap-1 text-zinc-400">
                                    <Monitor className="w-3 h-3" />
                                    {parseUserAgent(log.user_agent)}
                                  </span>
                                </div>
                                {log.user_agent && (
                                  <p className="mt-2 text-xs text-zinc-600 font-mono truncate" title={log.user_agent}>
                                    {log.user_agent}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resumen */}
          <div className="mt-6 pt-6 border-t border-zinc-800">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Subtotal</span>
                <span className="text-white">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-400">Impuestos</span>
                  <span className="text-white">{formatCurrency(order.tax)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-zinc-700">
                <span className="font-medium text-white">Total</span>
                <span className="text-2xl font-bold text-emerald-400">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
