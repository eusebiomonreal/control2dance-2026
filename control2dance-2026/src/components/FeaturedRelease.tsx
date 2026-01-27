/**
 * FeaturedRelease - Sección destacada del último lanzamiento
 */

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, ShoppingCart, ArrowRight, Disc3, Sparkles } from 'lucide-react';
import { productService } from '../services/productService';
import { addToCart } from '../stores/cartStore';
import type { Product } from '../types';

export default function FeaturedRelease() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadLatestProduct();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const loadLatestProduct = async () => {
    try {
      const products = await productService.getProducts();
      if (products.length > 0) {
        // El primer producto es el más reciente (ordenado por año desc)
        setProduct(products[0]);
      }
    } catch (err) {
      console.error('Error loading featured product:', err);
    }
    setLoading(false);
  };

  const togglePlay = () => {
    if (!product?.audioUrls?.[0]) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(product.audioUrls[0]);
      audioRef.current.addEventListener('timeupdate', () => {
        if (audioRef.current) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setProgress(0);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
    }
  };

  if (loading) {
    return (
      <section className="max-w-screen-2xl mx-auto px-8 py-16">
        <div className="animate-pulse bg-zinc-900/50 rounded-3xl h-[400px]" />
      </section>
    );
  }

  if (!product) return null;

  const trackName = product.tracks?.[0] || product.name;

  return (
    <section className="max-w-screen-2xl mx-auto px-8 py-16 relative">
      {/* Badge flotante */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-4 h-4 text-[#ff4d7d]" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff4d7d]">
          Último lanzamiento
        </span>
      </div>

      <div 
        className="relative rounded-3xl overflow-hidden group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background con gradiente y blur */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a15] via-[#0f0f20] to-[#0a0a15]" />
        
        {/* Imagen de fondo con efecto */}
        {product.image && (
          <div 
            className="absolute inset-0 opacity-20 blur-3xl scale-150 transition-transform duration-700"
            style={{ 
              backgroundImage: `url(${product.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: isHovered ? 'scale(1.6)' : 'scale(1.5)'
            }}
          />
        )}

        {/* Grid de líneas decorativas */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(90deg, #ff4d7d 1px, transparent 1px), linear-gradient(#ff4d7d 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Contenido principal */}
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row gap-8 md:gap-12 items-center">
          
          {/* Cover del disco */}
          <div className="relative group/cover flex-shrink-0">
            {/* Glow effect */}
            <div className={`absolute -inset-4 bg-[#ff4d7d]/20 rounded-2xl blur-2xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-50'}`} />
            
            {/* Disco girando detrás */}
            <div className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${isPlaying ? 'translate-x-8 opacity-100' : 'translate-x-0 opacity-0'}`}>
              <Disc3 className={`w-48 h-48 md:w-64 md:h-64 text-zinc-800 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            </div>
            
            {/* Cover */}
            <div 
              className={`relative w-48 h-48 md:w-64 md:h-64 rounded-xl overflow-hidden shadow-2xl transition-all duration-500 cursor-pointer ${isPlaying ? '-translate-x-4' : ''}`}
              onClick={togglePlay}
            >
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                  <Disc3 className="w-16 h-16 text-zinc-600" />
                </div>
              )}
              
              {/* Play overlay */}
              <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isHovered && !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                <div className="w-16 h-16 rounded-full bg-[#ff4d7d] flex items-center justify-center">
                  <Play className="w-6 h-6 text-white ml-1" />
                </div>
              </div>

              {/* Playing indicator */}
              {isPlaying && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                  <div 
                    className="h-full bg-[#ff4d7d] transition-all duration-100"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Info del disco */}
          <div className="flex-1 text-center md:text-left space-y-4">
            {/* Catalog number */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
              <span className="text-[10px] font-bold text-[#ff4d7d] uppercase tracking-wider">
                {product.catalogNumber}
              </span>
              {product.year && (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-600" />
                  <span className="text-[10px] font-bold text-zinc-500">{product.year}</span>
                </>
              )}
            </div>

            {/* Nombre y artista */}
            <div>
              <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight leading-none mb-2">
                {product.name}
              </h2>
              <p className="text-lg md:text-xl text-zinc-400 font-medium">
                {product.brand}
              </p>
            </div>

            {/* Track preview */}
            {product.audioUrls && product.audioUrls.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isPlaying 
                      ? 'bg-[#ff4d7d] text-white' 
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4 ml-0.5" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{trackName}</p>
                  <p className="text-xs text-zinc-500">Preview disponible</p>
                </div>
              </div>
            )}

            {/* Género y estilos */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {product.genre && (
                <span className="px-2 py-1 bg-[#ff4d7d]/10 text-[#ff4d7d] text-[10px] font-bold uppercase tracking-wider rounded">
                  {product.genre}
                </span>
              )}
              {product.styles?.slice(0, 2).map((style, i) => (
                <span key={i} className="px-2 py-1 bg-white/5 text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded">
                  {style}
                </span>
              ))}
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start pt-4">
              <button
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-[#ff4d7d] hover:bg-[#ff3366] text-white font-bold uppercase text-sm tracking-wider rounded-xl transition-all hover:scale-105"
              >
                <ShoppingCart className="w-4 h-4" />
                Añadir al carrito
                <span className="text-white/70">€{product.price.toFixed(2)}</span>
              </button>
              
              <a
                href={`/catalogo/${product.slug}`}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-sm tracking-wider rounded-xl transition-all border border-white/10 hover:border-white/20"
              >
                Ver detalles
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Decoración esquina */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#ff4d7d]/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#ff4d7d]/5 to-transparent" />
      </div>
    </section>
  );
}
