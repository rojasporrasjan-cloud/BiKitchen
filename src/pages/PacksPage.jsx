import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import SmoothImage from '../components/SmoothImage';
import { ShoppingCart, Truck, Check, Info, Eye, X, Gift, Tag, Filter, Flame, Leaf, Users, Zap, Package, Edit, Plus, MessageSquare, ChevronDown } from 'lucide-react';
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
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { cleanFirebaseUrl } from '../utils/firebaseUrl';
import { cachedFetch, invalidateCache } from '../utils/firestoreCache';
import { trackViewContent } from '../services/facebookPixel';
import { useMenusRefresh } from '../hooks/useMenusRefresh';
import { usePromoBanner } from '../hooks/usePromoBanner';
import useWhatsApp from '../hooks/useWhatsApp';
import { useChristmas } from '../context/ChristmasContext';
// import { RatingDisplay } from '../components/ReviewSystem'; // Deshabilitado temporalmente
import { formatDishItem } from '../utils/menuUtils';

// Categorías de filtro para packs — orden definido por el usuario
const PACK_FILTERS = [
    { id: 'todos', label: 'Todos', icon: '✨' },
    { id: 'proteinas', label: 'Proteínas', icon: '🥩', packs: ['Pack 3 Proteínas', 'Pack 5 Proteínas'], groupId: 'diet' },
    { id: 'two_pack', label: 'Two Pack', icon: '👥', section: 'two_pack', groupId: 'main' },
    { id: 'sin_carbos', label: 'Sin Carbos', icon: '🥩', packs: ['Pack Sin Carbos'], groupId: 'diet' },
    { id: 'bajo_calorias', label: 'Bajo Calorías', icon: '🥗', packs: ['Pack Bajo Calorías'], groupId: 'diet' },
    { id: 'familiar', label: 'Familiar', icon: '👨‍👩‍👧‍👦', section: 'familiar', groupId: 'main' },
    { id: 'casaditos', label: 'Casaditos', icon: '🍚', packs: ['Pack Casaditos'], groupId: 'diet' },
    { id: 'full_pack', label: 'Full Pack', icon: '🍽️', packs: ['Full Pack'], groupId: 'diet' },
    { id: 'keto', label: 'Keto', icon: '🥑', packs: ['Pack Keto'], groupId: 'diet' },
    { id: 'vegetariano', label: 'Vegetariano', icon: '🥦', packs: ['Pack Vegetariano'], groupId: 'diet' },
    { id: 'desayunos', label: 'Desayunos', icon: '🍳', section: 'desayunos', groupId: 'extra' },
];

const PACK_GROUPS = [
    { id: 'todos', label: 'Todos', icon: '✨' },
    { id: 'main', label: 'Planes Pro', icon: '⭐️' },
    { id: 'diet', label: 'Por Dieta', icon: '🥗' },
    { id: 'extra', label: 'Añadidos', icon: '➕' }
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
    },
    'Pack de Desayunos': {
        nombre: 'Pack de Desayunos',
        emoji: '🍳',
        color: 'yellow',
        items: [],
        itemsVeg: []
    }
};

