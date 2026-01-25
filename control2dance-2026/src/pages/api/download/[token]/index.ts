import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

export const GET: APIRoute = async ({ params, request }) => {
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
    // Crear cliente con service key para bypass de RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verificar token
  const { data: downloadToken, error } = await supabase
    .from('download_tokens')
    .select('*, product:products(*)')
    .eq('token', token)
    .single();

  if (error || !downloadToken) {
    return new Response(JSON.stringify({ error: 'Token de descarga no válido' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar expiración
  if (new Date(downloadToken.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'El enlace de descarga ha expirado' }), {
      status: 410,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar límite de descargas
  if (downloadToken.download_count >= downloadToken.max_downloads) {
    return new Response(JSON.stringify({ error: 'Límite de descargas alcanzado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verificar que está activo
  if (!downloadToken.is_active) {
    return new Response(JSON.stringify({ error: 'Enlace desactivado' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const product = downloadToken.product as { master_file_path?: string; name?: string; catalog_number?: string } | null;
  if (!product?.master_file_path) {
    return new Response(JSON.stringify({ error: 'Archivo no disponible' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Obtener el archivo solicitado (query param ?file=nombre.wav)
  const url = new URL(request.url);
  const requestedFile = url.searchParams.get('file');
  
  const filePath = product.master_file_path.replace('downloads/', '');
  
  // Listar archivos en la carpeta
  const { data: files, error: listError } = await supabase.storage
    .from('downloads')
    .list(filePath);

  if (listError || !files || files.length === 0) {
    return new Response(JSON.stringify({ error: 'No se encontraron archivos' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Seleccionar archivo
  let targetFile = files.find(f => f.name.endsWith('.wav') || f.name.endsWith('.zip'));
  if (requestedFile) {
    targetFile = files.find(f => f.name === requestedFile);
  }

  if (!targetFile) {
    return new Response(JSON.stringify({ error: 'Archivo no encontrado' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Descargar el archivo desde Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('downloads')
    .download(`${filePath}/${targetFile.name}`);

  if (downloadError || !fileData) {
    return new Response(JSON.stringify({ error: 'Error descargando archivo' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Incrementar contador de descargas
  await supabase
    .from('download_tokens')
    .update({
      download_count: downloadToken.download_count + 1,
      last_download_at: new Date().toISOString()
    })
    .eq('id', downloadToken.id);

  // Obtener IP y User-Agent
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : 
                   request.headers.get('x-real-ip') || 
                   null;
  const userAgent = request.headers.get('user-agent') || null;

  // Log de descarga con IP y User-Agent
  await supabase.from('download_logs').insert({
    download_token_id: downloadToken.id,
    user_id: downloadToken.user_id,
    product_id: downloadToken.product_id,
    ip_address: clientIp,
    user_agent: userAgent
  });

  // Nombre del archivo para descarga
  const downloadName = `${product.name || product.catalog_number} - ${targetFile.name}`;

  // Devolver el archivo directamente
  return new Response(fileData, {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(downloadName)}"`,
      'Content-Length': fileData.size.toString(),
      'Cache-Control': 'no-store'
    }
  });

  } catch (err) {
    console.error('Error en /api/download/[token]:', err);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
