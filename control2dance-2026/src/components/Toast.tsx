import React from 'react';
import { useStore } from '@nanostores/react';
import { CheckCircle2, X, ShoppingCart } from 'lucide-react';
import { $toast, hideToast } from '../stores/toastStore';

export default function Toast() {
  const toast = useStore($toast);

  if (!toast) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[400] animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 px-5 py-4 flex items-center gap-4 min-w-[320px] max-w-[90vw]">
        <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">
            {toast.productName || 'Producto'} añadido
          </p>
          <p className="text-zinc-400 text-xs">
            {toast.message}
          </p>
        </div>

        <a
          href="/carrito"
          className="flex items-center gap-2 px-4 py-2 bg-[#ff4d7d] hover:bg-[#ff3366] text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0"
        >
          <ShoppingCart className="w-4 h-4" />
          Ver carrito
        </a>

        <button
          onClick={hideToast}
          className="p-1.5 text-zinc-500 hover:text-white transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
