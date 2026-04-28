import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import { Utensils, ShoppingCart, Plus, Minus, MessageSquare, X } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

// Etiquetas legibles
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
  fullPack: { protein: '150g', carbos: 3, veggies: 2, description: 'Porción completa', color: 'from-purple-500 to-indigo-500' },
  regular: { protein: '100g', carbos: 2, veggies: 1, description: 'Porción balanceada', color: 'from-blue-500 to-cyan-500' },
  bajoCalorias: { protein: '120g', carbos: 1, veggies: 2, description: 'Bajo en calorías', color: 'from-green-500 to-emerald-500' },
  sinCarbos: { protein: '120g', carbos: 0, veggies: 3, description: 'Sin carbohidratos', color: 'from-red-500 to-orange-500' },
  keto: { protein: '200g', carbos: 0, veggies: 3, description: 'Dieta Keto', color: 'from-amber-500 to-yellow-500' },
  vegetariano: { protein: 'Vegetal', carbos: 2, veggies: 2, description: '100% Vegetal', color: 'from-lime-500 to-green-500' },
  casaditos: { protein: '100g', carbos: 2, veggies: 1, description: 'Tradicional', color: 'from-orange-500 to-amber-500' }
};

export default function MenuDetailsModal({ menuKey, isOpen, onClose, packInfo }) {
  const [loading, setLoading] = useState(false);
  const [dishes, setDishes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(packInfo?.plan || 'weekly');

  const { addToCart } = useCart();

  // Precios dinámicos basados en el plan
  const getDynamicPrice = () => {
    const pack = packInfo?.pack;
    if (!pack) return packInfo?.numericPrice || 0;

    let price = 0;
    // Si es un pack de promoción, siempre es mensual
    if (packInfo.isPromocionPack) {
      price = Number(pack.monthly) || 0;
    } else {
      // Precio base según el plan seleccionado
      price = Number(pack[selectedPlan]) || 0;

      // Aplicar descuento de Firebase si existe (solo para semanal/quincenal)
      if (packInfo.hasDiscount && selectedPlan !== 'monthly') {
        if (pack.tipoDescuento === 'porcentaje') {
          price = price * (1 - (pack.valorDescuento / 100));
        } else if (pack.tipoDescuento === 'fijo') {
          price = Math.max(0, price - pack.valorDescuento);
        }
      }
    }
    return Math.round(price);
  };

  const currentUnitPrice = getDynamicPrice();
  const totalPrice = currentUnitPrice * quantity;

  const handleAddToCart = () => {
    const planLabels = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual' };

    addToCart({
      id: `menu-${menuKey}-${Date.now()}`,
      name: packInfo?.name || 'Pack',
      desc: packInfo?.desc || 'Menú semanal',
      image: packInfo?.image,
      price: currentUnitPrice,
      numericPrice: currentUnitPrice,
      quantity,
      menuKey,
      plan: selectedPlan,
      planLabel: planLabels[selectedPlan] || selectedPlan,
      customizations: { notes: notes.trim() }
    });

    toast.success(`${packInfo?.name} añadido`);
    onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setQuantity(1);
      setNotes('');
      setShowNotes(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !menuKey) return;
    const load = async () => {
      setLoading(true);
      try {
        const data = await getOfficialMenus(true);
        setDishes((data[menuKey] || []).slice(0, 5));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [isOpen, menuKey]);

  const portionInfo = PACK_PORTIONS[menuKey] || PACK_PORTIONS.regular;
  const isNoCarbsMenu = menuKey === 'keto' || menuKey === 'sinCarbos' || menuKey === 'cenaKeto' || menuKey === 'cenaSinCarbos';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-full h-full max-w-none sm:max-w-xl p-0 overflow-y-auto border-none bg-white rounded-none sm:rounded-[2.5rem] shadow-2xl sm:max-h-[90vh] custom-scrollbar">
        {/* HERO SECTION - Premium Cinematic Look */}
        <div className="relative h-[450px] w-full shrink-0">
          <img src={packInfo?.image} alt={packInfo?.name} className="w-full h-full object-cover" />


          {/* Header Controls */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start z-20">
            <div className="bg-slate-900/10 backdrop-blur-xl px-4 py-2 rounded-2xl border border-slate-900/10">
              <span className="text-slate-900 text-[10px] font-black uppercase tracking-widest">{packInfo?.icon} {MENU_LABELS[menuKey]}</span>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 hover:bg-white transition-all shadow-xl border border-slate-100">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="p-6 sm:p-10 space-y-8 bg-white text-slate-900">

          {/* Header/Title Block - Now clear and readable */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="bg-orange-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider shadow-lg shadow-orange-500/20">5 Platos</span>
              <p className="text-slate-400 text-[10px] sm:text-xs font-black uppercase tracking-[0.2em]">{portionInfo.description}</p>
            </div>
            <motion.h2 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight tracking-tighter">
              {packInfo?.name}
            </motion.h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Plates List - Compact for 0-scroll */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Utensils size={12} className="text-orange-500" /> Menú Semanal
              </h4>
              <div className="space-y-1.5 pr-1">
                {dishes.map((dish, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <span className="w-5 h-5 bg-white border border-slate-200 text-slate-900 rounded-md flex items-center justify-center text-[10px] font-black shadow-sm">{dish.numero}</span>
                    <div className="flex flex-col min-w-0 py-1">
                      <p className="text-[11px] font-black text-slate-700 leading-tight">
                        {dish.proteina || dish.descripcion || dish.nombre || 'Plato del día'}
                      </p>
                      {dish.vegetal && dish.vegetal !== '—' && (
                        <p className="text-[10px] font-bold text-slate-400 leading-tight mt-0.5">
                          + {dish.vegetal}
                        </p>
                      )}
                      {!isNoCarbsMenu && dish.carbo && dish.carbo !== '—' && (
                        <p className="text-[10px] font-bold text-slate-400 leading-tight">
                          + {dish.carbo}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {loading && <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-8 bg-slate-50 animate-pulse rounded-xl" />)}</div>}
              </div>
            </div>

            {/* Config & Specs */}
            <div className="space-y-5">
              {/* Plan Tabs - Moved to Modal */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Plan de comidas</h4>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-100">
                  {['weekly', 'biweekly', 'monthly'].map(plan => (
                    <button
                      key={plan}
                      onClick={() => setSelectedPlan(plan)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-black transition-all ${selectedPlan === plan ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {plan === 'weekly' ? 'Semanal' : plan === 'biweekly' ? 'Quinc.' : 'Mensual'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Portion Specs - Elegant Glassmorphism */}
              <div className={`bg-gradient-to-br ${portionInfo.color} p-4 rounded-3xl flex justify-around items-center shadow-xl border border-white/20 text-white`}>
                <div className="text-center group"><span className="block text-xl mb-1 transition-transform group-hover:scale-125">🍗</span><span className="text-[10px] font-black uppercase tracking-tighter">{portionInfo.protein}</span></div>
                <div className="text-center group"><span className="block text-xl mb-1 transition-transform group-hover:scale-125">🥦</span><span className="text-[10px] font-black uppercase tracking-tighter">{portionInfo.veggies} Veg.</span></div>
                {!isNoCarbsMenu && <div className="text-center group"><span className="block text-xl mb-1 transition-transform group-hover:scale-125">🍚</span><span className="text-[10px] font-black uppercase tracking-tighter">{portionInfo.carbos} Carb.</span></div>}
              </div>
            </div>
          </div>
          {/* Action Footer - Redesigned for Maximum Impact */}
          <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between gap-4">
              {/* Quantity Control */}
              <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl p-1 px-3">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="text-slate-400 hover:text-slate-900 p-2 transition-colors"><Minus size={18} /></button>
                <span className="w-10 text-center font-black text-base text-slate-900">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="text-slate-400 hover:text-slate-900 p-2 transition-colors"><Plus size={18} /></button>
              </div>

              {/* Instruction Overlay Button */}
              <button
                onClick={() => setShowNotes(true)}
                className="flex-1 flex items-center justify-center gap-3 py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all group shadow-sm"
              >
                <MessageSquare size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Instrucciones</span>
                {notes.trim().length > 0 && (
                  <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </button>
            </div>

            {/* FULL WIDTH Primary Action */}
            <button
              onClick={handleAddToCart}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-7 rounded-[2rem] shadow-xl shadow-slate-900/10 active:scale-[0.98] transition-all text-base uppercase tracking-[0.1em] flex items-center justify-center gap-4 group"
            >
              <ShoppingCart size={24} className="group-hover:rotate-12 transition-transform" />
              <span>Agregar al carrito • ₡{totalPrice.toLocaleString()}</span>
            </button>
          </div>
        </div>

        {/* INSTRUCTIONS OVERLAY */}
        <AnimatePresence>
          {showNotes && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-white/98 backdrop-blur-md flex items-center justify-center p-6 text-center">
              <div className="w-full max-w-sm space-y-8">
                <div className="space-y-3">
                  <div className="w-20 h-20 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-2 border border-orange-100 shadow-inner">
                    <MessageSquare size={36} />
                  </div>
                  <h3 className="text-3xl font-black text-slate-900">Observaciones</h3>
                  <p className="text-slate-400 text-[11px] uppercase tracking-[0.2em] font-bold">Personaliza tu pedido</p>
                </div>

                <textarea
                  autoFocus
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Soy alérgico al marisco, sin cebolla en los platos, etc..."
                  className="w-full h-40 bg-slate-50 border border-slate-100 rounded-[2rem] p-6 text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 transition-all resize-none text-sm font-medium shadow-inner"
                />

                <div className="flex gap-4">
                  <button onClick={() => setShowNotes(false)} className="flex-1 py-5 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest text-[10px]">Cerrar</button>
                  <button onClick={() => setShowNotes(false)} className="flex-1 py-5 bg-orange-500 text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 uppercase tracking-widest text-[10px] active:scale-95 transition-transform">Listo</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          .custom-scrollbar::-webkit-scrollbar { width: 4px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
