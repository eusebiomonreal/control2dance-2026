/**
 * OrdersTable - Tabla de pedidos para el admin con modal de detalle
 */

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search,
  Eye,
  Package,
  Clock,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText
} from 'lucide-react';

// Cliente sin tipos para evitar errores de TypeScript
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('OrdersTable v1.1 Loaded');

interface DownloadToken {
  id: string;
  token: string;
  download_count: number;
  max_downloads: number;
  expires_at: string;
  is_active: boolean;
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
  order_number: number | null;
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
  stripe_session_id: string | null;
  stripe_receipt_url: string | null;
  items: OrderItem[];
}

interface OrderStats {
  total: number;
  paid: number;
  pending: number;
  revenue: number;
}

export default function OrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'created_at',
    direction: 'desc'
  });

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          id, 
          product_id,
          product_name, 
          product_catalog_number,
          price,
          download_tokens(*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading orders:', error);
    } else {
      setOrders(data || []);

      const allOrders = data || [];
      const paidOrders = allOrders.filter(o => o.status === 'paid');
      setStats({
        total: allOrders.length,
        paid: paidOrders.length,
        pending: allOrders.length - paidOrders.length,
        revenue: paidOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      });
    }

    setLoading(false);
  };

  const filteredOrders = orders.filter(order => {
    const searchTerm = search.toLowerCase().replace('#', '');
    const searchRaw = search.toLowerCase();

    const matchesSearch =
      order.customer_email?.toLowerCase().includes(searchRaw) ||
      order.customer_name?.toLowerCase().includes(searchRaw) ||
      order.id.toLowerCase().includes(searchRaw) ||
      (order.order_number && order.order_number.toString().includes(searchTerm));

    const matchesFilter =
      filter === 'all' ||
      (filter === 'paid' && order.status === 'paid') ||
      (filter === 'pending' && order.status !== 'paid');

    return matchesSearch && matchesFilter;
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const { key, direction } = sortConfig;
    let aValue: any;
    let bValue: any;

    switch (key) {
      case 'items_count':
        aValue = a.items?.length || 0;
        bValue = b.items?.length || 0;
        break;
      case 'customer_name':
        aValue = (a.customer_name || '').toLowerCase();
        bValue = (b.customer_name || '').toLowerCase();
        break;
      case 'order_number':
        // Fallback to ID if order_number is null, though ID is string so handled carefully
        aValue = a.order_number || 0;
        bValue = b.order_number || 0;
        break;
      case 'payment_method':
        aValue = (a.payment_method || '').toLowerCase();
        bValue = (b.payment_method || '').toLowerCase();
        break;
      case 'status':
        aValue = (a.status || '').toLowerCase();
        bValue = (b.status || '').toLowerCase();
        break;
      default:
        // @ts-ignore
        aValue = a[key];
        // @ts-ignore
        bValue = b[key];
    }

    if (aValue < bValue) return direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-4 h-4 text-zinc-600" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 text-indigo-400" />
      : <ArrowDown className="w-4 h-4 text-indigo-400" />;
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

  const getStatusBadge = (status: string) => {
    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400">
          <CheckCircle className="w-3 h-3" />
          Pagado
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400">
        <Clock className="w-3 h-3" />
        Pendiente
      </span>
    );
  };

  const getPaymentMethodBadge = (method: string | null) => {
    if (method?.toLowerCase().includes('paypal')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          PayPal
        </span>
      );
    }
    if (method === 'legacy') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
          Legacy
        </span>
      );
    }
    if (method === 'card' || method === 'stripe' || method === 'stripe_checkout') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Stripe
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
        {method || '-'}
      </span>
    );
  };

  const getTransactionLink = (order: Order) => {
    const method = order.payment_method?.toLowerCase() || '';
    const id = order.stripe_payment_intent || order.stripe_session_id;

    if (!id) return null;

    if (method.includes('paypal')) {
      return {
        url: `https://www.paypal.com/activity/payment/${id}`,
        label: 'Ver en PayPal',
        color: 'text-blue-400 hover:text-blue-300',
        icon: 'paypal'
      };
    }

    if (id.startsWith('cs_')) {
      return {
        url: `https://dashboard.stripe.com/checkout/sessions/${id}`,
        label: 'Ver en Stripe Checkout',
        color: 'text-indigo-400 hover:text-indigo-300',
        icon: 'stripe'
      };
    }

    if (method.includes('stripe') || id.startsWith('pi_') || id.startsWith('ch_')) {
      return {
        url: `https://dashboard.stripe.com/payments/${id}`,
        label: 'Ver en Stripe',
        color: 'text-indigo-400 hover:text-indigo-300',
        icon: 'stripe'
      };
    }

    return null;
  };

  const getTransactionLabel = (order: Order) => {
    const tx = getTransactionLink(order);
    if (!tx) return null;

    return (
      <a
        href={tx.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold uppercase transition-all hover:scale-105 active:scale-95 ${tx.color} bg-white/5 border border-current`}
        title={tx.label}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        {tx.icon}
      </a>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Total pedidos</p>
                <p className="text-xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Pagados</p>
                <p className="text-xl font-bold text-white">{stats.paid}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Pendientes</p>
                <p className="text-xl font-bold text-white">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Ingresos</p>
                <p className="text-xl font-bold text-white">{formatCurrency(stats.revenue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nº pedido (#123), email o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos</option>
            <option value="paid">Pagados</option>
            <option value="pending">Pendientes</option>
          </select>

          <button
            onClick={loadOrders}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th
                    className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('order_number')}
                  >
                    <div className="flex items-center gap-2">
                      Pedido
                      <SortIcon columnKey="order_number" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('customer_name')}
                  >
                    <div className="flex items-center gap-2">
                      Cliente
                      <SortIcon columnKey="customer_name" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('payment_method')}
                  >
                    <div className="flex items-center gap-2">
                      Método
                      <SortIcon columnKey="payment_method" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('items_count')}
                  >
                    <div className="flex items-center gap-2">
                      Productos
                      <SortIcon columnKey="items_count" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('total')}
                  >
                    <div className="flex items-center gap-2">
                      Total
                      <SortIcon columnKey="total" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Estado
                      <SortIcon columnKey="status" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-left text-sm font-medium text-zinc-400 cursor-pointer hover:text-white transition-colors group"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      Fecha
                      <SortIcon columnKey="created_at" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sortedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-white">
                        #{order.order_number || order.id.substring(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{order.customer_name || '-'}</p>
                        <p className="text-sm text-zinc-500">
                          {order.customer_email}
                          {order.customer_country && (
                            <span className="ml-2 text-xs bg-zinc-800 px-1.5 py-0.5 rounded">
                              {order.customer_country}
                            </span>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getPaymentMethodBadge(order.payment_method)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-400">
                        {order.items?.length || 0} producto(s)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">
                        {formatCurrency(order.total, order.currency)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-400">
                        {formatDate(order.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <a
                          href={`/admin/orders/${order.id}`}
                          className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                          title="Ver detalle del pedido"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-xs font-medium">Ver</span>
                        </a>

                        {getTransactionLabel(order)}

                        {order.stripe_receipt_url && (
                          <a
                            href={order.stripe_receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-zinc-500 hover:text-emerald-400 transition-colors"
                            title="Ver recibo Stripe"
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-zinc-500">No se encontraron pedidos</p>
            </div>
          )}
        </div>
      )
      }

      <p className="text-sm text-zinc-500">
        Mostrando {filteredOrders.length} de {orders.length} pedidos
      </p>
    </div >
  );
}
