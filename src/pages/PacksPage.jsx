import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import SmoothImage from '../components/SmoothImage';
import { ShoppingCart, Truck, Check, Info, Eye, X, Gift, Tag, Filter, Flame, Leaf, Users, Zap, Package, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import MenuDetailsModal from '../components/menus/MenuDetailsModal';
import MenuDetailsModalWithTabs from '../components/menus/MenuDetailsModalWithTabs';
import { getPackPrices } from '../utils/firestoreMenus';
import { getActivePromotions } from '../utils/firestorePromotions';
import { PACKS_DATA, PACK_TO_MENU_KEY, DEFAULT_PACK_IMAGES } from '../data/packsData';
import { db } from '../firebase/config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { cleanFirebaseUrl } from '../utils/firebaseUrl';
import { cachedFetch } from '../utils/firestoreCache';
import { trackViewContent } from '../services/facebookPixel';
import { useMenusRefresh } from '../hooks/useMenusRefresh';
import { usePromoBanner } from '../hooks/usePromoBanner';
import useWhatsApp from '../hooks/useWhatsApp';
import { useChristmas } from '../context/ChristmasContext';
// import { RatingDisplay } from '../components/ReviewSystem'; // Deshabilitado temporalmente
import { formatDishItem } from '../utils/menuUtils';

// Categorías de filtro para packs
const PACK_FILTERS = [
    { id: 'todos', label: 'Todos', icon: '🍽️' },
    { id: 'casaditos', label: 'Casaditos', icon: '🍚', packs: ['Pack Casaditos'] },
    { id: 'two_pack', label: 'Two Pack', icon: '👥', section: 'two_pack' },
    { id: 'keto', label: 'Keto', icon: '🥑', packs: ['Pack Keto'] },
    { id: 'bajo_calorias', label: 'Bajo Calorías', icon: '🥗', packs: ['Pack Bajo Calorías'] },
    { id: 'familiar', label: 'Familiar', icon: '👨‍👩‍👧‍👦', section: 'familiar' },
    { id: 'proteinas', label: 'Proteínas', icon: '🥩', section: 'proteinas' },
    { id: 'vegetariano', label: 'Vegetariano', icon: '🥦', packs: ['Pack Vegetariano'] }
];

// Imagen por defecto para packs
const DEFAULT_PACK_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop&q=80';

// Variantes de animación optimizadas (reducidas para móvil)
const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
};

const modalVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
};

const modalContentVariants = {
    hidden: { scale: 0.95, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 }
};

const formatPrice = (price) => `₡${price.toLocaleString('es-CR')}`;

// Convierte cualquier forma de fecha a JS Date:
// - Firestore Timestamp (tiene .toDate())
// - Objeto plano del cache localStorage {seconds, nanoseconds}
// - String ISO o Date normal
const toJsDate = (val) => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds !== undefined) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

// Datos de packs especiales (familiares y proteínas)
// NOTA: Los menús de packs familiares se cargan dinámicamente desde Firebase
// Datos de packs especiales (familiares y proteínas)
// NOTA: Los menús de packs familiares se cargan dinámicamente desde Firebase
const PACKS_ESPECIALES_BASE = {
    'Pack Familiar Premium': {
        nombre: 'Pack Familiar',
        precio: 41500,
        emoji: '👨‍👩‍👧‍👦',
        color: 'green',
        items: [] // Se carga desde Firebase
    },
    'Pack Familiar Deluxe': {
        nombre: 'Paquete Deluxe',
        precio: 47500,
        emoji: '👑',
        color: 'purple',
        items: [] // Se carga desde Firebase
    },
    'Pack 3 Proteínas': {
        nombre: 'Pack 3 Proteínas',
        emoji: '🥩',
        color: 'orange',
        cantidad: 3,
        proteinas: ['Pollo en salsa de curry', 'Pollo en salsa caribeña', 'Fajitas de lomo en salsa vino', 'Pollo mechado en salsa', 'Carne mechada en salsa', 'Cerdo en salsa de piña', 'Pollo a la toscana', 'Trocitos de cerdo en salsa criolla', 'Pollo en salsa demiglase', 'Fajitas de cerdo con chimichurri']
    },
    'Pack 5 Proteínas': {
        nombre: 'Pack 5 Proteínas',
        emoji: '🍖',
        color: 'orange',
        cantidad: 5,
        proteinas: ['Pollo en salsa de curry', 'Pollo en salsa caribeña', 'Fajitas de lomo en salsa vino', 'Pollo mechado en salsa', 'Carne mechada en salsa', 'Cerdo en salsa de piña', 'Pollo a la toscana', 'Trocitos de cerdo en salsa criolla', 'Pollo en salsa demiglase', 'Fajitas de cerdo con chimichurri']
    }
};

