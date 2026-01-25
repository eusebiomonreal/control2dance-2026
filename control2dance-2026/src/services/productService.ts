/**
 * Servicio de productos - Queries a Supabase
 */

import { supabase, createServerClient } from '../lib/supabase';
import type { Product as DBProduct, AudioPreview } from '../lib/database.types';
import type { Product } from '../types';

// Convertir producto de DB a formato frontend
function mapDBProductToFrontend(dbProduct: DBProduct): Product {
  const rawPreviews = dbProduct.audio_previews || [];

  // Manejar ambos formatos: array de strings (URLs) o array de objetos {url, track_name}
  let audioUrls: string[] = [];
  let tracks: string[] = [];

  if (Array.isArray(rawPreviews)) {
    if (typeof rawPreviews[0] === 'string') {
      // Es array de strings (URLs directas)
      audioUrls = rawPreviews as string[];
      tracks = audioUrls.map((url, i) => {
        // Extraer nombre del archivo como track name
        const fileName = url.split('/').pop() || `Track ${i + 1}`;
        return fileName.replace(/\.mp3$/i, '').replace(/-/g, ' ');
      });
    } else {
      // Es array de objetos {url, track_name}
      const previews = rawPreviews as AudioPreview[];
      audioUrls = previews.map(ap => ap.url);
      tracks = previews.map(ap => ap.track_name);
    }
  }

  return {
    id: dbProduct.id,
    name: dbProduct.name,
    brand: dbProduct.brand || '',
    price: dbProduct.price,
    description: dbProduct.description || '',
    image: dbProduct.cover_image || '',
    slug: dbProduct.slug,
    category: 'Digital Master' as any,
    rating: 5,
    stock: 999,
    tracks,
    audioUrls,
    youtubeUrls: [],
    year: dbProduct.year || undefined,
    label: dbProduct.label || undefined,
    country: dbProduct.country || undefined,
    format: dbProduct.format || undefined,
    styles: dbProduct.styles || undefined,
    genre: dbProduct.genre || undefined,
    catalogNumber: dbProduct.catalog_number,
    released: dbProduct.year || undefined,
    // Campos adicionales de Discogs
    discogs_url: (dbProduct as any).discogs_url || undefined,
    discogs_id: (dbProduct as any).discogs_id || undefined,
    tracklist: (dbProduct as any).tracklist || undefined,
    credits: (dbProduct as any).credits || undefined,
    barcode: (dbProduct as any).barcode || undefined,
  };
}

export const productService = {
  /**
   * Obtener todos los productos activos
   */
  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('year', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }

    return (data || []).map(mapDBProductToFrontend);
  },

  /**
   * Obtener producto por slug
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      console.error('Error fetching product by slug:', error);
      return null;
    }

    return mapDBProductToFrontend(data);
  },

  /**
   * Obtener producto por ID
   */
  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching product by id:', error);
      return null;
    }

    return mapDBProductToFrontend(data);
  },

  /**
   * Buscar productos
   */
  async searchProducts(query: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%,catalog_number.ilike.%${query}%`)
      .order('year', { ascending: false });

    if (error) {
      console.error('Error searching products:', error);
      return [];
    }

    return (data || []).map(mapDBProductToFrontend);
  },

  /**
   * Obtener productos por género
   */
  async getProductsByGenre(genre: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('genre', genre)
      .order('year', { ascending: false });

    if (error) {
      console.error('Error fetching products by genre:', error);
      return [];
    }

    return (data || []).map(mapDBProductToFrontend);
  },

  /**
   * Obtener productos por año
   */
  async getProductsByYear(year: string): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('year', year)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching products by year:', error);
      return [];
    }

    return (data || []).map(mapDBProductToFrontend);
  },

  /**
   * Obtener todos los slugs (para SSG)
   */
  async getAllSlugs(): Promise<string[]> {
    const { data, error } = await supabase
      .from('products')
      .select('slug')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching slugs:', error);
      return [];
    }

    return (data || []).map(p => p.slug);
  },

  /**
   * Obtener opciones únicas para filtros
   */
  async getFilterOptions(): Promise<{
    years: string[];
    genres: string[];
    styles: string[];
  }> {
    const { data, error } = await supabase
      .from('products')
      .select('year, genre, styles')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching filter options:', error);
      return { years: [], genres: [], styles: [] };
    }

    const years = [...new Set((data || []).map(p => p.year).filter(Boolean) as string[])].sort((a, b) => b.localeCompare(a));
    const genres = [...new Set((data || []).map(p => p.genre).filter(Boolean) as string[])].sort();
    const styles = [...new Set((data || []).flatMap(p => p.styles || []))].sort();

    return { years, genres, styles };
  }
};

// Servicio para uso en servidor (con service key)
export const productServiceServer = {
  ...productService,

  /**
   * Obtener todos los productos (incluyendo inactivos) - Solo admin
   */
  async getAllProducts(): Promise<DBProduct[]> {
    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all products:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Crear producto - Solo admin
   */
  async createProduct(product: Omit<DBProduct, 'id' | 'created_at' | 'updated_at'>): Promise<DBProduct | null> {
    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from('products')
      .insert(product)
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return null;
    }

    return data;
  },

  /**
   * Actualizar producto - Solo admin
   */
  async updateProduct(id: string, updates: Partial<DBProduct>): Promise<DBProduct | null> {
    const serverClient = createServerClient();
    const { data, error } = await serverClient
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return null;
    }

    return data;
  },

  /**
   * Eliminar producto (soft delete) - Solo admin
   */
  async deleteProduct(id: string): Promise<boolean> {
    const serverClient = createServerClient();
    const { error } = await serverClient
      .from('products')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return false;
    }

    return true;
  },

  /**
   * Eliminar producto permanentemente - Solo admin
   */
  async hardDeleteProduct(id: string): Promise<boolean> {
    const serverClient = createServerClient();
    const { error } = await serverClient
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error hard deleting product:', error);
      return false;
    }

    return true;
  }
};
