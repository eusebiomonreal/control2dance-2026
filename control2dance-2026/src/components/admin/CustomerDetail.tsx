/**
 * CustomerDetail - Página de detalle de cliente
 */

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  ShoppingBag,
  Package,
  CheckCircle,
  Clock,
  Send,
  TrendingUp
} from 'lucide-react';

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

interface Props {
  customerId: string;
}

export default function CustomerDetail({ customerId }: Props) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('No autorizado');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        setError('Error al cargar cliente');
        setLoading(false);
        return;
      }

      const { users } = await response.json();
      const found = users.find((u: Customer) => u.id === customerId);
      
      if (!found) {
        setError('Cliente no encontrado');
      } else {
        setCustomer(found);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar cliente');
    }

    setLoading(false);
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400 mb-4">{error || 'Cliente no encontrado'}</p>
        <a href="/admin/customers" className="text-indigo-400 hover:text-indigo-300">
          ← Volver a clientes
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a
          href="/admin/customers"
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-zinc-400">
              {customer.email.substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{customer.name || customer.email}</h1>
            <p className="text-zinc-400">{customer.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Pedidos</p>
              <p className="text-xl font-bold text-white">{customer.orders_count}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Total gastado</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(customer.total_spent)}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
              {customer.email_confirmed_at ? (
                <CheckCircle className="w-5 h-5 text-cyan-400" />
              ) : (
                <Clock className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div>
              <p className="text-sm text-zinc-400">Email</p>
              <p className={`text-xl font-bold ${customer.email_confirmed_at ? 'text-cyan-400' : 'text-amber-400'}`}>
                {customer.email_confirmed_at ? 'Verificado' : 'Pendiente'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Registrado</p>
              <p className="text-sm font-medium text-white">{formatDate(customer.created_at).split(',')[0]}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info y Acciones */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Información */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Información</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-400">Email</p>
                <p className="text-white">{customer.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-400">Nombre</p>
                <p className="text-white">{customer.name || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-zinc-500" />
              <div>
                <p className="text-sm text-zinc-400">Último login</p>
                <p className="text-white">{customer.last_sign_in_at ? formatDate(customer.last_sign_in_at) : '-'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-800">
            <a
              href={`mailto:${customer.email}`}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
            >
              <Send className="w-4 h-4" />
              Enviar email
            </a>
          </div>
        </div>

        {/* Historial de pedidos */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Historial de pedidos</h2>
          
          {customer.orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">Este cliente no tiene pedidos todavía</p>
            </div>
          ) : (
            <div className="space-y-3">
              {customer.orders.map((order) => (
                <a
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between bg-zinc-800/50 hover:bg-zinc-800 rounded-xl p-4 transition-colors group"
                >
                  <div>
                    <p className="text-white font-medium group-hover:text-indigo-400 transition-colors">
                      #{order.id.substring(0, 8).toUpperCase()}
                    </p>
                    <p className="text-sm text-zinc-500">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-emerald-400">{formatCurrency(order.total)}</p>
                    <p className="text-sm text-zinc-500">{order.items_count} producto(s)</p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
