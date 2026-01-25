/**
 * CustomersTable - Tabla de todos los usuarios registrados
 * Usa endpoint API con Service Key para acceder a auth.admin
 */

import { useEffect, useState } from 'react';
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
  Send
} from 'lucide-react';

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

export default function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'buyers' | 'no-purchase'>('all');
  const [stats, setStats] = useState<CustomerStats | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);

    try {
      // Obtener token del usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session');
        setLoading(false);
        return;
      }

      // Llamar al endpoint API
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
      
      // Ordenar por fecha de registro (más recientes primero)
      users.sort((a: Customer, b: Customer) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCustomers(users);

      // Estadísticas
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

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.email?.toLowerCase().includes(search.toLowerCase()) ||
      customer.name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter =
      filter === 'all' ||
      (filter === 'buyers' && customer.orders_count > 0) ||
      (filter === 'no-purchase' && customer.orders_count === 0);
    
    return matchesSearch && matchesFilter;
  });

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
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Cliente</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Pedidos</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Total gastado</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Registrado</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-zinc-400">
                            {customer.email.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{customer.name || '-'}</p>
                          <p className="text-sm text-zinc-500">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.email_confirmed_at ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400">
                          <Clock className="w-3 h-3" />
                          Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${customer.orders_count > 0 ? 'text-white font-medium' : 'text-zinc-500'}`}>
                        {customer.orders_count}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${customer.total_spent > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {formatCurrency(customer.total_spent)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-400">
                        {formatDate(customer.created_at)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/admin/customers/${customer.id}`}
                          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <a
                          href={`mailto:${customer.email}`}
                          className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors"
                          title="Enviar email"
                        >
                          <Send className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-zinc-500">No se encontraron clientes</p>
            </div>
          )}
        </div>
      )}

      <p className="text-sm text-zinc-500">
        Mostrando {filteredCustomers.length} de {customers.length} clientes
      </p>
    </div>
  );
}
