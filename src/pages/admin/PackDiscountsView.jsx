import React, { useState, useEffect } from 'react';
import {
    Tag, Save, AlertCircle, Loader2, Check, X,
    Calendar, DollarSign, Percent, BadgePercent
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PACKS_DATA } from '../../data/packsData';
import { getPackPrices, savePackPrices } from '../../utils/firestoreMenus';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function PackDiscountsView() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [packPrices, setPackPrices] = useState(null);
    const [editingPack, setEditingPack] = useState(null);
    const [formData, setFormData] = useState({
        descuentoActivo: false,
        tipoDescuento: 'porcentaje', // porcentaje | fijo
        valorDescuento: 0,
        etiquetaTexto: '',
        fechaInicio: '',
        fechaFin: '',
        mostrarEtiqueta: true,
        planesAplicables: ['weekly', 'biweekly'] // Por defecto semanal y quincenal
    });

    useEffect(() => {
        if (editingPack) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [editingPack]);

    // Cargar precios y configuraciones
    const loadData = async () => {
        setLoading(true);
        try {
            const prices = await getPackPrices();
            setPackPrices(prices || {});
        } catch (error) {
            console.error('Error loading pack prices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Combinar datos estáticos con configuraciones de DB
    const getPackConfig = (categoryKey, packName) => {
        if (!packPrices) return {};
        const categoryConfig = packPrices[categoryKey];
        if (!categoryConfig || !categoryConfig.packs) return {};
        return categoryConfig.packs[packName] || {};
    };

    const handleEditClick = (categoryKey, packName, currentConfig) => {
        setEditingPack({ categoryKey, packName });
        setFormData({
            descuentoActivo: currentConfig.descuentoActivo || false,
            tipoDescuento: currentConfig.tipoDescuento || 'porcentaje',
            valorDescuento: currentConfig.valorDescuento || 0,
            etiquetaTexto: currentConfig.etiquetaTexto || '',
            fechaInicio: currentConfig.fechaInicio ? new Date(currentConfig.fechaInicio.toDate ? currentConfig.fechaInicio.toDate() : currentConfig.fechaInicio).toISOString().split('T')[0] : '',
            fechaFin: currentConfig.fechaFin ? new Date(currentConfig.fechaFin.toDate ? currentConfig.fechaFin.toDate() : currentConfig.fechaFin).toISOString().split('T')[0] : '',
            mostrarEtiqueta: currentConfig.mostrarEtiqueta ?? true,
            planesAplicables: currentConfig.planesAplicables || (currentConfig.tipoPlan ? [currentConfig.tipoPlan] : ['weekly', 'biweekly'])
        });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!editingPack) return;

        setSaving(true);
        try {
            const { categoryKey, packName } = editingPack;

            // Preparar objeto de actualización profunda
            const currentCategory = packPrices[categoryKey] || { packs: {} };
            const currentPacks = currentCategory.packs || {};
            const currentPackData = currentPacks[packName] || {};

            const updatedPackData = {
                ...currentPackData,
                ...formData,
                fechaInicio: formData.fechaInicio ? new Date(formData.fechaInicio) : null,
                fechaFin: formData.fechaFin ? new Date(formData.fechaFin) : null,
                valorDescuento: Number(formData.valorDescuento)
            };

            const newPrices = {
                ...packPrices,
                [categoryKey]: {
                    ...currentCategory,
                    packs: {
                        ...currentPacks,
                        [packName]: updatedPackData
                    }
                }
            };

            await savePackPrices(newPrices);
            setPackPrices(newPrices);
            setEditingPack(null);
        } catch (error) {
            console.error('Error saving pack discount:', error);
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

    // Calcular estadísticas
    const totalPacks = Object.values(PACKS_DATA).reduce((sum, cat) => sum + cat.packs.length, 0);
    const activeDiscounts = Object.entries(PACKS_DATA).reduce((count, [catKey, catData]) => {
        return count + catData.packs.filter(pack => {
            const config = getPackConfig(catKey, pack.name);
            return config.descuentoActivo;
        }).length;
    }, 0);

    return (
        <div className="space-y-8">
            {/* Header */}
            <AdminPageHeader
                icon={BadgePercent}
                title="Descuentos de Packs"
                subtitle="Configura descuentos y promociones para los packs de comida"
                gradient="from-yellow-500 via-orange-400 to-red-400"
                stats={[
                    { value: totalPacks, label: 'Total Packs' },
                    { value: activeDiscounts, label: 'Con Descuento' },
                    { value: totalPacks - activeDiscounts, label: 'Sin Descuento' }
                ]}
            />
            {Object.entries(PACKS_DATA).map(([catKey, catData]) => (
                <div key={catKey} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="text-2xl">{catData.icon}</div>
                        <h3 className="text-xl font-bold text-gray-900">{catData.title}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {catData.packs.map((pack) => {
                            const config = getPackConfig(catKey, pack.name);
                            const hasDiscount = config.descuentoActivo;

                            return (
                                <div
                                    key={pack.name}
                                    className={`relative border rounded-xl p-4 transition-all ${hasDiscount
                                        ? 'border-bikitchen-gold bg-bikitchen-gold/5'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    {hasDiscount && (
                                        <div className="absolute -top-2.5 -right-2.5 bg-bikitchen-gold text-gray-900 text-xs font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                            <Tag size={10} />
                                            {config.tipoDescuento === 'porcentaje' ? `${config.valorDescuento}% OFF` : `-${config.valorDescuento}`}
                                        </div>
                                    )}

                                    <div className="flex items-start justify-between mb-2">
                                        <div className="text-2xl">{pack.icon}</div>
                                        <button
                                            onClick={() => handleEditClick(catKey, pack.name, config)}
                                            className="p-1.5 text-gray-500 hover:text-bikitchen-orange hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Configurar descuento"
                                        >
                                            <Tag size={16} />
                                        </button>
                                    </div>

                                    <h4 className="font-bold text-gray-900 text-sm mb-1">{pack.name}</h4>

                                    {hasDiscount ? (
                                        <div className="text-xs space-y-1">
                                            <p className="text-green-600 font-medium">
                                                ✅ Descuento activo
                                            </p>
                                            {config.etiquetaTexto && (
                                                <p className="text-gray-500">Badge: {config.etiquetaTexto}</p>
                                            )}
                                            {config.fechaFin && (
                                                <p className="text-orange-600">
                                                    Vence: {new Date(config.fechaFin.toDate ? config.fechaFin.toDate() : config.fechaFin).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic">Sin descuento configurado</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Modal de Edición */}
            <AnimatePresence>
                {editingPack && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setEditingPack(null)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden"
                        >
                            <div className="bg-gradient-to-r from-bikitchen-orange to-orange-600 p-6 text-white">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Tag size={20} />
                                        Configurar Descuento
                                    </h3>
                                    <button onClick={() => setEditingPack(null)} className="hover:bg-white/20 p-1 rounded-lg">
                                        <X size={20} />
                                    </button>
                                </div>
                                <p className="text-white/80 text-sm mt-1">{editingPack.packName}</p>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo</label>
                                        <div className="flex rounded-lg bg-gray-100 p-1">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipoDescuento: 'porcentaje' })}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.tipoDescuento === 'porcentaje'
                                                    ? 'bg-white shadow text-gray-900'
                                                    : 'text-gray-500'
                                                    }`}
                                            >
                                                %
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, tipoDescuento: 'fijo' })}
                                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${formData.tipoDescuento === 'fijo'
                                                    ? 'bg-white shadow text-gray-900'
                                                    : 'text-gray-500'
                                                    }`}
                                            >
                                                ₡
                                            </button>
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
                                            />
                                            <div className="absolute left-2.5 top-2 text-gray-400">
                                                {formData.tipoDescuento === 'porcentaje' ? <Percent size={14} /> : <DollarSign size={14} />}
                                            </div>
                                        </div>
                                    </div>
                                </div>

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

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="showLabel"
                                        checked={formData.mostrarEtiqueta}
                                        onChange={(e) => setFormData({ ...formData, mostrarEtiqueta: e.target.checked })}
                                        className="rounded border-gray-300 text-bikitchen-orange focus:ring-bikitchen-orange"
                                    />
                                    <label htmlFor="showLabel" className="text-sm text-gray-600">Mostrar etiqueta visual en la card</label>
                                </div>

                                {/* Selección de Planes */}
                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-3">
                                    <label className="block text-xs font-bold text-orange-800 uppercase tracking-wider">Aplicar a planes:</label>
                                    <div className="flex flex-wrap gap-3">
                                        {[
                                            { id: 'weekly', label: 'Semanal' },
                                            { id: 'biweekly', label: 'Quincenal' },
                                            { id: 'monthly', label: 'Mensual' }
                                        ].map(plan => (
                                            <label key={plan.id} className="flex items-center gap-2 cursor-pointer group">
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.planesAplicables.includes(plan.id)}
                                                        onChange={(e) => {
                                                            const planes = e.target.checked
                                                                ? [...formData.planesAplicables, plan.id]
                                                                : formData.planesAplicables.filter(p => p !== plan.id);
                                                            setFormData({ ...formData, planesAplicables: planes });
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-5 h-5 rounded border-2 transition-all ${formData.planesAplicables.includes(plan.id)
                                                        ? 'bg-orange-500 border-orange-500'
                                                        : 'bg-white border-gray-300 group-hover:border-orange-300'
                                                        }`}>
                                                        {formData.planesAplicables.includes(plan.id) && <Check size={14} className="text-white" />}
                                                    </div>
                                                </div>
                                                <span className={`text-sm font-medium ${formData.planesAplicables.includes(plan.id) ? 'text-orange-900' : 'text-gray-600'}`}>
                                                    {plan.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-orange-600 italic mt-2">
                                        ℹ️ El descuento solo se activará cuando el usuario elija alguno de estos planes.
                                    </p>
                                </div>

                                {/* Vista Previa del Badge */}
                                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase mb-3">Vista previa del botón</span>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 w-32 flex flex-col items-center">
                                        <div className="w-full bg-orange-500 text-white py-2 rounded-xl text-center text-xs font-bold mb-2 shadow-sm">
                                            Plan
                                        </div>
                                        <div className="flex justify-center">
                                            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black shadow-md">
                                                {formData.tipoDescuento === 'porcentaje'
                                                    ? `-${formData.valorDescuento}%`
                                                    : `-₡${Math.round(formData.valorDescuento / 1000)}k`}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditingPack(null)}
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
