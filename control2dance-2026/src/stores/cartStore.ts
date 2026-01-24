import { map } from 'nanostores';
import type { CartItem, Product } from '../types';

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

export function addToCart(product: Product) {
  console.log('🛒 addToCart called:', product.name, product.id);

  const currentCart = cartItems.get();
  const existingItem = currentCart[product.id];

  if (existingItem) {
    cartItems.setKey(product.id, {
      ...existingItem,
      quantity: existingItem.quantity + 1,
    });
  } else {
    cartItems.setKey(product.id, {
      ...product,
      quantity: 1,
    });
  }

  console.log('🛒 Cart now has:', Object.keys(cartItems.get()).length, 'items');
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
