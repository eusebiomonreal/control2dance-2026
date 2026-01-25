import { map } from 'nanostores';
import type { CartItem, Product } from '../types';
import { showToast } from './toastStore';
import { isProductOwned } from './ownedProductsStore';

const CART_STORAGE_KEY = 'c2d_cart';

export const cartItems = map<Record<string, CartItem>>({});

// Cargar carrito desde localStorage al iniciar
function loadCart() {
  if (typeof window === 'undefined') return;

  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      cartItems.set(parsed);
      console.log('🛒 Cart loaded from storage:', Object.keys(parsed).length, 'items');
    }
  } catch (e) {
    console.error('Error loading cart:', e);
  }
}

// Guardar carrito en localStorage
function saveCart() {
  if (typeof window === 'undefined') return;

  try {
    const current = cartItems.get();
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(current));
  } catch (e) {
    console.error('Error saving cart:', e);
  }
}

// Inicializar al cargar el módulo
if (typeof window !== 'undefined') {
  loadCart();

  // Suscribirse a cambios para guardar automáticamente
  cartItems.subscribe(() => {
    saveCart();
  });
}

export function addToCart(product: Product): 'added' | 'already-in-cart' | 'already-owned' {
  console.log('🛒 addToCart called:', product.name, product.id);

  // Verificar si ya lo posee
  if (isProductOwned(product.id)) {
    console.log('🛒 Product already owned:', product.name);
    showToast('Ya tienes este producto', 'Puedes descargarlo desde tu panel', 'warning');
    return 'already-owned';
  }

  const currentCart = cartItems.get();
  const existingItem = currentCart[product.id];

  // Don't add if already in cart
  if (existingItem) {
    console.log('🛒 Product already in cart:', product.name);
    showToast('Este producto ya está en el carrito', product.name, 'info');
    return 'already-in-cart';
  }

  cartItems.setKey(product.id, {
    ...product,
    quantity: 1,
  });

  console.log('🛒 Cart now has:', Object.keys(cartItems.get()).length, 'items');

  // Show toast notification
  const totalItems = Object.keys(cartItems.get()).length;
  showToast(
    `${totalItems} ${totalItems === 1 ? 'producto' : 'productos'} en el carrito`,
    product.name
  );
  
  return 'added';
}

export function removeFromCart(id: string) {
  const currentCart = cartItems.get();
  const { [id]: _, ...rest } = currentCart;
  cartItems.set(rest);
}

export function clearCart() {
  cartItems.set({});
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CART_STORAGE_KEY);
  }
}
