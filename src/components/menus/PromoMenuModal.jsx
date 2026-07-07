import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Loader2, Check, Sparkles, Calendar, ArrowLeft, Minus, Plus } from 'lucide-react';
import { getOfficialMenus } from '../../utils/firestoreMenus';

// Iconos de comida para cada día
const FOOD_ICONS = ['🍗', '🥩', '🍤', '🐟', '🍖'];

export default function PromoMenuModal({
    packName,
    menuKey,
    promoPrice,
    promoImage,
    promoMetadata,
    isOpen,
    onClose,
    onAddToCart,
    onBack
}) {
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [substitutions] = useState({ proteinChanges: [], vegeChanges: [], carboChanges: [] });
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        if (isOpen && menuKey) {
            loadMenu();
        } else if (!isOpen) {
            setSubstitutions({ proteinChanges: [], vegeChanges: [], carboChanges: [] });
            setQuantity(1);
        }
    }, [isOpen, menuKey]);

    // Scroll lock + ESC
    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onEsc);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onEsc);
        };
    }, [isOpen, onClose]);

    const loadMenu = async () => {
        setLoading(true);
        try {
            const menusData = await getOfficialMenus();
            console.log('[PromoMenuModal] Buscando menuKey:', menuKey);

            const isNoCarbsMenu = menuKey === 'sinCarbos' || menuKey === 'keto';
            const menuData = menusData[menuKey];

            if (menuData && Array.isArray(menuData)) {
                const rawMenu = menuData.slice(0, 5).map((item, index) => {
                    if (typeof item === 'string') {
                        return { numero: index + 1, proteina: item };
                    } else if (typeof item === 'object' && item !== null) {
                        return {
                            numero: item.numero || (index + 1),
                            proteina: item.proteina || '',
                            vegetal: item.vegetal || '',
                            carbo: isNoCarbsMenu ? '' : (item.carbo || ''),
                        };
                    }
                    return { numero: index + 1, proteina: 'Plato del día' };
                });
                setMenu(rawMenu);
            } else {
                console.warn('[PromoMenuModal] No se encontró menú o no es array');
                setMenu([]);
            }
        } catch (error) {
            console.error('[PromoMenuModal] Error cargando menú:', error);
            setMenu([]);
        }
        setLoading(false);
    };

    const handleAddToCart = () => {
        setIsAdding(true);

        const cartItem = {
            id: `promo-${menuKey}-${Date.now()}`,
            name: `${promoMetadata?.title || 'Promoción'} - ${packName}`,
            price: promoPrice,
            quantity: quantity,
            menuKey: menuKey,
            isPromo: true,
            promoId: promoMetadata?.id,
            promoTitle: promoMetadata?.title,
            benefits: promoMetadata?.benefits || [],
            image: promoImage,
            plan: 'monthly',
            planLabel: promoMetadata?.planLabel || 'Promoción Mensual',
            customizations: substitutions
        };

        onAddToCart(cartItem);

        setTimeout(() => {
            setIsAdding(false);
            onClose();
        }, 1500);
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <AnimatePresence>
            <div key="promo-menu-modal-wrapper" className="fixed inset-0 z-[60] flex justify-end">

                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/65"
                />

                {/* Side Panel */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full md:w-[52%] lg:w-[46%] xl:w-[40%] h-full bg-white shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Hero Header */}
                    <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 relative h-[140px] sm:h-[180px] shrink-0 overflow-hidden flex flex-col justify-end">
                        {/* Decorative circles */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-28 h-28 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        {/* Close / Back button */}
                        <button
                            onClick={onBack || onClose}
                            className="absolute top-4 left-4 w-10 h-10 bg-white/25 hover:bg-white/40 rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 border border-white/30"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        {/* Title */}
                        <div className="relative px-5 pb-5">
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Menú Semanal · Promoción</p>
                            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow">
                                {packName}
                            </h2>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto side-panel-scrollbar">
                        <div className="p-5 sm:p-6 space-y-5">

                            {/* Banner */}
                            <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-4">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                    <Calendar className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900 text-sm">🍽️ Menú de la Semana</h3>
                                    <p className="text-xs text-slate-600 font-medium mt-0.5">5 almuerzos deliciosos y balanceados</p>
                                </div>
                            </div>

                            {/* Dish list */}
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-10">
                                    <Loader2 className="animate-spin text-orange-500 mb-3" size={36} />
                                    <p className="text-slate-400 text-sm font-medium">Cargando menú...</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {menu.map((dish, index) => {
                                        const displayText = [
                                            dish.proteina,
                                            dish.vegetal && dish.vegetal !== '—' ? dish.vegetal : null,
                                            dish.carbo && dish.carbo !== '—' ? dish.carbo : null,
                                        ].filter(Boolean).join(' · ') || 'Plato del día';

                                        return (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="flex items-center gap-3 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 p-3 rounded-2xl transition-colors group"
                                            >
                                                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-md group-hover:scale-110 transition-transform">
                                                    {FOOD_ICONS[index] || '🍽️'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-100 px-1.5 py-0.5 rounded-md">
                                                        Día {index + 1}
                                                    </span>
                                                    <p className="text-xs font-bold text-slate-800 leading-snug mt-0.5 line-clamp-2">{displayText}</p>
                                                </div>
                                                <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <Check className="text-green-600" size={14} />
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Included badge */}
                            {!loading && (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 flex items-start gap-3">
                                    <Sparkles className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
                                    <div>
                                        <p className="text-sm font-black text-slate-900">✨ Incluido en tu pack</p>
                                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                                            Menú balanceado, preparado fresco cada semana con ingredientes de calidad
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Sustituciones desactivadas en promociones — precio fijo no permite cambios */}

                            {/* Spacer */}
                            <div className="h-4" />
                        </div>
                    </div>

                    {/* Sticky footer */}
                    <div
                        className="shrink-0 bg-white border-t border-slate-100 px-5 pt-4 shadow-[0_-12px_32px_rgba(0,0,0,0.08)]"
                        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
                    >
                        {/* Price + quantity */}
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Precio promocional</p>
                                <p className="text-2xl font-black text-slate-900">
                                    ₡{promoPrice.toLocaleString('es-CR')}
                                </p>
                            </div>
                            <div className="flex items-center bg-slate-100 rounded-2xl p-1">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors rounded-xl hover:bg-white"
                                >
                                    <Minus size={15} />
                                </button>
                                <span className="w-8 text-center font-black text-base text-slate-900">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors rounded-xl hover:bg-white"
                                >
                                    <Plus size={15} />
                                </button>
                            </div>
                        </div>

                        {/* Add to cart button */}
                        <button
                            onClick={handleAddToCart}
                            disabled={loading || menu?.length === 0 || isAdding}
                            className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm uppercase tracking-widest ${
                                isAdding
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-900 hover:bg-orange-600 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                        >
                            {isAdding ? (
                                <>
                                    <Check size={20} strokeWidth={3} />
                                    ¡Agregado al carrito!
                                </>
                            ) : (
                                <>
                                    <ShoppingCart size={20} />
                                    Añadir al carrito
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>

            <style>{`
                .side-panel-scrollbar::-webkit-scrollbar { width: 3px; }
                .side-panel-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .side-panel-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            `}</style>
        </AnimatePresence>,
        document.body
    );
}
