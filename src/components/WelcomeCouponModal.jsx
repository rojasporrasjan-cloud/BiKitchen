import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, Check, X, Sparkles, PartyPopper } from 'lucide-react';
import { getWelcomeCoupon } from '../utils/firestoreCoupons';

/**
 * Modal que muestra el cupón de bienvenida después del registro
 */
export default function WelcomeCouponModal({ isOpen, onClose, userName }) {
    const [coupon, setCoupon] = useState(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadWelcomeCoupon();
        }
    }, [isOpen]);

    const loadWelcomeCoupon = async () => {
        setLoading(true);
        try {
            const welcomeCoupon = await getWelcomeCoupon();
            setCoupon(welcomeCoupon);
        } catch (error) {
            console.error('Error loading welcome coupon:', error);
        }
        setLoading(false);
    };

    const handleCopy = async () => {
        if (coupon?.code) {
            try {
                await navigator.clipboard.writeText(coupon.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Error copying:', err);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header con gradiente */}
                    <div className="relative bg-gradient-to-br from-bikitchen-orange via-orange-500 to-bikitchen-gold p-8 text-center">
                        {/* Decoraciones */}
                        <div className="absolute top-4 left-4">
                            <Sparkles className="text-white/30" size={24} />
                        </div>
                        <div className="absolute top-4 right-4">
                            <PartyPopper className="text-white/30" size={24} />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent" />
                        
                        {/* Botón cerrar */}
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Icono principal */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                            className="w-20 h-20 mx-auto bg-white rounded-full flex items-center justify-center shadow-xl mb-4"
                        >
                            <Gift size={40} className="text-bikitchen-orange" />
                        </motion.div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-2xl font-bold text-white mb-2"
                        >
                            ¡Bienvenido{userName ? `, ${userName}` : ''}! 🎉
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-white/90"
                        >
                            Gracias por unirte a BiKitchen
                        </motion.p>
                    </div>

                    {/* Contenido */}
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-4">
                                <div className="w-8 h-8 border-3 border-bikitchen-orange border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-gray-500 mt-2">Cargando tu regalo...</p>
                            </div>
                        ) : coupon ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                            >
                                <p className="text-center text-gray-600 mb-4">
                                    Te regalamos un cupón de descuento para tu primer pedido:
                                </p>

                                {/* Cupón */}
                                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 border-2 border-dashed border-bikitchen-orange/30 mb-4">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500 mb-1">Tu código de descuento</p>
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="text-2xl font-bold text-bikitchen-orange font-mono tracking-wider">
                                                {coupon.code}
                                            </span>
                                            <button
                                                onClick={handleCopy}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    copied 
                                                        ? 'bg-green-100 text-green-600' 
                                                        : 'bg-orange-100 text-bikitchen-orange hover:bg-orange-200'
                                                }`}
                                            >
                                                {copied ? <Check size={18} /> : <Copy size={18} />}
                                            </button>
                                        </div>
                                        <p className="text-lg font-semibold text-gray-800 mt-2">
                                            {coupon.type === 'percentage' 
                                                ? `${coupon.value}% de descuento`
                                                : `₡${coupon.value?.toLocaleString()} de descuento`
                                            }
                                        </p>
                                        {coupon.description && (
                                            <p className="text-sm text-gray-500 mt-1">{coupon.description}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Info adicional */}
                                <div className="bg-gray-50 rounded-xl p-3 text-center">
                                    <p className="text-xs text-gray-500">
                                        💡 Puedes usar este código en <strong>Mi Cuenta → Código de Descuento</strong> o al hacer checkout
                                    </p>
                                </div>
                            </motion.div>
                        ) : (
                            <div className="text-center py-4">
                                <p className="text-gray-600">
                                    ¡Estás listo para comenzar a disfrutar de comida saludable!
                                </p>
                            </div>
                        )}

                        {/* Botón */}
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            onClick={onClose}
                            className="w-full mt-6 py-3 bg-bikitchen-orange text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                        >
                            ¡Comenzar a explorar! 🍽️
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
