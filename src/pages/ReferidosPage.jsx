import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEOHead, { SEO_CONFIG, getBreadcrumbSchema } from '../components/SEOHead';
import PageTransition from '../components/PageTransition';
import BackButton from '../components/BackButton';
import { 
    Gift, Users, Copy, Check, Share2, MessageCircle, 
    ArrowRight, Sparkles, Heart, DollarSign, Trophy,
    Instagram, Facebook, Mail, ChevronDown, Save, AlertCircle, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import { PUNTOS_REFERIDO } from '../config/loyalty';

const REFERRAL_REWARD_POINTS = PUNTOS_REFERIDO;
const FRIEND_DISCOUNT = 5000;         // ₡5,000 para el amigo (Cupón directo)
const MIN_PURCHASE = 50000;           // Compra mínima del amigo

export default function ReferidosPage() {
    const { currentUser } = useAuth() || {};
    const [referralCode, setReferralCode] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [copied, setCopied] = useState(false);
    const [generated, setGenerated] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showHowItWorks, setShowHowItWorks] = useState(false);

    // Cargar código existente si hay uno
    React.useEffect(() => {
        const loadExistingCode = async () => {
            if (!currentUser) return;
            try {
                const q = query(collection(db, 'referral_codes'), where('uid', '==', currentUser.uid));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const data = querySnapshot.docs[0].data();
                    setReferralCode(data.code);
                    setName(data.name || '');
                    setPhone(data.phone || '');
                    setGenerated(true);
                }
            } catch (error) {
                console.error('Error loading referral code:', error);
            }
        };
        loadExistingCode();
    }, [currentUser]);

    const generateCode = async () => {
        if (!name.trim() || !phone.trim() || !currentUser) return;
        setLoading(true);
        
        try {
            // Generar código único basado en nombre y timestamp
            const nameCode = name.trim().split(' ')[0].toUpperCase().slice(0, 4);
            const randomNum = Math.floor(1000 + Math.random() * 9000);
            const code = `${nameCode}${randomNum}`;

            // Guardar en Firestore
            await setDoc(doc(db, 'referral_codes', code), {
                code,
                uid: currentUser.uid,
                name: name.trim(),
                phone: phone.trim(),
                createdAt: new Date().toISOString()
            });
            
            setReferralCode(code);
            setGenerated(true);
        } catch (error) {
            console.error('Error generating referral code:', error);
            alert('Hubo un error al generar tu código. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareWhatsApp = () => {
        const message = `¡Hola! 🍽️ Te invito a probar BiKitchen, comida saludable lista para calentar.\n\nUsa mi código *${referralCode}* y obtén ₡${FRIEND_DISCOUNT.toLocaleString('es-CR')} de descuento en tu primer pedido (Compra mín. ₡${MIN_PURCHASE.toLocaleString('es-CR')}).\n\n👉 https://bikitchenfood.com`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareInstagram = () => {
        const message = `¡Prueba BiKitchen con mi código ${referralCode} y obtén ₡${FRIEND_DISCOUNT.toLocaleString('es-CR')} de descuento! 🍽️`;
        navigator.clipboard.writeText(message);
        alert('Texto copiado. Ahora puedes pegarlo en Instagram.');
    };

    const shareFacebook = () => {
        const url = encodeURIComponent('https://bikitchenfood.com');
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
    };

    const shareEmail = () => {
        const subject = `¡Te regalo ₡${FRIEND_DISCOUNT.toLocaleString('es-CR')} en BiKitchen!`;
        const body = `¡Hola!\n\nQuiero compartirte BiKitchen, un servicio de comida saludable que me encanta.\n\nUsa mi código ${referralCode} y obtén ₡${FRIEND_DISCOUNT.toLocaleString('es-CR')} de descuento en tu primer pedido.\n\nVisita: https://bikitchenfood.com\n\n¡Saludos!`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    };

    const steps = [
        {
            icon: Gift,
            title: 'Genera tu código',
            description: 'Crea tu código de referido único y personalizado'
        },
        {
            icon: Share2,
            title: 'Comparte con amigos',
            description: 'Envía tu código por WhatsApp, redes sociales o email'
        },
        {
            icon: Users,
            title: 'Tu amigo hace su pedido',
            description: `Tu amigo obtiene ₡${FRIEND_DISCOUNT.toLocaleString('es-CR')} de descuento en su primer pedido`
        },
        {
            icon: DollarSign,
            title: '¡Ambos ganan!',
            description: `Tú recibes ${REFERRAL_REWARD_POINTS.toLocaleString('es-CR')} BiPuntos para tu próximo canje`
        }
    ];

    return (
        <PageTransition>
            <SEOHead
                {...SEO_CONFIG.referidos}
                structuredData={getBreadcrumbSchema([{ name: 'Programa de Referidos', url: 'https://bikitchencr.com/referidos' }])}
            />
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero Section */}
                <section className="relative pt-32 pb-16 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl" aria-hidden="true"></div>
                    <div className="absolute bottom-0 left-10 w-64 h-64 bg-pink-500/15 rounded-full blur-3xl" aria-hidden="true"></div>
                    
                    <div className="container relative z-10">
                        <BackButton className="mb-6" />
                        
                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ type: "spring", delay: 0.1 }}
                                className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                            >
                                <Gift size={40} className="text-white" />
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                            >
                                Invita y <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">Gana</span>
                            </motion.h1>
                            
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-xl text-gray-600 mb-8"
                            >
                                Comparte BiKitchen con tus amigos y ambos obtienen 
                                <span className="font-bold text-purple-600"> recompensas exclusivas</span>
                            </motion.p>

                            {/* Reward Cards */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-col sm:flex-row gap-4 justify-center mb-8"
                            >
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100 flex-1 max-w-xs">
                                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <Heart size={24} className="text-purple-600" />
                                    </div>
                                    <p className="text-3xl font-bold text-purple-600 mb-1">
                                        ₡{FRIEND_DISCOUNT.toLocaleString('es-CR')}
                                    </p>
                                    <p className="text-sm text-gray-600 leading-tight">
                                        De descuento para tu amigo en su primer pedido
                                    </p>
                                </div>
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-pink-100 flex-1 max-w-xs">
                                    <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                        <Trophy size={24} className="text-pink-600" />
                                    </div>
                                    <p className="text-3xl font-bold text-pink-600 mb-1">
                                        {REFERRAL_REWARD_POINTS} BiPts
                                    </p>
                                    <p className="text-sm text-gray-600 leading-tight">
                                        Para ti cuando tu amigo complete su compra
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Generator Section */}
                <section className="py-12">
                    <div className="container">
                        <div className="max-w-xl mx-auto">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100"
                            >
                                {!generated ? (
                                    <>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                                            Genera tu código de referido
                                        </h2>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Tu nombre
                                                </label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Ej: María González"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Tu teléfono (para recibir tu crédito)
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={phone}
                                                    onChange={(e) => setPhone(e.target.value)}
                                                    placeholder="Ej: 8888-8888"
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                                />
                                            </div>
                                            <button
                                                onClick={generateCode}
                                                disabled={!name.trim() || !phone.trim() || loading || !currentUser}
                                                className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {loading ? (
                                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                ) : (
                                                    <>
                                                        <Sparkles size={20} />
                                                        Generar Mi Código
                                                    </>
                                                )}
                                            </button>
                                            {!currentUser && (
                                                <p className="text-xs text-center text-red-500 mt-2 flex items-center justify-center gap-1">
                                                    <AlertCircle size={12} />
                                                    Debes iniciar sesión para generar un código.
                                                </p>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center mb-6">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Check size={32} className="text-green-600" />
                                            </div>
                                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                                ¡Tu código está listo!
                                            </h2>
                                            <p className="text-gray-600">
                                                Compártelo con tus amigos y empieza a ganar
                                            </p>
                                        </div>

                                        {/* Code Display */}
                                        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl p-6 mb-6">
                                            <p className="text-sm text-gray-500 mb-2 text-center">Tu código de referido:</p>
                                            <div className="flex items-center justify-center gap-3">
                                                <span className="text-3xl md:text-4xl font-mono font-bold text-purple-600 tracking-wider">
                                                    {referralCode}
                                                </span>
                                                <button
                                                    onClick={copyCode}
                                                    className={`p-3 rounded-xl transition-all ${
                                                        copied 
                                                            ? 'bg-green-500 text-white' 
                                                            : 'bg-white text-gray-600 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {copied ? <Check size={20} /> : <Copy size={20} />}
                                                </button>
                                            </div>
                                            {copied && (
                                                <p className="text-green-600 text-sm text-center mt-2">
                                                    ¡Código copiado!
                                                </p>
                                            )}
                                        </div>

                                        {/* Share Buttons */}
                                        <div className="space-y-3">
                                            <p className="text-sm font-medium text-gray-700 text-center">
                                                Compartir por:
                                            </p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={shareWhatsApp}
                                                    className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
                                                >
                                                    <MessageCircle size={20} />
                                                    WhatsApp
                                                </button>
                                                <button
                                                    onClick={shareInstagram}
                                                    className="flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:from-purple-600 hover:to-pink-600 transition-colors"
                                                >
                                                    <Instagram size={20} />
                                                    Instagram
                                                </button>
                                                <button
                                                    onClick={shareFacebook}
                                                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                                                >
                                                    <Facebook size={20} />
                                                    Facebook
                                                </button>
                                                <button
                                                    onClick={shareEmail}
                                                    className="flex items-center justify-center gap-2 py-3 bg-gray-600 text-white rounded-xl font-medium hover transition-colors"
                                                >
                                                    <Mail size={20} />
                                                    Email
                                                </button>
                                            </div>
                                        </div>

                                        {/* Generate New */}
                                        <button
                                            onClick={() => {
                                                setGenerated(false);
                                                setReferralCode('');
                                            }}
                                            className="w-full mt-4 py-2 text-gray-500 text-sm hover:text-gray-700:text-gray-200"
                                        >
                                            Generar otro código
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* How it Works */}
                <section className="py-12 bg-gray-50">
                    <div className="container">
                        <div className="max-w-4xl mx-auto">
                            <button
                                onClick={() => setShowHowItWorks(!showHowItWorks)}
                                className="w-full flex items-center justify-between p-4 bg-white rounded-xl shadow-md mb-6"
                            >
                                <span className="font-bold text-gray-900 flex items-center gap-2">
                                    <Sparkles className="text-purple-500" size={20} />
                                    ¿Cómo funciona?
                                </span>
                                <ChevronDown 
                                    size={20} 
                                    className={`text-gray-500 transition-transform ${showHowItWorks ? 'rotate-180' : ''}`} 
                                />
                            </button>

                            {showHowItWorks && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="grid md:grid-cols-4 gap-6"
                                >
                                    {steps.map((step, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="bg-white rounded-xl p-6 text-center relative"
                                        >
                                            {index < steps.length - 1 && (
                                                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                                                    <ArrowRight size={20} className="text-gray-300" />
                                                </div>
                                            )}
                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-white">
                                                <step.icon size={24} />
                                            </div>
                                            <div className="text-xs text-purple-600 font-bold mb-2">
                                                PASO {index + 1}
                                            </div>
                                            <h3 className="font-bold text-gray-900 mb-2">
                                                {step.title}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {step.description}
                                            </p>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Terms */}
                <section className="py-12">
                    <div className="container">
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Gift size={20} className="text-purple-600" />
                                    Términos del programa
                                </h3>
                                <ul className="space-y-2 text-sm text-gray-600">
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                        El descuento de ₡{FRIEND_DISCOUNT.toLocaleString('es-CR')} aplica solo para el primer pedido de tu amigo (Monto mín. ₡{MIN_PURCHASE.toLocaleString('es-CR')}).
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                        Recibirás **{REFERRAL_REWARD_POINTS.toLocaleString('es-CR')} BiPuntos** una vez que tu amigo complete su primer pedido verificado.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                        Los puntos se acreditan directamente a tu monedero de BiKitchen Rewards.
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                        No hay límite de amigos que puedes referir. ¡Invita a todos!
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                                        El código debe ser ingresado al momento de hacer el pedido.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="py-12">
                    <div className="container">
                        <div className="max-w-3xl mx-auto text-center">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">
                                ¿Aún no has probado BiKitchen?
                            </h2>
                            <p className="text-gray-600 mb-6">
                                Descubre por qué cientos de personas ya disfrutan de comida saludable sin cocinar
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link
                                    to="/packs"
                                    className="inline-flex items-center justify-center gap-2 bg-bikitchen-orange text-white px-8 py-4 rounded-xl font-bold hover:bg-bikitchen-orange-dark transition-colors"
                                >
                                    Ver Nuestros Packs
                                    <ArrowRight size={20} />
                                </Link>
                                <Link
                                    to="/como-funciona"
                                    className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors border border-gray-200"
                                >
                                    Cómo Funciona
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                <Footer />
            </div>
        </PageTransition>
    );
}
