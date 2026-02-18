import { useEffect, useCallback } from 'react';

/**
 * Rutas populares para precargar
 */
const POPULAR_ROUTES = [
    () => import('../pages/PacksPage'),
    () => import('../pages/LandingPage'),
    () => import('../pages/ComparadorPage'),
    () => import('../pages/FAQPage'),
];

/**
 * Hook para precargar rutas populares
 * Mejora la navegación al tener los chunks ya cargados
 */
export function usePrefetchRoutes() {
    useEffect(() => {
        // Esperar a que la página principal cargue
        const timer = setTimeout(() => {
            // Usar requestIdleCallback si está disponible
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(() => {
                    POPULAR_ROUTES.forEach(route => {
                        route().catch(() => {}); // Ignorar errores
                    });
                });
            } else {
                // Fallback para Safari
                POPULAR_ROUTES.forEach(route => {
                    route().catch(() => {});
                });
            }
        }, 2000); // Esperar 2 segundos después de cargar

        return () => clearTimeout(timer);
    }, []);
}

/**
 * Hook para prefetch on hover
 * Precarga una ruta cuando el usuario hace hover sobre un link
 */
export function usePrefetchOnHover() {
    const prefetchedRoutes = new Set();

    const prefetch = useCallback((routeLoader) => {
        if (prefetchedRoutes.has(routeLoader)) return;
        
        prefetchedRoutes.add(routeLoader);
        routeLoader().catch(() => {});
    }, []);

    const createHoverProps = useCallback((routeLoader) => ({
        onMouseEnter: () => prefetch(routeLoader),
        onFocus: () => prefetch(routeLoader),
    }), [prefetch]);

    return { prefetch, createHoverProps };
}

/**
 * Prefetch de imágenes
 */
export function prefetchImages(imageUrls) {
    imageUrls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

/**
 * Hook para prefetch de datos
 */
export function usePrefetchData(fetchFn, dependencies = []) {
    useEffect(() => {
        const timer = setTimeout(() => {
            if ('requestIdleCallback' in window) {
                window.requestIdleCallback(() => fetchFn());
            } else {
                fetchFn();
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, dependencies);
}

/**
 * Componente Link con prefetch automático
 */
export function PrefetchLink({ to, loader, children, className, ...props }) {
    const handleMouseEnter = () => {
        if (loader) {
            loader().catch(() => {});
        }
    };

    return (
        <a
            href={to}
            onMouseEnter={handleMouseEnter}
            onFocus={handleMouseEnter}
            className={className}
            {...props}
        >
            {children}
        </a>
    );
}

export default usePrefetchRoutes;
