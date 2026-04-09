import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { INDIVIDUALES_CATEGORIES, CATEGORY_ICONS, getProductUnits, individualesData } from '../data/individualesData';
import { Search, ShoppingCart, X, Minus, Plus, MessageSquare, ChevronDown, Check } from 'lucide-react';
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
        // Subir a Cloudinary (Optimización más agresiva: 1080px, 0.75 calidad)
        const result = await uploadOptimizedImage(file, 'bikitchen/individuales', { maxSize: 1080, quality: 0.75 });
        const url = result.url;

        // Guardar en Firestore con unificación de escrituras y estructura anidada para merge correcto
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
        
        // Legacy support por si otras partes usan la colección vieja
        await setDoc(doc(db, 'individuales_imagenes', producto.id), { imagenUrl: url, cloudinaryPublicId: result.publicId }, { merge: true });

        // Invalidar caché local para que el cambio se vea al recargar
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

  // Cargar imágenes personalizadas desde Firestore con caché (reduce lecturas)
  // Lee primero el doc unificado: 'config/individual_images'; fallback a colecciones legacy
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

  const categorias = useMemo(
    () => INDIVIDUALES_CATEGORIES,
    []
  );

  // Filtrar productos por búsqueda
  const productosFiltrados = useMemo(() => {
    let base = individualesData;

    // REGLA: Ocultar producto de prueba de producción a no-admins
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

  // Contadores por grupo para los selectores de arriba
  const groupCounts = useMemo(() => {
    const counts = { Todos: individualesData.length };
    categoryGroups.forEach(group => {
      if (group.id === 'Todos') return;
      counts[group.id] = individualesData.filter(p => group.categories.includes(p.categoria)).length;
    });
    return counts;
  }, [categoryGroups]);

  const productosPorCategoria = useMemo(() => {
    // No calcular hasta que las imágenes estén cargadas
    if (loadingImages) return [];

    const base = INDIVIDUALES_CATEGORIES.filter((c) => c === categoriaActiva);

    return base.map((categoria) => ({
      categoria,
      productos: productosFiltrados
        .filter((p) => p.categoria === categoria)
        .map((p) => ({
          ...p,
          // Si existe una imagen personalizada en Firestore, usarla; si no, usar la de data
          imagen: imagenesCustom[p.id] || p.imagen
        }))
    }));
  }, [categoriaActiva, productosFiltrados, imagenesCustom, loadingImages]);

  // Contar total de resultados
  const totalResultados = useMemo(() => {
    return productosPorCategoria.reduce((acc, cat) => acc + cat.productos.length, 0);
  }, [productosPorCategoria]);

  const abrirModal = (producto) => {
    setProductoSeleccionado(producto);
    // Por defecto seleccionar 500 g si existe, si no 1 kg
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

    // Obtener imagen (custom de Firestore o default del producto)
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

        <main className="flex-1">
          {/* Hero estilo Planes Semanales */}
          <header className="relative pt-28 pb-16 md:pt-32 md:pb-20 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-[length:32px_32px] opacity-40"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-yellow-400/20 to-transparent rounded-full blur-3xl"></div>
            <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>

            <div className="container relative z-10 text-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-block mb-4 px-5 py-2 bg-white/20 backdrop-blur-md rounded-full text-sm font-bold shadow-lg">
                  🍽️ Platos individuales
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 drop-shadow-lg">
                  Platos Individuales BiKitchen
                </h1>
                <p className="text-base md:text-lg mb-8 max-w-2xl mx-auto font-medium text-white/95 leading-relaxed">
                  Elegí tus comidas favoritas por porción o por kilo. Ideal para complementar tus packs o armar tu propia semana BiKitchen.
                </p>
                <div className="flex flex-wrap justify-center gap-3 text-sm mb-2">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-xl shadow-lg border border-white/20">
                    <Check size={18} className="flex-shrink-0" />
                    <span className="font-semibold">Variedad de proteínas y acompañamientos</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-xl shadow-lg border border-white/20">
                    <Check size={18} className="flex-shrink-0" />
                    <span className="font-semibold">Por porción o por kilo</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-xl shadow-lg border border-white/20">
                    <Check size={18} className="flex-shrink-0" />
                    <span className="font-semibold">Perfecto para complementar tus packs</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </header>

          <section className="pt-12 pb-16">
            <div className="container">

              {/* Buscador */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.3 }}
                className="mb-6"
              >
                <div className="relative max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={22} />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar platos... (ej: pollo, pasta, ensalada)"
                    className="w-full pl-14 pr-4 py-4 rounded-xl border-2 border-gray-200 bg-white text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all shadow-lg hover:shadow-xl font-medium"
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => setBusqueda('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-all"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {busqueda && (
                  <p className="text-sm text-gray-600 mt-3 font-medium">
                    {totalResultados} resultado{totalResultados !== 1 ? 's' : ''} para "{busqueda}"
                  </p>
                )}
              </motion.div>


              {/* Filtros Agrupados e Inteligentes */}
              <div className={`z-30 transition-all duration-500 ${isSticky
                ? 'fixed top-[65px] left-0 right-0 bg-white/95 backdrop-blur-xl shadow-xl py-4 pb-2 px-0'
                : 'relative mb-10'
                }`}>
                <div className="container mx-auto max-w-6xl relative">
                  {/* Indicador de más contenido (Gradiente sutil a la derecha) */}
                  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/80 to-transparent z-10 pointer-events-none md:hidden" />
                  
                  {/* Selectores de Grupo */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2 md:scrollbar-premium hide-scrollbar px-4 md:px-0">
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
                          ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-105'
                          : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                          }`}
                      >
                        <span className="text-sm">{group.icon}</span>
                        <span>{group.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${activeGroup === group.id ? 'bg-white/20' : 'bg-gray-100 uppercase'}`}>
                          {groupCounts[group.id]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Píldoras de Categoría con Contadores */}
                  <div className="flex flex-nowrap md:flex-wrap gap-2.5 overflow-x-auto pb-6 pt-1 px-4 md:px-0 hide-scrollbar">
                    {categoriasFiltradasPorGrupo.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategoriaActiva(cat);
                          if (isSticky) {
                            window.scrollTo({ top: 380, behavior: 'smooth' });
                          }
                        }}
                        className={`flex-shrink-0 px-5 py-3 rounded-2xl text-sm font-black border-2 transition-all flex items-center gap-3 whitespace-nowrap ${categoriaActiva === cat
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-xl shadow-orange-500/30 scale-105'
                          : 'bg-white text-gray-700 border-gray-100 hover:border-orange-200 shadow-sm'
                          }`}
                      >
                        <span className="text-xl">{CATEGORY_ICONS[cat] || '📦'}</span>
                        <div className="flex flex-col items-start leading-tight">
                          <span>{cat}</span>
                          <span className={`text-[10px] uppercase tracking-wider opacity-70 ${categoriaActiva === cat ? 'text-white' : 'text-orange-500'}`}>
                            {categoryCounts[cat] || 0} platos
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Skeleton loader mientras carga */}
              {loadingImages && (
                <div className="space-y-12 pb-16">
                  {[1, 2, 3].map((section) => (
                    <div key={section} className="space-y-5">
                      <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-7 w-32 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((card) => (
                          <div key={card} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                            <div className="aspect-[4/3] bg-gray-200 animate-pulse"></div>
                            <div className="p-4 space-y-3">
                              <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                              <div className="flex gap-2">
                                <div className="h-8 bg-gray-200 rounded-full animate-pulse w-20"></div>
                                <div className="h-8 bg-gray-200 rounded-full animate-pulse w-20"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
                        className="space-y-5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex items-center justify-between border-b-2 border-gray-200 pb-4 mb-2">
                          <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                            <span className="text-4xl">{CATEGORY_ICONS[categoria] || '📦'}</span>
                            <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">{categoria}</span>
                          </h2>
                          <span className="text-sm text-gray-600 bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-2 rounded-full font-bold border border-gray-200 shadow-sm">
                            {productos.length} plato{productos.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-16"
                    >
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-gray-500 text-lg font-medium">
                        No se encontraron platos
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Intenta con otra búsqueda o categoría
                      </p>
                      {busqueda && (
                        <button
                          type="button"
                          onClick={() => setBusqueda('')}
                          className="mt-4 px-4 py-2 text-sm text-bikitchen-orange hover:text-bikitchen-orange-dark font-medium"
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                    </motion.div>
                  )}
                  {/* Filtros de categoría al final para no tener que subir */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100"
                  >
                    {categorias.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategoriaActiva(cat);
                          // Scroll suave al inicio solo en móvil (< 768px)
                          if (window.innerWidth < 768) {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all flex items-center gap-1.5 ${categoriaActiva === cat
                          ? 'bg-bikitchen-orange text-white border-bikitchen-orange shadow-md shadow-bikitchen-orange/20'
                          : 'bg-white/70 text-gray-700 border-gray-200 hover:bg-bikitchen-orange/10 hover:border-bikitchen-orange'
                          }`}
                      >
                        <span>{CATEGORY_ICONS[cat] || '📦'}</span>
                        {cat}
                      </button>
                    ))}
                  </motion.div>
                </div>
              )}
            </div>
          </section>
        </main>

        <Footer />


        {/* Modal de detalle - usando Portal para renderizar fuera del flujo */}
        {productoSeleccionado && ReactDOM.createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cerrarModal}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Header con gradiente */}
                <motion.div
                  className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-5 flex-shrink-0 relative overflow-hidden"
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl shadow-lg">
                        🍽️
                      </div>
                      <div>
                        <h3 className="text-xl font-black">
                          {productoSeleccionado.nombre}
                        </h3>
                        <p className="text-white/90 text-sm font-semibold">
                          {productoSeleccionado.categoria}
                        </p>
                      </div>
                    </div>
                    <motion.button
                      type="button"
                      onClick={cerrarModal}
                      className="w-10 h-10 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full flex items-center justify-center transition-all shadow-lg"
                      whileHover={{ scale: 1.1, backgroundColor: "rgba(255, 255, 255, 0.4)" }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={20} />
                    </motion.button>
                  </div>
                </motion.div>

                {/* Contenido con scroll */}
                <motion.div
                  className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-gray-50"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  {productoSeleccionado.descripcion && (
                    <p className="text-sm text-gray-600 bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-2xl border border-orange-100 font-medium leading-relaxed">
                      ℹ️ {productoSeleccionado.descripcion}
                    </p>
                  )}

                  {/* Tamaño */}
                  {(() => {
                    const units = getProductUnits(productoSeleccionado.categoria);
                    return (
                      <div className="space-y-4">
                        <p className="text-base font-black text-gray-900 flex items-center gap-2">
                          <span className="text-2xl">📦</span>
                          Elige tu porción
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                          <motion.button
                            type="button"
                            disabled={!productoSeleccionado.precio500}
                            onClick={() => setTamano('500')}
                            className={`relative px-5 py-5 rounded-2xl border-2 text-sm font-bold transition-all ${tamano === '500'
                              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-500 shadow-xl shadow-orange-500/30'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:shadow-md'
                              } ${!productoSeleccionado.precio500
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer'
                              }`}
                            whileHover={productoSeleccionado.precio500 ? { scale: 1.03, y: -2 } : {}}
                            whileTap={productoSeleccionado.precio500 ? { scale: 0.98 } : {}}
                          >
                            <span className="text-2xl block mb-2">🥡</span>
                            <span className="block text-base">{units.unidadPequena}</span>
                            {productoSeleccionado.precio500 && (
                              <span className={`block text-sm mt-2 font-black ${tamano === '500' ? 'text-white' : 'bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent'}`}>
                                ₡{productoSeleccionado.precio500.toLocaleString('es-CR')}
                              </span>
                            )}
                            {tamano === '500' && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                          </motion.button>
                          <motion.button
                            type="button"
                            disabled={!productoSeleccionado.precio1kg}
                            onClick={() => setTamano('1000')}
                            className={`relative px-5 py-5 rounded-2xl border-2 text-sm font-bold transition-all ${tamano === '1000'
                              ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white border-orange-500 shadow-xl shadow-orange-500/30'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:shadow-md'
                              } ${!productoSeleccionado.precio1kg
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer'
                              }`}
                            whileHover={productoSeleccionado.precio1kg ? { scale: 1.03, y: -2 } : {}}
                            whileTap={productoSeleccionado.precio1kg ? { scale: 0.98 } : {}}
                          >
                            <span className="text-2xl block mb-2">🍱</span>
                            <span className="block text-base">{units.unidadGrande}</span>
                            {productoSeleccionado.precio1kg && (
                              <span className={`block text-sm mt-2 font-black ${tamano === '1000' ? 'text-white' : 'bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent'}`}>
                                ₡{productoSeleccionado.precio1kg.toLocaleString('es-CR')}
                              </span>
                            )}
                            {tamano === '1000' && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                                <Check size={14} className="text-white" />
                              </div>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Cantidad */}
                  <div className="space-y-4">
                    <p className="text-base font-black text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">🔢</span>
                      Cantidad
                    </p>
                    <div className="flex items-center gap-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-3 w-fit border border-gray-200">
                      <motion.button
                        type="button"
                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                        className="w-12 h-12 flex items-center justify-center text-gray-700 bg-white rounded-xl shadow-md font-bold text-lg"
                        whileHover={{ scale: 1.1, backgroundColor: "rgb(249, 115, 22)", color: "white" }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Minus size={20} />
                      </motion.button>
                      <span className="w-12 text-center font-black text-gray-900 text-2xl">{cantidad}</span>
                      <motion.button
                        type="button"
                        onClick={() => setCantidad(cantidad + 1)}
                        className="w-12 h-12 flex items-center justify-center text-gray-700 bg-white rounded-xl shadow-md font-bold text-lg"
                        whileHover={{ scale: 1.1, backgroundColor: "rgb(249, 115, 22)", color: "white" }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Plus size={20} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Nota */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowNotes(!showNotes)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-bikitchen-orange:text-bikitchen-gold transition-colors"
                    >
                      <MessageSquare size={16} />
                      <span>Agregar nota especial</span>
                      <ChevronDown size={14} className={`transition-transform ${showNotes ? 'rotate-180' : ''}`} />
                    </button>

                    {showNotes && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <textarea
                          rows={2}
                          value={nota}
                          onChange={(e) => setNota(e.target.value)}
                          placeholder="Ej: Sin cebolla, por favor..."
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-4 bg-gray-50 border-t border-gray-100">
                  {/* Resumen de precio */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Precio unitario:</span>
                      <span>₡{getPrecioSeleccionado().toLocaleString('es-CR')}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-gray-900 pt-1 border-t border-gray-200">
                      <span>Total:</span>
                      <span className="text-bikitchen-orange">
                        ₡{(getPrecioSeleccionado() * cantidad).toLocaleString('es-CR')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAgregarCarrito}
                    disabled={!getPrecioSeleccionado()}
                    className="w-full bg-gradient-to-r from-bikitchen-orange to-orange-600 hover:from-bikitchen-orange-dark hover:to-orange-700:to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-bikitchen-orange/30 active:scale-[0.98]"
                  >
                    <ShoppingCart size={20} />
                    <span>Agregar al carrito — ₡{(getPrecioSeleccionado() * cantidad).toLocaleString('es-CR')}</span>
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
