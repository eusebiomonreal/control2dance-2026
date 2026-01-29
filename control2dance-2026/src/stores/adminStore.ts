/**
 * Admin Store - Estado del panel de administración
 */

import { atom, computed } from 'nanostores';
import { supabase } from '../lib/supabase';
import type { Product as DBProduct } from '../lib/database.types';

// Types
export interface AdminProduct extends DBProduct {
  // Campos adicionales para el admin
}

export interface AdminStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

export interface AdminOrder {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  customer_email: string;
  total: number;
  status: string;
  created_at: string;
}

// Atoms
export const adminProducts = atom<AdminProduct[]>([]);
export const adminLoading = atom(false);
export const adminError = atom<string | null>(null);
export const isAdmin = atom(false);
export const adminStats = atom<AdminStats | null>(null);
export const adminPeriodStats = atom<AdminStats | null>(null);
export const adminPeriodOrders = atom<AdminOrder[]>([]);

// Verificar si el usuario actual es admin
export async function checkAdminStatus(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      isAdmin.set(false);
      return false;
    }

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || data?.role !== 'admin') {
      isAdmin.set(false);
      return false;
    }

    isAdmin.set(true);
    return true;
  } catch (err) {
    console.error('Error checking admin status:', err);
    isAdmin.set(false);
    return false;
  }
}

// Cargar todos los productos (incluyendo inactivos)
export async function loadAdminProducts(): Promise<void> {
  adminLoading.set(true);
  adminError.set(null);

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    adminProducts.set(data || []);
  } catch (err) {
    console.error('Error loading admin products:', err);
    adminError.set('Error al cargar productos');
  } finally {
    adminLoading.set(false);
  }
}

// Cargar estadísticas del admin
export async function loadAdminStats(startDate?: string, endDate?: string): Promise<void> {
  try {
    // Total productos (siempre lo mismo)
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Productos activos
    const { count: activeProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Consulta base de órdenes
    let ordersQuery = supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_email, total, status, created_at', { count: 'exact' })
      .eq('status', 'paid');

    if (startDate) ordersQuery = ordersQuery.gte('created_at', startDate);
    if (endDate) ordersQuery = ordersQuery.lte('created_at', endDate);

    const { data: ordersData, count: totalOrders } = await ordersQuery.order('created_at', { ascending: false });

    const totalRevenue = (ordersData || []).reduce((sum, order) => sum + (order.total || 0), 0);

    const newStats = {
      totalProducts: totalProducts || 0,
      activeProducts: activeProducts || 0,
      totalOrders: totalOrders || 0,
      totalRevenue
    };

    if (startDate || endDate) {
      adminPeriodStats.set(newStats);
      adminPeriodOrders.set((ordersData as AdminOrder[]) || []);
    } else {
      adminStats.set(newStats);
      // Si cargamos "Todo", también actualizamos la lista de órdenes si no hay filtro de periodo
      adminPeriodOrders.set((ordersData as AdminOrder[]) || []);
    }
    return newStats;
  } catch (err) {
    console.error('Error loading admin stats:', err);
    return null;
  }
}

// Crear producto
export async function createProduct(productData: Omit<DBProduct, 'id' | 'created_at' | 'updated_at'>): Promise<DBProduct | null> {
  adminLoading.set(true);
  adminError.set(null);

  try {
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (error) throw error;

    // Actualizar lista local
    adminProducts.set([data, ...adminProducts.get()]);

    return data;
  } catch (err: any) {
    console.error('Error creating product:', err);
    adminError.set(err.message || 'Error al crear producto');
    return null;
  } finally {
    adminLoading.set(false);
  }
}

// Actualizar producto
export async function updateProduct(id: string, updates: Partial<DBProduct>): Promise<DBProduct | null> {
  adminLoading.set(true);
  adminError.set(null);

  try {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Actualizar lista local
    adminProducts.set(
      adminProducts.get().map(p => p.id === id ? data : p)
    );

    return data;
  } catch (err: any) {
    console.error('Error updating product:', err);
    adminError.set(err.message || 'Error al actualizar producto');
    return null;
  } finally {
    adminLoading.set(false);
  }
}

// Eliminar producto (soft delete)
export async function deleteProduct(id: string): Promise<boolean> {
  adminLoading.set(true);
  adminError.set(null);

  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    // Actualizar lista local
    adminProducts.set(
      adminProducts.get().map(p => p.id === id ? { ...p, is_active: false } : p)
    );

    return true;
  } catch (err: any) {
    console.error('Error deleting product:', err);
    adminError.set(err.message || 'Error al eliminar producto');
    return false;
  } finally {
    adminLoading.set(false);
  }
}

// Restaurar producto
export async function restoreProduct(id: string): Promise<boolean> {
  adminLoading.set(true);
  adminError.set(null);

  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: true })
      .eq('id', id);

    if (error) throw error;

    // Actualizar lista local
    adminProducts.set(
      adminProducts.get().map(p => p.id === id ? { ...p, is_active: true } : p)
    );

    return true;
  } catch (err: any) {
    console.error('Error restoring product:', err);
    adminError.set(err.message || 'Error al restaurar producto');
    return false;
  } finally {
    adminLoading.set(false);
  }
}

// Eliminar permanentemente
export async function hardDeleteProduct(id: string): Promise<boolean> {
  adminLoading.set(true);
  adminError.set(null);

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Actualizar lista local
    adminProducts.set(
      adminProducts.get().filter(p => p.id !== id)
    );

    return true;
  } catch (err: any) {
    console.error('Error hard deleting product:', err);
    adminError.set(err.message || 'Error al eliminar producto permanentemente');
    return false;
  } finally {
    adminLoading.set(false);
  }
}

// Producto por ID
export function getProductById(id: string): AdminProduct | undefined {
  return adminProducts.get().find(p => p.id === id);
}

// Computed: productos activos
export const activeAdminProducts = computed(adminProducts, products =>
  products.filter(p => p.is_active)
);

// Computed: productos inactivos
export const inactiveAdminProducts = computed(adminProducts, products =>
  products.filter(p => !p.is_active)
);
