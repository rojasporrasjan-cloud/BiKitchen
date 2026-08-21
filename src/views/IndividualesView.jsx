import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { INDIVIDUALES_CATEGORIES, CATEGORY_ICONS, getProductUnits, individualesData, productsBySlug } from '../data/individualesData';
import { Search, ShoppingCart, X, Minus, Plus, ChevronDown, Check, Package } from 'lucide-react';
import IndividualCard from '../components/IndividualCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { uploadOptimizedImage } from '../services/cloudinaryService';
import { cleanFirebaseUrl } from '../utils/firebaseUrl';
import { cachedFetch, invalidateCache } from '../utils/firestoreCache';
import { getIndividualPrices } from '../utils/firestoreMenus';

import { useParams } from 'react-router-dom';
import { useQuery } from '../hooks/useQuery';
import { trackViewContent, trackViewCategory, trackViewMenu } from '../services/facebookPixel';
import SEOHead, { SEO_CONFIG } from '../components/SEOHead';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WHATSAPP_MESSAGES } from '../config/whatsappMessages';
import { formatPrice } from '../utils/formatters';
import UrgencyBanner from '../components/UrgencyBanner';
import { usePromoBanner } from '../hooks/usePromoBanner';

const CATEGORY_HIGHLIGHTS = {
  Pollo:       [{ icon: '🥩', label: 'Alto en proteínas' }],
  Res:         [{ icon: '💪', label: 'Proteína completa' }],
  Cerdo:       [{ icon: '🍖', label: 'Sabor intenso' }],
  Pescado:     [{ icon: '🐟', label: 'Rico en Omega-3' }],
  Vegetariano: [{ icon: '🌱', label: 'Sin carne' }],
  Leguminosas: [{ icon: '🫘', label: 'Alto en fibra' }],
  Arroces:     [{ icon: '🍚', label: 'Guarnición perfecta' }],
  Pastas:      [{ icon: '🍝', label: 'Energía sostenida' }],
  Ensaladas:   [{ icon: '🥗', label: 'Bajo en calorías' }],
  Desayunos:   [{ icon: '🌅', label: 'Para empezar el día' }],
  Sopas:       [{ icon: '🫕', label: 'Reconfortante' }],
  Vegetales:   [{ icon: '🥦', label: 'Rico en nutrientes' }],
  Picadillos:  [{ icon: '🍲', label: 'Receta tradicional' }],
  Pasteles:    [{ icon: '🥘', label: 'Cocina casera' }],
  Compuestos:  [{ icon: '🍽️', label: 'Plato completo' }],
};

