import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { ShoppingCart, Trash2, ArrowLeft, Lock, Loader2, AlertCircle, Mail, User } from 'lucide-react';
import { cartItems, removeFromCart } from '../stores/cartStore';
import { $user, $isAuthenticated } from '../stores/authStore';

export default function Cart() {
  const $cartItems = useStore(cartItems);
  const user = useStore($user);
  const isAuthenticated = useStore($isAuthenticated);

  const [email, setEmail] = useState('');
  const [newsletterAccepted, setNewsletterAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = Object.values($cartItems);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Auto-fill email when user loads
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const handleCheckout = async () => {
    if (!email) {
      setError('Por favor, introduce tu email');
      return;
    }

    if (!email.includes('@')) {
      setError('Por favor, introduce un email válido');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            catalogNumber: item.catalogNumber
          })),
          customerEmail: email,
          userId: user?.id,
          newsletterOptIn: newsletterAccepted
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

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
            className="flex gap-4 sm:gap-6 items-center bg-zinc-900/50 border border-zinc-800 p-4 sm:p-6 rounded-2xl group"
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm sm:text-lg truncate">{item.name}</h3>
              <p className="text-zinc-400 text-xs sm:text-sm">{item.brand}</p>
              <p className="text-zinc-500 text-xs hidden sm:block">{item.catalogNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-xl sm:text-2xl font-bold text-[#ff4d7d]">€{item.price.toFixed(2)}</p>
            </div>
            <button
              onClick={() => removeFromCart(item.id)}
              className="p-2 sm:p-3 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
              aria-label="Eliminar"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
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

      {/* Order Summary & Checkout */}
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

          {/* Login prompt */}
          {!isAuthenticated && (
            <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <p className="text-indigo-300 text-xs mb-2">
                ¿Ya tienes cuenta? Inicia sesión para acceder a tus descargas
              </p>
              <a
                href="/auth/login"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-xs font-medium"
              >
                <User className="w-3 h-3" />
                Iniciar sesión
              </a>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Email input */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
              Email para la descarga
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                disabled={isAuthenticated}
                className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#ff4d7d] focus:border-transparent transition-all disabled:opacity-50 text-sm"
              />
            </div>
            <p className="mt-1 text-[10px] text-zinc-500">
              Recibirás los enlaces de descarga en este email
            </p>
          </div>

          {/* Newsletter Checkbox */}
          {!isAuthenticated && (
            <div className="mb-6 flex items-start gap-2">
              <input
                type="checkbox"
                id="newsletter-cart"
                checked={newsletterAccepted}
                onChange={(e) => setNewsletterAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-[#ff4d7d] focus:ring-[#ff4d7d]"
              />
              <label htmlFor="newsletter-cart" className="text-xs text-zinc-400">
                Quiero recibir novedades y lanzamientos exclusivos en mi email
              </label>
            </div>
          )}

          {/* Pay button */}
          <button
            onClick={handleCheckout}
            disabled={loading || !email}
            className="flex items-center justify-center gap-3 w-full py-4 bg-[#ff4d7d] hover:bg-[#ff3366] disabled:bg-[#ff4d7d]/50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Pagar €{total.toFixed(2)}
              </>
            )}
          </button>

          <p className="text-[10px] text-zinc-500 text-center mt-4">
            Pago seguro con Stripe. Tus datos están protegidos.
          </p>
        </div>
      </div>
    </div>
  );
}
