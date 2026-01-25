/**
 * AdminDashboard - Panel principal del admin
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { adminStats, loadAdminStats, adminProducts, loadAdminProducts } from '../../stores/adminStore';
import { Package, ShoppingCart, Download, TrendingUp, Plus, ArrowRight, RefreshCw, CheckCircle, AlertTriangle, ExternalLink, CreditCard } from 'lucide-react';

interface StripeBalance {
  stripe: {
    available: number;
    pending: number;
    last30Days: number;
    refunded30Days: number;
    charges30Days: number;
    currency: string;
  };
  supabase: {
    last30Days: number;
    orders30Days: number;
  };
  sync: {
    difference: number;
    missingCount: number;
    ordersMatch: boolean;
    amountMatch: boolean;
  };
}

interface MissingSession {
  id: string;
  payment_intent: string;
  amount: number;
  customer_email: string;
  customer_name: string;
  created: string;
  line_items: number;
}

interface ReconcileData {
  stripe: { total: number; sessions: number };
  supabase: { total: number; orders: number };
  missing: { total: number; count: number; sessions: MissingSession[] };
  difference: number;
}

export default function AdminDashboard() {
  const stats = useStore(adminStats);
  const products = useStore(adminProducts);
  const [stripeBalance, setStripeBalance] = useState<StripeBalance | null>(null);
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [reconcileData, setReconcileData] = useState<ReconcileData | null>(null);
  const [loadingReconcile, setLoadingReconcile] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);

  useEffect(() => {
    loadAdminStats();
    loadAdminProducts();
    loadStripeBalance();
  }, []);

  const loadStripeBalance = async () => {
    setLoadingStripe(true);
    try {
      const res = await fetch('/api/admin/stripe-balance');
      if (res.ok) {
        const data = await res.json();
        setStripeBalance(data);
        
        // Si hay diferencia, cargar datos de reconciliación automáticamente
        if (!data.sync.amountMatch || !data.sync.ordersMatch) {
          await loadReconcileData();
        }
      }
    } catch (e) {
      console.error('Error loading Stripe balance:', e);
    }
    setLoadingStripe(false);
  };

  const loadReconcileData = async () => {
    setLoadingReconcile(true);
    try {
      const res = await fetch('/api/admin/reconcile?days=90');
      if (res.ok) {
        const data = await res.json();
        setReconcileData(data);
      }
    } catch (e) {
      console.error('Error loading reconcile data:', e);
    }
    setLoadingReconcile(false);
  };

  const syncAllMissing = async () => {
    if (!reconcileData?.missing.sessions.length) {
      // Si no tenemos datos, cargarlos primero
      await loadReconcileData();
    }
    
    const sessions = reconcileData?.missing.sessions || [];
    if (sessions.length === 0) {
      alert('Todo sincronizado, no hay pagos faltantes');
      return;
    }
    
    setImporting('all');
    let imported = 0;
    let errors = 0;
    
    for (const session of sessions) {
      try {
        const res = await fetch('/api/admin/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session.id })
        });
        if (res.ok) {
          imported++;
        } else {
          errors++;
        }
      } catch (e) {
        errors++;
      }
    }
    
    // Recargar todo
    await loadAdminStats();
    await loadStripeBalance();
    setReconcileData(null);
    setImporting(null);
    
    alert(`Sincronización completada: ${imported} importados, ${errors} errores`);
  };

  const importSession = async (sessionId: string) => {
    setImporting(sessionId);
    try {
      const res = await fetch('/api/admin/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      if (res.ok) {
        // Recargar datos
        await loadReconcileData();
        await loadAdminStats();
        await loadStripeBalance();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al importar');
      }
    } catch (e) {
      console.error('Error importing session:', e);
    }
    setImporting(null);
  };

  const importAllMissing = async () => {
    if (!reconcileData?.missing.sessions.length) return;
    for (const session of reconcileData.missing.sessions) {
      await importSession(session.id);
    }
  };

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const recentProducts = products.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-zinc-400">Resumen de tu tienda</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Productos</p>
              <p className="text-2xl font-bold text-white">{stats?.totalProducts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Activos</p>
              <p className="text-2xl font-bold text-white">{stats?.activeProducts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Pedidos</p>
              <p className="text-2xl font-bold text-white">
                {stripeBalance ? stripeBalance.stripe.charges30Days : (stats?.totalOrders || 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-500/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-400">Ingresos (30 días)</p>
              <p className="text-2xl font-bold text-white">
                {stripeBalance ? formatCurrency(stripeBalance.stripe.last30Days, stripeBalance.stripe.currency) : formatCurrency(stats?.totalRevenue || 0)}
              </p>
              {stripeBalance && stripeBalance.stripe.last30Days > 0 && (
                <p className="text-xs text-zinc-500">
                  Neto: {formatCurrency(stripeBalance.stripe.available + stripeBalance.stripe.pending, stripeBalance.stripe.currency)} 
                  <span className="text-red-400 ml-1">
                    (-{formatCurrency(stripeBalance.stripe.last30Days - stripeBalance.stripe.available - stripeBalance.stripe.pending, stripeBalance.stripe.currency)} comisiones)
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stripe Balance Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-white">Stripe Balance</h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://dashboard.stripe.com/balance/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              Dashboard <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={loadStripeBalance}
              disabled={loadingStripe}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStripe ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {stripeBalance ? (
          <div className="p-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Disponible</p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatCurrency(stripeBalance.stripe.available, stripeBalance.stripe.currency)}
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Pendiente</p>
                <p className="text-xl font-bold text-amber-400">
                  {formatCurrency(stripeBalance.stripe.pending, stripeBalance.stripe.currency)}
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Últimos 30 días</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(stripeBalance.stripe.last30Days, stripeBalance.stripe.currency)}
                </p>
                <p className="text-xs text-zinc-500">{stripeBalance.stripe.charges30Days} pagos</p>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Reembolsado</p>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(stripeBalance.stripe.refunded30Days, stripeBalance.stripe.currency)}
                </p>
              </div>
            </div>

            {/* Sync Status */}
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              stripeBalance.sync.amountMatch && stripeBalance.sync.ordersMatch
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-amber-500/10 border border-amber-500/20'
            }`}>
              <div className="flex items-center gap-3">
                {stripeBalance.sync.amountMatch && stripeBalance.sync.ordersMatch ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium text-emerald-400">Datos sincronizados</p>
                      <p className="text-xs text-zinc-400">
                        Stripe ({stripeBalance.stripe.charges30Days} pagos) = Supabase ({stripeBalance.supabase.orders30Days} pedidos)
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-medium text-amber-400">
                        {stripeBalance.sync.missingCount} pagos sin registrar
                      </p>
                      <p className="text-xs text-zinc-400">
                        Stripe: {formatCurrency(stripeBalance.stripe.last30Days)} ({stripeBalance.stripe.charges30Days} pagos) | 
                        Supabase: {formatCurrency(stripeBalance.supabase.last30Days)} ({stripeBalance.supabase.orders30Days} pedidos)
                      </p>
                    </div>
                  </>
                )}
              </div>
              
              {/* Botón sincronizar */}
              {stripeBalance.sync.missingCount > 0 && (
                <button
                  onClick={syncAllMissing}
                  disabled={importing === 'all' || loadingReconcile}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {importing === 'all' || loadingReconcile ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Sincronizar ({stripeBalance.sync.missingCount})
                </button>
              )}
            </div>

            {/* Sesiones faltantes */}
            {reconcileData && reconcileData.missing.count > 0 && (
              <div className="mt-4 bg-zinc-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {reconcileData.missing.count} pagos sin registrar
                    </p>
                    <p className="text-xs text-zinc-400">
                      Total: {formatCurrency(reconcileData.missing.total)}
                    </p>
                  </div>
                  <button
                    onClick={importAllMissing}
                    disabled={importing !== null}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Importar todos
                  </button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {reconcileData.missing.sessions.map(session => (
                    <div key={session.id} className="flex items-center justify-between bg-zinc-900 rounded-lg p-3">
                      <div>
                        <p className="text-sm text-white">{session.customer_email}</p>
                        <p className="text-xs text-zinc-500">
                          {new Date(session.created).toLocaleDateString('es-ES')} • {session.line_items} producto(s)
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-white">
                          {formatCurrency(session.amount)}
                        </span>
                        <button
                          onClick={() => importSession(session.id)}
                          disabled={importing === session.id}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded transition-colors"
                        >
                          {importing === session.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            'Importar'
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : loadingStripe ? (
          <div className="p-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-8 text-center text-zinc-500">
            No se pudo cargar el balance de Stripe
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href="/admin/products/new"
          className="flex items-center gap-4 p-6 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors"
        >
          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">Nuevo producto</p>
            <p className="text-sm text-indigo-200">Añadir al catálogo</p>
          </div>
        </a>

        <a
          href="/admin/products"
          className="flex items-center gap-4 p-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
        >
          <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Gestionar productos</p>
            <p className="text-sm text-zinc-400">Ver todos los productos</p>
          </div>
        </a>

        <a
          href="/catalogo"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 p-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-colors"
        >
          <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-zinc-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Ver tienda</p>
            <p className="text-sm text-zinc-400">Abrir catálogo público</p>
          </div>
        </a>
      </div>

      {/* Recent Products */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Productos recientes</h2>
          <a
            href="/admin/products"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Ver todos
          </a>
        </div>

        <div className="divide-y divide-zinc-800">
          {recentProducts.map(product => (
            <a
              key={product.id}
              href={`/admin/products/${product.id}`}
              className="flex items-center gap-4 p-4 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                {product.cover_image ? (
                  <img
                    src={product.cover_image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <Package className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{product.name}</p>
                <p className="text-sm text-zinc-500">{product.catalog_number}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-white">{formatCurrency(product.price)}</p>
                <p className={`text-xs ${product.is_active ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </a>
          ))}

          {recentProducts.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
              No hay productos todavía
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
