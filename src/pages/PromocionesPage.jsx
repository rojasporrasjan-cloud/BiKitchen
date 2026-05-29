import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { usePromoBanner } from '../hooks/usePromoBanner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { Gift, Calendar, Truck, Check, Clock, Users, Heart, Sparkles, ChevronRight, RefreshCw, ShoppingCart, X, Filter, Camera, Utensils, Star, MessageCircle, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActivePromotions } from '../utils/firestorePromotions';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import toast from 'react-hot-toast';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { trackViewContent } from '../services/facebookPixel';
import MenuDetailsModal from '../components/menus/MenuDetailsModal';
import PromoMenuModal from '../components/menus/PromoMenuModal';
import { PACK_TO_MENU_KEY } from '../data/packsData';
import SEOHead, { SEO_CONFIG, getBreadcrumbSchema } from '../components/SEOHead';
import useIsMobile from '../hooks/useIsMobile';
import { formatPrice } from '../utils/formatters';
import UrgencyBanner from '../components/UrgencyBanner';

// Utilidad para optimización de imágenes (WebP)
const optimizeToWebp = (file, maxSize = 1200) => new Promise((resolve, reject) => {
    try {
        const imgEl = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            imgEl.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const w = imgEl.naturalWidth || imgEl.width;
                const h = imgEl.naturalHeight || imgEl.height;
                const scale = Math.min(1, maxSize / Math.max(w, h));
                const nw = Math.max(1, Math.round(w * scale));
                const nh = Math.max(1, Math.round(h * scale));
                canvas.width = nw; canvas.height = nh;
                ctx.drawImage(imgEl, 0, 0, nw, nh);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob); else reject(new Error('No blob'));
                }, 'image/webp', 0.8);
            };
            imgEl.onerror = reject;
            imgEl.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    } catch (err) { reject(err); }
});

// IMPORTANTE: NO usar datos hardcodeados - SIEMPRE cargar desde Firebase
// Si Firebase falla, mostrar mensaje de error en lugar de datos antiguos

