/**
 * RolesManager - Gestión de roles de usuarios (solo admin)
 */

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, ShieldCheck, ShieldX, User, Mail, Calendar, Loader2 } from 'lucide-react';

interface UserWithRole {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  last_sign_in_at: string | null;
}

export default function RolesManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setCurrentUserId(session?.user?.id || null);
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('No autenticado');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/admin/roles', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al cargar usuarios');
      } else {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error('Error loading users:', e);
      setError('Error al cargar usuarios');
    }

    setLoading(false);
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    // Confirmación
    const action = newRole === 'admin' ? 'dar permisos de administrador a' : 'quitar permisos de administrador a';
    const user = users.find(u => u.id === userId);
    if (!confirm(`¿Estás seguro de ${action} ${user?.email}?`)) {
      return;
    }

    setUpdating(userId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        alert('No autenticado');
        setUpdating(null);
        return;
      }

      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Error al cambiar rol');
      } else {
        await loadUsers();
      }
    } catch (e) {
      console.error('Error updating role:', e);
      alert('Error al cambiar rol');
    }

    setUpdating(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <ShieldX className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={loadUsers}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role === 'user');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-400" />
            Gestión de Roles
          </h2>
          <p className="text-zinc-400 mt-1">
            Administra los permisos de los usuarios
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            {admins.length} admin{admins.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-400" />
            {regularUsers.length} usuario{regularUsers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Admins */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          Administradores
        </h3>
        <div className="grid gap-3">
          {admins.map(user => (
            <div
              key={user.id}
              className="bg-zinc-800/50 border border-green-500/20 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-400" />
                    {user.email}
                    {user.id === currentUserId && (
                      <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">
                        Tú
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-500 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    Último acceso: {formatDate(user.last_sign_in_at)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => toggleRole(user.id, user.role)}
                disabled={updating === user.id || user.id === currentUserId}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                  ${user.id === currentUserId 
                    ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed' 
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`}
              >
                {updating === user.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <ShieldX className="w-4 h-4" />
                    Quitar admin
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Usuarios normales */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-zinc-400" />
          Usuarios
        </h3>
        {regularUsers.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">
            Todos los usuarios son administradores
          </p>
        ) : (
          <div className="grid gap-3">
            {regularUsers.map(user => (
              <div
                key={user.id}
                className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      {user.email}
                    </p>
                    <p className="text-sm text-zinc-500 flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      Último acceso: {formatDate(user.last_sign_in_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleRole(user.id, user.role)}
                  disabled={updating === user.id}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2
                    bg-green-500/20 text-green-400 hover:bg-green-500/30"
                >
                  {updating === user.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Hacer admin
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
