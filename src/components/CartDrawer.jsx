import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingCart, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrdersContext';
import { db } from '../firebase/config';
import { collection, getDocs, query, updateDoc, doc, increment, addDoc } from 'firebase/firestore';

export default function CartDrawer() {
    const { cart, isCartOpen, setIsCartOpen, removeFromCart, updateQuantity, getTotalPrice, clearCart } = useCart();
    const { addOrder } = useOrders();
    const [showCheckout, setShowCheckout] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleCheckout = async (e) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.target);

        try {
            console.log('[Checkout] Inicio envío de pedido');
            // Datos del cliente
            const customerData = {
                name: formData.get('nombre'),
                phone: formData.get('telefono'),
                email: formData.get('correo'),
                address: formData.get('direccion'),
                plan: formData.get('plan'),
                deliveryDate: formData.get('fecha_entrega'),
                notes: formData.get('observaciones') || ''
            };

            // Pedido operativo para hojas de producción (colección "pedidos")
            const productionOrder = {
                cliente: formData.get('nombre'),
                telefono: formData.get('telefono'),
                correo: formData.get('correo'),
                direccion: formData.get('direccion'),
                plan: formData.get('plan'),
                fecha_entrega: formData.get('fecha_entrega'),
                observaciones: formData.get('observaciones') || '',
                menu: cart.map(item => ({
                    nombre: item.name,
                    proteina: item.protein || '150g',
                    carbo: item.carbs || '100g',
                    ensalada: item.veggies || '80g',
                    cantidad: item.quantity
                })),
                total: `₡${getTotalPrice().toLocaleString('es-CR')}`,
                status: 'new',
                createdAt: new Date().toISOString()
            };

            // Guardar en colección usada por SheetsView
            console.log('[Checkout] Guardando en colección "pedidos"...', productionOrder);
            await addDoc(collection(db, 'pedidos'), productionOrder);
            console.log('[Checkout] Documento creado en "pedidos"');

            // Crear registro para panel de administración / estadísticas
            console.log('[Checkout] Creando registro en "orders" via OrdersContext...', customerData);
            await addOrder(cart, customerData);
            console.log('[Checkout] Pedido registrado en "orders"');

            // Descontar del inventario (simulado - en producción sería más específico)
            // Aquí podrías implementar la lógica de descuento de inventario

            // Limpiar carrito
            clearCart();
            setShowCheckout(false);
            setIsCartOpen(false);

            // Mostrar confirmación
            alert('¡Pedido creado exitosamente! Recibirás una confirmación por WhatsApp.');

        } catch (error) {
            console.error('Error creating order:', error);
            alert('Hubo un error al crear el pedido. Por favor intenta de nuevo. Revisa la consola para más detalles.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isCartOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsCartOpen(false)}
                        className="fixed inset-0 bg-black/50 z-50"
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                                <ShoppingCart size={24} className="text-orange-500" />
                                <h2 className="text-xl font-bold text-gray-900">Tu Carrito</h2>
                            </div>
                            <button
                                onClick={() => setIsCartOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Cart Items */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {cart.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>Tu carrito está vacío</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cart.map((item) => (
                                        <motion.div
                                            key={item.id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="flex gap-4 p-4 bg-gray-50 rounded-lg"
                                        >
                                            <img
                                                src={item.image}
                                                alt={item.name}
                                                className="w-20 h-20 object-cover rounded-lg"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                                                {item.planLabel && (
                                                    <p className="text-xs text-orange-500 font-semibold">
                                                        {item.planLabel}
                                                    </p>
                                                )}
                                                {item.desc && (
                                                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                                                        {item.desc}
                                                    </p>
                                                )}
                                                <div className="mt-2 flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">
                                                        Precio unitario: <span className="font-semibold">₡{item.price.toLocaleString('es-CR')}</span>
                                                    </span>
                                                    <span className="text-xs font-bold text-orange-500">
                                                        Subtotal: ₡{(item.price * item.quantity).toLocaleString('es-CR')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.plan, Math.max(1, item.quantity - 1))}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.plan, item.quantity + 1)}
                                                        className="p-1 hover:bg-gray-200 rounded"
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeFromCart(item.id, item.plan)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors self-start"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {cart.length > 0 && (
                            <div className="border-t border-gray-200 p-6 space-y-4">
                                <div className="flex justify-between items-center text-lg font-bold">
                                    <span>Total:</span>
                                    <span className="text-orange-500">₡{getTotalPrice().toLocaleString('es-CR')}</span>
                                </div>
                                <button
                                    onClick={() => setShowCheckout(true)}
                                    className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    Finalizar Compra
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Checkout Modal */}
                    <AnimatePresence>
                        {showCheckout && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Finalizar Pedido</h2>
                                    <form onSubmit={handleCheckout} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nombre Completo *
                                            </label>
                                            <input
                                                name="nombre"
                                                type="text"
                                                required
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Teléfono *
                                            </label>
                                            <input
                                                name="telefono"
                                                type="tel"
                                                required
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Correo Electrónico *
                                            </label>
                                            <input
                                                name="correo"
                                                type="email"
                                                required
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Dirección de Entrega *
                                            </label>
                                            <textarea
                                                name="direccion"
                                                required
                                                rows="2"
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Plan *
                                            </label>
                                            <select
                                                name="plan"
                                                required
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            >
                                                <option value="">Selecciona un plan</option>
                                                <option value="Semanal">Semanal</option>
                                                <option value="Quincenal">Quincenal</option>
                                                <option value="Mensual">Mensual</option>
                                                <option value="Personalizado">Personalizado</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Fecha de Entrega *
                                            </label>
                                            <input
                                                name="fecha_entrega"
                                                type="date"
                                                required
                                                min={new Date().toISOString().split('T')[0]}
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Observaciones
                                            </label>
                                            <textarea
                                                name="observaciones"
                                                rows="2"
                                                placeholder="Alergias, preferencias, etc."
                                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setShowCheckout(false)}
                                                className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:bg-gray-300"
                                            >
                                                {loading ? 'Procesando...' : 'Confirmar Pedido'}
                                            </button>
                                        </div>
                                    </form>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    );
}
