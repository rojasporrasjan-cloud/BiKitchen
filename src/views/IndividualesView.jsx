import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { INDIVIDUALES_CATEGORIES, individualesData } from '../data/individualesData';
import IndividualCard from '../components/IndividualCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { ShoppingCart, X, Plus, Minus, MessageSquare, ChevronDown, Check } from 'lucide-react';

export default function IndividualesView() {
  const { addToCart } = useCart();
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [tamano, setTamano] = useState('500'); // '500' o '1000'
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');
  const [showNotes, setShowNotes] = useState(false);

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

  const categorias = useMemo(
    () => ['Todos', ...INDIVIDUALES_CATEGORIES],
    []
  );

  const productosPorCategoria = useMemo(() => {
    const base = categoriaActiva === 'Todos'
      ? INDIVIDUALES_CATEGORIES
      : INDIVIDUALES_CATEGORIES.filter((c) => c === categoriaActiva);

    return base.map((categoria) => ({
      categoria,
      productos: individualesData.filter((p) => p.categoria === categoria)
    }));
  }, [categoriaActiva]);

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

    addToCart({
      id: `${productoSeleccionado.id}-${tamano}`,
      name: productoSeleccionado.nombre,
      desc: nota || productoSeleccionado.descripcion,
      price: precio,
      quantity: cantidad,
      plan: 'individual',
      planLabel: tamano === '500' ? 'Individual 500 g' : 'Individual 1 kg'
    });

    toast.success(`${productoSeleccionado.nombre} agregado al carrito`);
    cerrarModal();
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#FDFBF9] dark:bg-[#1F1E1E] text-gray-900 dark:text-gray-100 flex flex-col">
        <Navbar />

        <main className="flex-1">
          <section className="pt-28 pb-10">
            <div className="container">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="max-w-3xl mb-8"
              >
                <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-3">
                  Platos Individuales
                </h1>
                <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base max-w-xl">
                  Elegí tus comidas favoritas por porción o por kilo. Ideal para complementar tus packs o armar tu propia semana BiKitchen.
                </p>
              </motion.div>

              {/* Filtros de categoría */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                className="flex flex-wrap gap-2 mb-8"
              >
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoriaActiva(cat)}
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all ${
                      categoriaActiva === cat
                        ? 'bg-[#FF671D] text-white border-[#FF671D] shadow-sm'
                        : 'bg-white/70 dark:bg-gray-900/60 text-gray-700 dark:text-gray-200 border-[#F3E2D7] dark:border-gray-700 hover:bg-[#FFF4EC] dark:hover:bg-gray-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </motion.div>

              {/* Secciones por categoría */}
              <div className="space-y-10 pb-16">
                {productosPorCategoria.map(({ categoria, productos }) => (
                  productos.length === 0 ? null : (
                    <section key={categoria} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          {categoria}
                        </h2>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {productos.length} platos
                        </span>
                      </div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                      >
                        {productos.map((producto) => (
                          <IndividualCard
                            key={producto.id}
                            producto={producto}
                            onClick={() => abrirModal(producto)}
                          />
                        ))}
                      </motion.div>
                    </section>
                  )
                ))}

                {productosPorCategoria.every((c) => c.productos.length === 0) && (
                  <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-10">
                    No hay productos en esta categoría por el momento.
                  </div>
                )}
              </div>
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
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[85vh] shadow-2xl overflow-hidden flex flex-col"
              >
                {/* Header con gradiente */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">
                          {productoSeleccionado.nombre}
                        </h3>
                        <p className="text-white/80 text-sm">
                          {productoSeleccionado.categoria}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={cerrarModal}
                      className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Contenido con scroll */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  {productoSeleccionado.descripcion && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 bg-orange-50 dark:bg-gray-800 p-3 rounded-xl">
                      ℹ️ {productoSeleccionado.descripcion}
                    </p>
                  )}

                  {/* Tamaño */}
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-lg flex items-center justify-center text-xs">📦</span>
                      Elige tu tamaño
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={!productoSeleccionado.precio500}
                        onClick={() => setTamano('500')}
                        className={`relative px-4 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                          tamano === '500'
                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-orange-300'
                        } ${
                          !productoSeleccionado.precio500
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                      >
                        <span className="text-lg block mb-1">🥡</span>
                        <span className="block">500 g</span>
                        {productoSeleccionado.precio500 && (
                          <span className={`block text-xs mt-1 ${tamano === '500' ? 'text-orange-100' : 'text-orange-500'}`}>
                            ₡{productoSeleccionado.precio500.toLocaleString('es-CR')}
                          </span>
                        )}
                        {tamano === '500' && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={!productoSeleccionado.precio1kg}
                        onClick={() => setTamano('1000')}
                        className={`relative px-4 py-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                          tamano === '1000'
                            ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-500/30'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-orange-300'
                        } ${
                          !productoSeleccionado.precio1kg
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                      >
                        <span className="text-lg block mb-1">🍱</span>
                        <span className="block">1 kg</span>
                        {productoSeleccionado.precio1kg && (
                          <span className={`block text-xs mt-1 ${tamano === '1000' ? 'text-orange-100' : 'text-orange-500'}`}>
                            ₡{productoSeleccionado.precio1kg.toLocaleString('es-CR')}
                          </span>
                        )}
                        {tamano === '1000' && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check size={12} className="text-white" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Cantidad */}
                  <div className="space-y-3">
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-lg flex items-center justify-center text-xs">🔢</span>
                      Cantidad
                    </p>
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-2 w-fit">
                      <button
                        type="button"
                        onClick={() => setCantidad(Math.max(1, cantidad - 1))}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Minus size={18} />
                      </button>
                      <span className="w-10 text-center font-bold text-gray-900 dark:text-white text-lg">{cantidad}</span>
                      <button
                        type="button"
                        onClick={() => setCantidad(cantidad + 1)}
                        className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-orange-500 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Nota */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowNotes(!showNotes)}
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-orange-500 transition-colors"
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
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-5 py-4 bg-gray-50 dark:bg-gray-950/60 border-t border-gray-100 dark:border-gray-800">
                  {/* Resumen de precio */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>Precio unitario:</span>
                      <span>₡{getPrecioSeleccionado().toLocaleString('es-CR')}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-700">
                      <span>Total:</span>
                      <span className="text-orange-500">
                        ₡{(getPrecioSeleccionado() * cantidad).toLocaleString('es-CR')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAgregarCarrito}
                    disabled={!getPrecioSeleccionado()}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/30 active:scale-[0.98]"
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
