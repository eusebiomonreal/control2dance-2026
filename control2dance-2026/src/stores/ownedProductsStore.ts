/**
 * Store para productos que el usuario ya ha comprado
 */
import { atom } from 'nanostores';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Map de product_id -> order_id para saber en qué pedido está
export const ownedProducts = atom<Map<string, string>>(new Map());
export const ownedProductsLoading = atom<boolean>(false);

let lastUserId: string | null = null;

/**
 * Cargar productos que el usuario ya ha comprado (pedidos pagados)
 */
export async function loadOwnedProducts(userId: string | null) {
  // Si no hay usuario, limpiar
  if (!userId) {
    ownedProducts.set(new Map());
    lastUserId = null;
    return;
  }

  // Evitar recargar si ya tenemos los datos de este usuario
  if (userId === lastUserId && ownedProducts.get().size > 0) {
    return;
  }

  ownedProductsLoading.set(true);
  lastUserId = userId;

  try {
    // Buscar todos los productos de pedidos pagados de este usuario
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        product_id,
        order_id,
        orders!inner(user_id, status)
      `)
      .eq('orders.user_id', userId)
      .eq('orders.status', 'paid');

    if (error) {
      console.error('Error loading owned products:', error);
      return;
    }

    const productOrderMap = new Map<string, string>();
    data?.forEach(item => {
      if (item.product_id && item.order_id) {
        productOrderMap.set(item.product_id, item.order_id);
      }
    });

    ownedProducts.set(productOrderMap);
    console.log('📦 Owned products loaded:', productOrderMap.size);
  } catch (e) {
    console.error('Error loading owned products:', e);
  } finally {
    ownedProductsLoading.set(false);
  }
}

/**
 * Verificar si el usuario ya posee un producto
 */
export function isProductOwned(productId: string): boolean {
  return ownedProducts.get().has(productId);
}

/**
 * Obtener el order_id de un producto comprado
 */
export function getProductOrderId(productId: string): string | undefined {
  return ownedProducts.get().get(productId);
}

/**
 * Limpiar productos al cerrar sesión
 */
export function clearOwnedProducts() {
  ownedProducts.set(new Map());
  lastUserId = null;
}
