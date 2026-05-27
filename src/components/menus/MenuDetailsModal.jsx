import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import { Utensils, ShoppingCart, Plus, Minus, X, Check } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import SubstitutionPicker from '../SubstitutionPicker';

const PACK_PORTIONS = {
  fullPack:    { protein: '150g', carbos: 3, veggies: 2, description: 'Porción completa',   color: 'from-purple-500 to-indigo-500' },
  regular:     { protein: '100g', carbos: 2, veggies: 1, description: 'Porción balanceada', color: 'from-blue-500 to-cyan-500' },
  bajoCalorias:{ protein: '120g', carbos: 1, veggies: 2, description: 'Bajo en calorías',   color: 'from-green-500 to-emerald-500' },
  sinCarbos:   { protein: '120g', carbos: 0, veggies: 3, description: 'Sin carbohidratos',  color: 'from-red-500 to-orange-500' },
  keto:        { protein: '200g', carbos: 0, veggies: 3, description: 'Dieta Keto',         color: 'from-amber-500 to-yellow-500' },
  vegetariano: { protein: 'Vegetal', carbos: 2, veggies: 2, description: '100% Vegetal',    color: 'from-lime-500 to-green-500' },
  casaditos:   { protein: '100g', carbos: 2, veggies: 1, description: 'Tradicional',        color: 'from-orange-500 to-amber-500' }
};

const METHOD_LABELS = { whatsapp: 'WhatsApp', sinpe: 'SINPE', transfer: 'Transferencia', nmi: 'Tarjeta' };
const PLANS = [
  { id: 'weekly',   label: 'Semanal' },
  { id: 'biweekly', label: 'Quincenal' },
  { id: 'monthly',  label: 'Mensual' },
];

