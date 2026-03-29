import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Gift, Plus, Edit2, Trash2, Eye, EyeOff, Calendar,
    Image, Tag, Home, Check, X, Search, AlertCircle,
    Clock, Package, Sparkles, RefreshCw, Upload, Loader2, Megaphone
} from 'lucide-react';
import {
    getAllPromotions,
    createPromotion,
    updatePromotion,
    deletePromotion,
    togglePromotionStatus,
    getPromotionStats,
    checkExpiredPromotions
} from '../../utils/firestorePromotions';
import { uploadOptimizedImage } from '../../services/cloudinaryService';
import PackDiscountsView from './PackDiscountsView';
import { PACKS_DATA } from '../../data/packsData';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

// Estructura de packs con precios organizados por categorías
const PACKS_CON_PRECIOS = {
    regulares: {
        titulo: '📦 Packs Regulares',
        descripcion: 'Menús semanales estándar',
        packs: [
            { name: 'Pack Sin Carbos', icon: '🥩', desc: '120g proteína + 3 vegetales', weekly: 24500, monthly: 89900 },
            { name: 'Pack Bajo Calorías', icon: '🥗', desc: '120g proteína + 2 veg + 1 carbo', weekly: 25850, monthly: 99500 },
            { name: 'Pack Regular', icon: '🍱', desc: '100g proteína + 1 veg + 2 carbos', weekly: 27850, monthly: 111400 },
            { name: 'Pack Casaditos', icon: '🍚', desc: 'Estilo tradicional', weekly: 27850, monthly: 111400 },
            { name: 'Full Pack', icon: '🍽️', desc: '150g proteína + 3 carbos + 2 veg', weekly: 33900, monthly: 135600 },
            { name: 'Pack Keto', icon: '🥑', desc: '200g proteína + 3 vegetales', weekly: 33900, monthly: 135600 },
            { name: 'Pack Vegetariano', icon: '🥦', desc: 'Proteína vegetal + 2 veg + 2 carbos', weekly: 27850, monthly: 111400 }
        ]
    },
    especiales: {
        titulo: '⭐ Packs Especiales',
        descripcion: 'Opciones premium y familiares',
        packs: [
            { name: 'Pack 3 Proteínas', icon: '🍗', desc: '3 proteínas de 250g c/u', weekly: 25850, monthly: 103300 },
            { name: 'Pack 5 Proteínas', icon: '🥩', desc: '5 proteínas de 250g c/u', weekly: 39950, monthly: 158900 },
            { name: 'Pack Familiar Premium', icon: '👨‍👩‍👧‍👦', desc: 'Porciones grandes (4 porc)', weekly: 41500, monthly: 166000 },
            { name: 'Pack Familiar Deluxe', icon: '✨', desc: 'Porciones completas (4 porc)', weekly: 47500, monthly: 190000 }
        ]
    }
};

// Lista plana de todos los packs para compatibilidad
const PACKS_DISPONIBLES = [
    ...PACKS_CON_PRECIOS.regulares.packs.map(p => p.name),
    ...PACKS_CON_PRECIOS.especiales.packs.map(p => p.name)
];

