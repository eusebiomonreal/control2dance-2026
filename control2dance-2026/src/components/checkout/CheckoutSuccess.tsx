import { useEffect, useState } from 'react';
import { clearCart } from '../../stores/cartStore';
import { CheckCircle, Download, Mail, ShoppingBag, ArrowRight, AlertTriangle } from 'lucide-react';

interface CheckoutSuccessProps {
  sessionId: string | null;
}

interface OrderDetails {
  email: string;
  total: number;
  items: {
    name: string;
    downloadToken?: string;
  }[];
}

export default function CheckoutSuccess({ sessionId }: CheckoutSuccessProps) {
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Limpiar carrito al llegar a success (incluye localStorage)
    clearCart();

    // TODO: Fetch order details from API using sessionId
    // Por ahora mostramos un mensaje genérico
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto text-center">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">¡Compra Exitosa!</h1>
        <p className="text-zinc-400 mb-6">
          Tu pedido ha sido procesado correctamente
        </p>

        {/* SPAM Warning */}
        <div className="bg-amber-500/20 border-2 border-amber-500/50 rounded-xl p-4 mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <span className="text-lg font-bold text-amber-400">¡IMPORTANTE!</span>
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>
          <p className="text-amber-200 font-medium">
            Si no recibes el email en unos minutos, revisa tu carpeta de <span className="text-amber-400 font-bold">SPAM</span> o correo no deseado.
          </p>
        </div>

        {/* Info Cards */}
        <div className="space-y-4 mb-8">
          <div className="bg-zinc-800/50 rounded-xl p-4 flex items-start gap-4 text-left">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">Email de confirmación</h3>
              <p className="text-sm text-zinc-400">
                Te hemos enviado un email con los detalles de tu pedido y los enlaces de descarga.
              </p>
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-xl p-4 flex items-start gap-4 text-left">
            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-medium text-white mb-1">Descargas disponibles</h3>
              <p className="text-sm text-zinc-400">
                Podrás descargar tus archivos desde el email o desde tu cuenta (si estás registrado).
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="/catalogo"
            className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Seguir comprando
          </a>
          <a
            href="/dashboard"
            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Mis descargas
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Help Text */}
      <p className="mt-6 text-sm text-zinc-500">
        ¿Tienes problemas? Contacta con{' '}
        <a href="mailto:soporte@control2dance.es" className="text-indigo-400 hover:text-indigo-300">
          soporte@control2dance.es
        </a>
      </p>
    </div>
  );
}