const PackCard = memo(({ pack, shipping, category, categoryLabel: customCategoryLabel, promociones = [], customImage, packsEspeciales, 
    desayunosMenu = [], desayunosVegetarianos = [], onOpenDesayunos, onEditDesayunos, onEditProteinas }) => {
    const isProteinsPack =
        category === 'proteinas' &&
        (pack.name.includes('Pack 3 Proteínas') || pack.name.includes('Pack 5 Proteínas'));

    const isBreakfastPack = category === 'desayunos';

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
    
    // Etiqueta de categoría para el badge flotante (Fallback: prop > PACKS_DATA > category)
    const displayCategoryLabel = customCategoryLabel || PACKS_DATA[category]?.title || category;

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

        // INTERCEPTAR: Si es pack de desayunos, abrir modal de desayunos
        if (isBreakfastPack) {
            onOpenDesayunos?.();
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
                layout
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -8, scale: 1.01 }}
                transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className={`group bg-white rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-500 border-2 border-gray-50 hover:border-orange-200 overflow-hidden h-full flex flex-col ${pack.featured ? 'ring-2 ring-orange-500 ring-offset-4' : ''}`}
            >
                {/* Imagen principal del pack */}
                <div className="relative h-52 sm:h-52 overflow-hidden">
                    <SmoothImage
                        src={packImage}
                        alt={pack.name}
                        className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        aspectRatio=""
                        placeholderColor="bg-gradient-to-br from-gray-100 to-gray-50"
                    />
                    
                    {/* Overlay Gradiente Premium y Acción de Click */}
                    <div 
                        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500 cursor-pointer flex flex-col items-center justify-center"
                        onClick={() => setShowMenuModal(true)}
                    >
                        <motion.div 
                            className="bg-white/20 backdrop-blur-md rounded-full p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0"
                            whileHover={{ scale: 1.1 }}
                        >
                            <Eye className="text-white" size={32} />
                        </motion.div>
                        <span className="text-white text-[10px] font-black uppercase tracking-widest mt-2 opacity-0 group-hover:opacity-100 transition-all duration-300">Ver Menú Semanal</span>
                    </div>

                    {/* Emoji flotante con Glassmorphism */}
                    <motion.div
                        className="absolute bottom-5 left-5 w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center text-4xl shadow-2xl border border-white/30"
                        whileHover={{ scale: 1.1, rotate: 10 }}
                    >
                        {pack.icon}
                    </motion.div>

                    {/* Label de Categoría / Cantidad — MUY VISIBLE para evitar confusiones */}
                    {displayCategoryLabel && (
                        <div className="absolute top-5 left-5 z-20">
                            <div className="bg-gray-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-2xl border border-white/20 uppercase tracking-widest">
                                <Package size={14} className="text-orange-400" />
                                {displayCategoryLabel}
                            </div>
                        </div>
                    )}

                    {/* Badge de Selección Pro (si es destacado y no hay etiqueta o se quiere mantener) */}
                    {pack.featured && !displayCategoryLabel && (
                        <div className="absolute top-5 left-5 z-10 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                            Selección Pro
                        </div>
                    )}
                    
                    {/* Botón de Edición para Admins (Proteínas o Desayunos) */}
                    {isAdmin && (isProteinsPack || isBreakfastPack) && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isProteinsPack) onEditProteinas?.();
                                else onEditDesayunos?.();
                            }}
                            className="absolute bottom-5 right-5 z-20 bg-white/30 backdrop-blur-md hover:bg-white/50 text-white p-2.5 rounded-xl shadow-lg border border-white/20 transition-all hover:scale-110 active:scale-95"
                        >
                            <Edit size={18} />
                        </button>
                    )}

                    {/* Sello de Descuento / Promo */}
                    {(hasDiscount || tienePromo) && (
                        <motion.div
                            className="absolute top-5 right-5 z-10"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                        >
                            <div className="bg-white/95 backdrop-blur-md text-orange-600 px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xl border border-orange-100">
                                <Gift size={14} className="animate-bounce" />
                                {pack.etiquetaTexto || 'OFERTA'}
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="p-4 sm:p-5 flex flex-col gap-2.5 flex-1">
                    {/* Título y descripción */}
                    <div className="flex-1">
                        <div className="flex items-center justify-between gap-4 mb-1">
                            <h3 className="text-lg sm:text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors leading-tight">
                                {pack.name}
                            </h3>
                            <button 
                                onClick={() => setShowMenuModal(true)}
                                className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all shadow-sm"
                                title="Ver detalles del menú"
                            >
                                <Eye size={20} />
                            </button>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
                            {pack.desc}
                        </p>
                    </div>

                    {/* Selector de plan con UI mejorada */}
                    {!isPromocionPack && !isSpecialPack && (
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Selecciona tu Plan</p>
                            <div className="grid grid-cols-3 gap-1.5 bg-gray-50 p-1.5 rounded-[1.5rem] border border-gray-100">
                                {['weekly', 'biweekly', 'monthly'].map((plan) => {
                                    if (isProteinsPack && plan === 'biweekly') return null;
                                    const isActive = selectedPlan === plan;
                                    const labels = { weekly: 'Semanal', biweekly: 'Quinc.', monthly: 'Mensual' };
                                    return (
                                        <button
                                            key={plan}
                                            onClick={() => {
                                                setSelectedPlan(plan);
                                                if (isProteinsPack && plan === 'monthly') setSelectedSize('500');
                                            }}
                                            className={`py-1.5 px-0.5 rounded-xl text-[9px] xs:text-[9.5px] sm:text-[10px] font-black transition-all duration-300 relative whitespace-nowrap overflow-hidden text-ellipsis ${
                                                isActive 
                                                ? 'bg-white text-orange-600 shadow-md border-orange-100' 
                                                : 'text-gray-400 hover:text-gray-600'
                                            } border border-transparent`}
                                        >
                                            <span className="relative z-10">{labels[plan]}</span>
                                            {isActive && (
                                                <motion.div 
                                                    layoutId="activePlan" 
                                                    className="absolute inset-0 bg-white rounded-2xl shadow-sm -z-10 border border-orange-100" 
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Selector de Tamaño para Proteínas */}
                    {isProteinsPack && (
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tamaño</span>
                            <div className="flex gap-2">
                                {['250', '500'].map(size => (
                                    <button
                                        key={size}
                                        onClick={() => setSelectedSize(size)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                                            selectedSize === size 
                                            ? 'bg-orange-500 text-white shadow-md' 
                                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                        }`}
                                    >
                                        {size}g
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Area de Precio */}
                    <div className="flex flex-col items-center py-1">
                        {hasAnyDiscount ? (
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-300 line-through font-bold">
                                    {formatPrice(getOriginalPrice())}
                                </span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl sm:text-3xl font-black text-gray-900 group-hover:text-orange-600 transition-colors">
                                        {formatPrice(getFinalPrice())}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-2xl sm:text-3xl font-black text-gray-900">
                                {formatPrice(getOriginalPrice())}
                            </div>
                        )}
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">
                            Cobro {getPlanLabel().toLowerCase()}
                        </p>
                    </div>

                    {/* Envío Info Box */}
                    <div className="mt-auto bg-gray-50 rounded-2xl p-3 border border-gray-100 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400">
                            <Truck size={20} />
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] sm:text-xs font-bold text-gray-600 leading-tight">
                                {getShipping()}
                            </p>
                            {(isMonthlyPlan || isPromocionPack) && (
                                <p className="text-[10px] font-black text-green-600 mt-1 uppercase tracking-tighter">
                                    🔥 Beneficio Premium Activo
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Action Button */}
                    <motion.button
                        onClick={isProteinsPack || isFamiliarPack ? handleOpenModal : handleAddToCart}
                        disabled={isMaintenance}
                        className={`w-full group/btn relative overflow-hidden font-black py-4 sm:py-5 px-6 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-xl ${
                            isMaintenance
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-gray-900 text-white hover:bg-orange-600 active:scale-95 shadow-gray-900/20'
                        }`}
                        whileHover={!isMaintenance ? { y: -2 } : {}}
                    >
                        {isMaintenance ? (
                            <>
                                <Info size={20} />
                                Mantenimiento
                            </>
                        ) : (
                            <>
                                <ShoppingCart size={22} className="group-hover/btn:rotate-12 transition-transform" />
                                <span>{isProteinsPack || isFamiliarPack ? 'Personalizar Ahora' : 'Agregar al Carrito'}</span>
                            </>
                        )}
                    </motion.button>
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

const PackSection = memo(({ category, data, promociones = [], packImages = {}, packsEspeciales, ...rest }) => {
    return (
        <>
            <div className="scroll-mt-40 h-0" id={`pack-${category}`} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 mb-16 sm:mb-24">
                {data.packs.map((pack, index) => (
                    <PackCard
                        key={`${category}-${pack.name}-${index}`}
                        pack={pack}
                        shipping={pack.shipping || data.shipping}
                        category={pack.sectionKey || category}
                        categoryLabel={pack.categoryLabel || data.title}
                        promociones={promociones}
                        customImage={packImages[pack.name]}
                        packsEspeciales={packsEspeciales}
                        {...rest}
                    />
                ))}
            </div>
        </>
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
    const [activePackGroup, setActivePackGroup] = useState('todos');

    // Mostrar todos los filtros (ya no hay grupos)
    const filteredFilters = PACK_FILTERS;

    // Calcular contadores para los filtros
    const packFilterCounts = useMemo(() => {
        const counts = {};
        
        // Iterar sobre todas las secciones y sus packs
        Object.entries(packsData).forEach(([sectionKey, sectionData]) => {
            sectionData.packs.forEach(pack => {
                // Contar por filtros basados en packs específicos
                PACK_FILTERS.forEach(filter => {
                    if (filter.packs && filter.packs.includes(pack.name)) {
                        counts[filter.id] = (counts[filter.id] || 0) + 1;
                    }
                });
            });
            
            // Contar por filtros basados en secciones completas
            PACK_FILTERS.forEach(filter => {
                if (filter.section === sectionKey) {
                    counts[filter.id] = sectionData.packs.length;
                }
            });
        });
        
        counts['todos'] = Object.values(packsData).reduce((acc, sec) => acc + sec.packs.length, 0);
        return counts;
    }, [packsData]);
    const [packImages, setPackImages] = useState({}); // { packName: imageUrl }
    const [isLoading, setIsLoading] = useState(true);
    const [packsEspeciales, setPacksEspeciales] = useState(PACKS_ESPECIALES_BASE);
    const packsContainerRef = useRef(null);

    // Estados para Desayunos
    const [desayunosMenu, setDesayunosMenu] = useState([]);
    const [desayunosVegetarianos, setDesayunosVegetarianos] = useState([]);
    const [desayunosModalOpen, setDesayunosModalOpen] = useState(false);
    const [editingDesayunos, setEditingDesayunos] = useState(false);
    const [activeDesayunoTab, setActiveDesayunoTab] = useState('regular');
    const [tempDesayunos, setTempDesayunos] = useState([]);
    const [tempDesayunosVeg, setTempDesayunosVeg] = useState([]);
    const DESAYUNOS_PRECIO = 15000;

    // Estados para Edición de Proteínas
    const [editingProteinas, setEditingProteinas] = useState(false);
    const [tempProteinas, setTempProteinas] = useState([]);
    const [nuevaProteina, setNuevaProteina] = useState('');
    const [editandoIndice, setEditandoIndice] = useState(null);
    const [nombreEditado, setNombreEditado] = useState('');

    // Guardar desayunos en el menú oficial (sincronizado con packs)
    const saveDesayunos = async () => {
        try {
            const docRef = doc(db, 'menus_oficial', 'current');
            const docSnap = await getDoc(docRef);
            const menuActual = docSnap.exists() ? docSnap.data() : {};

            const desayunosFormato = tempDesayunos.map((desayuno, index) => ({
                numero: index + 1,
                proteina: desayuno,
                vegetal: 'Tostada integral',
                carbo: 'Fruta fresca'
            }));

            const desayunosVegFormato = tempDesayunosVeg.map((desayuno, index) => ({
                numero: index + 1,
                proteina: desayuno,
                vegetal: 'Tostada integral',
                carbo: 'Fruta fresca'
            }));

            await setDoc(docRef, {
                ...menuActual,
                desayuno: desayunosFormato,
                desayunoVegetariano: desayunosVegFormato,
                meta: {
                    ...menuActual.meta,
                    lastModifiedAt: new Date(),
                    desayunosUpdatedBy: 'admin'
                }
            }, { merge: true });

            invalidateCache('menus_official');
            setDesayunosMenu(tempDesayunos);
            setDesayunosVegetarianos(tempDesayunosVeg);
            setEditingDesayunos(false);
            toast.success('✅ Desayunos actualizados correctamente');
        } catch (error) {
            console.error('Error guardando desayunos:', error);
            toast.error('Error al guardar desayunos');
        }
    };

    // Guardar proteínas disponibles
    const saveProteinas = async () => {
        try {
            const docRef = doc(db, 'menus_oficial', 'current');
            const docSnap = await getDoc(docRef);
            const menuActual = docSnap.exists() ? docSnap.data() : {};

            await setDoc(docRef, {
                ...menuActual,
                proteinasDisponibles: tempProteinas,
                meta: {
                    ...menuActual.meta,
                    lastModifiedAt: new Date(),
                    proteinasUpdatedBy: 'admin'
                }
            }, { merge: true });

            invalidateCache('menus_official');
            setPacksEspeciales(prev => ({
                ...prev,
                'Pack 3 Proteínas': { ...prev['Pack 3 Proteínas'], proteinas: tempProteinas },
                'Pack 5 Proteínas': { ...prev['Pack 5 Proteínas'], proteinas: tempProteinas }
            }));
            setEditingProteinas(false);
            toast.success('✅ Proteínas actualizadas correctamente');
        } catch (error) {
            console.error('Error guardando proteínas:', error);
            toast.error('Error al guardar proteínas');
        }
    };

    const agregarProteina = () => {
        if (nuevaProteina.trim() && !tempProteinas.includes(nuevaProteina.trim())) {
            setTempProteinas([...tempProteinas, nuevaProteina.trim()]);
            setNuevaProteina('');
        }
    };

    const eliminarProteina = (index) => {
        setTempProteinas(tempProteinas.filter((_, i) => i !== index));
    };

    // Handlers para abrir modales
    const handleOpenDesayunos = () => setDesayunosModalOpen(true);
    
    const handleEditDesayunos = () => {
        setTempDesayunos([...desayunosMenu]);
        setTempDesayunosVeg([...desayunosVegetarianos]);
        setEditingDesayunos(true);
    };

    const handleEditProteinas = () => {
        setTempProteinas(packsEspeciales['Pack 3 Proteínas']?.proteinas || []);
        setEditingProteinas(true);
    };

    const handleAgregarDesayunos = () => {
        const item = {
            id: 'pack-desayunos-semanal',
            name: 'Pack de Desayunos (Semanal)',
            price: DESAYUNOS_PRECIO,
            quantity: 1,
            type: 'desayunos',
            plan: 'weekly',
            menu: activeDesayunoTab === 'regular' ? desayunosMenu : desayunosVegetarianos,
            category: 'desayunos'
        };
        addToCart(item);
        setDesayunosModalOpen(false);
        toast.success('🍳 Pack de desayunos agregado al carrito');
    };




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

    // Datos filtrados memoizados - AHORA soporta secciones completas y VISTA APLANADA para dietas
    const filteredPacksData = useMemo(() => {
        const filterConfig = PACK_FILTERS.find(f => f.id === activeFilter);
        
        // MODO APLANADO: Si es un filtro de dieta específico (ej. Full Pack, Keto)
        if (filterConfig?.packs) {
            const allMatchingPacks = [];
            Object.entries(packsData).forEach(([sectionKey, sectionData]) => {
                const matches = sectionData.packs.filter(p => filterConfig.packs.includes(p.name));
                matches.forEach(p => {
                    allMatchingPacks.push({
                        ...p,
                        categoryLabel: sectionData.title, // Label de la sección (ej: "5 Comidas a la Semana")
                        sectionKey: sectionKey, // Clave original para que el carrito sepa qué es
                        shipping: sectionData.shipping // Información de envío de la sección original
                    });
                });
            });
            
            return [{
                key: 'flattened_results',
                data: {
                    title: `Variante: ${filterConfig.label}`,
                    subtitle: `Encuéntralo en todas nuestras presentaciones y cantidades`,
                    icon: filterConfig.icon,
                    packs: allMatchingPacks
                }
            }];
        }

        // MODO NORMAL: Secciones estándar o Filtro de Sección (Two Pack, Familiar...)
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
                // Cargar proteínas dinámicas desde Firestore si existen
                if (menusData?.proteinasDisponibles) {
                    setPacksEspeciales(prev => ({
                        ...prev,
                        'Pack 3 Proteínas': { ...prev['Pack 3 Proteínas'], proteinas: menusData.proteinasDisponibles },
                        'Pack 5 Proteínas': { ...prev['Pack 5 Proteínas'], proteinas: menusData.proteinasDisponibles }
                    }));
                }

                // Cargar desayunos
                if (menusData?.desayunos) {
                    setDesayunosMenu(menusData.desayunos);
                    setTempDesayunos(menusData.desayunos);
                }
                if (menusData?.desayunosVegetarianos) {
                    setDesayunosVegetarianos(menusData.desayunosVegetarianos);
                    setTempDesayunosVeg(menusData.desayunosVegetarianos);
                }
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
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white pt-[76px]">
                <Navbar />

                {/* ── Barra de filtros SOLO MÓVIL (oculto en desktop lg+) ── */}
                <div className="lg:hidden bg-white/95 backdrop-blur-md py-1 border-b border-gray-100 z-30 shadow-sm transition-all duration-300">
                    <div className="w-full px-4">
                        <div className="relative">
                            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none sm:hidden" />

                            {/* Píldoras de Filtro Específico */}
                            <div className="flex overflow-x-auto gap-2.5 pb-2 pt-1 hide-scrollbar px-0 items-center">
                                {filteredFilters.map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={(e) => {
                                            setActiveFilter(filter.id);
                                            e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                                        }}
                                        className={`
                                            flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 whitespace-nowrap border-2
                                            ${activeFilter === filter.id
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-xl shadow-orange-500/30 scale-105'
                                                : 'bg-white text-gray-700 border-gray-100 hover:border-orange-200 shadow-sm'
                                            }
                                        `}
                                    >
                                        <span className="text-xl">{filter.icon}</span>
                                        <div className="flex flex-col items-start leading-tight">
                                            <span>{filter.label}</span>
                                            <span className={`text-[10px] uppercase tracking-wider opacity-70 ${activeFilter === filter.id ? 'text-white' : 'text-orange-500'}`}>
                                                {packFilterCounts[filter.id] || 0} opciones
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <style>{`
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>

                {/* ── Contenedor principal: sidebar + contenido ── */}
                <div className="flex flex-col lg:flex-row min-h-screen relative pt-4">
                    {/* ── SIDEBAR DESKTOP (oculto en móvil) ── */}
                    <aside className="hidden lg:flex flex-col gap-3 w-64 xl:w-72 flex-shrink-0 sticky top-[76px] h-[calc(100vh-76px)] z-20 overflow-y-auto hide-scrollbar bg-white border-r border-gray-100 shadow-xl shadow-gray-200/20">
                        <div className="flex flex-col h-full">
                            {/* Header del sidebar removido por petición del usuario */}

                            {/* Lista de filtros — orden del usuario */}
                            <div className="p-3 space-y-0.5">
                                {PACK_FILTERS.map((filter) => {
                                    const isActive = activeFilter === filter.id;
                                    return (
                                        <button
                                            key={filter.id}
                                            onClick={() => {
                                                setActiveFilter(filter.id);
                                                setActivePackGroup(filter.groupId || 'todos');
                                            }}
                                            className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${isActive
                                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                                                : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                                                }`}
                                        >
                                            <span className="flex items-center gap-2.5">
                                                <span className="text-base">{filter.icon}</span>
                                                <span>{filter.label}</span>
                                            </span>
                                            <span className={`text-xs font-black rounded-full px-2 py-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                                {packFilterCounts[filter.id] || 0}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Bottom bonito */}
                            <div className="mx-3 mb-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 p-4">
                                <p className="text-sm font-black text-gray-800 mb-1">💡 ¿No sabes cuál elegir?</p>
                                <p className="text-xs text-gray-500 mb-3 leading-relaxed">Compara todos los planes y encuentra el ideal para ti.</p>
                                <a
                                    href="/comparador"
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black py-2 px-3 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-sm"
                                >
                                    <span>⚡</span> Comparar packs
                                </a>
                            </div>
                        </div>
                    </aside>

                    {/* ── CONTENIDO PRINCIPAL ── */}
                    <main ref={packsContainerRef} className="flex-1 w-full p-4 sm:p-6 lg:p-10 pb-32">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
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
                                            // Passing new handlers
                                            onOpenDesayunos={handleOpenDesayunos}
                                            onEditDesayunos={handleEditDesayunos}
                                            onEditProteinas={handleEditProteinas}
                                            // States for modal display
                                            desayunosMenu={desayunosMenu}
                                            desayunosVegetarianos={desayunosVegetarianos}
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
            </div>{/* ── end flex wrapper ── */}

                <Footer />
            </div>

            {/* Modal de Ver Desayunos */}
            {desayunosModalOpen && ReactDOM.createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setDesayunosModalOpen(false)}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 p-6 text-white text-center relative">
                                <button
                                    type="button"
                                    onClick={() => setDesayunosModalOpen(false)}
                                    className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                                <div className="text-5xl mb-3">🍳</div>
                                <h3 className="text-2xl font-black">Menú de Desayunos</h3>
                                <p className="text-white/90 font-medium">Frescura y salud para comenzar tu día</p>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveDesayunoTab('regular')}
                                            className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-black transition-all ${activeDesayunoTab === 'regular'
                                                    ? 'bg-white text-gray-900 shadow-xl scale-[1.02]'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Regulares
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveDesayunoTab('vegetariano')}
                                            className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-black transition-all ${activeDesayunoTab === 'vegetariano'
                                                    ? 'bg-white text-gray-900 shadow-xl scale-[1.02]'
                                                    : 'text-gray-500 hover:text-gray-700'
                                                }`}
                                        >
                                            Vegetarianos
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {(activeDesayunoTab === 'regular' ? desayunosMenu : desayunosVegetarianos).map((item, idx) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                key={idx}
                                                className="flex items-center gap-4 p-5 bg-gradient-to-r from-gray-50 to-white rounded-2xl border-2 border-gray-100 shadow-sm hover:shadow-md transition-all group"
                                            >
                                                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black flex-shrink-0 group-hover:scale-110 transition-transform">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-800 text-base leading-tight">
                                                        {item}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-bold">Base de Frutas y Proteína</p>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border-2 border-amber-100">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Precio Semanal</span>
                                        <span className="text-2xl font-black text-amber-500">₡{DESAYUNOS_PRECIO.toLocaleString('es-CR')}</span>
                                    </div>
                                    <span className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-black uppercase tracking-widest border border-amber-100 shadow-sm">
                                        5 Porciones
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAgregarDesayunos}
                                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-black py-4.5 px-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02]"
                                >
                                    <ShoppingCart size={22} className="text-white" />
                                    Agregar al Carrito
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Modal de Edición de Desayunos (Admin) */}
            {editingDesayunos && ReactDOM.createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingDesayunos(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white relative">
                                <h3 className="text-2xl font-black">⚙️ Panel Admin: Desayunos</h3>
                                <p className="text-amber-100 font-medium opacity-90">Configura el menú semanal disponible</p>
                                <button
                                    type="button"
                                    onClick={() => setEditingDesayunos(false)}
                                    className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex bg-amber-50 p-2 gap-2 border-b border-amber-100">
                                <button
                                    onClick={() => setActiveDesayunoTab('regular')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all ${activeDesayunoTab === 'regular' ? 'bg-amber-500 text-white shadow-lg' : 'text-amber-700 hover:bg-amber-100'}`}
                                >
                                    Menú Regular
                                </button>
                                <button
                                    onClick={() => setActiveDesayunoTab('vegetariano')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all ${activeDesayunoTab === 'vegetariano' ? 'bg-amber-500 text-white shadow-lg' : 'text-amber-700 hover:bg-amber-100'}`}
                                >
                                    Menú Vegetariano
                                </button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-4">
                                {(activeDesayunoTab === 'regular' ? tempDesayunos : tempDesayunosVeg).map((item, idx) => (
                                    <div key={idx} className="flex gap-3 group">
                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center font-black text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                                            {idx + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={item}
                                            onChange={(e) => {
                                                const newItems = [...(activeDesayunoTab === 'regular' ? tempDesayunos : tempDesayunosVeg)];
                                                newItems[idx] = e.target.value;
                                                if (activeDesayunoTab === 'regular') setTempDesayunos(newItems);
                                                else setTempDesayunosVeg(newItems);
                                            }}
                                            placeholder={`Desayuno del día ${idx + 1}...`}
                                            className="flex-1 px-5 py-3 rounded-2xl border-2 border-gray-100 focus:border-amber-400 focus:outline-none font-medium text-gray-800 shadow-sm"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="p-6 bg-gray-50 border-t flex gap-4">
                                <button
                                    onClick={() => setEditingDesayunos(false)}
                                    className="flex-1 py-4 px-6 rounded-2xl border-2 border-gray-200 text-gray-600 font-black hover:bg-white transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveDesayunos}
                                    className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-[1.02] transition-all"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}

            {/* Modal de Edición de Proteínas (Admin) */}
            {editingProteinas && ReactDOM.createPortal(
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setEditingProteinas(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col"
                        >
                            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white relative">
                                <h3 className="text-2xl font-black">🥩 Panel Admin: Proteínas</h3>
                                <p className="text-orange-50/80 font-medium">Gestiona las opciones para los packs semanales</p>
                                <button
                                    onClick={() => setEditingProteinas(false)}
                                    className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nueva proteína (ej: Pollo al Limón)"
                                        value={nuevaProteina}
                                        onChange={(e) => setNuevaProteina(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && agregarProteina()}
                                        className="flex-1 px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-orange-400 focus:outline-none font-bold text-gray-800 shadow-sm"
                                    />
                                    <button
                                        onClick={agregarProteina}
                                        className="aspect-square w-16 bg-orange-500 text-white rounded-2xl flex items-center justify-center hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-2">
                                    {tempProteinas.map((pro, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 border-dashed hover:border-orange-200 transition-colors group">
                                            <span className="font-bold text-gray-700">{pro}</span>
                                            <button
                                                onClick={() => eliminarProteina(idx)}
                                                className="w-9 h-9 bg-white text-red-500 rounded-xl flex items-center justify-center shadow-md hover:bg-red-50 transition-all active:scale-95"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 border-t flex gap-4">
                                <button
                                    onClick={() => setEditingProteinas(false)}
                                    className="flex-1 py-4 px-6 rounded-2xl border-2 border-gray-200 text-gray-600 font-black hover:bg-white transition-all"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={saveProteinas}
                                    className="flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] transition-all"
                                >
                                    Sincronizar Todo
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                </AnimatePresence>,
                document.body
            )}
        </PageTransition>
    );
}
