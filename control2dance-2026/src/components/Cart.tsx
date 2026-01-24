import React from 'react';
import { useStore } from '@nanostores/react';
import { ShoppingCart, Trash2, ArrowLeft, Lock } from 'lucide-react';
import { cartItems, removeFromCart } from '../stores/cartStore';

export default function Cart() {
  const $cartItems = useStore(cartItems);
  const items = Object.values($cartItems);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="w-24 h-24 text-zinc-800 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-3">Tu carrito está vacío</h2>
        <p className="text-zinc-400 mb-8">Explora nuestro catálogo y añade productos</p>
        <a
          href="/catalogo"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#ff4d7d] hover:bg-[#ff3366] text-white font-bold rounded-2xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Explorar catálogo
        </a>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-6 items-center bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl group"
          >
            <div className="w-24 h-24 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-lg truncate">{item.name}</h3>
              <p className="text-zinc-400 text-sm">{item.brand}</p>
              <p className="text-zinc-500 text-xs">{item.catalogNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#ff4d7d]">€{item.price.toFixed(2)}</p>
              <p className="text-zinc-500 text-sm">x{item.quantity}</p>
            </div>
            <button
              onClick={() => removeFromCart(item.id)}
              className="p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              aria-label="Eliminar"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}

        <a
          href="/catalogo"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mt-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Seguir comprando
        </a>
      </div>

      {/* Order Summary */}
      <div className="lg:col-span-1">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 sticky top-28">
          <h3 className="text-xl font-bold text-white mb-6">Resumen del pedido</h3>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal ({items.length} {items.length === 1 ? 'producto' : 'productos'})</span>
              <span>€{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Impuestos</span>
              <span>Incluidos</span>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-white">Total</span>
              <span className="text-3xl font-black text-[#ff4d7d]">€{total.toFixed(2)}</span>
            </div>
          </div>

          <a
            href="/checkout"
            className="flex items-center justify-center gap-3 w-full py-4 bg-[#ff4d7d] hover:bg-[#ff3366] text-white font-bold rounded-2xl transition-colors"
          >
            <Lock className="w-5 h-5" />
            Proceder al pago
          </a>

          <p className="text-xs text-zinc-500 text-center mt-4">
            Pago seguro con Stripe
          </p>
        </div>
      </div>
    </div>
  );
}
