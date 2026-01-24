import { useState } from 'react';
import { getDownloadUrl } from '../../stores/dashboardStore';
import { Download, Loader2, AlertCircle, CheckCircle, Music, Clock, FileAudio } from 'lucide-react';

interface DownloadPageProps {
  token: string | undefined;
}

export default function DownloadPage({ token }: DownloadPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  const handleDownload = async () => {
    if (!token) {
      setError('Token de descarga no válido');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await getDownloadUrl(token);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.url) {
      setDownloadStarted(true);
      // Abrir URL de descarga en nueva pestaña
      window.open(result.url, '_blank');
    }

    setLoading(false);
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

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileAudio className="w-10 h-10 text-indigo-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Descarga tu archivo</h1>
        <p className="text-zinc-400 mb-8">
          Haz clic en el botón para iniciar la descarga de tu master digital en formato WAV.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {downloadStarted && !error && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3 text-left">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-400 text-sm">
              La descarga ha comenzado. Si no inicia automáticamente, haz clic de nuevo.
            </p>
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={loading}
          className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generando enlace...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              {downloadStarted ? 'Descargar de nuevo' : 'Descargar archivo'}
            </>
          )}
        </button>

        {/* Info */}
        <div className="mt-8 pt-6 border-t border-zinc-800 space-y-3 text-left">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Music className="w-4 h-4" />
            <span>Formato WAV de alta calidad</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Clock className="w-4 h-4" />
            <span>Enlace válido por tiempo limitado</span>
          </div>
        </div>
      </div>

      {/* Help */}
      <p className="mt-6 text-sm text-zinc-500 text-center">
        ¿Problemas con la descarga?{' '}
        <a href="mailto:soporte@control2dance.es" className="text-indigo-400 hover:text-indigo-300">
          Contacta con soporte
        </a>
      </p>
    </div>
  );
}
