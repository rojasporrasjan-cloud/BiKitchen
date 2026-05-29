import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import { ShoppingCart, Truck, Check, Info, Eye, X, Gift, Tag, Flame, Leaf, Users, Zap, Package, Edit, Plus, ChevronDown, ArrowLeft } from 'lucide-react';
import SubstitutionPicker from './SubstitutionPicker';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import MenuDetailsModal from './menus/MenuDetailsModal';
import MenuDetailsModalWithTabs from './menus/MenuDetailsModalWithTabs';
import { PACKS_DATA, PACK_TO_MENU_KEY, DEFAULT_PACK_IMAGES, PACKS_ESPECIALES_BASE } from '../data/packsData';
import { formatPrice } from '../utils/formatters';
import SmoothImage from './SmoothImage';
import useWhatsApp from '../hooks/useWhatsApp';
import { WHATSAPP_MESSAGES } from '../config/whatsappMessages';

// Imagen por defecto para packs
const DEFAULT_PACK_IMAGE = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=250&fit=crop&q=80';

// Variantes de animacion optimizadas
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

// Convierte cualquier forma de fecha a JS Date
const toJsDate = (val) => {
    if (!val) return null;
    if (typeof val.toDate === 'function') return val.toDate();
    if (val.seconds !== undefined) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
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

    // URL de WhatsApp con pack pre-seleccionado en el mensaje
    const waOrderUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
        WHATSAPP_MESSAGES.PACK_ORDER(pack.name, formatPrice(cardPrice.disc ?? cardPrice.orig))
    )}`;

    return (
        <>
            <motion.div
                ref={cardRef}
                variants={cardVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.3 }}
                className={`group rounded-[1.75rem] sm:rounded-[2.5rem] h-72 sm:h-80 lg:h-96 w-full shadow-xl hover:shadow-2xl bg-gray-900 overflow-hidden relative cursor-pointer hover:-translate-y-1.5 active:translate-y-0 transition-transform duration-300 ${pack.featured ? 'ring-2 ring-orange-500 ring-offset-4' : ''}`}
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
                    className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                    aspectRatio=""
                    placeholderColor="bg-gradient-to-br from-gray-100 to-gray-50"
                />

                {/* Gradient Overlay Inmersivo */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                {/* Content Overlay */}
                <div className="absolute inset-0 p-3 sm:p-6 flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                        {/* Status/Category Badge with Glassmorphism */}
                        <div className="flex flex-col gap-2">
                            {displayCategoryLabel && (
                                <div className="bg-white/25 px-2 py-1 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl border border-white/25 shadow-xl">
                                    <span className="text-[9px] sm:text-xs font-black text-white tracking-tight flex items-center gap-1 sm:gap-2">
                                        <Package size={14} className="text-orange-400" />
                                        {displayCategoryLabel}
                                    </span>
                                </div>
                            )}

                            {isTwoPack && (
                                <div className="hidden sm:flex bg-orange-600 text-white px-3 py-1.5 rounded-xl text-[9px] font-black items-center gap-1.5 shadow-xl border border-orange-400/30 uppercase tracking-tighter">
                                    <Users size={12} />
                                    10 Comidas (5 x Pers.)
                                </div>
                            )}
                        </div>

                        {/* Promo Badge */}
                        {(hasDiscount || tienePromo) && (
                            <div className="bg-orange-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                                {pack.etiquetaTexto || 'OFERTA'}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2 pb-9">
                        {/* Icon/Emoji Floating */}
                        <div className="w-7 h-7 sm:w-12 sm:h-12 bg-white/15 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-3xl shadow-2xl border border-white/15">
                            {pack.icon}
                        </div>

                        <div>
                            <h3 className="text-sm sm:text-xl lg:text-3xl font-black text-white leading-tight" style={{textShadow:'0 2px 12px rgba(0,0,0,0.7)'}}>
                                {pack.name}
                            </h3>
                            <p className="text-[9px] sm:text-xs lg:text-sm text-slate-100 line-clamp-1 sm:line-clamp-2 mt-1 sm:mt-2 font-semibold leading-snug" style={{textShadow:'0 1px 4px rgba(0,0,0,0.6)'}}>
                                {pack.desc}
                            </p>
                        </div>

                        {/* Price & Action */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{cardPrice.label}</span>
                                {cardPrice.disc ? (
                                    <div className="flex flex-col items-start gap-0.5">
                                        <span className="text-xs sm:text-sm font-black text-white/50 line-through leading-none">
                                            {formatPrice(cardPrice.orig)}
                                        </span>
                                        <span className="text-base sm:text-xl lg:text-2xl font-black text-orange-400 leading-none">
                                            {formatPrice(cardPrice.disc)}
                                        </span>
                                    </div>
                                ) : (
                                    <span className="text-base sm:text-xl lg:text-2xl font-black text-white">
                                        {formatPrice(cardPrice.orig)}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] font-black text-white bg-orange-600 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-lg hover:bg-orange-500 transition-colors uppercase tracking-widest">
                                <Plus size={11} strokeWidth={4} />
                                <span className="hidden sm:inline">Ver menú</span>
                            </div>
                        </div>

                    </div>
                </div>

                {/* WhatsApp button — absolute bottom, siempre visible */}
                {!isMaintenance && (
                    <a
                        href={waOrderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Pedir ${pack.name} por WhatsApp`}
                        className="absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 active:bg-green-600 text-white text-[11px] font-black py-2.5 transition-colors uppercase tracking-wider"
                    >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span>Pedir por WhatsApp</span>
                    </a>
                )}

                {/* Maintenance Overlay */}
                {isMaintenance && (
                    <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center text-white">
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
                            className="absolute inset-0 bg-black/70"
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
                                    className="absolute top-4 left-4 w-10 h-10 bg-white/25 hover:bg-white/40 rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 border border-white/30 z-10"
                                >
                                    <ArrowLeft size={20} />
                                </button>

                                <div className="absolute top-4 right-4 z-10">
                                    <span className="bg-white/25 text-white text-[9px] font-black px-3 py-1.5 rounded-xl border border-white/30 uppercase tracking-widest">
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

            {/* Encabezado de sección */}
            <div className="mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    {data.icon && <span className="text-xl sm:text-2xl" aria-hidden="true">{data.icon}</span>}
                    <h2 className="text-base sm:text-2xl font-black text-gray-900 leading-tight">{data.title}</h2>
                </div>
                {data.subtitle && (
                    <p className="text-[10px] sm:text-sm text-gray-400 mt-0.5 sm:mt-1 leading-snug">{data.subtitle}</p>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-6 mb-12 sm:mb-24">
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
export { PackSection };
export default PackCard;
