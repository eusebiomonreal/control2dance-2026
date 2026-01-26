import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { updateUserPassword, $authLoading, $authError } from '../../stores/authStore';
import { Lock, Loader2, AlertCircle, CheckCircle, Music } from 'lucide-react';

export default function SetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const loading = useStore($authLoading);
  const authError = useStore($authError);

  const error = localError || authError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const result = await updateUserPassword(password);
    if (result.success) {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Cuenta activada</h2>
          <p className="text-zinc-400 mb-6">
            Tu cuenta ha sido activada. Ya puedes acceder a tus compras y descargar tu musica.
          </p>
          <a
            href="/dashboard"
            className="inline-block py-3 px-6 bg-[#ff4d7d] hover:bg-[#e6366a] text-white font-medium rounded-lg transition-colors"
          >
            Ir a Mis Compras
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-[#ff4d7d]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Music className="w-7 h-7 text-[#ff4d7d]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Activa tu Cuenta</h1>
          <p className="text-zinc-400">
            Gracias por tu compra. Crea una contraseña para acceder a tus descargas en cualquier momento.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff4d7d] focus:border-transparent transition-all"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">Minimo 6 caracteres</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-300 mb-2">
              Confirmar Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff4d7d] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#ff4d7d] hover:bg-[#e6366a] disabled:bg-[#ff4d7d]/50 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Activando...
              </>
            ) : (
              'Activar Cuenta'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Al activar tu cuenta podras acceder a tus descargas, historial de compras y futuras promociones.
        </p>
      </div>
    </div>
  );
}
