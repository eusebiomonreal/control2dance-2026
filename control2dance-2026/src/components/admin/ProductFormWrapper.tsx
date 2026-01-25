/**
 * ProductFormWrapper - Carga el producto y renderiza el formulario
 */

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Product as DBProduct } from '../../lib/database.types';
import ProductForm from './ProductForm';
import { Loader2, AlertCircle } from 'lucide-react';

interface ProductFormWrapperProps {
  productId: string;
}

export default function ProductFormWrapper({ productId }: ProductFormWrapperProps) {
  const [product, setProduct] = useState<DBProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();

        if (error) throw error;
        if (!data) throw new Error('Producto no encontrado');

        setProduct(data);
      } catch (err: any) {
        console.error('Error loading product:', err);
        setError(err.message || 'Error cargando producto');
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Error</h2>
        <p className="text-zinc-400 mb-6">{error || 'Producto no encontrado'}</p>
        <a
          href="/admin/products"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
        >
          Volver a productos
        </a>
      </div>
    );
  }

  return <ProductForm product={product} isEdit />;
}