const PromotionModal = ({ isOpen, onClose, promotion, onSave }) => {
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        descripcionCorta: '',
        fechaInicio: '',
        fechaFin: '',
        imagenURL: '',
        packsRelacionados: [],
        mostrarEnHome: false,
        activa: true,
        beneficios: [],
        precios: [],
        tipoPromocion: 'pack',
        etiquetaColor: '',
        prioridadDestacado: 10,
        precio: 0, // Precio de la promoción en colones
        precioRegular: 0, // Precio sin descuento
        // Nuevos campos para facilitar la creación
        descuentoEnvio: 50, // Porcentaje de descuento en envío (0, 10, 50, 100)
        planesAplicables: ['mensual'], // semanal, quincenal, mensual
        composicionPlato: {
            proteinas: 90, // gramos
            vegetales: 2, // cantidad
            vegetalesCocidos: false, // si los vegetales son cocidos
            carbohidrato: 1 // cantidad (0 si no lleva)
        }
    });
    const [newBeneficio, setNewBeneficio] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Subir imagen a Cloudinary
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona una imagen válida');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen es muy grande. Máximo 5MB');
            return;
        }

        setUploadingImage(true);
        try {
            const result = await uploadOptimizedImage(file, 'bikitchen/promociones', {
                maxSize: 1280
            });
            setFormData(prev => ({ ...prev, imagenURL: result.url, cloudinaryPublicId: result.publicId }));
        } catch (error) {
            console.error('Error uploading image:', error);
            alert(`Error al subir la imagen: ${error.message}`);
        } finally {
            setUploadingImage(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (promotion) {
            setFormData({
                titulo: promotion.titulo || '',
                descripcion: promotion.descripcion || '',
                descripcionCorta: promotion.descripcionCorta || '',
                fechaInicio: promotion.fechaInicio ? new Date(promotion.fechaInicio).toISOString().split('T')[0] : '',
                fechaFin: promotion.fechaFin ? new Date(promotion.fechaFin).toISOString().split('T')[0] : '',
                imagenURL: promotion.imagenURL || '',
                packsRelacionados: promotion.packsRelacionados || [],
                mostrarEnHome: promotion.mostrarEnHome || false,
                activa: promotion.activa ?? true,
                beneficios: promotion.beneficios || [],
                precios: promotion.precios || [],
                tipoPromocion: promotion.tipoPromocion || 'pack',
                etiquetaColor: promotion.etiquetaColor || '',
                prioridadDestacado: promotion.prioridadDestacado || 10,
                precio: promotion.precio || 0,
                precioRegular: promotion.precioRegular || 0,
                descuentoEnvio: promotion.descuentoEnvio || 50,
                planesAplicables: promotion.planesAplicables || (promotion.tipoPlan ? [promotion.tipoPlan] : ['mensual']),
                composicionPlato: promotion.composicionPlato || {
                    proteinas: 90,
                    vegetales: 2,
                    vegetalesCocidos: false,
                    carbohidrato: 1
                }
            });
        } else {
            setFormData({
                titulo: '',
                descripcion: '',
                descripcionCorta: '',
                fechaInicio: '',
                fechaFin: '',
                imagenURL: '',
                packsRelacionados: [],
                mostrarEnHome: false,
                activa: true,
                beneficios: [],
                precios: [],
                tipoPromocion: 'pack',
                etiquetaColor: '',
                precio: 0,
                precioRegular: 0,
                descuentoEnvio: 50,
                planesAplicables: ['mensual'],
                composicionPlato: {
                    proteinas: 90,
                    vegetales: 2,
                    vegetalesCocidos: false,
                    carbohidrato: 1
                }
            });
        }
    }, [promotion, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving promotion:', error);
        } finally {
            setSaving(false);
        }
    };

    const togglePack = (pack) => {
        setFormData(prev => ({
            ...prev,
            packsRelacionados: prev.packsRelacionados.includes(pack)
                ? prev.packsRelacionados.filter(p => p !== pack)
                : [...prev.packsRelacionados, pack]
        }));
    };

    const addBeneficio = () => {
        if (newBeneficio.trim()) {
            setFormData(prev => ({
                ...prev,
                beneficios: [...prev.beneficios, newBeneficio.trim()]
            }));
            setNewBeneficio('');
        }
    };

    const removeBeneficio = (index) => {
        setFormData(prev => ({
            ...prev,
            beneficios: prev.beneficios.filter((_, i) => i !== index)
        }));
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-bikitchen-orange to-orange-500 text-white p-6">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Gift size={22} />
                            </div>
                            <h2 className="text-xl font-bold">
                                {promotion ? 'Editar Promoción' : '✨ Crear Nueva Promoción'}
                            </h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <p className="text-white/80 text-sm">
                        {promotion
                            ? 'Modifica los datos de la promoción existente'
                            : 'Completa los campos para crear una promoción que aparecerá en el sitio web'}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <div className="space-y-6">

                        {/* Sección: Información básica */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Tag size={16} className="text-bikitchen-orange" />
                                Información básica
                            </h3>

                            {/* Título */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Título de la promoción <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.titulo}
                                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent transition-all text-lg"
                                    placeholder="Ej: 🎉 Promoción Mensual con Desayunos Gratis"
                                    required
                                />
                                <p className="text-xs text-gray-500 mt-1">Tip: Usa emojis para hacerlo más llamativo 🎁</p>
                            </div>

                            {/* Descripción corta */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Descripción corta (para cards)
                                </label>
                                <input
                                    type="text"
                                    value={formData.descripcionCorta}
                                    onChange={(e) => setFormData({ ...formData, descripcionCorta: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent transition-all"
                                    placeholder="Ej: ¡Te regalamos los desayunos del mes!"
                                />
                            </div>

                            {/* Descripción completa */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Descripción completa
                                </label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent transition-all resize-none"
                                    placeholder="Descripción detallada de la promoción..."
                                />
                            </div>
                        </div>

                        {/* Sección: Detalles de la Promoción (NUEVO - Simple para Gina) */}
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 space-y-4 border-2 border-orange-200">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Package size={16} className="text-bikitchen-orange" />
                                📦 Detalles de la Promoción
                            </h3>
                            <p className="text-xs text-gray-600 -mt-2">Configura los beneficios y características del pack promocional</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Planes Aplicables (Checkboxes) */}
                                <div className="bg-white rounded-lg p-3 border border-orange-100">
                                    <label className="block text-sm font-bold text-gray-800 mb-2">
                                        📅 Planes Aplicables
                                    </label>
                                    <div className="flex flex-wrap gap-3 py-1">
                                        {[
                                            { id: 'semanal', label: 'Semanal' },
                                            { id: 'quincenal', label: 'Quincenal' },
                                            { id: 'mensual', label: 'Mensual' }
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
                                                        ? 'bg-bikitchen-orange border-bikitchen-orange'
                                                        : 'bg-white border-gray-300 group-hover:border-bikitchen-orange/30'
                                                        }`}>
                                                        {formData.planesAplicables.includes(plan.id) && <Check size={14} className="text-white" />}
                                                    </div>
                                                </div>
                                                <span className={`text-sm font-medium ${formData.planesAplicables.includes(plan.id) ? 'text-gray-900' : 'text-gray-500'}`}>
                                                    {plan.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Descuento de Envío */}
                                <div className="bg-white rounded-lg p-3 border border-orange-100">
                                    <label className="block text-sm font-bold text-gray-800 mb-2">
                                        🚚 Descuento en Envío
                                    </label>
                                    <select
                                        value={formData.descuentoEnvio}
                                        onChange={(e) => setFormData({ ...formData, descuentoEnvio: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-bikitchen-orange font-medium"
                                    >
                                        <option value="0">Sin descuento (0%)</option>
                                        <option value="10">10% de descuento</option>
                                        <option value="50">50% de descuento</option>
                                        <option value="100">Envío GRATIS (100%)</option>
                                    </select>
                                </div>

                                {/* Precio de la Promoción */}
                                <div className="bg-white rounded-lg p-3 border border-orange-100">
                                    <label className="block text-sm font-bold text-gray-800 mb-2">
                                        💰 Precio de la Promoción
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.precio}
                                        onChange={(e) => setFormData({ ...formData, precio: parseInt(e.target.value) || 0 })}
                                        placeholder="75000"
                                        className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-bikitchen-orange font-medium"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Precio con el descuento aplicado</p>
                                </div>

                                {/* Precio Regular */}
                                <div className="bg-white rounded-lg p-3 border border-orange-100">
                                    <label className="block text-sm font-bold text-gray-800 mb-2">
                                        🏷️ Precio Regular
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.precioRegular}
                                        onChange={(e) => setFormData({ ...formData, precioRegular: parseInt(e.target.value) || 0 })}
                                        placeholder="98000"
                                        className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-bikitchen-orange font-medium"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Precio original sin oferta</p>
                                </div>

                                {/* Vista Previa del Badge */}
                                <div className="md:col-span-2 bg-orange-100/30 rounded-lg p-3 border-2 border-dashed border-orange-200 flex items-center justify-between">
                                    <div className="space-y-1">
                                        <label className="block text-xs font-bold text-orange-800 uppercase">Vista previa del descuento</label>
                                        <p className="text-[10px] text-gray-500">Así se verá el porcentaje en los botones de la web</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {formData.planesAplicables.map(planId => {
                                            const label = planId === 'semanal' ? 'Sem' : (planId === 'quincenal' ? 'Quin' : 'Men');

                                            // Lógica mejorada: usar precio de formulario o el primer pack de la lista
                                            let pPromo = formData.precio || 0;
                                            let pRegular = formData.precioRegular || 0;

                                            if (pPromo === 0 && formData.precios && formData.precios.length > 0) {
                                                const firstPack = formData.precios[0];
                                                pPromo = firstPack.precio || 0;
                                                pRegular = firstPack.precioRegular || pPromo; // Evitar división por cero
                                            }

                                            const hasSpecial = pPromo > 0 && pRegular > pPromo;
                                            const percent = hasSpecial ? Math.round((1 - pPromo / pRegular) * 100) : null;

                                            return (
                                                <div key={planId} className="bg-white p-2 rounded-xl shadow-sm border border-orange-100 flex flex-col items-center min-w-[75px] transition-all">
                                                    <span className="text-[8px] font-bold text-gray-400 mb-1">{label}</span>
                                                    <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-[9px] font-black shadow-sm transition-colors ${percent ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-400'}`}>
                                                        {percent ? (
                                                            <>
                                                                <span className="leading-none text-[10px]">🔥 {percent}%</span>
                                                                <span className="text-[6px] uppercase mt-0.5">OFF</span>
                                                            </>
                                                        ) : (
                                                            <Sparkles size={14} className="opacity-40" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {formData.planesAplicables.length === 0 && (
                                            <p className="text-xs text-orange-400 italic">Selecciona un plan para ver la previa</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-orange-100">
                                <label className="block text-sm font-bold text-gray-800 mb-1">
                                    🍽️ Composición del Plato
                                </label>
                                <p className="text-xs text-gray-500 mb-3">
                                    ℹ️ Esto es solo para describir la promoción. No modifica los packs reales.
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Proteínas */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            Proteína (gramos)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="10"
                                            value={formData.composicionPlato.proteinas}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                composicionPlato: {
                                                    ...formData.composicionPlato,
                                                    proteinas: parseInt(e.target.value) || 0
                                                }
                                            })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange font-medium text-center"
                                            placeholder="90"
                                        />
                                        <p className="text-xs text-gray-500 mt-1 text-center">Ej: 90g, 120g</p>
                                    </div>

                                    {/* Vegetales */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            Vegetales (cantidad)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="5"
                                            value={formData.composicionPlato.vegetales}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                composicionPlato: {
                                                    ...formData.composicionPlato,
                                                    vegetales: parseInt(e.target.value) || 0
                                                }
                                            })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange font-medium text-center"
                                            placeholder="2"
                                        />
                                        <p className="text-xs text-gray-500 mt-1 text-center">Ej: 1, 2, 3</p>
                                    </div>

                                    {/* Carbohidratos */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1.5">
                                            Carbohidratos
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="2"
                                            value={formData.composicionPlato.carbohidrato}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                composicionPlato: {
                                                    ...formData.composicionPlato,
                                                    carbohidrato: parseInt(e.target.value) || 0
                                                }
                                            })}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange font-medium text-center"
                                            placeholder="1"
                                        />
                                        <p className="text-xs text-gray-500 mt-1 text-center">0 = sin carbos</p>
                                    </div>
                                </div>

                                {/* Vegetales Cocidos */}
                                <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-lg p-3">
                                    <input
                                        type="checkbox"
                                        id="vegetalesCocidos"
                                        checked={formData.composicionPlato.vegetalesCocidos}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            composicionPlato: {
                                                ...formData.composicionPlato,
                                                vegetalesCocidos: e.target.checked
                                            }
                                        })}
                                        className="w-5 h-5 text-bikitchen-orange focus:ring-bikitchen-orange border-gray-300 rounded"
                                    />
                                    <label htmlFor="vegetalesCocidos" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        Los vegetales son cocidos (no crudos)
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Configuración Avanzada */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Sparkles size={16} className="text-bikitchen-orange" />
                                Configuración de Visualización
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Tipo de Promoción */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Tipo
                                    </label>
                                    <select
                                        value={formData.tipoPromocion}
                                        onChange={(e) => setFormData({ ...formData, tipoPromocion: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange"
                                    >
                                        <option value="pack">Pack Regular</option>
                                        <option value="menú">Menú Especial</option>
                                        <option value="descuento">Descuento</option>
                                        <option value="temporada">Temporada</option>
                                    </select>
                                </div>

                                {/* Prioridad */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Prioridad (1 es mayor)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="99"
                                        value={formData.prioridadDestacado}
                                        onChange={(e) => setFormData({ ...formData, prioridadDestacado: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange"
                                    />
                                </div>

                                {/* Color Etiqueta */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Color Etiqueta (Hex)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={formData.etiquetaColor || '#FFA94D'}
                                            onChange={(e) => setFormData({ ...formData, etiquetaColor: e.target.value })}
                                            className="h-10 w-10 rounded cursor-pointer border-0"
                                        />
                                        <input
                                            type="text"
                                            value={formData.etiquetaColor}
                                            onChange={(e) => setFormData({ ...formData, etiquetaColor: e.target.value })}
                                            placeholder="#FFA94D"
                                            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Fechas y Vigencia */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Calendar size={16} className="text-bikitchen-orange" />
                                Fechas y Vigencia
                            </h3>

                            {/* Fechas */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Fecha de inicio
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.fechaInicio}
                                        onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <Clock size={14} className="inline mr-1" />
                                        Fecha de fin
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.fechaFin}
                                        onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Imagen */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Image size={16} className="text-bikitchen-orange" />
                                Imagen de la promoción
                            </h3>

                            {/* Botón para subir imagen */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className="flex-1 cursor-pointer">
                                    <div className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl transition-all ${uploadingImage
                                        ? 'border-bikitchen-orange bg-bikitchen-orange/10'
                                        : 'border-gray-300 hover:border-bikitchen-orange hover:bg-bikitchen-orange/5'
                                        }`}>
                                        {uploadingImage ? (
                                            <>
                                                <Loader2 size={20} className="animate-spin text-bikitchen-orange" />
                                                <span className="text-bikitchen-orange font-medium">Subiendo...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Upload size={20} className="text-gray-500" />
                                                <span className="text-gray-600 font-medium">
                                                    Subir imagen desde tu computadora
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={uploadingImage}
                                    />
                                </label>
                            </div>

                            {/* O pegar URL */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-gray-200"></div>
                                <span className="text-xs text-gray-500">o pegar URL</span>
                                <div className="flex-1 h-px bg-gray-200"></div>
                            </div>

                            <input
                                type="url"
                                value={formData.imagenURL}
                                onChange={(e) => setFormData({ ...formData, imagenURL: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent transition-all"
                                placeholder="https://ejemplo.com/imagen.jpg"
                            />

                            {/* Preview */}
                            {formData.imagenURL && (
                                <div className="relative rounded-xl overflow-hidden h-40 bg-gray-100">
                                    <img
                                        src={formData.imagenURL}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, imagenURL: '' })}
                                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Packs relacionados - MEJORADO con precios y categorías */}
                        <div className="bg-gray-50 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-800">
                                        <Package size={16} className="inline mr-1" />
                                        Packs Incluidos en la Promoción
                                    </label>
                                    <p className="text-xs text-gray-500 mt-1">Selecciona los packs que tendrán esta promoción</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const packsRegulares = PACKS_CON_PRECIOS.regulares.packs.map(p => p.name);
                                            setFormData({ ...formData, packsRelacionados: packsRegulares });
                                        }}
                                        className="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors"
                                    >
                                        ✓ Todos regulares (7)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const packsEspeciales = PACKS_CON_PRECIOS.especiales.packs.map(p => p.name);
                                            setFormData({ ...formData, packsRelacionados: packsEspeciales });
                                        }}
                                        className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                        ✓ Todos especiales (4)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, packsRelacionados: [] })}
                                        className="px-3 py-1.5 bg-gray-400 text-white text-xs font-medium rounded-lg hover:bg-gray-500 transition-colors"
                                    >
                                        ✕ Limpiar
                                    </button>
                                </div>
                            </div>

                            {/* Packs Regulares */}
                            <div className="mb-4">
                                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    {PACKS_CON_PRECIOS.regulares.titulo}
                                    <span className="text-xs font-normal text-gray-500">({PACKS_CON_PRECIOS.regulares.descripcion})</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {PACKS_CON_PRECIOS.regulares.packs.map((pack) => {
                                        const isSelected = formData.packsRelacionados.includes(pack.name);
                                        return (
                                            <button
                                                key={pack.name}
                                                type="button"
                                                onClick={() => togglePack(pack.name)}
                                                className={`p-3 rounded-lg border-2 text-left transition-all ${isSelected
                                                    ? 'border-bikitchen-orange bg-orange-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{pack.icon}</span>
                                                        <span className={`text-sm font-bold ${isSelected ? 'text-bikitchen-orange' : 'text-gray-800'}`}>
                                                            {pack.name}
                                                        </span>
                                                    </div>
                                                    {isSelected && <Check size={16} className="text-bikitchen-orange flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-600 mb-2">{pack.desc}</p>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-semibold text-gray-700">₡{pack.weekly.toLocaleString()}/sem</span>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="font-semibold text-gray-700">₡{pack.monthly.toLocaleString()}/mes</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Packs Especiales */}
                            <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                    {PACKS_CON_PRECIOS.especiales.titulo}
                                    <span className="text-xs font-normal text-gray-500">({PACKS_CON_PRECIOS.especiales.descripcion})</span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {PACKS_CON_PRECIOS.especiales.packs.map((pack) => {
                                        const isSelected = formData.packsRelacionados.includes(pack.name);
                                        return (
                                            <button
                                                key={pack.name}
                                                type="button"
                                                onClick={() => togglePack(pack.name)}
                                                className={`p-3 rounded-lg border-2 text-left transition-all ${isSelected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xl">{pack.icon}</span>
                                                        <span className={`text-sm font-bold ${isSelected ? 'text-blue-600' : 'text-gray-800'}`}>
                                                            {pack.name}
                                                        </span>
                                                    </div>
                                                    {isSelected && <Check size={16} className="text-blue-600 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-600 mb-2">{pack.desc}</p>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="font-semibold text-gray-700">₡{pack.weekly.toLocaleString()}/sem</span>
                                                    <span className="text-gray-400">•</span>
                                                    <span className="font-semibold text-gray-700">₡{pack.monthly.toLocaleString()}/mes</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Beneficios - Explicación clara */}
                        <div className="bg-bikitchen-gold/10 rounded-xl p-4 space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <Sparkles size={16} className="text-bikitchen-gold" />
                                    Beneficios de la promoción
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    Lista los beneficios que el cliente obtiene con esta promoción. Aparecerán en la página de promociones.
                                </p>
                            </div>

                            {/* Input para agregar */}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newBeneficio}
                                    onChange={(e) => setNewBeneficio(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addBeneficio())}
                                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent transition-all"
                                    placeholder="Ej: Desayunos GRATIS incluidos"
                                />
                                <button
                                    type="button"
                                    onClick={addBeneficio}
                                    className="px-5 py-3 bg-bikitchen-gold text-gray-900 rounded-xl font-bold hover:bg-amber-400 transition-colors flex items-center gap-2"
                                >
                                    <Plus size={18} />
                                    Agregar
                                </button>
                            </div>

                            {/* Lista de beneficios */}
                            {formData.beneficios.length > 0 ? (
                                <div className="space-y-2">
                                    {formData.beneficios.map((beneficio, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-100">
                                            <div className="w-6 h-6 bg-bikitchen-orange/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                <Check size={14} className="text-bikitchen-orange" />
                                            </div>
                                            <span className="flex-1 text-gray-700">{beneficio}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeBeneficio(idx)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-gray-400 text-sm">
                                    No hay beneficios agregados. Agrega al menos uno para que aparezca en la promoción.
                                </div>
                            )}
                        </div>

                        {/* Toggles */}
                        <div className="flex flex-wrap gap-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className={`w-12 h-6 rounded-full transition-colors ${formData.activa ? 'bg-bikitchen-orange' : 'bg-gray-300'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${formData.activa ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'}`}></div>
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                    Promoción activa
                                </span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, activa: !formData.activa })}
                                className="sr-only"
                            />

                            <label className="flex items-center gap-3 cursor-pointer" onClick={() => setFormData({ ...formData, mostrarEnHome: !formData.mostrarEnHome })}>
                                <div className={`w-12 h-6 rounded-full transition-colors ${formData.mostrarEnHome ? 'bg-bikitchen-gold' : 'bg-gray-300'}`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform mt-0.5 ${formData.mostrarEnHome ? 'translate-x-6 ml-0.5' : 'translate-x-0.5'}`}></div>
                                </div>
                                <span className="text-sm font-medium text-gray-700">
                                    <Home size={14} className="inline mr-1" />
                                    Mostrar en Home
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !formData.titulo}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-bikitchen-orange to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw size={18} className="animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Check size={18} />
                                    {promotion ? 'Actualizar' : 'Crear Promoción'}
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </motion.div>
        </motion.div >
    );
};

export default function PromotionsView() {
    const [activeTab, setActiveTab] = useState('promotions'); // promotions | packs
    const [promotions, setPromotions] = useState([]);
    const [stats, setStats] = useState({ total: 0, activas: 0, inactivas: 0, enHome: 0 });
    const [loading, setLoading] = useState(true);
    const [initializing, setInitializing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const loadData = async () => {
        setLoading(true);
        try {
            await checkExpiredPromotions(); // Auto-desactivar expiradas
            const [promos, statsData] = await Promise.all([
                getAllPromotions(),
                getPromotionStats()
            ]);
            setPromotions(promos);
            setStats(statsData);
        } catch (error) {
            console.error('Error loading promotions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInitializePromotions = async () => {
        setInitializing(true);
        try {
            // 1. Eliminar "Pack Navideño con Postre de Regalo" antiguo si existe
            const allPromos = await getAllPromotions();
            const oldChristmasPromo = allPromos.find(p => p.titulo === '🎄 Pack Navideño con Postre de Regalo');

            if (oldChristmasPromo) {
                console.log('Eliminando promoción antigua:', oldChristmasPromo.titulo);
                await deletePromotion(oldChristmasPromo.id);
            }

            // 2. Crear las nuevas promociones activas
            const promocionesActivas = [
                {
                    titulo: '🎄 Menú Navideño Tradicional',
                    descripcion: 'Disfrutá la temporada con nuestros menús navideños llenos de sabor casero BiKitchen ❤️ Disponible durante diciembre.',
                    descripcionCorta: 'Pierna de cerdo en salsa de ciruelas',
                    imagenURL: 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                    fechaInicio: new Date().toISOString().split('T')[0],
                    fechaFin: '2024-12-31',
                    packsRelacionados: [],
                    beneficios: ['Disponible solo en diciembre', 'Incluye postre navideño', 'Presentación especial'],
                    mostrarEnHome: true,
                    activa: true,
                    tipoPromocion: 'menú',
                    etiquetaColor: '#FFA94D',
                    prioridadDestacado: 1
                },
                {
                    titulo: '🎄 Menú Navideño Especial',
                    descripcion: 'Disfrutá la temporada con nuestros menús navideños llenos de sabor casero BiKitchen ❤️ Disponible durante diciembre.',
                    descripcionCorta: 'Pollo relleno con salsa de hongos',
                    imagenURL: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                    fechaInicio: new Date().toISOString().split('T')[0],
                    fechaFin: '2024-12-31',
                    packsRelacionados: [],
                    beneficios: ['Disponible solo en diciembre', 'Incluye postre navideño', 'Presentación especial'],
                    mostrarEnHome: true,
                    activa: true,
                    tipoPromocion: 'menú',
                    etiquetaColor: '#FFA94D',
                    prioridadDestacado: 2
                },
                {
                    titulo: '🎉 Promoción Mensual con Desayunos Gratis',
                    descripcion: 'Despreocupate de tus almuerzos de todo el mes — ¡te regalamos los desayunos! 🌞',
                    descripcionCorta: '¡Te regalamos los desayunos del mes!',
                    imagenURL: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                    fechaInicio: new Date().toISOString().split('T')[0],
                    fechaFin: '2025-12-31',
                    packsRelacionados: ['Pack Sin Carbos', 'Pack Bajo Calorías', 'Pack Regular', 'Pack Casaditos', 'Pack Vegetariano', 'Full Pack'],
                    beneficios: [
                        'Desayunos GRATIS incluidos',
                        'Envío con descuento del 10%',
                        'Ahorro equivalente a ₡52.000'
                    ],
                    precios: [
                        { nombre: 'Pack Sin Carbos', precio: 89900, precioRegular: 98000 },
                        { nombre: 'Pack Bajo Calorías', precio: 99500, precioRegular: 103400 },
                        { nombre: 'Pack Regular', precio: 111400, precioRegular: 111400 },
                        { nombre: 'Pack Casaditos', precio: 111400, precioRegular: 111400 },
                        { nombre: 'Full Pack', precio: 135600, precioRegular: 135600 }
                    ],
                    mostrarEnHome: true,
                    activa: true,
                    tipoPromocion: 'descuento',
                    etiquetaColor: '#FFA94D',
                    prioridadDestacado: 3
                },
                {
                    titulo: '❤️ Two Pack (para parejas o amigos)',
                    descripcion: 'Nuestro Two Pack incluye 5 almuerzos por persona, ideal para compartir entre pareja, amigos o familiares.',
                    descripcionCorta: 'Pack especial para compartir',
                    imagenURL: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                    fechaInicio: new Date().toISOString().split('T')[0],
                    fechaFin: '',
                    packsRelacionados: ['Two Pack'],
                    beneficios: [
                        'Ideal para compartir',
                        'Precios iguales al Pack Semanal',
                        'Hasta 2 cambios sin costo'
                    ],
                    mostrarEnHome: false,
                    activa: true,
                    tipoPromocion: 'pack',
                    prioridadDestacado: 10
                }
            ];

            // Crear o actualizar las nuevas
            for (const promo of promocionesActivas) {
                // Verificar si ya existe una con el mismo título para no duplicar
                const existing = allPromos.find(p => p.titulo === promo.titulo);
                if (existing) {
                    await updatePromotion(existing.id, promo);
                } else {
                    await createPromotion(promo);
                }
            }

            await loadData();
            alert('Promociones actualizadas correctamente');
        } catch (error) {
            console.error('Error initializing promotions:', error);
            alert('Error al cargar promociones. Revisa la consola.');
        } finally {
            setInitializing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleSave = async (formData) => {
        if (editingPromotion) {
            await updatePromotion(editingPromotion.id, formData);
        } else {
            await createPromotion(formData);
        }
        await loadData();
        setEditingPromotion(null);
    };

    const handleToggleStatus = async (promo) => {
        await togglePromotionStatus(promo.id, promo.activa);
        await loadData();
    };

    const handleDelete = async (id) => {
        await deletePromotion(id);
        setDeleteConfirm(null);
        await loadData();
    };

    const filteredPromotions = promotions.filter(promo =>
        promo.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        promo.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatDate = (date) => {
        if (!date) return '—';
        return new Date(date).toLocaleDateString('es-CR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="p-6">
            {/* Header */}
            <AdminPageHeader
                icon={Megaphone}
                title="Gestión de Promociones"
                subtitle="Crea y gestiona promociones especiales para tus clientes"
                gradient="from-purple-500 via-fuchsia-400 to-pink-400"
                stats={[
                    { value: stats.total, label: 'Total' },
                    { value: stats.activas, label: 'Activas' },
                    { value: stats.enHome, label: 'En Home' }
                ]}
                actions={[
                    <button
                        key="add"
                        onClick={() => setShowModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-purple-600 text-sm font-semibold hover:bg-purple-50 shadow-md transition-colors"
                    >
                        <Plus size={16} /> Nueva Promoción
                    </button>,
                    <button
                        key="refresh"
                        onClick={loadData}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
                    >
                        <RefreshCw size={16} /> Actualizar
                    </button>
                ]}
            />

            {/* Tabs Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl self-start md:self-auto">
                <button
                    onClick={() => setActiveTab('promotions')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'promotions'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-700:text-gray-300'
                        }`}
                >
                    Promociones Generales
                </button>
                <button
                    onClick={() => setActiveTab('packs')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'packs'
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-700:text-gray-300'
                        }`}
                >
                    Descuentos en Packs
                    <span className="bg-bikitchen-gold text-gray-900 text-[10px] px-1.5 py-0.5 rounded-full">Nuevo</span>
                </button>
            </div>

            {activeTab === 'promotions' && (
                <button
                    onClick={() => { setEditingPromotion(null); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white rounded-xl transition-colors shadow-lg shadow-bikitchen-orange/20"
                >
                    <Plus size={20} />
                    <span className="font-semibold">Nueva Promoción</span>
                </button>
            )}

            {/* Content */}
            {activeTab === 'packs' ? (
                <PackDiscountsView />
            ) : (
                <div>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Gift size={20} />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Total</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-50 rounded-lg text-green-600">
                                    <Check size={20} />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Activas</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.activas}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
                                    <Home size={20} />
                                </div>
                                <span className="text-sm font-medium text-gray-500">En Home</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">{stats.enHome}</div>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-red-50 rounded-lg text-red-600">
                                    <AlertCircle size={20} />
                                </div>
                                <span className="text-sm font-medium text-gray-500">Próxima a vencer</span>
                            </div>
                            {stats.proximaExpirar ? (
                                <div>
                                    <div className="text-sm font-bold text-gray-900 truncate" title={stats.proximaExpirar.titulo}>
                                        {stats.proximaExpirar.titulo}
                                    </div>
                                    <div className="text-xs text-red-500 font-medium">
                                        Vence en {stats.proximaExpirar.diasRestantes} días
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-400">No hay próximas a vencer</div>
                            )}
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="mb-6">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Buscar promociones..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Promotions List */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bikitchen-orange"></div>
                        </div>
                    ) : filteredPromotions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredPromotions.map((promo) => (
                                <motion.div
                                    key={promo.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`bg-white rounded-2xl overflow-hidden border transition-all group hover:shadow-xl ${!promo.activa ? 'opacity-75 grayscale border-gray-200' : 'border-gray-100'
                                        }`}
                                >
                                    {/* Image Header */}
                                    <div className="relative h-48 bg-gray-100">
                                        {promo.imagenURL ? (
                                            <img
                                                src={promo.imagenURL}
                                                alt={promo.titulo}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Image size={48} />
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <button
                                                onClick={() => handleToggleStatus(promo)}
                                                className={`p-2 rounded-full backdrop-blur-md transition-colors ${promo.activa
                                                    ? 'bg-green-500/20 text-green-600 hover:bg-green-500 hover:text-white'
                                                    : 'bg-gray-500/20 text-gray-600 hover:bg-gray-500 hover:text-white'
                                                    }`}
                                                title={promo.activa ? 'Desactivar' : 'Activar'}
                                            >
                                                {promo.activa ? <Eye size={18} /> : <EyeOff size={18} />}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingPromotion(promo);
                                                    setShowModal(true);
                                                }}
                                                className="p-2 bg-white/20 backdrop-blur-md text-white hover:bg-white/40 rounded-full transition-colors"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(promo.id)}
                                                className="p-2 bg-red-500/20 backdrop-blur-md text-red-600 hover:bg-red-500 hover:text-white rounded-full transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                        {/* Status Badge */}
                                        <div className="absolute bottom-4 left-4 flex gap-2">
                                            <span className={`px-2 py-1 rounded-lg text-xs font-bold backdrop-blur-md ${promo.activa
                                                ? 'bg-green-500/80 text-white'
                                                : 'bg-gray-500/80 text-white'
                                                }`}>
                                                {promo.activa ? 'ACTIVA' : 'INACTIVA'}
                                            </span>
                                            {promo.mostrarEnHome && (
                                                <span className="px-2 py-1 rounded-lg text-xs font-bold bg-bikitchen-gold/90 text-gray-900 backdrop-blur-md flex items-center gap-1">
                                                    <Home size={10} />
                                                    HOME
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
                                            {promo.titulo}
                                        </h3>
                                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">
                                            {promo.descripcionCorta || promo.descripcion}
                                        </p>

                                        {/* Dates */}
                                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 bg-gray-50 p-3 rounded-xl">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                <span>Inicio: {formatDate(promo.fechaInicio)}</span>
                                            </div>
                                            <div className="w-px h-4 bg-gray-300"></div>
                                            <div className={`flex items-center gap-1 ${promo.fechaFin && new Date(promo.fechaFin) < new Date() ? 'text-red-500 font-bold' : ''
                                                }`}>
                                                <Clock size={14} />
                                                <span>Fin: {formatDate(promo.fechaFin)}</span>
                                            </div>
                                        </div>

                                        {/* Badges */}
                                        <div className="flex flex-wrap gap-2">
                                            {promo.packsRelacionados?.slice(0, 3).map((pack, i) => (
                                                <span key={i} className="px-2 py-1 bg-bikitchen-orange/10 text-bikitchen-orange rounded-lg text-xs font-medium">
                                                    {pack}
                                                </span>
                                            ))}
                                            {promo.packsRelacionados?.length > 3 && (
                                                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-medium">
                                                    +{promo.packsRelacionados.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 px-6">
                            <Gift className="mx-auto text-bikitchen-orange/30 mb-6" size={64} />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">
                                No hay promociones
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                Crea tu primera promoción o carga las promociones predefinidas de BiKitchen
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={handleInitializePromotions}
                                    disabled={initializing}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bikitchen-gold hover:bg-amber-400 text-gray-900 font-bold rounded-xl transition-all disabled:opacity-50"
                                >
                                    {initializing ? <RefreshCw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                    Cargar promociones predefinidas
                                </button>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white font-bold rounded-xl transition-all"
                                >
                                    <Plus size={18} />
                                    Crear promoción nueva
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <PromotionModal
                        isOpen={showModal}
                        onClose={() => { setShowModal(false); setEditingPromotion(null); }}
                        promotion={editingPromotion}
                        onSave={handleSave}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {deleteConfirm && (

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <AlertCircle className="text-red-500" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">
                                        Eliminar promoción
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        Esta acción no se puede deshacer
                                    </p>
                                </div>
                            </div>
                            <p className="text-gray-600 mb-6">
                                ¿Estás seguro de eliminar "<strong>{deleteConfirm.titulo}</strong>"?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                                    type="button"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm.id)}
                                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-colors"
                                    type="button"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

