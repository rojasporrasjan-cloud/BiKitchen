import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { INDIVIDUALES_CATEGORIES, CATEGORY_ICONS, CATEGORY_UNITS, getProductUnits, individualesData } from '../data/individualesData';
import { Search } from 'lucide-react';
import IndividualCard from '../components/IndividualCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { ShoppingCart, X, Plus, Minus, MessageSquare, ChevronDown, Check, Package, Pencil, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { uploadOptimizedImage } from '../services/cloudinaryService';
import { cleanFirebaseUrl } from '../utils/firebaseUrl';
import { cachedFetch, invalidateCache } from '../utils/firestoreCache';
import { useMenusRefresh } from '../hooks/useMenusRefresh';
import { getPackPrices } from '../utils/firestoreMenus';

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

  // Estado para modal de packs de proteínas
  const [packModalOpen, setPackModalOpen] = useState(null); // null, 3 o 5
  const [packTamano, setPackTamano] = useState('250'); // '250' o '500'
  const [proteinasSeleccionadas, setProteinasSeleccionadas] = useState([]);

  // Estado para desayunos - SIEMPRE cargar desde Firebase, NO usar fallback hardcodeado
  const [desayunosMenu, setDesayunosMenu] = useState([]);
  const [desayunosVegetarianos, setDesayunosVegetarianos] = useState([]);
  const [editingDesayunos, setEditingDesayunos] = useState(false);
  const [tempDesayunos, setTempDesayunos] = useState([]);
  const [tempDesayunosVeg, setTempDesayunosVeg] = useState([]);
  const [desayunosModalOpen, setDesayunosModalOpen] = useState(false);
  const [activeDesayunoTab, setActiveDesayunoTab] = useState('regular'); // 'regular' o 'vegetariano'

  // Precios dinámicos desde Firestore
  const [preciosPacks, setPreciosPacks] = useState(null);
  const DESAYUNOS_PRECIO = preciosPacks?.desayuno?.packs?.['Desayunos de la Semana']?.weekly || 15000;
  const PROTEIN_PRICES = preciosPacks?.proteinas?.packs || {
    'Pack 3 Proteínas': { weekly: 13500, weekly_500: 25850 },
    'Pack 5 Proteínas': { weekly: 21000, weekly_500: 39950 }
  };

  // Estado para editar proteínas (similar a desayunos)
  const [editingProteinas, setEditingProteinas] = useState(false);
  const [tempProteinas, setTempProteinas] = useState([]);
  const [proteinasDisponibles, setProteinasDisponibles] = useState([]);
  const [nuevaProteina, setNuevaProteina] = useState('');
  const [editandoIndice, setEditandoIndice] = useState(null);
  const [nombreEditado, setNombreEditado] = useState('');

  // Usar hook que recarga menús automáticamente cuando la página vuelve a estar visible
  // (mismo comportamiento que PacksPage para garantizar sincronización)
  const { menus: menusData } = useMenusRefresh();

  // Cargar precios desde config (solo al montar)
  useEffect(() => {
    const loadPrices = async () => {
      try {
        const pricesData = await getPackPrices();
        if (pricesData) {
          setPreciosPacks(pricesData);
        }
      } catch (error) {
        console.error('Error cargando precios:', error);
      }
    };
    loadPrices();
  }, []);

  // Sincronizar estado local cuando llegan datos del hook
  useEffect(() => {
    if (!menusData) return;
    if (Array.isArray(menusData.desayuno)) {
      setDesayunosMenu(menusData.desayuno.map(d => d.proteina));
    }
    if (Array.isArray(menusData.desayunoVegetariano)) {
      setDesayunosVegetarianos(menusData.desayunoVegetariano.map(d => d.proteina));
    }
    if (Array.isArray(menusData.proteinasDisponibles)) {
      setProteinasDisponibles(menusData.proteinasDisponibles);
    } else {
      setProteinasDisponibles(PROTEINAS_PACK.map(p => p.nombre));
    }
  }, [menusData]);

  // Guardar desayunos en el menú oficial (sincronizado con packs)
  const saveDesayunos = async () => {
    try {
      const docRef = doc(db, 'menus_oficial', 'current');
      const docSnap = await getDoc(docRef);
      const menuActual = docSnap.exists() ? docSnap.data() : {};

      // Formatear desayunos regulares
      const desayunosFormato = tempDesayunos.map((desayuno, index) => ({
        numero: index + 1,
        proteina: desayuno,
        vegetal: 'Tostada integral',
        carbo: 'Fruta fresca'
      }));

      // Formatear desayunos vegetarianos
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

      // Invalidar caché para que los packs se actualicen inmediatamente
      invalidateCache('menus_official');

      setDesayunosMenu(tempDesayunos);
      setDesayunosVegetarianos(tempDesayunosVeg);
      setEditingDesayunos(false);
      toast.success('✅ Desayunos actualizados en todos los packs');
    } catch (error) {
      console.error('Error guardando desayunos:', error);
      toast.error('Error al guardar');
    }
  };

  // Guardar proteínas disponibles en Firebase y sincronizar con menús semanales
  const saveProteinas = async () => {
    try {
      const docRef = doc(db, 'menus_oficial', 'current');
      const docSnap = await getDoc(docRef);
      const menuActual = docSnap.exists() ? docSnap.data() : {};

      // Actualizar proteínas en todos los menús semanales
      const menuTypes = ['fullPack', 'keto', 'bajoCalorias', 'sinCarbos', 'regular', 'vegetariano', 'casaditos'];
      const menusActualizados = { ...menuActual };

      menuTypes.forEach(menuType => {
        if (menuActual[menuType] && Array.isArray(menuActual[menuType])) {
          // Actualizar proteínas en menús de almuerzo
          menusActualizados[menuType] = menuActual[menuType].map((plato, index) => ({
            ...plato,
            proteina: tempProteinas[index % tempProteinas.length] || plato.proteina
          }));
        }

        // Actualizar proteínas en menús de cena
        if (menuActual.cena && menuActual.cena[menuType] && Array.isArray(menuActual.cena[menuType])) {
          if (!menusActualizados.cena) menusActualizados.cena = { ...menuActual.cena };
          menusActualizados.cena[menuType] = menuActual.cena[menuType].map((plato, index) => ({
            ...plato,
            proteina: tempProteinas[index % tempProteinas.length] || plato.proteina
          }));
        }
      });

      await setDoc(docRef, {
        ...menusActualizados,
        proteinasDisponibles: tempProteinas,
        meta: {
          ...menuActual.meta,
          lastModifiedAt: new Date(),
          proteinasUpdatedBy: 'admin'
        }
      }, { merge: false }); // merge: false para sobrescribir completamente

      invalidateCache('menus_official');
      setProteinasDisponibles(tempProteinas);
      setEditingProteinas(false);
      setNuevaProteina('');
      toast.success('✅ Proteínas actualizadas y sincronizadas con menús semanales');
    } catch (error) {
      console.error('Error guardando proteínas:', error);
      toast.error('Error al guardar proteínas');
    }
  };

  // Agregar nueva proteína a la lista temporal
  const agregarProteina = () => {
    if (nuevaProteina.trim() && !tempProteinas.includes(nuevaProteina.trim())) {
      setTempProteinas([...tempProteinas, nuevaProteina.trim()]);
      setNuevaProteina('');
    }
  };

  // Eliminar proteína de la lista temporal
  const eliminarProteina = (index) => {
    setTempProteinas(tempProteinas.filter((_, i) => i !== index));
  };

  // Iniciar edición de nombre de proteína
  const iniciarEdicion = (index) => {
    setEditandoIndice(index);
    setNombreEditado(tempProteinas[index]);
  };

  // Guardar nombre editado
  const guardarEdicion = () => {
    if (nombreEditado.trim() && editandoIndice !== null) {
      const nuevasProteinas = [...tempProteinas];
      nuevasProteinas[editandoIndice] = nombreEditado.trim();
      setTempProteinas(nuevasProteinas);
      setEditandoIndice(null);
      setNombreEditado('');
    }
  };

  // Cancelar edición
  const cancelarEdicion = () => {
    setEditandoIndice(null);
    setNombreEditado('');
  };

  // Imágenes default para productos especiales
  const IMAGENES_DEFAULT = {
    'desayunos-semana': 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=800&q=80',
    'pack-proteinas': 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=800&q=80'
  };

  // Agregar desayunos al carrito
  const handleAgregarDesayunos = () => {
    // Usar imagen custom de Firestore si existe, sino usar default
    const imagenDesayunos = imagenesCustom['desayunos-semana'] || IMAGENES_DEFAULT['desayunos-semana'];

    addToCart({
      id: `desayunos-semana-${Date.now()}`,
      name: 'Desayunos de la Semana',
      desc: desayunosMenu.join(', '),
      price: DESAYUNOS_PRECIO,
      quantity: 1,
      plan: 'desayunos',
      planLabel: 'Desayunos Semanales',
      image: imagenDesayunos
    });
    toast.success('Desayunos agregados al carrito');
  };

  // Lista de proteínas disponibles para los packs
  const PROTEINAS_PACK = [
    { id: 'pack-pollo-curry', nombre: 'Pollo en salsa de curry' },
    { id: 'pack-pollo-caribena', nombre: 'Pollo en salsa caribeña' },
    { id: 'pack-fajitas-lomo-vino', nombre: 'Fajitas de lomo en salsa vino' },
    { id: 'pack-pollo-mechado', nombre: 'Pollo mechado en salsa' },
    { id: 'pack-carne-mechada', nombre: 'Carne mechada en salsa' },
    { id: 'pack-cerdo-pina', nombre: 'Cerdo en salsa de piña' },
    { id: 'pack-pollo-toscana', nombre: 'Pollo a la toscana' },
    { id: 'pack-cerdo-criolla', nombre: 'Trocitos de cerdo en salsa criolla' },
    { id: 'pack-pollo-demiglase', nombre: 'Pollo en salsa demiglase' },
    { id: 'pack-cerdo-chimichurri', nombre: 'Fajitas de cerdo con chimichurri' }
  ];

  // Precios de los packs (ajusta estos valores según necesites)
  const PACK_PRECIOS = {
    3: { '250': 13500, '500': 25850 },
    5: { '250': 21000, '500': 39950 }
  };

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (productoSeleccionado || packModalOpen || editingDesayunos || desayunosModalOpen || editingProteinas) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [productoSeleccionado, packModalOpen, editingDesayunos, desayunosModalOpen, editingProteinas]);

  // Abrir modal de pack
  const abrirPackModal = (cantidad) => {
    setPackModalOpen(cantidad);
    setPackTamano('250');
    setProteinasSeleccionadas([]);
  };

  // Cerrar modal de pack
  const cerrarPackModal = () => {
    setPackModalOpen(null);
    setProteinasSeleccionadas([]);
  };

  // Toggle selección de proteína
  const toggleProteina = (proteina) => {
    const yaSeleccionada = proteinasSeleccionadas.find(p => p.id === proteina.id);
    if (yaSeleccionada) {
      setProteinasSeleccionadas(proteinasSeleccionadas.filter(p => p.id !== proteina.id));
    } else if (proteinasSeleccionadas.length < packModalOpen) {
      setProteinasSeleccionadas([...proteinasSeleccionadas, proteina]);
    }
  };

  // Agregar pack al carrito
  const handleAgregarPack = () => {
    if (proteinasSeleccionadas.length !== packModalOpen) return;

    const packKey = `Pack ${packModalOpen} Proteínas`;
    const period = packTamano === '500' ? 'weekly_500' : 'weekly';
    const precio = PROTEIN_PRICES[packKey]?.[period] || 0;

    if (!precio) {
      toast.error('Precio no disponible para esta configuración');
      return;
    }

    const nombresProteinas = proteinasSeleccionadas.map(p => p.nombre).join(', ');

    // Usar imagen custom de Firestore si existe, sino usar default
    const imagenPack = imagenesCustom['pack-proteinas'] || IMAGENES_DEFAULT['pack-proteinas'];

    addToCart({
      id: `pack-${packModalOpen}-proteinas-${packTamano}-${Date.now()}`,
      name: `Pack ${packModalOpen} Proteínas (${packTamano} g)`,
      desc: `Incluye: ${nombresProteinas}`,
      proteinas: proteinasSeleccionadas.map(p => p.nombre),
      price: precio,
      quantity: 1,
      plan: 'pack-proteinas',
      planLabel: `Pack ${packModalOpen} × ${packTamano} g`,
      image: imagenPack
    });

    toast.success(`Pack ${packModalOpen} proteínas agregado al carrito`);
    cerrarPackModal();
  };

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

              {/* Cards de Packs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10"
              >
                {/* Pack 3 Proteínas */}
                <div className="bg-gradient-to-br from-white via-white to-gray-50/30 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all border border-gray-200/50 hover:border-orange-200 group">
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl shadow-lg">
                        🥩
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">Pack 3 Proteínas</h3>
                        <p className="text-white/90 text-sm font-medium">Elige 3 de nuestra selección</p>
                      </div>
                    </div>

                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-700 font-bold">Desde</p>
                        <p className="text-2xl font-black bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">₡{PACK_PRECIOS[3]['250'].toLocaleString('es-CR')}</p>
                      </div>
                      <div className="flex flex-col gap-2 text-right">
                        <div className="bg-white px-3 py-2 rounded-xl border-2 border-orange-300 shadow-md">
                          <p className="text-xs text-gray-600 font-semibold">250g</p>
                          <p className="text-base text-gray-900 font-black">₡{(PROTEIN_PRICES['Pack 3 Proteínas']?.weekly || 0).toLocaleString('es-CR')}</p>
                        </div>
                        <div className="bg-white px-3 py-2 rounded-xl border-2 border-orange-300 shadow-md">
                          <p className="text-xs text-gray-600 font-semibold">500g</p>
                          <p className="text-base text-gray-900 font-black">₡{(PROTEIN_PRICES['Pack 3 Proteínas']?.weekly_500 || 0).toLocaleString('es-CR')}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirPackModal(3)}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-xl shadow-orange-500/30 group-hover:shadow-orange-500/50 group-hover:scale-105"
                    >
                      <ShoppingCart size={20} />
                      Armar mi pack
                    </button>
                  </div>
                </div>

                {/* Pack 5 Proteínas */}
                <div className="bg-gradient-to-br from-white via-white to-gray-50/30 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all border border-gray-200/50 hover:border-red-200 group">
                  <div className="bg-gradient-to-r from-red-500 to-rose-500 p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full shadow-lg animate-pulse">
                      ⭐ POPULAR
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl shadow-lg">
                        🍖
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">Pack 5 Proteínas</h3>
                        <p className="text-white/90 text-sm font-medium">Elige 5 de nuestra selección</p>
                      </div>
                    </div>

                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-700 font-bold">Desde</p>
                        <p className="text-2xl font-black bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">₡{(PROTEIN_PRICES['Pack 5 Proteínas']?.weekly || 0).toLocaleString('es-CR')}</p>
                      </div>
                      <div className="flex flex-col gap-2 text-right">
                        <div className="bg-white px-3 py-2 rounded-xl border-2 border-red-300 shadow-md">
                          <p className="text-xs text-gray-600 font-semibold">250g</p>
                          <p className="text-base text-gray-900 font-black">₡{(PROTEIN_PRICES['Pack 5 Proteínas']?.weekly || 0).toLocaleString('es-CR')}</p>
                        </div>
                        <div className="bg-white px-3 py-2 rounded-xl border-2 border-red-300 shadow-md">
                          <p className="text-xs text-gray-600 font-semibold">500g</p>
                          <p className="text-base text-gray-900 font-black">₡{(PROTEIN_PRICES['Pack 5 Proteínas']?.weekly_500 || 0).toLocaleString('es-CR')}</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => abrirPackModal(5)}
                      className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-base shadow-xl shadow-red-500/30 group-hover:shadow-red-500/50 group-hover:scale-105"
                    >
                      <ShoppingCart size={20} />
                      Armar mi pack
                    </button>
                  </div>
                </div>

                {/* Tarjeta de Desayunos */}
                <div className="bg-gradient-to-br from-white via-white to-gray-50/30 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all border border-gray-200/50 hover:border-amber-200 group">
                  <div className="bg-gradient-to-r from-amber-400 to-yellow-500 p-5 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute top-2 right-2 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      ✨ Semanal
                    </div>
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl shadow-lg">
                        🍳
                      </div>
                      <div>
                        <h3 className="font-bold text-xl">Desayunos</h3>
                        <p className="text-white/90 text-sm font-medium">5 opciones esta semana</p>
                      </div>
                    </div>
                    {isAdmin && isAdmin() && (
                      <button
                        type="button"
                        onClick={() => {
                          setTempDesayunos([...desayunosMenu]);
                          setEditingDesayunos(true);
                        }}
                        className="absolute bottom-3 right-3 z-20 text-sm text-white hover:text-white flex items-center justify-center gap-2 bg-white/30 hover:bg-white/40 px-5 py-3 rounded-full font-bold transition-all shadow-lg backdrop-blur-sm hover:scale-110 active:scale-95 cursor-pointer"
                      >
                        <Pencil size={16} />
                        Editar
                      </button>
                    )}
                  </div>
                  <div className="p-5">
                    <ul className="space-y-2 text-sm text-gray-900 mb-4 max-h-32 overflow-y-auto">
                      {desayunosMenu.slice(0, 4).map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0 mt-1.5"></span>
                          <span className="font-semibold leading-snug">{item}</span>
                        </li>
                      ))}
                      {desayunosMenu.length > 4 && (
                        <li className="text-amber-600 font-bold">+{desayunosMenu.length - 4} más...</li>
                      )}
                    </ul>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-gray-700 font-bold">Precio</p>
                        <p className="text-2xl font-black bg-gradient-to-r from-amber-500 to-yellow-500 bg-clip-text text-transparent">₡{DESAYUNOS_PRECIO.toLocaleString('es-CR')}</p>
                      </div>
                      <span className="text-sm text-gray-900 bg-white px-3 py-1.5 rounded-full font-bold border-2 border-amber-300 shadow-sm">Por semana</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setDesayunosModalOpen(true)}
                        className="flex-1 border-2 border-amber-400 text-amber-600 font-semibold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm hover:bg-amber-50"
                      >
                        <Package size={16} />
                        Ver menú
                      </button>
                      <button
                        type="button"
                        onClick={handleAgregarDesayunos}
                        className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-white font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105"
                      >
                        <ShoppingCart size={18} />
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Filtros de categoría con emojis */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex flex-wrap gap-3 mb-10"
              >
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaActiva(cat)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 ${categoriaActiva === cat
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-lg shadow-orange-500/30 scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 hover:border-orange-300 hover:scale-102 shadow-md'
                      }`}
                  >
                    <span className="text-lg">{CATEGORY_ICONS[cat] || '📦'}</span>
                    <span>{cat}</span>
                  </button>
                ))}
              </motion.div>

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

        {/* Modal de Pack de Proteínas */}
        {packModalOpen && ReactDOM.createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cerrarPackModal}
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
                {/* Header */}
                <div className="bg-gradient-to-r from-bikitchen-orange to-orange-600 text-white px-5 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                        {packModalOpen === 3 ? '🥩' : '🍖'}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">
                          Arma tu Pack {packModalOpen} Proteínas
                        </h3>
                        <p className="text-white/80 text-sm">
                          Selecciona {packModalOpen} opciones
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={cerrarPackModal}
                      className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {/* Selector de tamaño */}
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-6 h-6 bg-bikitchen-orange text-white rounded-lg flex items-center justify-center text-xs">📦</span>
                      Tamaño por porción
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPackTamano('250')}
                        className={`relative px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${packTamano === '250'
                          ? 'bg-bikitchen-orange text-white border-bikitchen-orange shadow-lg shadow-bikitchen-orange/30'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-bikitchen-orange'
                          }`}
                      >
                        <span className="block">250 g</span>
                        <span className={`block text-xs mt-1 ${packTamano === '250' ? 'text-white/80' : 'text-bikitchen-orange'}`}>
                          ₡{PACK_PRECIOS[packModalOpen]['250'].toLocaleString('es-CR')}
                        </span>
                        {packTamano === '250' && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPackTamano('500')}
                        className={`relative px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${packTamano === '500'
                          ? 'bg-bikitchen-orange text-white border-bikitchen-orange shadow-lg shadow-bikitchen-orange/30'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-bikitchen-orange'
                          }`}
                      >
                        <span className="block">500 g</span>
                        <span className={`block text-xs mt-1 ${packTamano === '500' ? 'text-white/80' : 'text-bikitchen-orange'}`}>
                          ₡{PACK_PRECIOS[packModalOpen]['500'].toLocaleString('es-CR')}
                        </span>
                        {packTamano === '500' && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Lista de proteínas */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <span className="w-6 h-6 bg-bikitchen-orange text-white rounded-lg flex items-center justify-center text-xs">🍗</span>
                        Elige tus proteínas
                      </p>
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full ${proteinasSeleccionadas.length === packModalOpen
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                        }`}>
                        {proteinasSeleccionadas.length} de {packModalOpen}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {(proteinasDisponibles.length > 0 ? proteinasDisponibles : PROTEINAS_PACK.map(p => p.nombre)).map((nombreProteina, index) => {
                        const proteinaObj = { id: `proteina-${index}`, nombre: nombreProteina };
                        const seleccionada = proteinasSeleccionadas.find(p => p.id === proteinaObj.id);
                        const bloqueada = !seleccionada && proteinasSeleccionadas.length >= packModalOpen;

                        return (
                          <button
                            key={proteinaObj.id}
                            type="button"
                            onClick={() => toggleProteina(proteinaObj)}
                            disabled={bloqueada}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${seleccionada
                              ? 'bg-bikitchen-orange/10 border-bikitchen-orange'
                              : bloqueada
                                ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                                : 'bg-white border-gray-200 hover:border-bikitchen-orange'
                              }`}
                          >
                            <span className={`font-medium ${seleccionada
                              ? 'text-bikitchen-orange'
                              : 'text-gray-700'
                              }`}>
                              {nombreProteina}
                            </span>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${seleccionada
                              ? 'bg-bikitchen-orange border-bikitchen-orange'
                              : 'border-gray-300'
                              }`}>
                              {seleccionada && <Check size={14} className="text-white" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-4 bg-gray-50 border-t border-gray-100">
                  {/* Resumen */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Pack {packModalOpen} proteínas ({packTamano} g c/u):</span>
                      <span>₡{PACK_PRECIOS[packModalOpen][packTamano].toLocaleString('es-CR')}</span>
                    </div>
                    {proteinasSeleccionadas.length > 0 && (
                      <p className="text-xs text-gray-500 truncate">
                        {proteinasSeleccionadas.map(p => p.nombre).join(', ')}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAgregarPack}
                    disabled={proteinasSeleccionadas.length !== packModalOpen}
                    className="w-full bg-gradient-to-r from-bikitchen-orange to-orange-600 hover:from-bikitchen-orange-dark hover:to-orange-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-bikitchen-orange/30 active:scale-[0.98]"
                  >
                    <ShoppingCart size={20} />
                    <span>
                      {proteinasSeleccionadas.length === packModalOpen
                        ? `Agregar pack — ₡${PACK_PRECIOS[packModalOpen][packTamano].toLocaleString('es-CR')}`
                        : `Selecciona ${packModalOpen - proteinasSeleccionadas.length} más`
                      }
                    </span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

        {/* Modal de edición de Desayunos */}
        {editingDesayunos && ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setEditingDesayunos(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🍳</span>
                    <div>
                      <h2 className="text-lg font-bold">Editar Desayunos</h2>
                      <p className="text-xs text-white/80">Menú de la semana</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDesayunos(false)}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Desayunos Regulares */}
                <div>
                  <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    🍳 Desayunos Regulares
                  </h3>
                  <div className="space-y-2">
                    {tempDesayunos.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const newItems = [...tempDesayunos];
                            newItems[idx] = e.target.value;
                            setTempDesayunos(newItems);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                          placeholder={`Desayuno ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desayunos Vegetarianos */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      🥬 Desayunos Vegetarianos
                    </h3>
                    <button
                      type="button"
                      onClick={() => setTempDesayunosVeg([...tempDesayunosVeg, ''])}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold hover:bg-green-200 transition-colors"
                    >
                      + Añadir
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tempDesayunosVeg.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => {
                            const newItems = [...tempDesayunosVeg];
                            newItems[idx] = e.target.value;
                            setTempDesayunosVeg(newItems);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                          placeholder={`Desayuno vegetariano ${idx + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = tempDesayunosVeg.filter((_, i) => i !== idx);
                            setTempDesayunosVeg(newItems);
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    {tempDesayunosVeg.length === 0 && (
                      <p className="text-xs text-gray-500 italic text-center py-2">
                        No hay desayunos vegetarianos. Haz clic en "+ Añadir" para agregar.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDesayunos(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveDesayunos}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-xl font-medium hover:from-yellow-500 hover:to-amber-600 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Modal de Ver Desayunos */}
        {desayunosModalOpen && ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setDesayunosModalOpen(false)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                      🍳
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Desayunos de la Semana</h2>
                      <p className="text-xs text-white/80">Elige tu opción favorita</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDesayunosModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Pestañas */}
              <div className="px-5 pt-4">
                <div className="flex gap-2 bg-gray-100 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveDesayunoTab('regular')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${activeDesayunoTab === 'regular'
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-white'
                      }`}
                  >
                    🍳 Desayunos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDesayunoTab('vegetariano')}
                    className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-sm transition-all ${activeDesayunoTab === 'vegetariano'
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md'
                      : 'bg-transparent text-gray-600 hover:bg-white'
                      }`}
                  >
                    🥬 Vegetarianos
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                {activeDesayunoTab === 'regular' ? (
                  <>
                    <p className="text-sm text-gray-600 mb-4">
                      Esta semana tenemos preparados estos deliciosos desayunos para ti:
                    </p>
                    <div className="space-y-3">
                      {desayunosMenu.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100"
                        >
                          <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                            {idx + 1}
                          </div>
                          <span className="text-gray-700 font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm text-gray-600">
                        Desayunos 100% vegetarianos:
                      </p>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setTempDesayunosVeg([...desayunosVegetarianos]);
                            setEditingDesayunos(true);
                            setDesayunosModalOpen(false);
                          }}
                          className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200 transition-colors flex items-center gap-1"
                        >
                          <Plus size={14} />
                          Añadir nuevo
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {desayunosVegetarianos.length > 0 ? (
                        desayunosVegetarianos.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100"
                          >
                            <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                              {idx + 1}
                            </div>
                            <span className="text-gray-700 font-medium">{item}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">No hay desayunos vegetarianos disponibles.</p>
                          {isAdmin && (
                            <p className="text-xs mt-2">Haz clic en "Añadir nuevo" para agregar opciones.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
                <p className="text-xs text-amber-600 mt-4 text-center">
                  ✨ El menú cambia cada semana
                </p>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 font-medium">Total semanal:</span>
                  <span className="text-2xl font-bold text-amber-500">₡{DESAYUNOS_PRECIO.toLocaleString('es-CR')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleAgregarDesayunos();
                    setDesayunosModalOpen(false);
                  }}
                  className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30"
                >
                  <ShoppingCart size={20} />
                  Agregar al carrito
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

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

        {/* Modal de Edición de Proteínas */}
        {editingProteinas && ReactDOM.createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => setEditingProteinas(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-5 text-white relative">
                  <button
                    type="button"
                    onClick={() => setEditingProteinas(false)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                  >
                    <X size={18} />
                  </button>
                  <h3 className="text-xl font-bold">🥩 Editar Proteínas Disponibles</h3>
                  <p className="text-white/80 text-sm mt-1">Agrega o elimina proteínas para los packs</p>
                </div>

                {/* Content */}
                <div className="p-5 max-h-[50vh] overflow-y-auto">
                  {/* Input para agregar nueva proteína */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={nuevaProteina}
                      onChange={(e) => setNuevaProteina(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && agregarProteina()}
                      placeholder="Nueva proteína..."
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none text-gray-900 font-medium"
                    />
                    <button
                      type="button"
                      onClick={agregarProteina}
                      className="px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold hover:from-orange-600 hover:to-amber-600 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {/* Lista de proteínas */}
                  <div className="space-y-2">
                    {tempProteinas.map((proteina, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-200"
                      >
                        {editandoIndice === index ? (
                          <>
                            <input
                              type="text"
                              value={nombreEditado}
                              onChange={(e) => setNombreEditado(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') guardarEdicion();
                                if (e.key === 'Escape') cancelarEdicion();
                              }}
                              className="flex-1 px-3 py-2 rounded-lg border-2 border-orange-400 focus:outline-none text-gray-900 font-medium"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={guardarEdicion}
                              className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center hover:bg-green-200 transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={cancelarEdicion}
                              className="w-8 h-8 rounded-lg bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-gray-900 font-medium">{proteina}</span>
                            <button
                              type="button"
                              onClick={() => iniciarEdicion(index)}
                              className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
                              title="Editar nombre"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => eliminarProteina(index)}
                              className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-colors"
                              title="Eliminar"
                            >
                              <X size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    {tempProteinas.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No hay proteínas. Agrega una nueva.</p>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-5 bg-gray-50 border-t border-gray-200 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingProteinas(false)}
                    className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={saveProteinas}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
                  >
                    Guardar Cambios
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
