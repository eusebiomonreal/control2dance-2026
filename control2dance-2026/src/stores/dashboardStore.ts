import { atom, computed } from 'nanostores';
import { supabase } from '../lib/supabase';
import type { OrderWithItems, DownloadWithProduct, ActivityWithMetadata } from '../lib/database.types';

// Estado
export const $orders = atom<OrderWithItems[]>([]);
export const $downloads = atom<DownloadWithProduct[]>([]);
export const $activities = atom<ActivityWithMetadata[]>([]);
export const $dashboardLoading = atom(false);
export const $dashboardError = atom<string | null>(null);

// Stats computadas
export const $stats = computed([$orders, $downloads], (orders, downloads) => {
  const paidOrders = orders.filter(o => o.status === 'paid');
  const totalSpent = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const totalDownloads = downloads.reduce((sum, d) => sum + d.download_count, 0);
  const availableDownloads = downloads.filter(d =>
    d.is_active &&
    d.download_count < d.max_downloads &&
    new Date(d.expires_at) > new Date()
  ).length;

  return {
    totalOrders: paidOrders.length,
    totalSpent,
    totalDownloads,
    availableDownloads,
    totalProducts: downloads.length
  };
});

// Cargar datos del dashboard
export async function loadDashboardData() {
  $dashboardLoading.set(true);
  $dashboardError.set(null);

  try {
    await Promise.all([
      loadOrders(),
      loadDownloads(),
      loadActivities()
    ]);
  } catch (error) {
    $dashboardError.set('Error cargando datos del dashboard');
    console.error('Dashboard load error:', error);
  }

  $dashboardLoading.set(false);
}

export async function loadOrders() {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(
        *,
        product:products(id, name, cover_image, catalog_number),
        download_tokens(*)
      )
    `)
    .order('created_at', { ascending: false }) as any;

  if (error) {
    console.error('Error loading orders:', error);
    return;
  }

  // Transformar download_tokens array a download_token objeto
  const transformedOrders = (orders || []).map((order: any) => ({
    ...order,
    items: (order.items || []).map((item: any) => ({
      ...item,
      download_token: item.download_tokens?.[0] || null
    }))
  }));

  $orders.set(transformedOrders as OrderWithItems[]);
}

export async function loadDownloads() {
  const { data: downloads, error } = await supabase
    .from('download_tokens')
    .select(`
      *,
      product:products(*),
      order_item:order_items(*)
    `)
    .order('created_at', { ascending: false }) as any;

  if (error) {
    console.error('Error loading downloads:', error);
    return;
  }

  $downloads.set((downloads || []) as DownloadWithProduct[]);
}

export async function loadActivities(limit = 20) {
  const { data: activities, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit) as any;

  if (error) {
    console.error('Error loading activities:', error);
    return;
  }

  $activities.set((activities || []) as ActivityWithMetadata[]);
}

// Log de actividad
export async function logActivity(
  action: string,
  description?: string,
  metadata?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase.from('activity_log') as any).insert({
    user_id: user.id,
    action,
    description,
    metadata
  });
}

// Validar y obtener URL de descarga
export async function getDownloadUrl(token: string): Promise<{ url?: string; error?: string }> {
  // Verificar token
  const { data: downloadToken, error } = await supabase
    .from('download_tokens')
    .select('*, product:products(*)')
    .eq('token', token)
    .single() as any;

  if (error || !downloadToken) {
    return { error: 'Token de descarga no válido' };
  }

  // Verificar expiración
  if (new Date(downloadToken.expires_at) < new Date()) {
    return { error: 'El enlace de descarga ha expirado' };
  }

  // Verificar límite de descargas
  if (downloadToken.download_count >= downloadToken.max_downloads) {
    return { error: 'Has alcanzado el límite de descargas para este producto' };
  }

  // Verificar que está activo
  if (!downloadToken.is_active) {
    return { error: 'Este enlace de descarga ha sido desactivado' };
  }

  // Generar signed URL desde Supabase Storage
  const product = downloadToken.product as { master_file_path?: string; catalog_number?: string } | null;
  if (!product?.master_file_path) {
    return { error: 'Archivo no disponible' };
  }

  // El master_file_path puede ser "downloads/C2D-XXX" o solo "C2D-XXX"
  // Extraemos solo la carpeta del catálogo
  const filePath = product.master_file_path.replace('downloads/', '');
  
  // Listar archivos en la carpeta del producto
  const { data: files, error: listError } = await supabase.storage
    .from('downloads')
    .list(filePath);

  if (listError || !files || files.length === 0) {
    return { error: 'No se encontraron archivos para descargar' };
  }

  // Si hay un solo archivo, descargarlo directamente
  // Si hay varios, crear URL para el primero (TODO: implementar ZIP o selección)
  const firstFile = files.find(f => f.name.endsWith('.wav') || f.name.endsWith('.zip'));
  if (!firstFile) {
    return { error: 'No se encontraron archivos de audio' };
  }

  const { data: signedUrlData, error: urlError } = await supabase.storage
    .from('downloads')
    .createSignedUrl(`${filePath}/${firstFile.name}`, 3600); // 1 hora

  if (urlError || !signedUrlData) {
    return { error: 'Error generando enlace de descarga' };
  }

  // Incrementar contador de descargas
  await (supabase.from('download_tokens') as any)
    .update({
      download_count: downloadToken.download_count + 1,
      last_download_at: new Date().toISOString()
    })
    .eq('id', downloadToken.id);

  // Log de descarga
  const { data: { user } } = await supabase.auth.getUser();
  await (supabase.from('download_logs') as any).insert({
    download_token_id: downloadToken.id,
    user_id: user?.id,
    product_id: downloadToken.product_id
  });

  await logActivity('download', `Descarga: ${product.master_file_path}`, {
    product_id: downloadToken.product_id
  });

  return { url: signedUrlData.signedUrl };
}
