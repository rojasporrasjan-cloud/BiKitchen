import React, { useState, useEffect } from 'react';
import {
    Package,
    Plus,
    Search,
    Edit2,
    Trash2,
    AlertTriangle,
    CheckCircle,
    TrendingDown,
    X,
    Save,
    RefreshCw,
    Box
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase/config';
import { collection, addDoc, onSnapshot, query, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const CATEGORIES = ['Todos', 'Proteína', 'Carbohidrato', 'Vegetal', 'Grasa Saludable', 'Otros'];

/**
 * InventoryView - Gestión de Inventario
 * Conectado a Firebase - Colección: inventario
 */
export default function InventoryView() {
    const [inventory, setInventory] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [loading, setLoading] = useState(true);

    // Cargar inventario desde Firebase
    useEffect(() => {
        // LIMITAR LECTURAS: Solo cargar los primeros 100 items
        const q = query(collection(db, "inventario"), orderBy("name", "asc"), limit(100));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => {
                const data = doc.data();
                // Calcular estado basado en stock vs mínimo
                let status = 'good';
                if (data.stock <= data.min * 0.25) status = 'critical';
                else if (data.stock <= data.min) status = 'warning';

                return {
                    id: doc.id,
                    ...data,
                    status
                };
            });
            setInventory(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching inventory:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Agregar item
    const handleAddItem = async (itemData) => {
        try {
            await addDoc(collection(db, "inventario"), {
                ...itemData,
                createdAt: new Date().toISOString()
            });
            setShowAddModal(false);
        } catch (error) {
            console.error("Error adding item:", error);
            alert('Error al agregar item');
        }
    };

    // Actualizar item
    const handleUpdateItem = async (itemId, itemData) => {
        try {
            await updateDoc(doc(db, "inventario", itemId), {
                ...itemData,
                updatedAt: new Date().toISOString()
            });
            setEditingItem(null);
        } catch (error) {
            console.error("Error updating item:", error);
            alert('Error al actualizar item');
        }
    };

    // Eliminar item
    const handleDeleteItem = async (itemId) => {
        if (window.confirm('¿Estás seguro de eliminar este item?')) {
            try {
                await deleteDoc(doc(db, "inventario", itemId));
            } catch (error) {
                console.error("Error deleting item:", error);
                alert('Error al eliminar item');
            }
        }
    };

    const filteredInventory = inventory.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.supplier.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'critical':
                return { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítico', icon: AlertTriangle };
            case 'warning':
                return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Bajo', icon: TrendingDown };
            case 'good':
                return { bg: 'bg-green-100', text: 'text-green-700', label: 'OK', icon: CheckCircle };
            default:
                return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'N/A', icon: Package };
        }
    };

    const totalValue = inventory.reduce((acc, item) => acc + (item.stock * item.cost), 0);
    const criticalItems = inventory.filter(i => i.status === 'critical').length;
    const lowStockItems = inventory.filter(i => i.status === 'warning').length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <AdminPageHeader
                icon={Box}
                title="Inventario"
                subtitle="Gestión de stock y materias primas"
                gradient="from-indigo-500 via-purple-400 to-pink-400"
                stats={[
                    { value: inventory.length, label: 'Items' },
                    { value: criticalItems, label: 'Críticos' },
                    { value: `₡${(totalValue / 1000).toFixed(0)}K`, label: 'Valor' }
                ]}
                actions={[
                    <button
                        key="add"
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-600 text-sm font-semibold hover:bg-indigo-50 shadow-md transition-colors"
                    >
                        <Plus size={16} /> Agregar Item
                    </button>
                ]}
            />

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-white via-blue-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Valor Total</span>
                        <div className="p-2 bg-gradient-to-br from-blue-400 to-cyan-500 text-white rounded-xl shadow-lg">
                            <Package size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">₡{totalValue.toLocaleString('es-CR')}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-white via-red-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Items Críticos</span>
                        <div className="p-2 bg-gradient-to-br from-red-400 to-rose-500 text-white rounded-xl shadow-lg">
                            <AlertTriangle size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{criticalItems}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-white via-yellow-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Stock Bajo</span>
                        <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-xl shadow-lg">
                            <TrendingDown size={18} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{lowStockItems}</div>
                </motion.div>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-white via-gray-50/30 to-white rounded-3xl p-6 shadow-xl border border-gray-100/50"
            >
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 text-sm transition-all"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Inventory Table - Desktop */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Producto</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Categoría</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Stock</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Proveedor</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Valor</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {filteredInventory.map((item) => {
                                    const statusBadge = getStatusBadge(item.status);
                                    const StatusIcon = statusBadge.icon;

                                    return (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                <div className="text-sm font-bold text-gray-900">{item.stock} {item.unit}</div>
                                                <div className="text-xs text-gray-400">Mín: {item.min}</div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{item.supplier}</td>
                                            <td className="py-3 px-4 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                                                    <StatusIcon size={12} />
                                                    {statusBadge.label}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right text-sm font-bold text-gray-900">
                                                ₡{(item.stock * item.cost).toLocaleString('es-CR')}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setEditingItem(item)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Inventory Cards - Mobile */}
            <div className="md:hidden space-y-3">
                <AnimatePresence>
                    {filteredInventory.map((item) => {
                        const statusBadge = getStatusBadge(item.status);
                        const StatusIcon = statusBadge.icon;

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                                {item.category}
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                Proveedor: <span className="text-gray-600">{item.supplier}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.bg} ${statusBadge.text}`}>
                                        <StatusIcon size={12} />
                                        {statusBadge.label}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <div>
                                        <div className="font-bold text-gray-900">
                                            {item.stock} {item.unit}
                                        </div>
                                        <div className="text-xs text-gray-400">Mín: {item.min}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[11px] uppercase text-gray-400">Valor total</div>
                                        <div className="font-bold text-gray-900 text-sm">
                                            ₡{(item.stock * item.cost).toLocaleString('es-CR')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 mt-1">
                                    <button
                                        onClick={() => setEditingItem(item)}
                                        className="px-3 py-1.5 text-xs flex items-center gap-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={14} />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="px-3 py-1.5 text-xs flex items-center gap-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={14} />
                                        Eliminar
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {filteredInventory.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No se encontraron items</p>
                    <p className="text-sm mt-2">Agrega tu primer item de inventario</p>
                </div>
            )}

            {loading && (
                <div className="text-center py-12">
                    <RefreshCw size={32} className="animate-spin mx-auto text-orange-500 mb-4" />
                    <p className="text-gray-500">Cargando inventario...</p>
                </div>
            )}

            {/* Modal Agregar/Editar Item */}
            <AnimatePresence>
                {(showAddModal || editingItem) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        onClick={() => { setShowAddModal(false); setEditingItem(null); }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900">
                                    {editingItem ? 'Editar Item' : 'Nuevo Item'}
                                </h3>
                                <button
                                    onClick={() => { setShowAddModal(false); setEditingItem(null); }}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <InventoryForm
                                initialData={editingItem}
                                onSubmit={(data) => {
                                    if (editingItem) {
                                        handleUpdateItem(editingItem.id, data);
                                    } else {
                                        handleAddItem(data);
                                    }
                                }}
                                onCancel={() => { setShowAddModal(false); setEditingItem(null); }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Componente de formulario para agregar/editar items
function InventoryForm({ initialData, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: initialData?.name || '',
        category: initialData?.category || 'Proteína',
        stock: initialData?.stock || 0,
        min: initialData?.min || 10,
        unit: initialData?.unit || 'kg',
        cost: initialData?.cost || 0,
        supplier: initialData?.supplier || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            stock: Number(formData.stock),
            min: Number(formData.min),
            cost: Number(formData.cost)
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    placeholder="Ej: Pollo Orgánico"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                        <option value="Proteína">Proteína</option>
                        <option value="Carbohidrato">Carbohidrato</option>
                        <option value="Vegetal">Vegetal</option>
                        <option value="Grasa Saludable">Grasa Saludable</option>
                        <option value="Otros">Otros</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                    <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    >
                        <option value="kg">Kilogramos (kg)</option>
                        <option value="g">Gramos (g)</option>
                        <option value="unidades">Unidades</option>
                        <option value="litros">Litros</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="0.1"
                        value={formData.stock}
                        onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="0.1"
                        value={formData.min}
                        onChange={(e) => setFormData({ ...formData, min: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo por Unidad (₡)</label>
                    <input
                        type="number"
                        required
                        min="0"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                    <input
                        type="text"
                        value={formData.supplier}
                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                        placeholder="Ej: Granja Verde"
                    />
                </div>
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Save size={16} />
                    {initialData ? 'Guardar Cambios' : 'Agregar Item'}
                </button>
            </div>
        </form>
    );
}
