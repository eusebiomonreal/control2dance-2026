import { atom, computed } from 'nanostores';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { loadOwnedProducts, clearOwnedProducts } from './ownedProductsStore';

// Estado de autenticación
export const $user = atom<User | null>(null);
export const $session = atom<Session | null>(null);
export const $authLoading = atom(true);
export const $authError = atom<string | null>(null);

// Estado de impersonación
export const $isImpersonating = atom(false);
export const $realAdminUser = atom<User | null>(null);

// Computed
export const $isAuthenticated = computed($user, (user) => !!user);
export const $userEmail = computed($user, (user) => user?.email ?? null);
export const $userName = computed($user, (user) => user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'Usuario');
export const $userAvatar = computed($user, (user) => {
  const name = user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email ?? 'U';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff`;
});

// Helper para cookies
function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
}

// Inicializar auth listener
export async function initAuth() {
  $authLoading.set(true);

  // 1. Obtener sesión real de Supabase
  const { data: { session: realSession } } = await supabase.auth.getSession();

  if (realSession) {
    const impersonatedId = getCookie('impersonated_user_id');

    // 2. Si hay cookie de impersonación, verificar si el usuario real es admin
    if (impersonatedId && realSession.user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', realSession.user.id)
        .single();

      if (roleData?.role === 'admin') {
        // Cargar datos del usuario suplantado
        try {
          const response = await fetch(`/api/admin/user-details?id=${impersonatedId}`, {
            headers: { 'Authorization': `Bearer ${realSession.access_token}` }
          });

          if (response.ok) {
            const targetUser = await response.json();
            $isImpersonating.set(true);
            $realAdminUser.set(realSession.user);
            $user.set(targetUser as User);
            $session.set(realSession); // Mantenemos la sesión real para las peticiones API

            // Cargar productos del usuario suplantado
            await loadOwnedProducts(targetUser.id);
          } else {
            // Si falla la API, limpiar cookie
            document.cookie = "impersonated_user_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            $user.set(realSession.user);
            $session.set(realSession);
            await loadOwnedProducts(realSession.user.id);
          }
        } catch (err) {
          console.error('Error fetching impersonated user:', err);
          $user.set(realSession.user);
          $session.set(realSession);
          await loadOwnedProducts(realSession.user.id);
        }
      } else {
        // No es admin, ignorar impersonación
        $user.set(realSession.user);
        $session.set(realSession);
        await loadOwnedProducts(realSession.user.id);
      }
    } else {
      // Flujo normal sin impersonación
      $session.set(realSession);
      $user.set(realSession.user);
      await loadOwnedProducts(realSession.user.id);
    }
  }

  // Escuchar cambios de auth (solo session real)
  supabase.auth.onAuthStateChange(async (event, session) => {
    // Si cerramos sesión, limpiar todo
    if (event === 'SIGNED_OUT') {
      $isImpersonating.set(false);
      $realAdminUser.set(null);
      $session.set(null);
      $user.set(null);
      clearOwnedProducts();
      return;
    }

    // Para otros eventos, si no estamos impersonando, actualizar normal
    if (!$isImpersonating.get()) {
      $session.set(session);
      $user.set(session?.user ?? null);
      if (event === 'SIGNED_IN' && session?.user) {
        $authError.set(null);
        await loadOwnedProducts(session.user.id);
      }
    }
  });

  $authLoading.set(false);
}

// Acciones
export async function startImpersonation(userId: string) {
  const currentSession = $session.get();
  if (!currentSession) return { success: false, error: 'No session' };

  try {
    const response = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({ userId, action: 'start' })
    });

    if (response.ok) {
      window.location.reload(); // Recargar para activar initAuth con la cookie
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.error };
    }
  } catch (err) {
    return { success: false, error: 'Error de red' };
  }
}

export async function stopImpersonation() {
  const currentSession = $session.get();
  if (!currentSession) return { success: false, error: 'No session' };

  try {
    const response = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({ action: 'stop' })
    });

    if (response.ok) {
      window.location.reload();
      return { success: true };
    }
  } catch (err) {
    return { success: false, error: 'Error de red' };
  }
}

export async function consumeImpersonatedTokens() {
  const currentSession = $session.get();
  if (!currentSession) return { success: false, error: 'No session' };

  try {
    const response = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({ action: 'consume-tokens' })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.error };
    }
  } catch (err) {
    return { success: false, error: 'Error de red' };
  }
}

export async function resetImpersonatedTokens() {
  const currentSession = $session.get();
  if (!currentSession) return { success: false, error: 'No session' };

  try {
    const response = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentSession.access_token}`
      },
      body: JSON.stringify({ action: 'reset-tokens' })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.error };
    }
  } catch (err) {
    return { success: false, error: 'Error de red' };
  }
}

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