export default function MenuDetailsModal({ menuKey, isOpen, onClose, packInfo }) {
  const [loading, setLoading] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [substitutions, setSubstitutions] = useState({ proteinChanges: [], vegeChanges: [], carboChanges: [] });
  const [selectedPlan, setSelectedPlan] = useState(packInfo?.plan || 'weekly');

  const { addToCart } = useCart();

  // ── Scroll lock + ESC key ──────────────────────────────────────
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
    if (!isOpen) { setQuantity(1); setSubstitutions({ proteinChanges: [], vegeChanges: [], carboChanges: [] }); }
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
    toast.success(`${packInfo?.name} añadido`);
    onClose();
  };

  const portionInfo = PACK_PORTIONS[menuKey] || PACK_PORTIONS.regular;
  const isNoCarbsMenu = ['keto', 'sinCarbos', 'cenaKeto', 'cenaSinCarbos'].includes(menuKey);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90vh] shadow-2xl flex flex-col overflow-hidden relative"
        >
          {/* ── HERO ─────────────────────────────────────────────── */}
          <div className="relative h-[180px] sm:h-[280px] w-full shrink-0">
            <img src={packInfo?.image} alt={packInfo?.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

            <button onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 hover:bg-white transition-all shadow-xl border border-slate-100 z-10"
            >
              <X size={18} />
            </button>

            <div className="absolute bottom-4 left-4 right-14">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-orange-600 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider">5 Platos</span>
                <span className="text-white/70 text-[9px] font-bold uppercase tracking-wider">{portionInfo.description}</span>
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-white leading-tight drop-shadow-lg">
                {packInfo?.name}
              </h2>
            </div>
          </div>

          {/* ── SCROLLABLE BODY ──────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto pack-modal-scrollbar">
            <div className="p-5 sm:p-8 space-y-5">

              {/* Plan selector */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Elige tu plan</p>
                <div className="grid grid-cols-3 gap-2">
                  {PLANS.map(({ id, label }) => {
                    const planPrice = getPriceForPlan(id);
                    const isActive = selectedPlan === id;
                    if (!planPrice) return null;
                    return (
                      <button key={id} onClick={() => setSelectedPlan(id)}
                        className={`flex flex-col items-center py-3 px-2 rounded-2xl border-2 transition-all active:scale-95 ${
                          isActive
                            ? 'bg-orange-500 border-orange-500 shadow-lg shadow-orange-500/20'
                            : 'bg-white border-slate-200 hover:border-orange-300'
                        }`}
                      >
                        {isActive && <Check size={12} className="text-white mb-1" strokeWidth={3} />}
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {label}
                        </span>
                        <span className={`text-sm font-black mt-0.5 ${isActive ? 'text-white' : 'text-slate-900'}`}>
                          ₡{planPrice.toLocaleString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Macros */}
              <div className={`bg-gradient-to-br ${portionInfo.color} p-4 rounded-2xl flex justify-around items-center text-white`}>
                <div className="text-center"><span className="block text-xl mb-1">🍗</span><span className="text-[10px] font-black uppercase">{portionInfo.protein}</span></div>
                <div className="text-center"><span className="block text-xl mb-1">🥦</span><span className="text-[10px] font-black uppercase">{portionInfo.veggies} Veg.</span></div>
                {!isNoCarbsMenu && <div className="text-center"><span className="block text-xl mb-1">🍚</span><span className="text-[10px] font-black uppercase">{portionInfo.carbos} Carb.</span></div>}
              </div>

              {/* Dishes */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Utensils size={11} className="text-orange-500" /> Menú esta semana
                </p>
                <div className="space-y-1.5">
                  {dishes.map((dish, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-xl"
                    >
                      <span className="w-5 h-5 bg-white border border-slate-200 text-slate-700 rounded-md flex items-center justify-center text-[10px] font-black shrink-0">{dish.numero}</span>
                      <div className="flex flex-col min-w-0">
                        <p className="text-[11px] font-black text-slate-800 leading-tight">{dish.proteina || dish.descripcion || dish.nombre || 'Plato del día'}</p>
                        {dish.vegetal && dish.vegetal !== '—' && <p className="text-[10px] text-slate-400 leading-tight">+ {dish.vegetal}</p>}
                        {!isNoCarbsMenu && dish.carbo && dish.carbo !== '—' && <p className="text-[10px] text-slate-400 leading-tight">+ {dish.carbo}</p>}
                      </div>
                    </motion.div>
                  ))}
                  {loading && [1,2,3].map(i => <div key={i} className="h-9 bg-slate-50 animate-pulse rounded-xl" />)}
                </div>
              </div>

              {/* Substitution picker — per-dish mode using the loaded weekly dishes */}
              <SubstitutionPicker
                value={substitutions}
                onChange={setSubstitutions}
                dishes={dishes}
              />

              {/* Discount box */}
              {originalTotalPrice && (
                <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Con descuento</p>
                      <p className="text-sm font-bold text-slate-400 line-through">₡{originalTotalPrice.toLocaleString()}</p>
                    </div>
                    <p className="text-2xl font-black text-slate-900">₡{totalPrice.toLocaleString()}</p>
                  </div>
                  {metodosNote && (
                    <p className="text-[10px] font-bold text-orange-600 flex items-center gap-1 pt-1 border-t border-orange-100">
                      <span>💳</span> Solo con: {metodosNote}
                    </p>
                  )}
                </div>
              )}

              <div className="h-2" />
            </div>
          </div>

          {/* ── STICKY FOOTER ────────────────────────────────────── */}
          <div className="shrink-0 bg-white border-t border-slate-100 px-5 py-4 space-y-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100 rounded-2xl p-1">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-black text-base text-slate-900">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              {!originalTotalPrice && (
                <div className="flex-1 text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</p>
                  <p className="text-xl font-black text-slate-900">₡{totalPrice.toLocaleString()}</p>
                </div>
              )}
            </div>
            <button onClick={handleAddToCart}
              className="w-full bg-slate-900 hover:bg-orange-600 active:scale-[0.98] text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
            >
              <ShoppingCart size={20} className="shrink-0" />
              Agregar al carrito · ₡{totalPrice.toLocaleString()}
            </button>
          </div>

          <style>{`
            .pack-modal-scrollbar::-webkit-scrollbar { width: 3px; }
            .pack-modal-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .pack-modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
          `}</style>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
