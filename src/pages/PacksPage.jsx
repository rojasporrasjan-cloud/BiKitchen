import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { ShoppingCart, X, Info, ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { getPackPrices } from '../utils/firestoreMenus';
import { getActivePromotions } from '../utils/firestorePromotions';
import { PACKS_DATA, PACKS_ESPECIALES_BASE } from '../data/packsData';
import { useQuery } from '../hooks/useQuery';
import { db } from '../firebase/config';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { cleanFirebaseUrl } from '../utils/firebaseUrl';
import { cachedFetch, invalidateCache, invalidateCacheByType } from '../utils/firestoreCache';
import { trackViewContent } from '../services/facebookPixel';
import SEOHead, { SEO_CONFIG, getPacksSchema, getBreadcrumbSchema } from '../components/SEOHead';
import UrgencyBanner from '../components/UrgencyBanner';
import { useMenusRefresh } from '../hooks/useMenusRefresh';
import { usePromoBanner } from '../hooks/usePromoBanner';
import { useChristmas } from '../context/ChristmasContext';
import { formatDishItem } from '../utils/menuUtils';
import useWhatsApp from '../hooks/useWhatsApp';
import PackCard, { PackSection } from '../components/PackCard';

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
            <SEOHead
                {...SEO_CONFIG.packs}
                structuredData={[
                    getPacksSchema(),
                    getBreadcrumbSchema([{ name: 'Planes Semanales', url: 'https://bikitchencr.com/packs' }])
                ]}
            />
            <div 
                className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white"
                style={{
                    paddingTop: showPromoBanner
                        ? 'calc(var(--promo-banner-height, 0px) + 96px)'
                        : '96px'
                }}
            >
                <Navbar />

                <style>{`
                    .hide-scrollbar::-webkit-scrollbar { display: none; }
                    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>

                {/* H1 — semánticamente correcto para Google, no interrumpe el layout */}
                <h1 className="sr-only">Planes Semanales de Comida Saludable en Costa Rica — Keto, Sin Carbos, Vegetariano, Familiar y más | BiKitchen</h1>

                {/* ── Layout: sidebar pega directo al navbar + columna de contenido ── */}
                <div className="flex flex-col lg:flex-row min-h-[calc(100vh-96px)]">

                    {/* ── SIDEBAR DESKTOP — llena desde el navbar hacia abajo ── */}
                    <aside 
                        className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0 sticky z-20 overflow-y-auto hide-scrollbar bg-white border-r border-gray-100 shadow-xl shadow-gray-200/20"
                        style={{
                            top: showPromoBanner
                                ? 'calc(var(--promo-banner-height, 0px) + 96px)'
                                : '96px',
                            height: showPromoBanner
                                ? 'calc(100vh - var(--promo-banner-height, 0px) - 96px)'
                                : 'calc(100vh - 96px)'
                        }}
                    >
                        <div className="flex flex-col h-full">
                            {/* Título del sidebar — usa p, no h1 (el h1 ya está sr-only arriba) */}
                            <div className="px-4 pt-5 pb-3 border-b border-gray-100">
                                <p className="text-base font-black text-gray-900 leading-tight">Planes <span className="text-orange-500">Semanales</span></p>
                                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Comida saludable · Delivery CR</p>
                            </div>

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
                                <p className="text-xs text-gray-500 mb-3 leading-relaxed">Compara planes o calculá cuánto ahorrás.</p>
                                <div className="flex flex-col gap-2">
                                    <a
                                        href="/comparador"
                                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-black py-2 px-3 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-sm"
                                    >
                                        <span>⚡</span> Comparar packs
                                    </a>
                                    <a
                                        href="/calculadora"
                                        className="flex items-center justify-center gap-2 bg-white text-orange-600 text-xs font-bold py-2 px-3 rounded-lg border border-orange-200 hover:bg-orange-50 transition-all"
                                    >
                                        <span>💰</span> Calculá tu ahorro
                                    </a>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* ── COLUMNA DERECHA: banner + filtros + cards ── */}
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* Banner de urgencia — ancho completo del área de contenido */}
                        <UrgencyBanner className="shadow-sm" />

                        {/* Recomendador Rápido — solo desktop, una fila */}
                        <div className="hidden lg:block bg-orange-50 border-b border-orange-100 px-4 py-3">
                            <p className="text-[11px] font-black text-orange-400 uppercase tracking-wider mb-2 text-center">¿No sabés cuál elegir?</p>
                            <div className="flex gap-2 justify-center flex-wrap">
                                {[
                                    { label: 'Bajar de peso', icon: '🥗', filter: 'bajo_calorias' },
                                    { label: 'Sin carbos', icon: '🥩', filter: 'sin_carbos' },
                                    { label: 'Keto', icon: '🥑', filter: 'keto' },
                                    { label: 'Vegetariano', icon: '🥦', filter: 'vegetariano' },
                                    { label: 'Para mi familia', icon: '👨‍👩‍👧‍👦', filter: 'familiar' },
                                    { label: 'El más popular', icon: '⭐', filter: 'two_pack' },
                                ].map((opt) => (
                                    <button
                                        key={opt.filter}
                                        onClick={() => setActiveFilter(opt.filter)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 active:scale-95 ${
                                            activeFilter === opt.filter
                                                ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                                : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                                        }`}
                                    >
                                        {opt.icon} {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Filtros MÓVIL — chips visibles en grid, sin scroll horizontal */}
                        <div className="lg:hidden bg-white px-4 pt-3 pb-4 border-b border-gray-100 shadow-sm">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Filtrar por</p>
                            <div className="flex flex-wrap gap-2">
                                {PACK_FILTERS.map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setActiveFilter(filter.id)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                                            activeFilter === filter.id
                                                ? 'bg-orange-500 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        <span>{filter.icon}</span>
                                        <span>{filter.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── CONTENIDO PRINCIPAL ── */}
                        <main ref={packsContainerRef} className="flex-1 p-4 sm:p-5 lg:p-10 pb-32">
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
                    </div>{/* ── end right column ── */}
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
                            className="absolute inset-0 bg-black/60"
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
                                    className="absolute top-4 left-4 w-10 h-10 bg-white/25 hover:bg-white/40 rounded-2xl flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95 border border-white/30"
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
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
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
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4"
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
