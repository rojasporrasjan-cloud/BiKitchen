/**
 * Sistema de versión de la aplicación para forzar actualizaciones en móviles
 * Cuando se incrementa APP_VERSION, los móviles detectan que hay una nueva versión
 * y limpian su caché automáticamente
 */

export const APP_VERSION = '1.0.9'; // Incrementar cada vez que se hagan cambios importantes

/**
 * Verifica si hay una nueva versión de la app y limpia el caché si es necesario
 */
export function checkAppVersion() {
    const STORAGE_KEY = 'bikitchen_app_version';
    const storedVersion = localStorage.getItem(STORAGE_KEY);
    
    if (storedVersion !== APP_VERSION) {
        console.log(`[AppVersion] Nueva versión detectada: ${storedVersion} -> ${APP_VERSION}`);
        
        // Limpiar todo el localStorage excepto el carrito y datos del usuario
        const keysToKeep = ['bikitchen_cart', 'bikitchen_user', 'bikitchen_auth'];
        const allKeys = Object.keys(localStorage);
        
        allKeys.forEach(key => {
            if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
                localStorage.removeItem(key);
            }
        });
        
        // Limpiar sessionStorage
        sessionStorage.clear();
        
        // Guardar nueva versión
        localStorage.setItem(STORAGE_KEY, APP_VERSION);
        
        console.log('[AppVersion] ✅ Caché limpiado - nueva versión instalada');
        
        return true; // Indica que se limpió el caché
    }
    
    return false; // No hay cambios
}

/**
 * Forzar recarga de la página si se detecta una nueva versión
 */
export function forceReloadIfNewVersion() {
    const wasUpdated = checkAppVersion();
    
    if (wasUpdated) {
        console.log('[AppVersion] 🔄 Recargando página para aplicar cambios...');
        // Esperar un poco para que se vean los logs
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}
