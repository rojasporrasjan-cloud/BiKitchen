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

export default function IndividualesView() {
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const [categoriaActiva, setCategoriaActiva] = useState(INDIVIDUALES_CATEGORIES[0]);
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
        .map((p) => ({
          ...p,
          imagen: imagenesCustom[p.id] || p.imagen
        }))
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
    const imagenProducto = imagenesCustom[productoSeleccionado.id] || productoSeleccionado.imagen;
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
                {categoryGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setActiveGroup(group.id);
                      const firstCat = group.id === 'Todos' ? INDIVIDUALES_CATEGORIES[0] : group.categories[0];
                      if (firstCat && !group.categories?.includes(categoriaActiva) && group.id !== 'Todos') {
                        setCategoriaActiva(firstCat);
                      }
                    }}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border-2 ${activeGroup === group.id
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                      : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                      }`}
                  >
                    <span className="text-sm">{group.icon}</span>
                    <span>{group.label}</span>
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

        {/* Modal de detalle */}
        {productoSeleccionado && ReactDOM.createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cerrarModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 40 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[2.5rem] max-w-lg w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border-2 border-white/50"
              >
                {/* Header Modal */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-6 flex-shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shadow-xl border border-white/30">
                        {CATEGORY_ICONS[productoSeleccionado.categoria] || '🍽️'}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black leading-tight">
                          {productoSeleccionado.nombre}
                        </h3>
                        <p className="text-white/80 text-xs font-black uppercase tracking-widest mt-1">
                          {productoSeleccionado.categoria}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={cerrarModal}
                      className="w-10 h-10 bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-orange-600 rounded-xl flex items-center justify-center transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  {productoSeleccionado.descripcion && (
                    <div className="bg-orange-50/50 p-5 rounded-3xl border border-orange-100/50">
                      <p className="text-sm text-gray-700 font-medium leading-relaxed italic">
                        "{productoSeleccionado.descripcion}"
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Selecciona Tamaño</p>
                    </div>
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
                            className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center text-center gap-2 ${isActive
                              ? 'bg-orange-50 border-orange-500 ring-4 ring-orange-500/10 shadow-lg'
                              : 'bg-white border-gray-100 hover:border-orange-200'
                              }`}
                          >
                            <span className="text-2xl">{size === '500' ? '🥡' : '🍱'}</span>
                            <span className={`text-base font-black ${isActive ? 'text-orange-600' : 'text-gray-900'}`}>{label}</span>
                            <span className="text-sm font-bold text-gray-500">₡{price.toLocaleString()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Cantidad</p>
                    <div className="flex items-center gap-6 bg-gray-50 p-3 rounded-[1.5rem] w-fit border border-gray-100">
                      <button
                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                        className="w-12 h-12 bg-white text-gray-900 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all disabled:opacity-50"
                        disabled={cantidad <= 1}
                      >
                        <Minus size={20} />
                      </button>
                      <span className="text-2xl font-black w-10 text-center">{cantidad}</span>
                      <button
                        onClick={() => setCantidad(cantidad + 1)}
                        className="w-12 h-12 bg-white text-gray-900 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setShowNotes(!showNotes)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-2xl text-gray-600 hover:bg-gray-100 transition-all border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare size={18} className="text-orange-500" />
                        <span className="text-sm font-bold">¿Alguna nota especial?</span>
                      </div>
                      <ChevronDown size={18} className={`transition-transform duration-300 ${showNotes ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                      {showNotes && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <textarea
                            value={nota}
                            onChange={(e) => setNota(e.target.value)}
                            placeholder="Ej: Sin cebolla, por favor..."
                            className="w-full p-4 rounded-2xl border-2 border-gray-100 focus:border-orange-500 transition-all text-sm outline-none resize-none font-medium text-gray-700 bg-white shadow-inner"
                            rows={3}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-8 bg-gray-50/80 backdrop-blur-md border-t border-gray-100">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total a pagar</p>
                      <p className="text-3xl font-black text-gray-900">₡{(getPrecioSeleccionado() * cantidad).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Entrega inmediata</p>
                      <div className="flex items-center gap-1 text-gray-400 overflow-hidden text-ellipsis">
                         <Check size={14} className="text-green-500" />
                         <span className="text-xs font-bold">Stock disponible</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleAgregarCarrito}
                    className="w-full bg-gray-900 hover:bg-orange-600 text-white font-black py-5 rounded-[1.5rem] transition-all flex items-center justify-center gap-3 shadow-xl shadow-gray-900/20 active:scale-95 group"
                  >
                    <ShoppingCart size={22} className="group-hover:rotate-12 transition-transform" />
                    <span>Agregar al Carrito</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
      </div>
    </PageTransition>
  );
}
