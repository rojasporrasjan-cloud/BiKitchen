import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState('day');

    useEffect(() => {
        // Check local storage or system preference
        const savedTheme = localStorage.getItem('bikitchen-theme');
        if (savedTheme) {
            setTheme(savedTheme);
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(prefersDark ? 'night' : 'day');
        }
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        
        // Aplicar clase 'dark' para Tailwind y 'theme-night' para CSS custom
        if (theme === 'night') {
            root.classList.add('dark', 'theme-night');
            root.style.colorScheme = 'dark';
        } else {
            root.classList.remove('dark', 'theme-night');
            root.style.colorScheme = 'light';
        }
        
        localStorage.setItem('bikitchen-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'day' ? 'night' : 'day');
    };

    const isDark = theme === 'night';

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
