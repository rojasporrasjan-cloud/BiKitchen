import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Gift, 
    ChevronLeft, 
    Star, 
    Zap, 
    Clock, 
    CheckCircle2, 
    Info, 
    ShoppingBag,
    Ticket,
    Truck,
    ArrowRight,
    Loader2,
    Crown,
    Sparkles,
    Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useLoyaltyPoints from '../hooks/useLoyaltyPoints';
import { useAuth } from '../context/AuthContext';
import { createCoupon } from '../utils/firestoreCoupons';
import BackButton from '../components/BackButton';
import toast from 'react-hot-toast';

const REWARDS = [
    {
        id: 'coupon_2000',
        title: 'Cupón ₡2,000',
        description: 'Descuento aplicable en cualquier pedido',
        points: 500,
        type: 'discount',
        value: 2000,
        icon: <Ticket className="text-orange-500" />,
        color: 'from-orange-50 to-orange-100',
        borderColor: 'border-orange-200'
    },
    {
        id: 'free_shipping',
        title: 'Envío Gratis',
        description: 'Válido para GAM o zona de cobertura',
        points: 800,
        type: 'shipping',
        value: 0,
        icon: <Truck className="text-blue-500" />,
        color: 'from-blue-50 to-blue-100',
        borderColor: 'border-blue-200'
    },
    {
        id: 'coupon_5000',
        title: 'Cupón ₡5,000',
        description: '¡Nuestra mejor oferta en puntos!',
        points: 1200,
        type: 'discount',
        value: 5000,
        icon: <Gift className="text-purple-500" />,
        color: 'from-purple-50 to-purple-100',
        borderColor: 'border-purple-200',
        featured: true
    },
    {
        id: 'free_pack_week',
        title: 'Pack Semanal Gratis',
        description: 'Canjeable por un pack de 5 comidas',
        points: 4000,
        type: 'product',
        value: 'weekly_pack',
        icon: <ShoppingBag className="text-green-500" />,
        color: 'from-green-50 to-green-100',
        borderColor: 'border-green-200'
    }
];

