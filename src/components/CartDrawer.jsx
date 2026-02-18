import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, ArrowRight, Tag, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CheckoutSteps from './CheckoutSteps';

export default function CartDrawer() {
    const { 
        cart, 
        isCartOpen, 
        setIsCartOpen, 
        removeFromCart, 
        updateQuantity, 
        getSubtotal,
        getDiscount,
        getTotalPrice, 
        appliedCoupon,
        couponLoading,
        couponError,
        applyCoupon,
        removeCoupon,
        shippingDiscount
    } = useCart();
    const { currentUser } = useAuth();
    const [couponCode, setCouponCode] = useState('');
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [showStepsCheckout, setShowStepsCheckout] = useState(false);

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        const result = await applyCoupon(couponCode.trim(), currentUser?.uid);
        if (result.success) {
            setCouponCode('');
            setShowCouponInput(false);
        }
    };

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 bg-black/50 z-[60]"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-[60] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={24} className="text-orange-500" />
                                <h2 className="text-xl font-bold text-gray-900">Tu Carrito</h2>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4 pt-2">
                            {cart.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Tu carrito está vacío</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="flex gap-3 p-3 bg-gray-50 rounded-xl"
                                        >
                                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                    />
                                                ) : null}
                                                <div className={`w-full h-full items-center justify-center bg-gradient-to-br from-bikitchen-orange/20 to-bikitchen-gold/20 ${item.image ? 'hidden' : 'flex'}`}>
                                                    <span className="text-2xl">🍽️</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                                                {item.planLabel && (
                                                    <p className="text-xs text-orange-500 font-semibold">
                                                        {item.planLabel}
                                                    </p>
                                                )}
                                                {item.desc && (
                                                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                                        {item.desc}
                                                    </p>
                                                )}
                                                <div className="mt-2 flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">
                                                        Precio unitario: <span className="font-semibold">₡{(Number(item.price) || 0).toLocaleString('es-CR')}</span>
                                                    </span>
                                                    <span className="text-xs font-bold text-orange-500">
                                                        Subtotal: ₡{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString('es-CR')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.plan, Math.max(1, item.quantity - 1))}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.plan, item.quantity + 1)}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id, item.plan)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-start"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {cart.length > 0 && (
                            <div className="border-t border-gray-200 p-4 sm:p-6 space-y-3">
                                {/* Sección de Cupón */}
                                <div className="space-y-2">
                                    {appliedCoupon ? (
                                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle size={16} className="text-green-600" />
                                                <div>
                                                    <span className="text-sm font-semibold text-green-700">{appliedCoupon.code}</span>
                                                    <p className="text-xs text-green-600">{appliedCoupon.discountText}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={removeCoupon}
                                                className="text-green-600 hover:text-green-800 p-1"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : showCouponInput ? (
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={couponCode}
                                                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                                    placeholder="Código de cupón"
                                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 uppercase"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                                />
                                                <button
                                                    onClick={handleApplyCoupon}
                                                    disabled={couponLoading || !couponCode.trim()}
                                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    {couponLoading ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
                                                </button>
                                            </div>
                                            {couponError && (
                                                <div className="flex items-center gap-2 text-red-600 text-xs">
                                                    <XCircle size={14} />
                                                    {couponError}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => {
                                                    setShowCouponInput(false);
                                                    setCouponCode('');
                                                }}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowCouponInput(true)}
                                            className="flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium"
                                        >
                                            <Tag size={16} />
                                            ¿Tienes un cupón de descuento?
                                        </button>
                                    )}
                                </div>

                                {/* Resumen de precios */}
                                <div className="space-y-1 pt-2 border-t border-gray-100">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Subtotal</span>
                                        <span>₡{getSubtotal().toLocaleString('es-CR')}</span>
                                    </div>
                                    {appliedCoupon && getDiscount() > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>Descuento ({appliedCoupon.code})</span>
                                            <span>-₡{getDiscount().toLocaleString('es-CR')}</span>
                                        </div>
                                    )}
                                    {shippingDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-blue-600">
                                            <span>🚚 Envío</span>
                                            <span className="font-medium">Pagas solo {100 - shippingDiscount}%</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-lg font-bold pt-1">
                                        <span>Total:</span>
                                        <span className="text-orange-500">₡{getTotalPrice().toLocaleString('es-CR')}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 text-center">+ envío según zona</p>
                                </div>

                                {/* Botones de checkout */}
                                <div className="space-y-2 pt-2">
                                    <button
                                        onClick={() => setShowStepsCheckout(true)}
                                        className="w-full py-3 bg-bikitchen-orange text-white rounded-lg font-medium hover:bg-bikitchen-orange-dark transition-colors flex items-center justify-center gap-2"
                                    >
                                        Finalizar Pedido
                                        <ArrowRight size={18} />
                                    </button>
                                </div>

                                {/* Métodos de pago aceptados */}
                                <div className="pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 text-center mb-2">Aceptamos</p>
                                    <div className="flex items-center justify-center gap-3 flex-wrap">
                                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">SINPE Móvil</span>
                                        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded">Transferencia</span>
                                        <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">WhatsApp</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* Step-by-Step Checkout */}
                    <CheckoutSteps 
                        isOpen={showStepsCheckout} 
                        onClose={() => {
                            setShowStepsCheckout(false);
                            setIsCartOpen(false);
                        }} 
                    />
                </>
            )}
        </AnimatePresence>
    );
}
