import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    User, ShoppingBag, Gift, Users, Star,
    ChevronRight, LogOut, LogIn, ArrowLeft,
    Award, Sparkles, Crown, TrendingUp, Bell, Tag, Copy, Check, Loader2, Ticket, Smartphone, MessageSquare, ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWhatsApp } from '../hooks/useWhatsApp';
import useLoyaltyPoints from '../hooks/useLoyaltyPoints';
import { usePromoBanner } from '../hooks/usePromoBanner';
import useOrderHistory from '../hooks/useOrderHistory';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import NotificationSettings from '../components/NotificationSettings';
import { validateCoupon, getWelcomeCoupon, getUserCoupons } from '../utils/firestoreCoupons';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

export default function MiCuentaPage() {
    const navigate = useNavigate();
    const { currentUser, logout } = useAuth() || {};
    const { points, level, getNextLevel, getProgressToNextLevel } = useLoyaltyPoints();
    const { orders } = useOrderHistory();
    const { applyCoupon, appliedCoupon } = useCart() || {};
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    // Estado para cupones
    const [couponCode, setCouponCode] = useState('');
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [couponError, setCouponError] = useState('');
    const [couponSuccess, setCouponSuccess] = useState(null);
    const [welcomeCoupon, setWelcomeCoupon] = useState(null);
    const [copiedWelcome, setCopiedWelcome] = useState(false);
    const [userCoupons, setUserCoupons] = useState([]);
    const [loadingCoupons, setLoadingCoupons] = useState(false);
    const [copiedCouponId, setCopiedCouponId] = useState(null);

    useEffect(() => {
        const loadUserCoupons = async () => {
            if (currentUser) {
                setLoadingCoupons(true);
                const coupons = await getUserCoupons(currentUser.uid);
                setUserCoupons(coupons);
                setLoadingCoupons(false);
            }
        };
        loadUserCoupons();
    }, [currentUser]);

    const handleCopyCoupon = async (coupon) => {
        if (coupon?.code) {
            try {
                await navigator.clipboard.writeText(coupon.code);
                setCopiedCouponId(coupon.id);
                toast.success('¡Código copiado!');
                setTimeout(() => setCopiedCouponId(null), 2000);
            } catch (err) {
                console.error('Error copying:', err);
            }
        }
    };

    const handleCopyWelcomeCoupon = async () => {
        if (welcomeCoupon?.code) {
            try {
                await navigator.clipboard.writeText(welcomeCoupon.code);
                setCopiedWelcome(true);
                toast.success('¡Código copiado!');
                setTimeout(() => setCopiedWelcome(false), 2000);
            } catch (err) {
                console.error('Error copying:', err);
            }
        }
    };

    const handleApplyWelcomeCoupon = async () => {
        if (welcomeCoupon?.code) {
            setValidatingCoupon(true);
            setCouponError('');
            setCouponSuccess(null);

            try {
                const result = await validateCoupon(welcomeCoupon.code, 0, currentUser?.uid);

                if (result.valid) {
                    if (applyCoupon) {
                        applyCoupon(result.coupon);
                    }
                    setCouponSuccess(result.coupon);
                    setWelcomeCoupon(null); // Ocultar el cupón de bienvenida
                    toast.success(`¡Cupón "${result.coupon.code}" aplicado!`);
                } else {
                    setCouponError(result.error || 'Cupón no válido');
                }
            } catch (error) {
                setCouponError('Error al validar el cupón');
            }

            setValidatingCoupon(false);
        }
    };

    const handleLogout = async () => {
        if (logout) {
            await logout();
            navigate('/');
        }
    };

    const { getWhatsAppUrl } = useWhatsApp();

    // Validar y aplicar cupón
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) {
            setCouponError('Ingresa un código de cupón');
            return;
        }

        setValidatingCoupon(true);
        setCouponError('');
        setCouponSuccess(null);

        try {
            const result = await validateCoupon(couponCode.trim(), 0, currentUser?.uid);

            if (result.valid) {
                // Aplicar al carrito
                if (applyCoupon) {
                    applyCoupon(result.coupon);
                }
                setCouponSuccess(result.coupon);
                setCouponCode('');
                toast.success(`¡Cupón "${result.coupon.code}" aplicado!`);
            } else {
                setCouponError(result.error || 'Cupón no válido');
            }
        } catch (error) {
            setCouponError('Error al validar el cupón');
        }

        setValidatingCoupon(false);
    };

    // Secciones principales de la cuenta
    const mainSections = [
        {
            title: 'Mis Pedidos',
            description: 'Historial y seguimiento de tus pedidos',
            icon: ShoppingBag,
            path: '/mis-pedidos',
            color: 'from-orange-500 to-red-500',
            bgColor: 'bg-orange-50',
            badge: orders?.length > 0 ? `${orders.length}` : null
        },
        {
            title: 'Tienda de Recompensas',
            description: 'Canjea tus BiPuntos',
            icon: Star,
            path: '/fidelidad',
            color: 'from-yellow-500 to-amber-500',
            bgColor: 'bg-yellow-50',
            badge: 'Nuevo!',
            disabled: false
        }
    ];

    // Secciones secundarias
    const secondarySections = [
        {
            title: 'Referidos',
            description: '¡Invita y gana puntos!',
            icon: Users,
            path: '/referidos',
            color: 'from-blue-50 to-cyan-50',
            iconColor: 'from-blue-500 to-cyan-500',
            disabled: false
        },
        {
            title: 'Gift Cards',
            description: 'Regala salud',
            icon: Gift,
            path: '/gift-cards',
            color: 'from-pink-50 to-rose-50',
            iconColor: 'from-pink-500 to-rose-500',
            disabled: false
        },
        {
            title: 'Preguntas',
            description: 'FAQ y ayuda',
            icon: Award,
            path: '/faq',
            color: 'from-purple-50 to-violet-50',
            iconColor: 'from-purple-500 to-violet-500'
        }
    ];

    const nextLevel = getNextLevel ? getNextLevel() : null;
    const progress = getProgressToNextLevel ? getProgressToNextLevel() : 0;

    // Obtener el nombre de usuario del email
    const userName = currentUser?.email?.split('@')[0] || 'Usuario';

    // Detectar si hay banner promocional
    const showPromoBanner = usePromoBanner();

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-br from-bikitchen-beige via-white to-orange-50">
                <Navbar />

                {/* Hero Header */}
                <header
                    className="relative pb-32 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 overflow-hidden pt-8"
                    style={{
                        paddingTop: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + 32px)`
                            : undefined
                    }}
                >
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/30 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-400/10 via-white/10 to-transparent rounded-full blur-3xl"></div>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>

                    <div className="container relative z-10">
                        {/* Back Button */}
                        <motion.button
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Volver</span>
                        </motion.button>

                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Avatar */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="relative"
                            >
                                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/40 shadow-2xl">
                                    <User size={56} className="text-white" />
                                </div>
                                {currentUser && (
                                    <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full border-4 border-white flex items-center justify-center shadow-lg">
                                        <Sparkles size={18} className="text-white" />
                                    </div>
                                )}
                            </motion.div>

                            {/* User Info */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-center md:text-left"
                            >
                                <h1 className="text-4xl md:text-5xl font-black text-white mb-3 drop-shadow-2xl">
                                    {currentUser ? `¡Hola, ${userName}!` : 'Mi Cuenta'}
                                </h1>
                                {currentUser ? (
                                    <p className="text-white/90 text-xl font-medium">{currentUser.email}</p>
                                ) : (
                                    <p className="text-white/90 text-xl font-medium">
                                        Inicia sesión para acceder a todas las funciones
                                    </p>
                                )}

                                {/* Quick Stats */}
                                {currentUser && (
                                    <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-6">
                                        <div className="bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-2 border border-white/30 shadow-lg">
                                            <Crown size={20} className="text-yellow-300" />
                                            <span className="text-white text-base font-bold">Nivel {level || 'Bronce'}</span>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-2 border border-white/30 shadow-lg">
                                            <Star size={20} className="text-yellow-300" />
                                            <span className="text-white text-base font-bold">{points || 0} puntos</span>
                                        </div>
                                        {orders?.length > 0 && (
                                            <div className="bg-white/20 backdrop-blur-md rounded-full px-5 py-2.5 flex items-center gap-2 border border-white/30 shadow-lg">
                                                <ShoppingBag size={20} className="text-white" />
                                                <span className="text-white text-base font-bold">{orders.length} pedidos</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </header>

                {/* Main Content - Overlapping cards */}
                <main className="container relative z-20 -mt-20 pb-16">
                    {/* Login/Register Banner si no está logueado */}
                    <AnimatePresence>
                        {!currentUser && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="bg-white rounded-3xl p-8 mb-6 shadow-xl border border-gray-100"
                            >
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="text-center md:text-left">
                                        <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                                            <Sparkles className="text-bikitchen-orange" size={24} />
                                            <h2 className="text-2xl font-bold text-gray-900">¡Únete a BiKitchen!</h2>
                                        </div>
                                        <p className="text-gray-600">
                                            Crea una cuenta para guardar tus pedidos, acumular puntos y obtener descuentos exclusivos
                                        </p>
                                    </div>
                                    <Link
                                        to="/login"
                                        className="flex items-center gap-2 bg-gradient-to-r from-bikitchen-orange to-orange-500 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/25 transition-all hover:scale-105"
                                    >
                                        <LogIn size={20} />
                                        Iniciar Sesión
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Nivel de Fidelidad - Card destacada */}
                    {currentUser && points !== undefined && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-3xl p-6 mb-6 shadow-xl border border-gray-100"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                        <Award size={28} className="text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-gray-900">
                                            Nivel {level || 'Bronce'}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {points} puntos acumulados
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    to="/fidelidad"
                                    className="flex items-center gap-1 text-bikitchen-orange hover:underline text-sm font-medium"
                                >
                                    Ver detalles
                                    <ChevronRight size={16} />
                                </Link>
                            </div>

                            {nextLevel && (
                                <div className="bg-gray-50 rounded-xl p-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                                        <span className="flex items-center gap-1">
                                            <TrendingUp size={14} />
                                            Progreso hacia {nextLevel.name}
                                        </span>
                                        <span className="font-semibold">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
                                        />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Secciones principales */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        {mainSections.map((section, index) => {
                            const Icon = section.icon;
                            return (
                                <motion.div
                                    key={section.title}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 + index * 0.05 }}
                                >
                                    {section.disabled ? (
                                        <div className={`block ${section.bgColor} rounded-2xl p-6 border border-gray-100 opacity-60 cursor-not-allowed relative`}>
                                            <div className="absolute top-2 right-2 bg-gray-800 text-white text-xs px-2 py-1 rounded-full">
                                                Próximamente
                                            </div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                                                    <Icon size={28} className="text-white" />
                                                </div>
                                                {section.badge && (
                                                    <span className="bg-white text-bikitchen-orange text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                                                        {section.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-xl text-gray-900 mb-1">
                                                {section.title}
                                            </h3>
                                            <p className="text-gray-600 text-sm">
                                                {section.description}
                                            </p>
                                        </div>
                                    ) : (
                                        <Link
                                            to={section.path}
                                            className={`block ${section.bgColor} rounded-2xl p-6 border border-gray-100 hover:shadow-lg transition-all group`}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${section.color} flex items-center justify-center shadow-lg`}>
                                                    <Icon size={28} className="text-white" />
                                                </div>
                                                {section.badge && (
                                                    <span className="bg-white text-bikitchen-orange text-sm font-bold px-3 py-1 rounded-full shadow-sm">
                                                        {section.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-xl text-gray-900 mb-1 group-hover:text-bikitchen-orange transition-colors">
                                                {section.title}
                                            </h3>
                                            <p className="text-gray-600 text-sm">
                                                {section.description}
                                            </p>
                                            <div className="mt-4 flex items-center text-bikitchen-orange font-medium text-sm">
                                                Ver más
                                                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </Link>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Sección de Cupones */}
                    {currentUser && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6"
                        >
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <Tag size={20} className="text-bikitchen-orange" />
                                        Códigos de Descuento
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Aplica cupones y obtén descuentos en tus pedidos
                                    </p>
                                </div>
                                <Link 
                                    to="/mis-cupones"
                                    className="text-xs font-bold text-bikitchen-orange bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors flex items-center gap-1.5"
                                >
                                    <Ticket size={14} />
                                    Gestionar Premios
                                </Link>
                            </div>

                            <div className="p-4 space-y-4">
                                {/* Cupón de Bienvenida disponible */}
                                {welcomeCoupon && !appliedCoupon && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border-2 border-dashed border-bikitchen-orange/30"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <Gift size={18} className="text-bikitchen-orange" />
                                            <span className="font-semibold text-gray-900">¡Tienes un cupón de bienvenida!</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl font-bold text-bikitchen-orange font-mono">
                                                        {welcomeCoupon.code}
                                                    </span>
                                                    <button
                                                        onClick={handleCopyWelcomeCoupon}
                                                        className={`p-1.5 rounded-lg transition-colors ${copiedWelcome
                                                                ? 'bg-green-100 text-green-600'
                                                                : 'bg-orange-100 text-bikitchen-orange hover:bg-orange-200'
                                                            }`}
                                                    >
                                                        {copiedWelcome ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {welcomeCoupon.type === 'percentage'
                                                        ? `${welcomeCoupon.value}% de descuento`
                                                        : `₡${welcomeCoupon.value?.toLocaleString()} de descuento`
                                                    }
                                                    {welcomeCoupon.description && ` • ${welcomeCoupon.description}`}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleApplyWelcomeCoupon}
                                                className="px-4 py-2 bg-bikitchen-orange text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition-colors"
                                            >
                                                Usar ahora
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Cupones canjeados por el usuario (no Gift Cards) */}
                                {userCoupons.filter(c => !c.isGiftCard).length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                            <Gift size={16} className="text-purple-500" />
                                            Tus Recompensas Canjeadas
                                        </p>
                                        <div className="grid gap-3">
                                            {userCoupons.filter(c => !c.isGiftCard).map((coupon) => (
                                                <motion.div
                                                    key={coupon.id}
                                                    layout
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between group"
                                                >
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono font-bold text-purple-700">
                                                                {coupon.code}
                                                            </span>
                                                            <button
                                                                onClick={() => handleCopyCoupon(coupon)}
                                                                className={`p-1 rounded-md transition-colors ${copiedCouponId === coupon.id
                                                                        ? 'bg-green-100 text-green-600'
                                                                        : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                                                                    }`}
                                                            >
                                                                {copiedCouponId === coupon.id ? <Check size={12} /> : <Copy size={12} />}
                                                            </button>
                                                        </div>
                                                        <p className="text-xs text-purple-600 mt-0.5">
                                                            {coupon.description || 'Cupón de recompensa'}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setCouponCode(coupon.code);
                                                            handleApplyCoupon();
                                                        }}
                                                        className="px-3 py-1.5 bg-white text-purple-600 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        Aplicar
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Mis Gift Cards (NUEVA SECCIÓN) */}
                                {userCoupons.filter(c => c.isGiftCard).length > 0 && (
                                    <div className="space-y-3 pt-2">
                                        <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <Gift size={16} className="text-pink-500" />
                                            Mis Gift Cards
                                        </p>
                                        <div className="grid gap-4">
                                            {userCoupons.filter(c => c.isGiftCard).map((gc) => (
                                                <motion.div
                                                    key={gc.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="p-4 bg-gradient-to-br from-white to-pink-50/30 rounded-2xl border border-pink-100 shadow-sm overflow-hidden relative"
                                                >
                                                    {/* Status Badge */}
                                                    <div className="absolute top-3 right-3">
                                                        {gc.active ? (
                                                            <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-green-200">Activa</span>
                                                        ) : (
                                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-amber-200">Pendiente de Pago</span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-start gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                                                            <Gift size={24} className="text-pink-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-black text-gray-900 truncate pr-20">
                                                                ₡{gc.value?.toLocaleString()} - {gc.recipientName}
                                                            </p>
                                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                                Código: <span className="font-mono font-bold text-gray-700">{gc.code}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 flex gap-2">
                                                        {!gc.active ? (
                                                            <button
                                                                onClick={() => {
                                                                    const msg = `✨ *COORDINAR PAGO - GIFT CARD* ✨%0A%0A¡Hola BiKitchen! 👋 Quiero coordinar el pago de mi Gift Card pendiente.%0A%0A📋 *DETALLES:*%0A🔹 *Código:* \`${gc.code}\`%0A🔹 *Monto:* ₡${gc.value?.toLocaleString()}%0A%0A👤 *DE:* ${gc.senderName}%0A🎁 *PARA:* ${gc.recipientName}%0A%0A¿Me podrían indicar los pasos para pagar y activarla? ¡Gracias! 🍱`;
                                                                    window.open(getWhatsAppUrl(msg), '_blank');
                                                                }}
                                                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-bikitchen-orange text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all shadow-sm"
                                                            >
                                                                <Smartphone size={14} />
                                                                Coordinar Pago
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    const msg = `✨ *¡UN REGALO ESPECIAL PARA TI!* ✨%0A%0A¡Hola *${gc.recipientName}*! 👋%0A%0A*${gc.senderName}* te ha enviado una *Tarjeta de Regalo BiKitchen* de ₡${gc.value?.toLocaleString('es-CR')} para que disfrutes de comida saludable y deliciosa. 🥗🍱%0A%0A${gc.personalMessage ? `💬 *Mensaje de ${gc.senderName}:*%0A_"${gc.personalMessage}"_%0A%0A` : ''}🎫 *TU CÓDIGO DE CANJE:*%0A\`${gc.code}\`%0A%0A---%0A💡 *¿CÓMO USAR TU REGALO?*%0A1️⃣ Entra a *bikitchenfood.com*%0A2️⃣ Elige tus platos o packs favoritos.%0A3️⃣ Al pagar, ingresa tu código en la casilla de cupones.%0A%0A¡Esperamos que lo disfrutes muchísimo! ✨🥑`;
                                                                    window.open(`https://wa.me/?text=${msg}`, '_blank');
                                                                }}
                                                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#25D366] text-white rounded-xl text-xs font-bold hover:bg-[#128C7E] transition-all shadow-sm"
                                                            >
                                                                <MessageSquare size={14} />
                                                                Enviar Regalo
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleCopyCoupon(gc)}
                                                            className="px-3 py-2 bg-white text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                                                            title="Copiar Código"
                                                        >
                                                            {copiedCouponId === gc.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Cupón aplicado actualmente */}
                                {(appliedCoupon || couponSuccess) && (
                                    <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 rounded-lg">
                                                <Check size={18} className="text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-green-800">
                                                    Cupón activo: {(appliedCoupon || couponSuccess)?.code}
                                                </p>
                                                <p className="text-sm text-green-600">
                                                    {(appliedCoupon || couponSuccess)?.type === 'percentage'
                                                        ? `${(appliedCoupon || couponSuccess)?.value}% de descuento`
                                                        : `₡${(appliedCoupon || couponSuccess)?.value?.toLocaleString()} de descuento`
                                                    }
                                                </p>
                                            </div>
                                            <Link
                                                to="/packs"
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                                            >
                                                Hacer pedido
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {/* Input de cupón */}
                                <div>
                                    <p className="text-sm text-gray-600 mb-2">¿Tienes otro código?</p>
                                    <div className="flex gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                value={couponCode}
                                                onChange={(e) => {
                                                    setCouponCode(e.target.value.toUpperCase());
                                                    setCouponError('');
                                                }}
                                                onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                                                placeholder="Ingresa tu código"
                                                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-bikitchen-orange/20 focus:border-bikitchen-orange uppercase font-mono tracking-wider ${couponError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                                    }`}
                                            />
                                            {couponError && (
                                                <p className="text-red-500 text-xs mt-1">{couponError}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleApplyCoupon}
                                            disabled={validatingCoupon || !couponCode.trim()}
                                            className="px-5 py-3 bg-bikitchen-orange text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {validatingCoupon ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                'Aplicar'
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Tip */}
                                <p className="text-xs text-gray-400 text-center">
                                    💡 El descuento se aplicará automáticamente en tu próximo pedido
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Notificaciones */}
                    {currentUser && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-6"
                        >
                            <NotificationSettings />
                        </motion.div>
                    )}

                    {/* Secciones secundarias - Grid compacto */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100"
                    >
                        <h2 className="font-bold text-lg text-gray-900 mb-4">Más opciones</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {secondarySections.map((section, index) => {
                                const Icon = section.icon;
                                const Component = section.disabled ? 'div' : Link;
                                return (
                                    <Component
                                        key={section.title}
                                        to={section.disabled ? undefined : section.path}
                                        className={`flex flex-col items-center p-4 rounded-2xl bg-gray-50 transition-all text-center relative ${section.disabled
                                                ? 'opacity-60 cursor-not-allowed'
                                                : 'hover:bg-gray-100 group'
                                            }`}
                                    >
                                        {section.disabled && (
                                            <div className="absolute -top-1 -right-1 bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">
                                                Pronto
                                            </div>
                                        )}
                                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-3 ${!section.disabled && 'group-hover:scale-110'} transition-transform`}>
                                            <Icon size={24} className="text-white" />
                                        </div>
                                        <span className="font-semibold text-sm text-gray-900">
                                            {section.title}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-0.5">
                                            {section.description}
                                        </span>
                                    </Component>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Cerrar Sesión */}
                    {currentUser && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-8 text-center"
                        >
                            <button
                                onClick={() => setShowLogoutConfirm(true)}
                                className="inline-flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors px-6 py-3 rounded-xl hover:bg-red-50"
                            >
                                <LogOut size={20} />
                                Cerrar Sesión
                            </button>
                        </motion.div>
                    )}
                </main>

                {/* Modal de confirmación de logout */}
                <AnimatePresence>
                    {showLogoutConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                            onClick={() => setShowLogoutConfirm(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                                    <LogOut size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                                    ¿Cerrar sesión?
                                </h3>
                                <p className="text-gray-600 mb-6 text-center">
                                    Tendrás que volver a iniciar sesión para acceder a tu cuenta.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowLogoutConfirm(false)}
                                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleLogout}
                                        className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
                                    >
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <Footer />
            </div>
        </PageTransition>
    );
}
