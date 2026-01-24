import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $user, $authLoading, $isAuthenticated } from '../../stores/authStore';
import { loadDashboardData, $dashboardLoading } from '../../stores/dashboardStore';
import { LayoutDashboard, ShoppingBag, Settings, Loader2 } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: 'overview' | 'orders' | 'settings';
}

const navItems = [
  { id: 'overview', label: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', href: '/dashboard/orders', icon: ShoppingBag },
  { id: 'settings', label: 'Ajustes', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children, activeTab }: DashboardLayoutProps) {
  const user = useStore($user);
  const authLoading = useStore($authLoading);
  const isAuthenticated = useStore($isAuthenticated);
  const dashboardLoading = useStore($dashboardLoading);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  // Mostrar loading mientras carga auth
  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Redirigir si no está autenticado
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
    return null;
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sticky top-24">
            {/* User Info */}
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-800 mb-4">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.name || user?.email || 'U')}&background=6366f1&color=fff`}
                alt="Avatar"
                className="w-10 h-10 rounded-full"
              />
              <div className="min-w-0">
                <p className="font-medium text-white truncate">
                  {user?.user_metadata?.name || 'Usuario'}
                </p>
                <p className="text-sm text-zinc-400 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {dashboardLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
