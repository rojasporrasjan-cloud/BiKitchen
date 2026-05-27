/**
 * Utilidades para gestión de caché en BiKitchen
 * Especialmente útil para móviles donde el caché puede ser más agresivo
 */

import { clearAllCache, invalidateCacheByType } from './firestoreCache';

/**
 * Limpia TODO el caché de la aplicación
 * Útil cuando los usuarios reportan que no ven cambios recientes
 */
export function clearAppCache() {
  try {
    // 1. Limpiar localStorage de BiKitchen
    clearAllCache();

    // 2. Limpiar sessionStorage
    sessionStorage.clear();

    // 3. Invalidar caché de menús específicamente
    invalidateCacheByType('menus');

    console.log('✅ Caché de la aplicación limpiado completamente');
    return true;
  } catch (error) {
    console.error('❌ Error limpiando caché:', error);
    return false;
  }
}

/**
 * Fuerza la recarga de menús invalidando todo el caché relacionado
 */
export function forceMenusReload() {
  try {
    invalidateCacheByType('menus_official');
    invalidateCacheByType('menus');
    console.log('✅ Caché de menús invalidado - próxima carga será fresca');
    return true;
  } catch (error) {
    console.error('❌ Error invalidando caché de menús:', error);
    return false;
  }
}

/**
 * Verifica si el navegador tiene Service Worker activo
 * y lo actualiza para obtener la última versión
 */
export async function updateServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('✅ Service Worker actualizado');
        return true;
      }
    } catch (error) {
      console.error('❌ Error actualizando Service Worker:', error);
    }
  }
  return false;
}

/**
 * Función completa de "hard refresh" para móviles
 * Limpia todo y recarga la página
 */
export async function hardRefresh() {
  try {
    // PROTECCIÓN CONTRA INFINITE LOOP (CRÍTICO PARA IOS SAFARI)
    const lastRefreshTime = sessionStorage.getItem('last_hard_refresh');
    const now = Date.now();

    if (lastRefreshTime && (now - parseInt(lastRefreshTime)) < 10000) {
      console.warn('⚠️ Se previno un bucle infinito de hardRefresh (ocurrió hace menos de 10s)');
      // No recargamos para evitar el crash de Safari
      return false;
    }

    sessionStorage.setItem('last_hard_refresh', now.toString());

    // 1. Limpiar caché de la app
    clearAppCache();

    // 2. Actualizar Service Worker
    await updateServiceWorker();

    // 3. Recargar página sin caché
    window.location.reload(true);

    return true;
  } catch (error) {
    console.error('❌ Error en hard refresh:', error);
    // Intentar reload simple
    window.location.reload();
    return false;
  }
}

/**
 * Detecta si el dispositivo es móvil
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Obtiene información del caché para debugging
 */
export function getCacheInfo() {
  const info = {
    isMobile: isMobileDevice(),
    hasServiceWorker: 'serviceWorker' in navigator,
    localStorageSize: 0,
    sessionStorageSize: 0
  };

  try {
    // Calcular tamaño aproximado de localStorage
    let localSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        localSize += localStorage[key].length + key.length;
      }
    }
    info.localStorageSize = Math.round(localSize / 1024 * 100) / 100; // KB

    // Calcular tamaño aproximado de sessionStorage
    let sessionSize = 0;
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        sessionSize += sessionStorage[key].length + key.length;
      }
    }
    info.sessionStorageSize = Math.round(sessionSize / 1024 * 100) / 100; // KB
  } catch (error) {
    console.error('Error calculando tamaño de storage:', error);
  }

  return info;
}
