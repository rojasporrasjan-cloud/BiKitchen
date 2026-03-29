import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingCart, MessageSquare, Loader2, Check, Sparkles, Calendar } from 'lucide-react';
import { getOfficialMenus } from '../../utils/firestoreMenus';

// Iconos de comida para cada día
const FOOD_ICONS = ['🍗', '🥩', '🍤', '🐟', '🍖'];

export default function PromoMenuModal({
    packName,
    menuKey,
    promoPrice,
    promoImage,
    promoMetadata, // Nueva prop para metadatos de la promoción
    isOpen,
    onClose,
    onAddToCart,
    onBack // Nueva prop para volver atrás
}) {
    const [menu, setMenu] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notes, setNotes] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [isAdding, setIsAdding] = useState(false); // Estado para feedback visual

    useEffect(() => {
        if (isOpen && menuKey) {
            loadMenu();
        }
    }, [isOpen, menuKey]);

    const loadMenu = async () => {
        setLoading(true);
        try {
            const menusData = await getOfficialMenus();
            console.log('[PromoMenuModal] Datos completos de Firebase:', menusData);
            console.log('[PromoMenuModal] Buscando menuKey:', menuKey);
            console.log('[PromoMenuModal] Keys disponibles:', Object.keys(menusData));

            // Detectar si es menú sin carbohidratos
            const isNoCarbsMenu = menuKey === 'sinCarbos' || menuKey === 'keto';

            const menuData = menusData[menuKey];
            console.log('[PromoMenuModal] Menú encontrado:', menuData);

            if (menuData && Array.isArray(menuData)) {
                // Convertir objetos a strings si es necesario
                const formattedMenu = menuData.map(item => {
                    if (typeof item === 'string') {
                        return item;
                    } else if (typeof item === 'object' && item !== null) {
                        // Si es un objeto con propiedades, construir el texto
                        const parts = [];
                        if (item.proteina) parts.push(item.proteina);
                        if (item.vegetal && item.vegetal !== '—') parts.push(item.vegetal);
                        // NO incluir carbohidratos si es menú sin carbos
                        if (!isNoCarbsMenu && item.carbo && item.carbo !== '—') {
                            parts.push(item.carbo);
                        }
                        return parts.join(' + ') || 'Plato del día';
                    }
                    return 'Plato del día';
                });
                console.log('[PromoMenuModal] Menú formateado:', formattedMenu);
                setMenu(formattedMenu);
            } else {
                console.warn('[PromoMenuModal] No se encontró menú o no es array');
                setMenu([]);
            }
        } catch (error) {
            console.error('[PromoMenuModal] Error cargando menú:', error);
            // Mostrar mensaje de error al usuario en lugar de fallar silenciosamente
            alert('Error cargando el menú desde Firebase. Por favor, verifica que los menús estén configurados correctamente en el admin.');
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
            customizations: {
                notes: notes
            }
        };

        onAddToCart(cartItem);

        // Timeout para mostrar feedback antes de cerrar
        setTimeout(() => {
            setIsAdding(false);
            onClose();
        }, 1500);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="relative bg-gradient-to-br from-white via-white to-gray-50 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden border border-gray-100 flex flex-col"
                >
                    {/* Header mejorado */}
                    <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white px-6 py-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
                        <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {/* Botón Volver atrás */}
                                {onBack && (
                                    <button
                                        onClick={onBack}
                                        className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                        title="Volver atrás"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M19 12H5M12 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                )}
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                                    🍽️
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black">{packName}</h2>
                                    <p className="text-white/90 text-sm font-medium mt-0.5">Menú Semanal</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="animate-spin text-orange-500 mb-3" size={40} />
                                <p className="text-gray-500 text-sm font-medium">Cargando menú...</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Banner informativo mejorado */}
                                <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200 rounded-2xl p-5 mb-6 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                            <Calendar className="text-white" size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-gray-900 mb-1.5 text-lg">🍽️ Menú de la Semana</h3>
                                            <p className="text-sm text-gray-700 font-medium">5 almuerzos deliciosos y balanceados</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Lista de platos mejorada */}
                                <div className="grid gap-3">
                                    {menu.map((plato, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="flex items-start gap-4 p-4 bg-white rounded-2xl border-2 border-gray-100 hover:border-orange-300 hover:shadow-lg transition-all group"
                                        >
                                            <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                                                {FOOD_ICONS[index] || '🍽️'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-black text-orange-600 uppercase tracking-wider bg-orange-100 px-2 py-1 rounded-lg">Día {index + 1}</span>
                                                </div>
                                                <p className="text-sm text-gray-800 font-semibold leading-relaxed">{plato}</p>
                                            </div>
                                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                <Check className="text-green-600" size={18} />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Badge informativo */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200 mt-6"
                                >
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                                        <div>
                                            <p className="text-sm font-bold text-gray-900 mb-1">✨ Incluido en tu pack</p>
                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                Menú balanceado, preparado fresco cada semana con ingredientes de calidad
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>
                        )}

                        {/* Anotaciones Especiales */}
                        <div className="mt-6 pt-6 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <MessageSquare size={18} className="text-orange-500" />
                                Anotaciones especiales
                            </h4>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Ej: Sin zanahoria, sin repollo, alergia a mariscos, preferencia de proteína..."
                                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Footer mejorado */}
                    <div className="border-t-2 border-gray-100 bg-gradient-to-br from-gray-50 to-white px-6 py-5">
                        <div className="flex items-center justify-between mb-5 p-4 bg-white rounded-2xl border-2 border-orange-200 shadow-sm">
                            <span className="text-gray-700 font-bold">Precio promocional</span>
                            <span className="text-3xl font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">₡{promoPrice.toLocaleString('es-CR')}</span>
                        </div>

                        {/* Contador de cantidad mejorado */}
                        <div className="flex items-center justify-between mb-5 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-200">
                            <span className="text-sm font-black text-gray-800">Cantidad:</span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="w-10 h-10 rounded-xl bg-white border-2 border-orange-300 hover:bg-orange-100 flex items-center justify-center font-black text-orange-600 transition-all hover:scale-110 active:scale-95 shadow-sm"
                                >
                                    -
                                </button>
                                <span className="w-12 text-center font-black text-2xl text-orange-600">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="w-10 h-10 rounded-xl bg-white border-2 border-orange-300 hover:bg-orange-100 flex items-center justify-center font-black text-orange-600 transition-all hover:scale-110 active:scale-95 shadow-sm"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={handleAddToCart}
                            disabled={loading || menu?.length === 0 || isAdding}
                            className={`w-full font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 text-lg ${isAdding
                                ? 'bg-green-500 text-white'
                                : 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:via-amber-600 hover:to-orange-700 text-white'
                                }`}
                        >
                            {isAdding ? (
                                <>
                                    <Check size={22} />
                                    ¡Agregado al carrito!
                                </>
                            ) : (
                                <>
                                    <ShoppingCart size={22} />
                                    Añadir al carrito
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
