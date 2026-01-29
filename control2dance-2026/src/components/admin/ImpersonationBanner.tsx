import { useState } from 'react';
import { useStore } from '@nanostores/react';
import { ShieldAlert, UserX, UserCheck, Clock, RefreshCw } from 'lucide-react';
import {
    $isImpersonating,
    $user,
    $realAdminUser,
    stopImpersonation,
    consumeImpersonatedTokens,
    resetImpersonatedTokens
} from '../../stores/authStore';

export default function ImpersonationBanner() {
    const isImpersonating = useStore($isImpersonating);
    const user = useStore($user);
    const realAdmin = useStore($realAdminUser);
    const [loading, setLoading] = useState<string | null>(null);

    if (!isImpersonating || !user) return null;

    const handleConsume = async () => {
        setLoading('consume');
        const { success } = await consumeImpersonatedTokens();
        if (success) {
            alert('Tokens agotados con éxito. Recarga la página de descargas del usuario para ver el efecto.');
        }
        setLoading(null);
    };

    const handleReset = async () => {
        setLoading('reset');
        const { success } = await resetImpersonatedTokens();
        if (success) {
            alert('Tokens reseteados con éxito.');
        }
        setLoading(null);
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 border-b border-white/20 shadow-2xl">
            <div className="max-w-screen-2xl mx-auto px-4 py-2 flex flex-col md:flex-row items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg animate-pulse">
                        <ShieldAlert className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <p className="text-[10px] md:text-sm font-black text-white uppercase tracking-tighter">
                            MODO SUPLANTACIÓN
                        </p>
                        <div className="h-4 w-px bg-white/20 hidden sm:block"></div>
                        <div className="flex items-center gap-2">
                            <UserCheck className="w-3.5 h-3.5 text-white/80" />
                            <p className="text-[10px] md:text-sm font-medium text-white/90">
                                Viendo como: <span className="font-bold underline">{user.user_metadata?.name || user.email}</span>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botones de Control de Tokens */}
                    <div className="flex items-center bg-black/20 rounded-xl p-1 gap-1">
                        <button
                            onClick={handleConsume}
                            disabled={!!loading}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider ${loading === 'consume' ? 'bg-white/10 opacity-50' : 'hover:bg-amber-500/30 text-white/90 hover:text-white'
                                }`}
                            title="Gastar todos los tokens de descarga"
                        >
                            {loading === 'consume' ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Clock className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden lg:inline">Gastar Tokens</span>
                            <span className="lg:hidden">Gastar</span>
                        </button>

                        <button
                            onClick={handleReset}
                            disabled={!!loading}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[10px] font-bold uppercase tracking-wider ${loading === 'reset' ? 'bg-white/10 opacity-50' : 'hover:bg-emerald-500/30 text-white/90 hover:text-white'
                                }`}
                            title="Resetear tokens a 30 días"
                        >
                            {loading === 'reset' ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                            )}
                            <span className="hidden lg:inline">Resetear Tokens</span>
                            <span className="lg:hidden">Resetear</span>
                        </button>
                    </div>

                    <div className="w-px h-6 bg-white/20 mx-1"></div>

                    <button
                        onClick={() => stopImpersonation()}
                        disabled={!!loading}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl transition-all group active:scale-95"
                    >
                        <UserX className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">Detener</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
