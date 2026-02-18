import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

/**
 * Botón flotante del carrito - Solo visible en móvil
 * Se posiciona arriba del botón de Navidad
 */
export default function FloatingCartButton({ onClick, isCartOpen = false }) {
    const { cart } = useCart();
    
    const totalItems = (cart || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
    
    // No mostrar si el carrito ya está abierto
    if (isCartOpen) return null;

    return (
        <motion.button
            onClick={onClick}
            className="fixed bottom-24 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center bg-bikitchen-orange text-white md:hidden"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            title="Ver carrito"
        >
            <ShoppingCart size={24} />
            <AnimatePresence>
                {totalItems > 0 && (
                    <motion.span
                        key="badge"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                    >
                        {totalItems > 99 ? '99+' : totalItems}
                    </motion.span>
                )}
            </AnimatePresence>
        </motion.button>
    );
}
