
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { X, Disc, Play, Pause, Volume2, Calendar, Tag, Hash, Music, ShoppingCart, Sparkles, FileText, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { Product } from '../types';
import { PLACEHOLDER_COVER } from '../constants';
import { cartItems } from '../stores/cartStore';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAdd: (p: Product) => void;
  onNext: () => void;
  onPrev: () => void;
  hasNext: boolean;
  hasPrev: boolean;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onAdd, onNext, onPrev, hasNext, hasPrev }) => {
  const $cartItems = useStore(cartItems);
  const isInCart = Boolean($cartItems[product.id]);
  const [imgSrc, setImgSrc] = useState(product.image);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Swipe logic states
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  // Reset state when product changes
  useEffect(() => {
    setImgSrc(product.image);
    setLoading(true);
    setCurrentTrack(0);
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [product]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && hasNext) {
      onNext();
    }
    if (isRightSwipe && hasPrev) {
      onPrev();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext) onNext();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, hasPrev, onNext, onPrev, onClose]);


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

  const getTrackName = (url: string) => {
    try {
      const filename = url.split('/').pop() || '';
      const nameWithoutExt = filename.replace(/\.mp3$/i, '');

      // Limpiar el nombre base
      let cleanName = nameWithoutExt
        .replace(/-Demo$/i, '')
        .replace(/_Demo$/i, '')
        .replace(/-/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Extraer código de cara si existe (A, A1, A2, AA, B, B1, B2, etc.)
      const sideMatch = cleanName.match(/\s([AB][AB]?[0-9]?)$/i);
      const sideCode = sideMatch ? sideMatch[1].toUpperCase() : '';
      if (sideMatch) {
        cleanName = cleanName.replace(/\s[AB][AB]?[0-9]?$/i, '').trim();
      }

      // Buscar patrones comunes de "Disco" y "Canción"
      // Patrones como "Da Nu Style Vol 4 American Chris Maxx" -> "Da Nu Style Vol 4 - American Chris Maxx"
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
        // Intentar usar el brand del producto para identificar la canción
        const brandNormalized = product.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanNormalized = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (cleanNormalized.startsWith(brandNormalized)) {
          const brandWords = product.brand.split(/\s+/).length;
          const words = cleanName.split(/\s+/);
          discName = words.slice(0, brandWords).join(' ');
          songName = words.slice(brandWords).join(' ');
        } else {
          // Fallback: dividir a la mitad aproximadamente
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

      // Construir el nombre final
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

    // Specific fix for known issue
    if (cleaned.includes('Da Nu Style - Control 2 Dance - Hard Trance')) {
      return 'Control 2 Dance';
    }

    // HTML Entity decoding
    cleaned = cleaned
      .replace(/&#038;/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#8211;/g, '-')
      .replace(/&#8217;/g, "'")
      .replace(/&#039;/g, "'");

    return cleaned;
  };

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="absolute inset-0 bg-[#0a0d1f]/98 backdrop-blur-2xl" onClick={onClose}></div>
      
      {/* Navigation Buttons (Desktop) */}
      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-[310] p-4 bg-black/20 hover:bg-[#ff4d7d] rounded-full backdrop-blur-md border border-white/10 transition-all group hidden md:flex"
        >
          <ChevronLeft className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>
      )}
      
      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-[310] p-4 bg-black/20 hover:bg-[#ff4d7d] rounded-full backdrop-blur-md border border-white/10 transition-all group hidden md:flex"
        >
          <ChevronRight className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
        </button>
      )}

      <div className="relative w-full max-w-5xl bg-[#080a16] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col md:flex-row h-full max-h-[90vh] animate-in zoom-in-95 duration-500">

        <div className="w-full md:w-[55%] h-full relative flex flex-col border-r border-white/5 bg-black">
          <div className="relative flex-1 bg-[#151829] overflow-hidden flex items-center justify-center">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-radial from-[#ff4d7d]/5 via-transparent to-transparent" />

            {loading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
                <Disc className="w-12 h-12 text-[#ff4d7d]/20 animate-spin" />
              </div>
            )}

            {/* Vinyl Record Container */}
            <div className="relative w-[55%] md:w-[70%] aspect-square max-w-[400px] group">
              {/* Glow effect */}
              <div className={`absolute inset-0 rounded-full bg-[#ff4d7d]/20 blur-3xl transition-all duration-500 ${isPlaying ? 'opacity-60 scale-110 translate-x-[15%] md:translate-x-[25%]' : 'opacity-20 scale-100 translate-x-0'}`} />

              {/* Vinyl Wrapper for Translation */}
              <div className={`absolute inset-0 transition-transform duration-700 ease-out ${isPlaying ? 'translate-x-[15%] md:translate-x-[25%]' : 'translate-x-0'}`}>
                {/* Vinyl disc (black part showing behind) */}
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

                  {/* Center label hole */}
                  <div className="absolute inset-[38%] rounded-full bg-[#ff4d7d]/80 shadow-inner flex items-center justify-center overflow-hidden">
                    <img src={imgSrc} alt="Label" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-black/80 z-10" />
                  </div>
                </div>

                {/* Turntable Arm */}
                <div 
                  className={`absolute -top-12 -right-4 md:-right-20 w-52 h-64 z-20 pointer-events-none transition-opacity duration-500 delay-200 ${isPlaying ? 'opacity-100' : 'opacity-0'}`}
                >
                  <svg 
                    viewBox="0 0 160 200" 
                    className={`w-full h-full drop-shadow-2xl transition-transform duration-700 ease-out origin-[130px_30px] ${isPlaying ? 'rotate-[25deg]' : 'rotate-[-10deg]'}`}
                  >
                    {/* Base Pivot */}
                    <circle cx="130" cy="30" r="12" fill="#27272a" stroke="#52525b" strokeWidth="3" />
                    <circle cx="130" cy="30" r="5" fill="#a1a1aa" />
                    
                    {/* Arm - Straight & Shorter to avoid label */}
                    <line x1="130" y1="30" x2="85" y2="135" stroke="#d4d4d8" strokeWidth="6" strokeLinecap="round" />
                    
                    {/* Cartridge/Head */}
                    <g transform="translate(76, 130) rotate(25)">
                      <rect x="0" y="0" width="16" height="24" rx="2" fill="#18181b" />
                      <rect x="2" y="22" width="5" height="6" fill="#ef4444" /> {/* Needle indicator */}
                    </g>
                  </svg>
                </div>
              </div>

              {/* Cover sleeve - offset to reveal vinyl */}
              <div
                className={`absolute rounded-2xl overflow-hidden shadow-2xl transition-all duration-700 ease-out ${
                  isPlaying
                    ? 'inset-0 translate-x-[-15%] md:translate-x-[-30%] rotate-[-3deg] scale-95'
                    : 'inset-0 translate-x-0 rotate-0 scale-100 hover:scale-[1.02] hover:rotate-1'
                }`}
              >
                <img
                  src={imgSrc}
                  onLoad={() => setLoading(false)}
                  referrerPolicy="no-referrer"
                  onError={() => {
                    setImgSrc(PLACEHOLDER_COVER);
                    setLoading(false);
                  }}
                  className={`w-full h-full object-cover transition-all duration-1000 ${
                    loading ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
                  }`}
                  alt={product.name}
                />

                {/* Shine effect on cover */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />

                {/* Edge shadow */}
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
                          <span className="text-[10px] font-bold text-white truncate" title={getTrackName(url)}>{getTrackName(url)}</span>
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
                              {/* Bolita arrastrable */}
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

        <div className="flex-1 flex flex-col p-6 md:p-8 overflow-visible md:overflow-y-auto scrollbar-hide bg-gradient-to-b from-[#04050a] to-[#080a14]">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[#ff4d7d] text-[9px] font-black uppercase tracking-[0.4em] bg-[#ff4d7d]/10 px-3 py-1.5 rounded-full border border-[#ff4d7d]/20">
                  Digital Archive
                </span>
                <span className="text-zinc-600 text-[9px] font-bold uppercase tracking-wider">
                  #{product.catalogNumber}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight leading-none text-white">
                {cleanText(product.name)}
              </h2>
              <p className="text-[#ff4d7d] text-sm font-bold uppercase tracking-wide">{cleanText(product.brand)}</p>
            </div>
            <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 hover:rotate-90 transition-all duration-300">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-5 flex-1">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                <Calendar className="w-5 h-5 text-[#ff4d7d] mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Año</p>
                <p className="text-2xl font-black text-white">{product.year}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                <FileText className="w-5 h-5 text-[#ff4d7d] mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Referencia</p>
                <p className="text-sm font-black text-white truncate">{product.catalogNumber}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                <Tag className="w-5 h-5 text-[#ff4d7d] mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Sello</p>
                <p className="text-xs font-bold text-white truncate">{cleanText(product.label)}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all group">
                <Music className="w-5 h-5 text-[#ff4d7d] mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Género</p>
                <p className="text-xs font-bold text-white">{product.genre}</p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all group col-span-2">
                <Hash className="w-5 h-5 text-[#ff4d7d] mb-3 group-hover:scale-110 transition-transform" />
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Tracks</p>
                <p className="text-2xl font-black text-white">{product.tracks.length}</p>
              </div>
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

          </div>

          {/* Purchase Section */}
          <div className="mt-auto pt-6 bg-gradient-to-r from-[#ff4d7d]/10 via-[#ff4d7d]/5 to-transparent rounded-2xl p-6 border border-[#ff4d7d]/20 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff4d7d]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <Sparkles className="absolute top-4 right-4 w-5 h-5 text-[#ff4d7d]/30" />

            <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
                  Master Studio Quality
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">{product.price.toFixed(2)}</span>
                  <span className="text-xl font-bold text-[#ff4d7d]">€</span>
                </div>
                <p className="text-[8px] text-zinc-600 uppercase tracking-wider mt-1">WAV + FLAC included</p>
              </div>

              <button
                onClick={() => onAdd(product)}
                className={`group relative w-full sm:w-auto px-8 py-4 rounded-xl font-black uppercase text-[11px] tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden ${
                  isInCart
                    ? 'bg-green-600 text-white shadow-green-600/25 hover:shadow-green-600/40'
                    : 'bg-[#ff4d7d] text-white shadow-[#ff4d7d]/25 hover:shadow-[#ff4d7d]/40'
                }`}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                {isInCart ? (
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
