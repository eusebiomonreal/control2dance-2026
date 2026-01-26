import { useState, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $user, $userName, $userAvatar, $isAuthenticated, logout } from '../../stores/authStore';
import { User, LogOut, ShoppingBag, Download, Settings, ChevronDown, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isAuthenticated = useStore($isAuthenticated);
  const userName = useStore($userName);
  const userAvatar = useStore($userAvatar);
  const user = useStore($user);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setIsAdmin(data?.role === 'admin');
    }
    checkAdmin();
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <a
          href="/auth/login"
          className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
        >
          Entrar
        </a>
        <a
          href="/auth/register"
          className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 bg-[#ff4d7d] hover:bg-[#ff6b94] text-white rounded-2xl transition-colors"
        >
          Registrarse
        </a>
      </div>
    );
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        <img
          src={userAvatar}
          alt={userName}
          className="w-8 h-8 rounded-full"
        />
        <span className="hidden sm:block text-sm text-zinc-300 max-w-[120px] truncate">
          {userName}
        </span>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50">
          <div className="p-3 border-b border-zinc-800">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
          </div>

          <div className="p-2">
            <a
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              Mi Cuenta
            </a>
            <a
              href="/dashboard/orders"
              className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              Mis Pedidos
            </a>
            <a
              href="/dashboard/downloads"
              className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Mis Descargas
            </a>
            <a
              href="/dashboard/settings"
              className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configuración
            </a>
            {isAdmin && (
              <a
                href="/admin"
                className="flex items-center gap-3 px-3 py-2 text-sm text-[#ff4d7d] hover:text-[#ff6b94] hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin Panel
              </a>
            )}
          </div>

          <div className="p-2 border-t border-zinc-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
