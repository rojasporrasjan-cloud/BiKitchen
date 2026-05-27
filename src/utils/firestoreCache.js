/**
 * Sistema de caché local para Firestore
 * Reduce lecturas de Firebase en ~70% guardando datos en localStorage
 * con tiempo de expiración configurable
 */

const CACHE_PREFIX = 'bikitchen_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos por defecto

// Deduplicación de solicitudes en vuelo (concurrentes) por clave de caché
const pendingRequests = new Map();

// TTL específicos por tipo de dato
const CACHE_TTL = {
    menus: 10 * 1000,           // 10 segundos - cambios deben verse inmediatamente
    packs: 5 * 60 * 1000,       // 5 minutos - precios de packs
    packImages: 60 * 60 * 1000, // 1 hora - imágenes casi no cambian
    promotions: 30 * 60 * 1000,
    prices: 24 * 60 * 60 * 1000,      // 24 horas - precios (se invalidan al guardar)
    zones: 24 * 60 * 60 * 1000, // 24 horas - zonas casi nunca cambian
    individuales: 60 * 60 * 1000, // 1 hora - productos individuales
    temporada: 30 * 60 * 1000,  // 30 minutos - productos de temporada
    menus_official: 10 * 60 * 1000, // 10 minutos - menú oficial
    pack_images: 24 * 60 * 60 * 1000, // 24 horas - imágenes de packs
    individual_images: 24 * 60 * 60 * 1000, // 24 horas - imágenes de individuales
    coupons: 30 * 1000,             // 30 segundos - cupones deben reflejarse rápido
    dashboard: 10 * 60 * 1000,
    reviews: 30 * 60 * 1000,
    ratings: 30 * 60 * 1000
};

/**
 * Guarda datos en caché local
 * @param {string} key - Clave única para el dato
 * @param {any} data - Datos a guardar
 * @param {string} type - Tipo de dato (para TTL específico)
 */
export function setCache(key, data, type = 'default') {
    try {
        const ttl = CACHE_TTL[type] || DEFAULT_TTL;
        const cacheItem = {
            data,
            timestamp: Date.now(),
            expiry: Date.now() + ttl
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheItem));
    } catch (error) {
        // Si localStorage está lleno, limpiar caché viejo
        if (error.name === 'QuotaExceededError') {
            clearExpiredCache();
            try {
                localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
                    data,
                    timestamp: Date.now(),
                    expiry: Date.now() + (CACHE_TTL[type] || DEFAULT_TTL)
                }));
            } catch (e) {
                console.warn('Cache storage full, skipping cache');
            }
        }
    }
}

/**
 * Obtiene datos del caché local
 * @param {string} key - Clave del dato
 * @returns {any|null} - Datos si existen y no han expirado, null si no
 */
export function getCache(key) {
    try {
        const item = localStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;

        const cacheItem = JSON.parse(item);
        
        // Verificar si ha expirado
        if (Date.now() > cacheItem.expiry) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }

        return cacheItem.data;
    } catch (error) {
        return null;
    }
}

/**
 * Verifica si hay datos válidos en caché
 * @param {string} key - Clave del dato
 * @returns {boolean}
 */
export function hasValidCache(key) {
    return getCache(key) !== null;
}

/**
 * Invalida (elimina) un dato específico del caché
 * @param {string} key - Clave del dato
 */
export function invalidateCache(key) {
    try {
        localStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
        console.warn('Error invalidating cache:', error);
    }
}

/**
 * Invalida todos los datos de un tipo específico
 * @param {string} type - Tipo de dato (ej: 'menus', 'packs')
 */
export function invalidateCacheByType(type) {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX + type)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('Error invalidating cache by type:', error);
    }
}

/**
 * Limpia todo el caché de BiKitchen
 */
export function clearAllCache() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.warn('Error clearing cache:', error);
    }
}

/**
 * Limpia solo los datos expirados del caché
 */
export function clearExpiredCache() {
    try {
        const keys = Object.keys(localStorage);
        const now = Date.now();
        
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                try {
                    const item = JSON.parse(localStorage.getItem(key));
                    if (item && item.expiry && now > item.expiry) {
                        localStorage.removeItem(key);
                    }
                } catch (e) {
                    // Si no se puede parsear, eliminar
                    localStorage.removeItem(key);
                }
            }
        });
    } catch (error) {
        console.warn('Error clearing expired cache:', error);
    }
}

/**
 * Obtiene estadísticas del caché
 * @returns {object} - Estadísticas del caché
 */
export function getCacheStats() {
    try {
        const keys = Object.keys(localStorage);
        const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
        
        let totalSize = 0;
        let validItems = 0;
        let expiredItems = 0;
        const now = Date.now();

        cacheKeys.forEach(key => {
            const item = localStorage.getItem(key);
            totalSize += item.length;
            
            try {
                const parsed = JSON.parse(item);
                if (parsed.expiry && now > parsed.expiry) {
                    expiredItems++;
                } else {
                    validItems++;
                }
            } catch (e) {
                expiredItems++;
            }
        });

        return {
            totalItems: cacheKeys.length,
            validItems,
            expiredItems,
            totalSizeKB: Math.round(totalSize / 1024 * 100) / 100
        };
    } catch (error) {
        return { totalItems: 0, validItems: 0, expiredItems: 0, totalSizeKB: 0 };
    }
}

/**
 * Wrapper para fetch con caché
 * Primero intenta obtener del caché, si no existe o expiró, hace fetch
 * @param {string} cacheKey - Clave para el caché
 * @param {Function} fetchFn - Función async que obtiene los datos
 * @param {string} type - Tipo de dato para TTL
 * @returns {Promise<any>} - Datos del caché o frescos
 */
export async function cachedFetch(cacheKey, fetchFn, type = 'default') {
    // Intentar obtener del caché primero
    const cached = getCache(cacheKey);
    if (cached !== null) {
        return cached;
    }

    // Si hay una solicitud en curso para esta clave, reutilizarla
    if (pendingRequests.has(cacheKey)) {
        return pendingRequests.get(cacheKey);
    }

    // Si no hay caché válido ni solicitud en curso, hacer fetch y deduplicar
    const promise = (async () => {
        try {
            const freshData = await fetchFn();
            if (freshData !== null && freshData !== undefined) {
                setCache(cacheKey, freshData, type);
            }
            return freshData;
        } finally {
            pendingRequests.delete(cacheKey);
        }
    })();

    pendingRequests.set(cacheKey, promise);
    return promise;
}

// Limpiar caché expirado al cargar la app
if (typeof window !== 'undefined') {
    clearExpiredCache();
}
