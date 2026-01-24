import React from 'react';
import { useStore } from '@nanostores/react';
import { 
  selectedProduct, filteredProducts, 
  handleNextProduct, handlePrevProduct, setSelectedProduct 
} from '../stores/productStore';
import { addToCart } from '../stores/cartStore';
import ProductModal from './ProductModal';

export default function ProductModalWrapper() {
  const $selectedProduct = useStore(selectedProduct);
  const $filtered = useStore(filteredProducts);

  if (!$selectedProduct) return null;

  const currentIndex = $filtered.findIndex(p => p.id === $selectedProduct.id);
  const hasNext = currentIndex !== -1 && currentIndex < $filtered.length - 1;
  const hasPrev = currentIndex > 0;

  return (
    <ProductModal 
      product={$selectedProduct} 
      onClose={() => setSelectedProduct(null)} 
      onAdd={addToCart}
      onNext={handleNextProduct}
      onPrev={handlePrevProduct}
      hasNext={hasNext}
      hasPrev={hasPrev}
    />
  );
}
