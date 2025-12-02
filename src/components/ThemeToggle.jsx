import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const { isCartOpen } = useCart();

    // Hide when cart is open
    if (isCartOpen) return null;

    return (
        <button
            onClick={toggleTheme}
            className="fixed bottom-24 right-8 z-[9999] w-14 h-14 rounded-full bg-gray-800 dark:bg-white backdrop-blur-xl border border-gray-700 dark:border-gray-300 flex items-center justify-center text-white dark:text-gray-800 hover:bg-gray-700 dark:hover:bg-gray-100 transition-all shadow-lg hover:shadow-2xl overflow-hidden group"
            aria-label="Toggle Theme"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>

            <AnimatePresence mode="wait" initial={false}>
                <motion.div
                    key={theme}
                    initial={{ y: 20, opacity: 0, rotate: -180, scale: 0.5 }}
                    animate={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ y: -20, opacity: 0, rotate: 180, scale: 0.5 }}
                    transition={{
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                    className="relative z-10"
                >
                    {theme === 'day' ? (
                        <Sun size={20} className="drop-shadow-lg" />
                    ) : (
                        <Moon size={20} className="drop-shadow-lg" />
                    )}
                </motion.div>
            </AnimatePresence>
        </button>
    );
}
