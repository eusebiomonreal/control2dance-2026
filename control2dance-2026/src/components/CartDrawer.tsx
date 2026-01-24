import React from 'react';
import { useStore } from '@nanostores/react';
import { ShoppingCart, X, Trash2 } from 'lucide-react';
import { cartItems, isCartOpen, removeFromCart, toggleCart } from '../stores/cartStore';

export default function CartDrawer() {
  const $cartItems = useStore(cartItems);
  const $isCartOpen = useStore(isCartOpen);
  
  const items = Object.values($cartItems);

  return (
    <div className={`fixed inset-y-0 right-0 z-[250] w-full max-w-sm bg-[#05060b] shadow-2xl transition-transform duration-700 border-l border-white/5 ${$isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="h-full flex flex-col p-12">
        <div className="flex justify-between items-center mb-16">
          <h3 className="text-4xl font-black uppercase tracking-tighter text-[#ff4d7d]">CART</h3>
          <button onClick={() => toggleCart(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all"><X /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-8 scrollbar-hide">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-900 space-y-6">
              <ShoppingCart className="w-20 h-20 opacity-10" />
              <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-20">Archive is Empty</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-6 items-center bg-white/5 p-5 rounded-3xl border border-white/5 group relative">
                <img src={item.image} className="w-16 h-16 object-cover rounded-2xl group-hover:scale-105 transition-transform" />
                <div className="flex-1 truncate">
                  <p className="text-[10px] font-bold uppercase truncate tracking-tight">{item.name}</p>
                  <p className="text-[#ff4d7d] text-[12px] font-black mt-1">{item.price}€</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-zinc-800 hover:text-red-500 transition-colors p-2"><Trash2 className="w-5 h-5"/></button>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div className="pt-12 border-t border-white/10">
            <div className="flex justify-between items-end mb-10">
              <span className="text-[11px] font-black uppercase text-zinc-600">Total Archive</span>
              <span className="text-5xl font-black">{items.reduce((a,b) => a + (b.price*b.quantity), 0).toFixed(2)}€</span>
            </div>
            <a href="/checkout" className="block w-full bg-[#ff4d7d] py-7 rounded-3xl font-black uppercase text-[12px] tracking-[0.4em] shadow-xl active:scale-95 transition-all text-center">Secure Checkout</a>
          </div>
        )}
      </div>
    </div>
  );
}
