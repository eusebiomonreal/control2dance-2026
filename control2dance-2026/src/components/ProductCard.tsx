
import React, { useState } from 'react';
import { useStore } from '@nanostores/react';
import { PlusCircle, CheckCircle2, Disc, ShoppingCart, Download } from 'lucide-react';
import type { Product } from '../types';
import { PLACEHOLDER_COVER } from '../constants';
import { cartItems } from '../stores/cartStore';
import { ownedProducts } from '../stores/ownedProductsStore';

interface ProductCardProps {
  product: Product;
  onAdd: (p: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAdd }) => {
  const $cartItems = useStore(cartItems);
  const $ownedProducts = useStore(ownedProducts);
  const isInCart = Boolean($cartItems[product.id]);
  const isOwned = $ownedProducts.has(product.id);
  const orderId = $ownedProducts.get(product.id);
  const [isAdded, setIsAdded] = useState(false);
  const [imgSrc, setImgSrc] = useState(product.image);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Si ya lo tiene, ir al pedido específico
    if (isOwned && orderId) {
      window.location.href = `/dashboard/orders/${orderId}`;
      return;
    }

    // If already in cart, go to cart page
    if (isInCart) {
      window.location.href = '/carrito';
      return;
    }

    console.log('🔘 Button clicked for:', product.name);
    onAdd(product);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleError = () => {
    if (!hasError) {
      // Si falla la imagen del proxy, intentamos cargar la maestra directamente como último recurso
      setHasError(true);
      setImgSrc('https://control2dance.es/wp-content/uploads/edd/2026/01/unnamed-560x560.jpg');
    } else {
      // Si la maestra también falla, ponemos el placeholder
      setImgSrc(PLACEHOLDER_COVER);
    }
    setLoading(false);
  };

  // Generar URL del producto
  const productUrl = `/catalogo/${product.slug || product.catalogNumber?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || product.id}`;

  return (
    <a
      href={productUrl}
      className="group relative bg-[#090b1a] border border-white/5 shadow-2xl rounded-2xl overflow-hidden cursor-pointer transition-all hover:border-[#ff4d7d]/40 hover:-translate-y-2 block"
    >
      <div className="relative aspect-square overflow-hidden bg-black flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#05060b]">
            <Disc className="w-8 h-8 text-[#ff4d7d]/20 animate-spin" />
          </div>
        )}
        <img
          src={imgSrc}
          alt={product.name}
          onLoad={() => setLoading(false)}
          referrerPolicy="no-referrer"
          onError={handleError}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-700 ${loading ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
            } ${imgSrc === PLACEHOLDER_COVER ? 'p-12 opacity-30 grayscale' : 'brightness-[0.7] group-hover:brightness-100 group-hover:scale-110'
            }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-70"></div>
      </div>
      <div className="p-4 relative z-10">
        <div className="flex justify-between items-start mb-2 gap-3">
          <p className="text-[10px] font-black text-[#ff4d7d] uppercase truncate flex-1 tracking-widest">{product.brand}</p>
          <div className="flex items-center gap-2 shrink-0">
             <span className="text-sm font-black text-white">{product.price.toFixed(2)}€</span>
             <span className="text-[10px] font-black text-zinc-400 bg-white/5 px-2 py-0.5 rounded">{product.year}</span>
          </div>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-white line-clamp-1 mb-1 uppercase tracking-tight">{product.name}</h4>
            <p className="text-[10px] font-medium text-zinc-500 truncate">{product.label}</p>
          </div>
          
          <button
            onClick={handleAdd}
            className={`px-4 py-2 shrink-0 flex items-center justify-center gap-2 rounded-lg transition-all font-black uppercase text-[9px] tracking-widest ${
              isAdded
                ? 'bg-green-500 text-white'
                : isOwned
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : isInCart
                    ? 'bg-[#ff4d7d]/20 text-[#ff4d7d] border border-[#ff4d7d]/30'
                    : 'bg-white/5 text-white hover:bg-[#ff4d7d] hover:text-white group-hover:bg-white/10'
            }`}
          >
            {isAdded ? (
              <>
                <CheckCircle2 className="w-3 h-3" />
                <span>Añadido</span>
              </>
            ) : isOwned ? (
              <>
                <Download className="w-3 h-3" />
                <span>Ya lo tienes</span>
              </>
            ) : isInCart ? (
              <>
                <ShoppingCart className="w-3 h-3" />
                <span>En carrito</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-3 h-3" />
                <span>Añadir</span>
              </>
            )}
          </button>
        </div>
      </div>
    </a>
  );
};

export default ProductCard;
