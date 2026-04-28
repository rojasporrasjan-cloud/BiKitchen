import { useState, useEffect, useCallback, useRef } from 'react';
import { getOfficialMenus } from '../utils/firestoreMenus';

/**
 * Hook personalizado para cargar menús con recarga automática
 * cuando la página vuelve a estar visible (especialmente importante en móviles)
 * 
 * Soluciona el problema donde los cambios no se ven en móviles porque
 * React mantiene el estado anterior cuando la app está en background
 */
export function useMenusRefresh() {
    const [menus, setMenus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dataVersion, setDataVersion] = useState(0);
    const lastLoadRef = useRef(0);

    // Función para cargar menús
    const loadMenus = useCallback(async (force = false) => {
        const now = Date.now();
        // Throttle de 30 segundos para evitar lecturas excesivas, a menos que se fuerce
        if (!force && now - lastLoadRef.current < 30000) {
            return;
        }
        lastLoadRef.current = now;
        try {
            setLoading(true);
            setError(null);
            
            // Pasar el parámetro force a getOfficialMenus
            const data = await getOfficialMenus(force);
            
            setMenus(data);
            setDataVersion(prev => prev + 1); // Incrementar versión para forzar re-render
            
            console.log('[useMenusRefresh] Menús cargados, versión:', dataVersion + 1);
        } catch (err) {
            console.error('[useMenusRefresh] Error cargando menús:', err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [dataVersion]);

    // Cargar menús al montar el componente
    useEffect(() => {
        loadMenus();
    }, []);

    // CRÍTICO: Recargar cuando la página vuelve a estar visible
    // Esto soluciona el problema en móviles donde la app queda en background
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[useMenusRefresh] Página visible de nuevo - recargando menús');
                loadMenus();
            }
        };

        // Escuchar cambios de visibilidad
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // También recargar cuando la ventana vuelve a tener foco
        window.addEventListener('focus', loadMenus);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('focus', loadMenus);
        };
    }, [loadMenus]);

    return {
        menus,
        loading,
        error,
        reload: loadMenus,
        dataVersion // Útil para forzar re-render en componentes hijos
    };
}
