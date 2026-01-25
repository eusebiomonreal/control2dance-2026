/**
 * ProductTable - Tabla de productos para el admin
 */

import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import {
  adminProducts,
  adminLoading,
  adminError,
  loadAdminProducts,
  deleteProduct,
  restoreProduct
} from '../../stores/adminStore';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import type { Product as DBProduct } from '../../lib/database.types';

interface ProductTableProps {
  showInactive?: boolean;
}

export default function ProductTable({ showInactive = false }: ProductTableProps) {
  const products = useStore(adminProducts);
  const loading = useStore(adminLoading);
  const error = useStore(adminError);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  useEffect(() => {
    loadAdminProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    // Filtro de búsqueda
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.catalog_number.toLowerCase().includes(search.toLowerCase()) ||
      (product.brand?.toLowerCase().includes(search.toLowerCase()) ?? false);

    // Filtro de estado
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && product.is_active) ||
      (filter === 'inactive' && !product.is_active);

    return matchesSearch && matchesFilter;
  });

  const handleDelete = async (id: string) => {
    if (confirm('¿Desactivar este producto? Podrás restaurarlo después.')) {
      await deleteProduct(id);
      setMenuOpen(null);
    }
  };

  const handleRestore = async (id: string) => {
    await restoreProduct(id);
    setMenuOpen(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar por nombre, catálogo o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-3">
          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>

          {/* Add button */}
          <a
            href="/admin/products/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuevo producto</span>
          </a>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Producto</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Catálogo</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Precio</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Año</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Estado</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-400">Creado</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-zinc-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={`hover:bg-zinc-800/50 ${!product.is_active ? 'opacity-60' : ''}`}>
                    {/* Product */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                          {product.cover_image ? (
                            <img
                              src={product.cover_image}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Eye className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">{product.name}</p>
                          <p className="text-sm text-zinc-500 truncate">{product.brand}</p>
                        </div>
                      </div>
                    </td>

                    {/* Catalog */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-300 font-mono">{product.catalog_number}</span>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-white">{formatPrice(product.price)}</span>
                    </td>

                    {/* Year */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-400">{product.year || '-'}</span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                          product.is_active
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-zinc-500/10 text-zinc-400'
                        }`}
                      >
                        {product.is_active ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Activo
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Inactivo
                          </>
                        )}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4">
                      <span className="text-sm text-zinc-400">{formatDate(product.created_at)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/catalogo/${product.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-zinc-400 hover:text-white transition-colors"
                          title="Ver en tienda"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                          href={`/admin/products/${product.id}`}
                          className="p-2 text-zinc-400 hover:text-white transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </a>

                        {/* Menu */}
                        <div className="relative">
                          <button
                            onClick={() => setMenuOpen(menuOpen === product.id ? null : product.id)}
                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {menuOpen === product.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setMenuOpen(null)}
                              />
                              <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1">
                                {product.is_active ? (
                                  <button
                                    onClick={() => handleDelete(product.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-zinc-700"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Desactivar
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleRestore(product.id)}
                                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-emerald-400 hover:bg-zinc-700"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                    Restaurar
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty state */}
          {filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-zinc-500">No se encontraron productos</p>
            </div>
          )}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-zinc-500">
        Mostrando {filteredProducts.length} de {products.length} productos
      </p>
    </div>
  );
}