const PromoCard = ({ promo, onClick, onAddToCart, customImage, onUploadImage, isAdmin }) => {
    const [addedToCart, setAddedToCart] = useState(false);
    const isActive = !promo.fechaFin || new Date(promo.fechaFin) >= new Date();
    const isChristmas = promo.titulo.toLowerCase().includes('menú navideño');
    const displayImage = customImage || promo.imagen;

    const handleCameraClick = (e) => {
        e.stopPropagation();
        if (onUploadImage) {
            onUploadImage(promo);
        }
    };

    // Calcular precios y descuento para el cuadro de oferta
    const pPromo = promo.precio || (promo.detalles?.packs?.[0]?.precio);
    const pRegular = promo.precioRegular || (promo.detalles?.packs?.[0]?.precioRegular);
    const hasSpecialPrice = pPromo > 0 && pRegular > 0;
    const percentOff = hasSpecialPrice ? Math.round((1 - pPromo / pRegular) * 100) : 0;

    const handleAddToCartClick = (e) => {
        e.stopPropagation();
        if (promo.detalles?.packs && promo.detalles.packs.length > 0) {
            onClick(promo);
        } else if (onAddToCart) {
            onAddToCart(promo);
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="relative group cursor-pointer hover:-translate-y-4 transition-transform duration-300"
            onClick={() => onClick(promo)}
        >
            {/* Animated glow effect */}
            <div
                className="absolute -inset-6 bg-gradient-to-br from-orange-400/30 via-amber-400/30 to-orange-500/30 rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                aria-hidden="true"
            />

            {/* Card container */}
            <div className="relative bg-white rounded-[2.5rem] overflow-hidden h-full flex flex-col border border-slate-100 shadow-xl shadow-slate-200/50 transition-all duration-500 group-hover:border-orange-500/30 group-hover:shadow-2xl">
                {/* Border accent delicate */}
                <div className="absolute inset-0 rounded-[2.5rem] p-[1.5px] bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />

                {/* Hover animated border luxury */}
                <div
                    className="absolute inset-0 rounded-[2.5rem] p-[2px] bg-gradient-to-br from-orange-400 via-amber-200 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    aria-hidden="true"
                >
                    <div className="absolute inset-[2px] rounded-[2.5rem] bg-white/40" />
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col h-full">
                    {/* Imagen */}
                    <div className="relative h-56 overflow-hidden">
                        <img
                            src={displayImage}
                            alt={promo.titulo}
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                            onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                            }}
                        />

                        {/* Shine effect */}
                        <div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                            aria-hidden="true"
                        />

                        {/* Botón de cámara para admin */}
                        {isAdmin && (
                            <button
                                onClick={handleCameraClick}
                                className="absolute top-4 right-4 z-20 bg-white/95 p-2.5 rounded-xl shadow-xl border border-gray-200 hover:scale-110 hover:bg-white active:scale-90 transition-all duration-200"
                                title="Cambiar imagen"
                            >
                                <Camera size={18} className="text-gray-700" />
                            </button>
                        )}

                        {/* Sello de promoción activa */}
                        {isActive && !isAdmin && (
                            <motion.div
                                className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xl"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, duration: 0.5, type: "spring" }}

                            >
                                <Gift size={16} />
                                {isChristmas ? 'Menú Navideño' : 'Activa'}
                            </motion.div>
                        )}

                        {/* Badge destacada */}
                        {promo.destacada && (
                            <motion.div
                                className="absolute top-4 left-4 bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-2 shadow-xl"
                                initial={{ scale: 0, rotate: 180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.3, duration: 0.5, type: "spring" }}

                            >
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                >
                                    <Sparkles size={16} />
                                </motion.div>
                                Destacada
                            </motion.div>
                        )}

                        {/* Overlay gradient */}
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-white/40 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                            aria-hidden="true"
                        />
                    </div>

                    {/* Contenido */}
                    <div className="p-7 flex flex-col flex-1 bg-white">
                        <h3 className="text-2xl font-black text-slate-900 mb-3 leading-tight">
                            {promo.titulo}
                        </h3>
                        <p className="text-slate-500 text-sm mb-5 line-clamp-2 leading-relaxed font-medium">
                            {promo.descripcion}
                        </p>


                        {/* Fecha de vigencia */}
                        {promo.fechaFin && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 mb-5 font-bold">
                                <Clock size={16} className="text-orange-500" />
                                <span>Válido hasta {new Date(promo.fechaFin).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' })}</span>
                            </div>
                        )}

                        {/* Beneficios preview */}
                        {promo.detalles?.beneficios && (
                            <div className="space-y-1 mb-4">
                                {promo.detalles.beneficios.slice(0, 2).map((beneficio, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                        <Check size={12} className="text-orange-500 flex-shrink-0" />
                                        <span>{beneficio}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-2 mt-auto">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick(promo);
                                }}
                                className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-slate-100"
                            >
                                <Filter size={18} />
                                Detalles
                            </button>
                            <button
                                onClick={handleAddToCartClick}
                                className={`flex-[1.5] font-black py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-[1.02] shadow-xl ${addedToCart
                                    ? 'bg-green-500 text-white'
                                    : 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-500/20 hover:scale-[1.02]'
                                    }`}
                            >
                                {addedToCart ? (
                                    <>
                                        <Check size={18} />
                                        ¡Agregado!
                                    </>
                                ) : (
                                    <>
                                        {promo.detalles?.packs && promo.detalles.packs.length > 0 ? (
                                            <>
                                                Opciones
                                                <ChevronRight size={18} />
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart size={18} />
                                                Agregar
                                            </>
                                        )}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// Modal de detalle
function PromoDetail({ promo, onClose, addToCart, onPackClick }) {
    const { getWhatsAppUrl } = useWhatsApp();
    const [selectedPack, setSelectedPack] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const [activeTab, setActiveTab] = useState('pack'); // 'pack' o 'desayuno'

    // Detectar si es promoción con desayunos gratis
    const esDesayunosGratis = promo.titulo && promo.titulo.includes('Desayunos Gratis');

    // Scroll lock + ESC
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const onEsc = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onEsc);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onEsc);
        };
    }, [onClose]);

    if (!promo) return null;

    const mensajeWhatsApp = `Quiero más información sobre ${promo.titulo}`;
    const whatsappUrl = getWhatsAppUrl(mensajeWhatsApp);

    const handleAddToCart = () => {
        if (promo.detalles?.packs && promo.detalles.packs.length > 0 && !selectedPack) {
            toast.error('Por favor selecciona un pack');
            return;
        }

        // Determinar si es promoción con desayunos gratis o con 50% descuento envío
        const esDesayunosGratis = promo.titulo && promo.titulo.includes('Desayunos Gratis');
        const es50DescuentoEnvio = promo.titulo && promo.titulo.includes('50%') && promo.titulo.includes('descuento');
        const esTwoPack = promo.titulo && promo.titulo.includes('Two Pack');

        const cartItemId = esTwoPack
            ? `promo-${promo.id}-two_pack${selectedPack ? `-${selectedPack.nombre}` : ''}`
            : `promo-${promo.id}${selectedPack ? `-${selectedPack.nombre}` : ''}`;

        const cartItem = {
            id: cartItemId,
            name: selectedPack ? `${promo.titulo} - ${selectedPack.nombre}` : promo.titulo,
            price: selectedPack?.precio || promo.precio || promo.precioEspecial || promo.detalles?.packs?.[0]?.precio || promo.precios?.[0]?.precio || promo.precioRegular || 0,
            isPromo: true,
            promoId: promo.id,
            promoTitle: promo.titulo,
            benefits: promo.detalles?.beneficios || [],
            image: promo.imagen,
            // Agregar propiedades para detectar descuentos de envío
            plan: 'monthly',
            planLabel: esDesayunosGratis ? 'Promo Desayunos Gratis' : (esTwoPack ? 'Two Pack' : (es50DescuentoEnvio ? 'Promo 50% Envío' : 'Promoción Mensual'))
        };

        if (addToCart && typeof addToCart === 'function') {
            addToCart(cartItem);
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
        }
    };

    const updateQuantity = (val) => {
        setQuantity(Math.max(1, Math.min(10, quantity + val)));
    };

    return ReactDOM.createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[9998] flex justify-end">

                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/65"
                />

                {/* Side Panel */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full md:w-[52%] lg:w-[46%] xl:w-[40%] h-full bg-white shadow-2xl flex flex-col overflow-hidden"
                >
                    {/* Hero image */}
                    <div className="relative h-[180px] sm:h-[240px] shrink-0 overflow-hidden bg-slate-100">
                        <img
                            src={promo.imagen}
                            alt={promo.titulo}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 left-4 w-10 h-10 bg-white/25 hover:bg-white/40 rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 border border-white/30"
                        >
                            <ArrowLeft size={20} />
                        </button>

                        {/* Active badge */}
                        <div className="absolute top-4 right-4">
                            <span className="bg-orange-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-xl">
                                <Gift size={12} />Oferta Activa
                            </span>
                        </div>


                        {/* Title overlay */}
                        <div className="absolute bottom-4 left-4 right-4">
                            {promo.fechaFin && (
                                <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">
                                    Válido hasta {new Date(promo.fechaFin).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' })}
                                </p>
                            )}
                            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-lg">
                                {(promo.titulo || '').toString().replace(/^o\s+/i, '').trim()}
                            </h2>
                        </div>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto side-panel-scrollbar">
                        <div className="p-5 sm:p-6 space-y-6">

                            {/* Precio especial */}
                            {promo.precio && promo.precio > 0 && (
                                <div className="inline-flex items-center gap-3 bg-slate-50 border border-slate-100 text-slate-900 px-4 py-2.5 rounded-2xl">
                                    <span className="text-[9px] font-black text-orange-500 uppercase tracking-widest">Precio Especial</span>
                                    <span className="text-xl font-black tracking-tighter">{formatPrice(promo.precio)}</span>
                                </div>
                            )}

                            {/* Descripción */}
                            <p className="text-slate-500 text-sm leading-relaxed font-medium border-l-2 border-orange-500 pl-4 py-1">
                                {(promo.descripcion || '').toString().replace(/^o\s+/i, '').trim()}
                            </p>







                            {/* Pestañas para Desayunos Gratis - NUEVO */}
                            {esDesayunosGratis && (
                                <motion.div
                                    className="mb-6"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.35, duration: 0.4 }}
                                >
                                    <div className="flex items-center bg-slate-100 rounded-2xl p-1 border border-slate-200">
                                        <button
                                            onClick={() => setActiveTab('pack')}
                                            className={`flex-1 py-3 px-6 rounded-xl font-black transition-all duration-300 ${activeTab === 'pack'
                                                ? 'bg-white text-slate-900 shadow-md'
                                                : 'bg-transparent text-slate-400 hover:text-slate-600'
                                                }`}
                                        >
                                            🍽️ Pack Mensual
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('desayuno')}
                                            className={`flex-1 py-3 px-6 rounded-xl font-black transition-all duration-300 ${activeTab === 'desayuno'
                                                ? 'bg-white text-slate-900 shadow-md'
                                                : 'bg-transparent text-slate-400 hover:text-slate-600'
                                                }`}
                                        >
                                            ☕ Desayuno Gratis
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Composición del Plato - PREMIUM REDESIGN */}
                            {promo.composicionPlato && (
                                <motion.div
                                    className="mb-8 relative"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.35, duration: 0.4 }}
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
                                                <Utensils size={20} />
                                            </div>
                                            Tu Plato BiKitchen
                                        </h3>
                                        <span className="text-[10px] font-bold text-slate-300 tracking-[0.2em] uppercase">Porción Diaria</span>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        {[
                                            { label: 'Proteína', value: `${promo.composicionPlato.proteinas}g`, icon: '🥩', color: 'orange', active: promo.composicionPlato.proteinas > 0 },
                                            { label: 'Vegetales', value: promo.composicionPlato.vegetales, icon: '🥗', color: 'emerald', active: promo.composicionPlato.vegetales > 0 },
                                            { label: 'Carbos', value: promo.composicionPlato.carbohidrato === 0 ? 'Sin' : promo.composicionPlato.carbohidrato, icon: promo.composicionPlato.carbohidrato === 0 ? '🚫' : '🍚', color: 'amber', active: promo.composicionPlato.carbohidrato !== undefined }
                                        ].filter(item => item.active).map((item, idx) => (
                                            <motion.div
                                                key={idx}
                                                className="relative group h-full hover:-translate-y-1 transition-transform duration-200"
                                            >
                                                <div className="relative bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center h-full transition-all duration-300 group-hover:border-orange-200 group-hover:bg-white shadow-sm">
                                                    <div className="text-2xl mb-3 flex items-center justify-center w-12 h-12 rounded-full bg-white border border-slate-100 shadow-sm">
                                                        {item.icon}
                                                    </div>
                                                    <div className={`text-xl font-black text-slate-900 mb-0.5`}>{item.value}</div>
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{item.label}</div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {/* Contenido de la pestaña DESAYUNO */}
                            {esDesayunosGratis && activeTab === 'desayuno' && (
                                <motion.div
                                    className="mb-8 bg-slate-50 rounded-3xl p-6 border border-slate-100"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4, duration: 0.4 }}
                                >
                                    <h3 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-3">
                                        <span className="text-3xl">☕</span> Desayuno Gratis Incluido
                                    </h3>
                                    <div className="bg-white rounded-xl p-5 border border-amber-200">
                                        <h4 className="font-black text-slate-900 mb-3 flex items-center gap-2">
                                            <span className="text-xl">🍳</span> Menú de Desayunos
                                        </h4>
                                        <ul className="space-y-2 text-slate-600 font-medium">
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-500 font-black">•</span>
                                                <span>Gallo pinto con huevos revueltos y queso fresco</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-500 font-black">•</span>
                                                <span>Tostadas francesas con miel y frutas frescas</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-500 font-black">•</span>
                                                <span>Pastel de tortilla con frijol y queso</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-500 font-black">•</span>
                                                <span>Flautas de queso con salsa ranchera</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-orange-500 font-black">•</span>
                                                <span>Gallo pinto con huevo y jamón</span>
                                            </li>
                                        </ul>
                                    </div>
                                </motion.div>
                            )}

                            {/* Contenido de la pestaña PACK - Solo mostrar si NO es desayunos gratis O si la pestaña activa es 'pack' */}
                            {(!esDesayunosGratis || activeTab === 'pack') && (
                                <>
                                    {/* Packs Incluidos - PREMIUM CHIPS */}
                                    {promo.packsRelacionados && promo.packsRelacionados.length > 0 && (
                                        <motion.div
                                            className="mb-8 relative rounded-[2rem] overflow-hidden group"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4, duration: 0.4 }}
                                        >
                                            <div className="relative bg-slate-50 rounded-[2rem] p-7 border border-slate-100 group-hover:border-orange-200 transition-all duration-500 shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg">
                                                            <Star size={18} className="fill-current" />
                                                        </div>
                                                        Packs Disponibles
                                                    </h3>
                                                    <span className="text-[9px] font-black text-orange-500/50 uppercase tracking-[0.2em]">Especiales</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2.5">
                                                    {promo.packsRelacionados.map((pack, idx) => (
                                                        <motion.button
                                                            key={idx}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (onPackClick) {
                                                                    let promoPrice = 0;
                                                                    const normalizedPack = pack.toLowerCase();
                                                                    if (promo.precios && Array.isArray(promo.precios)) {
                                                                        const packPrice = promo.precios.find(p => p.nombre.toLowerCase() === normalizedPack || p.nombre.toLowerCase().includes(normalizedPack));
                                                                        promoPrice = packPrice?.precio || 0;
                                                                    } else if (promo.detalles?.packs) {
                                                                        const packDetail = promo.detalles.packs.find(p => p.nombre.toLowerCase() === normalizedPack || p.nombre.toLowerCase().includes(normalizedPack));
                                                                        promoPrice = packDetail?.precio || 0;
                                                                    } else { promoPrice = promo.precio || 0; }
                                                                    onPackClick(pack, promoPrice, promo.imagen || '', promo);
                                                                }
                                                            }}
                                                            className="px-5 py-2.5 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-orange-500 hover:text-white hover:border-orange-400 hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
                                                        >
                                                            {pack}
                                                        </motion.button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Precios de packs - PREMIUM SELECTION GRID */}
                                    {promo.detalles?.packs && promo.detalles.packs.length > 0 && (
                                        <motion.div
                                            className="mb-10"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.45, duration: 0.4 }}
                                        >
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
                                                <h3 className="text-xl font-black text-slate-900">Selecciona tu Pack</h3>
                                            </div>

                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                {promo.detalles.packs.map((pack, idx) => (
                                                    <motion.button
                                                        key={idx}
                                                        onClick={() => setSelectedPack(pack)}
                                                        className={`relative group rounded-[2rem] p-6 text-center transition-all duration-300 border overflow-hidden hover:-translate-y-1.5 active:scale-[0.98] ${selectedPack?.nombre === pack.nombre
                                                            ? 'border-orange-500 bg-orange-50 shadow-md'
                                                            : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                                                            }`}
                                                    >
                                                        <span className={`text-[10px] uppercase tracking-[0.25em] font-black mb-3 transition-colors ${selectedPack?.nombre === pack.nombre ? 'text-orange-600' : 'text-slate-500'}`}>
                                                            {pack.nombre}
                                                        </span>

                                                        <div className="flex flex-col items-center">
                                                            {pack.precioRegular > pack.precio && (
                                                                <span className="text-xs text-slate-400 line-through mb-1 font-bold">
                                                                    {formatPrice(pack.precioRegular)}
                                                                </span>
                                                            )}
                                                            <span className="text-2xl font-black text-slate-900 tracking-tighter">
                                                                {formatPrice(pack.precio || 0)}
                                                            </span>
                                                        </div>


                                                        {/* Selection indicator */}
                                                        <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${selectedPack?.nombre === pack.nombre ? 'bg-orange-500 border-orange-500 scale-110' : 'border-slate-200'}`}>
                                                            {selectedPack?.nombre === pack.nombre && <Check size={12} className="text-white font-black" />}
                                                        </div>
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Selector de Cantidad - REFINED 3-COLUMN GRID */}
                                    {selectedPack && (
                                        <motion.div
                                            className="mb-12 bg-slate-50 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 relative shadow-sm"
                                            initial={{ scale: 0.95, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.4 }}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 px-2 md:px-6">
                                                {/* Col 1: Label */}
                                                <div className="flex flex-col items-center md:items-start gap-1">
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Configuración</span>
                                                    <span className="text-sm font-black text-slate-900 uppercase tracking-widest text-center md:text-left">¿Cuántos Packs?</span>
                                                </div>

                                                {/* Col 2: Stepper */}
                                                <div className="flex items-center justify-center gap-6">
                                                    <button
                                                        onClick={() => updateQuantity(-1)}
                                                        className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-black text-2xl hover:bg-orange-500 hover:text-white hover:border-orange-400 hover:scale-105 active:scale-90 transition-all duration-200 shadow-sm"
                                                    >
                                                        -
                                                    </button>
                                                    <div className="relative min-w-[3rem] text-center">
                                                        <span className="font-black text-3xl md:text-4xl text-slate-900">{quantity}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => updateQuantity(1)}
                                                        className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-black text-2xl hover:bg-orange-500 hover:text-white hover:border-orange-400 hover:scale-105 active:scale-90 transition-all duration-200 shadow-sm"
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Col 3: Price */}
                                                <div className="text-center md:text-right flex flex-col md:min-w-[150px]">
                                                    <span className="text-[10px] text-orange-500/70 block font-black uppercase tracking-[0.3em] mb-1">Total</span>
                                                    <span className="font-black text-3xl md:text-4xl text-slate-900 tracking-tighter whitespace-nowrap">
                                                        {formatPrice((selectedPack.precio || 0) * quantity)}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Menú del pack seleccionado - PREMIUM LIST */}
                                    {selectedPack?.menu && selectedPack.menu.length > 0 && (
                                        <motion.div
                                            className="mb-10"
                                            initial={{ scale: 0.95, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-1.5 h-6 bg-orange-500 rounded-full shadow-sm" />
                                                <h3 className="text-xl font-black text-slate-900 px-1">Menú del Pack</h3>
                                            </div>

                                            <div className="grid gap-3">
                                                {selectedPack.menu.map((item, idx) => (
                                                    <motion.div
                                                        key={`menu-item-${idx}`}
                                                        className="flex items-center gap-4 bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 shadow-sm hover:bg-white hover:translate-x-1.5 transition-all duration-200"
                                                        initial={{ x: -10, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                    >
                                                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 border border-orange-200">
                                                            <Check size={16} className="text-orange-500" />
                                                        </div>
                                                        <span className="font-bold text-sm text-slate-700">{item}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Beneficios - PREMIUM BADGES */}
                                    {promo.beneficios && promo.beneficios.length > 0 && (
                                        <motion.div
                                            className="mb-8"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5, duration: 0.4 }}
                                        >
                                            <div className="flex items-center gap-3 mb-6">
                                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-sm" />
                                                <h3 className="text-xl font-black text-slate-900 px-1">Beneficios VIP</h3>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-3">
                                                {promo.beneficios.map((beneficio, idx) => (
                                                    <motion.div
                                                        key={`benefit-${idx}`}
                                                        className="flex gap-4 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm hover:scale-[1.02] transition-transform duration-200"
                                                        initial={{ x: -10, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: 0.5 + (idx * 0.05) }}
                                                    >
                                                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 text-emerald-600">
                                                            <Star size={20} className="fill-current" />
                                                        </div>
                                                        <span className="text-sm font-black text-emerald-900 leading-tight flex items-center">{beneficio}</span>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                </>
                            )}

                            {/* Spacer */}
                            <div className="h-4" />
                        </div>
                    </div>

                    {/* Sticky footer */}
                    <div
                        className="shrink-0 bg-white border-t border-slate-100 px-5 pt-4 shadow-[0_-12px_32px_rgba(0,0,0,0.08)]"
                        style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}
                    >
                        <div className="flex gap-3">
                            <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-4 px-4 rounded-2xl transition-all border border-slate-200 min-h-[56px]"
                            >
                                <MessageCircle size={20} className="text-orange-500" />
                            </a>
                            <button
                                onClick={handleAddToCart}
                                disabled={addedToCart}
                                className={`flex-1 py-4 px-5 rounded-2xl font-black shadow-xl transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider active:scale-95 ${
                                    addedToCart
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-900 hover:bg-orange-600 text-white'
                                }`}
                            >
                                {addedToCart ? (
                                    <>
                                        <Check size={18} strokeWidth={3} />
                                        Añadido
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={18} />
                                        {promo.detalles?.packs ? 'Confirmar Pack' : 'Añadir a Pedido'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>

            <style>{`
                .side-panel-scrollbar::-webkit-scrollbar { width: 3px; }
                .side-panel-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .side-panel-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            `}</style>
        </AnimatePresence>,
        document.body
    );
}

export default function PromocionesPage() {
    const { getWhatsAppUrl } = useWhatsApp();
    const { showPromoBanner } = usePromoBanner();
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [promociones, setPromociones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSticky, setIsSticky] = useState(false);
    const [imagenesCustom, setImagenesCustom] = useState({});
    const { addToCart } = useCart() || {};
    const { isAdmin } = useAuth();
    const isMobile = useIsMobile();

    // Estados para el modal de menú detallado
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [selectedMenuKey, setSelectedMenuKey] = useState(null);
    const [selectedPackName, setSelectedPackName] = useState('');
    const [selectedPromoPrice, setSelectedPromoPrice] = useState(0);
    const [selectedPromoImage, setSelectedPromoImage] = useState('');
    const [previousPromo, setPreviousPromo] = useState(null); // Guardar promoción anterior

    // Track ViewContent cuando se carga la página de promociones
    useEffect(() => {
        trackViewContent({
            id: 'promociones-page',
            name: 'Promociones',
            category: 'Promotions',
            price: 0
        });
    }, []);

    const handleAddToCart = (item) => {
        if (addToCart) {
            addToCart(item);
        }
    };

    const handleDirectAddToCart = (promo) => {
        // Determinar si es promoción con desayunos gratis o con 50% descuento envío
        const esDesayunosGratis = promo.titulo && promo.titulo.includes('Desayunos Gratis');
        const es50DescuentoEnvio = promo.titulo && promo.titulo.includes('50%') && promo.titulo.includes('descuento');
        const esTwoPack = promo.titulo && promo.titulo.includes('Two Pack');

        // Buscar el mejor precio disponible
        const price = promo.precio || promo.precioEspecial || promo.detalles?.packs?.[0]?.precio || promo.precios?.[0]?.precio || promo.precioRegular || 0;

        const cartItemId = esTwoPack ? `promo-${promo.id}-two_pack` : `promo-${promo.id}`;

        const cartItem = {
            id: cartItemId,
            name: promo.titulo,
            price: price,
            isPromo: true,
            promoId: promo.id,
            promoTitle: promo.titulo,
            benefits: promo.detalles?.beneficios || [],
            image: promo.imagen,
            plan: 'monthly',
            planLabel: esDesayunosGratis ? 'Promo Desayunos Gratis' : (esTwoPack ? 'Two Pack' : (es50DescuentoEnvio ? 'Promo 50% Envío' : 'Promoción Mensual'))
        };

        handleAddToCart(cartItem);
    };

    const handlePackClick = (packName, promoPrice = 0, promoImage = '', fullPromo = null) => {
        const menuKey = PACK_TO_MENU_KEY[packName];
        if (menuKey) {
            // Guardar la promoción actual antes de cerrarla
            setPreviousPromo(fullPromo || selectedPromo);

            // Cerrar el modal de promoción primero
            setSelectedPromo(null);

            // Esperar un momento y luego abrir el modal de menú
            setTimeout(() => {
                setSelectedMenuKey(menuKey);
                setSelectedPackName(packName);
                setSelectedPromoPrice(promoPrice);
                setSelectedPromoImage(promoImage);
                setShowMenuModal(true);
            }, 100);
        }
    };

    // Cargar TODO junto: promociones e imágenes personalizadas
    useEffect(() => {
        const loadAllData = async () => {
            setLoading(true);
            try {
                // 1. Cargar promociones activas (independiente)
                let activePromos = [];
                try {
                    activePromos = await getActivePromotions();
                } catch (e) {
                    console.error('[PromocionesPage] Error obteniendo promociones:', e);
                }

                // 2. Cargar imágenes personalizadas (independiente para que no bloquee si falla permisos)
                const imagesMap = {};
                try {
                    const imagesSnapshot = await getDocs(collection(db, 'promociones_imagenes'));
                    imagesSnapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        if (data && data.imagenUrl) {
                            imagesMap[docSnap.id] = data.imagenUrl;
                        }
                    });
                } catch (e) {
                    console.warn('[PromocionesPage] No se pudieron cargar imágenes personalizadas (posible error de permisos):', e);
                }

                setImagenesCustom(imagesMap);

                // Procesar promociones obtenidas
                if (activePromos && activePromos.length > 0) {
                    const formattedPromos = activePromos.map(promo => {
                        // DETERMINAR PRECIOS: Priorizar datos de Firestore sobre valores hardcoded
                        let preciosFinales = [];

                        // 1. Intentar obtener precios directamente de la promoción (incluye ediciones de Gina)
                        if (promo.precios && Array.isArray(promo.precios) && promo.precios.length > 0) {
                            preciosFinales = promo.precios;
                        } else if (promo.detalles?.packs && Array.isArray(promo.detalles.packs) && promo.detalles.packs.length > 0) {
                            preciosFinales = promo.detalles.packs;
                        }

                        // 2. Si NO hay precios en Firestore, usar valores hardcoded como FALLBACK de seguridad
                        if (preciosFinales.length === 0) {
                            if (promo.titulo && promo.titulo.includes('Desayunos Gratis')) {
                                preciosFinales = [
                                    { nombre: 'Pack Sin Carbos', precio: 89900 },
                                    { nombre: 'Pack Bajo Calorías', precio: 99500 },
                                    { nombre: 'Pack Regular', precio: 111400 },
                                    { nombre: 'Pack Casaditos', precio: 111400 },
                                    { nombre: 'Pack Vegetariano', precio: 111400 },
                                    { nombre: 'Full Pack', precio: 135600 }
                                ];
                            }
                            else if (promo.titulo && promo.titulo.includes('50%') && promo.titulo.includes('descuento')) {
                                preciosFinales = [
                                    { nombre: 'Pack Bajo Calorías', precio: 75000 }
                                ];
                            }
                            // GINA REQUEST: Activar sub-packs exclusivamente para el Two Pack (igual al pack mensual)
                            else if (promo.titulo && promo.titulo.includes('Two Pack')) {
                                preciosFinales = [
                                    { nombre: 'Pack Sin Carbos', precio: 147000 },
                                    { nombre: 'Pack Bajo Calorías', precio: 155100 },
                                    { nombre: 'Pack Regular', precio: 167100 },
                                    { nombre: 'Pack Casaditos', precio: 167100 },
                                    { nombre: 'Pack Vegetariano', precio: 167100 },
                                    { nombre: 'Full Pack', precio: 203400 },
                                    { nombre: 'Pack Keto', precio: 203400 }
                                ];
                                // Asegurar que el modal los muestre como sub-packs a evaluar
                                promo.packsRelacionados = preciosFinales.map(p => p.nombre);
                            }
                        }

                        return {
                            id: promo.id,
                            titulo: promo.titulo,
                            descripcion: promo.descripcion || promo.descripcionCorta,
                            imagen: promo.imagenURL || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                            fechaFin: promo.fechaFin,
                            destacada: promo.mostrarEnHome,
                            detalles: {
                                beneficios: promo.beneficios || promo.detalles?.beneficios || [],
                                packs: preciosFinales
                            },
                            whatsappMsg: promo.whatsappKeyword || `Hola 👋`,
                            prioridadDestacado: promo.prioridadDestacado || 99,
                            etiquetaColor: promo.etiquetaColor,
                            tipoPromocion: promo.tipoPromocion,
                            // NUEVOS CAMPOS - Composición y packs relacionados
                            composicionPlato: promo.composicionPlato,
                            packsRelacionados: promo.packsRelacionados || [],
                            beneficios: promo.beneficios,
                            descuentoEnvio: promo.descuentoEnvio,
                            tipoPlan: promo.tipoPlan,
                            precio: promo.precio || 0,
                            precioRegular: promo.precioRegular || 0,
                            precios: preciosFinales
                        };
                    }).sort((a, b) => a.prioridadDestacado - b.prioridadDestacado);
                    setPromociones(formattedPromos);
                } else {
                    console.warn('[PromocionesPage] No hay promociones activas detectadas');
                    setPromociones([]);
                }
            } catch (error) {
                console.error('[PromocionesPage] Error crítico en loadAllData:', error);
                setPromociones([]);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, []);

    // Subir imagen personalizada para una promoción (optimizando Storage)
    const handleUploadImage = (promo) => {
        if (!isAdmin || !isAdmin()) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (event) => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            try {
                toast.loading('Subiendo imagen...', { id: 'upload-promo-image' });
                // Ruta inmutable con timestamp, WebP 1280px y cache fuerte
                const ts = Date.now();
                const fileName = `promociones/${promo.id}_${ts}.webp`;
                const storageRef = ref(storage, fileName);
                const blob = await optimizeToWebp(file, 1280);
                await uploadBytes(storageRef, blob, { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' });
                const url = await getDownloadURL(storageRef);

                // Leer ruta anterior para poder eliminarla
                const legacyRef = doc(db, 'promociones_imagenes', promo.id);
                const prevSnap = await getDoc(legacyRef);
                const prevPath = prevSnap.exists() ? (prevSnap.data()?.fileName || null) : null;

                // Guardar en Firestore (legacy doc + config central con paths)
                await setDoc(legacyRef, {
                    imagenUrl: url,
                    fileName,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                const confRef = doc(db, 'config', 'promotions_images');
                await setDoc(confRef, { updatedAt: new Date().toISOString() }, { merge: true });
                await updateDoc(confRef, { [`images.${promo.id}`]: url, [`paths.${promo.id}`]: fileName });

                // Eliminar objeto anterior si corresponde
                if (prevPath && prevPath !== fileName) {
                    try { await deleteObject(ref(storage, prevPath)); } catch (_) { }
                }

                // Actualizar estado local
                setImagenesCustom((prev) => ({
                    ...prev,
                    [promo.id]: url
                }));

                toast.success('Imagen actualizada', { id: 'upload-promo-image' });
            } catch (error) {
                console.error('Error subiendo imagen:', error);
                toast.error('No se pudo subir la imagen', { id: 'upload-promo-image' });
            }
        };

        input.click();
    };

    // Manejar scroll para filtros sticky
    useEffect(() => {
        const handleScroll = () => {
            const threshold = 450;
            setIsSticky(window.scrollY > threshold);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Mostrar todas las promociones activas (ya vienen filtradas por getActivePromotions)
    const promocionesDestacadas = promociones;

    return (
        <PageTransition>
            <SEOHead
                {...SEO_CONFIG.promociones}
                structuredData={getBreadcrumbSchema([{ name: 'Promociones', url: 'https://bikitchencr.com/promociones' }])}
            />
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Filtros eliminados por solicitud del usuario */}

                {/* Main Content */}
                <main
                    className="container"
                    style={{
                        paddingTop: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + ${isMobile ? '100px' : '120px'})`
                            : (isMobile ? '90px' : '104px')
                    }}
                >
                    <UrgencyBanner className="shadow-sm rounded-2xl mb-6 overflow-hidden" />

                    {loading ? (
                        // Skeleton loader mientras cargan datos e imágenes
                        <div className="space-y-16">
                            <div className="text-center mb-10">
                                <div className="h-8 w-40 bg-gray-200 rounded-full mx-auto mb-3 animate-pulse"></div>
                                <div className="h-10 w-64 bg-gray-200 rounded mx-auto animate-pulse"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[1, 2].map((card) => (
                                    <div key={card} className="bg-white/5 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10">
                                        <div className="h-48 bg-white/5 animate-pulse"></div>
                                        <div className="p-6 space-y-4">
                                            <div className="h-6 bg-white/10 rounded animate-pulse w-3/4"></div>
                                            <div className="h-4 bg-white/5 rounded animate-pulse w-full"></div>
                                            <div className="h-4 bg-white/5 rounded animate-pulse w-2/3"></div>
                                            <div className="h-10 bg-white/10 rounded-xl animate-pulse w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map((card) => (
                                    <div key={card} className="bg-white/5 backdrop-blur-md rounded-3xl overflow-hidden border border-white/10">
                                        <div className="h-48 bg-white/5 animate-pulse"></div>
                                        <div className="p-6 space-y-4">
                                            <div className="h-6 bg-white/10 rounded animate-pulse w-3/4"></div>
                                            <div className="h-4 bg-white/5 rounded animate-pulse w-full"></div>
                                            <div className="h-10 bg-white/10 rounded-xl animate-pulse w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Promociones Destacadas del Mes */}
                            {promocionesDestacadas.length > 0 ? (
                                <section>
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        className="text-center mb-8"
                                    >
                                        <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2">
                                            Promociones del Mes
                                        </h1>
                                        <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto font-medium">
                                            Aprovecha estas ofertas exclusivas y ahorra en tus packs favoritos
                                        </p>
                                    </motion.div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {promocionesDestacadas.map((promo, idx) => (
                                            <PromoCard
                                                key={promo.id || `promo-card-${idx}`}
                                                promo={promo}
                                                onClick={setSelectedPromo}
                                                onAddToCart={handleDirectAddToCart}
                                                customImage={imagenesCustom[promo.id]}
                                                onUploadImage={handleUploadImage}
                                                isAdmin={isAdmin && isAdmin()}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ) : (
                                <div className="text-center py-20">
                                    <Gift size={64} className="mx-auto text-gray-300 mb-4" />
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No hay promociones activas</h3>
                                    <p className="text-gray-600">Vuelve pronto para ver nuestras ofertas especiales</p>
                                </div>
                            )}

                            {/* Two Pack - Promoción Especial */}
                            <motion.section
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="mt-16"
                            >
                                <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
                                    {/* Decoración de fondo */}
                                    <div className="absolute inset-0 opacity-10">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
                                    </div>

                                    <div className="relative z-10">
                                        <div className="flex flex-col md:flex-row items-center gap-8">
                                            <div className="flex-1 text-center md:text-left">
                                                <motion.div
                                                    initial={{ scale: 0.9 }}
                                                    whileInView={{ scale: 1 }}
                                                    viewport={{ once: true }}
                                                    className="inline-flex items-center gap-2 bg-white/25 px-4 py-2 rounded-full mb-4"
                                                >
                                                    <Users size={20} />
                                                    <span className="font-bold text-sm">PACK PARA DOS PERSONAS</span>
                                                </motion.div>

                                                <h2 className="text-4xl md:text-5xl font-black mb-4">
                                                    Two Pack
                                                </h2>

                                                <p className="text-xl md:text-2xl mb-6 text-white/95 font-medium">
                                                    5 comidas para cada persona • 10 comidas totales
                                                </p>

                                                <div className="flex flex-wrap gap-3 mb-6 justify-center md:justify-start">
                                                    <div className="bg-white/25 px-4 py-2 rounded-xl border border-white/30">
                                                        <span className="font-bold">✨ 25% OFF en plan mensual</span>
                                                    </div>
                                                    <div className="bg-white/25 px-4 py-2 rounded-xl border border-white/30">
                                                        <span className="font-bold">🚚 Envío disponible</span>
                                                    </div>
                                                    <div className="bg-white/25 px-4 py-2 rounded-xl border border-white/30">
                                                        <span className="font-bold">👥 Ideal para parejas</span>
                                                    </div>
                                                </div>

                                                <p className="text-white/90 mb-8 text-lg">
                                                    Ahorra más comprando para dos. 7 opciones de packs disponibles con el mejor precio del mercado.
                                                </p>

                                                <a
                                                    href="/packs"
                                                    className="inline-flex items-center gap-3 bg-white text-orange-600 px-8 py-4 rounded-2xl font-black text-lg shadow-2xl hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                                                >
                                                    <ShoppingCart size={22} />
                                                    Ver Two Pack
                                                    <ChevronRight size={22} />
                                                </a>
                                            </div>

                                            <div className="flex-shrink-0">
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    whileInView={{ scale: 1, opacity: 1 }}
                                                    viewport={{ once: true }}
                                                    className="bg-white/15 rounded-3xl p-8 border-2 border-white/30"
                                                >
                                                    <div className="text-center">
                                                        <div className="text-6xl mb-4">👥</div>
                                                        <div className="text-5xl font-black mb-2">25%</div>
                                                        <div className="text-xl font-bold">DESCUENTO</div>
                                                        <div className="text-sm mt-2 text-white/80">En plan mensual</div>
                                                    </div>
                                                </motion.div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.section>

                            {/* CTA Final */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                className="mt-20 text-center bg-gradient-to-r from-bikitchen-orange/10 to-bikitchen-gold/10 rounded-3xl p-10 border border-bikitchen-orange/20"
                            >
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                                    ¿Tienes dudas sobre alguna promoción?
                                </h3>
                                <p className="text-gray-600 mb-6 max-w-xl mx-auto">
                                    Escríbenos por WhatsApp y te ayudamos a elegir el pack perfecto para ti.
                                </p>
                                <a
                                    href={getWhatsAppUrl('Hola 👋')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-bikitchen-gold hover:bg-amber-400 text-gray-900 font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:shadow-xl"
                                >
                                    💬 Consultar por WhatsApp
                                </a>
                            </motion.div>
                        </>
                    )}
                </main>

                <Footer />

                {/* Modal */}
                {selectedPromo && (
                    <PromoModal
                        promo={selectedPromo}
                        onClose={() => setSelectedPromo(null)}
                        addToCart={handleAddToCart}
                        onPackClick={handlePackClick}
                    />
                )}

                {/* Modal de Menú Simplificado para Promociones */}
                {selectedMenuKey && (
                    <PromoMenuModal
                        packName={selectedPackName}
                        menuKey={selectedMenuKey}
                        promoPrice={selectedPromoPrice}
                        promoImage={selectedPromoImage}
                        promoMetadata={previousPromo ? {
                            id: previousPromo.id,
                            title: previousPromo.titulo,
                            benefits: previousPromo.detalles?.beneficios || [],
                            planLabel: previousPromo.titulo?.includes('Desayunos Gratis') ? 'Promo Desayunos Gratis' : (previousPromo.titulo?.includes('50%') && previousPromo.titulo?.includes('descuento') ? 'Promo 50% Envío' : 'Promoción Mensual')
                        } : null}
                        isOpen={showMenuModal}
                        onClose={() => {
                            setShowMenuModal(false);
                            setSelectedMenuKey(null);
                            setSelectedPackName('');
                            setSelectedPromoPrice(0);
                            setSelectedPromoImage('');
                        }}
                        onBack={() => {
                            // Volver al modal de promoción anterior
                            setShowMenuModal(false);
                            setSelectedMenuKey(null);
                            setSelectedPackName('');
                            setSelectedPromoPrice(0);
                            setSelectedPromoImage('');

                            // Restaurar el modal de promoción
                            setTimeout(() => {
                                setSelectedPromo(previousPromo);
                                setPreviousPromo(null);
                            }, 100);
                        }}
                        onAddToCart={(item) => {
                            handleAddToCart(item);
                        }}
                    />
                )}
            </div>
        </PageTransition>
    );
}

// Alias para compatibilidad
const PromoModal = PromoDetail;
