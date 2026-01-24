import { useStore } from '@nanostores/react';
import { $orders } from '../../stores/dashboardStore';
import { ShoppingBag, ChevronRight, Package } from 'lucide-react';

interface OrderHistoryProps {
  limit?: number;
  showViewAll?: boolean;
}

export default function OrderHistory({ limit, showViewAll = false }: OrderHistoryProps) {
  const orders = useStore($orders);
  const displayOrders = limit ? orders.slice(0, limit) : orders;

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-500/10 text-green-400 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-400 border-red-500/20',
      refunded: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    };
    const labels = {
      paid: 'Pagado',
      pending: 'Pendiente',
      failed: 'Fallido',
      refunded: 'Reembolsado',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (orders.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Sin pedidos</h3>
        <p className="text-zinc-400 mb-4">Aún no has realizado ningún pedido</p>
        <a
          href="/catalogo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          Explorar catálogo
          <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Historial de Pedidos</h2>
        {showViewAll && orders.length > (limit || 0) && (
          <a
            href="/dashboard/orders"
            className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            Ver todos
            <ChevronRight className="w-4 h-4" />
          </a>
        )}
      </div>

      <div className="divide-y divide-zinc-800">
        {displayOrders.map((order) => (
          <a 
            key={order.id} 
            href={`/dashboard/orders/${order.id}`}
            className="block p-4 hover:bg-zinc-800/50 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm text-zinc-400">
                  {new Date(order.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="font-medium text-white">€{order.total.toFixed(2)}</p>
              </div>
              {getStatusBadge(order.status)}
            </div>

            {/* Items */}
            <div className="space-y-2">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-700 rounded-lg flex items-center justify-center overflow-hidden">
                      {(item as any).product?.cover_image ? (
                        <img
                          src={(item as any).product.cover_image}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.product_name}</p>
                      <p className="text-xs text-zinc-400">{item.product_catalog_number}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
