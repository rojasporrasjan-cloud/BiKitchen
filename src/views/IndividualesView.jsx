import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { INDIVIDUALES_CATEGORIES, CATEGORY_ICONS, getProductUnits, individualesData } from '../data/individualesData';
import { Search, ShoppingCart, X, Minus, Plus, MessageSquare, ChevronDown, Check, Package } from 'lucide-react';
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

import { useQuery } from '../hooks/useQuery';
import { trackViewContent, trackViewCategory, trackViewMenu } from '../services/facebookPixel';

export default function IndividualesView() {
  const query = useQuery();
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();

  // Soporte para abrir un producto específico directamente (Vía Meta Ads)
  useEffect(() => {
    const productId = query.get('id') || query.get('producto');
    if (productId) {
      const product = individualesData.find(p => p.id === productId);
      if (product) {
        setCategoriaActiva(product.categoria);
        // Pequeño delay para asegurar que el sistema está listo
        setTimeout(() => {
          setProductoSeleccionado(product);
          // Configurar precios por defecto
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
  const [nota, setNota] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [imagenesCustom, setImagenesCustom] = useState({}); // { [idProducto]: url }
  const [loadingImages, setLoadingImages] = useState(true);
  const [isSticky, setIsSticky] = useState(false);
  const [activeGroup, setActiveGroup] = useState('Todos');

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

  // Manejar header sticky
  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    setNota('');
  };

  const cerrarModal = () => {
    setProductoSeleccionado(null);
    setShowNotes(false);
  };

  const getPrecioSeleccionado = () => {
    if (!productoSeleccionado) return 0;
    if (tamano === '500') return productoSeleccionado.precio500 || 0;
    return productoSeleccionado.precio1kg || 0;
  };

  const handleAgregarCarrito = () => {
    const precio = getPrecioSeleccionado();
    if (!precio) {
      toast.error('Este tamaño no está disponible para este producto.');
      return;
    }
    const units = getProductUnits(productoSeleccionado.categoria);
    const labelUnidad = tamano === '500' ? units.labelPequeno : units.labelGrande;
    const isTargetOverhaul = productoSeleccionado.categoria === 'Picadillos' || productoSeleccionado.categoria === 'Vegetales' || productoSeleccionado.categoria === 'Sopas';
    const imagenProducto = isTargetOverhaul ? productoSeleccionado.imagen : (imagenesCustom[productoSeleccionado.id] || productoSeleccionado.imagen);
    addToCart({
      id: `${productoSeleccionado.id}-${tamano}`,
      name: productoSeleccionado.nombre,
      desc: nota || productoSeleccionado.descripcion,
      price: precio,
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
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 text-gray-900 flex flex-col">
        <Navbar />

        <main className="flex-1 pt-[76px]">
          {/* Header de Búsqueda */}
          {/* Barra de búsqueda removida de aquí y movida al Sidebar para mayor limpieza */}

          {/* ── Filtros MÓVIL (oculto en desktop) ── */}
          <div className="lg:hidden bg-white/95 backdrop-blur-md py-2 border-b border-gray-100 z-30 shadow-sm transition-all duration-300">
            <div className="w-full px-4">
              <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                {/* Botón "Todos" */}
                <button
                  onClick={() => {
                    setActiveGroup('Todos');
                    setCategoriaActiva(INDIVIDUALES_CATEGORIES[0]);
                  }}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border-2 ${activeGroup === 'Todos'
                    ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                    : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                >
                  <span className="text-sm">✨</span>
                  <span>Todos</span>
                </button>

                {/* Todas las categorías individuales */}
                {INDIVIDUALES_CATEGORIES.map((cat) => {
                  const isActive = categoriaActiva === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoriaActiva(cat);
                        // Detectar a qué grupo pertenece esta categoría
                        const group = categoryGroups.find(g => g.categories?.includes(cat));
                        if (group) {
                          setActiveGroup(group.id);
                        }
                      }}
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 border-2 ${isActive
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                        }`}
                    >
                      <span className="text-sm">{CATEGORY_ICONS[cat] || '📦'}</span>
                      <span>{cat}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <style>{`
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>

          <div className="flex flex-col lg:flex-row min-h-screen relative">
            {/* ── SIDEBAR DESKTOP ── */}
            <aside className="hidden lg:flex flex-col gap-3 w-64 xl:w-72 flex-shrink-0 sticky top-[84px] h-[calc(100vh-84px)] z-20 overflow-y-auto hide-scrollbar bg-white border-r border-gray-100 shadow-xl shadow-gray-200/20">
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
                    href="https://wa.me/50672044816"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          <div className="flex items-center justify-between border-b-2 border-gray-100 pb-4">
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                              <span className="text-3xl">{CATEGORY_ICONS[categoria] || '📦'}</span>
                              <span className="text-orange-600 capitalize">{categoria}</span>
                            </h2>
                            <span className="text-xs text-gray-400 font-black uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                              {productos.length} Platos
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {productos.map((producto) => (
                              <IndividualCard
                                key={producto.id}
                                producto={producto}
                                onClick={() => abrirModal(producto)}
                                canEditImage={isAdmin && isAdmin()}
                                onUploadImage={() => handleUploadImage(producto)}
                              />
                            ))}
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

        {/* Modal Dual: Zero-Scroll Mobile / Premium Split Desktop */}
        {productoSeleccionado && ReactDOM.createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cerrarModal}
              className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
            >
              <motion.div
                initial={{ y: "100%", opacity: 1 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-t-0 sm:rounded-[3rem] max-w-4xl w-full h-[100dvh] sm:h-auto sm:max-h-[90vh] shadow-2xl overflow-hidden flex flex-col sm:border-2 border-white/20"
              >
                {/* Hero Image Header - Mobile Adaptive / Desktop Enhanced */}
                <div className="relative h-[40vh] sm:h-[480px] w-full flex-shrink-0 group/hero">
                  <img
                    src={(() => {
                      const isTarget = productoSeleccionado.categoria === 'Picadillos' || productoSeleccionado.categoria === 'Vegetales' || productoSeleccionado.categoria === 'Sopas';
                      return isTarget ? productoSeleccionado.imagen : (imagenesCustom[productoSeleccionado.id] || productoSeleccionado.imagen);
                    })()}
                    alt={productoSeleccionado.nombre}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />

                  {/* Close Button High Visibility */}
                  <button
                    onClick={cerrarModal}
                    className="absolute top-6 right-6 w-11 h-11 sm:w-12 sm:h-12 bg-black/40 backdrop-blur-xl hover:bg-white text-white hover:text-orange-600 rounded-2xl flex items-center justify-center transition-all z-20 border border-white/20 shadow-xl"
                  >
                    <X size={22} strokeWidth={2.5} />
                  </button>

                  {/* Header Title Overlay */}
                  <div className="absolute bottom-6 sm:bottom-8 left-8 right-8 z-10">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <span className="bg-orange-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl shadow-lg border border-orange-400/30 text-white">
                        {productoSeleccionado.categoria}
                      </span>
                    </div>
                    <h3 className="text-2xl sm:text-4xl font-black leading-tight text-white drop-shadow-[0_4px_20px_rgba(0,0,0,1)]">
                      {productoSeleccionado.nombre}
                    </h3>
                  </div>
                </div>

                {/* Content Area - Optimized for Zero-Scroll Mobile */}
                <div className="flex-1 overflow-hidden p-5 sm:p-10 sm:pt-6 pt-2 space-y-3 sm:space-y-10 custom-scrollbar pb-32 sm:pb-10 bg-white flex flex-col justify-start">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-center sm:items-start pt-4 sm:pt-0">

                    {/* Columna Izquierda: Información */}
                    <div className="space-y-6">
                      {productoSeleccionado.descripcion &&
                        productoSeleccionado.descripcion !== '4 tazas / 6 tazas' &&
                        productoSeleccionado.descripcion !== '500 gramos / 1 kg' &&
                        productoSeleccionado.descripcion !== '4 porc. / 8 porc.' && (
                          <div className="border-l-4 border-orange-500/20 pl-4 py-1">
                            <p className="text-sm sm:text-lg text-gray-500 font-medium leading-relaxed italic">
                              "{productoSeleccionado.descripcion}"
                            </p>
                          </div>
                        )}

                      <div className="space-y-3">
                        <button
                          onClick={() => setShowNotes(true)}
                          className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] transition-all border-2 ${nota ? 'bg-orange-50 border-orange-500' : 'bg-gray-50/50 border-gray-100 hover:border-orange-200'}`}
                        >
                          <div className="flex items-center gap-3">
                            <MessageSquare size={16} className={nota ? 'text-orange-600' : 'text-gray-400'} />
                            <span className={`text-[11px] sm:text-sm font-black ${nota ? 'text-orange-600' : 'text-gray-600'}`}>
                              {nota ? 'Ver/Editar Instrucciones' : '¿Añadir alguna instrucción?'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {nota && <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
                            <Plus size={16} className={`transition-transform duration-300 ${nota ? 'rotate-45 text-orange-600' : 'text-gray-400'}`} />
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Columna Derecha: Selectores - Con un poco más de aire arriba en móvil */}
                    <div className="space-y-6 sm:space-y-8 mt-2 sm:mt-0">
                      <div className="grid grid-cols-2 gap-4">
                        {['500', '1000'].map((size) => {
                          const units = getProductUnits(productoSeleccionado.categoria);
                          const label = size === '500' ? units.unidadPequena : units.unidadGrande;
                          const price = size === '500' ? productoSeleccionado.precio500 : productoSeleccionado.precio1kg;
                          if (!price) return null;
                          const isActive = tamano === size;

                          return (
                            <button
                              key={size}
                              onClick={() => setTamano(size)}
                              className={`p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border-2 transition-all flex flex-col items-center text-center gap-1.5 sm:gap-2 relative overflow-hidden ${isActive
                                ? 'bg-orange-50 border-orange-500 ring-4 ring-orange-500/10 shadow-lg'
                                : 'bg-white border-gray-100 hover:border-orange-200'
                                }`}
                            >
                              <span className="text-2xl sm:text-3xl filter drop-shadow-sm">{size === '500' ? '🥡' : '🍱'}</span>
                              <div className="flex flex-col">
                                <span className={`text-[11px] sm:text-base font-black ${isActive ? 'text-orange-600' : 'text-gray-900'}`}>{label}</span>
                                <span className="text-[10px] sm:text-xs font-bold text-gray-400 font-mono">₡{price.toLocaleString()}</span>
                              </div>
                              {isActive && (
                                <div className="absolute top-0 right-0 p-1.5 sm:p-2 bg-orange-500 rounded-bl-lg sm:rounded-bl-xl">
                                  <Check size={10} className="text-white" strokeWidth={5} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex sm:hidden items-center justify-between bg-gray-50/80 p-2 sm:p-3 rounded-[1.5rem] sm:rounded-[1.8rem] border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 sm:px-6">Cantidad</p>
                        <div className="flex items-center gap-4 sm:gap-6">
                          <button
                            onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                            className="w-10 h-10 sm:w-12 sm:h-12 bg-white text-gray-900 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50"
                            disabled={cantidad <= 1}
                          >
                            <Minus size={18} />
                          </button>
                          <span className="text-xl sm:text-2xl font-black w-6 text-center">{cantidad}</span>
                          <button
                            onClick={() => setCantidad(cantidad + 1)}
                            className="w-10 h-10 sm:w-12 sm:h-12 bg-white text-gray-900 rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all"
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Dual */}
                <div className="shrink-0 p-6 sm:p-8 bg-white border-t border-gray-100 z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
                    <div className="flex items-center justify-between w-full sm:w-auto gap-8 lg:gap-12">
                      <div className="flex items-center gap-10">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total a pagar</p>
                          <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter">
                            ₡{(getPrecioSeleccionado() * cantidad).toLocaleString()}
                          </p>
                        </div>

                        {/* Quantity Selector - Visible only on Desktop Footer */}
                        <div className="hidden sm:flex items-center gap-4 bg-gray-50/80 p-2 rounded-[1.2rem] border border-gray-100 shadow-sm">
                          <button
                            onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                            className="w-8 h-8 bg-white text-gray-900 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50"
                            disabled={cantidad <= 1}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-lg font-black w-4 text-center text-gray-900">{cantidad}</span>
                          <button
                            onClick={() => setCantidad(cantidad + 1)}
                            className="w-8 h-8 bg-white text-gray-900 rounded-lg shadow-sm border border-gray-100 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="hidden sm:flex flex-col items-end opacity-60">
                        <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-3 py-1.5 rounded-lg uppercase border border-orange-100">
                          Premium Ready
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleAgregarCarrito}
                      className="w-full sm:w-auto bg-gray-900 hover:bg-orange-600 text-white font-black py-4 sm:py-5 px-10 sm:px-14 rounded-[1.5rem] sm:rounded-[2rem] transition-all flex items-center justify-center gap-4 shadow-xl active:scale-95 group text-sm sm:text-lg"
                    >
                      <ShoppingCart size={22} className="group-hover:rotate-12 transition-transform" />
                      <span>Agregar al Carrito</span>
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Sub-Modal: Ventanita Extra de Instrucciones */}
              <AnimatePresence>
                {showNotes && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowNotes(false)}
                    className="absolute inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
                  >
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden"
                    >
                      <div className="p-8 space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                              <MessageSquare size={20} />
                            </div>
                            <h4 className="text-xl font-black text-gray-900">Instrucciones Especiales</h4>
                          </div>
                          <button
                            onClick={() => setShowNotes(false)}
                            className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <p className="text-sm text-gray-500 font-medium">
                          Indícanos si deseas algún cambio en tu pedido (ej: sin cebolla, extra salsa, etc.)
                        </p>

                        <textarea
                          value={nota}
                          onChange={(e) => setNota(e.target.value)}
                          placeholder="Escribe aquí tus instrucciones..."
                          className="w-full p-6 h-40 rounded-[1.5rem] border-2 border-slate-100 focus:border-orange-500 transition-all text-base outline-none resize-none font-medium text-gray-700 bg-slate-50 shadow-inner"
                          autoFocus
                        />

                        <button
                          onClick={() => setShowNotes(false)}
                          className="w-full bg-gray-900 hover:bg-orange-600 text-white font-black py-4 rounded-[1.5rem] transition-all shadow-xl active:scale-95"
                        >
                          Guardar Instrucción
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
      </div>
    </PageTransition>
  );
}
