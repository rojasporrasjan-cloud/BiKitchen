import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import SmoothImage from '../components/SmoothImage';
import { ShoppingCart, Truck, Check, Info, Eye, X, Gift, Tag, Filter, Flame, Leaf, Users, Zap, Package, Edit, Plus, ChevronDown, ArrowLeft } from 'lucide-react';
import SubstitutionPicker from '../components/SubstitutionPicker';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import MenuDetailsModal from '../components/menus/MenuDetailsModal';
import MenuDetailsModalWithTabs from '../components/menus/MenuDetailsModalWithTabs';
import { getPackPrices } from '../utils/firestoreMenus';
import { getActivePromotions } from '../utils/firestorePromotions';
import { PACKS_DATA, PACK_TO_MENU_KEY, DEFAULT_PACK_IMAGES } from '../data/packsData';
import { useQuery } from '../hooks/useQuery';
import { db } from '../firebase/config';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { cleanFirebaseUrl } from '../utils/firebaseUrl';
import { cachedFetch, invalidateCache, invalidateCacheByType } from '../utils/firestoreCache';
import { trackViewContent } from '../services/facebookPixel';
import SEOHead, { SEO_CONFIG } from '../components/SEOHead';
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
    { id: 'regular', label: 'Pack Regular', icon: '🍲', packs: ['Pack Regular'], groupId: 'diet' },
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

    // GUARD: Prevenir crash si pack es null o undefined
    if (!pack) return null;

    const isProteinsPack =
        (category === 'proteinas') ||
        (pack?.name && (pack.name.includes('Pack 3 Proteínas') || pack.name.includes('Pack 5 Proteínas') || pack.name.toLowerCase().includes('proteína')));

    const isBreakfastPack = category === 'desayunos';

    const isFamiliarPack =
        category === 'familiar' &&
        (pack?.name === 'Pack Familiar Premium' || pack?.name === 'Pack Familiar Deluxe');

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
    const cardRef = useRef(null);


    const [imageLoaded, setImageLoaded] = useState(false);
    const [substitutions, setSubstitutions] = useState({ protein: null, vegetal: null, carbo: null });
    const { addToCart } = useCart();
    const { whatsappPhone } = useWhatsApp();
    const { isAdmin } = useAuth() || {};
    const isMaintenance = !!pack.maintenance;

    // Etiqueta de categoría para el badge flotante (Fallback: prop > PACKS_DATA > category)
    // INTERCEPTAR: Forzar "Almuerzo y Cena" si el valor es el antiguo "10 Comidas"
    let displayCategoryLabel = customCategoryLabel || PACKS_DATA[category]?.title || category;
    if (displayCategoryLabel === '10 Comidas') {
        displayCategoryLabel = 'Almuerzo y Cena';
    }

    // Datos del pack especial memoizados (ahora disponibles para todos los que los necesiten)
    const packEspecialData = useMemo(() => {
        if (!isFamiliarPack && !isProteinsPack) return null;
        if (!packsEspeciales) return null;

        // Intento 1: Match exacto
        if (pack?.name && packsEspeciales[pack.name]) return packsEspeciales[pack.name];

        // Intento 2: Fallback para packs de proteínas mediante palabras clave (evita caídas si el nombre en Firestore varía levemente)
        if (isProteinsPack && pack?.name) {
            const nameLower = pack.name.toLowerCase();
            if (nameLower.includes('3')) return packsEspeciales['Pack 3 Proteínas'];
            if (nameLower.includes('5')) return packsEspeciales['Pack 5 Proteínas'];
            // Fallback total para proteínas si no hay dígito: usar el de 5 como base
            return packsEspeciales['Pack 5 Proteínas'] || packsEspeciales['Pack 3 Proteínas'] || { cantidad: 5, proteinas: [] };
        }

        return null;
    }, [isFamiliarPack, isProteinsPack, pack?.name, packsEspeciales]);

    // Función segura para obtener la lista de proteínas/items a mostrar
    const getDisplayItems = useCallback(() => {
        if (isProteinsPack) {
            // 1. Intentar del packEspecialData (que viene de Firebase/Estado)
            if (packEspecialData?.proteinas && packEspecialData.proteinas.length > 0) return packEspecialData.proteinas;
            // 2. Fallback al objeto global BASE
            const baseKey = pack.name.includes('3') ? 'Pack 3 Proteínas' : 'Pack 5 Proteínas';
            return PACKS_ESPECIALES_BASE[baseKey]?.proteinas || [];
        }
        return packEspecialData?.items || [];
    }, [isProteinsPack, pack.name, packEspecialData]);

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

    // Descuento mensual: 25% para Two Pack, 20% para otros packs regulares
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

        // Descuento manual de Firebase
        const planAllowedForLabel = !pack.planesAplicables?.length || pack.planesAplicables.includes(plan);
        if (hasDiscount && planAllowedForLabel) {
            return pack.tipoDescuento === 'porcentaje'
                ? `-${pack.valorDescuento}%`
                : `-₡${Math.round(pack.valorDescuento / 1000)}k`; // Abreviar para círculos
        }

        return null;
    };

    const promoActiva = getPromoForPlan(selectedPlan);
    const tienePromo = !!promoActiva;

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

        // Aplicar descuento de Firebase si existe (según planes configurados)
        const planAllowed = !pack.planesAplicables?.length || pack.planesAplicables.includes(selectedPlan);
        if (hasDiscount && planAllowed) {
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
            protein,
            // Métodos de pago válidos para el descuento (null = sin restricción)
            discountMetodos: hasDiscount ? (pack.metodosPermitidos || null) : undefined
        });
    };
    const menuKey = PACK_TO_MENU_KEY[pack.name];

    // Compute price display for card — shows strikethrough + discounted when Firebase discount is active
    const getCardPriceDisplay = () => {
        // Packs de promoción tienen su propia lógica de precio
        if (isPromocionPack) {
            return { label: 'Mensual', orig: getOriginalPrice('monthly'), disc: null };
        }
        if (hasDiscount) {
            // Buscar el plan más barato que tenga el descuento activo
            const plans = ['weekly', 'biweekly', 'monthly'];
            const planLabels = { weekly: 'Desde', biweekly: 'Quincenal', monthly: 'Mensual' };
            for (const plan of plans) {
                const planOk = !pack.planesAplicables?.length || pack.planesAplicables.includes(plan);
                if (!planOk) continue;
                let base;
                switch (plan) {
                    case 'weekly': base = Number(pack.weekly) || 0; break;
                    case 'biweekly': base = Number(pack.biweekly) || 0; break;
                    case 'monthly': base = Number(pack.monthly) || 0; break;
                    default: base = 0;
                }
                if (base <= 0) continue;
                const disc = pack.tipoDescuento === 'porcentaje'
                    ? Math.round(base * (1 - pack.valorDescuento / 100))
                    : Math.round(Math.max(0, base - pack.valorDescuento));
                return { label: planLabels[plan] || 'Desde', orig: base, disc };
            }
        }
        // Sin descuento: mostrar precio semanal normal
        return { label: 'Desde', orig: getOriginalPrice('weekly'), disc: null };
    };
    const cardPrice = getCardPriceDisplay();

    return (
        <>
            <motion.div
                layout
                ref={cardRef}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                whileHover={{ y: -6 }}
                whileTap={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`group rounded-[2.5rem] h-80 sm:h-96 w-full shadow-xl hover:shadow-2xl bg-gray-900 overflow-hidden relative cursor-pointer transition-all duration-500 ${pack.featured ? 'ring-2 ring-orange-500 ring-offset-4' : ''}`}
                onClick={() => {
                    if (isBreakfastPack) onOpenDesayunos?.();
                    else if (isProteinsPack || isFamiliarPack) handleOpenModal();
                    else setShowMenuModal(true);
                }}
            >
                {/* Imagen Full Background */}
                <SmoothImage
                    src={packImage}
                    alt={pack.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-100"
                    aspectRatio=""
                    placeholderColor="bg-gradient-to-br from-gray-100 to-gray-50"
                />

                {/* Gradient Overlay Inmersivo */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Content Overlay */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                        {/* Status/Category Badge with Glassmorphism */}
                        <div className="flex flex-col gap-2">
                            {displayCategoryLabel && (
                                <div className="bg-white/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/20 shadow-xl">
                                    <span className="text-[10px] sm:text-xs font-black text-white tracking-tight flex items-center gap-2">
                                        <Package size={14} className="text-orange-400" />
                                        {displayCategoryLabel}
                                    </span>
                                </div>
                            )}

                            {isTwoPack && (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="bg-orange-600/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-[9px] font-black flex items-center gap-1.5 shadow-xl border border-orange-400/30 uppercase tracking-tighter"
                                >
                                    <Users size={12} />
                                    10 Comidas (5 x Pers.)
                                </motion.div>
                            )}
                        </div>

                        {/* Promo Badge */}
                        {(hasDiscount || tienePromo) && (
                            <div className="bg-orange-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg animate-pulse">
                                {pack.etiquetaTexto || 'OFERTA'}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {/* Icon/Emoji Floating */}
                        <motion.div
                            className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/10"
                            whileHover={{ scale: 1.1, rotate: 10 }}
                        >
                            {pack.icon}
                        </motion.div>

                        <div>
                            <h3 className="text-xl sm:text-3xl font-black text-white leading-tight" style={{textShadow:'0 2px 12px rgba(0,0,0,0.7)'}}>
                                {pack.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-100 line-clamp-2 mt-2 font-semibold leading-relaxed" style={{textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>
                                {pack.desc}
                            </p>
                        </div>

                        {/* Price & Action Badge */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{cardPrice.label}</span>
                                {cardPrice.disc ? (
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-sm font-black text-white/50 line-through leading-none">
                                            {formatPrice(cardPrice.orig)}
                                        </span>
                                        <span className="text-xl sm:text-2xl font-black text-orange-400 leading-none">
                                            {formatPrice(cardPrice.disc)}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-xl sm:text-2xl font-black text-white">
                                        {formatPrice(cardPrice.orig)}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-[10px] font-black text-white bg-orange-600 px-4 py-2.5 rounded-2xl shadow-xl hover:bg-orange-500 transition-colors uppercase tracking-widest">
                                <Plus size={14} strokeWidth={4} />
                                <span>Personalizar</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Maintenance Overlay */}
                {isMaintenance && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-white">
                        <Info size={32} className="mb-2" />
                        <span className="font-black uppercase tracking-widest">Mantenimiento</span>
                    </div>
                )}
            </motion.div>

            {/* Modal para packs especiales (Proteínas / Familiar) - Premium Zero-Scroll */}
            {showSpecialModal && packEspecialData && ReactDOM.createPortal(
                <AnimatePresence>
                    <div className="fixed inset-0 z-[10000] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 bg-black/70 backdrop-blur-[2px]"
                            onClick={handleCloseModal}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                            className="relative w-full md:w-[52%] lg:w-[46%] xl:w-[40%] h-full bg-white shadow-2xl overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Hero Header Section */}
                            <div className="relative h-[175px] sm:h-[250px] flex-shrink-0 overflow-hidden">
                                <SmoothImage
                                    src={packImage}
                                    alt={pack.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
                                <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

                                <button
                                    onClick={handleCloseModal}
                                    className="absolute top-4 left-4 w-10 h-10 bg-white/15 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 border border-white/20 z-10"
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                <div className="absolute top-4 right-4 z-10">
                                    <span className="bg-white/15 backdrop-blur-md text-white text-[9px] font-black px-3 py-1.5 rounded-xl border border-white/20 uppercase tracking-widest">
                                        {isFamiliarPack ? 'Pack Familiar' : 'Pack Proteínas'}
                                    </span>
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 z-10">
                                    <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">
                                        {isFamiliarPack ? '4 porciones por plato · Lunes a Viernes' : 'Personaliza tu pedido · Elige tus favoritas'}
                                    </p>
                                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-lg">
                                        {isFamiliarPack ? packEspecialData.nombre : `Arma tu ${packEspecialData.nombre}`}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className="bg-orange-500 text-white text-[9px] font-black px-2.5 py-1 rounded-xl uppercase tracking-widest shadow-lg">
                                            {isFamiliarPack ? `${packEspecialData.items?.length || 0} Platos` : `${packEspecialData.cantidad} Porciones`}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 overflow-y-auto side-panel-scrollbar bg-white">
                                <div className="flex flex-col">
                                    {/* Selections/Items */}
                                    <div className="flex-1 p-5 sm:p-6 border-b border-slate-100 bg-white">
                                        <div className="max-w-xl mx-auto">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                                    {isProteinsPack ? 'Elige tus proteínas' : 'Contenido del pack'}
                                                </h3>
                                                {isProteinsPack && (
                                                    <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${proteinasSeleccionadas.length === packEspecialData.cantidad
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : 'bg-orange-100 text-orange-700 border border-orange-200'
                                                        }`}>
                                                        {proteinasSeleccionadas.length} / {packEspecialData.cantidad}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                                                {isProteinsPack ? (
                                                    (getDisplayItems() || []).map((rawProtein, idx) => {
                                                        // Normalizar a string si viene como objeto desde Firebase
                                                        const proteinName = typeof rawProtein === 'string' ? rawProtein : (rawProtein.proteina || rawProtein.nombre || 'Proteína');
                                                        const isSelected = proteinasSeleccionadas.includes(proteinName);
                                                        // Fallback seguro para cantidad si packEspecialData es null
                                                        const maxCantidad = packEspecialData?.cantidad || (pack?.name?.includes('3') ? 3 : 5);
                                                        const isDisabled = !isSelected && proteinasSeleccionadas.length >= maxCantidad;

                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    toggleProteina(proteinName);
                                                                }}
                                                                disabled={isDisabled}
                                                                className={`p-4 rounded-2xl flex items-center justify-between transition-all border-2 text-left appearance-none outline-none ${isSelected
                                                                    ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-md ring-2 ring-orange-500/10'
                                                                    : isDisabled
                                                                        ? 'bg-slate-50 border-transparent opacity-30 grayscale cursor-not-allowed'
                                                                        : 'bg-slate-50 border-slate-100 hover:border-orange-200 text-slate-600 hover:text-slate-900'
                                                                    }`}
                                                            >
                                                                <span className="font-bold text-sm sm:text-base leading-tight pr-2">{proteinName}</span>
                                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'
                                                                    }`}>
                                                                    {isSelected && <Check size={14} strokeWidth={4} className="text-white" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })
                                                ) : (
                                                    packEspecialData.items.map((item, idx) => (
                                                        <div key={idx} className="p-4 rounded-2xl bg-slate-50 flex items-start gap-4 border border-slate-100 group hover:bg-slate-100 transition-all">
                                                            <span className="w-6 h-6 flex-shrink-0 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-600 group-hover:bg-orange-500 group-hover:text-white transition-all">{idx + 1}</span>
                                                            <span className="text-slate-600 font-medium text-sm leading-snug">{item}</span>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary & Action */}
                                    <div className="w-full bg-slate-50/50 p-5 sm:p-6 flex flex-col border-t border-slate-100">
                                        <div className="space-y-4 sm:space-y-6">
                                            {/* Portions/Size Info */}
                                            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-4 sm:space-y-5 shadow-sm">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                        <Edit size={18} />
                                                    </div>
                                                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Configuración</span>
                                                </div>

                                                {/* Selector de Plan */}
                                                <div className="space-y-3">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Frecuencia del Plan</span>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[
                                                            { id: 'weekly', label: 'Semanal' },
                                                            { id: 'biweekly', label: 'Quincenal' },
                                                            { id: 'monthly', label: 'Mensual' }
                                                        ].map((plan) => (
                                                            <button
                                                                key={plan.id}
                                                                onClick={() => setSelectedPlan(plan.id)}
                                                                className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${selectedPlan === plan.id
                                                                    ? 'bg-orange-500 border-orange-500 text-white shadow-lg'
                                                                    : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'
                                                                    }`}
                                                            >
                                                                {plan.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Selector de Tamaño (Solo para Proteínas) */}
                                                {isProteinsPack && (
                                                    <div className="space-y-3 pt-2">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tamaño Porción</span>
                                                            <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                                                                {selectedSize}g
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {[
                                                                { id: '250', label: '250g (Estándar)' },
                                                                { id: '500', label: '500g (Pro)' }
                                                            ].map((size) => (
                                                                <button
                                                                    key={size.id}
                                                                    onClick={() => setSelectedSize(size.id)}
                                                                    className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${selectedSize === size.id
                                                                        ? 'bg-orange-500 border-orange-400 text-white shadow-lg'
                                                                        : 'bg-slate-100 border-transparent text-slate-500 hover:bg-slate-200'
                                                                        }`}
                                                                >
                                                                    {size.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {!isProteinsPack && isFamiliarPack && (
                                                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                        <span className="text-slate-500 text-sm">Porciones</span>
                                                        <span className="text-slate-900 font-bold text-sm">4 por plato</span>
                                                    </div>
                                                )}
                                            </div>

                                            {(() => {
                                                const fp = getFinalPrice();
                                                const planOk = hasDiscount && (!pack.planesAplicables?.length || pack.planesAplicables.includes(selectedPlan));
                                                let base = 0;
                                                if (planOk) {
                                                    if (isProteinsPack && selectedSize === '500') {
                                                        base = selectedPlan === 'weekly' ? Number(pack.weekly_500) : selectedPlan === 'biweekly' ? Number(pack.biweekly_500) : Number(pack.monthly_500);
                                                    } else {
                                                        base = selectedPlan === 'weekly' ? Number(pack.weekly) : selectedPlan === 'biweekly' ? Number(pack.biweekly) : Number(pack.monthly);
                                                    }
                                                }
                                                const showBreakdown = planOk && base > 0 && base !== fp;
                                                const metodosLabels = { whatsapp: 'WhatsApp', sinpe: 'SINPE', transfer: 'Transferencia', nmi: 'Tarjeta' };
                                                const metodos = pack.metodosPermitidos;
                                                const metodosNote = showBreakdown && metodos && metodos.length > 0 && metodos.length < 4
                                                    ? metodos.map(k => metodosLabels[k] || k).join(' · ')
                                                    : null;
                                                return (
                                                    <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100 space-y-2">
                                                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">Inversión Final</span>
                                                        {showBreakdown ? (
                                                            <div className="flex flex-col items-start gap-1">
                                                                <span className="text-lg font-black text-slate-400 line-through leading-none">₡{base.toLocaleString()}</span>
                                                                <span className="text-3xl font-black text-slate-900 tracking-tight">₡{fp.toLocaleString()}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-3xl font-black text-slate-900 tracking-tight">₡{fp.toLocaleString()}</span>
                                                        )}
                                                        {metodosNote && (
                                                            <div className="flex items-center gap-1.5 pt-1 border-t border-orange-100">
                                                                <span className="text-orange-400">💳</span>
                                                                <span className="text-[10px] font-bold text-orange-600">Solo aplica con: {metodosNote}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Footer Actions - Redesigned for Maximum Prominence */}
                                        <div className="mt-8 space-y-4">
                                            <SubstitutionPicker
                                                value={substitutions}
                                                onChange={setSubstitutions}
                                            />

                                            <button
                                                disabled={isProteinsPack && packEspecialData != null && proteinasSeleccionadas.length !== packEspecialData.cantidad}
                                                onClick={() => {
                                                    const finalPrice = getFinalPrice();
                                                    const categoryLabel = PACKS_DATA?.[category]?.title;

                                                    // Calcular precio original para el carrito (antes del descuento Firebase)
                                                    const modalPlanOk = hasDiscount && (!pack.planesAplicables?.length || pack.planesAplicables.includes(selectedPlan));
                                                    let modalOriginalPrice;
                                                    if (modalPlanOk) {
                                                        if (isProteinsPack && selectedSize === '500') {
                                                            modalOriginalPrice = selectedPlan === 'weekly' ? Number(pack.weekly_500) : selectedPlan === 'biweekly' ? Number(pack.biweekly_500) : Number(pack.monthly_500);
                                                        } else {
                                                            modalOriginalPrice = selectedPlan === 'weekly' ? Number(pack.weekly) : selectedPlan === 'biweekly' ? Number(pack.biweekly) : Number(pack.monthly);
                                                        }
                                                        if (modalOriginalPrice === finalPrice) modalOriginalPrice = undefined;
                                                    }

                                                    // I-9: Validar precio antes de agregar al carrito
                                                    if (!finalPrice || finalPrice <= 0) {
                                                        toast.error('Precio no disponible. Por favor recarga la página.');
                                                        return;
                                                    }

                                                    if (isProteinsPack) {
                                                        addToCart({
                                                            id: `${category}-${pack?.name || 'proteina'}-${Date.now()}`,
                                                            name: `${pack?.name || 'Pack'} (${selectedSize}g)`,
                                                            desc: `Incluye: ${proteinasSeleccionadas.join(', ')} • Porción: ${selectedSize}g`,
                                                            proteinas: proteinasSeleccionadas,
                                                            size: `${selectedSize}g`,
                                                            price: finalPrice,
                                                            originalPrice: modalOriginalPrice,
                                                            quantity: 1,
                                                            plan: selectedPlan,
                                                            planLabel: getPlanLabel(),
                                                            image: packImage,
                                                            category,
                                                            categoryLabel,
                                                            customizations: substitutions,
                                                            discountMetodos: hasDiscount ? (pack.metodosPermitidos || null) : undefined,
                                                        });
                                                        toast.success(`${pack?.name || 'Pack'} de ${selectedSize}g agregado`);
                                                    } else {
                                                        addToCart({
                                                            id: `pack-familiar-${(pack?.name || 'familiar').toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
                                                            name: packEspecialData.nombre,
                                                            desc: `Incluye ${packEspecialData.items?.length || 0} platos p/4 pers.`,
                                                            price: finalPrice,
                                                            originalPrice: modalOriginalPrice,
                                                            quantity: 1,
                                                            plan: selectedPlan,
                                                            planLabel: getPlanLabel(),
                                                            image: packImage,
                                                            category,
                                                            categoryLabel: PACKS_DATA?.[category]?.title,
                                                            customizations: substitutions,
                                                            discountMetodos: hasDiscount ? (pack.metodosPermitidos || null) : undefined,
                                                        });
                                                        toast.success(`${packEspecialData.nombre} agregado`);
                                                    }
                                                    handleCloseModal();
                                                    setProteinasSeleccionadas([]);
                                                    setSubstitutions({ protein: null, vegetal: null, carbo: null });
                                                }}
                                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 sm:py-7 rounded-2xl shadow-xl shadow-slate-900/10 active:scale-[0.98] transition-all text-sm sm:text-base uppercase tracking-[0.1em] flex items-center justify-center gap-4 group disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                                            >
                                                <ShoppingCart size={24} className="group-hover:rotate-12 transition-transform" />
                                                <span>
                                                    {isProteinsPack && packEspecialData != null && proteinasSeleccionadas.length !== packEspecialData.cantidad
                                                        ? `Faltan ${packEspecialData.cantidad - proteinasSeleccionadas.length}`
                                                        : 'Agregar al carrito'}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    </div>
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
                        name: pack?.name || 'Pack',
                        desc: pack?.desc || '',
                        icon: pack?.icon,
                        price: formatPrice(getFinalPrice()),
                        numericPrice: getFinalPrice(),
                        originalPrice: hasDiscount ? formatPrice(getOriginalPrice()) : null,
                        plan: selectedPlan,
                        planLabel: getPlanLabel(),
                        categoryLabel: PACKS_DATA?.[category]?.title,
                        image: packImage,
                        pack: pack,
                        hasDiscount,
                        isPromocionPack,
                        isProteinsPack
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
                        name: pack?.name || 'Pack',
                        desc: tienePromo ? `${pack?.desc || ''} • ${promoActiva.titulo}` :
                            (isPromocionPack ? `${pack?.desc || ''} • Desayunos GRATIS • Envío 10%` :
                                (isMonthlyPlan ? `${pack?.desc || ''} • ${MONTHLY_DISCOUNT_PERCENT}% dto. mensual • ${is15ComidasPack ? 'Envío GRATIS' : '50% OFF en envío'}` :
                                    (hasDiscount && pack?.etiquetaTexto ? `${pack?.desc || ''} • ${pack?.etiquetaTexto}` : pack?.desc || ''))),
                        icon: pack?.icon,
                        price: formatPrice(getFinalPrice()),
                        numericPrice: getFinalPrice(),
                        originalPrice: hasAnyDiscount ? formatPrice(getOriginalPrice()) : null,
                        plan: selectedPlan,
                        planLabel: getPlanLabel(),
                        categoryLabel: PACKS_DATA?.[category]?.title,
                        image: packImage,
                        discountBadge: tienePromo ? '🎁 PROMO Activa' :
                            (isPromocionPack ? '🎁 PROMO Desayunos' :
                                (isMonthlyPlan ? `${MONTHLY_DISCOUNT_PERCENT}% OFF Mensual` :
                                    (hasDiscount ? pack?.etiquetaTexto : null))),
                        // Pasar data cruda para cálculo dinámico en modal
                        pack: pack,
                        hasDiscount,
                        isPromocionPack,
                        isProteinsPack
                    }}
                />
            ) : isPromocionPack ? (
                <MenuDetailsModalWithTabs
                    menuKey={menuKey}
                    isOpen={showMenuModal}
                    onClose={() => setShowMenuModal(false)}
                    mealTypes={['desayuno', 'almuerzo']}
                    packInfo={{
                        name: pack?.name || 'Pack',
                        desc: pack?.desc || '',
                        icon: pack?.icon,
                        price: formatPrice(getFinalPrice()),
                        numericPrice: getFinalPrice(),
                        originalPrice: hasDiscount ? formatPrice(getOriginalPrice()) : null,
                        plan: selectedPlan,
                        planLabel: getPlanLabel(),
                        categoryLabel: PACKS_DATA?.[category]?.title,
                        image: packImage,
                        pack: pack,
                        hasDiscount,
                        isPromocionPack,
                        isProteinsPack
                    }}
                />
            ) : (
                <MenuDetailsModal
                    menuKey={menuKey}
                    isOpen={showMenuModal}
                    onClose={() => setShowMenuModal(false)}
                    packInfo={{
                        name: pack?.name || 'Pack',
                        desc: pack?.desc || '',
                        icon: pack?.icon,
                        price: formatPrice(getFinalPrice()),
                        numericPrice: getFinalPrice(),
                        originalPrice: hasDiscount ? formatPrice(getOriginalPrice()) : null,
                        plan: selectedPlan,
                        planLabel: getPlanLabel(),
                        categoryLabel: PACKS_DATA?.[category]?.title,
                        image: packImage,
                        pack: pack,
                        hasDiscount,
                        isPromocionPack,
                        isProteinsPack
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
                        key={`${category}-${pack?.name || 'pack'}-${index}`}
                        pack={pack}
                        shipping={pack?.shipping || data.shipping}
                        category={pack?.sectionKey || category}
                        categoryLabel={pack?.categoryLabel || data.title}
                        promociones={promociones}
                        customImage={packImages[pack?.name]}
                        packsEspeciales={packsEspeciales}

                        {...rest}
                    />
                ))}
            </div>
        </>
    );
});


export default function PacksPage() {
    const query = useQuery();
    const location = useLocation();

    /**
     * Senior Deep Linking Logic:
     * 1. Check for 'filter', 'cat', or 'diet' parameters.
     * 2. Validate against available PACK_FILTERS.
     * 3. Set the active filter and its corresponding group.
     */
    const urlFilter = query.get('filter') || query.get('cat') || query.get('diet');
    const validFilter = PACK_FILTERS.find(f => f.id === urlFilter);
    const initialFilter = validFilter ? validFilter.id : 'todos';
    const initialGroup = validFilter ? (validFilter.groupId || 'todos') : 'todos';

    const { isChristmasMode } = useChristmas();
    const showPromoBanner = usePromoBanner();
    const { whatsappPhone } = useWhatsApp();
    const { addToCart } = useCart();
    const [isSticky, setIsSticky] = useState(false);
    const [packsData, setPacksData] = useState(PACKS_DATA);
    const [promociones, setPromociones] = useState([]);
    const [activeFilter, setActiveFilter] = useState(initialFilter);
    const [activePackGroup, setActivePackGroup] = useState(initialGroup);
    const initiallySelectedPackName = query.get('pack');

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
    const hasLoadedInitialData = useRef(false);

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

            invalidateCache('menus_official_current');
            invalidateCacheByType('menus_official');
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

            invalidateCache('menus_official_current');
            invalidateCacheByType('menus_official');
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
    const handleOpenDesayunos = useCallback(() => setDesayunosModalOpen(true), []);

    const handleEditDesayunos = useCallback(() => {
        setTempDesayunos([...desayunosMenu]);
        setTempDesayunosVeg([...desayunosVegetarianos]);
        setEditingDesayunos(true);
    }, [desayunosMenu, desayunosVegetarianos]);

    const handleEditProteinas = useCallback(() => {
        setTempProteinas(packsEspeciales['Pack 3 Proteínas']?.proteinas || []);
        setEditingProteinas(true);
    }, [packsEspeciales]);

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
                try {
                    const element = document.querySelector(location.hash);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                } catch (e) { /* hash con caracteres inválidos para CSS selector */ }
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
            if (!hasLoadedInitialData.current) {
                setIsLoading(true);
            }
            try {
                // Cargar proteínas dinámicas desde Firestore si existen
                if (menusData?.proteinasDisponibles) {
                    setPacksEspeciales(prev => ({
                        ...prev,
                        'Pack 3 Proteínas': { ...prev['Pack 3 Proteínas'], proteinas: menusData.proteinasDisponibles },
                        'Pack 5 Proteínas': { ...prev['Pack 5 Proteínas'], proteinas: menusData.proteinasDisponibles }
                    }));
                }

                // Cargar imágenes, precios y promociones en paralelo
                const [imagesMap, activePromos, pricesFromDb] = await Promise.all([
                    cachedFetch('packs_images_map', async () => {
                        const map = {};

                        // 1) Intentar leer de la colección 'imagenes' (Nuevo estándar del panel admin)
                        try {
                            const snapImg = await getDocs(collection(db, 'imagenes'));
                            snapImg.forEach((docSnap) => {
                                const data = docSnap.data();
                                const docId = docSnap.id;

                                // Si es un pack (ID empieza con pack-)
                                if (docId.startsWith('pack-') && data?.url) {
                                    // Mapear ID de admin a Nombre de pack en frontend
                                    // Ejem: 'pack-sin-carbos' -> 'Pack Sin Carbos'
                                    const name = docId
                                        .split('-')
                                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(' ');

                                    map[name] = cleanFirebaseUrl(data.url);
                                }
                            });
                        } catch (error) {
                            console.warn('[PacksPage] Error loading from imagenes collection:', error);
                        }

                        // 2) Intentar leer config/pack_images (Configuración centralizada)
                        try {
                            const ref = doc(db, 'config', 'pack_images');
                            const snap = await getDoc(ref);
                            if (snap.exists()) {
                                const data = snap.data() || {};
                                const source = data.images || data;
                                Object.keys(source || {}).forEach((name) => {
                                    const url = source[name];
                                    if (url) map[name] = cleanFirebaseUrl(url);
                                });
                            }
                        } catch (_) { }

                        // 3) Fallback: coleccion packs_imagenes (legacy)
                        try {
                            const snapLegacy = await getDocs(collection(db, 'packs_imagenes'));
                            snapLegacy.forEach((docSnap) => {
                                const data = docSnap.data();
                                if (data?.imagenUrl && data?.packName) {
                                    // Solo sobreescribir si no lo tenemos ya del nuevo sistema
                                    if (!map[data.packName]) {
                                        map[data.packName] = cleanFirebaseUrl(data.imagenUrl);
                                    }
                                }
                            });
                        } catch (_) { }

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
                                        planesAplicables: priceData.planesAplicables ?? [],
                                        metodosPermitidos: priceData.metodosPermitidos ?? null,
                                    };
                                }
                                return pack;
                            });
                        }
                    });

                    setPacksData(updatedPacksData);
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
            // Crear copia profunda para evitar mutar el objeto BASE global
            const updatedPacksEspeciales = JSON.parse(JSON.stringify(PACKS_ESPECIALES_BASE));

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
            if (menusData.proteinasDisponibles && Array.isArray(menusData.proteinasDisponibles) && menusData.proteinasDisponibles.length > 0) {
                if (updatedPacksEspeciales['Pack 3 Proteínas']) {
                    updatedPacksEspeciales['Pack 3 Proteínas'].proteinas = menusData.proteinasDisponibles;
                }
                if (updatedPacksEspeciales['Pack 5 Proteínas']) {
                    updatedPacksEspeciales['Pack 5 Proteínas'].proteinas = menusData.proteinasDisponibles;
                }
            }

            // Cargar desayunos (normalizar a strings si son objetos)
            if (menusData.desayuno) {
                const normalized = menusData.desayuno.map(item =>
                    typeof item === 'string' ? item : formatDishItem(item)
                );
                setDesayunosMenu(normalized);
                setTempDesayunos(normalized);
            }
            if (menusData.desayunoVegetariano) {
                const normalizedVeg = menusData.desayunoVegetariano.map(item =>
                    typeof item === 'string' ? item : formatDishItem(item)
                );
                setDesayunosVegetarianos(normalizedVeg);
                setTempDesayunosVeg(normalizedVeg);
            }

            setPacksEspeciales(updatedPacksEspeciales);
            hasLoadedInitialData.current = true;
            // No setIsLoading(false) aquí — Effect 1 (loadAllData) lo controla
            // Este effect procesa menús/proteínas y puede llegar antes que las imágenes de Cloudinary
        }
    }, [menusData, dataVersion]);

    return (
        <PageTransition>
            <SEOHead {...SEO_CONFIG.packs} />
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white pt-[76px]">
                <Navbar />

                {/* ── Barra de filtros SOLO MÓVIL (oculto en desktop lg+) ── */}
                <div className="lg:hidden bg-white/95 backdrop-blur-md pt-4 pb-3 border-b border-gray-100 z-30 shadow-sm transition-all duration-300">
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

            {/* Panel lateral de Ver Desayunos */}
            {desayunosModalOpen && ReactDOM.createPortal(
                <AnimatePresence>
                    <div className="fixed inset-0 z-[9999] flex justify-end">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                            onClick={() => setDesayunosModalOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full md:w-[52%] lg:w-[46%] xl:w-[40%] h-full bg-white shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Hero */}
                            <div className="relative h-[160px] sm:h-[220px] shrink-0 overflow-hidden bg-gradient-to-br from-amber-400 to-yellow-500">
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                    <span className="text-6xl mb-2">🍳</span>
                                    <h3 className="text-2xl font-black drop-shadow">Menú de Desayunos</h3>
                                    <p className="text-white/85 font-medium text-sm mt-1">5 desayunos · Lunes a Viernes</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDesayunosModalOpen(false)}
                                    className="absolute top-4 left-4 w-10 h-10 bg-white/15 hover:bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 border border-white/20"
                                >
                                    <ArrowLeft size={20} />
                                </button>
                                <div className="absolute top-4 right-4">
                                    <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-1 rounded-xl border border-white/25 uppercase tracking-widest">
                                        Pack Desayunos
                                    </span>
                                </div>
                            </div>

                            {/* Pack details */}
                            <div className="mx-5 mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 shrink-0">
                                <p className="text-xs font-black text-slate-800">5 desayunos · 1 persona</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { icon: '👤', text: '1 persona' },
                                        { icon: '☕', text: '5 desayunos por semana' },
                                        { icon: '📅', text: 'Lunes a Viernes' },
                                        { icon: '🌿', text: 'Regular o Vegetariano' },
                                    ].map((b, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-sm">
                                            <span className="text-base leading-none shrink-0">{b.icon}</span>
                                            <span className="text-[10px] font-bold text-slate-700 leading-tight">{b.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="mx-5 mt-4 flex bg-slate-100 p-1 rounded-2xl gap-1.5 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setActiveDesayunoTab('regular')}
                                    className={`flex-1 min-h-[44px] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeDesayunoTab === 'regular' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    ☀️ Regulares
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveDesayunoTab('vegetariano')}
                                    className={`flex-1 min-h-[44px] rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeDesayunoTab === 'vegetariano' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    🌿 Vegetarianos
                                </button>
                            </div>

                            {/* Dish list — scrollable */}
                            <div className="flex-1 overflow-y-auto side-panel-scrollbar px-5 py-4 space-y-2">
                                {(activeDesayunoTab === 'regular' ? desayunosMenu : desayunosVegetarianos).map((item, idx) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={idx}
                                        transition={{ delay: idx * 0.04 }}
                                        className="flex items-center gap-3 bg-slate-50 hover:bg-amber-50 border border-slate-100 hover:border-amber-200 p-3 rounded-2xl transition-colors group"
                                    >
                                        <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-105 transition-transform">
                                            {idx + 1}
                                        </div>
                                        <p className="font-bold text-slate-800 text-sm leading-snug">{item}</p>
                                    </motion.div>
                                ))}
                                {(activeDesayunoTab === 'regular' ? desayunosMenu : desayunosVegetarianos).length === 0 && (
                                    <p className="text-[11px] text-slate-300 italic py-6 text-center">Menú pendiente de actualizar...</p>
                                )}
                                <div className="h-4" />
                            </div>

                            {/* Sticky footer */}
                            <div className="shrink-0 bg-white border-t border-slate-100 px-5 pt-4 pb-6 shadow-[0_-12px_32px_rgba(0,0,0,0.08)]"
                                 style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Precio semanal</p>
                                        <p className="text-2xl font-black text-amber-500">₡{DESAYUNOS_PRECIO.toLocaleString('es-CR')}</p>
                                    </div>
                                    <span className="px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-100">
                                        5 Porciones
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAgregarDesayunos}
                                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-400/30 active:scale-[0.98]"
                                >
                                    <ShoppingCart size={20} />
                                    Agregar al Carrito
                                </button>
                            </div>

                            <style>{`
                                .side-panel-scrollbar::-webkit-scrollbar { width: 3px; }
                                .side-panel-scrollbar::-webkit-scrollbar-track { background: transparent; }
                                .side-panel-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
                            `}</style>
                        </motion.div>
                    </div>
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
