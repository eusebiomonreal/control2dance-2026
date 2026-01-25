import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

export const GET: APIRoute = async ({ params }) => {
  const token = params.token;

  if (!token) {
    return new Response(JSON.stringify({ error: 'Token requerido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: 'Configuración del servidor incompleta' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verificar token
  const { data: downloadToken, error } = await supabase
    .from('download_tokens')
    .select('*, product:products(*)')
    .eq('token', token)
    .single();

  if (error || !downloadToken) {
    return new Response(JSON.stringify({ error: 'Token no válido' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificaciones
  if (new Date(downloadToken.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'Enlace expirado' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (downloadToken.download_count >= downloadToken.max_downloads) {
    return new Response(JSON.stringify({ error: 'Límite de descargas alcanzado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!downloadToken.is_active) {
    return new Response(JSON.stringify({ error: 'Enlace desactivado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const product = downloadToken.product as any;
  if (!product?.master_file_path) {
    return new Response(JSON.stringify({ error: 'Archivo no disponible' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const filePath = product.master_file_path.replace('downloads/', '');

  // Listar archivos
  const { data: files, error: listError } = await supabase.storage
    .from('downloads')
    .list(filePath);

  if (listError || !files) {
    return new Response(JSON.stringify({ error: 'Error listando archivos' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Filtrar solo archivos de audio
  const audioFiles = files
    .filter(f => f.name.endsWith('.wav') || f.name.endsWith('.flac') || f.name.endsWith('.zip'))
    .map(f => ({
      name: f.name,
      size: f.metadata?.size || 0
    }));

  return new Response(JSON.stringify({
    product: {
      name: product.name,
      catalog_number: product.catalog_number
    },
    files: audioFiles,
    downloads_remaining: downloadToken.max_downloads - downloadToken.download_count,
    expires_at: downloadToken.expires_at
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  } catch (err) {
    console.error('Error en /api/download/[token]/files:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
