import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getDownloadUrl, getDownloadFiles, incrementDownloadCount } from '../../stores/dashboardStore';
import { ArrowLeft, Package, CreditCard, Calendar, Receipt, Download, Loader2, AlertCircle, Music, CheckCircle } from 'lucide-react';

interface OrderDetailProps {
  orderId: string;
}

interface DownloadToken {
  id: string;
  token: string;
  download_count: number;
  max_downloads: number;
  expires_at: string;
  is_active: boolean;
  product_id: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_catalog_number: string;
  price: number;
  product?: {
    cover_image: string | null;
  };
  download_token?: DownloadToken | null;
}

interface Order {
  id: string;
  created_at: string;
  paid_at: string | null;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  customer_email: string;
  customer_name: string;
  stripe_payment_intent: string | null;
  items: OrderItem[];
  order_number?: number;
}

interface FileInfo {
  name: string;
  size: number;
}

export default function OrderDetail({ orderId }: OrderDetailProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para descargas
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [files, setFiles] = useState<Record<string, FileInfo[]>>({});
  const [filesLoading, setFilesLoading] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    console.log('Loading order with ID:', orderId);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items(
          *,
          product:products(id, name, cover_image, catalog_number),
          download_tokens(*)
        )
      `)
      .eq('id', orderId)
      .single();

    console.log('Order query result:', { data, error });

    if (error || !data) {
      console.error('Order error:', error);
      setError('Pedido no encontrado');
    } else {
      // Transformar download_tokens array a download_token objeto
      const orderData = data as any;
      const transformedOrder: Order = {
        ...orderData,
        items: (orderData.items || []).map((item: any) => ({
          ...item,
          download_token: item.download_tokens?.[0] || null
        }))
      };
      setOrder(transformedOrder);
    }
    setLoading(false);
  };

  const loadFiles = async (item: OrderItem) => {
    if (!item.download_token?.token) return;

    const itemId = item.id;
    setFilesLoading(itemId);
    setDownloadError(null);

    const result = await getDownloadFiles(item.download_token.token);

    if (result.error) {
      setDownloadError(result.error);
    } else {
      setFiles(prev => ({ ...prev, [itemId]: result.files || [] }));
    }

    setFilesLoading(null);
  };

  const toggleExpand = async (item: OrderItem) => {
    if (expandedItem === item.id) {
      setExpandedItem(null);
    } else {
      setExpandedItem(item.id);
      if (!files[item.id]) {
        await loadFiles(item);
      }
    }
  };

  const handleDownload = async (item: OrderItem, fileName: string) => {
    if (!item.download_token?.token) return;

    setDownloading(fileName);
    setDownloadError(null);

    const result = await getDownloadUrl(item.download_token.token, fileName);

    if (result.error) {
      setDownloadError(result.error);
      setDownloading(null);
      return;
    }

    if (result.url) {
      const link = document.createElement('a');
      link.href = result.url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      setDownloadedFiles(prev => new Set(prev).add(fileName));

      // Actualizar contador en el estado local
      if (order) {
        setOrder({
          ...order,
          items: order.items.map(i =>
            i.id === item.id && i.download_token
              ? { ...i, download_token: { ...i.download_token, download_count: i.download_token.download_count + 1 } }
              : i
          )
        });
      }
    }

    setDownloading(null);
  };

  const handleDownloadAll = async (item: OrderItem) => {
    if (!item.download_token?.token || !files[item.id]) return;

    setDownloadError(null);
    const itemFiles = files[item.id];

    for (const file of itemFiles) {
      if (downloadedFiles.has(file.name)) continue;

      setDownloading(file.name);
      const result = await getDownloadUrl(item.download_token.token, file.name, true);

      if (result.error) {
        setDownloadError(result.error);
        break;
      }

      if (result.url) {
        const link = document.createElement('a');
        link.href = result.url;
        link.download = file.name;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);

        setDownloadedFiles(prev => new Set(prev).add(file.name));
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    // Incrementar contador solo 1 vez al final
    await incrementDownloadCount(item.download_token.token);

    // Actualizar estado local
    if (order) {
      setOrder({
        ...order,
        items: order.items.map(i =>
          i.id === item.id && i.download_token
            ? { ...i, download_token: { ...i.download_token, download_count: i.download_token.download_count + 1 } }
            : i
        )
      });
    }

    setDownloading(null);
  };

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
      <span className={`px-3 py-1 text-sm font-medium rounded-full border ${styles[status as keyof typeof styles] || styles.pending}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getDownloadStatus = (token: DownloadToken | null | undefined) => {
    if (!token) return { status: 'none', label: 'Sin token', color: 'text-zinc-500' };
    if (!token.is_active) return { status: 'inactive', label: 'Desactivado', color: 'text-zinc-400' };

    const now = new Date();
    const expiresAt = new Date(token.expires_at);
    if (expiresAt < now) return { status: 'expired', label: 'Expirado', color: 'text-red-400' };

    if (token.download_count >= token.max_downloads) {
      return { status: 'exhausted', label: 'Límite alcanzado', color: 'text-amber-400' };
    }

    return { status: 'active', label: 'Disponible', color: 'text-emerald-400', remaining: token.max_downloads - token.download_count };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Error</h3>
        <p className="text-zinc-400 mb-4">{error || 'Pedido no encontrado'}</p>
        <a
          href="/dashboard/orders"
          className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a pedidos
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <a
          href="/dashboard/orders"
          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </a>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Pedido</h1>
          <p className="text-sm text-zinc-400">
            {order.order_number ? `#${order.order_number}` : `#${order.id.slice(0, 8).toUpperCase()}`}
          </p>
        </div>
        {getStatusBadge(order.status)}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fecha */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Fecha</span>
          </div>
          <p className="text-white">{formatDate(order.created_at)}</p>
          {order.paid_at && order.paid_at !== order.created_at && (
            <p className="text-xs text-zinc-500 mt-1">Pagado: {formatDate(order.paid_at)}</p>
          )}
        </div>

        {/* Método de pago */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-zinc-400">Método de pago</span>
          </div>
          <p className="text-white">Tarjeta de crédito/débito</p>
          <p className="text-xs text-zinc-500 mt-1">Procesado por Stripe</p>
        </div>
      </div>

      {/* Productos con descargas integradas */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-800/20">
          <h2 className="text-lg font-semibold text-white">Productos</h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {order.items?.map((item) => {
            const statusInfo = getDownloadStatus(item.download_token);
            const isExpanded = expandedItem === item.id;
            const itemFiles = files[item.id] || [];

            return (
              <div key={item.id} className="flex flex-col">
                {/* Producto */}
                <div className="flex items-center gap-4 p-5 hover:bg-zinc-800/30 transition-colors">
                  <div className="w-14 h-14 bg-zinc-800 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/5 shadow-md">
                    {item.product?.cover_image ? (
                      <img
                        src={item.product.cover_image}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <Music className="w-6 h-6 text-zinc-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate text-base">{item.product_name}</p>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{item.product_catalog_number}</p>

                    {order.status === 'paid' && (
                      <div className="flex items-center gap-3 mt-2">
                        {item.download_token ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-widest border ${statusInfo.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              statusInfo.status === 'exhausted' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                'bg-red-500/10 text-red-500 border-red-500/20'
                              }`}>
                              {statusInfo.label}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-black/20 px-2 py-0.5 rounded">
                              <Download className="w-2.5 h-2.5" />
                              <span>{item.download_token.download_count}/{item.download_token.max_downloads}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-800/50 px-2 py-0.5 rounded">
                            Sin enlace disponible
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-white font-bold mr-4">€{item.price.toFixed(2)}</p>

                  {/* Botón de descargar */}
                  {order.status === 'paid' && statusInfo.status === 'active' && (
                    <button
                      onClick={() => toggleExpand(item)}
                      className={`flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 shadow-lg ${isExpanded
                        ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                        }`}
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Descargar</span>
                    </button>
                  )}
                </div>

                {/* Panel de archivos expandido */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="bg-zinc-800/50 rounded-xl p-4 ml-[4.5rem]">
                      {filesLoading === item.id ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                          <span className="ml-2 text-sm text-zinc-400">Cargando archivos...</span>
                        </div>
                      ) : itemFiles.length > 0 ? (
                        <div className="space-y-2">
                          {/* Botón descargar todos */}
                          {itemFiles.length > 1 && (
                            <button
                              onClick={() => handleDownloadAll(item)}
                              disabled={downloading !== null}
                              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors mb-3"
                            >
                              {downloading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                              Descargar todos ({itemFiles.length} archivos)
                            </button>
                          )}

                          {/* Lista de archivos */}
                          {itemFiles.map((file) => (
                            <div
                              key={file.name}
                              className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg"
                            >
                              <Music className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate">{file.name}</p>
                                {file.size > 0 && (
                                  <p className="text-xs text-zinc-500">{formatSize(file.size)}</p>
                                )}
                              </div>
                              {downloadedFiles.has(file.name) ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : (
                                <button
                                  onClick={() => handleDownload(item, file.name)}
                                  disabled={downloading !== null}
                                  className="p-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded-lg transition-colors"
                                >
                                  {downloading === file.name ? (
                                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4 text-white" />
                                  )}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400 text-center py-4">
                          No hay archivos disponibles
                        </p>
                      )}

                      {downloadError && (
                        <p className="text-sm text-red-400 mt-3 text-center">{downloadError}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resumen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
            <Receipt className="w-5 h-5 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Resumen</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Subtotal</span>
            <span className="text-white">€{order.subtotal.toFixed(2)}</span>
          </div>
          {order.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Impuestos</span>
              <span className="text-white">€{order.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-3 border-t border-zinc-800 flex justify-between">
            <span className="font-medium text-white">Total</span>
            <span className="font-bold text-xl text-white">€{order.total.toFixed(2)}</span>
          </div>
        </div>

        {order.stripe_payment_intent && (
          <p className="mt-4 pt-4 border-t border-zinc-800 text-xs text-zinc-500">
            Referencia: {order.stripe_payment_intent}
          </p>
        )}
      </div>

      {/* Info cliente */}
      <div className="text-xs text-zinc-500 space-y-1 text-center">
        <p>Cliente: {order.customer_name} • {order.customer_email}</p>
      </div>
    </div>
  );
}
