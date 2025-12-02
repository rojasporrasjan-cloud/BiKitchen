import React, { useState, useEffect } from 'react';
import {
    ShoppingBag,
    Plus,
    Search,
    DollarSign,
    Trash2,
    TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase/config';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    deleteDoc,
    doc,
    updateDoc,
    increment,
    getDocs
} from 'firebase/firestore';

export default function PurchasesView() {
    const [purchases, setPurchases] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "compras"), orderBy("fecha", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const purchasesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPurchases(purchasesData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching purchases:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAddPurchase = async (purchaseData) => {
        try {
            await addDoc(collection(db, "compras"), {
                ...purchaseData,
                fecha: new Date().toISOString()
            });

            for (const producto of purchaseData.productos) {
                const inventoryRef = collection(db, "inventario");
                const inventorySnapshot = await getDocs(query(inventoryRef));

                inventorySnapshot.forEach(async (docSnap) => {
                    if (docSnap.data().nombre === producto.nombre) {
                        await updateDoc(doc(db, "inventario", docSnap.id), {
                            stock: increment(producto.cantidad)
                        });
                    }
                });
            }

            setShowAddModal(false);
        } catch (error) {
            console.error("Error adding purchase:", error);
        }
    };

    const handleDeletePurchase = async (purchaseId) => {
        if (window.confirm('¿Estás seguro de eliminar esta compra?')) {
            try {
                await deleteDoc(doc(db, "compras", purchaseId));
            } catch (error) {
                console.error("Error deleting purchase:", error);
            }
        }
    };

    const filteredPurchases = purchases.filter(purchase =>
        purchase.proveedor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.factura?.includes(searchTerm)
    );

    const totalMonth = purchases
        .filter(p => {
            const purchaseDate = new Date(p.fecha);
            const now = new Date();
            return purchaseDate.getMonth() === now.getMonth() &&
                purchaseDate.getFullYear() === now.getFullYear();
        })
        .reduce((acc, p) => acc + (p.costoTotal || 0), 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Compras</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de compras a proveedores</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={16} />
                    Nueva Compra
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Total Este Mes</span>
                        <DollarSign className="text-green-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">₡{totalMonth.toLocaleString('es-CR')}</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Compras Este Mes</span>
                        <ShoppingBag className="text-blue-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                        {purchases.filter(p => {
                            const purchaseDate = new Date(p.fecha);
                            const now = new Date();
                            return purchaseDate.getMonth() === now.getMonth();
                        }).length}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Promedio por Compra</span>
                        <TrendingUp className="text-purple-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                        ₡{purchases.length > 0 ? Math.round(totalMonth / purchases.filter(p => {
                            const purchaseDate = new Date(p.fecha);
                            const now = new Date();
                            return purchaseDate.getMonth() === now.getMonth();
                        }).length || 1).toLocaleString('es-CR') : '0'}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por proveedor o factura..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                    />
                </div>
            </div>

            {/* Purchases Table - Desktop */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Fecha</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Productos</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Factura</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Total</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredPurchases.map((purchase) => (
                                    <motion.tr
                                        key={purchase.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-3 px-4 text-sm text-gray-600">
                                            {new Date(purchase.fecha).toLocaleDateString('es-CR')}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-gray-900 text-sm">{purchase.proveedor}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex flex-wrap gap-1">
                                                {purchase.productos?.slice(0, 2).map((prod, idx) => (
                                                    <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                        {prod.nombre}
                                                    </span>
                                                ))}
                                                {purchase.productos?.length > 2 && (
                                                    <span className="text-xs text-gray-400">
                                                        +{purchase.productos.length - 2} más
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">{purchase.factura}</td>
                                        <td className="py-3 px-4 text-right text-sm font-bold text-gray-900">
                                            ₡{purchase.costoTotal?.toLocaleString('es-CR')}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleDeletePurchase(purchase.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Purchases Cards - Mobile */}
            <div className="md:hidden space-y-3">
                <AnimatePresence>
                    {filteredPurchases.map((purchase) => (
                        <motion.div
                            key={purchase.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs text-gray-400 uppercase">Fecha</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {new Date(purchase.fecha).toLocaleDateString('es-CR')}
                                    </div>
                                    <div className="mt-1 text-sm font-medium text-gray-900">
                                        {purchase.proveedor}
                                    </div>
                                    {purchase.factura && (
                                        <div className="text-xs text-gray-500 font-mono mt-0.5">Factura: {purchase.factura}</div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-[11px] uppercase text-gray-400">Total</div>
                                    <div className="text-sm font-bold text-gray-900">
                                        ₡{purchase.costoTotal?.toLocaleString('es-CR')}
                                    </div>
                                </div>
                            </div>

                            {purchase.productos?.length > 0 && (
                                <div className="border-t border-gray-100 pt-2 mt-1">
                                    <div className="text-[11px] uppercase text-gray-400 mb-1">Productos</div>
                                    <div className="flex flex-wrap gap-1">
                                        {purchase.productos.slice(0, 3).map((prod, idx) => (
                                            <span
                                                key={idx}
                                                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                                            >
                                                {prod.nombre}
                                            </span>
                                        ))}
                                        {purchase.productos.length > 3 && (
                                            <span className="text-xs text-gray-400">
                                                +{purchase.productos.length - 3} más
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    onClick={() => handleDeletePurchase(purchase.id)}
                                    className="px-3 py-1.5 text-xs flex items-center gap-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                    Eliminar
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredPurchases.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No se encontraron compras</p>
                </div>
            )}

            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-xl p-6 max-w-2xl w-full my-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Nueva Compra</h2>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);

                                const productos = [];
                                const productNames = formData.getAll('producto_nombre');
                                const productQuantities = formData.getAll('producto_cantidad');
                                const productCosts = formData.getAll('producto_costo');

                                for (let i = 0; i < productNames.length; i++) {
                                    if (productNames[i]) {
                                        productos.push({
                                            nombre: productNames[i],
                                            cantidad: parseFloat(productQuantities[i]),
                                            costoUnitario: parseFloat(productCosts[i])
                                        });
                                    }
                                }

                                const costoTotal = productos.reduce((acc, p) => acc + (p.cantidad * p.costoUnitario), 0);

                                handleAddPurchase({
                                    proveedor: formData.get('proveedor'),
                                    factura: formData.get('factura'),
                                    productos,
                                    costoTotal
                                });
                            }}>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input
                                            name="proveedor"
                                            type="text"
                                            placeholder="Proveedor"
                                            required
                                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        />
                                        <input
                                            name="factura"
                                            type="text"
                                            placeholder="Nº Factura"
                                            required
                                            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                        />
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold text-gray-900 mb-3">Productos</h3>
                                        <div id="productos-container" className="space-y-3">
                                            <div className="grid grid-cols-12 gap-2">
                                                <input
                                                    name="producto_nombre"
                                                    type="text"
                                                    placeholder="Producto"
                                                    className="col-span-5 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                                />
                                                <input
                                                    name="producto_cantidad"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Cant."
                                                    className="col-span-3 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                                />
                                                <input
                                                    name="producto_costo"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="Costo"
                                                    className="col-span-4 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const container = document.getElementById('productos-container');
                                                const newRow = container.children[0].cloneNode(true);
                                                newRow.querySelectorAll('input').forEach(input => input.value = '');
                                                container.appendChild(newRow);
                                            }}
                                            className="mt-2 text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                                        >
                                            <Plus size={14} />
                                            Agregar producto
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                                    >
                                        Guardar Compra
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
