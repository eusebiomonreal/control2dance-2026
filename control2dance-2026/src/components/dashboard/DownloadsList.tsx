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
          const canDownload = statusInfo.status === 'active';

          return (
            <div key={download.id} className="p-4 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-start gap-4">
                {/* Product Image */}
                <div className="w-16 h-16 bg-zinc-800 rounded-lg flex-shrink-0 overflow-hidden">
                  {product?.cover_image ? (
                    <img
                      src={product.cover_image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-6 h-6 text-zinc-600" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">
                    {product?.name || 'Producto'}
                  </h3>
                  <p className="text-sm text-zinc-400">
                    {product?.catalog_number || ''}
                  </p>

                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className={statusInfo.color}>
                      {statusInfo.status === 'active' ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {statusInfo.label}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {statusInfo.label}
                        </span>
                      )}
                    </span>

                    <span className="text-zinc-500 flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      {download.download_count}/{download.max_downloads}
                    </span>

                    <span className="text-zinc-500 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatDate(download.expires_at)}
                    </span>
                  </div>
                </div>

                {/* Download Button */}
                {canDownload && (
                  <a
                    href={`/download/${download.token}`}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Descargar
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
