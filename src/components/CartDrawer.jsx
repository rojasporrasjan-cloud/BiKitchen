import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, ArrowRight, Tag, Loader2, CheckCircle, XCircle, Users, Truck } from 'lucide-react';
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
        shippingDiscount,
        applyReferralCode,
        appliedReferral,
        removeReferral,
        referralError,
        referralLoading
    } = useCart();
    const { currentUser } = useAuth();
    const [couponCode, setCouponCode] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [showReferralInput, setShowReferralInput] = useState(false);
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
                        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white z-[60] flex flex-col border-l border-gray-100"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-50 rounded-xl">
                                    <ShoppingCart size={20} className="text-orange-500" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Carrito</h2>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-110"
                            >
                                <X size={22} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {cart.length === 0 ? (
                                <div className="text-center py-16 text-gray-400 flex flex-col items-center">
                                    <div className="p-4 bg-gray-100/50 rounded-2xl mb-4">
                                        <ShoppingCart size={40} className="opacity-30" />
                                    </div>
                                    <p className="font-medium">Tu carrito está vacío</p>
                                    <p className="text-xs text-gray-400 mt-1">Agrega items para ver el resumen aquí</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cart.map((item, index) => (
                                        <motion.div
                                            key={`${item.id || 'item'}-${index}`}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="flex gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-gray-200 transition-all duration-200"
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
                                                <div className="flex items-center gap-2 mt-2 bg-gray-50 w-fit px-2 py-1.5 rounded-lg">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.plan, Math.max(1, item.quantity - 1))}
                                                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                                                    >
                                                        <Minus size={14} className="text-gray-600" />
                                                    </button>
                                                    <span className="text-sm font-semibold w-6 text-center text-gray-900">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.plan, item.quantity + 1)}
                                                        className="p-1 hover:bg-orange-100 rounded transition-colors"
                                                    >
                                                        <Plus size={14} className="text-orange-500" />
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id, item.plan)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 self-start"
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
                            <div className="border-t border-gray-100 p-5 space-y-4 bg-gray-50/50">
                                
                                {/* Cupones y Referidos */}
                                <div className="space-y-3">
                                    {/* Cupón Section */}
                                    <div>
                                        {appliedCoupon ? (
                                            <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Tag size={16} className="text-orange-500" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">{appliedCoupon.code}</p>
                                                        <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wider">{appliedCoupon.discountText}</p>
                                                    </div>
                                                </div>
                                                <button onClick={removeCoupon} className="text-gray-400 hover:text-gray-600 p-1">
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
                                                        placeholder="CÓDIGO DE CUPÓN"
                                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                                    />
                                                    <button
                                                        onClick={handleApplyCoupon}
                                                        disabled={couponLoading || !couponCode.trim()}
                                                        className="px-4 py-2 bg-bikitchen-orange text-white rounded-lg text-sm font-bold hover:bg-bikitchen-orange-dark disabled:opacity-50 transition-colors"
                                                    >
                                                        {couponLoading ? <Loader2 size={16} className="animate-spin" /> : 'Aplicar'}
                                                    </button>
                                                </div>
                                                {couponError && <p className="text-xs text-red-500 font-medium">{couponError}</p>}
                                                <button onClick={() => { setShowCouponInput(false); setCouponCode(''); }} className="text-[10px] text-gray-400 hover:text-gray-600 uppercase tracking-widest font-bold">Cancelar</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowCouponInput(true)}
                                                className="text-sm text-bikitchen-orange hover:text-bikitchen-orange-dark font-medium flex items-center gap-1.5 transition-colors"
                                            >
                                                <Tag size={14} />
                                                ¿Tienes un cupón?
                                            </button>
                                        )}
                                    </div>

                                    {/* Referral Section */}
                                    <div>
                                        {appliedReferral ? (
                                            <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <Users size={16} className="text-purple-600" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-gray-900 truncate">Invitado por {appliedReferral.referrerName || 'Amigo'}</p>
                                                        <p className="text-[10px] text-purple-600 font-medium uppercase tracking-wider">₡2,000 de regalo aplicado</p>
                                                    </div>
                                                </div>
                                                <button onClick={removeReferral} className="text-gray-400 hover:text-gray-600 p-1">
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : showReferralInput ? (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={referralCode}
                                                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                                                        placeholder="CÓDIGO DE INVITACIÓN"
                                                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && referralCode.trim()) {
                                                                applyReferralCode(referralCode).then(res => res.success && setReferralCode(''));
                                                            }
                                                        }}
                                                    />
                                                    <button
                                                        onClick={async () => {
                                                            const res = await applyReferralCode(referralCode);
                                                            if (res.success) setReferralCode('');
                                                        }}
                                                        disabled={referralLoading || !referralCode.trim()}
                                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        {referralLoading ? <Loader2 size={16} className="animate-spin" /> : 'Validar'}
                                                    </button>
                                                </div>
                                                {referralError && <p className="text-xs text-red-500 font-medium">{referralError}</p>}
                                                <button onClick={() => { setShowReferralInput(false); setReferralCode(''); }} className="text-[10px] text-gray-400 hover:text-gray-600 uppercase tracking-widest font-bold">Cancelar</button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowReferralInput(true)}
                                                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1.5 transition-colors"
                                            >
                                                <Users size={14} />
                                                ¿Un amigo te recomendó?
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Resumen de precios */}
                                <div className="space-y-2 pt-3 border-t border-gray-200 bg-white rounded-xl p-4 -mx-5 mb-4 mx-4 border">
                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span className="font-medium">Subtotal</span>
                                        <span>₡{getSubtotal().toLocaleString('es-CR')}</span>
                                    </div>

                                    {(appliedCoupon || appliedReferral) && getDiscount() > 0 && (
                                        <div className="flex justify-between text-xs text-green-600 font-semibold">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle size={13} />
                                                Descuentos
                                            </span>
                                            <span>-₡{getDiscount().toLocaleString('es-CR')}</span>
                                        </div>
                                    )}

                                    {shippingDiscount > 0 && (
                                        <div className="flex justify-between text-xs text-blue-600 font-semibold">
                                            <span className="flex items-center gap-1">
                                                <Truck size={13} />
                                                Envío {shippingDiscount}%
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-lg font-bold text-gray-900 border-t border-gray-100 pt-2 mt-1">
                                        <span>Total</span>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">₡{getTotalPrice().toLocaleString('es-CR')}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-400 text-center uppercase tracking-wider font-medium">IVA incluido</p>
                                </div>

                                {/* Botones de checkout */}
                                <div className="pt-0 -mx-5 px-5">
                                    <button
                                        onClick={() => setShowStepsCheckout(true)}
                                        className="w-full py-3.5 bg-gradient-to-r from-bikitchen-orange to-orange-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-orange-300/30 transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98] text-sm tracking-wide"
                                    >
                                        Finalizar Pedido
                                        <ArrowRight size={18} />
                                    </button>
                                </div>

                                {/* Métodos de pago aceptados */}
                                <div className="mt-2 pt-3 border-t border-gray-200 -mx-5 px-5 pb-2">
                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center mb-2.5">Pagos Seguros</p>
                                    <div className="flex items-center justify-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
                                        <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/visa.svg" alt="Visa" className="h-[12px] w-auto" />
                                        <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/mastercard.svg" alt="Mastercard" className="h-[15px] w-auto" />
                                        <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/amex.svg" alt="Amex" className="h-[14px] w-auto" />
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