export default function IndividualesView() {
  const query = useQuery();
  const { slug } = useParams() || {};
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { whatsappPhone } = useWhatsApp();

  // Soporte para abrir un producto específico directamente (Meta Ads / SEO slug routes)
  useEffect(() => {
    // 1. Handle ?id= or ?producto= query params (Meta Ads deep-links)
    const productId = query.get('id') || query.get('producto');
    if (productId) {
      const product = individualesData.find(p => p.id === productId);
      if (product) {
        setCategoriaActiva(product.categoria);
        setTimeout(() => {
          setProductoSeleccionado(product);
          if (product.precio500) setTamano('500');
          else if (product.precio1kg) setTamano('1000');
        }, 100);
        return;
      }
    }
    // 2. Handle /individuales/:slug SEO routes
    if (slug) {
      const product = productsBySlug[slug];
      if (product) {
        setCategoriaActiva(product.categoria);
        setTimeout(() => {
          setProductoSeleccionado(product);
          if (product.precio500) setTamano('500');
          else if (product.precio1kg) setTamano('1000');
        }, 100);
      }
    }
  }, []); // Solo al montar la página

  /**
   * Determine the initial category based on the URL parameter 'categoria' or 'cat'.
   * Fallback to the first available category if not found or invalid.
   */
  const urlCat = query.get('categoria') || query.get('cat');
  const initialCat = INDIVIDUALES_CATEGORIES.find(
    c => c.toLowerCase() === urlCat?.toLowerCase()
  ) || INDIVIDUALES_CATEGORIES[0];

  const [categoriaActiva, setCategoriaActiva] = useState(initialCat);
  const [busqueda, setBusqueda] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [tamano, setTamano] = useState('500'); // '500' o '1000'
  const [cantidad, setCantidad] = useState(1);
  const [imagenesCustom, setImagenesCustom] = useState({}); // { [idProducto]: url }
  const [loadingImages, setLoadingImages] = useState(true);
  const [individualDiscounts, setIndividualDiscounts] = useState({});
  const [isSticky, setIsSticky] = useState(false);
  const [activeGroup, setActiveGroup] = useState('Proteínas');

  const showPromoBanner = usePromoBanner();

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (productoSeleccionado) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [productoSeleccionado]);

  // Actualizar título de página cuando se abre/cierra un producto (SEO dinámico)
  useEffect(() => {
    if (productoSeleccionado) {
      document.title = `${productoSeleccionado.nombre} | Platos Individuales BiKitchen`;
    } else {
      document.title = 'Platos Individuales | Comida Saludable a Domicilio | BiKitchen';
    }
  }, [productoSeleccionado]);

  // Manejar header sticky
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cargar descuentos de platos individuales desde Firebase
  useEffect(() => {
    getIndividualPrices()
      .then(data => setIndividualDiscounts(data || {}))
      .catch(() => {});
  }, []);

  // Obtener descuento activo de un producto (null si no aplica o fuera de rango)
  const getActiveDiscount = (productId) => {
    const disc = individualDiscounts[productId];
    if (!disc || !disc.descuentoActivo) return null;
    const now = new Date();
    const inicio = disc.fechaInicio
      ? new Date(disc.fechaInicio.toDate ? disc.fechaInicio.toDate() : disc.fechaInicio)
      : null;
    const fin = disc.fechaFin
      ? (() => {
          const d = new Date(disc.fechaFin.toDate ? disc.fechaFin.toDate() : disc.fechaFin);
          d.setHours(23, 59, 59, 999); // Expira al final del día (hora local)
          return d;
        })()
      : null;
    if (inicio && now < inicio) return null;
    if (fin && now > fin) return null;
    return disc;
  };

  // Calcular precio con descuento para un producto y tamaño
  const getDiscountedPrice = (product, size) => {
    const rawPrice = size === '500' ? product.precio500 : product.precio1kg;
    if (!rawPrice) return rawPrice;
    const disc = getActiveDiscount(product.id);
    if (!disc) return rawPrice;
    if (disc.tipoDescuento === 'porcentaje') {
      return Math.round(rawPrice * (1 - disc.valorDescuento / 100));
    }
    return Math.max(0, rawPrice - disc.valorDescuento);
  };

  // Grupos de categorías para mejor organización
  const categoryGroups = useMemo(() => ([
    { id: 'Todos', label: 'Todos', icon: '✨' },
    { id: 'Proteínas', label: 'Proteínas', icon: '🥩', categories: ['Pollo', 'Res', 'Cerdo', 'Pescado', 'Vegetariano', 'Leguminosas'] },
    { id: 'Guarniciones', label: 'Guarniciones', icon: '🍚', categories: ['Arroces', 'Pastas', 'Picadillos', 'Vegetales', 'Sopas', 'Pasteles', 'Compuestos'] },
    { id: 'Frescos', label: 'Frescos', icon: '🥗', categories: ['Ensaladas', 'Desayunos'] }
  ]), []);

  // Calcular contadores por categoría
  const categoryCounts = useMemo(() => {
    const counts = {};
    individualesData.forEach(p => {
      counts[p.categoria] = (counts[p.categoria] || 0) + 1;
    });
    return counts;
  }, []);

  // Categorías filtradas por grupo
  const categoriasFiltradasPorGrupo = useMemo(() => {
    if (activeGroup === 'Todos') return INDIVIDUALES_CATEGORIES;
    const group = categoryGroups.find(g => g.id === activeGroup);
    return group ? group.categories : INDIVIDUALES_CATEGORIES;
  }, [activeGroup, categoryGroups]);

  const handleUploadImage = (producto) => {
    if (!isAdmin || !isAdmin()) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      try {
        toast.loading('Subiendo imagen...', { id: 'upload-image' });
        const result = await uploadOptimizedImage(file, 'bikitchen/individuales', { maxSize: 1080, quality: 0.75 });
        const url = result.url;

        const confRef = doc(db, 'config', 'individual_images');
        await setDoc(confRef, {
          updatedAt: new Date().toISOString(),
          images: {
            [producto.id]: url
          },
          publicIds: {
            [producto.id]: result.publicId
          }
        }, { merge: true });

        await setDoc(doc(db, 'individuales_imagenes', producto.id), { imagenUrl: url, cloudinaryPublicId: result.publicId }, { merge: true });
        invalidateCache('individuales_images_map');
        setImagenesCustom((prev) => ({ ...prev, [producto.id]: url }));
        toast.success('Imagen actualizada correctamente', { id: 'upload-image' });
      } catch (error) {
        console.error('Error subiendo imagen:', error);
        toast.error(`No se pudo subir la imagen: ${error.message}`, { id: 'upload-image' });
      }
    };
    input.click();
  };

  useEffect(() => {
    const cargarImagenes = async () => {
      setLoadingImages(true);
      try {
        const map = await cachedFetch('individuales_images_map', async () => {
          try {
            const confRef = doc(db, 'config', 'individual_images');
            const confSnap = await getDoc(confRef);
            if (confSnap.exists()) {
              const data = confSnap.data() || {};
              const images = data.images || data;
              const result = {};
              Object.keys(images || {}).forEach((key) => {
                const url = images[key];
                if (url) result[key] = cleanFirebaseUrl(url);
              });
              return result;
            }
          } catch (_) { }

          const result = {};
          const [snapshot1, snapshot2] = await Promise.all([
            getDocs(collection(db, 'individuales_imagenes')),
            getDocs(collection(db, 'imagenes'))
          ]);
          snapshot1.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.imagenUrl) {
              result[docSnap.id] = cleanFirebaseUrl(data.imagenUrl);
            }
          });
          snapshot2.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.url && data.categoria === 'platillos') {
              const platilloId = data.platilloId || docSnap.id;
              result[platilloId] = cleanFirebaseUrl(data.url);
            }
          });
          return result;
        }, 'individual_images');

        setImagenesCustom(map || {});
      } catch (error) {
        console.error('Error cargando imágenes personalizadas:', error);
      } finally {
        setLoadingImages(false);
      }
    };
    cargarImagenes();
  }, []);

  const productosFiltrados = useMemo(() => {
    let base = individualesData;
    if (!isAdmin || !isAdmin()) {
      base = base.filter(p => !p.id?.includes('test-nmi-prod'));
    }
    if (!busqueda.trim()) return base;
    const termino = busqueda.toLowerCase().trim();
    return base.filter((p) =>
      p.nombre.toLowerCase().includes(termino) ||
      p.categoria.toLowerCase().includes(termino)
    );
  }, [busqueda, isAdmin]);

  const groupCounts = useMemo(() => {
    const counts = { Todos: individualesData.length };
    categoryGroups.forEach(group => {
      if (group.id === 'Todos') return;
      counts[group.id] = individualesData.filter(p => group.categories.includes(p.categoria)).length;
    });
    return counts;
  }, [categoryGroups]);

  const productosPorCategoria = useMemo(() => {
    if (loadingImages) return [];
    const base = INDIVIDUALES_CATEGORIES.filter((c) => c === categoriaActiva);
    return base.map((categoria) => ({
      categoria,
      productos: productosFiltrados
        .filter((p) => p.categoria === categoria)
        .map((p) => {
          // Si es Picadillos o Vegetales, priorizamos la imagen del código (Cloudinary)
          // para evitar que los placeholders viejos de la base de datos bloqueen el overhaul visual.
          const isTargetOverhaul = p.categoria === 'Picadillos' || p.categoria === 'Vegetales' || p.categoria === 'Sopas';
          return {
            ...p,
            imagen: isTargetOverhaul ? p.imagen : (imagenesCustom[p.id] || p.imagen)
          };
        })
    }));
  }, [categoriaActiva, productosFiltrados, imagenesCustom, loadingImages]);

  const totalResultados = useMemo(() => {
    return productosPorCategoria.reduce((acc, cat) => acc + cat.productos.length, 0);
  }, [productosPorCategoria]);

  const abrirModal = (producto) => {
    setProductoSeleccionado(producto);
    if (producto.precio500) {
      setTamano('500');
    } else if (producto.precio1kg) {
      setTamano('1000');
    }
    setCantidad(1);
  };

  const cerrarModal = () => {
    setProductoSeleccionado(null);
  };

  const getPrecioOriginal = () => {
    if (!productoSeleccionado) return 0;
    if (tamano === '500') return productoSeleccionado.precio500 || 0;
    return productoSeleccionado.precio1kg || 0;
  };

  const getPrecioSeleccionado = () => {
    if (!productoSeleccionado) return 0;
    return getDiscountedPrice(productoSeleccionado, tamano) || 0;
  };

  const handleAgregarCarrito = () => {
    const precio = getPrecioSeleccionado();
    const precioOriginal = getPrecioOriginal();
    if (!precio) {
      toast.error('Este tamaño no está disponible para este producto.');
      return;
    }
    const units = getProductUnits(productoSeleccionado.categoria);
    const labelUnidad = tamano === '500' ? units.labelPequeno : units.labelGrande;
    const isTargetOverhaul = productoSeleccionado.categoria === 'Picadillos' || productoSeleccionado.categoria === 'Vegetales' || productoSeleccionado.categoria === 'Sopas';
    const imagenProducto = isTargetOverhaul ? productoSeleccionado.imagen : (imagenesCustom[productoSeleccionado.id] || productoSeleccionado.imagen);
    const disc = getActiveDiscount(productoSeleccionado.id);
    const hayDescuento = !!disc && precio < precioOriginal;
    addToCart({
      id: `${productoSeleccionado.id}-${tamano}`,
      name: productoSeleccionado.nombre,
      desc: productoSeleccionado.descripcion,
      price: precio,
      originalPrice: hayDescuento ? precioOriginal : undefined,
      discountMetodos: hayDescuento ? (disc.metodosPermitidos || null) : undefined,
      quantity: cantidad,
      plan: 'individual',
      planLabel: `Individual ${labelUnidad}`,
      image: imagenProducto
    });
    toast.success(`${productoSeleccionado.nombre} agregado al carrito`);
    cerrarModal();
  };

  return (
    <PageTransition>
      <SEOHead {...SEO_CONFIG.individuales} />
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 text-gray-900 flex flex-col">
        <Navbar />

        <main 
          className="flex-1"
          style={{
            paddingTop: showPromoBanner
              ? 'calc(var(--promo-banner-height, 36px) + 76px)'
              : '76px'
          }}
        >
          {/* Banner cuenta regresiva — encima de los filtros, igual que packs */}
          <UrgencyBanner className="shadow-sm" />

          {/* ── Filtros MÓVIL — estilo packs ── */}
          <div className="lg:hidden bg-white px-4 pt-3 pb-4 border-b border-gray-100 shadow-sm">
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Filtrar por</p>
            <div className="flex flex-wrap gap-2">
              {categoryGroups.filter(g => g.id !== 'Todos').map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    setActiveGroup(group.id);
                    const firstCat = group.categories?.[0];
                    if (firstCat) setCategoriaActiva(firstCat);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                    activeGroup === group.id
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <span>{group.icon}</span>
                  <span>{group.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoría</p>
              <div className="flex flex-wrap gap-2">
                {categoriasFiltradasPorGrupo.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoriaActiva(cat)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${
                      categoriaActiva === cat
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <span>{CATEGORY_ICONS[cat] || '📦'}</span>
                    <span>{cat}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="flex flex-col lg:flex-row min-h-screen relative">
            {/* ── SIDEBAR DESKTOP ── */}
            <aside 
              className="hidden lg:flex flex-col gap-3 w-64 xl:w-72 flex-shrink-0 sticky z-20 overflow-y-auto hide-scrollbar bg-white border-r border-gray-100 shadow-xl shadow-gray-200/20"
              style={{
                top: showPromoBanner
                  ? 'calc(var(--promo-banner-height, 36px) + 84px)'
                  : '84px',
                height: showPromoBanner
                  ? 'calc(100vh - var(--promo-banner-height, 36px) - 84px)'
                  : 'calc(100vh - 84px)'
              }}
            >
              <div className="flex flex-col h-full">
                {/* Buscador Integrado en Sidebar */}
                <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar..."
                      className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    />
                    {busqueda && (
                      <button
                        onClick={() => setBusqueda('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="p-3 space-y-0.5">
                  <button
                    onClick={() => {
                      setCategoriaActiva(INDIVIDUALES_CATEGORIES[0]);
                      setActiveGroup('Todos');
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 mb-2 ${activeGroup === 'Todos'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                      : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-lg">✨</span>
                      <span>Todos</span>
                    </span>
                    <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${activeGroup === 'Todos' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {Object.values(categoryCounts).reduce((a, b) => a + b, 0)}
                    </span>
                  </button>

                  <div className="space-y-4">
                    {categoryGroups.filter(g => g.id !== 'Todos').map((group) => {
                      const groupCats = group.categories || [];
                      return (
                        <div key={group.id} className="pt-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-gray-400 mb-1.5 px-1 flex items-center gap-1.5">
                            <span>{group.icon}</span>
                            {group.label}
                          </p>
                          <div className="space-y-0.5">
                            {groupCats.map((cat) => {
                              const isActive = categoriaActiva === cat;
                              return (
                                <button
                                  key={cat}
                                  onClick={() => {
                                    setCategoriaActiva(cat);
                                    setActiveGroup(group.id);
                                  }}
                                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20'
                                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                                    }`}
                                >
                                  <span className="flex items-center gap-2.5">
                                    <span className="text-base">{CATEGORY_ICONS[cat] || '📦'}</span>
                                    <span>{cat}</span>
                                  </span>
                                  <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {categoryCounts[cat] || 0}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 mt-auto">
                  <a
                    href={`https://wa.me/${whatsappPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-sm shadow-lg hover:shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <span>💬</span>
                    WhatsApp
                  </a>
                </div>
              </div>
            </aside>

            {/* ── CONTENIDO PRINCIPAL ── */}
            <section className="flex-1 p-4 sm:p-6 lg:p-10">
              <div className="max-w-7xl mx-auto">
                {/* Skeleton loader */}
                {loadingImages && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    {[1, 2, 3, 4, 5, 6].map((card) => (
                      <div key={card} className="bg-white rounded-3xl h-80 animate-pulse border border-gray-100" />
                    ))}
                  </div>
                )}

                {/* Secciones por categoría */}
                {!loadingImages && (
                  <div className="space-y-12 pb-16">
                    {productosPorCategoria.map(({ categoria, productos }) => (
                      productos.length === 0 ? null : (
                        <motion.section
                          key={categoria}
                          className="space-y-6"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex items-center justify-between border-b-2 border-gray-100 pb-3 sm:pb-4">
                            <h2 className="text-base sm:text-2xl font-black text-gray-900 flex items-center gap-2 sm:gap-3">
                              <span className="text-xl sm:text-3xl">{CATEGORY_ICONS[categoria] || '📦'}</span>
                              <span className="text-orange-600 capitalize">{categoria}</span>
                            </h2>
                            <span className="text-[10px] sm:text-xs text-gray-400 font-black uppercase tracking-widest bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-gray-100">
                              {productos.length} Platos
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                            {productos.map((producto) => {
                              const disc = getActiveDiscount(producto.id);
                              const precioDesde = disc
                                ? getDiscountedPrice(producto, '500') ?? getDiscountedPrice(producto, '1000')
                                : undefined;
                              const mostrarLabel = disc && disc.mostrarEtiqueta !== false;
                              const discountLabel = mostrarLabel
                                ? (disc.etiquetaTexto || (disc.tipoDescuento === 'porcentaje'
                                    ? `${disc.valorDescuento}% OFF`
                                    : `-₡${Number(disc.valorDescuento).toLocaleString('es-CR')}`))
                                : undefined;
                              return (
                                <IndividualCard
                                  key={producto.id}
                                  producto={producto}
                                  onClick={() => abrirModal(producto)}
                                  canEditImage={isAdmin && isAdmin()}
                                  onUploadImage={() => handleUploadImage(producto)}
                                  discountLabel={discountLabel}
                                  precioDesde={precioDesde}
                                  whatsappPhone={whatsappPhone}
                                />
                              );
                            })}
                          </div>
                        </motion.section>
                      )
                    ))}

                    {productosPorCategoria.every((c) => c.productos.length === 0) && (
                      <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4">🔍</div>
                        <p className="text-gray-900 text-xl font-black">No hay resultados</p>
                        <p className="text-gray-400 text-sm mt-2">Intenta con otra categoría o término de búsqueda</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
        <Footer />

        {/* ── MODAL PLATO INDIVIDUAL — Mobile-First ── */}
        {productoSeleccionado && ReactDOM.createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cerrarModal}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] max-w-lg w-full h-[93vh] sm:h-auto sm:max-h-[88vh] shadow-2xl flex flex-col overflow-hidden"
              >
                {/* ── HERO — compact on mobile ── */}
                <div className="relative h-[200px] sm:h-[320px] w-full shrink-0">
                  <img
                    src={(() => {
                      const isTarget = productoSeleccionado.categoria === 'Picadillos' || productoSeleccionado.categoria === 'Vegetales' || productoSeleccionado.categoria === 'Sopas';
                      return isTarget ? productoSeleccionado.imagen : (imagenesCustom[productoSeleccionado.id] || productoSeleccionado.imagen);
                    })()}
                    alt={productoSeleccionado.nombre}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Close */}
                  <button
                    onClick={cerrarModal}
                    className="absolute top-4 right-4 w-9 h-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-900 hover:bg-white transition-all shadow-xl border border-slate-100 z-10"
                  >
                    <X size={18} />
                  </button>

                  {/* Title over hero */}
                  <div className="absolute bottom-4 left-4 right-14">
                    <span className="inline-block bg-orange-600 text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider mb-1">
                      {productoSeleccionado.categoria}
                    </span>
                    <h3 className="text-xl sm:text-3xl font-black text-white leading-tight drop-shadow-lg">
                      {productoSeleccionado.nombre}
                    </h3>
                  </div>
                </div>

                {/* ── SCROLLABLE BODY ── */}
                <div className="flex-1 overflow-y-auto ind-modal-scrollbar">
                  <div className="p-5 space-y-4">

                    {/* Description */}
                    {productoSeleccionado.descripcion &&
                      productoSeleccionado.descripcion !== '4 tazas / 6 tazas' &&
                      productoSeleccionado.descripcion !== '500 gramos / 1 kg' &&
                      productoSeleccionado.descripcion !== '4 porc. / 8 porc.' && (
                        <p className="text-sm text-gray-500 italic leading-relaxed border-l-4 border-orange-200 pl-3">
                          "{productoSeleccionado.descripcion}"
                        </p>
                      )}

                    {/* Características del plato */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Características</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { icon: '🌿', label: 'Sin conservantes' },
                          { icon: '🔥', label: 'Cocido fresco' },
                          { icon: '📦', label: 'Listo para servir' },
                          ...(CATEGORY_HIGHLIGHTS[productoSeleccionado.categoria] || [])
                        ].map((tag) => (
                          <span key={tag.label} className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full text-[11px] font-bold text-orange-700">
                            <span aria-hidden="true">{tag.icon}</span>
                            {tag.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* WhatsApp CTA alternativo */}
                    {whatsappPhone && (
                      <a
                        href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(WHATSAPP_MESSAGES.INDIVIDUAL_ORDER(productoSeleccionado.nombre, formatPrice(getPrecioSeleccionado())))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl p-4 hover:bg-green-100 active:bg-green-200 transition-colors group"
                      >
                        <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-green-800">Pedir por WhatsApp</p>
                          <p className="text-[11px] text-green-600 leading-snug">Confirmamos tu pedido al instante</p>
                        </div>
                        <ChevronDown size={16} className="text-green-400 -rotate-90 shrink-0 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                      </a>
                    )}

                    {/* ── Productos relacionados en la misma categoría ── */}
                    {(() => {
                      const relacionados = individualesData
                        .filter(p =>
                          p.categoria === productoSeleccionado.categoria &&
                          p.id !== productoSeleccionado.id &&
                          p.precio500 &&
                          !p.id.includes('test')
                        )
                        .slice(0, 3);
                      if (!relacionados.length) return null;
                      return (
                        <div className="space-y-2">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            También en {productoSeleccionado.categoria}
                          </p>
                          <div className="flex flex-col gap-2">
                            {relacionados.map(prod => (
                              <button
                                key={prod.id}
                                onClick={() => abrirModal(prod)}
                                className="flex items-center gap-3 w-full bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 p-3 rounded-2xl transition-colors text-left active:scale-[0.98] group"
                              >
                                <span className="text-2xl" aria-hidden="true">{CATEGORY_ICONS[prod.categoria] || '🍽️'}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold text-slate-800 leading-tight truncate">{prod.nombre}</p>
                                  <p className="text-xs text-orange-500 font-bold mt-0.5">desde ₡{prod.precio500.toLocaleString('es-CR')}</p>
                                </div>
                                <ChevronDown size={16} className="text-slate-300 -rotate-90 shrink-0 group-hover:text-orange-400 transition-colors" aria-hidden="true" />
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Size selector */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Elige el tamaño</p>
                      <div className="grid grid-cols-2 gap-3">
                        {['500', '1000'].map((size) => {
                          const units = getProductUnits(productoSeleccionado.categoria);
                          const label = size === '500' ? units.unidadPequena : units.unidadGrande;
                          const price = size === '500' ? productoSeleccionado.precio500 : productoSeleccionado.precio1kg;
                          if (!price) return null;
                          const discountedPrice = getDiscountedPrice(productoSeleccionado, size);
                          const sizeHasDiscount = discountedPrice != null && discountedPrice < price;
                          const isActive = tamano === size;
                          return (
                            <button
                              key={size}
                              onClick={() => setTamano(size)}
                              className={`p-4 rounded-2xl border-2 transition-all active:scale-95 flex flex-col items-center text-center gap-2 relative overflow-hidden ${
                                isActive
                                  ? 'bg-orange-50 border-orange-500 shadow-lg shadow-orange-500/10'
                                  : 'bg-white border-slate-200 hover:border-orange-300'
                              }`}
                            >
                              <span className="text-3xl">{size === '500' ? '🥡' : '🍱'}</span>
                              <span className={`text-sm font-black ${isActive ? 'text-orange-600' : 'text-slate-900'}`}>{label}</span>
                              {sizeHasDiscount ? (
                                <div>
                                  <span className="block text-xs font-bold text-gray-400 line-through">₡{price.toLocaleString()}</span>
                                  <span className="block text-sm font-black text-orange-600">₡{discountedPrice.toLocaleString()}</span>
                                </div>
                              ) : (
                                <span className="text-xs font-bold text-slate-500">₡{price.toLocaleString()}</span>
                              )}
                              {isActive && (
                                <div className="absolute top-0 right-0 p-1.5 bg-orange-500 rounded-bl-xl">
                                  <Check size={11} className="text-white" strokeWidth={4} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Discount box */}
                    {getPrecioSeleccionado() < getPrecioOriginal() && (
                      <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Con descuento</p>
                            <p className="text-sm font-bold text-slate-400 line-through">₡{(getPrecioOriginal() * cantidad).toLocaleString()}</p>
                          </div>
                          <p className="text-2xl font-black text-slate-900">₡{(getPrecioSeleccionado() * cantidad).toLocaleString()}</p>
                        </div>
                        {(() => {
                          const disc = getActiveDiscount(productoSeleccionado?.id);
                          const m = disc?.metodosPermitidos;
                          if (!m || m.length === 0 || m.length >= 4) return null;
                          const labels = { whatsapp: 'WhatsApp', sinpe: 'SINPE', transfer: 'Transferencia', nmi: 'Tarjeta' };
                          return (
                            <p className="text-[10px] font-bold text-orange-600 flex items-center gap-1 pt-1 border-t border-orange-100">
                              <span>💳</span> Solo con: {m.map(k => labels[k] || k).join(' · ')}
                            </p>
                          );
                        })()}
                      </div>
                    )}

                    <div className="h-2" />
                  </div>
                </div>

                {/* ── STICKY FOOTER — always visible ── */}
                <div className="shrink-0 bg-white border-t border-slate-100 px-5 py-4 space-y-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
                  <div className="flex items-center gap-3">
                    {/* Quantity */}
                    <div className="flex items-center bg-slate-100 rounded-2xl p-1">
                      <button
                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                        disabled={cantidad <= 1}
                        className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 disabled:opacity-40 transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-black text-base text-slate-900">{cantidad}</span>
                      <button
                        onClick={() => setCantidad(cantidad + 1)}
                        className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    {/* Price (no-discount case only) */}
                    {getPrecioSeleccionado() >= getPrecioOriginal() && (
                      <div className="flex-1 text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Total</p>
                        <p className="text-xl font-black text-slate-900">₡{(getPrecioSeleccionado() * cantidad).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAgregarCarrito}
                    className="w-full bg-slate-900 hover:bg-orange-600 active:scale-[0.98] text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                  >
                    <ShoppingCart size={20} className="shrink-0" />
                    Agregar al carrito · ₡{(getPrecioSeleccionado() * cantidad).toLocaleString()}
                  </button>
                </div>


                <style>{`
                  .ind-modal-scrollbar::-webkit-scrollbar { width: 3px; }
                  .ind-modal-scrollbar::-webkit-scrollbar-track { background: transparent; }
                  .ind-modal-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 10px; }
                `}</style>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
      </div>
    </PageTransition>
  );
}
