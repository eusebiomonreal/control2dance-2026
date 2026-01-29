import { useStore } from '@nanostores/react';
import { $downloads } from '../../stores/dashboardStore';
import { Download, Clock, AlertCircle, CheckCircle, Music } from 'lucide-react';

interface DownloadsListProps {
  limit?: number;
  showViewAll?: boolean;
}

export default function DownloadsList({ limit, showViewAll = false }: DownloadsListProps) {
  const downloads = useStore($downloads);
  const displayDownloads = limit ? downloads.slice(0, limit) : downloads;

  const getDownloadStatus = (download: typeof downloads[0]) => {
    const now = new Date();
    const expiresAt = new Date(download.expires_at);
    const isExpired = expiresAt < now;
    const isExhausted = download.download_count >= download.max_downloads;

    if (!download.is_active) {
      return { status: 'inactive', label: 'Desactivado', color: 'text-zinc-400' };
    }
    if (isExpired) {
      return { status: 'expired', label: 'Expirado', color: 'text-red-400' };
    }
    if (isExhausted) {
      return { status: 'exhausted', label: 'Límite alcanzado', color: 'text-yellow-400' };
    }
    return { status: 'active', label: 'Disponible', color: 'text-green-400' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (downloads.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
        <Download className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Sin descargas</h3>
        <p className="text-zinc-400">Tus productos aparecerán aquí después de comprarlos</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Mis Descargas</h2>
        {showViewAll && downloads.length > (limit || 0) && (
          <a
            href="/dashboard/downloads"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            Ver todas →
          </a>
        )}
      </div>

      <div className="divide-y divide-zinc-800">
        {displayDownloads.map((download) => {
          const statusInfo = getDownloadStatus(download);
          const product = download.product;
          const orderItem = (download as any).order_item;
          const canDownload = statusInfo.status === 'active';

          // Fallbacks de información
          const productName = product?.name || orderItem?.product_name || 'Producto';
          const catalogNumber = product?.catalog_number || orderItem?.product_catalog_number || '';
          const coverImage = product?.cover_image;

          return (
            <div key={download.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-4 flex-1">
                  {/* Product Image */}
                  <div className="w-16 h-16 bg-zinc-800 rounded-lg flex-shrink-0 overflow-hidden border border-white/5 shadow-lg">
                    {coverImage ? (
                      <img
                        src={coverImage}
                        alt={productName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                        <Music className="w-8 h-8 text-zinc-700" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white truncate text-base">
                      {productName}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono">
                      {catalogNumber}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                      <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusInfo.status === 'active' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                          statusInfo.status === 'exhausted' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                        {statusInfo.status === 'active' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {statusInfo.label}
                      </span>

                      <div className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                        <Download className="w-3.5 h-3.5 text-zinc-500" />
                        <span className={download.download_count >= download.max_downloads ? 'text-amber-500' : ''}>
                          {download.download_count}/{download.max_downloads}
                        </span>
                        <span className="text-zinc-600 ml-1">descargas</span>
                      </div>

                      <div className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-zinc-500">Expira:</span>
                        <span className="text-zinc-400">{formatDate(download.expires_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <div className="flex sm:justify-end pl-20 sm:pl-0">
                  {canDownload ? (
                    <a
                      href={`/download/${download.token}`}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 whitespace-nowrap"
                    >
                      <Download className="w-4 h-4" />
                      Descargar ahora
                    </a>
                  ) : (
                    <div className="px-4 py-2 bg-zinc-800/50 text-zinc-500 text-xs font-bold rounded-lg border border-zinc-700/50 cursor-not-allowed uppercase tracking-wider">
                      {statusInfo.label}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
