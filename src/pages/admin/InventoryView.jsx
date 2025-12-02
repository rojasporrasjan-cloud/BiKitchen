import React, { useState } from 'react';
import {
    Package,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    AlertTriangle,
    CheckCircle,
    TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock data - En producción vendría de Firebase
const INITIAL_INVENTORY = [
    { id: 1, name: 'Pollo Orgánico', category: 'Proteína', stock: 5, min: 20, unit: 'kg', cost: 8500, supplier: 'Granja Verde', status: 'critical' },
    { id: 2, name: 'Quinoa Tricolor', category: 'Carbohidrato', stock: 12, min: 15, unit: 'kg', cost: 12000, supplier: 'Orgánicos CR', status: 'warning' },
    { id: 3, name: 'Brócoli Fresco', category: 'Vegetal', stock: 8, min: 10, unit: 'kg', cost: 3500, supplier: 'Finca Local', status: 'warning' },
    { id: 4, name: 'Salmón del Atlántico', category: 'Proteína', stock: 3, min: 8, unit: 'kg', cost: 18000, supplier: 'Pescados Premium', status: 'critical' },
    { id: 5, name: 'Arroz Integral', category: 'Carbohidrato', stock: 45, min: 20, unit: 'kg', cost: 2800, supplier: 'Granos SA', status: 'good' },
    { id: 6, name: 'Espinaca Orgánica', category: 'Vegetal', stock: 15, min: 10, unit: 'kg', cost: 4200, supplier: 'Finca Local', status: 'good' },
    { id: 7, name: 'Aguacate Hass', category: 'Grasa Saludable', stock: 25, min: 15, unit: 'unidades', cost: 1500, supplier: 'Frutas del Valle', status: 'good' },
    { id: 8, name: 'Aceite de Oliva Extra Virgen', category: 'Grasa Saludable', stock: 6, min: 8, unit: 'litros', cost: 15000, supplier: 'Importadora Gourmet', status: 'warning' }
];

const CATEGORIES = ['Todos', 'Proteína', 'Carbohidrato', 'Vegetal', 'Grasa Saludable'];

export default function InventoryView() {
    const [inventory, setInventory] = useState(INITIAL_INVENTORY);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [showAddModal, setShowAddModal] = useState(false);

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
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventario</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de stock y materias primas</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={16} />
                    Agregar Item
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Valor Total</span>
                        <Package className="text-blue-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">₡{totalValue.toLocaleString('es-CR')}</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Items Críticos</span>
                        <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-red-600">{criticalItems}</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Stock Bajo</span>
                        <TrendingDown className="text-yellow-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
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
            </div>

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
                                                    <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors">
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors">
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
                                    <button className="px-3 py-1.5 text-xs flex items-center gap-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                        <Edit2 size={14} />
                                        Editar
                                    </button>
                                    <button className="px-3 py-1.5 text-xs flex items-center gap-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                        Eliminar
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {filteredInventory.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No se encontraron items</p>
                </div>
            )}
        </div>
    );
}
