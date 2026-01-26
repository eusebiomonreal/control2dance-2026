import { atom, computed } from 'nanostores';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { loadOwnedProducts, clearOwnedProducts } from './ownedProductsStore';

// Estado de autenticación
export const $user = atom<User | null>(null);
export const $session = atom<Session | null>(null);
export const $authLoading = atom(true);
export const $authError = atom<string | null>(null);

// Computed
export const $isAuthenticated = computed($user, (user) => !!user);
export const $userEmail = computed($user, (user) => user?.email ?? null);
export const $userName = computed($user, (user) => user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? 'Usuario');
export const $userAvatar = computed($user, (user) => {
  const name = user?.user_metadata?.name ?? user?.email ?? 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
});

// Inicializar auth listener
export async function initAuth() {
  $authLoading.set(true);

  // Obtener sesión actual
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    $session.set(session);
    $user.set(session.user);
    // Cargar productos que ya posee
    await loadOwnedProducts(session.user.id);
  }

  // Escuchar cambios de auth
  supabase.auth.onAuthStateChange(async (event, session) => {
    $session.set(session);
    $user.set(session?.user ?? null);

    if (event === 'SIGNED_IN' && session?.user) {
      $authError.set(null);
      // Cargar productos que ya posee
      await loadOwnedProducts(session.user.id);
    } else if (event === 'SIGNED_OUT') {
      $authError.set(null);
      // Limpiar productos al cerrar sesión
      clearOwnedProducts();
    }
  });

  $authLoading.set(false);
}

// Acciones
export async function login(email: string, password: string) {
  $authLoading.set(true);
  $authError.set(null);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    $authError.set(translateAuthError(error.message));
    $authLoading.set(false);
    return { success: false, error };
  }

  $authLoading.set(false);
  return { success: true, data };
}

export async function register(email: string, password: string, name?: string) {
  $authLoading.set(true);
  $authError.set(null);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/callback`
    }
  });

  if (error) {
    $authError.set(translateAuthError(error.message));
    $authLoading.set(false);
    return { success: false, error };
  }

  $authLoading.set(false);
  return { success: true, data };
}

export async function logout() {
  $authLoading.set(true);
  const { error } = await supabase.auth.signOut();

  if (error) {
    $authError.set(translateAuthError(error.message));
  }

  $authLoading.set(false);
  return { error };
}

export async function resetPassword(email: string) {
  $authLoading.set(true);
  $authError.set(null);

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/reset-password`
    });

    if (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.message || error.name || 'Error al enviar el email de recuperación';
      $authError.set(translateAuthError(errorMessage));
      $authLoading.set(false);
      return { success: false, error };
    }

    $authLoading.set(false);
    return { success: true };
  } catch (err) {
    console.error('Reset password exception:', err);
    $authError.set('Error de conexión. Por favor, inténtalo de nuevo.');
    $authLoading.set(false);
    return { success: false, error: err };
  }
}

export async function updateUserPassword(newPassword: string) {
  $authLoading.set(true);
  $authError.set(null);

  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    $authError.set(translateAuthError(error.message));
    $authLoading.set(false);
    return { success: false, error };
  }

  $authLoading.set(false);
  return { success: true };
}

export async function updateUserProfile(data: { name?: string; avatar_url?: string }) {
  $authLoading.set(true);
  $authError.set(null);

  const { error } = await supabase.auth.updateUser({
    data
  });

  if (error) {
    $authError.set(translateAuthError(error.message));
    $authLoading.set(false);
    return { success: false, error };
  }

  $authLoading.set(false);
  return { success: true };
}

// Traducir errores de Supabase al español
function translateAuthError(message: string | undefined): string {
  if (!message) {
    return 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
  }

  const translations: Record<string, string> = {
    'Invalid login credentials': 'Email o contraseña incorrectos',
    'Email not confirmed': 'Por favor, confirma tu email antes de iniciar sesión',
    'User already registered': 'Este email ya está registrado',
    'Password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres',
    'Unable to validate email address: invalid format': 'El formato del email no es válido',
    'Email rate limit exceeded': 'Demasiados intentos. Por favor, espera unos minutos',
    'For security purposes, you can only request this once every 60 seconds': 'Por seguridad, solo puedes solicitar esto una vez cada 60 segundos',
    'Email link is invalid or has expired': 'El enlace ha expirado o no es válido',
    'AuthApiError': 'Error de autenticación. Por favor, inténtalo de nuevo.'
  };

  return translations[message] || message;
}

// Inicializar al cargar el módulo en el cliente
if (typeof window !== 'undefined') {
  initAuth();
}
