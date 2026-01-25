import React, { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { 
  selectedProduct, filteredProducts, products,
  handleNextProduct, handlePrevProduct, setSelectedProduct,
  fetchProducts
} from '../stores/productStore';
import { addToCart } from '../stores/cartStore';
import ProductModal from './ProductModal';

export default function ProductModalWrapper() {
  const $selectedProduct = useStore(selectedProduct);
  const $filtered = useStore(filteredProducts);
  const $products = useStore(products);

  // Abrir modal automáticamente si hay un producto en la URL
  useEffect(() => {
    const productIdToOpen = (window as any).__OPEN_PRODUCT_ID__;
    
    if (productIdToOpen && !$selectedProduct) {
      const openProductModal = async () => {
        // Esperar a que los productos estén cargados
        if ($products.length === 0) {
          await fetchProducts();
        }
        
        // Buscar el producto
        const product = $products.find(p => p.id === productIdToOpen);
        if (product) {
          setSelectedProduct(product);
          // Limpiar para que no se reabra si se cierra
          delete (window as any).__OPEN_PRODUCT_ID__;
        }
      };
      
      openProductModal();
    }
  }, [$products, $selectedProduct]);

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
