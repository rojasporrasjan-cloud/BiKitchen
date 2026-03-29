import React, { useState, useEffect } from 'react';
import { usePromoBanner } from '../hooks/usePromoBanner';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { Gift, Calendar, Truck, Check, Clock, Users, Heart, Sparkles, ChevronRight, RefreshCw, ShoppingCart, X, Filter, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getActivePromotions } from '../utils/firestorePromotions';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { db, storage } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import toast from 'react-hot-toast';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { trackViewContent } from '../services/facebookPixel';
import MenuDetailsModal from '../components/menus/MenuDetailsModal';
import PromoMenuModal from '../components/menus/PromoMenuModal';
import { PACK_TO_MENU_KEY } from '../data/packsData';

// Categorías de filtro - ELIMINADAS por solicitud del usuario

// Helper: optimizar a WebP con resize
const optimizeToWebp = (file, maxSize = 1280) => new Promise((resolve, reject) => {
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

const formatPrice = (price) => `₡${price.toLocaleString('es-CR')}`;

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
            whileHover={{ y: -16 }}
            transition={{
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94]
            }}
            className="relative group cursor-pointer"
            onClick={() => onClick(promo)}
        >
            {/* Animated glow effect */}
            <motion.div
                className="absolute -inset-6 bg-gradient-to-br from-orange-400/30 via-amber-400/30 to-orange-500/30 rounded-3xl blur-3xl"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Card container */}
            <div className="relative bg-white rounded-3xl overflow-hidden">
                {/* Animated border */}
                <motion.div
                    className="absolute inset-0 rounded-3xl p-[3px] bg-gradient-to-br from-orange-400 via-amber-400 to-orange-500"
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="absolute inset-[3px] rounded-3xl bg-white" />
                </motion.div>

                {/* Content */}
                <div className="relative z-10">
                    {/* Imagen */}
                    <div className="relative h-56 overflow-hidden">
                        <motion.img
                            src={displayImage}
                            alt={promo.titulo}
                            className="w-full h-full object-cover"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                            onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                            }}
                        />

                        {/* Shine effect */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                            initial={{ x: '-100%' }}
                            whileHover={{ x: '100%' }}
                            transition={{ duration: 1, ease: "easeInOut" }}
                        />

                        {/* Botón de cámara para admin */}
                        {isAdmin && (
                            <motion.button
                                onClick={handleCameraClick}
                                className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-sm p-2.5 rounded-xl shadow-xl border border-gray-200"
                                whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 1)" }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                title="Cambiar imagen"
                            >
                                <Camera size={18} className="text-gray-700" />
                            </motion.button>
                        )}

                        {/* Sello de promoción activa */}
                        {isActive && !isAdmin && (
                            <motion.div
                                className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 shadow-xl"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                                whileHover={{ scale: 1.05 }}
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
                                whileHover={{ scale: 1.05, backgroundColor: "rgb(249, 115, 22)" }}
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
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none"
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            transition={{ duration: 0.4 }}
                        />
                    </div>

                    {/* Contenido */}
                    <div className="p-7">
                        <h3 className="text-2xl font-black text-gray-900 mb-3 leading-tight">
                            {promo.titulo}
                        </h3>
                        <p className="text-gray-500 text-sm mb-5 line-clamp-2 leading-relaxed">
                            {promo.descripcion}
                        </p>

                        {/* Fecha de vigencia */}
                        {promo.fechaFin && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl text-xs text-gray-600 mb-5 font-semibold">
                                <Clock size={16} />
                                <span>Válido hasta {new Date(promo.fechaFin).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' })}</span>
                            </div>
                        )}

                        {/* Cuadro de oferta configurable */}
                        {hasSpecialPrice && (
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-4 mb-4 text-white relative overflow-hidden">
                                {/* Decoración de fondo */}
                                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

                                {/* Badge de descuento dinámico */}
                                <div className="absolute top-2 right-2 bg-yellow-400 text-gray-900 text-xs font-black px-2 py-1 rounded-full shadow-lg animate-pulse">
                                    🔥 {percentOff}% OFF
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-white/80 text-xs font-medium">Precio Regular:</span>
                                        <span className="text-white/70 line-through text-sm">
                                            {formatPrice(pRegular)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-yellow-300 text-xs font-bold">Precio Promoción:</span>
                                        <span className="text-2xl font-black text-white drop-shadow-lg">
                                            {formatPrice(pPromo)}
                                        </span>
                                    </div>
                                    <p className="text-white/70 text-[10px] mt-2">*Precio desde. Varía según el pack seleccionado</p>
                                </div>
                            </div>
                        )}

                        {/* Beneficios preview */}
                        {promo.detalles?.beneficios && (
                            <div className="space-y-1 mb-4">
                                {promo.detalles.beneficios.slice(0, 2).map((beneficio, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-600">
                                        <Check size={12} className="text-bikitchen-orange flex-shrink-0" />
                                        <span>{beneficio}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onClick(promo);
                                }}
                                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <Filter size={18} />
                                Detalles
                            </button>
                            <button
                                onClick={handleAddToCartClick}
                                className={`flex-[1.5] font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-[1.02] shadow-sm ${addedToCart
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gradient-to-r from-bikitchen-orange to-orange-500 text-white hover:shadow-lg'
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
                                                Ver opciones
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

// Modal de detalle de promoción
function PromoDetail({ promo, onClose, addToCart, onPackClick }) {
    const { getWhatsAppUrl } = useWhatsApp();
    const [selectedPack, setSelectedPack] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [addedToCart, setAddedToCart] = useState(false);
    const [activeTab, setActiveTab] = useState('pack'); // 'pack' o 'desayuno'

    // Detectar si es promoción con desayunos gratis
    const esDesayunosGratis = promo.titulo && promo.titulo.includes('Desayunos Gratis');

    if (!promo) return null;

    // Mensaje personalizado de WhatsApp con el título de la promoción
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

        console.log('[PromoDetail] Agregando al carrito:', cartItem);
        console.log('[PromoDetail] onAddToCart existe?', typeof addToCart);

        if (addToCart && typeof addToCart === 'function') {
            addToCart(cartItem);
            setAddedToCart(true);
            setTimeout(() => setAddedToCart(false), 2000);
        } else {
            console.error('[PromoDetail] addToCart no es una función válida');
        }
    };

    const updateQuantity = (val) => {
        setQuantity(Math.max(1, Math.min(10, quantity + val)));
    };

    return (
        <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="max-w-3xl p-0 max-h-[90vh]">
                <motion.div
                    className="flex flex-col max-h-[90vh] overflow-y-auto"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <div className="flex flex-col">
                        {/* Header con imagen */}
                        <motion.div
                            className="relative h-64 md:h-72 overflow-hidden flex-shrink-0"
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.4 }}
                        >
                            <motion.img
                                src={promo.imagen}
                                alt={promo.titulo}
                                className="w-full h-full object-cover"
                                initial={{ scale: 1.1 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.6 }}
                                onError={(e) => {
                                    e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent"></div>

                            {/* Título sobre imagen */}
                            <motion.div
                                className="absolute bottom-0 left-0 right-0 p-6 md:p-8"
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                    <motion.span
                                        className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-full text-sm font-black flex items-center gap-2 shadow-xl"
                                        whileHover={{ scale: 1.05 }}
                                    >
                                        <Gift size={16} />
                                        Promoción activa
                                    </motion.span>
                                    {promo.fechaFin && (
                                        <span className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-semibold border border-white/30">
                                            Hasta {new Date(promo.fechaFin).toLocaleDateString('es-CR', { day: 'numeric', month: 'long' })}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg">{promo.titulo}</h2>
                                {promo.precio && promo.precio > 0 && (
                                    <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full border border-white/30">
                                        <span className="text-2xl font-black">₡{promo.precio.toLocaleString('es-CR')}</span>
                                    </div>
                                )}
                            </motion.div>

                            {/* Botón cerrar */}
                            <motion.button
                                onClick={onClose}
                                className="absolute top-4 right-4 w-12 h-12 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all shadow-lg"
                                whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.4)" }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <X size={22} />
                            </motion.button>
                        </motion.div>

                        {/* Contenido */}
                        <motion.div
                            className="p-6 md:p-8 bg-gradient-to-b from-white to-gray-50"
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                        >
                            <p className="text-gray-600 text-base leading-relaxed mb-6">
                                {promo.descripcion}
                            </p>

                            {/* Pestañas para Desayunos Gratis - NUEVO */}
                            {esDesayunosGratis && (
                                <motion.div
                                    className="mb-6"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.35, duration: 0.4 }}
                                >
                                    <div className="flex gap-3 bg-gray-100 p-2 rounded-2xl">
                                        <button
                                            onClick={() => setActiveTab('pack')}
                                            className={`flex-1 py-3 px-6 rounded-xl font-black transition-all duration-300 ${activeTab === 'pack'
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                                                : 'bg-transparent text-gray-600 hover:bg-white'
                                                }`}
                                        >
                                            🍽️ Pack Mensual
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('desayuno')}
                                            className={`flex-1 py-3 px-6 rounded-xl font-black transition-all duration-300 ${activeTab === 'desayuno'
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                                                : 'bg-transparent text-gray-600 hover:bg-white'
                                                }`}
                                        >
                                            ☕ Desayuno Gratis
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Composición del Plato - NUEVO */}
                            {promo.composicionPlato && (
                                <motion.div
                                    className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border-2 border-blue-200"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.35, duration: 0.4 }}
                                >
                                    <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="text-2xl">🍽️</span> Composición del Plato
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {promo.composicionPlato.proteinas > 0 && (
                                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                                <div className="text-2xl mb-1">🥩</div>
                                                <div className="text-2xl font-black text-blue-600">{promo.composicionPlato.proteinas}g</div>
                                                <div className="text-xs text-gray-600 font-medium">Proteína</div>
                                            </div>
                                        )}
                                        {promo.composicionPlato.vegetales > 0 && (
                                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                                <div className="text-2xl mb-1">🥗</div>
                                                <div className="text-2xl font-black text-green-600">{promo.composicionPlato.vegetales}</div>
                                                <div className="text-xs text-gray-600 font-medium">
                                                    Vegetales {promo.composicionPlato.vegetalesCocidos ? '(cocidos)' : ''}
                                                </div>
                                            </div>
                                        )}
                                        {promo.composicionPlato.carbohidrato !== undefined && (
                                            <div className="bg-white rounded-xl p-3 text-center border border-blue-100">
                                                <div className="text-2xl mb-1">{promo.composicionPlato.carbohidrato === 0 ? '🚫' : '🍚'}</div>
                                                <div className="text-2xl font-black text-amber-600">
                                                    {promo.composicionPlato.carbohidrato === 0 ? 'Sin' : promo.composicionPlato.carbohidrato}
                                                </div>
                                                <div className="text-xs text-gray-600 font-medium">Carbohidratos</div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Contenido de la pestaña DESAYUNO */}
                            {esDesayunosGratis && activeTab === 'desayuno' && (
                                <motion.div
                                    className="mb-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200"
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4, duration: 0.4 }}
                                >
                                    <h3 className="text-2xl font-black text-gray-900 mb-4 flex items-center gap-3">
                                        <span className="text-3xl">☕</span> Desayuno Gratis Incluido
                                    </h3>
                                    <p className="text-gray-700 text-lg leading-relaxed mb-4">
                                        Con tu pack mensual, recibís <strong className="text-orange-600">5 desayunos gratis</strong> cada semana.
                                    </p>
                                    <div className="bg-white rounded-xl p-5 border border-amber-200">
                                        <h4 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                                            <span className="text-xl">🍳</span> Menú de Desayunos
                                        </h4>
                                        <ul className="space-y-2 text-gray-700">
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
                                    <p className="text-sm text-gray-600 mt-4 font-medium">
                                        💡 Los desayunos varían cada semana para que disfrutes variedad
                                    </p>
                                </motion.div>
                            )}

                            {/* Contenido de la pestaña PACK - Solo mostrar si NO es desayunos gratis O si la pestaña activa es 'pack' */}
                            {(!esDesayunosGratis || activeTab === 'pack') && (
                                <>
                                    {/* Packs Incluidos - NUEVO - Clickeables para ver menú */}
                                    {promo.packsRelacionados && promo.packsRelacionados.length > 0 && (
                                        <motion.div
                                            className="mb-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-5 border-2 border-orange-200"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4, duration: 0.4 }}
                                        >
                                            <h3 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                                                <span className="text-2xl">📦</span> Packs Incluidos en esta Promoción
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {promo.packsRelacionados.map((pack, idx) => (
                                                    <motion.button
                                                        key={idx}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (onPackClick) {
                                                                // Buscar el precio específico del pack en el array de precios mejorado
                                                                let promoPrice = 0;
                                                                const normalizedPack = pack.toLowerCase();
                                                                if (promo.precios && Array.isArray(promo.precios)) {
                                                                    const packPrice = promo.precios.find(p =>
                                                                        p.nombre.toLowerCase() === normalizedPack ||
                                                                        p.nombre.toLowerCase().includes(normalizedPack) ||
                                                                        normalizedPack.includes(p.nombre.toLowerCase())
                                                                    );
                                                                    promoPrice = packPrice?.precio || 0;
                                                                } else if (promo.detalles?.packs) {
                                                                    const packDetail = promo.detalles.packs.find(p =>
                                                                        p.nombre.toLowerCase() === normalizedPack ||
                                                                        p.nombre.toLowerCase().includes(normalizedPack) ||
                                                                        normalizedPack.includes(p.nombre.toLowerCase())
                                                                    );
                                                                    promoPrice = packDetail?.precio || 0;
                                                                } else {
                                                                    promoPrice = promo.precio || 0;
                                                                }
                                                                const promoImage = promo.imagen || '';
                                                                onPackClick(pack, promoPrice, promoImage, promo);
                                                            }
                                                        }}
                                                        className="bg-white px-4 py-2 rounded-xl border-2 border-orange-300 shadow-sm hover:shadow-lg hover:scale-105 hover:border-orange-500 hover:bg-orange-50 transition-all duration-200 cursor-pointer"
                                                        initial={{ scale: 0.9, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ delay: 0.4 + (idx * 0.05) }}
                                                        whileHover={{ y: -2 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <span className="text-sm font-bold text-gray-800">{pack}</span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-600 mt-3 font-medium">
                                                💡 Haz clic en cualquier pack para ver su menú detallado
                                            </p>
                                        </motion.div>
                                    )}

                                    {/* Precios de packs si existen - Seleccionables */}
                                    {promo.detalles?.packs && promo.detalles.packs.length > 0 && (
                                        <motion.div
                                            className="mb-6"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4, duration: 0.4 }}
                                        >
                                            <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                                <span className="text-3xl">💰</span> Selecciona tu pack
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {promo.detalles.packs.map((pack, idx) => (
                                                    <motion.button
                                                        key={idx}
                                                        onClick={() => setSelectedPack(pack)}
                                                        className={`rounded-2xl p-5 text-center transition-all border-2 ${selectedPack?.nombre === pack.nombre
                                                            ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-xl ring-2 ring-orange-500 ring-offset-2'
                                                            : 'border-gray-200 bg-white hover:border-orange-400 hover:shadow-lg'
                                                            }`}
                                                        whileHover={{ scale: 1.05, y: -4 }}
                                                        whileTap={{ scale: 0.95 }}
                                                    >
                                                        <span className="block text-base font-black text-gray-900 mb-3">{pack.nombre}</span>
                                                        {pack.precioRegular ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm text-gray-400 line-through mb-2 font-medium">
                                                                    {formatPrice(pack.precioRegular)}
                                                                </span>
                                                                <span className="block font-black text-green-600 text-2xl">
                                                                    {formatPrice(pack.precio)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="block font-black bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent text-2xl">
                                                                {formatPrice(pack.precio)}
                                                            </span>
                                                        )}
                                                    </motion.button>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Selector de Cantidad */}
                                    {selectedPack && (
                                        <motion.div
                                            className="mb-8 flex items-center gap-6 bg-gradient-to-r from-orange-50 to-amber-50 p-6 rounded-3xl border-2 border-orange-200 shadow-lg"
                                            initial={{ scale: 0.95, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <span className="text-lg font-black text-gray-900">Cantidad:</span>
                                            <div className="flex items-center gap-4">
                                                <motion.button
                                                    onClick={() => updateQuantity(-1)}
                                                    className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-orange-600 font-black text-xl border-2 border-orange-200"
                                                    whileHover={{ scale: 1.15, backgroundColor: "rgb(249, 115, 22)", color: "white", borderColor: "rgb(249, 115, 22)" }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    -
                                                </motion.button>
                                                <span className="font-black text-3xl w-12 text-center text-orange-600">{quantity}</span>
                                                <motion.button
                                                    onClick={() => updateQuantity(1)}
                                                    className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-orange-600 font-black text-xl border-2 border-orange-200"
                                                    whileHover={{ scale: 1.15, backgroundColor: "rgb(249, 115, 22)", color: "white", borderColor: "rgb(249, 115, 22)" }}
                                                    whileTap={{ scale: 0.9 }}
                                                >
                                                    +
                                                </motion.button>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <span className="text-sm text-gray-600 block font-bold uppercase tracking-wide mb-1">Total</span>
                                                <span className="font-black text-3xl bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                                                    {formatPrice(selectedPack.precio * quantity)}
                                                </span>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Menú del pack seleccionado */}
                                    {selectedPack?.menu && selectedPack.menu.length > 0 && (
                                        <motion.div
                                            className="mb-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-6 border-2 border-green-200 shadow-lg"
                                            initial={{ scale: 0.95, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                                                <span className="text-3xl">🍽️</span> Menú del {selectedPack.nombre}
                                            </h3>
                                            <ul className="space-y-3">
                                                {selectedPack.menu.map((item, idx) => (
                                                    <motion.li
                                                        key={idx}
                                                        className="flex items-start gap-4 text-gray-700 text-base font-medium"
                                                        initial={{ x: -10, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: idx * 0.05 }}
                                                    >
                                                        <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg">
                                                            <Check size={18} className="text-white" />
                                                        </div>
                                                        <span className="font-medium">{item}</span>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    )}

                                    {/* Incluye si existe */}
                                    {promo.detalles?.incluye && (
                                        <div className="mb-5">
                                            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                                <span className="text-xl">📦</span> Incluye
                                            </h3>
                                            <ul className="space-y-1.5">
                                                {promo.detalles.incluye.map((item, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 text-gray-700 text-sm">
                                                        <Check size={16} className="text-bikitchen-orange flex-shrink-0" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Beneficios */}
                                    {promo.beneficios && promo.beneficios.length > 0 && (
                                        <motion.div
                                            className="mb-6"
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5, duration: 0.4 }}
                                        >
                                            <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
                                                <span className="text-2xl">✨</span> Beneficios incluidos
                                            </h3>
                                            <ul className="space-y-3">
                                                {promo.beneficios.map((beneficio, idx) => (
                                                    <motion.li
                                                        key={idx}
                                                        className="flex items-center gap-3 text-gray-700 text-base"
                                                        initial={{ x: -10, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: 0.5 + (idx * 0.05) }}
                                                    >
                                                        <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-amber-400 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                                                            <Check size={14} className="text-white" />
                                                        </div>
                                                        <span className="font-medium">{beneficio}</span>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </motion.div>
                                    )}

                                </>
                            )}

                            {/* Botones de acción */}
                            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                                {/* Agregar al carrito */}
                                {(promo.precio > 0 || promo.precioEspecial > 0 || promo.precioRegular > 0 || (promo.detalles?.packs && promo.detalles.packs.length > 0) || (promo.precios && promo.precios.length > 0)) && (
                                    <button
                                        onClick={handleAddToCart}
                                        disabled={((promo.detalles?.packs && promo.detalles.packs.length > 0) || (promo.precios && promo.precios.length > 0)) && !selectedPack}
                                        className={`w-full flex items-center justify-center gap-2 font-bold py-3.5 px-6 rounded-xl transition-all duration-300 ${addedToCart
                                            ? 'bg-green-500 text-white'
                                            : (selectedPack || (!promo.detalles?.packs?.length && !promo.precios?.length))
                                                ? 'bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white hover:shadow-lg'
                                                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {addedToCart ? (
                                            <>
                                                <Check size={20} />
                                                ¡Agregado!
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart size={20} />
                                                {(selectedPack || (!promo.detalles?.packs?.length && !promo.precios?.length))
                                                    ? `Agregar ${quantity > 1 ? `(${quantity})` : ''} • ${formatPrice((selectedPack?.precio || promo.precio || promo.precioEspecial || promo.precioRegular || 0) * quantity)}`
                                                    : 'Selecciona un pack'}
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
}

export default function PromocionesPage() {
    const showPromoBanner = usePromoBanner();
    const { getWhatsAppUrl } = useWhatsApp();
    const [selectedPromo, setSelectedPromo] = useState(null);
    const [promociones, setPromociones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSticky, setIsSticky] = useState(false);
    const [imagenesCustom, setImagenesCustom] = useState({});
    const { addToCart } = useCart() || {};
    const { isAdmin } = useAuth();

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

    // Manejar clic en pack incluido para ver su menú detallado
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
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero Section */}
                <header
                    className="relative pt-28 pb-20 md:pt-36 md:pb-24 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white overflow-hidden"
                    style={{
                        paddingTop: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + 112px)`
                            : undefined
                    }}
                >
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/30 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-400/10 via-white/10 to-transparent rounded-full blur-3xl"></div>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>

                    {/* Decorative elements */}
                    <div className="hidden md:block absolute top-44 left-10 text-6xl opacity-30 animate-bounce">🎁</div>
                    <div className="hidden md:block absolute bottom-20 right-20 text-5xl opacity-30 animate-pulse">✨</div>

                    <div className="container relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                            <motion.span
                                className="inline-block mb-6 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-base font-bold text-white border border-white/30 shadow-xl"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                ✨ Ofertas Especiales ✨
                            </motion.span>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-8 leading-tight drop-shadow-2xl">
                                Promociones del Mes
                            </h1>
                            <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto font-medium text-white/95 leading-relaxed">
                                Combos y packs especiales con precios que no encontrarás en el menú regular
                            </p>
                            <div className="flex flex-wrap justify-center gap-3 text-sm">
                                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <Gift size={16} />
                                    <span>Ofertas exclusivas</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <Truck size={16} />
                                    <span>Envíos con descuento</span>
                                </div>
                                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                    <Heart size={16} />
                                    <span>Sabor de casa</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </header>

                {/* Filtros */}
                {/* Placeholder para evitar salto cuando se pone fixed */}
                {/* Filtros eliminados por solicitud del usuario */}

                {/* Main Content */}
                <main className="container py-16 pb-32">

                    {loading ? (
                        // Skeleton loader mientras cargan datos e imágenes
                        <div className="space-y-16">
                            <div className="text-center mb-10">
                                <div className="h-8 w-40 bg-gray-200 rounded-full mx-auto mb-3 animate-pulse"></div>
                                <div className="h-10 w-64 bg-gray-200 rounded mx-auto animate-pulse"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {[1, 2].map((card) => (
                                    <div key={card} className="bg-white rounded-3xl overflow-hidden shadow-lg">
                                        <div className="h-48 bg-gray-200 animate-pulse"></div>
                                        <div className="p-6 space-y-4">
                                            <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
                                            <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-1/2"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3].map((card) => (
                                    <div key={card} className="bg-white rounded-3xl overflow-hidden shadow-lg">
                                        <div className="h-48 bg-gray-200 animate-pulse"></div>
                                        <div className="p-6 space-y-4">
                                            <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                            <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
                                            <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-1/2"></div>
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
                                        className="text-center mb-12"
                                    >
                                        <span
                                            className="inline-block px-5 py-2 rounded-full text-sm font-bold mb-4 text-white shadow-lg"
                                            style={{ background: 'linear-gradient(90deg, #FFB347 0%, #FF8C42 100%)' }}
                                        >
                                            🔥 Lo más destacado del mes
                                        </span>
                                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
                                            Promociones del Mes
                                        </h2>
                                        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                                            Aprovecha nuestras mejores ofertas y ahorra en tus packs favoritos
                                        </p>
                                    </motion.div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {promocionesDestacadas.map((promo) => (
                                            <PromoCard
                                                key={promo.id}
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
                                                    className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full mb-4"
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
                                                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30">
                                                        <span className="font-bold">✨ 25% OFF en plan mensual</span>
                                                    </div>
                                                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30">
                                                        <span className="font-bold">🚚 Envío disponible</span>
                                                    </div>
                                                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl border border-white/30">
                                                        <span className="font-bold">👥 Ideal para parejas</span>
                                                    </div>
                                                </div>

                                                <p className="text-white/90 mb-8 text-lg">
                                                    Ahorra más comprando para dos. 7 opciones de packs disponibles con el mejor precio del mercado.
                                                </p>

                                                <motion.a
                                                    href="/packs"
                                                    className="inline-flex items-center gap-3 bg-white text-orange-600 px-8 py-4 rounded-2xl font-black text-lg shadow-2xl hover:shadow-xl transition-all hover:scale-105"
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                >
                                                    <ShoppingCart size={22} />
                                                    Ver Two Pack
                                                    <ChevronRight size={22} />
                                                </motion.a>
                                            </div>

                                            <div className="flex-shrink-0">
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    whileInView={{ scale: 1, opacity: 1 }}
                                                    viewport={{ once: true }}
                                                    className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border-2 border-white/30"
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
