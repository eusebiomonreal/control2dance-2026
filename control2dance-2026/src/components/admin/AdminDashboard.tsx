/**
 * AdminDashboard - Panel principal del admin (Resumen)
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { adminStats, loadAdminStats, adminProducts, loadAdminProducts, type AdminStats } from '../../stores/adminStore';
import { Package, ShoppingCart, TrendingUp, Plus, PackageSearch, BarChart3, Star } from 'lucide-react';

export default function AdminDashboard() {
  const stats = useStore(adminStats);
  const products = useStore(adminProducts);
  const [stats30d, setStats30d] = useState<AdminStats | null>(null);

  useEffect(() => {
    loadAdminStats(); // Totales
    loadAdminProducts();

    // Resumen 30 días
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    loadAdminStats(thirtyDaysAgo).then(res => {
      if (res) setStats30d(res as AdminStats);
    });
  }, []);

  const formatCurrency = (amount: number, currency = 'EUR') => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency
    }).format(amount);
  };

  const recentProducts = products.slice(0, 5);

  return (
    <div className="p-6 lg:p-8 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 font-medium">Resumen rápido de los últimos 30 días</p>
        </div>
        <a
          href="/admin/analytics"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow-lg shadow-indigo-600/20 w-fit"
        >
          <BarChart3 className="w-4 h-4" />
          Ver Analíticas Detalladas
        </a>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all hover:border-zinc-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Productos</p>
          </div>
          <p className="text-3xl font-black text-white">{stats?.totalProducts || 0}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all hover:border-zinc-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Activos</p>
          </div>
          <p className="text-3xl font-black text-white">{stats?.activeProducts || 0}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all hover:border-zinc-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pedidos (30d)</p>
          </div>
          <p className="text-3xl font-black text-white">{stats30d?.totalOrders || 0}</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all hover:border-zinc-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-pink-400" />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ingresos (30d)</p>
          </div>
          <p className="text-3xl font-black text-white">{formatCurrency(stats30d?.totalRevenue || 0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white px-1">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="/admin/products/new" className="group p-6 bg-indigo-600 hover:bg-indigo-500 rounded-2xl transition-all shadow-xl shadow-indigo-600/10">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <p className="font-bold text-white uppercase text-xs tracking-widest">Nuevo Producto</p>
              <p className="text-indigo-100 text-[10px] mt-1">Añadir al catálogo actual</p>
            </a>
            <a href="/admin/products" className="group p-6 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all hover:translate-y-[-2px]">
              <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-zinc-700 transition-colors">
                <PackageSearch className="w-5 h-5 text-zinc-400 group-hover:text-white" />
              </div>
              <p className="font-bold text-white uppercase text-xs tracking-widest">Gestionar Catálogo</p>
              <p className="text-zinc-500 text-[10px] mt-1">Ver y editar productos existentes</p>
            </a>
          </div>
        </div>

        {/* Recent Products */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white">Productos Recientes</h2>
            <a href="/admin/products" className="text-xs font-bold text-[#ff4d7d] hover:underline uppercase tracking-wider">Ver todos</a>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800">
            {recentProducts.map(product => (
              <a key={product.id} href={`/admin/products/${product.id}`} className="flex items-center gap-4 p-4 hover:bg-zinc-800/50 transition-colors">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                  {product.cover_image ? <img src={product.cover_image} alt={product.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600"><Package className="w-5 h-5" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate uppercase tracking-tight">{product.name}</p>
                  <p className="text-xs text-zinc-500 font-medium">{product.catalog_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white text-sm">{formatCurrency(product.price)}</p>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${product.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                    {product.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </a>
            ))}
            {recentProducts.length === 0 && <div className="p-8 text-center text-zinc-500 text-sm italic">No hay productos recientes</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
