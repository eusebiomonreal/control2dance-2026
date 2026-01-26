import { atom, computed } from 'nanostores';
import type { Product } from '../types';
import { productService } from '../services/productService';

// Atoms
export const products = atom<Product[]>([]);
export const loading = atom(true);
export const error = atom<string | null>(null);
export const searchQuery = atom('');
export const selectedYear = atom('all');
export const selectedGenre = atom('all');
export const selectedStyle = atom('all');
export const selectedProduct = atom<Product | null>(null);

// Fetch products desde Supabase con timeout
export async function fetchProducts() {
  loading.set(true);
  error.set(null);

  try {
    // Timeout de 10 segundos
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 10000);
    });

    const data = await Promise.race([
      productService.getProducts(),
      timeoutPromise
    ]);

    products.set(data);
  } catch (err) {
    console.error('Error fetching products:', err);
    const message = err instanceof Error && err.message === 'Timeout'
      ? 'Tiempo de espera agotado. Recarga la página.'
      : 'Error al cargar los productos';
    error.set(message);
    products.set([]); // Set empty array to allow page to render
  } finally {
    loading.set(false);
  }
}

// Inicializar productos con datos pre-cargados (SSR)
export function initProducts(initialProducts: Product[]) {
  products.set(initialProducts);
  loading.set(false);
}

// Computed: Filtered Products
export const filteredProducts = computed(
  [products, searchQuery, selectedYear, selectedGenre, selectedStyle],
  ($products, $searchQuery, $selectedYear, $selectedGenre, $selectedStyle) => {
    return $products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes($searchQuery.toLowerCase()) ||
                           p.brand.toLowerCase().includes($searchQuery.toLowerCase());
      const matchesYear = $selectedYear === 'all' || p.year === $selectedYear;
      const matchesGenre = $selectedGenre === 'all' || p.genre === $selectedGenre;
      const matchesStyle = $selectedStyle === 'all' || (p.styles && p.styles.includes($selectedStyle));

      return matchesSearch && matchesYear && matchesGenre && matchesStyle;
    });
  }
);

// Computed: Unique Filter Options
export const uniqueYears = computed(products, ($products) => {
  const years = Array.from(new Set($products.map(p => p.year).filter((y): y is string => !!y)))
    .sort((a, b) => b.localeCompare(a));
  return ['all', ...years];
});

export const uniqueGenres = computed(products, ($products) => {
  const genres = Array.from(new Set($products.map(p => p.genre))).sort();
  return ['all', ...genres];
});

export const uniqueStyles = computed(products, ($products) => {
  const allStyles = $products.flatMap(p => p.styles || []);
  const styles = Array.from(new Set(allStyles)).sort();
  return ['all', ...styles];
});

// Actions
export function setSelectedProduct(product: Product | null) {
  selectedProduct.set(product);
}

export function handleNextProduct() {
  const currentSelected = selectedProduct.get();
  if (!currentSelected) return;

  const currentFiltered = filteredProducts.get();
  const currentIndex = currentFiltered.findIndex(p => p.id === currentSelected.id);
  
  if (currentIndex !== -1 && currentIndex < currentFiltered.length - 1) {
    selectedProduct.set(currentFiltered[currentIndex + 1]);
  }
}

export function handlePrevProduct() {
  const currentSelected = selectedProduct.get();
  if (!currentSelected) return;

  const currentFiltered = filteredProducts.get();
  const currentIndex = currentFiltered.findIndex(p => p.id === currentSelected.id);
  
  if (currentIndex > 0) {
    selectedProduct.set(currentFiltered[currentIndex - 1]);
  }
}
