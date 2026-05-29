import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import {
  Utensils, ShoppingCart, Plus, Minus, X, Check,
  ChevronRight, Flame, Leaf, Zap, Star, ArrowLeft
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import SubstitutionPicker from '../SubstitutionPicker';

const PACK_PORTIONS = {
  fullPack:    { protein: '150g', carbos: 3, veggies: 2, description: 'Porción completa',   color: 'from-purple-500 to-indigo-500',  emoji: '💪' },
  regular:     { protein: '100g', carbos: 2, veggies: 1, description: 'Porción balanceada', color: 'from-blue-500 to-cyan-500',      emoji: '⚖️' },
  bajoCalorias:{ protein: '120g', carbos: 1, veggies: 2, description: 'Bajo en calorías',   color: 'from-green-500 to-emerald-500',  emoji: '🥗' },
  sinCarbos:   { protein: '120g', carbos: 0, veggies: 3, description: 'Sin carbohidratos',  color: 'from-red-500 to-orange-500',     emoji: '🔥' },
  keto:        { protein: '200g', carbos: 0, veggies: 3, description: 'Dieta Keto',         color: 'from-amber-500 to-yellow-500',   emoji: '⚡' },
  vegetariano: { protein: 'Vegetal', carbos: 2, veggies: 2, description: '100% Vegetal',    color: 'from-lime-500 to-green-500',     emoji: '🌱' },
  casaditos:   { protein: '100g', carbos: 2, veggies: 1, description: 'Tradicional',        color: 'from-orange-500 to-amber-500',   emoji: '🇨🇷' },
};

const METHOD_LABELS = { whatsapp: 'WhatsApp', sinpe: 'SINPE', transfer: 'Transferencia', nmi: 'Tarjeta' };

// Plan base labels — sublabel is computed dynamically inside the component
const PLAN_LABELS = [
  { id: 'weekly',   label: 'Semanal',   savings: null },
  { id: 'biweekly', label: 'Quincenal', savings: null },
  { id: 'monthly',  label: 'Mensual',   savings: '🔥 Mejor precio' },
];

// Per-category detail cards shown at the top of the panel
const PACK_DETAILS = {
  'Two Pack': {
    headline: '10 comidas semanales · 2 personas',
    bullets: [
      { icon: '👥', text: '2 personas incluidas' },
      { icon: '🍽️', text: '5 almuerzos por persona' },
      { icon: '📅', text: 'Lunes a Viernes' },
      { icon: '💰', text: '25 % OFF en plan mensual' },
    ],
    mealsPerWeek: 10,
  },
  'Pack Familiar': {
    headline: '5 comidas · 4 porciones c/u',
    bullets: [
      { icon: '👨‍👩‍👧‍👦', text: 'Para toda la familia' },
      { icon: '🍽️', text: '4 porciones por plato' },
      { icon: '📅', text: 'Lunes a Viernes' },
      { icon: '🥘', text: 'Porciones generosas' },
    ],
    mealsPerWeek: 5,
  },
  '5 Comidas a la Semana': {
    headline: '5 almuerzos · 1 persona',
    bullets: [
      { icon: '👤', text: '1 persona' },
      { icon: '🍽️', text: '5 almuerzos por semana' },
      { icon: '📅', text: 'Lunes a Viernes' },
      { icon: '🥗', text: 'Menú varía cada semana' },
    ],
    mealsPerWeek: 5,
  },
  'Almuerzo y Cena': {
    headline: '10 comidas semanales · 1 persona',
    bullets: [
      { icon: '👤', text: '1 persona' },
      { icon: '🌅', text: '5 almuerzos + 5 cenas' },
      { icon: '📅', text: 'Lunes a Viernes' },
      { icon: '🔥', text: '20 % OFF en plan mensual' },
    ],
    mealsPerWeek: 10,
  },
  'Desayuno, Almuerzo y Cena': {
    headline: '15 comidas semanales · plan completo',
    bullets: [
      { icon: '👤', text: '1 persona' },
      { icon: '🌟', text: 'Desayuno + Almuerzo + Cena' },
      { icon: '📅', text: 'Lunes a Viernes' },
      { icon: '🚚', text: 'Envío GRATIS plan mensual' },
    ],
    mealsPerWeek: 15,
  },
  'Pack de Proteínas': {
    headline: 'Proteínas a tu elección',
    bullets: [
      { icon: '🥩', text: '3 ó 5 proteínas a elegir' },
      { icon: '⚖️', text: '250 g ó 500 g por proteína' },
      { icon: '🧊', text: 'Entrega congelada' },
      { icon: '✅', text: 'Selecciona tus favoritas' },
    ],
    mealsPerWeek: null,
  },
  'Pack de Desayunos': {
    headline: '5 desayunos · 1 persona',
    bullets: [
      { icon: '👤', text: '1 persona' },
      { icon: '☕', text: '5 desayunos variados' },
      { icon: '📅', text: 'Lunes a Viernes' },
      { icon: '🌿', text: 'Regular o Vegetariano' },
    ],
    mealsPerWeek: 5,
  },
};

const FOOD_ICONS = ['🍗', '🥩', '🍤', '🐟', '🍖'];

export default function MenuDetailsModal({ menuKey, isOpen, onClose, packInfo }) {
  const [loading, setLoading] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [substitutions, setSubstitutions] = useState({ proteinChanges: [], vegeChanges: [], carboChanges: [] });
  const [selectedPlan, setSelectedPlan] = useState(packInfo?.plan || 'weekly');
  const [isAdding, setIsAdding] = useState(false);

  const { addToCart } = useCart();

  // ── Scroll lock + ESC ──────────────────────────────────────────
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

  // ── Reset on close ─────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setQuantity(1);
      setSubstitutions({ proteinChanges: [], vegeChanges: [], carboChanges: [] });
      setIsAdding(false);
    }
  }, [isOpen]);

  // ── Load weekly menu ───────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !menuKey) return;
    setLoading(true);
    getOfficialMenus(true)
      .then(data => setDishes((data[menuKey] || []).slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen, menuKey]);

  // ── Price helpers ──────────────────────────────────────────────
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

  const currentUnitPrice = getDynamicPrice();
  const totalPrice = currentUnitPrice * quantity;

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

  // ── Add to cart ────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (isAdding) return;
    setIsAdding(true);
    const planLabels = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };
    const pack = packInfo?.pack;
    addToCart({
      id: `menu-${menuKey}-${Date.now()}`,
      name: packInfo?.name || 'Pack',
      desc: packInfo?.desc || 'Menú semanal',
      image: packInfo?.image,
      price: currentUnitPrice,
      numericPrice: currentUnitPrice,
      originalPrice: originalUnitPrice || undefined,
      quantity,
      menuKey,
      plan: selectedPlan,
      planLabel: planLabels[selectedPlan] || selectedPlan,
      categoryLabel: packInfo?.categoryLabel,
      customizations: substitutions,
      discountMetodos: packInfo?.hasDiscount ? (pack?.metodosPermitidos || null) : undefined,
    });
    toast.success(`${packInfo?.name} añadido al carrito 🛒`);
    setTimeout(() => { setIsAdding(false); onClose(); }, 900);
  };

  const portionInfo = PACK_PORTIONS[menuKey] || PACK_PORTIONS.regular;
  const isNoCarbsMenu = ['keto', 'sinCarbos', 'cenaKeto', 'cenaSinCarbos'].includes(menuKey);
  const weeklyPrice = getPriceForPlan('weekly');
  const monthlyPrice = getPriceForPlan('monthly');
  const savingsVsWeekly = (weeklyPrice && monthlyPrice && weeklyPrice * 4 > monthlyPrice * 1)
    ? Math.round((1 - (monthlyPrice / (weeklyPrice * 4))) * 100)
    : null;

  // ── Pack details + dynamic plan sublabels ──────────────────────────────────
  const packDetails = PACK_DETAILS[packInfo?.categoryLabel] || null;
  // mealCount: null → don't show a number (e.g. proteínas), number → show "N comidas"
  const mealCount = packDetails ? packDetails.mealsPerWeek : 5;
  const PLANS = PLAN_LABELS.map(p => ({
    ...p,
    sublabel: mealCount == null
      ? (p.id === 'weekly' ? 'Por semana' : p.id === 'biweekly' ? 'Quincenal' : 'Mensual')
      : `${mealCount * (p.id === 'weekly' ? 1 : p.id === 'biweekly' ? 2 : 4)} comidas`,
  }));

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex justify-end">

        {/* ── Backdrop ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60"
        />

        {/* ── Side Panel ───────────────────────────────────────── */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 280 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full md:w-[52%] lg:w-[46%] xl:w-[40%] h-full bg-white shadow-2xl flex flex-col overflow-hidden"
        >

          {/* ── HERO IMAGE ───────────────────────────────────────── */}
          <div className="relative h-[175px] sm:h-[260px] shrink-0 overflow-hidden">
            <img
              src={packInfo?.image}
              alt={packInfo?.name}
              className="w-full h-full object-cover"
            />
            {/* Gradientes */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 left-4 w-10 h-10 bg-white/25 hover:bg-white/40 rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 border border-white/30"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Badges superiores */}
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

            {/* Título en la imagen */}
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">
                {packInfo?.categoryLabel || 'Pack Semanal'}
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

          {/* ── SCROLLABLE CONTENT ───────────────────────────────── */}
          <div className="flex-1 overflow-y-auto side-panel-scrollbar">
            <div className="p-5 sm:p-6 space-y-6">

              {/* ── Plan selector ─────────────────────────────────── */}
              {!packInfo?.isPromocionPack && (
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                    <Star size={10} className="text-orange-400" fill="currentColor" />
                    Elige tu plan
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {PLANS.map(({ id, label, sublabel, savings }) => {
                      const planPrice = getPriceForPlan(id);
                      const isActive = selectedPlan === id;
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
                          <span className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                            {label}
                          </span>
                          <span className={`text-sm font-black mt-0.5 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                            ₡{planPrice.toLocaleString()}
                          </span>
                          <span className={`text-[8px] font-bold mt-0.5 ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                            {sublabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {savingsVsWeekly && savingsVsWeekly > 0 && (
                    <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                      <Zap size={10} fill="currentColor" />
                      Mensual te ahorra hasta {savingsVsWeekly}% vs semanal
                    </p>
                  )}
                </div>
              )}

              {/* ── Pack details card ────────────────────────────── */}
              {packDetails && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-black text-slate-800">{packDetails.headline}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {packDetails.bullets.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm">
                        <span className="text-base leading-none shrink-0">{b.icon}</span>
                        <span className="text-[10px] font-bold text-slate-700 leading-tight">{b.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Macros / Porción ──────────────────────────────── */}
              <div className={`bg-gradient-to-br ${portionInfo.color} p-4 rounded-2xl`}>
                <p className="text-white/70 text-[9px] font-black uppercase tracking-widest mb-3">Qué incluye cada almuerzo</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <span className="block text-2xl mb-1">🍗</span>
                    <span className="text-white text-[10px] font-black block">{portionInfo.protein}</span>
                    <span className="text-white/60 text-[9px] font-bold">Proteína</span>
                  </div>
                  <div className="bg-white/20 rounded-xl p-3 text-center">
                    <span className="block text-2xl mb-1">🥦</span>
                    <span className="text-white text-[10px] font-black block">{portionInfo.veggies} porciones</span>
                    <span className="text-white/60 text-[9px] font-bold">Vegetales</span>
                  </div>
                  {!isNoCarbsMenu ? (
                    <div className="bg-white/20 rounded-xl p-3 text-center">
                      <span className="block text-2xl mb-1">🍚</span>
                      <span className="text-white text-[10px] font-black block">{portionInfo.carbos} porciones</span>
                      <span className="text-white/60 text-[9px] font-bold">Carbohidratos</span>
                    </div>
                  ) : (
                    <div className="bg-white/20 rounded-xl p-3 text-center">
                      <span className="block text-2xl mb-1">✅</span>
                      <span className="text-white text-[10px] font-black block">Sin carbos</span>
                      <span className="text-white/60 text-[9px] font-bold">Bajo carb</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Menú de la semana ─────────────────────────────── */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Utensils size={10} className="text-orange-500" />
                  Menú de esta semana
                </p>

                <div className="space-y-2">
                  {loading
                    ? [1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-14 bg-slate-100 animate-pulse rounded-2xl" />
                      ))
                    : dishes.map((dish, i) => {
                        const displayText = [
                          dish.proteina,
                          dish.vegetal && dish.vegetal !== '—' ? dish.vegetal : null,
                          !isNoCarbsMenu && dish.carbo && dish.carbo !== '—' ? dish.carbo : null,
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
                              <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">{displayText}</p>
                            </div>
                            <ChevronRight size={14} className="text-slate-300 group-hover:text-orange-400 shrink-0 transition-colors" />
                          </motion.div>
                        );
                      })
                  }
                </div>
              </div>

              {/* ── Sustituciones ─────────────────────────────────── */}
              <div className="border-t border-slate-100 pt-5">
                <SubstitutionPicker
                  value={substitutions}
                  onChange={setSubstitutions}
                  dishes={dishes}
                />
              </div>

              {/* ── Beneficios ────────────────────────────────────── */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">¿Por qué elegir este pack?</p>
                {[
                  { icon: <Flame size={13} className="text-orange-500" />, text: 'Preparado fresco cada semana con ingredientes de primera' },
                  { icon: <Leaf size={13} className="text-emerald-500" />, text: 'Sin preservantes ni aditivos artificiales' },
                  { icon: <Zap size={13} className="text-blue-500" />, text: 'Listo para calentar en menos de 3 minutos' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-sm">
                      {item.icon}
                    </div>
                    <p className="text-xs text-slate-600 font-medium">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* ── Caja de descuento ─────────────────────────────── */}
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

              {/* Espacio para el footer */}
              <div className="h-4" />
            </div>
          </div>

          {/* ── STICKY FOOTER ─────────────────────────────────────── */}
          <div className="shrink-0 bg-white border-t border-slate-100 px-5 pt-4 pb-6 shadow-[0_-12px_32px_rgba(0,0,0,0.08)]"
               style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>

            {/* Precio + cantidad */}
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

            {/* Botón agregar */}
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className={`w-full font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-sm uppercase tracking-widest ${
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
            </button>
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
