import React from 'react';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function CartButton() {
    const { getTotalItems, setIsCartOpen, isCartOpen } = useCart();
    const itemCount = getTotalItems();

    // Hide when cart is already open
    if (isCartOpen) return null;

    return (
        <button
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-8 right-8 z-40 w-16 h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 flex items-center justify-center group"
        >
            <ShoppingCart size={24} />

            <AnimatePresence>
                {itemCount > 0 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white"
                    >
                        {itemCount > 99 ? '99+' : itemCount}
                    </motion.div>
                )}
            </AnimatePresence>
        </button>
    );
}
