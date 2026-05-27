import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeSwitcher Component - BiKitchen
 * 
 * Permite alternar entre modo claro y oscuro con animación suave.
 * Persiste la preferencia en localStorage.
 */
export default function ThemeSwitcher({ className = '' }) {
    const [isDark, setIsDark] = useState(false);

    // Inicializar tema desde localStorage o preferencia del sistema
    useEffect(() => {
        const savedTheme = localStorage.getItem('bikitchen-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
            document.documentElement.classList.add('theme-night');
        }
    }, []);

    const toggleTheme = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        
        if (newIsDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.add('theme-night');
            localStorage.setItem('bikitchen-theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.remove('theme-night');
            localStorage.setItem('bikitchen-theme', 'light');
        }
    };

    return (
        <button
            onClick={toggleTheme}
            className={`relative p-2.5 rounded-xl transition-all duration-300 ${
                isDark 
                    ? 'bg-bikitchen-charcoal-light text-primary-400 hover:bg-bikitchen-charcoal' 
                    : 'bg-secondary-100 text-primary-500 hover:bg-secondary-200'
            } ${className}`}
            aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            <div className="relative w-5 h-5">
                {/* Sol */}
                <Sun 
                    size={20} 
                    className={`absolute inset-0 transition-all duration-300 ${
                        isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
                    }`}
                />
                {/* Luna */}
                <Moon 
                    size={20} 
                    className={`absolute inset-0 transition-all duration-300 ${
                        isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
                    }`}
                />
            </div>
        </button>
    );
}
