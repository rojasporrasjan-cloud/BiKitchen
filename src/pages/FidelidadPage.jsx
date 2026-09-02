import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEOHead, { SEO_CONFIG, getBreadcrumbSchema } from '../components/SEOHead';
import PageTransition from '../components/PageTransition';
import BackButton from '../components/BackButton';
import useLoyaltyPoints from '../hooks/useLoyaltyPoints';
import { useAuth } from '../context/AuthContext';
import { Award, Star, TrendingUp, Gift, ChevronRight, ArrowLeft, Crown, Sparkles, CheckCircle2, History, AlertCircle, Trophy, Target, ArrowRight, Ticket, ShoppingBag, Copy, Check, Facebook, Instagram, Share2, ExternalLink, Users, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { createCoupon } from '../utils/firestoreCoupons';

export default function FidelidadPage() {
    const navigate = useNavigate();
    const { currentUser } = useAuth() || {};
    const { 
        points, 
        totalEarned, 
        currentLevel, 
        nextLevel, 
        progressToNextLevel, 
        history, 
        redeemItem,
        completeMission,
        completedMissions,
        levels
    } = useLoyaltyPoints();

    const [redeemingItemId, setRedeemingItemId] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [copiedId, setCopiedId] = useState(null);
    
    // Estados para Misiones
    const [verifyingMission, setVerifyingMission] = useState(null);
    const [missionHandle, setMissionHandle] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);

    const handleCopy = async (id, text) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedId(id);
            toast.success('¡Código copiado!');
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Error copying:', err);
        }
    };

    // Tienda de Recompensas
    const rewardItems = [
        {
            id: 'free_shipping',
            title: 'Envío Gratis',
            pointsCost: 300,
            icon: '🚚',
            color: 'from-blue-500 to-cyan-500',
            category: 'Todos',
            description: 'Envío gratis en tu próximo pedido.',
            couponConfig: {
                type: 'free_shipping',
                value: 0
            }
        },
        {
            id: 'postre_keto',
            title: 'Postre Keto o Saludable',
            pointsCost: 400,
            icon: '🧁',
            color: 'from-pink-500 to-rose-500',
            category: 'Todos',
            description: 'Postre gratis. Agrega un postre a tu carrito y usa el cupón para descontar su valor (Aplica por ₡3,500).',
            couponConfig: {
                type: 'fixed',
                value: 3500
            }
        },
        {
            id: 'plato_regular',
            title: 'Plato Individual',
            pointsCost: 1200,
            icon: '🍲',
            color: 'from-orange-500 to-amber-500',
            category: 'Todos',
            description: 'Agrega tu plato individual favorito a la cesta y te descontamos (Aplica por ₡5,900).',
            couponConfig: {
                type: 'fixed',
                value: 5900
            }
        },
        {
            id: 'plato_premium',
            title: 'Plato Premium',
            pointsCost: 2000,
            icon: '🥩',
            color: 'from-red-500 to-orange-600',
            category: 'Todos',
            description: 'Agrega tu platillo premium y recibe un super descuento (Aplica por ₡8,900).',
            couponConfig: {
                type: 'fixed',
                value: 8900
            }
        },
        {
            id: 'discount_10k',
            title: 'Descuento ₡10,000',
            pointsCost: 2500,
            icon: '💰',
            color: 'from-emerald-500 to-teal-500',
            category: 'Todos',
            description: 'Cupón de descuento directo para aplicar a cualquier paquete o pedido grande.',
            couponConfig: {
                type: 'fixed',
                value: 10000
            }
        }
    ];

    const handleRedeem = async (item) => {
        if (!currentUser) return;
        
        if (points < item.pointsCost) {
            toast.error('No tienes suficientes BiPuntos.');
            return;
        }

        setRedeemingItemId(item.id);

        try {
            // 1. Generar código de cupón único
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const couponCode = `REWARD-${item.id.toUpperCase()}-${randomStr}`;
            
            // 2. Debitar los puntos de la cuenta del usuario (pasando el código como metadata)
            const result = await redeemItem(item.pointsCost, item.title, { code: couponCode });
            
            if (result.success) {
                // 3. Crear un cupón de uso único para el usuario
                // Expiración en 30 días
                const expirationDate = new Date();
                expirationDate.setDate(expirationDate.getDate() + 30);
                
                await createCoupon({
                    code: couponCode,
                    type: item.couponConfig.type,
                    value: item.couponConfig.value,
                    description: `Recompensa canjeada: ${item.title}`,
                    active: true,
                    minPurchase: 0,
                    maxUses: 1,
                    singleUsePerUser: true,
                    startDate: new Date(),
                    expirationDate: expirationDate,
                    generatedBy: currentUser.uid // Vincular al usuario
                });

                toast.success(
                    <div className="flex flex-col gap-1">
                        <span className="font-bold">¡Canje Exitoso!</span>
                        <span className="text-sm">Tu cupón es: <strong className="bg-yellow-100 text-yellow-800 px-1 rounded">{couponCode}</strong></span>
                        <span className="text-xs text-gray-500">Úsalo en el checkout. Válido por 30 días.</span>
                    </div>,
                    { duration: 10000, icon: '🎉' } // Duration longer so user can copy
                );
            } else {
                toast.error(result.error || 'Hubo un error al canjear.');
            }
        } catch (error) {
            toast.error('Ocurrió un problema, intenta de nuevo.');
        } finally {
            setRedeemingItemId(null);
        }
    };

    // Misiones BiKitchen
    const missions = [
        {
            id: 'welcome',
            title: '¡Bienvenido!',
            points: 500,
            icon: <Sparkles className="text-amber-500" />,
            description: 'Bono por unirte a la familia BiKitchen.',
            actionLabel: 'Completado',
            type: 'once'
        },
        {
            id: 'instagram',
            title: 'Síguenos en Instagram',
            points: 50,
            icon: <Instagram className="text-pink-500" />,
            description: 'No te pierdas nuestros menús semanales y tips.',
            link: 'https://www.instagram.com/bikitchenfood?igsh=bnowMmp3bjZvZ2sz&utm_source=qr',
            actionLabel: 'Seguir',
            type: 'social'
        },
        {
            id: 'facebook',
            title: 'Síguenos en Facebook',
            points: 50,
            icon: <Facebook className="text-blue-600" />,
            description: 'Únete a nuestra comunidad en Facebook.',
            link: 'https://www.facebook.com/share/1AFw6FcKHd/?mibextid=wwXIfr',
            actionLabel: 'Seguir',
            type: 'social'
        },
        {
            id: 'google_review',
            title: 'Reseña en Google',
            points: 100,
            icon: <Star className="text-yellow-500" />,
            description: 'Cuéntanos tu experiencia y gana BiPuntos.',
            link: 'https://g.page/r/CbG-OaX3Xy_pEAg/review',
            actionLabel: 'Escribir Reseña',
            type: 'review'
        },
        {
            id: 'referral',
            title: 'Refiere un Amigo',
            points: 200,
            icon: <Users className="text-purple-500" />,
            description: 'Gana 200 pts por el primer pedido de cada amigo.',
            actionLabel: 'Copiar Link',
            type: 'referral'
        }
    ];

    const handleMissionAction = async (mission) => {
        if (completedMissions.includes(mission.id)) return;

        if (mission.type === 'social' || mission.type === 'review') {
            window.open(mission.link, '_blank');
            // En lugar de dar puntos directo, mostramos el modal de verificación
            setTimeout(() => {
                setVerifyingMission(mission);
            }, 1000);
        } else if (mission.type === 'referral') {
            const referralLink = `${window.location.origin}/register?ref=${currentUser.uid}`;
            handleCopy('referral', referralLink);
            toast.info('Comparte este enlace con tus amigos');
        }
    };

    const handleClaimMissionPoints = async () => {
        if (!missionHandle.trim()) {
            toast.error('Por favor ingresa tu usuario o nombre');
            return;
        }

        setIsClaiming(true);
        try {
            const res = await completeMission(
                verifyingMission.id, 
                verifyingMission.points, 
                verifyingMission.title,
                missionHandle.trim()
            );

            if (res.success) {
                toast.success(`¡Felicidades! +${verifyingMission.points} BiPuntos ganados`);
                setVerifyingMission(null);
                setMissionHandle('');
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error('Error al reclamar los puntos');
        } finally {
            setIsClaiming(false);
        }
    };

    if (!currentUser) {
        return (
            <PageTransition>
                <div className="min-h-screen bg-gray-50 flex flex-col">
                    <Navbar />
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <Star className="text-gray-300 w-24 h-24 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Programa de Fidelidad</h2>
                        <p className="text-gray-600 mb-6 max-w-md">Inicia sesión para ganar puntos, subir de nivel y canjear premios en nuestra tienda de recompensas.</p>
                        <button 
                            onClick={() => navigate('/login')}
                            className="bg-bikitchen-orange text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 transition-all"
                        >
                            Iniciar Sesión
                        </button>
                    </div>
                </div>
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <SEOHead
                {...SEO_CONFIG.fidelidad}
                structuredData={getBreadcrumbSchema([{ name: 'BiPuntos — Programa de Fidelidad', url: 'https://www.bikitchencr.com/fidelidad' }])}
            />
            <div className="min-h-screen bg-neutral-50 pb-20 selection:bg-orange-100 selection:text-orange-900">
                <Navbar />

                {/* HEADER / HERO DASHBOARD - Brand Gradient */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-500 pt-32 pb-40 relative overflow-hidden shadow-2xl">
                    {/* Animated Background Mesh - Brand Versions */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.2, 1],
                                x: [0, 50, 0],
                                y: [0, -30, 0]
                            }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            className={`absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-white opacity-20 blur-[120px] rounded-full`}
                        ></motion.div>
                        <motion.div 
                            animate={{ 
                                scale: [1, 1.1, 1],
                                x: [0, -40, 0],
                                y: [0, 40, 0]
                            }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="absolute bottom-[-10%] left-[-5%] w-[600px] h-[600px] bg-amber-200/20 blur-[100px] rounded-full"
                        ></motion.div>
                    </div>

                    <div className="container relative z-10 px-4 md:px-6">
                        {/* Back Button */}
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="mb-10"
                        >
                            <BackButton light className="hover:bg-white/10 transition-colors" />
                        </motion.div>

                        <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-10">
                            <motion.div 
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center lg:text-left flex-1"
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/20 px-4 py-1.5 rounded-full mb-6"
                                >
                                    <Sparkles size={14} className="text-amber-100" />
                                    <span className="text-white/90 text-[10px] font-bold uppercase tracking-[0.2em]">Exclusivo para Miembros</span>
                                </motion.div>
                                <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter leading-tight">
                                    BiKitchen <span className="text-amber-100 italic drop-shadow-sm">Rewards</span>
                                </h1>
                                <p className="text-white/80 text-lg md:text-xl max-w-xl font-medium leading-relaxed">
                                    Tu lealtad tiene premio. Acumula BiPuntos con cada compra y desbloquea beneficios exclusivos en nuestra tienda VIP.
                                </p>
                            </motion.div>
                            
                            {/* Puntos / Main Metric Card - Light Glass */}
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, rotateY: 20 }}
                                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                                className="relative group"
                            >
                                <div className="absolute -inset-1 bg-gradient-to-r from-white to-amber-100 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
                                <div className="relative bg-white/20 backdrop-blur-xl border border-white/30 rounded-[2.5rem] p-8 md:p-10 flex flex-col items-center md:items-start gap-6 shadow-2xl min-w-[320px]">
                                    <div className="flex items-center gap-5">
                                        <div className="w-20 h-20 rounded-2xl bg-white/30 flex items-center justify-center p-1 shadow-xl backdrop-blur-md">
                                            <Star className="text-white w-10 h-10 drop-shadow-md fill-white/50" />
                                        </div>
                                        <div>
                                            <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.25em] mb-1">Saldo Disponible</p>
                                            <div className="flex items-baseline gap-2">
                                                <motion.span 
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.5, duration: 0.8 }}
                                                    className="text-6xl font-black text-white tabular-nums tracking-tighter"
                                                >
                                                    {points?.toLocaleString() || 0}
                                                </motion.span>
                                                <span className="text-amber-100 font-bold text-xs uppercase tracking-widest pb-1.5">BiPuntos</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full h-px bg-white/20"></div>
                                    
                                    <div className="flex justify-between w-full items-center">
                                        <div className="flex items-center gap-2 text-white/80">
                                            <Trophy size={16} className="text-amber-200" />
                                            <span className="text-xs font-bold uppercase tracking-wider">Nivel {currentLevel?.name || 'Bronce'}</span>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <Link to="/canje" className="text-xs font-bold text-white hover:text-amber-100 transition-colors uppercase tracking-widest flex items-center gap-1 group/btn">
                                                Canjear ahora
                                                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                            </Link>
                                            <Link to="/mis-cupones" className="text-[10px] font-black text-amber-100 hover:text-white transition-colors uppercase tracking-[0.2em] flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                                                <Ticket size={12} />
                                                Mis Cupones
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                <div className="container -mt-24 relative z-20 px-4 md:px-6">
                    
                    {/* VIP CARD & PROGRESS */}
                    <div className="grid lg:grid-cols-12 gap-8 mb-16">
                        {/* Status Card - Premium Glassmorphism */}
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="lg:col-span-12 xl:col-span-5 perspective"
                        >
                            <div
                                className={`relative aspect-[1.586/1] rounded-[2.5rem] p-10 text-white shadow-2xl overflow-hidden group bg-gradient-to-br from-orange-500 to-amber-500 border border-white/30`}
                            >
                                {/* Premium Shine Effect */}
                                <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(255,255,255,0.15)_25%,transparent_30%)] group-hover:left-[100%] transition-all duration-1000 ease-in-out -left-[100%] z-10 pointer-events-none"></div>
                                
                                <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-white/10 blur-[80px] rounded-full mix-blend-overlay -mt-20 -mr-20"></div>
                                <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-black/20 blur-[60px] rounded-full mix-blend-multiply -mb-20 -ml-20"></div>
                                
                                <div className="relative z-20 h-full flex flex-col justify-between">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/70">Membresía Activa</span>
                                            </div>
                                            <p className="text-white/60 text-[10px] font-black tracking-[0.25em] uppercase">Rango Actual</p>
                                            <h2 className="text-5xl font-black tracking-tight">{currentLevel?.name || 'Bronce'}</h2>
                                        </div>
                                        <motion.div 
                                            animate={{ y: [0, -10, 0], filter: ['drop-shadow(0 0 0px #fff)', 'drop-shadow(0 0 15px #fff)', 'drop-shadow(0 0 0px #fff)'] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                            className="text-6xl drop-shadow-2xl"
                                        >
                                            {currentLevel?.icon || '🥉'}
                                        </motion.div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="space-y-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] text-white/40 font-black uppercase tracking-[0.3em] mb-1">Identificador VIP</span>
                                                <span className="font-mono text-xs text-white/70 tracking-[0.2em]">BK-{currentUser.uid.slice(0, 8).toUpperCase()}</span>
                                            </div>
                                            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/10 w-fit">
                                                <Crown size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" />
                                                <span className="text-sm font-bold tracking-tight">Beneficio: <span className="text-orange-300">{currentLevel?.multiplier}x</span> Puntos</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Miembro desde</p>
                                            <p className="text-sm font-bold">{new Date(currentUser.metadata.creationTime).getFullYear() || '2024'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Progress Tracker - Premium Card */}
                        <motion.div 
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="lg:col-span-12 xl:col-span-7 bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100 flex flex-col justify-between relative overflow-hidden"
                        >
                            {!nextLevel ? (
                                <div className="text-center py-6 flex flex-col items-center justify-center h-full">
                                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-3xl flex items-center justify-center shadow-2xl mb-6 animate-bounce ring-8 ring-amber-50">
                                        <Trophy size={48} className="text-white drop-shadow-lg" />
                                    </div>
                                    <h3 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">¡Leyenda de BiKitchen!</h3>
                                    <p className="text-gray-500 text-lg font-medium max-w-sm">Has alcanzado el estatus máximo. Disfruta de todos los beneficios VIP exclusivos y envíos gratis permanentes.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="relative z-10 flex justify-between items-start mb-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <TrendingUp size={12} className="text-blue-600" />
                                                </div>
                                                <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Próximo Objetivo</span>
                                            </div>
                                            <h3 className="text-3xl font-black text-gray-900 mb-1 tracking-tight">Nivel {nextLevel.name}</h3>
                                            <p className="text-gray-500 font-medium">Estás a pocos pasos de desbloquear nuevas recompensas.</p>
                                        </div>
                                        <div className="text-5xl bg-gray-50 w-20 h-20 rounded-3xl flex items-center justify-center shadow-inner border border-gray-100 hover:scale-110 transition-transform duration-200">
                                            {nextLevel.icon}
                                        </div>
                                    </div>

                                    <div className="relative z-10 space-y-4 mb-8">
                                        <div className="flex justify-between items-end">
                                            <div className="flex flex-col">
                                                <span className="text-3xl font-black text-gray-900 tabular-nums tracking-tighter">{Math.floor(progressToNextLevel)}%</span>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Progreso Total</span>
                                            </div>
                                            <div className="text-right flex flex-col items-end">
                                                <span className="text-xl font-black text-blue-600 tabular-nums tracking-tight">{(nextLevel.minPoints - totalEarned).toLocaleString()}</span>
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Puntos Faltantes</span>
                                            </div>
                                        </div>
                                        
                                        <div className="h-6 bg-gray-100 rounded-[1rem] overflow-hidden p-1 shadow-inner border border-gray-100">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressToNextLevel}%` }}
                                                transition={{ duration: 2, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                                                className={`h-full bg-gradient-to-r ${nextLevel.color} rounded-[0.75rem] relative shadow-lg shadow-orange-500/20`}
                                            >
                                                <div className="absolute inset-0 bg-white/20 w-full overflow-hidden">
                                                    <motion.div 
                                                        animate={{ x: ['-100%', '100%'] }}
                                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                        className="w-full h-full bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.4)_50%,transparent_100%)]"
                                                    ></motion.div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </div>

                                    <div className="relative z-10 bg-gray-50 rounded-2xl p-5 flex gap-4 items-center border border-gray-100">
                                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Meta del Nivel</p>
                                            <p className="text-sm font-bold text-gray-800 leading-tight">Gana {nextLevel.minPoints.toLocaleString()} BiPuntos para desbloquear beneficios VIP {nextLevel.name}.</p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Decorative Background Icon */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                                <Sparkles size={300} />
                            </div>
                        </motion.div>
                    </div>

                    {/* NEW MISSIONS SECTION */}
                    <section className="mb-20">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-10 gap-6">
                            <div className="text-center md:text-left">
                                <h2 className="text-4xl font-black text-gray-900 mb-3 tracking-tighter flex items-center gap-4 justify-center md:justify-start">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                                        <Target className="text-orange-600" size={32} />
                                    </div>
                                    Misiones BiKitchen
                                </h2>
                                <p className="text-gray-500 text-lg font-medium">Completa tareas sencillas y acumula puntos extra.</p>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                            {missions.map((mission, idx) => {
                                const isCompleted = completedMissions.includes(mission.id);
                                return (
                                    <motion.div
                                        key={mission.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.1 }}
                                        className={`relative bg-white rounded-[2rem] p-6 border-2 transition-all duration-300 flex flex-col justify-between ${
                                            isCompleted 
                                                ? 'border-green-100 bg-green-50/20' 
                                                : 'border-gray-50 hover:border-orange-100 hover:shadow-xl'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-white shadow-sm border border-gray-50`}>
                                                    {mission.icon}
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                                    isCompleted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                                }`}>
                                                    +{mission.points} pts
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-extrabold text-gray-900 mb-2 leading-tight">{mission.title}</h3>
                                            <p className="text-xs text-gray-500 leading-relaxed mb-6">{mission.description}</p>
                                        </div>

                                        <button
                                            onClick={() => handleMissionAction(mission)}
                                            disabled={isCompleted && mission.id !== 'referral'}
                                            className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                                isCompleted && mission.id !== 'referral'
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-gray-900 text-white hover:bg-black active:scale-95'
                                            }`}
                                        >
                                            {isCompleted && mission.id !== 'referral' ? (
                                                <>
                                                    <CheckCircle2 size={16} />
                                                    <span>Completada</span>
                                                </>
                                            ) : (
                                                <>
                                                    {mission.type === 'social' && <ExternalLink size={16} />}
                                                    {mission.type === 'referral' && <Share2 size={16} />}
                                                    <span>{mission.actionLabel}</span>
                                                </>
                                            )}
                                        </button>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </section>
                    {/* REWARDS CTA SECTION - Redesigned */}
                    <motion.section 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mb-20"
                    >
                        <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 rounded-[3rem] p-10 md:p-14 shadow-2xl relative overflow-hidden group">
                            {/* Animated flares */}
                            <motion.div 
                                animate={{ scale: [1, 1.5, 1], opacity: [0.1, 0.2, 0.1] }}
                                transition={{ duration: 8, repeat: Infinity }}
                                className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] -mr-40 -mt-40"
                            ></motion.div>
                            <motion.div 
                                animate={{ scale: [1.2, 1, 1.2], opacity: [0.05, 0.15, 0.05] }}
                                transition={{ duration: 10, repeat: Infinity }}
                                className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-500/10 rounded-full blur-[80px] -ml-20 -mb-20"
                            ></motion.div>
                            
                            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12">
                                <div className="text-center lg:text-left space-y-6">
                                    <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 group-hover:border-amber-200/30 transition-colors">
                                        <Sparkles size={16} className="text-amber-400 animate-pulse" />
                                        <span className="text-white text-[10px] font-black uppercase tracking-[0.3em]">Beneficios Exclusivos</span>
                                    </div>
                                    <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter">
                                        Minitienda de <br />
                                        <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 bg-clip-text text-transparent">Recompensas VIP</span>
                                    </h2>
                                    <p className="text-gray-400 text-lg md:text-xl max-w-xl font-medium leading-relaxed">
                                        Tu compromiso merece lo mejor. Canjea tus puntos por cupones directos, 
                                        envíos sin costo y platillos especiales de nuestra cocina.
                                    </p>
                                </div>
                                
                                <div className="relative group/btn-cont">
                                    <div className="absolute -inset-4 bg-orange-500/20 rounded-[2rem] blur-2xl group-hover/btn-cont:bg-orange-500/40 transition-all duration-500" aria-hidden="true"></div>
                                    <Link 
                                        to="/canje"
                                        className="relative group bg-white text-orange-600 px-12 py-6 rounded-[2rem] font-black text-xl transition-all shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-4 overflow-hidden border border-orange-100"
                                    >
                                        <span className="relative z-10 flex items-center gap-3">
                                            Entrar a la Tienda
                                            <ArrowRight className="group-hover:translate-x-2 transition-transform duration-300" />
                                        </span>
                                        <div className="absolute inset-0 bg-gradient-to-r from-orange-50 to-white group-hover:from-white group-hover:to-orange-50 transition-all duration-500"></div>
                                    </Link>
                                </div>
                            </div>

                            {/* Visual Reward Icons Floating */}
                            <div className="absolute right-10 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-6 opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none">
                                <Gift size={64} className="text-orange-400 rotate-12" />
                                <Ticket size={64} className="text-amber-300 -rotate-12 translate-x-10" />
                                <ShoppingBag size={64} className="text-orange-500 rotate-6" />
                            </div>
                        </div>
                    </motion.section>

                    {/* VIP LEVELS TABLE - Redesigned Cards */}
                    <section className="mb-24">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
                            <div className="text-center md:text-left">
                                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter flex items-center gap-4 justify-center md:justify-start">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center">
                                        <Target className="text-orange-600" size={32} />
                                    </div>
                                    Estatutos VIP
                                </h2>
                                <p className="text-gray-500 text-lg font-medium">Cada nivel desbloquea nuevas posibilidades y multiplicadores de puntos.</p>
                            </div>
                        </div>

                        <div className="grid gap-6">
                            {levels && levels.map((level, index) => {
                                const isCurrentLevel = level.name === currentLevel?.name;
                                const isUnlocked = totalEarned >= level.minPoints;
                                
                                return (
                                    <motion.div
                                        key={level.name}
                                        initial={{ opacity: 0, x: -20 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className={`group relative bg-white rounded-[2.5rem] p-8 border-2 transition-all duration-500 ${
                                            isCurrentLevel 
                                                ? 'border-orange-500 shadow-[0_20px_50px_-15px_rgba(249,115,22,0.3)] scale-[1.02]' 
                                                : isUnlocked
                                                    ? 'border-gray-100 shadow-xl opacity-90'
                                                    : 'border-transparent bg-gray-50/50 opacity-60 grayscale-[0.5]'
                                        }`}
                                    >
                                        {/* Status Tag */}
                                        {isCurrentLevel && (
                                            <div className="absolute top-0 right-10 -translate-y-1/2 bg-orange-500 text-white px-5 py-2 rounded-full font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-500/40">
                                                Tu Nivel Actual
                                            </div>
                                        )}

                                        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
                                            <div className={`w-24 h-24 shrink-0 rounded-[1.75rem] bg-gradient-to-br ${level.color} flex items-center justify-center text-4xl shadow-xl shadow-inner group-hover:scale-110 transition-transform duration-500`}>
                                                {level.icon}
                                            </div>
                                            
                                            <div className="flex-1 space-y-4">
                                                <div className="flex flex-col md:flex-row md:items-center gap-2 lg:gap-4">
                                                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                                                        {level.name}
                                                    </h3>
                                                    <div className="h-1 w-1 rounded-full bg-gray-300 hidden md:block"></div>
                                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                                        {level.minPoints === 0 ? 'Acceso Vitalicio' : `${level.minPoints.toLocaleString('es-CR')} pts requeridos`}
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap gap-3">
                                                    {level.benefits.map((benefit, i) => (
                                                        <span 
                                                            key={i}
                                                            className="text-xs bg-gray-50 border border-gray-100 font-bold text-gray-600 px-4 py-2 rounded-2xl flex items-center gap-2 group-hover:bg-white group-hover:border-gray-200 transition-colors"
                                                        >
                                                            <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                                                                <CheckCircle2 size={10} className="text-green-600" />
                                                            </div>
                                                            {benefit}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex flex-row lg:flex-col items-center justify-between lg:justify-center lg:items-end gap-x-6 gap-y-1 bg-gray-50 px-8 py-5 rounded-[2rem] border border-gray-100 group-hover:bg-orange-50 group-hover:border-orange-100 transition-colors">
                                                <p className="text-4xl font-black text-gray-900 tabular-nums leading-none">
                                                    {level.multiplier}<span className="text-orange-500">x</span>
                                                </p>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] group-hover:text-orange-400 transition-colors text-right">Velocidad de Puntos</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </section>

                    {/* HISTORIAL - Premium List */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden"
                    >
                        <div 
                            className="flex items-center justify-between mb-8 cursor-pointer group" 
                            onClick={() => setShowHistory(!showHistory)}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors">
                                    <History size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Registro de Actividad</h2>
                                    <p className="text-sm text-gray-400 font-medium">Historial detallado de tus BiPuntos</p>
                                </div>
                            </div>
                            <div className={`w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center transition-all duration-300 ${showHistory ? 'rotate-90 bg-orange-100 text-orange-600' : 'text-gray-400'}`}>
                                <ChevronRight size={20} />
                            </div>
                        </div>
                        
                        <AnimatePresence>
                            {showHistory && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="space-y-3 pt-4 border-t border-gray-100">
                                        {history?.length === 0 ? (
                                            <div className="text-center py-16">
                                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                                    <AlertCircle size={40} />
                                                </div>
                                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No hay movimientos registrados</p>
                                            </div>
                                        ) : (
                                            history?.map((record, idx) => (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    key={record.id} 
                                                    className="flex items-center justify-between p-5 bg-gray-50/50 hover:bg-gray-50 rounded-3xl border border-transparent hover:border-gray-100 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${record.points > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                                            {record.points > 0 ? <TrendingUp size={18} /> : <Gift size={18} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-gray-900 leading-tight">{record.description}</span>
                                                                {record.couponCode && (
                                                                    <div className="flex items-center gap-1.5 ml-1">
                                                                        <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                                                            CÓDIGO: {record.couponCode}
                                                                        </span>
                                                                        <button 
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleCopy(record.id, record.couponCode);
                                                                            }}
                                                                            className={`p-1 rounded-md transition-colors ${copiedId === record.id ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                                                        >
                                                                            {copiedId === record.id ? <Check size={10} /> : <Copy size={10} />}
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                                                {new Date(record.date).toLocaleDateString()} • {new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={`font-black tabular-nums text-xl tracking-tighter ${record.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {record.points > 0 ? '+' : ''}{record.points} <span className="text-[10px] font-black uppercase tracking-widest ml-1">pts</span>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
                
                <Footer />

                {/* MODAL DE VERIFICACIÓN DE MISIONES */}
                <AnimatePresence>
                    {verifyingMission && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setVerifyingMission(null)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="relative bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
                            >
                                {/* Header */}
                                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-8 text-white relative">
                                    <button 
                                        onClick={() => setVerifyingMission(null)}
                                        className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-full transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                                        <div className="text-3xl">{verifyingMission.icon}</div>
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight mb-1">Verificar Misión</h3>
                                    <p className="text-white/80 text-sm font-medium">Reclama tus +{verifyingMission.points} BiPuntos</p>
                                </div>

                                {/* Body */}
                                <div className="p-8 pb-10">
                                    <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                                        Para validar que nos sigues o has dejado la reseña, ingresa tu **usuario** (ej: @tunombre) o el nombre con el que apareces:
                                    </p>

                                    <div className="relative mb-8">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                            {verifyingMission.id === 'google_review' ? <Users size={18} /> : <Instagram size={18} />}
                                        </div>
                                        <input 
                                            type="text" 
                                            value={missionHandle}
                                            onChange={(e) => setMissionHandle(e.target.value)}
                                            placeholder={verifyingMission.id === 'google_review' ? "Tu nombre en Google" : "Tu usuario @nombre"}
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-gray-900 font-bold focus:border-orange-500 focus:bg-white transition-all outline-none"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button 
                                            onClick={handleClaimMissionPoints}
                                            disabled={isClaiming || !missionHandle.trim()}
                                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                                        >
                                            {isClaiming ? (
                                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <Send size={20} className="text-orange-400" />
                                                    <span>Reclamar BiPuntos</span>
                                                </>
                                            )}
                                        </button>
                                        <button 
                                            onClick={() => setVerifyingMission(null)}
                                            className="w-full py-3 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </PageTransition>
    );
}