export default function RewardStore() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { points, currentLevel, redeemItem, loading: pointsLoading } = useLoyaltyPoints();
    const [redeeming, setRedeeming] = useState(null);
    const [successReward, setSuccessReward] = useState(null);
    const [generatedCode, setGeneratedCode] = useState('');

    const handleRedeem = async (reward) => {
        if (!currentUser) {
            toast.error('Inicia sesión para canjear BiPuntos.');
            return;
        }

        if (points < reward.points) {
            toast.error('No tienes suficientes BiPuntos.');
            return;
        }
        
        setRedeeming(reward.id);
        setGeneratedCode('');

        try {
            // 1. Generar código de cupón único
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const couponCode = `VIP-${reward.title.replace(/\s+/g, '').slice(0, 5).toUpperCase()}-${randomStr}`;
            
            // 2. Debitar puntos y guardar en el historial con el código
            const result = await redeemItem(reward.points, `Minitienda: ${reward.title}`, { code: couponCode });
            
            if (result.success) {
                // 3. Crear el cupón en Firestore
                // Expiración en 30 días
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + 30);
                
                // Configuración según el tipo de recompensa
                const couponData = {
                    code: couponCode,
                    type: reward.type === 'shipping' ? 'free_shipping' : 'fixed',
                    value: reward.value,
                    description: `Recompensa Minitienda: ${reward.title}`,
                    active: true,
                    minPurchase: reward.type === 'product' ? 5000 : 0,
                    maxUses: 1,
                    singleUsePerUser: true,
                    startDate: new Date(),
                    expirationDate: expirationDate,
                    generatedBy: currentUser.uid // Vincular al usuario
                };

                await createCoupon(couponData);
                
                setGeneratedCode(couponCode);
                setSuccessReward(reward);
                toast.success('¡Recompensa canjeada con éxito!');
            } else {
                toast.error(result.error || 'Error al canjear puntos.');
            }
        } catch (error) {
            console.error('Redeem error:', error);
            toast.error('Error al procesar el canje.');
        } finally {
            setRedeeming(null);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-50 pb-20 selection:bg-orange-100 selection:text-orange-900">
            {/* Header / Sidebar alternative - Brand Gradient */}
            <div className="bg-gradient-to-br from-orange-500 to-amber-500 pt-16 pb-20 px-6 rounded-b-[4rem] shadow-2xl relative overflow-hidden">
                {/* Animated Background Mesh - Brand Versions */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                    <motion.div 
                        animate={{ 
                            scale: [1, 1.3, 1],
                            x: [0, 40, 0],
                            y: [0, -20, 0]
                        }}
                        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                        className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-white opacity-20 blur-[100px] rounded-full"
                    ></motion.div>
                </div>

                <div className="relative z-10 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <BackButton light className="hover:bg-white/10 transition-colors px-4 py-2 rounded-xl" />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/5 backdrop-blur-md px-5 py-2 rounded-full flex items-center gap-3 border border-white/10"
                        >
                            <Crown size={16} className="text-amber-400" />
                            <span className="text-white/90 font-black text-[10px] uppercase tracking-[0.2em]">Nivel {currentLevel?.name || 'Bronce'}</span>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center md:text-left mb-12"
                    >
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter leading-tight drop-shadow-sm">
                            Minitienda <span className="text-amber-100 italic">VIP</span>
                        </h1>
                        <p className="text-white/80 text-lg font-medium">Canjea tus BiPuntos acumulados por beneficios exclusivos y regalos directos.</p>
                    </motion.div>

                    {/* Points Display Card - Light Glassmorphism */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative group perspective"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-white to-amber-100 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                        <div className="relative bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                            <div className="text-center md:text-left">
                                <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-center md:text-left">Tu Saldo Actual</p>
                                <div className="flex items-baseline justify-center md:justify-start gap-3">
                                    <motion.span 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 1, type: "spring" }}
                                        className="text-6xl font-black text-white tabular-nums tracking-tighter"
                                    >
                                        {points?.toLocaleString() || '0'}
                                    </motion.span>
                                    <span className="text-amber-100 font-black text-sm uppercase tracking-widest pb-1.5">BiPuntos</span>
                                </div>
                            </div>
                            <div className="w-20 h-20 rounded-2xl bg-white/30 flex items-center justify-center shadow-xl backdrop-blur-md group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <Zap size={36} className="text-white fill-white/50" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
            {/* Content Section - Redesigned Cards */}
            <div className="px-6 max-w-2xl mx-auto -mt-10 relative z-20">
                <div className="grid gap-6">
                    {REWARDS.map((reward, index) => (
                        <motion.div
                            key={reward.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            whileHover={{ y: -5 }}
                            className={`group relative bg-white border border-gray-100 rounded-[2rem] p-6 pr-8 shadow-xl shadow-gray-200/40 overflow-hidden flex flex-col md:flex-row items-center gap-6 transition-all duration-300 ${points < reward.points ? 'grayscale-[0.8] opacity-70' : ''}`}
                        >
                            {/* Featured Badge */}
                            {reward.featured && (
                                <div className="absolute top-0 right-10 bg-orange-500 text-white text-[10px] font-black px-4 py-1.5 rounded-b-xl uppercase tracking-[0.2em] shadow-lg animate-pulse">
                                    Mejor Valor
                                </div>
                            )}

                            {/* Icon Box - Premium Style */}
                            <div className={`w-24 h-24 shrink-0 rounded-3xl bg-gradient-to-br ${reward.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                                {React.cloneElement(reward.icon, { size: 40, className: reward.icon.props.className + " drop-shadow-md" })}
                            </div>

                            {/* Info */}
                            <div className="flex-1 text-center md:text-left space-y-2">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight group-hover:text-orange-600 transition-colors">{reward.title}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed max-w-xs mx-auto md:mx-0">{reward.description}</p>
                                
                                <div className="flex items-center justify-center md:justify-start gap-2 bg-orange-50 w-fit mx-auto md:mx-0 px-4 py-1.5 rounded-xl border border-orange-100/50">
                                    <Star size={14} className="text-orange-500 fill-orange-500" />
                                    <span className="text-sm font-black text-gray-800 tabular-nums">{reward.points.toLocaleString()} <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Puntos</span></span>
                                </div>
                            </div>

                            {/* Action Button - Redesigned */}
                            <div className="w-full md:w-auto mt-4 md:mt-0">
                                <button
                                    onClick={() => handleRedeem(reward)}
                                    disabled={points < reward.points || redeeming === reward.id}
                                    className={`w-full md:w-auto h-16 px-8 rounded-2xl font-black flex items-center justify-center gap-3 transition-all duration-300 active:scale-95 ${
                                        points >= reward.points 
                                            ? 'bg-orange-600 text-white shadow-xl shadow-orange-500/20 hover:bg-orange-700 hover:shadow-orange-500/30' 
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                    }`}
                                >
                                    {redeeming === reward.id ? (
                                        <>
                                            <Loader2 className="animate-spin" size={20} />
                                            <span>Procesando...</span>
                                        </>
                                    ) : points < reward.points ? (
                                        <span className="text-xs uppercase tracking-widest">Faltan {(reward.points - points).toLocaleString()} pts</span>
                                    ) : (
                                        <>
                                            <span>Canjear</span>
                                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Important Notice - Premium Box */}
                <div className="mt-12 bg-blue-50/50 rounded-3xl p-8 border border-blue-100/50 flex flex-col md:flex-row gap-6 items-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center flex-shrink-0 text-blue-600">
                        <Info size={32} />
                    </div>
                    <div className="text-center md:text-left">
                        <h4 className="text-lg font-black text-gray-900 mb-2 tracking-tight">Condiciones del Canje</h4>
                        <p className="text-sm text-gray-500 font-medium leading-relaxed">
                            Al confirmar tu canje, recibirás un <span className="text-blue-600 font-bold">código único</span> de cupón. 
                            Válido por 30 días naturales. Recuerda que los BiPuntos canjeados no pueden ser devueltos una vez generada la recompensa.
                        </p>
                    </div>
                </div>
            </div>

            {/* Success Modal - Premium Overhaul */}
            <AnimatePresence>
                {successReward && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 30 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.93, y: 20 }}
                            className="bg-white rounded-[3rem] w-full max-w-md p-10 text-center shadow-3xl relative overflow-hidden"
                        >
                            {/* Decorative Background Flare */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-green-500/5 blur-[80px] -mt-40 rounded-full"></div>
                            
                            {/* Success Icon with Glow */}
                            <div className="relative mb-10">
                                <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse scale-150"></div>
                                <div className="relative w-28 h-28 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-green-500/30">
                                    <CheckCircle2 size={56} className="text-white drop-shadow-lg" />
                                </div>
                            </div>

                            <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tighter">¡Felicidades!</h2>
                            <p className="text-gray-500 font-medium mb-8 px-4 leading-relaxed">
                                Has canjeado con éxito <span className="font-bold text-gray-800 tracking-tight">{successReward.title}</span>. 
                                Disfruta de tu recompensa en tu próximo pedido.
                            </p>

                            <div className="relative group/code mb-10">
                                <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] opacity-20 blur group-hover/code:opacity-40 transition-opacity"></div>
                                <div className="relative bg-orange-50 border-2 border-orange-100 rounded-[2rem] p-8 md:p-10">
                                    <p className="text-[10px] text-orange-500 font-black uppercase tracking-[0.3em] mb-4">Tu Código de Cupón</p>
                                    <p className="text-4xl md:text-5xl font-black text-orange-600 tracking-[0.1em] font-mono select-all uppercase">
                                        {generatedCode}
                                    </p>
                                    <p className="mt-4 text-[10px] text-orange-300 font-bold uppercase tracking-widest">Toca el código para copiar</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSuccessReward(null)}
                                    className="w-full py-5 bg-orange-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-orange-500/20 hover:bg-orange-700 transition-all"
                                >
                                    ¡Listo, Copiado!
                                </motion.button>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
                                    Nuevo Saldo: <span className="text-orange-600 font-black">{(points).toLocaleString()} BiPuntos</span>
                                </p>
                            </div>

                            {/* Confetti-like decoration icons */}
                            <Sparkles className="absolute top-10 left-10 text-amber-300 opacity-30" size={24} />
                            <Target className="absolute bottom-10 right-10 text-orange-400 opacity-20" size={32} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
