/**
 * FeaturedRelease - Sección destacada con carrusel de productos
 */

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, ShoppingCart, ArrowRight, Disc3, Sparkles, ChevronLeft, ChevronRight, ChevronDown, SkipBack, SkipForward } from 'lucide-react';
import { productService } from '../services/productService';
import { addToCart } from '../stores/cartStore';
import type { Product } from '../types';

export default function FeaturedRelease() {
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const product = products[currentIndex] || null;

  useEffect(() => {
    loadFeaturedProducts();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => {
      mql.removeEventListener('change', update);
    };
  }, []);

  // Parar audio al cambiar de producto
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setProgress(0);
    setCurrentTrack(0);
  }, [currentIndex]);

  const loadFeaturedProducts = async () => {
    try {
      const featuredProducts = await productService.getFeaturedProducts();
      if (featuredProducts.length > 0) {
        setProducts(featuredProducts);
      } else {
        // Fallback: si no hay destacados, usar los 3 más recientes
        const allProducts = await productService.getProducts();
        setProducts(allProducts.slice(0, 3));
      }
    } catch (err) {
      console.error('Error loading featured products:', err);
    }
    setLoading(false);
  };

  const playTrack = (trackIndex: number) => {
    if (!product?.audioUrls?.[trackIndex]) return;

    // Si hay audio reproduciéndose, pausarlo
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Crear nuevo audio
    audioRef.current = new Audio(product.audioUrls[trackIndex]);
    audioRef.current.addEventListener('timeupdate', () => {
      if (audioRef.current) {
        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      }
    });
    audioRef.current.addEventListener('ended', () => {
      // Auto-play siguiente track si hay
      if (product.audioUrls && trackIndex < product.audioUrls.length - 1) {
        setCurrentTrack(trackIndex + 1);
        playTrack(trackIndex + 1);
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    });

    setCurrentTrack(trackIndex);
    audioRef.current.play();
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (!product?.audioUrls?.[currentTrack]) return;

    if (!audioRef.current) {
      playTrack(currentTrack);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const skipTrack = (direction: 'prev' | 'next') => {
    if (!product?.audioUrls) return;
    const totalTracks = product.audioUrls.length;
    let newTrack = currentTrack;
    
    if (direction === 'next') {
      newTrack = (currentTrack + 1) % totalTracks;
    } else {
      newTrack = currentTrack === 0 ? totalTracks - 1 : currentTrack - 1;
    }
    
    playTrack(newTrack);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const newTime = (percentage / 100) * audioRef.current.duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(percentage);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? products.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === products.length - 1 ? 0 : prev + 1));
  };

  if (loading) {
    return (
      <section className="max-w-screen-2xl mx-auto px-8 py-16">
        <div className="animate-pulse bg-zinc-900/50 rounded-3xl h-[400px]" />
      </section>
    );
  }

  if (!product) return null;

  const trackName = product.tracks?.[currentTrack] || product.tracks?.[0] || product.name;
  const totalTracks = product.audioUrls?.length || 0;

  return (
    <section className="max-w-screen-2xl mx-auto px-4 pb-8 pt-24 md:px-8 md:pb-16 md:pt-32 relative">
      {/* Badge flotante */}
      <div className="flex items-center justify-between mb-4 md:mb-6 relative z-50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#ff4d7d]" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ff4d7d]">
            {products.length > 1 ? 'Destacados' : 'Último lanzamiento'}
          </span>
        </div>
        
        {/* Navegación */}
        {products.length > 1 && (
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrevious}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2 hidden md:flex">
              {products.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentIndex ? 'bg-[#ff4d7d] w-6' : 'bg-white/20 hover:bg-white/40 w-2'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={goToNext}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        )}
      </div>

      <div 
        className="relative rounded-3xl group overflow-visible"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background con gradiente y blur */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a15] via-[#0f0f20] to-[#0a0a15] rounded-3xl" />
        
        {/* Imagen de fondo con efecto */}
        {product.image && (
          <div 
            className="absolute inset-0 opacity-20 blur-3xl scale-150 transition-transform duration-700 rounded-3xl overflow-hidden"
            style={{ 
              backgroundImage: `url(${product.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: isHovered ? 'scale(1.6)' : 'scale(1.5)'
            }}
          />
        )}

        {/* Grid de líneas decorativas */}
        <div className="absolute inset-0 opacity-5 rounded-3xl overflow-hidden">
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(90deg, #ff4d7d 1px, transparent 1px), linear-gradient(#ff4d7d 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Contenido principal - padding top extra para la aguja */}
        <div className="relative z-10 p-4 pt-8 md:p-16 md:pt-24 lg:p-20 lg:pt-28 flex flex-col md:flex-row gap-6 md:gap-16 items-center justify-center overflow-visible">
          
          {/* Vinyl Record Container - centrado en móvil */}
          <div className="w-full md:w-auto flex justify-center md:block">
            <div className="relative w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 flex-shrink-0 cursor-pointer" onClick={togglePlay}>
            {/* Glow effect */}
            <div className={`absolute inset-0 rounded-full bg-[#ff4d7d]/20 blur-3xl transition-all duration-500 ${isPlaying ? 'opacity-60 md:scale-110' : 'opacity-20 scale-100'}`} />

            {/* Vinyl disc - se mueve a la derecha al reproducir */}
            <div
              className={`absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-800 shadow-2xl md:transition-all md:duration-700 md:ease-out ${
                isPlaying
                  ? 'md:translate-x-[60%] md:scale-100 z-20 md:z-0'
                  : 'translate-x-0 z-0'
              }`}
              style={{
                animation: isPlaying && !isMobile ? 'spin 3s linear infinite' : 'none',
              }}
            >
              {/* Vinyl grooves */}
              <div className="absolute inset-[15%] rounded-full border border-zinc-700/30" />
              <div className="absolute inset-[25%] rounded-full border border-zinc-700/20" />
              <div className="absolute inset-[35%] rounded-full border border-zinc-700/10" />

              {/* Center label - galleta */}
              <div className="absolute inset-[38%] rounded-full bg-[#ff4d7d]/80 shadow-inner flex items-center justify-center overflow-hidden">
                {product.image && <img src={product.image} alt="Label" className="w-full h-full object-cover opacity-80" />}
                <div className="absolute w-2 h-2 rounded-full bg-black/80 z-10" />
              </div>
            </div>

            {/* Cover sleeve - siempre en su posición */}
            <div
              className={`absolute inset-0 rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out z-10 ${
                isPlaying
                  ? 'scale-100'
                  : 'hover:scale-[1.02] hover:rotate-1'
              }`}
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
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />
              <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] pointer-events-none rounded-2xl" />
              
              {/* Play overlay cuando no reproduce */}
              {!isPlaying && (
                <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-20 h-20 rounded-full bg-[#ff4d7d] flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              )}
            </div>

            {/* Turntable Arm - posicionado a la derecha donde sale el vinilo */}
            <div 
              className={`hidden md:block absolute -top-16 right-[-70%] w-56 h-80 z-30 pointer-events-none transition-opacity duration-500 delay-200 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
            >
              <svg 
                viewBox="0 0 160 220" 
                className={`w-full h-full drop-shadow-2xl transition-transform duration-700 ease-out origin-[130px_30px] ${isPlaying ? 'rotate-[5deg]' : 'rotate-[-20deg]'}`}
              >
                <circle cx="130" cy="30" r="12" fill="#27272a" stroke="#52525b" strokeWidth="3" />
                <circle cx="130" cy="30" r="5" fill="#a1a1aa" />
                <line x1="130" y1="30" x2="105" y2="185" stroke="#d4d4d8" strokeWidth="6" strokeLinecap="round" />
                <g transform="translate(96, 180) rotate(8)">
                  <rect x="0" y="0" width="16" height="24" rx="2" fill="#18181b" />
                  <rect x="2" y="22" width="5" height="6" fill="#ef4444" />
                </g>
              </svg>
            </div>
          </div>
          </div>

          {/* Info del disco */}
          <div className="w-full md:flex-1 text-center md:text-left space-y-4 md:space-y-6 px-2 md:px-0 md:pl-8 lg:pl-12 xl:pl-16">
            {/* Catalog number */}
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-full">
              <span className="text-xs font-bold text-[#ff4d7d] uppercase tracking-wider">
                {product.catalogNumber}
              </span>
              {product.year && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                  <span className="text-xs font-bold text-zinc-500">{product.year}</span>
                </>
              )}
            </div>

            {/* Nombre y artista */}
            <div>
              <h2 className="text-2xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight leading-none mb-2 md:mb-3">
                {product.name}
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-zinc-400 font-medium">
                {product.brand}
              </p>
            </div>

            {/* Track preview */}
            {product.audioUrls && product.audioUrls.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 justify-center md:justify-start">
                  {/* Controles de reproducción */}
                  <div className="flex items-center gap-3 justify-center">
                    {/* Botón anterior */}
                    {totalTracks > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); skipTrack('prev'); }}
                        className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
                      >
                        <SkipBack className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Botón play/pause */}
                    <button
                      onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isPlaying 
                          ? 'bg-[#ff4d7d] text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 ml-0.5" />
                      )}
                    </button>
                    
                    {/* Botón siguiente */}
                    {totalTracks > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); skipTrack('next'); }}
                        className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
                      >
                        <SkipForward className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {/* Info del track */}
                  <div className="text-center md:text-left w-full md:w-auto md:flex-1 min-w-0">
                    <p className="text-sm font-medium text-white px-4 md:px-0 md:truncate">{trackName}</p>
                    <p className="text-xs text-zinc-500">
                      {totalTracks > 1 ? `Track ${currentTrack + 1} de ${totalTracks}` : 'Preview disponible'}
                    </p>
                  </div>
                </div>
                
                {/* Barra de progreso secundaria en el texto */}
                {isPlaying && (
                  <div 
                    onClick={handleSeek}
                    className="h-1.5 bg-zinc-800 rounded-full overflow-visible cursor-pointer group"
                  >
                    <div 
                      className="h-full bg-[#ff4d7d] rounded-full relative"
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Género y estilos */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {product.genre && (
                <span className="px-3 py-1.5 bg-[#ff4d7d]/10 text-[#ff4d7d] text-xs font-bold uppercase tracking-wider rounded">
                  {product.genre}
                </span>
              )}
              {product.styles?.slice(0, 2).map((style, i) => (
                <span key={i} className="px-3 py-1.5 bg-white/5 text-zinc-400 text-xs font-bold uppercase tracking-wider rounded">
                  {style}
                </span>
              ))}
            </div>

            {/* Acciones */}
            <div className="flex flex-col gap-3 md:gap-4 w-full md:w-auto md:flex-row justify-center md:justify-start pt-4 md:pt-6">
              <button
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-[#ff4d7d] hover:bg-[#ff3366] text-white font-bold uppercase text-base tracking-wider rounded-xl transition-all hover:scale-105 shadow-lg shadow-[#ff4d7d]/25"
              >
                <ShoppingCart className="w-5 h-5" />
                Añadir al carrito
                <span className="text-white/70 text-lg">€{product.price.toFixed(2)}</span>
              </button>
              
              <a
                href={`/catalogo/${product.slug}`}
                className="flex items-center justify-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white font-bold uppercase text-base tracking-wider rounded-xl transition-all border border-white/10 hover:border-white/20"
              >
                Ver detalles
                <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Decoración esquina */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#ff4d7d]/10 to-transparent rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#ff4d7d]/5 to-transparent rounded-bl-3xl" />
        
        {/* Flecha animada hacia el catálogo - arriba a la derecha */}
        <a 
          href="#catalogo" 
          className="absolute top-6 right-6 z-50 group flex flex-col items-center gap-2"
        >
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-500 group-hover:text-[#ff4d7d] transition-colors">Catálogo</span>
          <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-[#ff4d7d]/30 group-hover:border-[#ff4d7d] group-hover:bg-[#ff4d7d]/10 transition-all bg-black/50 backdrop-blur-sm">
            <ChevronDown className="w-6 h-6 text-[#ff4d7d] animate-bounce" />
          </div>
        </a>
      </div>
    </section>
  );
}
