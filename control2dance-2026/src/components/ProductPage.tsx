/**
 * Página de producto - Basado en el diseño del modal
 */

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { Disc, Play, Pause, Volume2, Calendar, Tag, Hash, Music, ShoppingCart, Sparkles, FileText, ChevronLeft, ChevronRight, CheckCircle2, Download, Users, ExternalLink } from 'lucide-react';
import type { Product } from '../types';
import { PLACEHOLDER_COVER } from '../constants';
import { cartItems, addToCart } from '../stores/cartStore';
import { ownedProducts } from '../stores/ownedProductsStore';

interface ProductPageProps {
  product: Product;
  prevProduct?: { slug: string; name: string; image: string } | null;
  nextProduct?: { slug: string; name: string; image: string } | null;
}

const ProductPage: React.FC<ProductPageProps> = ({ product, prevProduct, nextProduct }) => {
  const $cartItems = useStore(cartItems);
  const $ownedProducts = useStore(ownedProducts);
  const isInCart = Boolean($cartItems[product.id]);
  const isOwned = $ownedProducts.has(product.id);
  const orderId = $ownedProducts.get(product.id);
  const [imgSrc, setImgSrc] = useState(product.image);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Transición de página con carrusel
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right'>('right');
  const [incomingProduct, setIncomingProduct] = useState<{ name: string; image: string } | null>(null);
  
  // Swipe para móvil
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Función de navegación con efecto carrusel
  const navigateTo = (url: string, direction: 'left' | 'right') => {
    // Determinar qué producto viene
    const incoming = direction === 'left' ? nextProduct : prevProduct;
    if (incoming) {
      setIncomingProduct({
        name: incoming.name,
        image: incoming.image
      });
    }
    
    setTransitionDirection(direction);
    setIsTransitioning(true);
    
    // Pausar audio si está reproduciendo
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // Navegar después de la animación
    setTimeout(() => {
      window.location.href = url;
    }, 400);
  };

  // Navegación con teclado (flechas izq/der)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTransitioning) return;
      
      if (e.key === 'ArrowLeft' && prevProduct) {
        navigateTo(`/catalogo/${prevProduct.slug}`, 'right');
      } else if (e.key === 'ArrowRight' && nextProduct) {
        navigateTo(`/catalogo/${nextProduct.slug}`, 'left');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [prevProduct, nextProduct, isTransitioning]);

  // Swipe handlers para móvil
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (isTransitioning) return;
    
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    
    if (Math.abs(diff) > minSwipeDistance) {
      if (diff > 0 && nextProduct) {
        // Swipe izquierda -> siguiente
        navigateTo(`/catalogo/${nextProduct.slug}`, 'left');
      } else if (diff < 0 && prevProduct) {
        // Swipe derecha -> anterior
        navigateTo(`/catalogo/${prevProduct.slug}`, 'right');
      }
    }
  };

  // Resetear estado de imagen cuando cambia el producto
  useEffect(() => {
    setImgSrc(product.image);
    setHasError(false);
  }, [product.id, product.image]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;

      const updateProgress = () => {
        setProgress(audio.currentTime);
        setDuration(audio.duration || 0);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
      };

      audio.addEventListener('timeupdate', updateProgress);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('loadedmetadata', updateProgress);

      return () => {
        audio.removeEventListener('timeupdate', updateProgress);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('loadedmetadata', updateProgress);
      };
    }
  }, [currentTrack]);

  const togglePlay = (trackIndex: number) => {
    if (!product.audioUrls || product.audioUrls.length === 0) return;

    if (trackIndex !== currentTrack || !audioRef.current) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(product.audioUrls[trackIndex]);
      setCurrentTrack(trackIndex);
      setProgress(0);
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * duration;

    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Obtener nombre del track - primero usa el array tracks, luego fallback a URL
  const getTrackName = (url: string, trackIndex?: number) => {
    // Si tenemos el nombre guardado en tracks, usarlo directamente
    if (trackIndex !== undefined && product.tracks && product.tracks[trackIndex]) {
      const savedName = product.tracks[trackIndex];
      // Si el nombre guardado parece válido (no es solo un hash/timestamp), usarlo
      if (savedName && !/^\d{10,}/.test(savedName) && savedName.length > 3) {
        return cleanText(savedName);
      }
    }

    // Fallback: extraer del nombre del archivo en la URL
    try {
      const filename = url.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.mp3$/i, '');

      // Limpiar timestamps y strings aleatorios del nombre generado
      let cleanName = nameWithoutExt
        .replace(/-\d{13,}-[a-z0-9]{6}$/i, '') // Quitar timestamp-random del final
        .replace(/-Demo$/i, '')
        .replace(/_Demo$/i, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const sideMatch = cleanName.match(/\s([AB][AB]?[0-9]?)$/i);
      const sideCode = sideMatch ? sideMatch[1].toUpperCase() : '';
      if (sideMatch) {
        cleanName = cleanName.replace(/\s[AB][AB]?[0-9]?$/i, '').trim();
      }

      const volMatch = cleanName.match(/^(.+?\s(?:Vol\.?\s?\d+|Volume\s?\d+))\s+(.+)$/i);
      const presentsMatch = cleanName.match(/^(.+?\s(?:Presents|Feat\.?|Vs\.?))\s+(.+)$/i);

      let discName = product.brand || '';
      let songName = '';

      if (volMatch) {
        discName = volMatch[1];
        songName = volMatch[2];
      } else if (presentsMatch) {
        discName = presentsMatch[1];
        songName = presentsMatch[2];
      } else {
        const brandNormalized = product.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanNormalized = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (cleanNormalized.startsWith(brandNormalized)) {
          const brandWords = product.brand.split(/\s+/).length;
          const words = cleanName.split(/\s+/);
          discName = words.slice(0, brandWords).join(' ');
          songName = words.slice(brandWords).join(' ');
        } else {
          const words = cleanName.split(/\s+/);
          if (words.length >= 4) {
            const mid = Math.ceil(words.length / 2);
            discName = words.slice(0, mid).join(' ');
            songName = words.slice(mid).join(' ');
          } else {
            songName = cleanName;
          }
        }
      }

      const finalSong = songName || product.name || cleanName;
      const sideLabel = sideCode ? ` (${sideCode})` : '';

      if (discName && finalSong && discName.toLowerCase() !== finalSong.toLowerCase()) {
        return `${discName} - ${finalSong}${sideLabel}`;
      }
      return `${finalSong}${sideLabel}` || 'Track';
    } catch {
      return 'Track';
    }
  };

  const cleanText = (text?: string) => {
    if (!text) return '';
    let cleaned = text;

    if (cleaned.includes('Da Nu Style - Control 2 Dance - Hard Trance')) {
      return 'Control 2 Dance';
    }

    cleaned = cleaned
      .replace(/&#038;/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#8211;/g, '-')
      .replace(/&#8217;/g, "'")
      .replace(/&#039;/g, "'");

    return cleaned;
  };

  const renderPurchaseButton = () => (
    <button
      onClick={() => {
        if (isOwned && orderId) {
          window.location.href = `/dashboard/orders/${orderId}`;
        } else if (isInCart) {
          window.location.href = '/carrito';
        } else {
          addToCart(product);
        }
      }}
      className={`group relative w-full sm:w-auto px-8 py-4 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden ${
        isOwned
          ? 'bg-emerald-600 text-white shadow-emerald-600/25 hover:shadow-emerald-600/40'
          : isInCart
            ? 'bg-green-600 text-white shadow-green-600/25 hover:shadow-green-600/40'
            : 'bg-[#ff4d7d] text-white shadow-[#ff4d7d]/25 hover:shadow-[#ff4d7d]/40'
      }`}
    >
      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
      {isOwned ? (
        <>
          <Download className="w-4 h-4" />
          <span>Ya lo tienes</span>
        </>
      ) : isInCart ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          <span>En el Carrito</span>
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4" />
          <span>Añadir al Carrito</span>
        </>
      )}
    </button>
  );

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay de transición con carrusel de discos */}
      {isTransitioning && incomingProduct && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center pointer-events-none">
          <div className="relative w-full max-w-[600px] h-[400px] flex items-center justify-center overflow-hidden">
            {/* Disco actual saliendo */}
            <div 
              className={`absolute w-[280px] h-[280px] transition-all duration-400 ease-out ${
                transitionDirection === 'left' 
                  ? 'animate-slide-out-left' 
                  : 'animate-slide-out-right'
              }`}
            >
              <div className="relative w-full h-full">
                {/* Disco vinyl */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-800 shadow-2xl animate-spin-slow" 
                     style={{ animationDuration: '3s' }}>
                  <div className="absolute inset-0 rounded-full opacity-30" style={{
                    backgroundImage: 'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px)'
                  }} />
                </div>
                {/* Label del disco actual */}
                <div className="absolute inset-[25%] rounded-full overflow-hidden shadow-inner">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                  <div className="absolute top-1/2 left-1/2 w-[15%] h-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c0e1a] border-2 border-zinc-700" />
                </div>
              </div>
            </div>
            
            {/* Disco nuevo entrando */}
            <div 
              className={`absolute w-[280px] h-[280px] transition-all duration-400 ease-out ${
                transitionDirection === 'left' 
                  ? 'animate-slide-in-left' 
                  : 'animate-slide-in-right'
              }`}
            >
              <div className="relative w-full h-full">
                {/* Disco vinyl */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-800 shadow-2xl animate-spin-slow"
                     style={{ animationDuration: '3s' }}>
                  <div className="absolute inset-0 rounded-full opacity-30" style={{
                    backgroundImage: 'repeating-radial-gradient(circle at center, transparent 0, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 3px)'
                  }} />
                </div>
                {/* Label del disco nuevo */}
                <div className="absolute inset-[25%] rounded-full overflow-hidden shadow-inner">
                  <img
                    src={incomingProduct.image}
                    alt={incomingProduct.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                  <div className="absolute top-1/2 left-1/2 w-[15%] h-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0c0e1a] border-2 border-zinc-700" />
                </div>
              </div>
            </div>
            
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-radial from-[#ff4d7d]/20 via-transparent to-transparent pointer-events-none" />
          </div>
        </div>
      )}
      
      {/* Contenido principal */}
      <div className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-30' : 'opacity-100'}`}>
      {/* Navigation bar */}
      <div className="flex items-center justify-between mb-8">
        <a
          href="/catalogo"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al catálogo
        </a>

        <div className="flex items-center gap-4">
          {/* Hint sutil */}
          <span className="hidden lg:inline text-[10px] text-zinc-600 uppercase tracking-wider">
            ← → para navegar
          </span>
          <span className="lg:hidden text-[10px] text-zinc-600 uppercase tracking-wider">
            Desliza para navegar
          </span>
          
          {prevProduct && (
            <button
              onClick={() => navigateTo(`/catalogo/${prevProduct.slug}`, 'right')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={prevProduct.name}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>
          )}
          {nextProduct && (
            <button
              onClick={() => navigateTo(`/catalogo/${nextProduct.slug}`, 'left')}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={nextProduct.name}
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Price & Button at top */}
      <div className="lg:hidden mb-6 bg-gradient-to-r from-[#ff4d7d]/10 via-[#ff4d7d]/5 to-transparent rounded-2xl p-4 border border-[#ff4d7d]/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff4d7d]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{product.price.toFixed(2)}</span>
              <span className="text-lg font-bold text-[#ff4d7d]">€</span>
            </div>
            <p className="text-[8px] text-zinc-500 uppercase tracking-wider">WAV + FLAC</p>
          </div>
          {renderPurchaseButton()}
        </div>
      </div>

      <div className="bg-[#080a16] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col lg:flex-row">

        {/* Left Panel - Image & Audio */}
        <div className="w-full lg:w-[55%] relative flex flex-col border-r border-white/5 bg-black">
          <div className="relative flex-1 bg-[#151829] overflow-hidden flex items-center justify-center min-h-[400px] lg:min-h-[500px]">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-radial from-[#ff4d7d]/5 via-transparent to-transparent" />

            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                <Disc className="w-12 h-12 text-[#ff4d7d]/20 animate-spin" />
              </div>
            )}

            {/* Vinyl Record Container */}
            <div className="relative w-[55%] lg:w-[70%] aspect-square max-w-[400px] group">
              {/* Glow effect */}
              <div className={`absolute inset-0 rounded-full bg-[#ff4d7d]/20 blur-3xl transition-all duration-500 ${isPlaying ? 'opacity-60 scale-110 translate-x-[15%] lg:translate-x-[25%]' : 'opacity-20 scale-100 translate-x-0'}`} />

              {/* Vinyl Wrapper for Translation */}
              <div className={`absolute inset-0 transition-transform duration-700 ease-out ${isPlaying ? 'translate-x-[15%] lg:translate-x-[25%]' : 'translate-x-0'}`}>
                {/* Vinyl disc */}
                <div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-900 via-black to-zinc-800 shadow-2xl"
                  style={{
                    animation: isPlaying ? 'spin 3s linear infinite' : 'none',
                  }}
                >
                  {/* Vinyl grooves */}
                  <div className="absolute inset-[15%] rounded-full border border-zinc-700/30" />
                  <div className="absolute inset-[25%] rounded-full border border-zinc-700/20" />
                  <div className="absolute inset-[35%] rounded-full border border-zinc-700/10" />

                  {/* Center label */}
                  <div className="absolute inset-[38%] rounded-full bg-[#ff4d7d]/80 shadow-inner flex items-center justify-center overflow-hidden">
                    <img src={imgSrc} alt="Label" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-black/80 z-10" />
                  </div>
                </div>

                {/* Turntable Arm */}
                <div 
                  className={`absolute -top-12 -right-4 lg:-right-20 w-52 h-64 z-20 pointer-events-none transition-opacity duration-500 delay-200 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
                >
                  <svg 
                    viewBox="0 0 160 200" 
                    className={`w-full h-full drop-shadow-2xl transition-transform duration-700 ease-out origin-[130px_30px] ${isPlaying ? 'rotate-[25deg]' : 'rotate-[-10deg]'}`}
                  >
                    <circle cx="130" cy="30" r="12" fill="#27272a" stroke="#52525b" strokeWidth="3" />
                    <circle cx="130" cy="30" r="5" fill="#a1a1aa" />
                    <line x1="130" y1="30" x2="85" y2="135" stroke="#d4d4d8" strokeWidth="6" strokeLinecap="round" />
                    <g transform="translate(76, 130) rotate(25)">
                      <rect x="0" y="0" width="16" height="24" rx="2" fill="#18181b" />
                      <rect x="2" y="22" width="5" height="6" fill="#ef4444" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Cover sleeve */}
              <div
                className={`absolute rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out ${
                  isPlaying
                    ? 'inset-0 translate-x-[-15%] lg:translate-x-[-30%] rotate-[-3deg] scale-95'
                    : 'inset-0 translate-x-0 rotate-0 scale-100 hover:scale-[1.02] hover:rotate-1'
                }`}
              >
                <img
                  src={imgSrc}
                  onLoad={() => setLoading(false)}
                  referrerPolicy="no-referrer"
                  onError={() => {
                    if (!hasError) {
                      setHasError(true);
                      setImgSrc(PLACEHOLDER_COVER);
                    }
                    setLoading(false);
                  }}
                  className={`w-full h-full object-cover transition-all duration-1000 ${
                    loading ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
                  }`}
                  alt={product.name}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)] pointer-events-none rounded-2xl" />
              </div>

              {/* Reflection */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-8 bg-gradient-to-t from-[#ff4d7d]/10 to-transparent blur-xl rounded-full" />
            </div>

            {/* Status badge */}
            <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-500 animate-pulse' : 'bg-[#ff4d7d]'}`}></div>
                <span className="text-[8px] font-black text-white/80 uppercase tracking-widest">
                  {isPlaying ? 'NOW PLAYING' : 'MASTER READY'}
                </span>
              </div>
            </div>
          </div>

          {/* Audio Player Section */}
          <div className="p-8 bg-[#0a0d1f] border-t border-white/10">
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1">
                <h4 className="text-[9px] font-black text-[#ff4d7d] uppercase tracking-[0.3em]">Audio Preview</h4>
                <p className="text-xl font-black text-white uppercase tracking-tighter">{cleanText(product.name)}</p>
              </div>
            </div>

            {product.audioUrls && product.audioUrls.length > 0 ? (
              <div className="space-y-3">
                {product.audioUrls.map((url, idx) => (
                  <div key={idx} className={`bg-white/5 border ${currentTrack === idx && isPlaying ? 'border-[#ff4d7d]/50' : 'border-white/10'} rounded-xl p-4 transition-all`}>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => togglePlay(idx)}
                        className={`${currentTrack === idx && isPlaying ? 'bg-[#ff4d7d]' : 'bg-white/10'} p-3 rounded-lg hover:scale-105 transition-all`}
                      >
                        {currentTrack === idx && isPlaying ? (
                          <Pause className="w-4 h-4 text-white fill-current" />
                        ) : (
                          <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[10px] font-bold text-white truncate" title={getTrackName(url, idx)}>{getTrackName(url, idx)}</span>
                          {currentTrack === idx && (
                            <span className="text-[9px] font-bold text-zinc-500 shrink-0">
                              {formatTime(progress)} / {formatTime(duration)}
                            </span>
                          )}
                        </div>
                        {currentTrack === idx && (
                          <div
                            className="w-full bg-white/10 rounded-full h-2 overflow-visible cursor-pointer relative group/progress"
                            onClick={handleProgressClick}
                          >
                            <div
                              className="h-full bg-[#ff4d7d] rounded-full relative transition-all duration-100 pointer-events-none"
                              style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
                            >
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity border-2 border-[#ff4d7d]" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                <Volume2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
                No preview available
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Details */}
        <div className="flex-1 flex flex-col p-6 lg:p-8 bg-gradient-to-b from-[#04050a] to-[#080a14]">
          {/* Header */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-[#ff4d7d] text-[9px] font-black uppercase tracking-[0.4em] bg-[#ff4d7d]/10 px-3 py-1.5 rounded-full border border-[#ff4d7d]/20">
                Digital Archive
              </span>
              <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-wider">
                #{product.catalogNumber}
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black uppercase tracking-tight leading-none text-white">
              {cleanText(product.name)}
            </h1>
            <p className="text-[#ff4d7d] text-sm font-bold uppercase tracking-wide">{cleanText(product.brand)}</p>
          </div>

          {/* Purchase Section - Desktop only (moved up) */}
          <div className="hidden lg:block mb-6 bg-gradient-to-r from-[#ff4d7d]/10 via-[#ff4d7d]/5 to-transparent rounded-2xl p-6 border border-[#ff4d7d]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff4d7d]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <Sparkles className="absolute top-4 right-4 w-5 h-5 text-[#ff4d7d]/30" />

            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Master Studio Quality
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{product.price.toFixed(2)}</span>
                  <span className="text-xl font-bold text-[#ff4d7d]">€</span>
                </div>
                <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-1">WAV + FLAC included</p>
              </div>

              {renderPurchaseButton()}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="space-y-5 flex-1">
            {/* Tracklist from Discogs - Compact */}
            {product.tracklist && product.tracklist.length > 0 && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Tracklist</p>
                  <span className="text-[9px] text-zinc-600">{product.tracklist.length} tracks</span>
                </div>
                <div className="divide-y divide-white/5">
                  {product.tracklist.map((track, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="text-[#ff4d7d] font-mono w-4">{track.position}</span>
                        <span className="text-white">{track.title}</span>
                      </div>
                      {track.duration && (
                        <span className="text-zinc-500 font-mono text-[10px]">{track.duration}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {product.year && (
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                  <Calendar className="w-5 h-5 text-[#ff4d7d] mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Año</p>
                  <p className="text-2xl font-black text-white">{product.year}</p>
                </div>
              )}
              {product.label && (
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                  <Tag className="w-5 h-5 text-[#ff4d7d] mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Sello</p>
                  <p className="text-xs font-bold text-white truncate">{cleanText(product.label)}</p>
                </div>
              )}
              {product.format && (
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                  <Disc className="w-5 h-5 text-[#ff4d7d] mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Formato</p>
                  <p className="text-xs font-bold text-white">{product.format}</p>
                </div>
              )}
            </div>

            {/* Styles Tags */}
            {product.styles && product.styles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {product.styles.map((style, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-gradient-to-r from-[#ff4d7d]/20 to-[#ff4d7d]/5 rounded-full text-[9px] font-bold text-[#ff4d7d] uppercase tracking-wider border border-[#ff4d7d]/20 hover:border-[#ff4d7d]/40 transition-all cursor-default"
                  >
                    {style}
                  </span>
                ))}
              </div>
            )}

            {/* Credits - Compact */}
            {product.credits && product.credits.length > 0 && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Créditos</p>
                <div className="divide-y divide-white/5">
                  {product.credits.map((credit, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1.5 text-[11px]">
                      <span className="text-zinc-500">{credit.role}</span>
                      <span className="text-white">{credit.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Barcode & Discogs Link */}
            {(product.barcode || product.discogs_url) && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                {product.barcode && (
                  <span className="text-zinc-600">
                    Barcode: <span className="text-zinc-400 font-mono">{product.barcode}</span>
                  </span>
                )}
                {product.discogs_url && (
                  <a
                    href={product.discogs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#ff4d7d] hover:text-[#ff6b91] transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Ver en Discogs</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Estilos de animación inline */}
      <style>{`
        @keyframes slide-out-left {
          0% { transform: translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateX(-150%) rotate(-20deg); opacity: 0; }
        }
        @keyframes slide-out-right {
          0% { transform: translateX(0) rotate(0deg); opacity: 1; }
          100% { transform: translateX(150%) rotate(20deg); opacity: 0; }
        }
        @keyframes slide-in-left {
          0% { transform: translateX(150%) rotate(20deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0deg); opacity: 1; }
        }
        @keyframes slide-in-right {
          0% { transform: translateX(-150%) rotate(-20deg); opacity: 0; }
          100% { transform: translateX(0) rotate(0deg); opacity: 1; }
        }
        .animate-slide-out-left { animation: slide-out-left 0.4s ease-out forwards; }
        .animate-slide-out-right { animation: slide-out-right 0.4s ease-out forwards; }
        .animate-slide-in-left { animation: slide-in-left 0.4s ease-out forwards; }
        .animate-slide-in-right { animation: slide-in-right 0.4s ease-out forwards; }
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ProductPage;
