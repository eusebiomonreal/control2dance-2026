import React from 'react';
import { useStore } from '@nanostores/react';
import { ShieldAlert, UserX, UserCheck } from 'lucide-react';
import { $isImpersonating, $user, $realAdminUser, stopImpersonation } from '../../stores/authStore';

export default function ImpersonationBanner() {
    const isImpersonating = useStore($isImpersonating);
    const user = useStore($user);
    const realAdmin = useStore($realAdminUser);

    if (!isImpersonating || !user) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 border-b border-white/20 shadow-2xl">
            <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg animate-pulse">
                        <ShieldAlert className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                        <p className="text-[10px] md:text-sm font-black text-white uppercase tracking-tighter">
                            MODO SUPLANTACIÓN ACTIVO
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

                <button
                    onClick={() => stopImpersonation()}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl transition-all group active:scale-95"
                >
                    <UserX className="w-3.5 h-3.5 text-white group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-wider">Detener</span>
                </button>
            </div>
        </div>
    );
}
