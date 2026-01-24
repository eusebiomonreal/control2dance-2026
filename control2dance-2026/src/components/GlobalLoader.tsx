import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { Loader2, Disc } from 'lucide-react';
import { loading, fetchProducts } from '../stores/productStore';

export default function GlobalLoader() {
  const $loading = useStore(loading);

  useEffect(() => {
    fetchProducts();
  }, []);

  if (!$loading) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-[#020308] flex flex-col items-center justify-center gap-10 p-10 text-center">
      <div className="relative">
         <Loader2 className="w-24 h-24 text-[#ff4d7d] animate-spin opacity-10" />
         <Disc className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-[#ff4d7d] animate-pulse" />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white">The Vault: Sincronizando Archivo...</p>
    </div>
  );
}
