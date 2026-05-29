import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Gift, 
    Copy, 
    Check, 
    Tag, 
    Calendar, 
    ArrowRight, 
    Ticket, 
    ShoppingBag,
    Sparkles,
    ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { getUserCoupons, linkCouponToUser } from '../utils/firestoreCoupons';
import useLoyaltyPoints from '../hooks/useLoyaltyPoints';
import Navbar from '../components/Navbar';
import PageTransition from '../components/PageTransition';
import SEOHead from '../components/SEOHead';

export default function MisCuponesPage() {
    const { currentUser } = useAuth() || {};
    const navigate = useNavigate();
    const { history: loyaltyHistory, loading: loyaltyLoading } = useLoyaltyPoints();
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        const loadCoupons = async () => {
            if (!currentUser) return;
            try {
                setLoading(true);
                
                // --- MECANISMO DE RECUPERACIÓN (RECONCILIACIÓN) ---
                // Revisar el historial de lealtad para códigos que no estén vinculados
                if (loyaltyHistory && loyaltyHistory.length > 0) {
                    const redemptions = loyaltyHistory.filter(h => h.type === 'redeemed');
                    for (const entry of redemptions) {
                        if (entry.couponCode) {
                            // Intentar vincular este código si está huérfano
                            await linkCouponToUser(entry.couponCode, currentUser.uid);
                        }
                    }
                }
                
                const data = await getUserCoupons(currentUser.uid);
                setCoupons(data);
            } catch (error) {
                console.error('Error loading coupons:', error);
                toast.error('No se pudieron cargar tus cupones');
            } finally {
                setLoading(false);
            }
        };
        
        if (!loyaltyLoading) {
            loadCoupons();
        }
    }, [currentUser, loyaltyHistory, loyaltyLoading]);

    const handleCopy = async (coupon) => {
        try {
            await navigator.clipboard.writeText(coupon.code);
            setCopiedId(coupon.id);
            toast.success('¡Código copiado!');
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            toast.error('No se pudo copiar el código');
        }
    };

    if (!currentUser && !loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <Ticket className="text-gray-300 w-24 h-24 mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Mis Cupones</h2>
                <p className="text-gray-600 mb-6 max-w-md">Inicia sesión para ver tus recompensas y cupones de descuento.</p>
                <button 
                    onClick={() => navigate('/login')}
                    className="bg-bikitchen-orange text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 transition-all hover:-translate-y-1"
                >
                    Iniciar Sesión
                </button>
            </div>
        );
    }

    return (
        <PageTransition>
            <SEOHead
                title="Mis Cupones — BiKitchen"
                description="Tus cupones y recompensas de BiPuntos."
                noindex={true}
            />
            <div className="min-h-screen bg-neutral-50 pb-20">
                <Navbar />

                {/* Hero Section */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 pt-32 pb-44 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.4)_1px,transparent_1px)] bg-[length:32px_32px]"></div>
                    <div className="container relative z-10 px-4 md:px-6">
                        <button 
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-white/80 hover:text-white mb-8 transition-colors group"
                        >
                            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="font-bold text-sm uppercase tracking-widest">Volver</span>
                        </button>

                        <div className="max-w-3xl">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full mb-6 border border-white/20"
                            >
                                <Sparkles size={14} className="text-amber-200" />
                                <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">Mis Recompensas</span>
                            </motion.div>
                            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight">
                                Tus <span className="text-amber-100 italic">Cupones</span>
                            </h1>
                            <p className="text-white/80 text-lg md:text-xl font-medium leading-relaxed max-w-xl">
                                Aquí encontrarás todos los códigos que has canjeado con tus BiPuntos. Úsalos en el checkout para obtener descuentos exclusivos.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="container relative z-20 -mt-24 px-4 md:px-6">
                    {loading ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-3xl p-8 shadow-xl animate-pulse h-64"></div>
                            ))}
                        </div>
                    ) : coupons.length > 0 ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {coupons.map((coupon, idx) => (
                                <motion.div
                                    key={coupon.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="group relative"
                                >
                                    <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-[2rem] blur opacity-10 group-hover:opacity-30 transition duration-500"></div>
                                    <div className="relative bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 overflow-hidden h-full flex flex-col">
                                        {/* Background Pattern */}
                                        <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                                            <Tag size={120} />
                                        </div>

                                        <div className="relative z-10 flex-1">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="p-3 bg-orange-50 rounded-2xl">
                                                    <Gift className="text-orange-500" size={24} />
                                                </div>
                                                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    Válido
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-extrabold text-gray-900 mb-2 leading-tight">
                                                {coupon.description || 'Recompensa BiKitchen'}
                                            </h3>
                                            
                                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
                                                <Calendar size={14} />
                                                <span>Expira: {coupon.expirationDate?.toDate ? coupon.expirationDate.toDate().toLocaleDateString() : 'Próximamente'}</span>
                                            </div>

                                            {/* Code Display Card */}
                                            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 mb-8 flex items-center justify-between group/code relative overflow-hidden">
                                                <div className="absolute inset-0 bg-orange-500/0 group-hover/code:bg-orange-500/5 transition-colors"></div>
                                                <div className="relative">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Código</p>
                                                    <p className="text-2xl font-black text-bikitchen-orange tracking-tight font-mono">{coupon.code}</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleCopy(coupon)}
                                                    className={`relative z-10 w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                                                        copiedId === coupon.id 
                                                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                                                        : 'bg-white text-gray-400 hover:text-bikitchen-orange shadow-md border border-gray-100 hover:border-orange-200'
                                                    }`}
                                                >
                                                    {copiedId === coupon.id ? <Check size={20} /> : <Copy size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => navigate('/packs')}
                                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
                                        >
                                            <ShoppingBag size={18} />
                                            <span>Usar en mi pedido</span>
                                            <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-[3rem] p-16 shadow-2xl text-center border border-gray-100 max-w-2xl mx-auto"
                        >
                            <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8">
                                <Ticket className="text-orange-200 w-12 h-12" />
                            </div>
                            <h2 className="text-3xl font-black text-gray-900 mb-4">Aún no tienes cupones</h2>
                            <p className="text-gray-500 text-lg mb-10">
                                Canjea tus BiPuntos en nuestra tienda VIP por increíbles descuentos y productos gratuitos.
                            </p>
                            <button 
                                onClick={() => navigate('/canje')}
                                className="inline-flex items-center gap-3 bg-gray-900 text-white px-10 py-4 rounded-2xl font-bold shadow-2xl hover:bg-black transition-all hover:-translate-y-1"
                            >
                                <Sparkles size={20} className="text-orange-400" />
                                Ir a la Tienda de Recompensas
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* FAQ / Info Section */}
                <div className="container mt-24 px-4 md:px-6">
                    <div className="bg-gradient-to-br from-gray-900 to-black rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 blur-[100px] rounded-full"></div>
                        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                            <div>
                                <h2 className="text-4xl font-black mb-6 tracking-tight leading-tight">¿Cómo usar tus <br/><span className="text-bikitchen-orange">códigos de regalo?</span></h2>
                                <ul className="space-y-6">
                                    {[
                                        { title: 'Copia el código', desc: 'Haz clic en el botón de copiar en el cupón que desees usar.' },
                                        { title: 'Arma tu pedido', desc: 'Agrega tus platos individuales o packs favoritos al carrito.' },
                                        { title: 'Aplica el descuento', desc: 'En el checkout, pega el código en el campo de "Cupón" y verás el descuento aplicado.' }
                                    ].map((step, i) => (
                                        <li key={i} className="flex gap-4">
                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-orange-400 font-black">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white mb-1">{step.title}</h4>
                                                <p className="text-white/60 text-sm leading-relaxed">{step.desc}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="hidden md:block">
                                <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-3xl bg-white/5 backdrop-blur-sm p-4">
                                    <div className="w-full h-full border border-dashed border-white/20 rounded-xl flex items-center justify-center text-white/20 flex-col gap-4">
                                        <Tag size={48} />
                                        <p className="font-mono text-xs uppercase tracking-widest">Vista de Cupón en Checkout</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
