import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Check, X, AlertCircle, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function ToastNotification() {
    const { notification, dismissNotification } = useCart();
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        if (notification) {
            setProgress(100);
            const duration = 10000; // 10s
            const interval = 100;
            const step = (interval / duration) * 100;
            
            const timer = setInterval(() => {
                setProgress((prev) => Math.max(0, prev - step));
            }, interval);

            return () => clearInterval(timer);
        }
    }, [notification]);

    const getStyles = (type) => {
        switch (type) {
            case 'error': return { bg: 'bg-red-500', icon: <AlertCircle size={18} />, color: 'text-red-900', border: 'border-red-200', progress: 'bg-red-500' };
            case 'warning': return { bg: 'bg-amber-500', icon: <AlertCircle size={18} />, color: 'text-amber-900', border: 'border-amber-200', progress: 'bg-amber-500' };
            default: return { bg: 'bg-green-500', icon: <Check size={18} />, color: 'text-green-900', border: 'border-green-200', progress: 'bg-green-500' };
        }
    };

    const styles = notification ? getStyles(notification.type) : getStyles('success');

    return (
        <AnimatePresence>
            {notification && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="fixed bottom-24 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 z-[10000]"
                >
                    <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl px-5 py-4 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/50 max-w-sm mx-auto flex items-center gap-4">
                        {/* Progress Bar Background */}
                        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-gray-100/50">
                            <motion.div 
                                className={`h-full ${styles.progress} opacity-40`}
                                initial={{ width: '100%' }}
                                animate={{ width: `${progress}%` }}
                                transition={{ ease: 'linear' }}
                            />
                        </div>

                        <div className={`w-10 h-10 rounded-2xl ${styles.bg} text-white flex items-center justify-center shadow-lg shrink-0`}>
                            {styles.icon}
                        </div>

                        <div className="flex-1">
                            <p className={`text-sm font-black tracking-tight ${styles.color}`}>
                                {notification.type === 'error' ? '¡Atención!' : '¡Éxito!'}
                            </p>
                            <p className="text-xs font-bold text-gray-500/80 leading-relaxed">
                                {notification.message}
                            </p>
                        </div>

                        <button 
                            onClick={dismissNotification}
                            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
