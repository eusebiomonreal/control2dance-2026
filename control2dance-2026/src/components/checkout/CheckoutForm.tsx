import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { cartItems, removeFromCart } from '../../stores/cartStore';
import { $user, $isAuthenticated } from '../../stores/authStore';
import { ShoppingBag, Loader2, AlertCircle, User, Mail, Lock, Trash2 } from 'lucide-react';

export default function CheckoutForm() {
  const items = useStore(cartItems);
  const user = useStore($user);
  const isAuthenticated = useStore($isAuthenticated);

  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const cartItemsArray = Object.values(items);
  const subtotal = cartItemsArray.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal; // Sin impuestos por ahora

  const handleCheckout = async () => {
    if (!email) {
      setError('Por favor, introduce tu email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItemsArray.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            catalogNumber: item.catalogNumber
          })),
          customerEmail: email,
          userId: user?.id
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Redirigir a la URL de checkout de Stripe
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

  if (!isMounted) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-zinc-800 rounded-lg mx-auto mb-4 animate-pulse" />
        <div className="h-8 bg-zinc-800 rounded w-48 mx-auto mb-2 animate-pulse" />
      </div>
    );
  }

  if (cartItemsArray.length === 0) {
    return (
      <div className="text-center py-16">
        <ShoppingBag className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Tu carrito está vacío</h2>
        <p className="text-zinc-400 mb-6">Añade productos para continuar</p>
        <a
          href="/catalogo"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
        >
          Explorar catálogo
        </a>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-12">
      {/* Order Summary */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Resumen del pedido</h2>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="divide-y divide-zinc-800">
            {cartItemsArray.map((item) => (
              <div key={item.id} className="p-4 flex gap-4 group">
                <div className="w-20 h-20 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{item.name}</h3>
                  <p className="text-sm text-zinc-400">{item.brand}</p>
                  <p className="text-sm text-zinc-500">{item.catalogNumber}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <p className="font-medium text-white">€{item.price.toFixed(2)}</p>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-zinc-800/50 space-y-2">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span>€{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-white pt-2 border-t border-zinc-700">
              <span>Total</span>
              <span>€{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Form */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Datos de contacto</h2>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {!isAuthenticated && (
            <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
              <p className="text-indigo-300 text-sm mb-3">
                ¿Ya tienes cuenta? Inicia sesión para acceder a tus descargas
              </p>
              <a
                href="/auth/login"
                className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium"
              >
                <User className="w-4 h-4" />
                Iniciar sesión
              </a>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  disabled={isAuthenticated}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Recibirás los enlaces de descarga en este email
              </p>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading || !email}
              className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
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

            <p className="text-xs text-zinc-500 text-center">
              Pago seguro con Stripe. Tus datos están protegidos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
