import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { ShoppingCart, Search } from 'lucide-react';
import { cartItems } from '../stores/cartStore';
import { searchQuery } from '../stores/productStore';
import UserMenu from './auth/UserMenu';

const Logo = () => (
  <a href="/" className="flex items-center select-none group cursor-pointer transition-transform duration-300 active:scale-95">
    <img
      src="/logo-blanco.svg"
      alt="Control2Dance Logo"
      className="h-8 md:h-10 w-auto object-contain"
    />
  </a>
);

export default function Header() {
  const $cartItems = useStore(cartItems);
  const $searchQuery = useStore(searchQuery);
  const [cartCount, setCartCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setCartCount(Object.keys($cartItems).length);
  }, [$cartItems]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#020308]/60 backdrop-blur-2xl border-b border-white/5 px-8 py-5">
      <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
        <Logo />
        <div className="flex items-center gap-8">
          <div className="relative hidden md:block">
            <input
              type="text"
              placeholder="BUSCAR EN EL ARCHIVO..."
              value={$searchQuery}
              onChange={e => {
                searchQuery.set(e.target.value);
                if (window.location.pathname !== '/catalogo') {
                  window.location.href = '/catalogo';
                }
              }}
              onFocus={() => {
                if (window.location.pathname !== '/catalogo') {
                  window.location.href = '/catalogo';
                }
              }}
              className="bg-white/5 border border-white/10 rounded-2xl px-10 py-3 text-[10px] font-black w-80 outline-none focus:border-[#ff4d7d] transition-all uppercase tracking-widest"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          </div>
          {isMounted && <UserMenu />}
          <a href="/carrito" className="relative p-3 bg-white/5 border border-white/10 rounded-2xl hover:scale-110 transition-transform">
            <ShoppingCart className="w-5 h-5" />
            {isMounted && cartCount > 0 && <span className="absolute -top-1 -right-1 bg-[#ff4d7d] text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg">{cartCount}</span>}
          </a>
        </div>
      </div>
    </nav>
  );
}
