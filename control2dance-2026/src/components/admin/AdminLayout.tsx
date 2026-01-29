/**
 * Admin Layout - Layout principal del panel de administración
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { isAdmin, checkAdminStatus } from '../../stores/adminStore';
import {
  LayoutDashboard,
  Package,
  Settings,
  LogOut,
  Menu,
  X,
  RefreshCw,
  ShoppingCart,
  Users,
  Shield,
  Mail,
  Star,
  BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Header from '../Header';
import Footer from '../Footer';
import { $isImpersonating, $authLoading } from '../../stores/authStore';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage?: 'dashboard' | 'analytics' | 'products' | 'featured' | 'orders' | 'customers' | 'roles' | 'newsletter' | 'settings';
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { id: 'analytics', label: 'Analíticas', icon: BarChart3, href: '/admin/analytics' },
  { id: 'products', label: 'Productos', icon: Package, href: '/admin/products' },
  { id: 'featured', label: 'Destacados', icon: Star, href: '/admin/featured' },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart, href: '/admin/orders' },
  { id: 'customers', label: 'Clientes', icon: Users, href: '/admin/customers' },
  { id: 'newsletter', label: 'Newsletter', icon: Mail, href: '/admin/newsletter' },
  { id: 'roles', label: 'Roles', icon: Shield, href: '/admin/roles' },
  { id: 'settings', label: 'Ajustes', icon: Settings, href: '/admin/settings' },
];

export default function AdminLayout({ children, currentPage = 'dashboard' }: AdminLayoutProps) {
  const adminStatus = useStore(isAdmin);
  const isImpersonating = useStore($isImpersonating);
  const authLoading = useStore($authLoading);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    async function init() {
      const isAdminUser = await checkAdminStatus();
      setLoading(false);

      if (!isAdminUser || isImpersonating) {
        window.location.href = '/dashboard';
      }
    }
    init();
  }, [isImpersonating, authLoading]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handleRebuild = async () => {
    if (rebuilding) return;

    setRebuilding(true);
    try {
      const response = await fetch('/api/admin/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        alert('Rebuild iniciado. El sitio se actualizará en unos minutos.');
      } else {
        const data = await response.json();
        alert(`Error: ${data.error || 'No se pudo iniciar el rebuild'}`);
      }
    } catch (err) {
      alert('Error al iniciar rebuild');
    } finally {
      setRebuilding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!adminStatus) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Acceso denegado</h1>
          <p className="text-zinc-400 mb-6">No tienes permisos de administrador.</p>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
          >
            Volver al dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <Header showSearch={false} />

      <div className="flex-1 flex pt-[72px] md:pt-[88px]" style={{ paddingTop: isImpersonating ? (typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(72px + 60px)' : 'calc(88px + 40px)') : undefined }}>
        {/* Sidebar - Desktop */}
        <aside
          className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:top-[88px] lg:bottom-0 bg-zinc-900 border-r border-zinc-800 z-30"
          style={{ top: isImpersonating ? 'calc(88px + 40px)' : '88px' }}
        >
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
            <span className="text-xl font-black text-white tracking-tight">
              ADMIN <span className="text-[#ff4d7d]">PANEL</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                    ? 'bg-[#ff4d7d] text-white shadow-lg shadow-[#ff4d7d]/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </a>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="p-4 border-t border-zinc-800 space-y-2 bg-zinc-900">
            <button
              onClick={handleRebuild}
              disabled={rebuilding}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${rebuilding ? 'animate-spin' : ''}`} />
              {rebuilding ? 'Publicando...' : 'Publicar cambios'}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </aside>

        {/* Main content wrapper */}
        <div className="flex-1 lg:pl-64 flex flex-col min-h-[calc(100vh-88px)]">
          {/* Mobile header (Admin) */}
          <div
            className="lg:hidden sticky z-40 h-14 bg-zinc-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 transition-all"
            style={{ top: isImpersonating ? 'calc(72px + 60px)' : '72px' }}
          >
            <span className="text-sm font-black text-white tracking-widest uppercase">
              Admin <span className="text-[#ff4d7d]">Panel</span>
            </span>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-lg border border-white/5"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <main className="flex-1 p-4 lg:p-8">
            {children}
          </main>

          <Footer />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[140] bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-[150] w-64 bg-zinc-900 transform transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <span className="text-xl font-bold text-white">C2D Admin</span>
        </div>
        <nav className="py-6 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <a
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800 space-y-2 bg-zinc-900">
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${rebuilding ? 'animate-spin' : ''}`} />
            {rebuilding ? 'Publicando...' : 'Publicar'}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </div>
  );
}
