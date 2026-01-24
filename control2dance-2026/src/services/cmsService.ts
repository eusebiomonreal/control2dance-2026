
import type { Product } from '../types';

export const cmsService = {
  async getProducts(): Promise<Product[]> {
    try {
      const response = await fetch('/products.json');
      if (!response.ok) throw new Error('Failed to load products');
      const products: Product[] = await response.json();

      // Ordenar por año (descendente: más recientes primero)
      return products.sort((a, b) => parseInt(b.year || '0') - parseInt(a.year || '0'));
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }
};
