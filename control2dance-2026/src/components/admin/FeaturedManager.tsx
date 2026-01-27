/**
 * FeaturedManager - Gestión de productos destacados
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, Search, GripVertical, X, Loader2, Save, ArrowUp, ArrowDown } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  catalog_number: string;
  cover_image: string | null;
  is_featured: boolean;
  featured_order: number;
}

export default function FeaturedManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id, name, brand, catalog_number, cover_image, is_featured, featured_order')
      .eq('is_active', true)
      .order('catalog_number', { ascending: false });

    if (!error && data) {
      setProducts(data);
      // Separar destacados y ordenarlos
      const featured = data
        .filter(p => p.is_featured)
        .sort((a, b) => (a.featured_order || 0) - (b.featured_order || 0));
      setFeaturedProducts(featured);
    }
    setLoading(false);
  };

  const addToFeatured = (product: Product) => {
    if (featuredProducts.find(p => p.id === product.id)) return;
    
    const newFeatured = [...featuredProducts, { 
      ...product, 
      is_featured: true, 
      featured_order: featuredProducts.length 
    }];
    setFeaturedProducts(newFeatured);
  };

  const removeFromFeatured = (productId: string) => {
    const newFeatured = featuredProducts
      .filter(p => p.id !== productId)
      .map((p, idx) => ({ ...p, featured_order: idx }));
    setFeaturedProducts(newFeatured);
  };

  const moveFeatured = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= featuredProducts.length) return;

    const newFeatured = [...featuredProducts];
    [newFeatured[index], newFeatured[newIndex]] = [newFeatured[newIndex], newFeatured[index]];
    
    // Actualizar orden
    setFeaturedProducts(newFeatured.map((p, idx) => ({ ...p, featured_order: idx })));
  };

  const saveChanges = async () => {
    setSaving(true);

    try {
      // Primero, quitar is_featured de todos los productos
      await supabase
        .from('products')
        .update({ is_featured: false, featured_order: 0 })
        .eq('is_featured', true);

      // Luego, marcar los nuevos destacados
      for (const product of featuredProducts) {
        await supabase
          .from('products')
          .update({ 
            is_featured: true, 
            featured_order: product.featured_order 
          })
          .eq('id', product.id);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving featured:', err);
    }

    setSaving(false);
  };

  const filteredProducts = products.filter(p => 
    !featuredProducts.find(fp => fp.id === p.id) &&
    (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     p.catalog_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (p.brand?.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Star className="w-7 h-7 text-yellow-400" />
            Productos Destacados
          </h1>
          <p className="text-zinc-500 mt-1">
            Selecciona los productos que aparecerán en la sección destacada de la home
          </p>
        </div>

        <button
          onClick={saveChanges}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Guardar cambios
        </button>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
          ✓ Cambios guardados correctamente
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Productos destacados */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            Destacados ({featuredProducts.length})
          </h2>

          {featuredProducts.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No hay productos destacados</p>
              <p className="text-sm">Añade productos desde la lista de la derecha</p>
            </div>
          ) : (
            <div className="space-y-2">
              {featuredProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg group"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveFeatured(index, 'up')}
                      disabled={index === 0}
                      className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveFeatured(index, 'down')}
                      disabled={index === featuredProducts.length - 1}
                      className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
                    {product.cover_image ? (
                      <img
                        src={product.cover_image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        ?
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{product.name}</p>
                    <p className="text-xs text-zinc-500">{product.catalog_number}</p>
                  </div>

                  <span className="text-xs text-yellow-500 font-bold">#{index + 1}</span>

                  <button
                    onClick={() => removeFromFeatured(product.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de productos */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Todos los productos</h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-1">
            {filteredProducts.slice(0, 30).map(product => (
              <button
                key={product.id}
                onClick={() => addToFeatured(product)}
                className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-700 flex-shrink-0">
                  {product.cover_image ? (
                    <img
                      src={product.cover_image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">
                      ?
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{product.name}</p>
                  <p className="text-xs text-zinc-500">{product.catalog_number} • {product.brand}</p>
                </div>

                <Star className="w-4 h-4 text-zinc-600" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
