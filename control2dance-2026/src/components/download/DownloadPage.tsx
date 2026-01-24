import { useState, useEffect } from 'react';
import { Download, Loader2, AlertCircle, CheckCircle, Music, Clock, FileAudio } from 'lucide-react';

interface DownloadPageProps {
  token: string | undefined;
}

interface FileInfo {
  name: string;
  size: number;
}

interface DownloadInfo {
  product: {
    name: string;
    catalog_number: string;
  };
  files: FileInfo[];
  downloads_remaining: number;
  expires_at: string;
}

export default function DownloadPage({ token }: DownloadPageProps) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) {
      loadFiles();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadFiles = async () => {
    try {
      const response = await fetch(`/api/download/${token}/files`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error cargando archivos');
        setLoading(false);
        return;
      }

      setDownloadInfo(data);
    } catch (err) {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  const handleDownload = async (fileName: string) => {
    if (!token) return;

    setDownloading(fileName);
    setError(null);

    try {
      const response = await fetch(`/api/download/${token}?file=${encodeURIComponent(fileName)}`);

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Error al descargar');
        setDownloading(null);
        return;
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = fileName;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = decodeURIComponent(match[1]);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadedFiles(prev => new Set(prev).add(fileName));
    } catch (err) {
      setError('Error de conexión');
    }

    setDownloading(null);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  if (!token) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Enlace inválido</h1>
          <p className="text-zinc-400 mb-6">
            El enlace de descarga no es válido o ha expirado.
          </p>
          <a
            href="/"
            className="inline-block py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando archivos...</p>
        </div>
      </div>
    );
  }

  if (error && !downloadInfo) {
    return (
      <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Error</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <a
            href="/"
            className="inline-block py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileAudio className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            {downloadInfo?.product.name}
          </h1>
          <p className="text-zinc-500 text-sm">
            {downloadInfo?.product.catalog_number}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Files list */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-zinc-400 mb-3">
            {downloadInfo?.files.length} archivo{downloadInfo?.files.length !== 1 ? 's' : ''} disponible{downloadInfo?.files.length !== 1 ? 's' : ''}:
          </p>
          
          {downloadInfo?.files.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50"
            >
              <div className="flex items-center gap-3">
                <Music className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-white text-sm font-medium">{file.name}</p>
                  {file.size > 0 && (
                    <p className="text-zinc-500 text-xs">{formatSize(file.size)}</p>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => handleDownload(file.name)}
                disabled={downloading !== null}
                className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {downloading === file.name ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : downloadedFiles.has(file.name) ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {downloading === file.name ? 'Descargando...' : downloadedFiles.has(file.name) ? 'Descargado' : 'Descargar'}
              </button>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="pt-4 border-t border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>Descargas restantes: {downloadInfo?.downloads_remaining}</span>
          </div>
        </div>
      </div>

      {/* Help */}
      <p className="mt-6 text-sm text-zinc-500 text-center">
        ¿Problemas?{' '}
        <a href="mailto:soporte@control2dance.es" className="text-indigo-400 hover:text-indigo-300">
          Contacta con soporte
        </a>
      </p>
    </div>
  );
}
