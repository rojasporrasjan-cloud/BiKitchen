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
                                    {cart.map((item, index) => (
                                        <motion.div
                                            key={`${item.id || 'item'}-${index}`}
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
                            <div className="border-t border-gray-200 p-4 sm:p-6 space-y-4">
                                
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
                                <div className="space-y-1.5 pt-4 border-t border-gray-100">
                                    <div className="flex justify-between text-sm text-gray-500">
                                        <span>Subtotal productos</span>
                                        <span>₡{getSubtotal().toLocaleString('es-CR')}</span>
                                    </div>
                                    
                                    {(appliedCoupon || appliedReferral) && getDiscount() > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 font-medium">
                                            <span className="flex items-center gap-1">
                                                <CheckCircle size={14} />
                                                Descuentos aplicados
                                            </span>
                                            <span>-₡{getDiscount().toLocaleString('es-CR')}</span>
                                        </div>
                                    )}

                                    {shippingDiscount > 0 && (
                                        <div className="flex justify-between text-sm text-blue-600 font-medium italic">
                                            <span className="flex items-center gap-1">
                                                <Truck size={14} />
                                                ¡Envío con {shippingDiscount}% descuento!
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center text-xl font-bold pt-2 text-gray-900 border-t border-gray-50 mt-1">
                                        <span>Total estimado</span>
                                        <span className="text-bikitchen-orange">₡{getTotalPrice().toLocaleString('es-CR')}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-400 text-center uppercase tracking-tighter">I.V.A Incluido • Costo de envío según zona</p>
                                </div>

                                {/* Botones de checkout */}
                                <div className="pt-2">
                                    <button
                                        onClick={() => setShowStepsCheckout(true)}
                                        className="w-full py-4 bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold text-white rounded-xl font-bold hover:shadow-lg hover:shadow-orange-200 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                                    >
                                        Finalizar Pedido
                                        <ArrowRight size={20} />
                                    </button>
                                </div>

                                {/* Métodos de pago aceptados */}
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] text-center mb-3">Medios de Pago Seguros</p>
                                        <div className="flex items-center justify-center">
                                            <div className="flex items-center gap-3 opacity-90">
                                                <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/visa.svg" alt="Visa" className="h-[14px] w-auto" />
                                                <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/mastercard.svg" alt="Mastercard" className="h-[18px] w-auto" />
                                                <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/amex.svg" alt="Amex" className="h-[16px] w-auto" />
                                            </div>
                                        </div>
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
