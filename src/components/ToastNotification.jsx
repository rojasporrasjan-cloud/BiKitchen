import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ToastNotification() {
    const { notification } = useCart();

    return (
        <AnimatePresence>
            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="fixed bottom-24 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[9999]"
                >
                    <div className="flex items-center gap-3 bg-white/95 backdrop-blur-lg px-4 py-3 rounded-2xl shadow-xl border border-gray-200 max-w-sm mx-auto md:mx-0">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                            <Check size={16} className="text-white" />
                        </div>
                        <span className="text-sm font-medium text-gray-800 line-clamp-2">
                            {notification.message}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
