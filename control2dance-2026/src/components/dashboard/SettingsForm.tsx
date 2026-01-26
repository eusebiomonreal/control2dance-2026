import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { $user, updateUserProfile, logout, $authLoading } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { User, Mail, Lock, Loader2, CheckCircle, AlertCircle, LogOut, ExternalLink } from 'lucide-react';

export default function SettingsForm() {
  const user = useStore($user);
  const loading = useStore($authLoading);

  // Profile state
  const [name, setName] = useState(user?.user_metadata?.name || '');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password reset state
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    const result = await updateUserProfile({ name });
    if (result.success) {
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } else {
      setProfileError('Error al actualizar el perfil');
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    setResetLoading(true);
    setResetError(null);
    setResetSuccess(false);

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setResetLoading(false);

    if (error) {
      setResetError('Error al enviar el email de recuperación');
    } else {
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 5000);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Información del Perfil</h2>

        {profileSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400 text-sm">Perfil actualizado correctamente</p>
          </div>
        )}

        {profileError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{profileError}</p>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
              Nombre
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full pl-11 pr-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-zinc-400 cursor-not-allowed"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">El email no se puede cambiar</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </form>
      </div>

      {/* Password Settings */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Cambiar Contraseña</h2>

        {resetSuccess && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-400 text-sm">Te hemos enviado un email para cambiar tu contraseña. Revisa tu bandeja de entrada (y spam).</p>
          </div>
        )}

        {resetError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 text-sm">{resetError}</p>
          </div>
        )}

        <p className="text-zinc-400 mb-4">
          Para cambiar tu contraseña, te enviaremos un enlace seguro a tu email.
        </p>

        <button
          onClick={handlePasswordReset}
          disabled={resetLoading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {resetLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Enviar enlace de cambio de contraseña
            </>
          )}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Cerrar Sesión</h2>
        <p className="text-zinc-400 mb-4">
          Cierra sesión en todos los dispositivos.
        </p>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
