import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Siempre modo claro - modo oscuro deshabilitado
    const [theme] = useState('day');

    useEffect(() => {
        const root = document.documentElement;
        
        // Forzar siempre modo claro
        root.classList.remove('dark', 'theme-night');
        root.style.colorScheme = 'light';
        
        // Limpiar cualquier preferencia guardada de modo oscuro
        localStorage.removeItem('bikitchen-theme');
    }, []);

    // Toggle deshabilitado - siempre modo claro
    const toggleTheme = () => {};

    const isDark = false;

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
