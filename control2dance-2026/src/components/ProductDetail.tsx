import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { products, fetchProducts } from '../stores/productStore';
import { addToCart } from '../stores/cartStore';
import { ownedProducts } from '../stores/ownedProductsStore';
import type { Product } from '../types';
import { ShoppingCart, Play, Pause, ChevronLeft, Music, Calendar, Tag, Globe, Disc, Download, CheckCircle, ExternalLink, Users, ListMusic } from 'lucide-react';
import ReactPlayer from 'react-player';

interface ProductDetailProps {
  slug: string;
  initialProduct?: Product; // Producto pre-cargado desde SSG/SSR
}

export default function ProductDetail({ slug, initialProduct }: ProductDetailProps) {
  const allProducts = useStore(products);
  const $ownedProducts = useStore(ownedProducts);
  const [product, setProduct] = useState<Product | null>(initialProduct || null);
  const [loading, setLoading] = useState(!initialProduct);
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);
  
  const isOwned = product ? $ownedProducts.has(product.id) : false;
  const orderId = product ? $ownedProducts.get(product.id) : undefined;

  useEffect(() => {
    // Si ya tenemos el producto pre-cargado, no hacer nada
    if (initialProduct) {
      setProduct(initialProduct);
      setLoading(false);
      return;
    }

    async function loadProduct() {
      if (allProducts.length === 0) {
        await fetchProducts();
      }

      // Buscar por slug (usando catalogNumber normalizado o id)
      const found = allProducts.find(p =>
        p.catalogNumber?.toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug ||
        p.name.toLowerCase().replace(/\s+/g, '-') === slug ||
        p.id === slug
      );

      setProduct(found || null);
      setLoading(false);
    }

    loadProduct();
  }, [slug, allProducts, initialProduct]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <Music className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Producto no encontrado</h1>
        <p className="text-zinc-400 mb-6">El producto que buscas no existe o ha sido eliminado.</p>
        <a
          href="/catalogo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al catálogo
        </a>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product);
  };

  const togglePlay = (index: number) => {
    setPlayingTrack(playingTrack === index ? null : index);
  };

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-8">
        <a
          href="/catalogo"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al catálogo
        </a>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Image */}
        <div className="aspect-square bg-zinc-900 rounded-2xl overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="space-y-5">
          {/* Header */}
          <div>
            <p className="text-sm text-indigo-400 font-medium mb-2">{product.catalogNumber}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{product.name}</h1>
            <p className="text-xl text-zinc-300">{product.brand}</p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-white">€{product.price.toFixed(2)}</span>
            <span className="text-zinc-500 text-sm">IVA incluido</span>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-zinc-400 leading-relaxed">{product.description}</p>
          )}

          {/* Quick Info */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {product.year && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>{product.year}</span>
              </div>
            )}
            {product.label && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Disc className="w-4 h-4 text-indigo-400" />
                <span>{product.label}</span>
              </div>
            )}
            {product.country && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>{product.country}</span>
              </div>
            )}
            {product.format && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Tag className="w-4 h-4 text-indigo-400" />
                <span>{product.format}</span>
              </div>
            )}
          </div>

          {/* Styles (Género) */}
          {product.styles && product.styles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.styles.map((style) => (
                <span
                  key={style}
                  className="px-3 py-1 bg-zinc-800 text-zinc-300 text-sm rounded-full"
                >
                  {style}
                </span>
              ))}
            </div>
          )}

          {/* Add to Cart */}
          {isOwned ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Ya tienes este producto</span>
              </div>
              <a
                href={orderId ? `/dashboard/orders/${orderId}` : '/dashboard/orders'}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
              >
                <Download className="w-5 h-5" />
                Ver mi pedido
              </a>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-3"
            >
              <ShoppingCart className="w-5 h-5" />
              Añadir al carrito
            </button>
          )}
        </div>
      </div>

      {/* Tracklist & Credits Section */}
      <div className="mt-8 grid lg:grid-cols-2 gap-6">
        {/* Tracklist from Discogs */}
        {product.tracklist && product.tracklist.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <ListMusic className="w-4 h-4" />
              Tracklist
            </h3>
            <div className="divide-y divide-zinc-800">
              {product.tracklist.map((track, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-400 font-mono w-6">{track.position || index + 1}</span>
                    <span className="text-white">{track.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {track.duration && (
                      <span className="text-zinc-500 font-mono text-xs">{track.duration}</span>
                    )}
                    {product.audioUrls?.[index] && (
                      <button
                        onClick={() => togglePlay(index)}
                        className="w-6 h-6 flex items-center justify-center text-indigo-400 hover:text-indigo-300"
                      >
                        {playingTrack === index ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fallback: Old tracks array */}
        {(!product.tracklist || product.tracklist.length === 0) && product.tracks && product.tracks.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <ListMusic className="w-4 h-4" />
              Tracklist
            </h3>
            <div className="divide-y divide-zinc-800">
              {product.tracks.map((track, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-indigo-400 font-mono w-6">{index + 1}</span>
                    <span className="text-white">{track}</span>
                  </div>
                  {product.audioUrls?.[index] && (
                    <button
                      onClick={() => togglePlay(index)}
                      className="w-6 h-6 flex items-center justify-center text-indigo-400 hover:text-indigo-300"
                    >
                      {playingTrack === index ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credits */}
        {product.credits && product.credits.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Créditos
            </h3>
            <div className="divide-y divide-zinc-800">
              {product.credits.map((credit, index) => (
                <div key={index} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-zinc-500">{credit.role}</span>
                  <span className="text-zinc-300">{credit.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer: Discogs Link */}
      {product.discogs_url && (
        <div className="mt-6 flex justify-center">
          <a
            href={product.discogs_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver en Discogs
          </a>
        </div>
      )}

      {/* Audio Player */}
      {playingTrack !== null && product.audioUrls?.[playingTrack] && (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-lg border-t border-zinc-800 p-4 z-50">
          <div className="max-w-screen-xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setPlayingTrack(null)}
              className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors"
            >
              <Pause className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <p className="text-sm text-zinc-400 mb-1">
                {product.tracklist?.[playingTrack]?.title || product.tracks?.[playingTrack]}
              </p>
              <ReactPlayer
                url={product.audioUrls[playingTrack]}
                playing
                height={40}
                width="100%"
                config={{
                  file: {
                    forceAudio: true
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
