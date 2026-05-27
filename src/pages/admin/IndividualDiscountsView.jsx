import React, { useState, useEffect } from 'react';
import {
    Tag, Save, Loader2, Check, X,
    DollarSign, Percent, BadgePercent, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { individualesData, INDIVIDUALES_CATEGORIES, CATEGORY_ICONS } from '../../data/individualesData';
import { getIndividualPrices, saveIndividualPrices } from '../../utils/firestoreMenus';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function IndividualDiscountsView() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [individualPrices, setIndividualPrices] = useState({});
    const [editingProduct, setEditingProduct] = useState(null); // { productId, productName }
    const [busqueda, setBusqueda] = useState('');
    const [formData, setFormData] = useState({
        descuentoActivo: false,
        tipoDescuento: 'porcentaje',
        valorDescuento: 0,
        etiquetaTexto: '',
        fechaInicio: '',
        fechaFin: '',
        mostrarEtiqueta: true,
        metodosPermitidos: ['whatsapp', 'sinpe', 'transfer', 'nmi']
    });

    useEffect(() => {
        if (editingProduct) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [editingProduct]);

    const loadData = async () => {
        setLoading(true);
        try {
            const prices = await getIndividualPrices();
            setIndividualPrices(prices || {});
        } catch (error) {
            console.error('Error loading individual prices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const getProductConfig = (productId) => individualPrices[productId] || {};

    const handleEditClick = (product) => {
        const currentConfig = getProductConfig(product.id);
        setEditingProduct({ productId: product.id, productName: product.nombre });
        setFormData({
            descuentoActivo: currentConfig.descuentoActivo || false,
            tipoDescuento: currentConfig.tipoDescuento || 'porcentaje',
            valorDescuento: currentConfig.valorDescuento || 0,
            etiquetaTexto: currentConfig.etiquetaTexto || '',
            fechaInicio: currentConfig.fechaInicio
                ? new Date(currentConfig.fechaInicio.toDate ? currentConfig.fechaInicio.toDate() : currentConfig.fechaInicio).toISOString().split('T')[0]
                : '',
            fechaFin: currentConfig.fechaFin
                ? new Date(currentConfig.fechaFin.toDate ? currentConfig.fechaFin.toDate() : currentConfig.fechaFin).toISOString().split('T')[0]
                : '',
            mostrarEtiqueta: currentConfig.mostrarEtiqueta ?? true,
            metodosPermitidos: currentConfig.metodosPermitidos || ['whatsapp', 'sinpe', 'transfer', 'nmi']
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editingProduct) return;
        setSaving(true);
        try {
            const newPrices = {
                ...individualPrices,
                [editingProduct.productId]: {
                    ...formData,
                    fechaInicio: formData.fechaInicio ? new Date(formData.fechaInicio) : null,
                    fechaFin: formData.fechaFin ? new Date(formData.fechaFin) : null,
                    valorDescuento: Number(formData.valorDescuento)
                }
            };
            await saveIndividualPrices(newPrices);
            setIndividualPrices(newPrices);
            setEditingProduct(null);
        } catch (error) {
            console.error('Error saving individual discount:', error);
            alert('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin text-bikitchen-orange" size={32} />
            </div>
        );
    }

    const totalProductos = individualesData.length;
    const activeDiscounts = individualesData.filter(p => individualPrices[p.id]?.descuentoActivo).length;

    const productosFiltrados = busqueda.trim()
        ? individualesData.filter(p =>
            p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.categoria.toLowerCase().includes(busqueda.toLowerCase())
          )
        : individualesData;

    const productosPorCategoria = INDIVIDUALES_CATEGORIES
        .map(cat => ({ categoria: cat, productos: productosFiltrados.filter(p => p.categoria === cat) }))
        .filter(({ productos }) => productos.length > 0);

    return (
        <div className="space-y-8">
            <AdminPageHeader
                icon={BadgePercent}
                title="Descuentos de Platos Individuales"
                subtitle="Configura descuentos para cada plato individual"
                gradient="from-blue-500 via-purple-400 to-pink-400"
                stats={[
                    { value: totalProductos, label: 'Total Platos' },
                    { value: activeDiscounts, label: 'Con Descuento' },
                    { value: totalProductos - activeDiscounts, label: 'Sin Descuento' }
                ]}
            />

            {/* Búsqueda */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar plato por nombre o categoría..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 bg-white"
                />
            </div>

            {/* Categorías */}
            {productosPorCategoria.map(({ categoria, productos }) => (
                <div key={categoria} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="text-2xl">{CATEGORY_ICONS[categoria] || '📦'}</div>
                        <h3 className="text-xl font-bold text-gray-900">{categoria}</h3>
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            {productos.length} platos
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {productos.map((product) => {
                            const config = getProductConfig(product.id);
                            const hasDiscount = config.descuentoActivo;
                            const precioBase = product.precio500 || product.precio1kg;

                            return (
                                <div
                                    key={product.id}
                                    className={`relative border rounded-xl p-4 transition-all ${hasDiscount
                                        ? 'border-bikitchen-gold bg-bikitchen-gold/5'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    {hasDiscount && (
                                        <div className="absolute -top-2.5 -right-2.5 bg-bikitchen-gold text-gray-900 text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                            <Tag size={10} />
                                            {config.tipoDescuento === 'porcentaje'
                                                ? `${config.valorDescuento}% OFF`
                                                : `-₡${Number(config.valorDescuento).toLocaleString('es-CR')}`}
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between mb-2">
                                        <div className="text-lg">{CATEGORY_ICONS[product.categoria] || '🍽️'}</div>
                                        <button
                                            onClick={() => handleEditClick(product)}
                                            className="p-1.5 text-gray-500 hover:text-bikitchen-orange hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Configurar descuento"
                                        >
                                            <Tag size={16} />
                                        </button>
                                    </div>

                                    <h4 className="font-bold text-gray-900 text-xs mb-1 line-clamp-2 leading-tight">
                                        {product.nombre}
                                    </h4>
                                    {precioBase && (
                                        <p className="text-xs text-gray-400 font-mono">
                                            Desde ₡{precioBase.toLocaleString('es-CR')}
                                        </p>
                                    )}

                                    {hasDiscount ? (
                                        <div className="text-xs space-y-0.5 mt-1.5">
                                            <p className="text-green-600 font-medium">✅ Descuento activo</p>
                                            {config.etiquetaTexto && (
                                                <p className="text-gray-500 truncate">"{config.etiquetaTexto}"</p>
                                            )}
                                            {config.fechaFin && (
                                                <p className="text-orange-500 text-[10px]">
                                                    Vence: {new Date(config.fechaFin.toDate ? config.fechaFin.toDate() : config.fechaFin).toLocaleDateString('es-CR')}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic mt-1.5">Sin descuento</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {productosPorCategoria.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                    <p className="text-gray-400">No se encontraron platos para "{busqueda}"</p>
                </div>
            )}

            {/* Modal de Edición */}
            <AnimatePresence>
                {editingProduct && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setEditingProduct(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
                        >
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Tag size={20} />
                                        Configurar Descuento
                                    </h3>
                                    <button onClick={() => setEditingProduct(null)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                                <p className="text-white/80 text-sm mt-1 line-clamp-2">{editingProduct.productName}</p>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
                                {/* Toggle Activo */}
                                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl">
                                    <span className="font-medium text-gray-700">Activar Descuento</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={formData.descuentoActivo}
                                            onChange={(e) => setFormData({ ...formData, descuentoActivo: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bikitchen-orange/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bikitchen-orange"></div>
                                    </label>
                                </div>

                                {/* Tipo y Valor */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                                        <div className="flex rounded-lg bg-gray-100 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipoDescuento: 'porcentaje' })}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.tipoDescuento === 'porcentaje' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                                            >%</button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipoDescuento: 'fijo' })}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.tipoDescuento === 'fijo' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
                                            >₡</button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={formData.valorDescuento}
                                                onChange={(e) => setFormData({ ...formData, valorDescuento: e.target.value })}
                                                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                                                placeholder="0"
                                                min="0"
                                            />
                                            <div className="absolute left-2.5 top-2 text-gray-400">
                                                {formData.tipoDescuento === 'porcentaje' ? <Percent size={14} /> : <DollarSign size={14} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Etiqueta */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Texto del Badge</label>
                                    <input
                                        type="text"
                                        value={formData.etiquetaTexto}
                                        onChange={(e) => setFormData({ ...formData, etiquetaTexto: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                                        placeholder="Ej: 🔥 20% OFF"
                                    />
                                </div>

                                {/* Fechas */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Inicio</label>
                                        <input
                                            type="date"
                                            value={formData.fechaInicio}
                                            onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fin</label>
                                        <input
                                            type="date"
                                            value={formData.fechaFin}
                                            onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Mostrar etiqueta */}
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="showLabelInd"
                                        checked={formData.mostrarEtiqueta}
                                        onChange={(e) => setFormData({ ...formData, mostrarEtiqueta: e.target.checked })}
                                        className="rounded border-gray-300 text-bikitchen-orange focus:ring-bikitchen-orange"
                                    />
                                    <label htmlFor="showLabelInd" className="text-sm text-gray-600">
                                        Mostrar etiqueta visual en la card
                                    </label>
                                </div>

                                {/* Métodos de pago permitidos */}
                                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-3">
                                    <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider">
                                        Válido con métodos de pago:
                                    </label>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { id: 'whatsapp', label: 'WhatsApp' },
                                            { id: 'sinpe', label: 'SINPE' },
                                            { id: 'transfer', label: 'Transferencia' },
                                            { id: 'nmi', label: 'Tarjeta' }
                                        ].map(metodo => (
                                            <label key={metodo.id} className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.metodosPermitidos.includes(metodo.id)}
                                                        onChange={(e) => {
                                                            const metodos = e.target.checked
                                                                ? [...formData.metodosPermitidos, metodo.id]
                                                                : formData.metodosPermitidos.filter(m => m !== metodo.id);
                                                            setFormData({ ...formData, metodosPermitidos: metodos });
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${formData.metodosPermitidos.includes(metodo.id)
                                                        ? 'bg-blue-500 border-blue-500'
                                                        : 'bg-white border-gray-300 group-hover:border-blue-300'
                                                        }`}>
                                                        {formData.metodosPermitidos.includes(metodo.id) && <Check size={14} className="text-white" />}
                                                    </div>
                                                </div>
                                                <span className={`text-sm font-medium ${formData.metodosPermitidos.includes(metodo.id) ? 'text-blue-900' : 'text-gray-600'}`}>
                                                    {metodo.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-blue-600 italic">
                                        ℹ️ El descuento solo aplica si el cliente elige uno de estos métodos de pago.
                                    </p>
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingProduct(null)}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 px-4 py-2 bg-bikitchen-orange text-white rounded-xl text-sm font-bold hover:bg-bikitchen-orange-dark transition-colors flex items-center justify-center gap-2"
                                    >
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                        Guardar
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
