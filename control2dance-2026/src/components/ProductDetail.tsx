import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { products, fetchProducts } from '../stores/productStore';
import { addToCart } from '../stores/cartStore';
import type { Product } from '../types';
import { ShoppingCart, Play, Pause, ChevronLeft, Music, Calendar, Tag, Globe, Disc } from 'lucide-react';
import ReactPlayer from 'react-player';

interface ProductDetailProps {
  slug: string;
}

export default function ProductDetail({ slug }: ProductDetailProps) {
  const allProducts = useStore(products);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);

  useEffect(() => {
    async function loadProduct() {
      if (allProducts.length === 0) {
        await fetchProducts();
      }

      // Buscar por slug (usando nombre normalizado)
      const found = allProducts.find(p =>
        p.name.toLowerCase().replace(/\s+/g, '-') === slug ||
        p.id === slug
      );

      setProduct(found || null);
      setLoading(false);
    }

    loadProduct();
  }, [slug, allProducts]);

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
        <div className="space-y-6">
          <div>
            <p className="text-sm text-indigo-400 font-medium mb-2">{product.catalogNumber}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{product.name}</h1>
            <p className="text-xl text-zinc-400">{product.brand}</p>
          </div>

          <div className="text-3xl font-bold text-white">
            €{product.price.toFixed(2)}
          </div>

          <p className="text-zinc-400 leading-relaxed">{product.description}</p>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            {product.year && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="w-4 h-4" />
                <span>{product.year}</span>
              </div>
            )}
            {product.genre && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Tag className="w-4 h-4" />
                <span>{product.genre}</span>
              </div>
            )}
            {product.label && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Disc className="w-4 h-4" />
                <span>{product.label}</span>
              </div>
            )}
            {product.country && (
              <div className="flex items-center gap-2 text-zinc-400">
                <Globe className="w-4 h-4" />
                <span>{product.country}</span>
              </div>
            )}
          </div>

          {/* Styles */}
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
          <button
            onClick={handleAddToCart}
            className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-3"
          >
            <ShoppingCart className="w-5 h-5" />
            Añadir al carrito
          </button>

          {/* Tracklist */}
          {product.tracks && product.tracks.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Tracklist</h3>
              <div className="space-y-2">
                {product.tracks.map((track, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 text-sm w-6">{index + 1}</span>
                      <span className="text-white">{track}</span>
                    </div>
                    {product.audioUrls?.[index] && (
                      <button
                        onClick={() => togglePlay(index)}
                        className="w-8 h-8 flex items-center justify-center text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        {playingTrack === index ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audio Player */}
          {playingTrack !== null && product.audioUrls?.[playingTrack] && (
            <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 z-50">
              <div className="max-w-screen-xl mx-auto flex items-center gap-4">
                <button
                  onClick={() => setPlayingTrack(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <Pause className="w-6 h-6" />
                </button>
                <div className="flex-1">
                  <p className="text-sm text-zinc-400">{product.tracks[playingTrack]}</p>
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
      </div>
    </div>
  );
}
