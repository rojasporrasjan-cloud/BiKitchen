import React, { useState, useEffect } from 'react';
import {
    Tag, Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight,
    Calendar, Percent, DollarSign, Truck, Copy, Check, X, Loader2,
    AlertCircle, Users, Sparkles, UserPlus, RefreshCw, Gift, Ticket
} from 'lucide-react';
import {
    getAllCoupons,
    createCoupon,
    updateCoupon,
    deleteCoupon
} from '../../utils/firestoreCoupons';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function CouponsView() {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);
    const [saving, setSaving] = useState(false);
    const [copiedCode, setCopiedCode] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        code: '',
        type: 'percentage',
        value: '',
        description: '',
        minPurchase: '',
        maxDiscount: '',
        maxUses: '',
        startDate: '',
        expirationDate: '',
        active: true,
        isWelcomeCoupon: false,      // Cupón de bienvenida (se muestra a nuevos usuarios)
        singleUsePerUser: false,     // Solo un uso por usuario
        // Configuración del banner promocional
        showInBanner: false,         // Mostrar en banner de inicio
        bannerBgColor: '#f97316',    // Color de fondo del banner (naranja por defecto)
        bannerTextColor: '#ffffff',  // Color del texto
        bannerMessage: '',           // Mensaje personalizado (ej: "¡Usa el código X para 5% OFF!")
        bannerEmoji: '🎉'            // Emoji decorativo
    });

    // Generar código aleatorio (verifica que no exista ya)
    const generateRandomCode = () => {
        const prefixes = ['BIKITCHEN', 'DESCUENTO', 'PROMO', 'AHORRO', 'OFERTA'];
        let newCode;
        let attempts = 0;
        do {
            const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            newCode = `${prefix}${suffix}`;
            attempts++;
        } while (coupons.some(c => c.code === newCode) && attempts < 10);
        setFormData({ ...formData, code: newCode });
    };

    useEffect(() => {
        loadCoupons();
    }, []);

    const loadCoupons = async () => {
        setLoading(true);
        try {
            const data = await getAllCoupons();
            setCoupons(data);
        } catch (error) {
            toast.error('Error al cargar cupones');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            code: '',
            type: 'percentage',
            value: '',
            description: '',
            minPurchase: '',
            maxDiscount: '',
            maxUses: '',
            startDate: '',
            expirationDate: '',
            active: true,
            isWelcomeCoupon: false,
            singleUsePerUser: false,
            showInBanner: false,
            bannerBgColor: '#f97316',
            bannerTextColor: '#ffffff',
            bannerMessage: '',
            bannerEmoji: '🎉'
        });
        setEditingCoupon(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (coupon) => {
        setEditingCoupon(coupon);
        setFormData({
            code: coupon.code,
            type: coupon.type,
            value: coupon.value.toString(),
            description: coupon.description || '',
            minPurchase: coupon.minPurchase?.toString() || '',
            maxDiscount: coupon.maxDiscount?.toString() || '',
            maxUses: coupon.maxUses?.toString() || '',
            startDate: coupon.startDate ? formatDateForInput(coupon.startDate) : '',
            expirationDate: coupon.expirationDate ? formatDateForInput(coupon.expirationDate) : '',
            active: coupon.active,
            isWelcomeCoupon: coupon.isWelcomeCoupon || false,
            singleUsePerUser: coupon.singleUsePerUser || false,
            showInBanner: coupon.showInBanner || false,
            bannerBgColor: coupon.bannerBgColor || '#f97316',
            bannerTextColor: coupon.bannerTextColor || '#ffffff',
            bannerMessage: coupon.bannerMessage || '',
            bannerEmoji: coupon.bannerEmoji || '🎉'
        });
        setShowModal(true);
    };

    const formatDateForInput = (timestamp) => {
        try {
            if (!timestamp) return '';
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch (e) {
            console.error('Error formatting date:', e);
            return '';
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (editingCoupon) {
                await updateCoupon(editingCoupon.id, formData);
                toast.success('Cupón actualizado');
            } else {
                await createCoupon(formData);
                toast.success('Cupón creado');
            }
            setShowModal(false);
            resetForm();
            loadCoupons();
        } catch (error) {
            toast.error(error.message || 'Error al guardar cupón');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (coupon) => {
        if (!confirm(`¿Eliminar el cupón "${coupon.code}"?`)) return;

        try {
            await deleteCoupon(coupon.id);
            toast.success('Cupón eliminado');
            loadCoupons();
        } catch (error) {
            toast.error('Error al eliminar cupón');
        }
    };

    const handleToggleActive = async (coupon) => {
        // Optimistic update
        const previousCoupons = [...coupons];
        const updatedCoupons = coupons.map(c =>
            c.id === coupon.id ? { ...c, active: !c.active } : c
        );
        setCoupons(updatedCoupons);

        try {
            await updateCoupon(coupon.id, { active: !coupon.active });
            toast.success(coupon.active ? 'Cupón desactivado' : 'Cupón activado');
            // No recargamos todo para mantener la fluidez, ya tenemos el estado nuevo
        } catch (error) {
            // Revert on error
            setCoupons(previousCoupons);
            console.error('Error toggling coupon:', error);
            toast.error('Error al actualizar: ' + (error.message || 'Desconocido'));
        }
    };

    const copyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
        toast.success('Código copiado');
    };

    const filteredCoupons = coupons.filter(coupon =>
        coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getTypeIcon = (type) => {
        switch (type) {
            case 'percentage': return <Percent size={16} />;
            case 'fixed': return <DollarSign size={16} />;
            case 'free_shipping': return <Truck size={16} />;
            default: return <Tag size={16} />;
        }
    };

    const getTypeLabel = (type) => {
        switch (type) {
            case 'percentage': return 'Porcentaje';
            case 'fixed': return 'Monto fijo';
            case 'free_shipping': return 'Envío gratis';
            default: return type;
        }
    };

    const formatValue = (coupon) => {
        switch (coupon.type) {
            case 'percentage': return `${coupon.value}%`;
            case 'fixed': return `₡${coupon.value.toLocaleString('es-CR')}`;
            case 'free_shipping': return 'Envío gratis';
            default: return coupon.value;
        }
    };

    const isExpired = (coupon) => {
        if (!coupon.expirationDate) return false;
        try {
            const expDate = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
            if (isNaN(expDate.getTime())) return false;
            return new Date() > expDate;
        } catch { return false; }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <AdminPageHeader
                icon={Ticket}
                title="Cupones de Descuento"
                subtitle="Gestiona cupones promocionales y ofertas especiales"
                gradient="from-purple-500 via-pink-400 to-rose-400"
                stats={[
                    { value: coupons.length, label: 'Total' },
                    { value: coupons.filter(c => c.active && !isExpired(c)).length, label: 'Activos' },
                    { value: coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0), label: 'Usos' }
                ]}
                actions={[
                    <button
                        key="add"
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-purple-600 text-sm font-semibold hover:bg-purple-50 shadow-md transition-colors"
                    >
                        <Plus size={16} /> Nuevo Cupón
                    </button>,
                    <button
                        key="refresh"
                        onClick={loadCoupons}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
                    >
                        <RefreshCw size={16} /> Actualizar
                    </button>
                ]}
            />

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-white via-gray-50/30 to-white rounded-3xl p-6 shadow-xl border border-gray-100/50 mb-6"
            >
                <div className="relative">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código o descripción..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 text-sm transition-all"
                    />
                </div>
            </motion.div>

            {/* Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-white via-purple-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600 font-medium">Total Cupones</p>
                        <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 text-white rounded-xl shadow-lg">
                            <Tag size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{coupons.length}</p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-white via-green-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600 font-medium">Activos</p>
                        <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-xl shadow-lg">
                            <Check size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {coupons.filter(c => c.active && !isExpired(c)).length}
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-white via-red-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600 font-medium">Expirados</p>
                        <div className="p-2 bg-gradient-to-br from-red-400 to-rose-500 text-white rounded-xl shadow-lg">
                            <AlertCircle size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {coupons.filter(c => isExpired(c)).length}
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="bg-gradient-to-br from-white via-blue-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600 font-medium">Usos Totales</p>
                        <div className="p-2 bg-gradient-to-br from-blue-400 to-cyan-500 text-white rounded-xl shadow-lg">
                            <Users size={18} />
                        </div>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0)}
                    </p>
                </motion.div>
            </motion.div>

            {/* Table */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-bikitchen-orange" />
                </div>
            ) : filteredCoupons.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                    <Tag size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No hay cupones</p>
                    <button
                        onClick={openCreateModal}
                        className="mt-4 text-bikitchen-orange font-medium hover:underline"
                    >
                        Crear el primero
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Código</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Tipo</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Valor</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Usos</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Expira</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Estado</th>
                                    <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCoupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono font-bold">
                                                    {coupon.code}
                                                </code>
                                                <button
                                                    onClick={() => copyCode(coupon.code)}
                                                    className="text-gray-400 hover:text-gray-600"
                                                >
                                                    {copiedCode === coupon.code ? (
                                                        <Check size={14} className="text-green-500" />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </button>
                                            </div>
                                            {coupon.description && (
                                                <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                                            )}
                                            {/* Badges especiales */}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {coupon.isWelcomeCoupon && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">
                                                        <UserPlus size={10} />
                                                        Bienvenida
                                                    </span>
                                                )}
                                                {coupon.singleUsePerUser && (
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                                        <Gift size={10} />
                                                        Único/usuario
                                                    </span>
                                                )}
                                                {coupon.showInBanner && (
                                                    <span
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                                        style={{
                                                            backgroundColor: coupon.bannerBgColor || '#f97316',
                                                            color: coupon.bannerTextColor || '#ffffff'
                                                        }}
                                                    >
                                                        <Tag size={10} />
                                                        Banner
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="flex items-center gap-1 text-sm text-gray-600">
                                                {getTypeIcon(coupon.type)}
                                                {getTypeLabel(coupon.type)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-semibold text-bikitchen-orange">
                                                {formatValue(coupon)}
                                            </span>
                                            {coupon.minPurchase > 0 && (
                                                <p className="text-xs text-gray-500">
                                                    Mín: ₡{coupon.minPurchase.toLocaleString('es-CR')}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1 text-sm">
                                                <Users size={14} className="text-gray-400" />
                                                <span>{coupon.usedCount || 0}</span>
                                                {coupon.maxUses && (
                                                    <span className="text-gray-400">/ {coupon.maxUses}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {coupon.expirationDate ? (
                                                <span className={`text-sm ${isExpired(coupon) ? 'text-red-600' : 'text-gray-600'}`}>
                                                    {(() => {
                                                        try {
                                                            const d = coupon.expirationDate.toDate ? coupon.expirationDate.toDate() : new Date(coupon.expirationDate);
                                                            return isNaN(d.getTime()) ? 'Fecha inválida' : d.toLocaleDateString('es-CR');
                                                        } catch { return 'Error fecha'; }
                                                    })()}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">Sin límite</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {isExpired(coupon) ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                    <AlertCircle size={12} />
                                                    Expirado
                                                </span>
                                            ) : coupon.active ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                                    <Check size={12} />
                                                    Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                                                    <X size={12} />
                                                    Inactivo
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleActive(coupon);
                                                    }}
                                                    disabled={loading}
                                                    className={`p-2 rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                                                    title={coupon.active ? 'Desactivar' : 'Activar'}
                                                >
                                                    {coupon.active ? (
                                                        <ToggleRight size={20} className="text-green-500" />
                                                    ) : (
                                                        <ToggleLeft size={20} className="text-gray-400" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => openEditModal(coupon)}
                                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={18} className="text-gray-500" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(coupon)}
                                                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} className="text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingCoupon ? 'Editar Cupón' : 'Nuevo Cupón'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Código */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Código del Cupón *
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="Ej: BIENVENIDO5"
                                        required
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 uppercase"
                                    />
                                    <button
                                        type="button"
                                        onClick={generateRandomCode}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1 text-sm text-gray-600"
                                        title="Generar código aleatorio"
                                    >
                                        <RefreshCw size={16} />
                                        <span className="hidden sm:inline">Generar</span>
                                    </button>
                                </div>
                            </div>

                            {/* Tipo y Valor */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo de Descuento *
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                    >
                                        <option value="percentage">Porcentaje (%)</option>
                                        <option value="fixed">Monto Fijo (₡)</option>
                                        <option value="free_shipping">Envío Gratis</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Valor *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.value}
                                        onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                        placeholder={formData.type === 'percentage' ? 'Ej: 10' : 'Ej: 2000'}
                                        required={formData.type !== 'free_shipping'}
                                        disabled={formData.type === 'free_shipping'}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 disabled:bg-gray-100"
                                    />
                                </div>
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Ej: Descuento de bienvenida"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                />
                            </div>

                            {/* Restricciones */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Compra Mínima (₡)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.minPurchase}
                                        onChange={(e) => setFormData({ ...formData, minPurchase: e.target.value })}
                                        placeholder="0"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descuento Máximo (₡)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.maxDiscount}
                                        onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                                        placeholder="Sin límite"
                                        disabled={formData.type !== 'percentage'}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 disabled:bg-gray-100"
                                    />
                                </div>
                            </div>

                            {/* Límite de usos */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Límite de Usos
                                </label>
                                <input
                                    type="number"
                                    value={formData.maxUses}
                                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                                    placeholder="Sin límite"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                />
                            </div>

                            {/* Fechas */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de Inicio
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de Expiración
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.expirationDate}
                                        onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                    />
                                </div>
                            </div>

                            {/* Opciones especiales */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 space-y-3 border border-purple-100">
                                <h4 className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                                    <Sparkles size={16} />
                                    Opciones Especiales
                                </h4>

                                {/* Cupón de bienvenida */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <UserPlus size={16} className="text-purple-600" />
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">Cupón de Bienvenida</span>
                                            <p className="text-xs text-gray-500">Se muestra automáticamente a nuevos usuarios registrados</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isWelcomeCoupon: !formData.isWelcomeCoupon })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${formData.isWelcomeCoupon ? 'bg-purple-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.isWelcomeCoupon ? 'left-7' : 'left-1'
                                            }`} />
                                    </button>
                                </div>

                                {/* Uso único por usuario */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Gift size={16} className="text-purple-600" />
                                        <div>
                                            <span className="text-sm font-medium text-gray-700">Uso Único por Usuario</span>
                                            <p className="text-xs text-gray-500">Cada usuario solo puede usar este cupón una vez</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, singleUsePerUser: !formData.singleUsePerUser })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${formData.singleUsePerUser ? 'bg-purple-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.singleUsePerUser ? 'left-7' : 'left-1'
                                            }`} />
                                    </button>
                                </div>
                            </div>

                            {/* Configuración del Banner Promocional */}
                            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 space-y-3 border border-orange-100">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                                        <Tag size={16} />
                                        Banner Promocional
                                    </h4>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, showInBanner: !formData.showInBanner })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${formData.showInBanner ? 'bg-orange-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.showInBanner ? 'left-7' : 'left-1'
                                            }`} />
                                    </button>
                                </div>

                                {formData.showInBanner && (
                                    <div className="space-y-3 pt-2">
                                        {/* Preview del banner */}
                                        <div
                                            className="rounded-lg p-2 text-center text-sm font-medium shadow-sm"
                                            style={{
                                                backgroundColor: formData.bannerBgColor,
                                                color: formData.bannerTextColor
                                            }}
                                        >
                                            <span>{formData.bannerEmoji}</span>
                                            {' '}
                                            {formData.bannerMessage || `Código: ${formData.code || 'CÓDIGO'} = ${formData.value || '0'}% OFF`}
                                            {' '}
                                            <span>{formData.bannerEmoji}</span>
                                        </div>

                                        {/* Mensaje personalizado */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Mensaje del Banner
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.bannerMessage}
                                                onChange={(e) => setFormData({ ...formData, bannerMessage: e.target.value })}
                                                placeholder={`Ej: ¡Usa ${formData.code || 'CÓDIGO'} para ${formData.value || '0'}% OFF!`}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-200"
                                            />
                                        </div>

                                        {/* Colores y Emoji */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Color Fondo
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={formData.bannerBgColor}
                                                        onChange={(e) => setFormData({ ...formData, bannerBgColor: e.target.value })}
                                                        className="w-8 h-8 rounded cursor-pointer border-0"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={formData.bannerBgColor}
                                                        onChange={(e) => setFormData({ ...formData, bannerBgColor: e.target.value })}
                                                        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Color Texto
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="color"
                                                        value={formData.bannerTextColor}
                                                        onChange={(e) => setFormData({ ...formData, bannerTextColor: e.target.value })}
                                                        className="w-8 h-8 rounded cursor-pointer border-0"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={formData.bannerTextColor}
                                                        onChange={(e) => setFormData({ ...formData, bannerTextColor: e.target.value })}
                                                        className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    Emoji
                                                </label>
                                                <select
                                                    value={formData.bannerEmoji}
                                                    onChange={(e) => setFormData({ ...formData, bannerEmoji: e.target.value })}
                                                    className="w-full px-2 py-1.5 text-lg border border-gray-200 rounded-lg"
                                                >
                                                    <option value="🎉">🎉</option>
                                                    <option value="🔥">🔥</option>
                                                    <option value="⭐">⭐</option>
                                                    <option value="💰">💰</option>
                                                    <option value="🎁">🎁</option>
                                                    <option value="✨">✨</option>
                                                    <option value="🛒">🛒</option>
                                                    <option value="❤️">❤️</option>
                                                    <option value="🍽️">🍽️</option>
                                                    <option value="👋">👋</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Colores predefinidos */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-600 mb-1">
                                                Colores Rápidos
                                            </label>
                                            <div className="flex gap-2">
                                                {[
                                                    { bg: '#f97316', text: '#ffffff', name: 'Naranja' },
                                                    { bg: '#22c55e', text: '#ffffff', name: 'Verde' },
                                                    { bg: '#3b82f6', text: '#ffffff', name: 'Azul' },
                                                    { bg: '#8b5cf6', text: '#ffffff', name: 'Morado' },
                                                    { bg: '#ef4444', text: '#ffffff', name: 'Rojo' },
                                                    { bg: '#000000', text: '#ffffff', name: 'Negro' },
                                                ].map((color) => (
                                                    <button
                                                        key={color.name}
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            bannerBgColor: color.bg,
                                                            bannerTextColor: color.text
                                                        })}
                                                        className="w-8 h-8 rounded-full border-2 border-white shadow-md hover:scale-110 transition-transform"
                                                        style={{ backgroundColor: color.bg }}
                                                        title={color.name}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Estado */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, active: !formData.active })}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${formData.active ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.active ? 'left-7' : 'left-1'
                                        }`} />
                                </button>
                                <span className="text-sm text-gray-700">
                                    {formData.active ? 'Cupón activo' : 'Cupón inactivo'}
                                </span>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        resetForm();
                                    }}
                                    className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2 px-4 bg-bikitchen-orange text-white rounded-lg font-medium hover:bg-bikitchen-orange-dark transition-colors disabled:bg-gray-300 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        editingCoupon ? 'Actualizar' : 'Crear Cupón'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
