import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Search,
  Users,
  ShoppingBag,
  CheckCircle,
  TrendingUp,
  RefreshCw,
  Eye,
  Clock,
  Send,
  UserPlus,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { startImpersonation } from '../../stores/authStore';

// Cliente para obtener el token
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface CustomerOrder {
  id: string;
  total: number;
  created_at: string;
  items_count: number;
}

interface Customer {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  orders_count: number;
  total_spent: number;
  last_order_at: string | null;
  orders: CustomerOrder[];
}

interface CustomerStats {
  total: number;
  withPurchases: number;
  confirmed: number;
  totalRevenue: number;
}

type SortField = 'name' | 'email' | 'orders_count' | 'total_spent' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'buyers' | 'no-purchase'>('all');
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Error:', error);
        setLoading(false);
        return;
      }

      const { users } = await response.json();
      setCustomers(users);

      const withPurchases = users.filter((c: Customer) => c.orders_count > 0);
      const confirmed = users.filter((c: Customer) => c.email_confirmed_at);

      setStats({
        total: users.length,
        withPurchases: withPurchases.length,
        confirmed: confirmed.length,
        totalRevenue: withPurchases.reduce((sum: number, c: Customer) => sum + c.total_spent, 0)
      });
    } catch (err) {
      console.error('Error loading customers:', err);
    }

    setLoading(false);
  };

  const sortedAndFilteredCustomers = useMemo(() => {
    const filtered = customers.filter(customer => {
      const matchesSearch =
        customer.email?.toLowerCase().includes(search.toLowerCase()) ||
        customer.name?.toLowerCase().includes(search.toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'buyers' && customer.orders_count > 0) ||
        (filter === 'no-purchase' && customer.orders_count === 0);

      return matchesSearch && matchesFilter;
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'email':
          comparison = a.email.localeCompare(b.email);
          break;
        case 'orders_count':
          comparison = a.orders_count - b.orders_count;
          break;
        case 'total_spent':
          comparison = a.total_spent - b.total_spent;
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [customers, search, filter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Clientes</p>
                <p className="text-xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Con compras</p>
                <p className="text-xl font-bold text-white">{stats.withPurchases}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-400">Email verificado</p>
                <p className="text-xl font-bold text-white">{stats.confirmed}</p>
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
                <p className="text-xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search, Filter & Refresh */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por email o nombre..."
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
            <option value="buyers">Con compras</option>
            <option value="no-purchase">Sin compras</option>
          </select>
          <button
            onClick={loadCustomers}
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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-800/20">
                  <th
                    className="px-6 py-4 text-sm font-black text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Cliente
                      <SortIndicator field="name" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-zinc-400 uppercase tracking-widest">
                    Estado
                  </th>
                  <th
                    className="px-6 py-4 text-sm font-black text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors text-right sm:text-left"
                    onClick={() => handleSort('orders_count')}
                  >
                    <div className="flex items-center gap-2">
                      Pedidos
                      <SortIndicator field="orders_count" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-sm font-black text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors text-right sm:text-left"
                    onClick={() => handleSort('total_spent')}
                  >
                    <div className="flex items-center gap-2">
                      Gasto Total
                      <SortIndicator field="total_spent" />
                    </div>
                  </th>
                  <th
                    className="px-6 py-4 text-sm font-black text-zinc-400 uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      Registrado
                      <SortIndicator field="created_at" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-zinc-400 uppercase tracking-widest">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {sortedAndFilteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
                          <span className="text-sm font-black text-white">
                            {customer.email.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-bold leading-tight">{customer.name || 'Sin nombre'}</p>
                          <p className="text-xs text-zinc-500 font-medium mt-0.5">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {customer.email_confirmed_at ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right sm:text-left">
                      <div className="flex flex-col">
                        <span className={`text-sm font-black ${customer.orders_count > 0 ? 'text-white' : 'text-zinc-600'}`}>
                          {customer.orders_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right sm:text-left">
                      <span className={`text-sm font-black ${customer.total_spent > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                        {formatCurrency(customer.total_spent)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-sm text-zinc-400 font-medium">
                        {formatDate(customer.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-1">
                        <a
                          href={`/admin/customers/${customer.id}`}
                          className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={`mailto:${customer.email}`}
                          className="p-2 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded-xl transition-all"
                          title="Enviar email"
                        >
                          <Send className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => {
                            if (confirm(`¿Quieres suplantar la identidad de ${customer.email}?`)) {
                              startImpersonation(customer.id);
                            }
                          }}
                          className="p-2 text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 rounded-xl transition-all"
                          title="Impersonar usuario"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedAndFilteredCustomers.length === 0 && (
            <div className="py-20 text-center bg-zinc-900/50">
              <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">No se encontraron clientes</p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">
          Mostrando {sortedAndFilteredCustomers.length} de {customers.length} clientes
        </p>
      </div>
    </div>
  );
}