const PackCard = memo(({ pack, shipping, category, promociones = [], customImage, packsEspeciales }) => {
    const isProteinsPack =
        category === 'proteinas' &&
        (pack.name.includes('Pack 3 Proteínas') || pack.name.includes('Pack 5 Proteínas'));

    const isFamiliarPack =
        category === 'familiar' &&
        (pack.name === 'Pack Familiar Premium' || pack.name === 'Pack Familiar Deluxe');

    // Packs de promoción solo tienen precio mensual (desayunos gratis)
    const isPromocionPack = category === 'promociones';

    // Pack de 15 comidas (Desayuno, Almuerzo y Cena) - envío gratis mensual
    const is15ComidasPack = category === 'desayuno_almuerzo_cena';

    // MODIFICADO: isProteinsPack ya no se considera "SpecialPack" para el renderizado principal
    // para permitir que muestre los botones de planes (Semanal/Quincenal/Mensual).
    // Ahora Familiar Pack TAMBIÉN usa el selector estándar.
    const isSpecialPack = false;

    // Si es pack de promoción, forzar plan mensual
    const [selectedPlan, setSelectedPlan] = useState(isPromocionPack ? 'monthly' : 'weekly');
    const [selectedSize, setSelectedSize] = useState('250');
    const [showMenuModal, setShowMenuModal] = useState(false);
    const [showSpecialModal, setShowSpecialModal] = useState(false);
    const [proteinasSeleccionadas, setProteinasSeleccionadas] = useState([]);
    const [imageLoaded, setImageLoaded] = useState(false);
    const { addToCart } = useCart();
    const { whatsappPhone } = useWhatsApp();
    const { isAdmin } = useAuth() || {};
    const isMaintenance = !!pack.maintenance;

    // Datos del pack especial memoizados (ahora disponibles para todos los que los necesiten)
    const packEspecialData = useMemo(() =>
        (isFamiliarPack || isProteinsPack) ? packsEspeciales[pack.name] : null
        , [isFamiliarPack, isProteinsPack, pack.name, packsEspeciales]);

    // Bloquear scroll del body cuando el modal especial está abierto
    useEffect(() => {
        if (showSpecialModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [showSpecialModal]);

    // Callbacks memoizados
    const handleOpenModal = useCallback(() => {
        setShowSpecialModal(true);
        setProteinasSeleccionadas([]);
        setSelectedSize('250');
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowSpecialModal(false);
    }, []);

    const toggleProteina = useCallback((proteina) => {
        setProteinasSeleccionadas(prev => {
            const exists = prev.includes(proteina);
            if (exists) return prev.filter(p => p !== proteina);
            if (prev.length >= packEspecialData?.cantidad) return prev;
            return [...prev, proteina];
        });
    }, [packEspecialData?.cantidad]);

    // Lógica de Promociones desde Firestore
    const getPromoForPlan = (plan) => {
        if (!promociones || promociones.length === 0) return null;

        return promociones.find(p =>
            p.activa &&
            p.packsRelacionados?.includes(pack.name) &&
            p.tipoPlan === plan
        );
    };

    const getPromoDiscountLabel = (plan) => {
        const promo = getPromoForPlan(plan);
        if (promo) {
            if (promo.precio > 0) {
                const original = getOriginalPrice(plan);
                if (original > 0) {
                    const discount = Math.round((1 - (promo.precio / original)) * 100);
                    return `-${discount}%`;
                }
            }
            return 'PROMO';
        }

        // Descuento de mensual predeterminado
        if (plan === 'monthly' && !isSpecialPack && !isPromocionPack) {
            return `-${MONTHLY_DISCOUNT_PERCENT}%`;
        }

        // Descuento manual de Firebase (Solo semanal/quincenal)
        if (hasDiscount && plan !== 'monthly') {
            return pack.tipoDescuento === 'porcentaje'
                ? `-${pack.valorDescuento}%`
                : `-₡${Math.round(pack.valorDescuento / 1000)}k`; // Abreviar para círculos
        }

        return null;
    };

    const promoActiva = getPromoForPlan(selectedPlan);
    const tienePromo = !!promoActiva;

    // Lógica de Descuento Automático Configurable
    const isDiscountActive = () => {
        if (!pack.descuentoActivo) return false;

        const now = new Date();
        const inicio = toJsDate(pack.fechaInicio);
        const fin = toJsDate(pack.fechaFin);

        if (inicio && now < inicio) return false;
        if (fin && now > fin) return false;

        return true;
    };

    const hasDiscount = isDiscountActive();

    // Descuento mensual: 25% para Two Pack, 10% para otros packs regulares
    const isTwoPack = category === 'two_pack';
    const MONTHLY_DISCOUNT_PERCENT = isTwoPack ? 25 : 20;
    const isMonthlyPlan = selectedPlan === 'monthly' && !isSpecialPack && !isPromocionPack;

    // Precio original (sin descuento) - para mensual es semanal × 4
    const getOriginalPrice = (plan = selectedPlan) => {
        // Packs de promoción usan monthlyOriginal como precio original
        if (isPromocionPack) {
            return Number(pack.monthlyOriginal) || Number(pack.monthly) || 0;
        }

        if (isProteinsPack && selectedSize === '500') {
            switch (plan) {
                case 'weekly': return Number(pack.weekly_500) || 0;
                case 'biweekly': return Number(pack.biweekly_500) || 0;
                case 'monthly': return (Number(pack.weekly_500) || 0) * 4; // Precio base para mostrar ahorro
                default: return (Number(pack.weekly_500) || 0) * 4;
            }
        }

        switch (plan) {
            case 'weekly': return Number(pack.weekly) || 0;
            case 'biweekly': return Number(pack.biweekly) || 0;
            case 'monthly': return Number(pack.monthlyOriginal) || (Number(pack.weekly) || 0) * 4;
            default: return (Number(pack.weekly) || 0) * 4;
        }
    };

    // Precio final - para mensual ya viene con descuento en los datos
    const getFinalPrice = () => {
        // Prioridad 1: Promociones dinámicas de la colección 'promociones'
        if (tienePromo && promoActiva.precio > 0) {
            return Number(promoActiva.precio);
        }

        // Prioridad 2: Packs de promoción (Full Pack con Desayunos, etc.)
        if (isPromocionPack) {
            return Number(pack.monthly) || 0;
        }

        // Para planes regulares (y ahora Proteínas y Familiar también)
        let price;
        // Para packs de proteínas en 500g
        if (isProteinsPack && selectedSize === '500') {
            switch (selectedPlan) {
                case 'weekly': price = Number(pack.weekly_500) || 0; break;
                case 'biweekly': price = Number(pack.biweekly_500) || 0; break;
                case 'monthly': price = Number(pack.monthly_500) || 0; break;
                default: price = Number(pack.monthly_500) || 0;
            }
        } else {
            // Para planes regulares
            switch (selectedPlan) {
                case 'weekly': price = Number(pack.weekly) || 0; break;
                case 'biweekly': price = Number(pack.biweekly) || 0; break;
                case 'monthly': price = Number(pack.monthly) || 0; break; // Ya tiene el descuento
                default: price = Number(pack.monthly) || 0;
            }
        }

        // Aplicar descuento de Firebase si existe (solo para semanal/quincenal)
        if (hasDiscount && selectedPlan !== 'monthly') {
            if (pack.tipoDescuento === 'porcentaje') {
                price = price * (1 - (pack.valorDescuento / 100));
            } else if (pack.tipoDescuento === 'fijo') {
                price = Math.max(0, price - pack.valorDescuento);
            }
        }

        return Math.round(price);
    };

    // Verificar si hay algún descuento activo (Firebase, mensual o promoción)
    const hasPromoDiscount = (isPromocionPack && pack.monthlyOriginal && pack.monthlyOriginal !== pack.monthly) || tienePromo;
    const hasAnyDiscount = hasDiscount || isMonthlyPlan || hasPromoDiscount;

    const getPlanLabel = () => {
        // Proteinas ahora usa W/B/M
        switch (selectedPlan) {
            case 'weekly': return 'Semanal';
            case 'biweekly': return 'Quincenal';
            case 'monthly': return 'Mensual';
            default: return 'Mensual';
        }
    };

    const getShipping = () => {
        // Para packs de proteínas usamos un solo texto de envío genérico... O el del selector.
        // Como ahora usa selector normal, podemos usar el switch normal.
        if (isProteinsPack) {
            // Mantener compatibilidad si se prefiere mensaje genérico, pero el switch de abajo funciona bien.
        }

        // Para packs de promoción siempre es mensual
        if (isPromocionPack) {
            return shipping.monthly;
        }

        switch (selectedPlan) {
            case 'weekly':
                return 'Envío no incluido (según tu zona)';
            case 'biweekly':
                return '2 envíos semanales (se cobra el envío de tu zona x 2)';
            case 'monthly':
                return '4 envíos semanales (se cobra el envío de tu zona x 4)';
            default:
                return 'Envío no incluido (según tu zona)';
        }
    };

    // Imagen a mostrar (Prioridad: Cloudinary customImage > Imagen por defecto del pack > Imagen de respaldo)
    const packImage = customImage || DEFAULT_PACK_IMAGES[pack.name] || DEFAULT_PACK_IMAGE;

    const handleAddToCart = () => {
        if (isMaintenance) return;

        // INTERCEPTAR: Si es pack de proteínas, abrir modal para seleccionar proteínas
        if (isProteinsPack) {
            handleOpenModal();
            return;
        }

        const finalPrice = getFinalPrice();
        const originalPrice = getOriginalPrice();

        // Validar que el precio sea válido
        if (!finalPrice || finalPrice <= 0) {
            console.error('Error: Precio inválido para', pack.name, { finalPrice, pack });
            toast.error('Error al agregar al carrito. Por favor recarga la página.');
            return;
        }

        // Construir descripción con descuentos
        let desc = pack.desc;
        if (tienePromo) {
            desc = `${pack.desc} • ${promoActiva.titulo}`;
        } else if (isPromocionPack) {
            desc = `${pack.desc} • Desayunos GRATIS • Envío 10%`;
        } else if (isMonthlyPlan) {
            const shippingText = is15ComidasPack ? 'Envío GRATIS' : '50% OFF en envío';
            desc = `${pack.desc} • ${MONTHLY_DISCOUNT_PERCENT}% dto. mensual • ${shippingText}`;
        } else if (hasDiscount && pack.etiquetaTexto) {
            desc = `${pack.desc} • ${pack.etiquetaTexto}`;
        }

        // Determinar badge de descuento
        let discountBadge = null;
        if (tienePromo) {
            discountBadge = '🎁 PROMO Activa';
        } else if (isPromocionPack && hasPromoDiscount) {
            discountBadge = '🎁 PROMO Desayunos';
        } else if (isMonthlyPlan) {
            discountBadge = `${MONTHLY_DISCOUNT_PERCENT}% OFF Mensual`;
        } else if (hasDiscount) {
            discountBadge = pack.etiquetaTexto;
        }

        // Determinar label de categoría (ej. "Two Pack")
        const categoryLabel = PACKS_DATA?.[category]?.title || (isTwoPack ? 'Two Pack' : undefined);

        // Parsear gramos de proteína desde la descripción del pack (ej. "120g proteína ...")
        let protein = undefined;
        const proteinMatch = (pack.desc || '').match(/(\d+)\s*g\s*prot/i);
        if (proteinMatch) {
            protein = `${proteinMatch[1]}g`;
        }

        addToCart({
            id: `${category}-${pack.name}`,
            name: pack.name,
            desc,
            icon: pack.icon,
            image: packImage, // Imagen del pack
            price: finalPrice,
            originalPrice: hasAnyDiscount ? originalPrice : undefined,
            plan: isPromocionPack ? 'monthly' : selectedPlan,
            planLabel: isPromocionPack ? 'Mensual (Promo)' : getPlanLabel(),
            discountBadge,
            // Nuevos metadatos para el pedido/admin
            category,
            categoryLabel,
            // Macros sugeridas para guardarse en el pedido (usadas por OrdersView)
            protein
        });
    };
    const menuKey = PACK_TO_MENU_KEY[pack.name];

    return (
        <>
            <motion.div
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`group bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-orange-200 ${pack.featured ? 'ring-2 ring-orange-500 ring-offset-4' : ''}`}
            >
                {/* Imagen principal del pack */}
                <motion.div
                    className="relative h-36 sm:h-56 overflow-hidden rounded-t-3xl"
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                >
                    <SmoothImage
                        src={packImage}
                        alt={pack.name}
                        className="h-36 sm:h-56"
                        aspectRatio=""
                        placeholderColor="bg-gradient-to-br from-gray-100 to-gray-50"
                    />
                    {/* Overlay con gradiente */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
                        initial={{ opacity: 0.7 }}
                        whileHover={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                    />

                    {/* Emoji del pack sobre la imagen */}
                    <motion.div
                        className="absolute bottom-4 left-4 text-5xl drop-shadow-2xl"
                        whileHover={{ scale: 1.2, rotate: 5 }}
                        transition={{ duration: 0.3 }}
                    >
                        {pack.icon}
                    </motion.div>

                    {/* Badge de oferta especial */}
                    {pack.featured && (
                        <motion.div
                            className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-center py-2 text-sm font-black uppercase tracking-wider shadow-lg"
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                        >
                            ⭐ Oferta Especial
                        </motion.div>
                    )}

                    {/* Sello de promoción General (Legacy) */}
                    {tienePromo && !hasDiscount && (
                        <div className="absolute top-3 right-3 z-10 group/promo">
                            <div className="bg-bikitchen-gold text-gray-900 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg cursor-help animate-pulse">
                                <Gift size={12} />
                                Promo
                            </div>
                            <div className="absolute right-0 top-full mt-2 w-52 bg-gray-900 text-white text-xs p-3 rounded-lg opacity-0 group-hover/promo:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                                <p className="font-bold mb-1">{promoActiva.titulo}</p>
                                <p className="text-gray-300">{promoActiva.descripcionCorta || 'Promoción activa'}</p>
                            </div>
                        </div>
                    )}

                    {/* Sello de Descuento Automático */}
                    {hasDiscount && pack.mostrarEtiqueta && (
                        <motion.div
                            className="absolute top-4 right-4 z-10"
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.3, duration: 0.5, type: "spring" }}
                        >
                            <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 px-4 py-2 rounded-full text-sm font-black flex items-center gap-2 shadow-xl">
                                <Tag size={14} />
                                {pack.etiquetaTexto || 'Oferta'}
                            </div>
                        </motion.div>
                    )}


                </motion.div>

                <div className="p-3 sm:p-6">
                    {/* Título y descripción */}
                    <div className="text-center mb-5">
                        <h3 className="text-base sm:text-2xl font-black text-gray-900 mb-1 sm:mb-2 leading-tight line-clamp-2">{pack.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">{pack.desc}</p>

                        {/* Subtexto de validez de descuento */}
                        {hasDiscount && pack.fechaFin && toJsDate(pack.fechaFin) && (
                            <p className="text-xs text-orange-600 mt-1 font-medium">
                                Válido hasta {toJsDate(pack.fechaFin).toLocaleDateString('es-CR')}
                            </p>
                        )}
                    </div>

                    {/* Modificado: Mostrar botón de ver detalles si hay menuKey O es Familiar/Proteinas */}
                    {(menuKey || isFamiliarPack) && !isSpecialPack && (
                        <motion.button
                            onClick={() => isFamiliarPack ? handleOpenModal() : setShowMenuModal(true)}
                            className="w-full mb-3 sm:mb-5 text-xs sm:text-sm text-orange-600 hover:text-white font-bold flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 hover:bg-gradient-to-r hover:from-orange-500 hover:to-amber-500 rounded-xl sm:rounded-2xl transition-all border-2 border-orange-200 hover:border-orange-500"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Eye size={18} />
                            {isFamiliarPack ? 'Ver Menú de la semana' : 'Ver detalles del menú'}
                        </motion.button>
                    )}

                    {/* Para packs especiales: mostrar precios y botón Ver detalles */}
                    {isSpecialPack ? (
                        <>
                            <div className="text-center mb-4">
                                {isFamiliarPack ? (
                                    <div className="text-3xl font-bold text-bikitchen-orange">
                                        {formatPrice(getFinalPrice())}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="text-xl sm:text-3xl font-bold text-bikitchen-orange mb-1 sm:mb-2">
                                            {formatPrice(getFinalPrice())}
                                        </div>

                                        {/* Selector de Tamaño 250g / 500g */}
                                        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 mb-2">
                                            <button
                                                onClick={() => setSelectedSize('250')}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedSize === '250'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                250g
                                            </button>
                                            <button
                                                onClick={() => setSelectedSize('500')}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedSize === '500'
                                                    ? 'bg-white text-orange-600 shadow-sm'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                    }`}
                                            >
                                                500g
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <div className="text-sm text-gray-700 mt-1 font-medium">
                                    {isFamiliarPack
                                        ? packEspecialData && `${packEspecialData.items.length} platos para 4 porciones`
                                        : packEspecialData && `Elige ${packEspecialData.cantidad} proteínas`
                                    }
                                </div>
                            </div>

                            <motion.button
                                onClick={handleOpenModal}
                                className={`w-full font-black py-2.5 px-3 sm:py-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg ${isProteinsPack ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-orange-500/50' :
                                    packEspecialData?.color === 'green'
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-green-500/50'
                                        : packEspecialData?.color === 'purple'
                                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:shadow-purple-500/50'
                                            : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-orange-500/50'
                                    }`}
                                whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Package size={20} />
                                Ver detalles / Seleccionar
                            </motion.button>
                        </>
                    ) : (
                        <>
                            {/* Selector de plan - oculto para packs de promoción */}
                            {!isPromocionPack && (
                                <div className="flex gap-1 sm:gap-2 mb-3 w-full">
                                    <motion.button
                                        onClick={() => setSelectedPlan('weekly')}
                                        className={`flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-3 rounded-2xl text-[11px] sm:text-sm font-bold transition-all relative border overflow-visible ${selectedPlan === 'weekly'
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 border-orange-500'
                                            : 'bg-white text-gray-700 hover:bg-orange-50 border-gray-200 hover:border-orange-300'
                                            }`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <span className="block leading-tight mb-1 truncate text-[10px] sm:text-sm">
                                            <span className="hidden sm:inline">Semanal</span>
                                            <span className="sm:hidden">Sem</span>
                                        </span>
                                        <div className="flex justify-center -mt-0.5">
                                            <span className={`flex items-center justify-center w-6 h-6 sm:w-9 sm:h-9 rounded-full text-[7px] sm:text-[11px] font-black shadow-md transition-transform hover:scale-110 ${getPromoForPlan('semanal') ? 'bg-pink-500 text-white' : 'bg-orange-500 text-white'}`}>
                                                {getPromoDiscountLabel('weekly')}
                                            </span>
                                        </div>
                                    </motion.button>

                                    {!isProteinsPack && (
                                        <motion.button
                                            onClick={() => setSelectedPlan('biweekly')}
                                            className={`flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-3 rounded-2xl text-[11px] sm:text-sm font-bold transition-all relative border overflow-visible ${selectedPlan === 'biweekly'
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 border-orange-500'
                                                : 'bg-white text-gray-700 hover:bg-orange-50 border-gray-200 hover:border-orange-300'
                                                }`}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <span className="block leading-tight mb-1 truncate text-[10px] sm:text-sm">
                                                <span className="hidden sm:inline">Quincenal</span>
                                                <span className="sm:hidden">Quin</span>
                                            </span>
                                            <div className="flex justify-center -mt-0.5">
                                                <span className={`flex items-center justify-center w-6 h-6 sm:w-9 sm:h-9 rounded-full text-[7px] sm:text-[11px] font-black shadow-md transition-transform hover:scale-110 ${getPromoForPlan('quincenal') ? 'bg-pink-500 text-white' : 'bg-orange-500 text-white'}`}>
                                                    {getPromoDiscountLabel('biweekly')}
                                                </span>
                                            </div>
                                        </motion.button>
                                    )}

                                    <motion.button
                                        onClick={() => {
                                            setSelectedPlan('monthly');
                                            if (isProteinsPack) setSelectedSize('500');
                                        }}
                                        className={`flex-1 min-w-0 py-2 sm:py-3 px-1 sm:px-3 rounded-2xl text-[11px] sm:text-sm font-bold transition-all relative border overflow-visible ${selectedPlan === 'monthly'
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 border-orange-500'
                                            : 'bg-white text-gray-700 hover:bg-orange-50 border-gray-200 hover:border-orange-300'
                                            }`}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <span className="block leading-tight mb-1 truncate text-[10px] sm:text-sm">
                                            <span className="hidden sm:inline">Mensual</span>
                                            <span className="sm:hidden">Mes</span>
                                        </span>
                                        <div className="flex justify-center -mt-0.5">
                                            <span className={`flex items-center justify-center w-6 h-6 sm:w-9 sm:h-9 rounded-full text-[7px] sm:text-[11px] font-black shadow-md transition-transform hover:scale-110 ${getPromoForPlan('mensual') ? 'bg-pink-500 text-white' : (isTwoPack ? 'bg-purple-500 text-white' : 'bg-green-500 text-white')}`}>
                                                {getPromoDiscountLabel('monthly')}
                                            </span>
                                        </div>
                                    </motion.button>
                                </div>
                            )}


                            {isPromocionPack && (
                                <div className="mb-3 text-center">
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-xs font-bold rounded-full">
                                        🎁 ¡Desayunos GRATIS incluidos!
                                    </span>
                                </div>
                            )}

                            {/* Selector de Tamaño para Protein Packs en modo Standard */}
                            {isProteinsPack && (
                                <div className="flex justify-center mb-3">
                                    <div className="bg-gray-100 p-1 rounded-xl flex gap-1">
                                        <button
                                            onClick={() => {
                                                setSelectedSize('250');
                                                if (selectedPlan === 'monthly') setSelectedPlan('weekly');
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedSize === '250'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            250g
                                        </button>
                                        <button
                                            onClick={() => setSelectedSize('500')}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${selectedSize === '500'
                                                ? 'bg-white text-orange-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            500g
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="text-center mb-4">
                                {hasAnyDiscount ? (
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="text-sm text-gray-400 line-through">
                                            {formatPrice(getOriginalPrice())}
                                        </span>
                                        <span className="text-xl sm:text-3xl font-bold text-bikitchen-gold animate-in fade-in zoom-in duration-300">
                                            {formatPrice(getFinalPrice())}
                                        </span>
                                        {isMonthlyPlan && (
                                            <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 ${isTwoPack ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'} text-xs font-bold rounded-full`}>
                                                <span>🎉</span> {MONTHLY_DISCOUNT_PERCENT}% OFF
                                            </span>
                                        )}
                                        {hasPromoDiscount && (
                                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-bold rounded-full">
                                                <span>🎁</span> ¡PROMO!
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-xl sm:text-3xl font-bold text-bikitchen-orange">
                                        {formatPrice(getOriginalPrice())}
                                    </div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                    {isPromocionPack
                                        ? 'precio mensual'
                                        : selectedPlan === 'weekly'
                                            ? 'por semana'
                                            : selectedPlan === 'biweekly'
                                                ? 'por quincena'
                                                : isProteinsPack // Proteínas no es mensual original, es descuento también
                                                    ? 'por mes'
                                                    : 'por mes'}
                                </div>
                            </div>

                            <div className={`rounded-xl p-3 mb-4 border ${(isMonthlyPlan || isPromocionPack) ? (isTwoPack ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200') : 'bg-gray-50 border-gray-100'}`}>
                                <div className="flex items-start gap-2">
                                    <Truck size={16} className={`mt-0.5 flex-shrink-0 ${(isMonthlyPlan || isPromocionPack) ? (isTwoPack ? 'text-purple-600' : 'text-green-600') : 'text-gray-500'}`} />
                                    <div>
                                        <p className={`text-xs font-medium ${(isMonthlyPlan || isPromocionPack) ? (isTwoPack ? 'text-purple-700' : 'text-green-700') : 'text-gray-600'}`}>
                                            {getShipping()}
                                        </p>
                                        {(isMonthlyPlan || isPromocionPack) && (
                                            <p className={`text-xs font-bold mt-0.5 ${isTwoPack ? 'text-purple-600' : 'text-green-600'}`}>
                                                ✨ {is15ComidasPack && selectedPlan === 'monthly' ? '¡Envío GRATIS!' : '🔥 50% OFF en envíos'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                onClick={isProteinsPack ? handleOpenModal : handleAddToCart}
                                disabled={isMaintenance}
                                className={`w-full font-black py-2.5 px-3 sm:py-4 sm:px-6 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${isMaintenance
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xl hover:shadow-2xl hover:shadow-orange-500/50'
                                    }`}
                                whileHover={!isMaintenance ? { scale: 1.05 } : {}}
                                whileTap={!isMaintenance ? { scale: 0.95 } : {}}
                            >
                                {isMaintenance ? (
                                    <>
                                        <Info size={20} />
                                        En mantenimiento
                                    </>
                                ) : (
                                    <>
                                        <ShoppingCart size={20} />
                                        Agregar al Carrito
                                    </>
                                )}
                            </motion.button>
                        </>
                    )}
                </div>
            </motion.div>

            {/* Modal para packs especiales - usando Portal */}
            {showSpecialModal && packEspecialData && ReactDOM.createPortal(
                <AnimatePresence>
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={handleCloseModal}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-3 sm:p-4"
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                        <motion.div
                            variants={modalContentVariants}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            transition={{ duration: 0.2 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className={`bg-gradient-to-r ${packEspecialData.color === 'green'
                                ? 'from-green-500 to-emerald-600'
                                : packEspecialData.color === 'purple'
                                    ? 'from-purple-500 to-indigo-600'
                                    : 'from-bikitchen-orange to-orange-600'
                                } text-white px-4 py-3 sm:px-5 sm:py-4 flex-shrink-0`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl sm:text-2xl">
                                            {packEspecialData.emoji}
                                        </div>
                                        <div>
                                            <h3 className="text-base sm:text-lg font-bold">
                                                {isFamiliarPack ? packEspecialData.nombre : `Arma tu ${packEspecialData.nombre}`}
                                            </h3>
                                            <p className="text-white/80 text-xs sm:text-sm">
                                                {isFamiliarPack
                                                    ? `${packEspecialData.items.length} platos para 4 porciones`
                                                    : `Selecciona ${packEspecialData.cantidad} opciones`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="w-8 h-8 bg-white/20 active:bg-white/30 rounded-full flex items-center justify-center"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Contenido con scroll */}
                            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 overscroll-contain">
                                {/* Lista de items o proteínas */}
                                <div className="space-y-2 sm:space-y-3">
                                    {isProteinsPack && packEspecialData.proteinas ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                    <span className="w-6 h-6 bg-bikitchen-orange text-white rounded-lg flex items-center justify-center text-xs">🍗</span>
                                                    Elige tus proteínas
                                                </p>
                                                <span className={`text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 rounded-full ${proteinasSeleccionadas.length === packEspecialData.cantidad
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-orange-100 text-orange-700'
                                                    }`}>
                                                    {proteinasSeleccionadas.length} de {packEspecialData.cantidad}
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 sm:space-y-2">
                                                {packEspecialData.proteinas.map((proteina, index) => {
                                                    const seleccionada = proteinasSeleccionadas.includes(proteina);
                                                    const bloqueada = !seleccionada && proteinasSeleccionadas.length >= packEspecialData.cantidad;

                                                    return (
                                                        <button
                                                            key={index}
                                                            type="button"
                                                            onClick={() => toggleProteina(proteina)}
                                                            disabled={bloqueada}
                                                            className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl border-2 transition-colors ${seleccionada
                                                                ? 'bg-bikitchen-orange/10 border-bikitchen-orange'
                                                                : bloqueada
                                                                    ? 'bg-gray-100 border-gray-200 opacity-50'
                                                                    : 'bg-white border-gray-200'
                                                                }`}
                                                        >
                                                            <span className={`font-medium text-sm ${seleccionada
                                                                ? 'text-bikitchen-orange'
                                                                : 'text-gray-700'
                                                                }`}>
                                                                {proteina}
                                                            </span>
                                                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center ${seleccionada
                                                                ? 'bg-bikitchen-orange border-bikitchen-orange'
                                                                : 'border-gray-300'
                                                                }`}>
                                                                {seleccionada && <Check size={12} className="text-white" />}
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    ) : packEspecialData.items ? (
                                        <>
                                            <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                                <span className={`w-6 h-6 ${packEspecialData.color === 'green' ? 'bg-green-500' : 'bg-purple-500'} text-white rounded-lg flex items-center justify-center text-xs`}>📋</span>
                                                Este pack incluye:
                                            </p>
                                            {/* Lista de Items / Proteínas para selección */}
                                            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 custom-scrollbar">
                                                {isProteinsPack && packEspecialData.proteinas ? (
                                                    <div className="space-y-4">
                                                        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                                            <p className="text-sm text-orange-800 font-medium text-center">
                                                                Selecciona <span className="font-bold">{packEspecialData.cantidad}</span> proteínas para tu pack
                                                            </p>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {packEspecialData.proteinas.map((proteina, idx) => {
                                                                const isSelected = proteinasSeleccionadas.includes(proteina);
                                                                const isDisabled = !isSelected && proteinasSeleccionadas.length >= packEspecialData.cantidad;

                                                                return (
                                                                    <motion.div
                                                                        key={idx}
                                                                        onClick={() => {
                                                                            if (isDisabled) return;
                                                                            if (isSelected) {
                                                                                setProteinasSeleccionadas(prev => prev.filter(p => p !== proteina));
                                                                            } else {
                                                                                setProteinasSeleccionadas(prev => [...prev, proteina]);
                                                                            }
                                                                        }}
                                                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${isSelected
                                                                            ? 'border-orange-500 bg-orange-50 shadow-md'
                                                                            : isDisabled
                                                                                ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                                                                                : 'border-gray-100 hover:border-orange-200 hover:bg-white'
                                                                            }`}
                                                                        whileHover={!isDisabled ? { scale: 1.01 } : {}}
                                                                        whileTap={!isDisabled ? { scale: 0.99 } : {}}
                                                                    >
                                                                        <span className={`font-medium ${isSelected ? 'text-orange-900' : 'text-gray-700'}`}>
                                                                            {proteina}
                                                                        </span>
                                                                        {isSelected && (
                                                                            <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white">
                                                                                <Check size={14} strokeWidth={3} />
                                                                            </div>
                                                                        )}
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* Renderizado normal para otros packs */
                                                    packEspecialData.items && packEspecialData.items.map((item, index) => (
                                                        <motion.div
                                                            key={index}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            className={`p-3 sm:p-4 rounded-xl border border-gray-100 flex items-start gap-3 ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}`}
                                                        >
                                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${packEspecialData.color === 'green'
                                                                ? 'bg-green-100 text-green-700'
                                                                : packEspecialData.color === 'purple'
                                                                    ? 'bg-purple-100 text-purple-700'
                                                                    : 'bg-orange-100 text-orange-700'
                                                                }`}>
                                                                {index + 1}
                                                            </div>
                                                            <span className="text-gray-700 text-sm sm:text-base font-medium leading-tight">{item}</span>
                                                        </motion.div>
                                                    ))
                                                )}
                                            </div>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex-shrink-0 px-4 py-3 sm:px-5 sm:py-4 bg-gray-50 border-t border-gray-100">
                                <div className="space-y-1 mb-2 sm:mb-3">
                                    <div className="flex justify-between text-sm sm:text-base font-bold text-gray-900">
                                        <span>Precio total ({getPlanLabel()}):</span>
                                        <span className={
                                            packEspecialData.color === 'green'
                                                ? 'text-green-600'
                                                : packEspecialData.color === 'purple'
                                                    ? 'text-purple-600'
                                                    : 'text-bikitchen-orange'
                                        }>
                                            {formatPrice(getFinalPrice())}
                                        </span>
                                    </div>
                                    {isProteinsPack && proteinasSeleccionadas.length > 0 && (
                                        <p className="text-xs text-gray-500 truncate">
                                            {proteinasSeleccionadas.join(', ')}
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isProteinsPack) {
                                            if (proteinasSeleccionadas.length !== packEspecialData.cantidad) return;

                                            // Usar precio ya calculado del periodo seleccionado
                                            const finalPrice = getFinalPrice();
                                            const categoryLabel = PACKS_DATA?.[category]?.title;

                                            addToCart({
                                                id: `${category}-${pack.name}-${Date.now()}`,
                                                name: pack.name, // Nombre completo con (250g)
                                                desc: `Incluye: ${proteinasSeleccionadas.join(', ')}`,
                                                proteinas: proteinasSeleccionadas,
                                                price: finalPrice,
                                                quantity: 1,
                                                plan: selectedPlan, // Usar plan seleccionado (weekly/biweekly/monthly)
                                                planLabel: getPlanLabel(),
                                                image: packImage,
                                                category,
                                                categoryLabel
                                            });
                                            toast.success(`${pack.name} agregado al carrito`);
                                        } else {
                                            addToCart({
                                                id: `pack-familiar-${pack.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                                                name: packEspecialData.nombre,
                                                desc: `Incluye ${packEspecialData.items?.length || 0} platos para 4 porciones`,
                                                price: getFinalPrice(), // USAR PRECIO CALCULADO
                                                quantity: 1,
                                                plan: selectedPlan, // USAR PLAN SELECCIONADO
                                                planLabel: getPlanLabel(),
                                                image: packImage,
                                                // Metadatos adicionales
                                                category,
                                                categoryLabel: PACKS_DATA?.[category]?.title
                                            });
                                            toast.success(`${packEspecialData.nombre} agregado al carrito`);
                                        }
                                        handleCloseModal();
                                        setProteinasSeleccionadas([]);
                                    }}
                                    disabled={isProteinsPack && proteinasSeleccionadas.length !== packEspecialData.cantidad}
                                    className={`w-full ${packEspecialData.color === 'green'
                                        ? 'bg-green-500 active:bg-green-600'
                                        : packEspecialData.color === 'purple'
                                            ? 'bg-purple-500 active:bg-purple-600'
                                            : 'bg-bikitchen-orange active:bg-bikitchen-orange-dark'
                                        } text-white font-bold py-3 sm:py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <ShoppingCart size={18} />
                                    <span className="text-sm sm:text-base">
                                        {isProteinsPack
                                            ? (proteinasSeleccionadas.length === packEspecialData.cantidad
                                                ? `Agregar — ${formatPrice(getFinalPrice())}`
                                                : `Selecciona ${packEspecialData.cantidad - proteinasSeleccionadas.length} más`)
                                            : `Agregar — ${formatPrice(getFinalPrice())}`
                                        }
                                    </span>
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Determinar qué modal usar según el tipo de pack */}
            {category === '10_comidas' ? (
                <MenuDetailsModalWithTabs
                    menuKey={menuKey}
                    isOpen={showMenuModal}
                    onClose={() => setShowMenuModal(false)}
                    mealTypes={['almuerzo', 'cena']}
                    packInfo={{
                        name: pack.name,
                        desc: pack.desc,
                        icon: pack.icon,
                        price: formatPrice(getFinalPrice()),
                        numericPrice: getFinalPrice(),
                        originalPrice: hasDiscount ? formatPrice(getOriginalPrice()) : null,
                        plan: selectedPlan,
                        planLabel: getPlanLabel(),
                        image: packImage
                    }}
                />
            ) : category === 'desayuno_almuerzo_cena' ? (
                <MenuDetailsModalWithTabs
                    menuKey={menuKey}
                    isOpen={showMenuModal}
                    onClose={() => setShowMenuModal(false)}
                    mealTypes={['desayuno', 'almuerzo', 'cena']}
                    customTabContent={menuKey === 'keto' ? {
                        desayuno: (
                            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl">
                                    🥑
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800 mb-2">Desayunos Keto</h3>
                                    <p className="text-gray-600 max-w-xs mx-auto mb-6">
                                        Para ofrecerte la mejor variedad y frescura en tu dieta Keto, manejamos los desayunos bajo pedido especial.
                                    </p>
                                    <a
                                        href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent('Hola, quisiera más información sobre el desayuno keto')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-green-500/30 transform hover:-translate-y-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                                        Más información sobre desayunos
                                    </a>
                                </div>
                            </div>
                        )
                    } : {}}
                    packInfo={{
                        name: pack.name,
                        desc: tienePromo ? `${pack.desc} • ${promoActiva.titulo}` :
                            (isPromocionPack ? `${pack.desc} • Desayunos GRATIS • Envío 10%` :
                                (isMonthlyPlan ? `${pack.desc} • ${MONTHLY_DISCOUNT_PERCENT}% dto. mensual • ${is15ComidasPack ? 'Envío GRATIS' : '50% OFF en envío'}` :
                                    (hasDiscount && pack.etiquetaTexto ? `${pack.desc} • ${pack.etiquetaTexto}` : pack.desc))),
                        icon: pack.icon,
                        price: formatPrice(getFinalPrice()),
                        numericPrice: getFinalPrice(),
                        originalPrice: hasAnyDiscount ? formatPrice(getOriginalPrice()) : null,
                        plan: selectedPlan,
                        planLabel: getPlanLabel(),
                        image: packImage,
                        discountBadge: tienePromo ? '🎁 PROMO Activa' :
                            (isPromocionPack ? '🎁 PROMO Desayunos' :
                                (isMonthlyPlan ? `${MONTHLY_DISCOUNT_PERCENT}% OFF Mensual` :
                                    (hasDiscount ? pack.etiquetaTexto : null)))
                    }}
                />
            ) : isPromocionPack ? (
                <MenuDetailsModalWithTabs
                    menuKey={menuKey}
                    isOpen={showMenuModal}
                    onClose={() => setShowMenuModal(false)}
                    mealTypes={['desayuno', 'almuerzo']}
                    packInfo={{
                        name: pack.name,
                        desc: pack.desc,
                        icon: pack.icon,
                        price: formatPrice(getFinalPrice()),
                        numericPrice: getFinalPrice(),
                        originalPrice: hasDiscount ? formatPrice(getOriginalPrice()) : null,
                        plan: selectedPlan,
                        planLabel: getPlanLabel(),
                        image: packImage
                    }}
                />
            ) : (
                <MenuDetailsModal
                    menuKey={menuKey}
                    isOpen={showMenuModal}
                    onClose={() => setShowMenuModal(false)}
                    packInfo={{
                        name: pack.name,
                        desc: pack.desc,
                        icon: pack.icon,
                        price: formatPrice(getFinalPrice()),
                        numericPrice: getFinalPrice(),
                        originalPrice: hasDiscount ? formatPrice(getOriginalPrice()) : null,
                        plan: selectedPlan,
                        planLabel: getPlanLabel(),
                        image: packImage
                    }}
                />
            )}
        </>
    );
});

const PackSection = memo(({ category, data, promociones = [], packImages = {}, packsEspeciales }) => {
    return (
        <section id={`pack-${category}`} className="mb-16 sm:mb-24 scroll-mt-40">
            <motion.div
                className="text-center mb-8 sm:mb-14"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <div className="text-5xl sm:text-7xl mb-4 sm:mb-6">{data.icon}</div>
                <div className="inline-block mb-4 sm:mb-5">
                    <h2 className="text-2xl sm:text-4xl font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3 sm:px-10 sm:py-4 rounded-full shadow-2xl shadow-orange-500/40">
                        {data.title}
                    </h2>
                </div>
                <p className="text-base sm:text-xl text-gray-600 px-4 font-medium">{data.subtitle}</p>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {data.packs.map((pack, index) => (
                    <PackCard
                        key={index}
                        pack={pack}
                        shipping={data.shipping}
                        category={category}
                        promociones={promociones}
                        customImage={packImages[pack.name]}
                        packsEspeciales={packsEspeciales}
                    />
                ))}
            </div>
        </section>
    );
});

export default function PacksPage() {
    const location = useLocation();
    const { isChristmasMode } = useChristmas();
    const showPromoBanner = usePromoBanner();
    const { whatsappPhone } = useWhatsApp();
    const [packsData, setPacksData] = useState(PACKS_DATA);
    const [promociones, setPromociones] = useState([]);
    const [activeFilter, setActiveFilter] = useState('todos');
    const [isSticky, setIsSticky] = useState(false);
    const [packImages, setPackImages] = useState({}); // { packName: imageUrl }
    const [isLoading, setIsLoading] = useState(true);
    const [packsEspeciales, setPacksEspeciales] = useState(PACKS_ESPECIALES_BASE);
    const packsContainerRef = useRef(null);



    // Track ViewContent cuando se carga la página de packs
    useEffect(() => {
        trackViewContent({
            id: 'packs-page',
            name: 'Packs Semanales',
            category: 'Meal Plans',
            price: 0
        });
    }, []);

    // Estado para controlar la posición de la barra sticky respecto al navbar
    const [isNavbarVisible, setIsNavbarVisible] = useState(true);

    // Escuchar cambios en la visibilidad del navbar para ajustar el top de la barra sticky
    useEffect(() => {
        const handleNavbarChange = (e) => {
            setIsNavbarVisible(e.detail?.visible ?? true);
        };
        window.addEventListener('navbarVisibilityChange', handleNavbarChange);
        return () => window.removeEventListener('navbarVisibilityChange', handleNavbarChange);
    }, []);

    // Scroll al hash cuando se carga la página
    useEffect(() => {
        if (location.hash) {
            // Esperar a que el DOM se renderice
            setTimeout(() => {
                const element = document.querySelector(location.hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 500);
        }
    }, [location.hash]);

    // Manejar scroll para filtros sticky
    useEffect(() => {
        const handleScroll = () => {
            const threshold = 450;
            setIsSticky(window.scrollY > threshold);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Filtrar packs según categoría seleccionada (memoizado)
    const getFilteredPacks = useCallback((packs, sectionKey) => {
        if (activeFilter === 'todos') return packs;
        const filterConfig = PACK_FILTERS.find(f => f.id === activeFilter);

        // Si el filtro es por sección y NO coincide, devolver vacío (se filtrará arriba)
        // Pero aquí solo filtramos los items si la sección coincide o si es filtro por items
        if (!filterConfig) return packs;

        if (filterConfig.section) {
            // Si el filtro es de sección, solo nos importa si la sección coincide
            return packs;
        }

        // Si es filtro por items (ej. Casaditos), filtrar la lista
        if (filterConfig.packs) {
            return packs.filter(pack => filterConfig.packs.includes(pack.name));
        }

        return packs;
    }, [activeFilter]);

    // Datos filtrados memoizados - AHORA soporta secciones completas
    const filteredPacksData = useMemo(() => {
        const filterConfig = PACK_FILTERS.find(f => f.id === activeFilter);
        const sectionFilter = filterConfig?.section;

        return Object.entries(packsData)
            .filter(([key]) => !sectionFilter || sectionFilter === key) // Filtro de nivel superior (Sección)
            .map(([key, data]) => ({
                key,
                data: { ...data, packs: getFilteredPacks(data.packs, key) }
            }))
            .filter(({ data }) => data.packs.length > 0);
    }, [packsData, getFilteredPacks, activeFilter]);

    // Usar hook que recarga menús automáticamente cuando la página vuelve a estar visible
    const { menus: menusData, dataVersion } = useMenusRefresh();

    // Cargar imágenes, precios y promociones desde Firestore
    useEffect(() => {
        const loadAllData = async () => {
            setIsLoading(true);
            try {
                // Cargar imágenes, precios y promociones en paralelo
                const [imagesMap, activePromos, pricesFromDb] = await Promise.all([
                    cachedFetch('packs_images_map', async () => {
                        // 1) Intentar leer un único documento agregado: config/pack_images
                        try {
                            const ref = doc(db, 'config', 'pack_images');
                            const snap = await getDoc(ref);
                            if (snap.exists()) {
                                const data = snap.data() || {};
                                const source = data.images || data;
                                const map = {};
                                Object.keys(source || {}).forEach((name) => {
                                    const url = source[name];
                                    if (url) map[name] = cleanFirebaseUrl(url);
                                });
                                return map;
                            }
                        } catch (_) { }
                        // 2) Fallback: coleccion packs_imagenes (legacy)
                        const map = {};
                        const snap = await getDocs(collection(db, 'packs_imagenes'));
                        snap.forEach((docSnap) => {
                            const data = docSnap.data();
                            if (data?.imagenUrl && data?.packName) {
                                map[data.packName] = cleanFirebaseUrl(data.imagenUrl);
                            }
                        });
                        return map;
                    }, 'pack_images'),
                    getActivePromotions(),
                    getPackPrices()
                ]);

                // Aplicar imágenes cacheadas
                setPackImages(imagesMap || {});

                // CRÍTICO: Aplicar precios Y descuentos de Firebase a packsData
                if (pricesFromDb && Object.keys(pricesFromDb).length > 0) {
                    const updatedPacksData = JSON.parse(JSON.stringify(PACKS_DATA)); // deep copy

                    Object.keys(pricesFromDb).forEach(categoryKey => {
                        if (updatedPacksData[categoryKey] && pricesFromDb[categoryKey]?.packs) {
                            const pricesForCategory = pricesFromDb[categoryKey].packs;

                            updatedPacksData[categoryKey].packs = updatedPacksData[categoryKey].packs.map(pack => {
                                const priceData = pricesForCategory[pack.name];
                                if (priceData) {
                                    return {
                                        ...pack,
                                        // Precios (solo sobreescribir si están definidos en DB)
                                        ...(priceData.weekly !== undefined && { weekly: priceData.weekly }),
                                        ...(priceData.biweekly !== undefined && { biweekly: priceData.biweekly }),
                                        ...(priceData.monthly !== undefined && { monthly: priceData.monthly }),
                                        ...(priceData.monthlyOriginal !== undefined && { monthlyOriginal: priceData.monthlyOriginal }),
                                        // Precios de proteínas 500g
                                        ...(priceData.weekly_500 !== undefined && { weekly_500: priceData.weekly_500 }),
                                        ...(priceData.biweekly_500 !== undefined && { biweekly_500: priceData.biweekly_500 }),
                                        ...(priceData.monthly_500 !== undefined && { monthly_500: priceData.monthly_500 }),
                                        // Config de descuento (PackDiscountsView)
                                        descuentoActivo: priceData.descuentoActivo ?? false,
                                        tipoDescuento: priceData.tipoDescuento ?? 'porcentaje',
                                        valorDescuento: priceData.valorDescuento ?? 0,
                                        etiquetaTexto: priceData.etiquetaTexto ?? '',
                                        mostrarEtiqueta: priceData.mostrarEtiqueta ?? true,
                                        fechaInicio: priceData.fechaInicio ?? null,
                                        fechaFin: priceData.fechaFin ?? null,
                                    };
                                }
                                return pack;
                            });
                        }
                    });

                    setPacksData(updatedPacksData);
                    console.log('[PacksPage] Precios y descuentos actualizados desde Firebase');
                }

                // Guardar promociones
                setPromociones(activePromos);

            } catch (error) {
                console.error('[PacksPage] Error loading data:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadAllData();
    }, []);

    // Procesar menús cuando cambien (se ejecuta cuando dataVersion cambia)
    useEffect(() => {
        if (menusData) {
            const updatedPacksEspeciales = { ...PACKS_ESPECIALES_BASE };

            // Pack Familiar Premium
            if (menusData.familiarPremium && Array.isArray(menusData.familiarPremium)) {
                updatedPacksEspeciales['Pack Familiar Premium'].items = menusData.familiarPremium.map(
                    plato => plato.proteina || ''
                );
            }

            // Pack Familiar Deluxe
            if (menusData.familiarDeluxe && Array.isArray(menusData.familiarDeluxe)) {
                updatedPacksEspeciales['Pack Familiar Deluxe'].items = menusData.familiarDeluxe.map(
                    plato => plato.proteina || ''
                );
            }

            // Cargar proteínas disponibles para packs de 3 y 5 proteínas
            if (menusData.proteinasDisponibles && Array.isArray(menusData.proteinasDisponibles)) {
                if (updatedPacksEspeciales['Pack 3 Proteínas']) {
                    updatedPacksEspeciales['Pack 3 Proteínas'].proteinas = menusData.proteinasDisponibles;
                }
                if (updatedPacksEspeciales['Pack 5 Proteínas']) {
                    updatedPacksEspeciales['Pack 5 Proteínas'].proteinas = menusData.proteinasDisponibles;
                }
            }

            setPacksEspeciales(updatedPacksEspeciales);
        }
    }, [menusData, dataVersion]);

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero Section */}
                <header
                    className="relative pt-28 pb-20 md:pt-36 md:pb-24 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white overflow-hidden"
                    style={{
                        paddingTop: showPromoBanner
                            ? `calc(var(--promo-banner-height, 0px) + 112px)`
                            : undefined
                    }}
                >
                    {/* Decorative orbs */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/30 to-transparent rounded-full blur-3xl"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl"></div>
                    {/* Pattern overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:40px_40px] opacity-40"></div>

                    <div className="container relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                        >
                            <motion.span
                                className="inline-block mb-6 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-base font-bold border border-white/30 shadow-xl"
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            >
                                🍽️ Planes Semanales Premium
                            </motion.span>
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 drop-shadow-lg leading-tight">
                                Elige Tu Pack Ideal
                            </h1>
                            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto font-medium text-white/95 leading-relaxed">
                                Planes flexibles que se adaptan a tu estilo de vida y objetivos
                            </p>
                            <motion.div
                                className="flex flex-wrap justify-center gap-4 text-base mb-8"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.5 }}
                            >
                                <div className={`flex items-center gap-2 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg font-semibold ${isChristmasMode
                                    ? 'bg-white border-2 border-white text-gray-800'
                                    : 'bg-white/25 border border-white/30 text-white'
                                    }`}>
                                    <Check size={18} className={`flex-shrink-0 ${isChristmasMode ? 'text-green-600' : 'text-white'}`} />
                                    <span>7 opciones de packs</span>
                                </div>
                                <div className={`flex items-center gap-2 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg font-semibold ${isChristmasMode
                                    ? 'bg-white border-2 border-white text-gray-800'
                                    : 'bg-white/25 border border-white/30 text-white'
                                    }`}>
                                    <Check size={18} className={`flex-shrink-0 ${isChristmasMode ? 'text-green-600' : 'text-white'}`} />
                                    <span>Semanal, quincenal o mensual</span>
                                </div>
                                <div className={`flex items-center gap-2 backdrop-blur-md px-5 py-3 rounded-2xl shadow-lg font-semibold ${isChristmasMode
                                    ? 'bg-white border-2 border-white text-gray-800'
                                    : 'bg-white/25 border border-white/30 text-white'
                                    }`}>
                                    <Check size={18} className={`flex-shrink-0 ${isChristmasMode ? 'text-green-600' : 'text-white'}`} />
                                    <span>Envío disponible</span>
                                </div>
                            </motion.div>
                            <motion.a
                                href="/comparador"
                                className="inline-flex items-center gap-3 bg-white/90 text-orange-600 px-8 py-4 rounded-2xl font-black text-lg shadow-2xl hover:shadow-xl transition-all hover:bg-white"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.5 }}
                            >
                                <Package size={22} />
                                Comparar todos los packs
                            </motion.a>
                        </motion.div>
                    </div>
                </header>

                {/* Filtros */}
                {/* Sticky Filter Bar - Mobile Optimized */}
                <div className={`sticky top-0 z-40 transition-all duration-300 ${isSticky
                    ? 'bg-white/95 backdrop-blur-xl shadow-lg shadow-gray-200/50 py-3'
                    : 'bg-white py-4 border-b border-gray-100'
                    }`}
                    style={{ top: isNavbarVisible && isSticky ? 'var(--navbar-height, 70px)' : '0px' }}
                >
                    <div className="container mx-auto px-4">
                        <div className="flex overflow-x-auto gap-2 pb-2 pt-1 hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 items-center">
                            {PACK_FILTERS.map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={(e) => {
                                        setActiveFilter(filter.id);
                                        // 1. Centrar la píldora
                                        e.currentTarget.scrollIntoView({
                                            behavior: 'smooth',
                                            block: 'nearest',
                                            inline: 'center'
                                        });

                                        // 2. Scroll INMEDIATO (auto) para evitar "clamping" al footer
                                        // Usamos setTimeout para esperar a que React renderice el nuevo contenido
                                        // y la altura de la página se ajuste antes de scrolear.
                                        if (window.scrollY > 500) {
                                            setTimeout(() => {
                                                window.scrollTo({
                                                    top: 420,
                                                    behavior: 'auto'
                                                });
                                            }, 0);
                                        }
                                    }}
                                    className={`
                                        whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center gap-2 border flex-shrink-0
                                        ${activeFilter === filter.id
                                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-transparent shadow-lg shadow-orange-500/30 scale-105'
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-white hover:border-orange-200 hover:text-orange-600'
                                        }
                                    `}
                                >
                                    <span className="text-lg">{filter.icon}</span>
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <style>{`
                    .hide-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .hide-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>

                <main ref={packsContainerRef} className="container py-10 sm:py-16 pb-24 sm:pb-32">
                    {isLoading ? (
                        // Skeleton loader mientras cargan imágenes y datos
                        <div className="space-y-16">
                            {[1, 2, 3].map((section) => (
                                <div key={section} className="space-y-8">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 animate-pulse"></div>
                                        <div className="h-10 w-64 bg-gray-200 rounded-full mx-auto mb-3 animate-pulse"></div>
                                        <div className="h-5 w-48 bg-gray-200 rounded mx-auto animate-pulse"></div>
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                                        {[1, 2, 3, 4].map((card) => (
                                            <div key={card} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                                                <div className="aspect-[4/3] bg-gray-200 animate-pulse"></div>
                                                <div className="p-4 space-y-3">
                                                    <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4"></div>
                                                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                                                    <div className="h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            <motion.div
                                key={activeFilter}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                {filteredPacksData.length > 0 ? (
                                    filteredPacksData.map(({ key, data }) => (
                                        <PackSection
                                            key={key}
                                            category={key}
                                            data={data}
                                            promociones={promociones}
                                            packImages={packImages}
                                            packsEspeciales={packsEspeciales}
                                        />
                                    ))
                                ) : (
                                    <div className="text-center py-20">
                                        <div className="text-4xl mb-4">🔦</div>
                                        <h3 className="text-xl font-bold text-gray-800">No encontramos packs con ese filtro</h3>
                                        <button
                                            onClick={() => setActiveFilter('todos')}
                                            className="mt-4 text-orange-500 hover:underline font-bold"
                                        >
                                            Ver todos los packs
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}

                    <div className="mt-16 bg-gradient-to-r from-bikitchen-orange/10 to-bikitchen-gold/10 border border-bikitchen-orange/20 rounded-2xl p-8 text-center">
                        <Info size={28} className="text-bikitchen-orange mx-auto mb-4" />
                        <p className="text-gray-600 text-sm max-w-2xl mx-auto">
                            *Los menús se actualizan cada sábado según la planificación del equipo BiKitchen.
                            Los ingredientes pueden variar levemente según disponibilidad.
                        </p>
                    </div>

                    <div className="mt-6 bg-bikitchen-gold/10 border border-bikitchen-gold/30 rounded-2xl p-6">
                        <div className="flex items-start gap-3">
                            <Info size={22} className="text-bikitchen-orange flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-bold text-gray-900 mb-1">Información Importante</h3>
                                <p className="text-gray-600 text-sm">
                                    Consulta con nosotros las zonas de entrega y costos de envío.
                                </p>
                            </div>
                        </div>
                    </div>
                </main>

                <Footer />
            </div>
        </PageTransition>
    );
}
