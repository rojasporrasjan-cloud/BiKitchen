import React, { useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { INDIVIDUALES_CATEGORIES, individualesData } from '../data/individualesData';
import IndividualCard from '../components/IndividualCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import { ShoppingCart, X } from 'lucide-react';

export default function IndividualesView() {
  const { addToCart } = useCart();
  const [categoriaActiva, setCategoriaActiva] = useState('Todos');
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [tamano, setTamano] = useState('500'); // '500' o '1000'
  const [cantidad, setCantidad] = useState(1);
  const [nota, setNota] = useState('');

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

        {/* Modal de detalle */}
        <AnimatePresence>
          {productoSeleccionado && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {productoSeleccionado.nombre}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {productoSeleccionado.categoria} · Elegí tamaño y cantidad
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={cerrarModal}
                    className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {productoSeleccionado.descripcion && (
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {productoSeleccionado.descripcion}
                    </p>
                  )}

                  {/* Tamaño */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Tamaño
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!productoSeleccionado.precio500}
                        onClick={() => setTamano('500')}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                          tamano === '500'
                            ? 'bg-[#FF671D] text-white border-[#FF671D]'
                            : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                        } ${
                          !productoSeleccionado.precio500
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                      >
                        500 g
                      </button>
                      <button
                        type="button"
                        disabled={!productoSeleccionado.precio1kg}
                        onClick={() => setTamano('1000')}
                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                          tamano === '1000'
                            ? 'bg-[#FF671D] text-white border-[#FF671D]'
                            : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700'
                        } ${
                          !productoSeleccionado.precio1kg
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        }`}
                      >
                        1 kg
                      </button>
                    </div>
                  </div>

                  {/* Cantidad */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Cantidad
                    </p>
                    <input
                      type="number"
                      min={1}
                      value={cantidad}
                      onChange={(e) => setCantidad(Math.max(1, Number(e.target.value) || 1))}
                      className="w-24 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>

                  {/* Nota */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Nota / especificaciones
                    </p>
                    <textarea
                      rows={3}
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      placeholder="Ej: Sin cebolla, por favor."
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 resize-none"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-950/60">
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    <p>
                      Precio unitario:{' '}
                      <span className="font-semibold">
                        {getPrecioSeleccionado()
                          ? `₡${getPrecioSeleccionado().toLocaleString('es-CR')}`
                          : 'No disponible'}
                      </span>
                    </p>
                    <p>
                      Total:{' '}
                      <span className="font-bold text-[#FF671D]">
                        {getPrecioSeleccionado()
                          ? `₡${(getPrecioSeleccionado() * cantidad).toLocaleString('es-CR')}`
                          : '—'}
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleAgregarCarrito}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF671D] text-white text-xs font-semibold hover:bg-[#ff7f3f] transition-colors disabled:opacity-60"
                    disabled={!getPrecioSeleccionado()}
                  >
                    <ShoppingCart size={16} />
                    Agregar al carrito
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
}
