import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { filteredProducts, fetchProducts, loading } from '../stores/productStore';
import { addToCart } from '../stores/cartStore';
import ProductCard from './ProductCard';
import { Loader2 } from 'lucide-react';

export default function ProductGrid() {
  const $filtered = useStore(filteredProducts);
  const $loading = useStore(loading);

  useEffect(() => {
    fetchProducts();
  }, []);

  if ($loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#ff4d7d] animate-spin" />
      </div>
    );
  }

  if ($filtered.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">No se encontraron productos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 md:gap-12">
      {$filtered.map(p => (
        <ProductCard
          key={p.id}
          product={p}
          onAdd={addToCart}
        />
      ))}
    </div>
  );
}
