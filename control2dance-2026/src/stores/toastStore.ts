import { atom } from 'nanostores';

interface Toast {
  id: string;
  message: string;
  productName?: string;
  type: 'success' | 'error' | 'info';
}

export const $toast = atom<Toast | null>(null);

let timeoutId: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, productName?: string, type: 'success' | 'error' | 'info' = 'success') {
  // Clear any existing timeout
  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  $toast.set({
    id: Date.now().toString(),
    message,
    productName,
    type
  });

  // Auto-hide after 4 seconds
  timeoutId = setTimeout(() => {
    $toast.set(null);
  }, 4000);
}

export function hideToast() {
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  $toast.set(null);
}
