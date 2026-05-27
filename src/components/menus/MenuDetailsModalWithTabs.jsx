import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import {
  Utensils, ShoppingCart, Plus, Minus, Check,
  ChevronRight, Flame, Leaf, Zap, Star, ArrowLeft,
  Coffee, Sun, Moon
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import SubstitutionPicker from '../SubstitutionPicker';

// ── Static data ───────────────────────────────────────────────────────────────

const MENU_LABELS = {
  fullPack: 'Full Pack',
  keto: 'Keto',
  bajoCalorias: 'Bajo Calorías',
  sinCarbos: 'Sin Carbos',
  regular: 'Regular',
  vegetariano: 'Vegetariano',
  casaditos: 'Casaditos'
};

const PACK_PORTIONS = {
  fullPack:    { protein: '150g', carbos: 3, veggies: 2, description: 'Porción completa',   color: 'from-purple-500 to-indigo-500',  emoji: '💪' },
  regular:     { protein: '100g', carbos: 2, veggies: 1, description: 'Porción balanceada', color: 'from-blue-500 to-cyan-500',      emoji: '⚖️' },
  bajoCalorias:{ protein: '120g', carbos: 1, veggies: 2, description: 'Bajo en calorías',   color: 'from-green-500 to-emerald-500',  emoji: '🥗' },
  sinCarbos:   { protein: '120g', carbos: 0, veggies: 3, description: 'Sin carbohidratos',  color: 'from-red-500 to-orange-500',     emoji: '🔥' },
  keto:        { protein: '200g', carbos: 0, veggies: 3, description: 'Dieta Keto',         color: 'from-amber-500 to-yellow-500',   emoji: '⚡' },
  vegetariano: { protein: 'Vegetal', carbos: 2, veggies: 2, description: '100% Vegetal',    color: 'from-lime-500 to-green-500',     emoji: '🌱' },
  casaditos:   { protein: '100g', carbos: 2, veggies: 1, description: 'Tradicional',        color: 'from-orange-500 to-amber-500',   emoji: '🇨🇷' },
};

const MEAL_TYPES = {
  desayuno: { id: 'desayuno', label: 'Desayuno', icon: Coffee, color: 'bg-amber-500' },
  almuerzo: { id: 'almuerzo', label: 'Almuerzo', icon: Sun,    color: 'bg-orange-500' },
  cena:     { id: 'cena',     label: 'Cena',     icon: Moon,   color: 'bg-indigo-500' },
};

const PLANS = [
  { id: 'weekly',   label: 'Semanal',   sublabel: '5 almuerzos',  savings: null },
  { id: 'biweekly', label: 'Quincenal', sublabel: '10 almuerzos', savings: null },
  { id: 'monthly',  label: 'Mensual',   sublabel: '20 almuerzos', savings: '🔥 Mejor precio' },
];

const METHOD_LABELS = { whatsapp: 'WhatsApp', sinpe: 'SINPE', transfer: 'Transferencia', nmi: 'Tarjeta' };

const FOOD_ICONS = ['🍗', '🥩', '🍤', '🐟', '🍖'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function MenuDetailsModalWithTabs({
  menuKey,
  isOpen,
  onClose,
  packInfo,
  mealTypes = ['almuerzo'],
  customTabContent = {},
}) {
  const [loading, setLoading]       = useState(false);
  const [allMenus, setAllMenus]     = useState({});
  const [currentMealType, setCurrentMealType] = useState(mealTypes[0] || 'almuerzo');
  const [quantity, setQuantity]     = useState(1);
  const [substitutions, setSubstitutions] = useState({ proteinChanges: [], vegeChanges: [], carboChanges: [] });
  const [selectedPlan, setSelectedPlan] = useState(packInfo?.plan || 'weekly');
  const [isAdding, setIsAdding]     = useState(false);

  const { addToCart } = useCart();

  // ── Scroll lock + ESC ──────────────────────────────────────────────────────
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

  // ── Reset on close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setQuantity(1);
      setSubstitutions({ proteinChanges: [], vegeChanges: [], carboChanges: [] });
      setCurrentMealType(mealTypes[0] || 'almuerzo');
      setIsAdding(false);
    }
  }, [isOpen, mealTypes]);

  // ── Load weekly menus ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !menuKey) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getOfficialMenus(true);
        const menus = {};
        if (mealTypes.includes('desayuno'))
          menus.desayuno = (menuKey === 'vegetariano' ? data.desayunoVegetariano : data.desayuno) || [];
        if (mealTypes.includes('almuerzo'))
          menus.almuerzo = (data[menuKey] || []).slice(0, 5);
        if (mealTypes.includes('cena'))
          menus.cena = (data.cena?.[menuKey] || []).slice(0, 5);
        setAllMenus(menus);
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [isOpen, menuKey, mealTypes]);

  // ── Price helpers ──────────────────────────────────────────────────────────
  const getPriceForPlan = (plan) => {
    const pack = packInfo?.pack;
    if (!pack || packInfo.isPromocionPack) return null;
    let price = Number(pack[plan]) || 0;
    if (price <= 0) return null;
    const planOk = !pack.planesAplicables?.length || pack.planesAplicables.includes(plan);
    if (packInfo.hasDiscount && planOk) {
      price = pack.tipoDescuento === 'porcentaje'
        ? price * (1 - pack.valorDescuento / 100)
        : Math.max(0, price - pack.valorDescuento);
    }
    return Math.round(price);
  };

  const getDynamicPrice = () => {
    const pack = packInfo?.pack;
    if (!pack) return packInfo?.numericPrice || 0;
    let price = packInfo.isPromocionPack
      ? Number(pack.monthly) || 0
      : Number(pack[selectedPlan]) || 0;
    if (!packInfo.isPromocionPack) {
      const planOk = !pack.planesAplicables?.length || pack.planesAplicables.includes(selectedPlan);
      if (packInfo.hasDiscount && planOk) {
        price = pack.tipoDescuento === 'porcentaje'
          ? price * (1 - pack.valorDescuento / 100)
          : Math.max(0, price - pack.valorDescuento);
      }
    }
    return Math.round(price);
  };

  const currentUnitPrice  = getDynamicPrice();
  const totalPrice        = currentUnitPrice * quantity;

  const originalUnitPrice = (() => {
    const pack = packInfo?.pack;
    if (!pack || packInfo.isPromocionPack || !packInfo.hasDiscount) return null;
    const planOk = !pack.planesAplicables?.length || pack.planesAplicables.includes(selectedPlan);
    if (!planOk) return null;
    const base = Number(pack[selectedPlan]) || 0;
    return base > 0 && base !== currentUnitPrice ? base : null;
  })();

  const originalTotalPrice = originalUnitPrice ? originalUnitPrice * quantity : null;

  const metodosNote = (() => {
    const pack = packInfo?.pack;
    if (!originalTotalPrice || !pack?.metodosPermitidos) return null;
    const m = pack.metodosPermitidos;
    if (!m.length || m.length >= 4) return null;
    return m.map(k => METHOD_LABELS[k] || k).join(' · ');
  })();

  // ── Add to cart ────────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (isAdding) return;
    if (!currentUnitPrice || currentUnitPrice <= 0) {
      toast.error('Precio no disponible. Por favor recarga la página.');
      return;
    }
    setIsAdding(true);
    const planLabels = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };
    const pack = packInfo?.pack;
    addToCart({
      id: `menu-tabs-${menuKey}-${Date.now()}`,
      name:          packInfo?.name || 'Pack',
      desc:          packInfo?.desc || 'Menú semanal',
      image:         packInfo?.image,
      price:         currentUnitPrice,
      numericPrice:  currentUnitPrice,
      originalPrice: originalUnitPrice || undefined,
      quantity,
      menuKey,
      plan:          selectedPlan,
      planLabel:     planLabels[selectedPlan] || selectedPlan,
      categoryLabel: packInfo?.categoryLabel,
      customizations: substitutions,
      discountMetodos: packInfo?.hasDiscount ? (pack?.metodosPermitidos || null) : undefined,
    });
    toast.success(`${packInfo?.name} añadido al carrito 🛒`);
    setTimeout(() => { setIsAdding(false); onClose(); }, 900);
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const portionInfo    = PACK_PORTIONS[menuKey] || PACK_PORTIONS.regular;
  const currentDishes  = allMenus[currentMealType] || [];
  const isNoCarbsMenu  = ['keto', 'sinCarbos', 'cenaKeto', 'cenaSinCarbos'].includes(menuKey);
  const hasCustomContent = customTabContent?.[currentMealType];

  if (!isOpen) return null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex justify-end">

        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        />

        {/* Side Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full md:w-[52%] lg:w-[45%] xl:w-[40%] h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        >

          {/* ── HERO IMAGE ─────────────────────────────────────────────────── */}
          <div className="relative h-[200px] sm:h-[260px] shrink-0 overflow-hidden">
            <img
              src={packInfo?.image}
              alt={packInfo?.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 w-10 h-10 bg-white/15 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 border border-white/20"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Top-right badges */}
            <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
              <span className={`bg-gradient-to-r ${portionInfo.color} text-white text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest shadow-lg`}>
                {portionInfo.emoji} {portionInfo.description}
              </span>
              {packInfo?.hasDiscount && (
                <span className="bg-red-500 text-white text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest shadow-lg">
                  🔥 Descuento activo
                </span>
              )}
            </div>

            {/* Title overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">
                {packInfo?.categoryLabel || 'Pack Semanal'}{MENU_LABELS[menuKey] ? ` · ${MENU_LABELS[menuKey]}` : ''}
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-lg">
                {packInfo?.name}
              </h2>
              {packInfo?.desc && (
                <p className="text-white/75 text-xs font-medium mt-1 line-clamp-2 leading-relaxed">
                  {packInfo.desc}
                </p>
              )}
            </div>
          </div>

          {/* ── SCROLLABLE CONTENT ─────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto side-panel-scrollbar">
            <div className="p-5 sm:p-6 space-y-6">

              {/* Meal-type tabs */}
              {mealTypes.length > 1 && (
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-100">
                  {mealTypes.map(type => {
                    const meal = MEAL_TYPES[type];
                    if (!meal) return null;
                    const Icon = meal.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setCurrentMealType(type)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${
                          currentMealType === type
                            ? 'bg-white text-slate-900 shadow-lg'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <Icon size={14} />
                        {meal.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Plan selector */}
              {!packInfo?.isPromocionPack && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <Star size={10} className="text-orange-400" fill="currentColor" />
                    Elige tu plan
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {PLANS.map(({ id, label, sublabel, savings }) => {
                      const planPrice = getPriceForPlan(id);
                      const isActive  = selectedPlan === id;
                      if (!planPrice) return null;
                      return (
                        <button
                          key={id}
                          onClick={() => setSelectedPlan(id)}
                          className={`flex flex-col items-center py-3.5 px-2 rounded-2xl border-2 transition-all active:scale-95 relative overflow-hidden ${
                            isActive
                              ? 'bg-slate-900 border-slate-900 shadow-xl shadow-slate-900/20'
                              : 'bg-white border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {savings && (
                            <span className="absolute top-1 right-1 text-[7px] font-black text-orange-400 leading-none">★</span>
                          )}
                          {isActive && (
                            <Check size={11} className="text-orange-400 mb-1" strokeWidth={3} />
                          )}
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                            {label}
                          </span>
                          <span className={`text-sm font-black mt-0.5 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                            ₡{planPrice.toLocaleString()}
                          </span>
                          <span className="text-[8px] font-bold mt-0.5 text-slate-400">
                            {sublabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Macros card */}
              <div className={`bg-gradient-to-br ${portionInfo.color} p-4 rounded-2xl`}>
                <p className="text-white/70 text-[9px] font-black uppercase tracking-widest mb-3">
                  {currentMealType === 'desayuno'
                    ? 'Qué incluye cada desayuno'
                    : currentMealType === 'cena'
                    ? 'Qué incluye cada cena'
                    : 'Qué incluye cada almuerzo'}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                    <span className="block text-2xl mb-1">{currentMealType === 'desayuno' ? '☕' : '🍗'}</span>
                    <span className="text-white text-[10px] font-black block">{portionInfo.protein}</span>
                    <span className="text-white/60 text-[9px] font-bold">{currentMealType === 'desayuno' ? 'Bebida' : 'Proteína'}</span>
                  </div>
                  <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                    <span className="block text-2xl mb-1">🥦</span>
                    <span className="text-white text-[10px] font-black block">{portionInfo.veggies} porciones</span>
                    <span className="text-white/60 text-[9px] font-bold">Vegetales</span>
                  </div>
                  {!isNoCarbsMenu && currentMealType !== 'desayuno' ? (
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                      <span className="block text-2xl mb-1">🍚</span>
                      <span className="text-white text-[10px] font-black block">{portionInfo.carbos} porciones</span>
                      <span className="text-white/60 text-[9px] font-bold">Carbohidratos</span>
                    </div>
                  ) : (
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                      <span className="block text-2xl mb-1">{isNoCarbsMenu ? '✅' : '🍳'}</span>
                      <span className="text-white text-[10px] font-black block">{isNoCarbsMenu ? 'Sin carbos' : 'Incluido'}</span>
                      <span className="text-white/60 text-[9px] font-bold">{isNoCarbsMenu ? 'Bajo carb' : 'Extra'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dish list */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Utensils size={10} className="text-orange-500" />
                  Platos de la semana
                </p>
                <div className="space-y-2">
                  {hasCustomContent ? (
                    <div className="py-2 text-slate-600 font-medium">{customTabContent[currentMealType]}</div>
                  ) : loading ? (
                    [1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-2xl" />
                    ))
                  ) : currentDishes.length === 0 ? (
                    <p className="text-[11px] text-slate-300 italic py-4 text-center">
                      Menú pendiente de actualizar...
                    </p>
                  ) : (
                    currentDishes.map((dish, i) => {
                      const displayText = [
                        dish.proteina,
                        dish.vegetal && dish.vegetal !== '—' ? dish.vegetal : null,
                        !isNoCarbsMenu && currentMealType !== 'desayuno' && dish.carbo && dish.carbo !== '—'
                          ? dish.carbo
                          : null,
                      ].filter(Boolean).join(' · ') || dish.descripcion || dish.nombre || 'Plato del día';

                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 p-3 rounded-2xl transition-colors group"
                        >
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm border border-slate-100">
                            {FOOD_ICONS[i] || '🍽️'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest bg-orange-100 px-1.5 py-0.5 rounded-md">
                                Día {i + 1}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                              {displayText}
                            </p>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-orange-400 shrink-0 transition-colors" />
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Substitution picker */}
              <div className="border-t border-slate-100 pt-5">
                <SubstitutionPicker
                  value={substitutions}
                  onChange={setSubstitutions}
                  dishes={currentDishes}
                />
              </div>

              {/* Benefits */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">¿Por qué elegir este pack?</p>
                {[
                  { icon: <Flame size={13} className="text-orange-500" />, text: 'Preparado fresco cada semana con ingredientes de primera' },
                  { icon: <Leaf  size={13} className="text-emerald-500" />, text: 'Sin preservantes ni aditivos artificiales' },
                  { icon: <Zap   size={13} className="text-blue-500"    />, text: 'Listo para calentar en menos de 3 minutos' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      {item.icon}
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* Discount breakdown */}
              {originalTotalPrice && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl px-4 py-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Precio con descuento</p>
                      <p className="text-base font-bold text-slate-400 line-through">₡{originalTotalPrice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-orange-400 font-black uppercase">Total</p>
                      <p className="text-2xl font-black text-slate-900">₡{totalPrice.toLocaleString()}</p>
                    </div>
                  </div>
                  {metodosNote && (
                    <p className="text-[10px] font-bold text-orange-600 flex items-center gap-1 pt-2 border-t border-orange-100">
                      <span>💳</span> Descuento válido solo con: {metodosNote}
                    </p>
                  )}
                </div>
              )}

              {/* Spacer so last card clears the sticky footer */}
              <div className="h-4" />
            </div>
          </div>

          {/* ── STICKY FOOTER ──────────────────────────────────────────────── */}
          <div className="shrink-0 bg-white border-t border-slate-100 px-5 py-4 shadow-[0_-12px_32px_rgba(0,0,0,0.08)]">

            {/* Price + quantity row */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total del pedido</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900">₡{totalPrice.toLocaleString()}</p>
                  {originalTotalPrice && (
                    <p className="text-sm font-bold text-slate-400 line-through">₡{originalTotalPrice.toLocaleString()}</p>
                  )}
                </div>
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

            {/* Add-to-cart button */}
            <motion.button
              onClick={handleAddToCart}
              disabled={isAdding}
              whileTap={{ scale: 0.98 }}
              className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest ${
                isAdding
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-900 hover:bg-orange-600 text-white'
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
                  Agregar al carrito
                </>
              )}
            </motion.button>
          </div>

          <style>{`
            .side-panel-scrollbar::-webkit-scrollbar { width: 3px; }
            .side-panel-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .side-panel-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
          `}</style>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
