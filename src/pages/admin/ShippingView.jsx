import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Truck, 
    Save, 
    RefreshCw, 
    CheckCircle, 
    AlertCircle, 
    MapPin, 
    ChevronDown, 
    ChevronUp,
    Search,
    Info,
    DollarSign,
    Plus,
    X
} from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { useShipping } from '../../context/ShippingContext';

const PROVINCE_COLORS = {
    'San José': {
        gradient: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: 'bg-blue-500',
        hover: 'hover:bg-blue-100'
    },
    'Alajuela': {
        gradient: 'from-red-500 to-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: 'bg-red-500',
        hover: 'hover:bg-red-100'
    },
    'Heredia': {
        gradient: 'from-green-500 to-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: 'bg-green-500',
        hover: 'hover:bg-green-100'
    },
    'Cartago': {
        gradient: 'from-purple-500 to-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        icon: 'bg-purple-500',
        hover: 'hover:bg-purple-100'
    },
    'Otro': {
        gradient: 'from-gray-500 to-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        icon: 'bg-gray-500',
        hover: 'hover:bg-gray-100'
    }
};

export default function ShippingView() {
    const { zones, loading, updateZonePrice, addNewZone, initializeShippingZones } = useShipping();
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProvince, setExpandedProvince] = useState('San José');
    const [edits, setEdits] = useState({}); // { zoneId: newPrice }
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // Nueva zona state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newZoneData, setNewZoneData] = useState({
        name: '',
        province: 'San José',
        cost: '',
        areas: '',
        requiresContact: false
    });

    // Agrupar zonas por provincia
    const zonesByProvince = useMemo(() => {
        return zones.reduce((acc, zone) => {
            if (!acc[zone.province]) {
                acc[zone.province] = [];
            }
            acc[zone.province].push(zone);
            return acc;
        }, {});
    }, [zones]);

    const provinces = Object.keys(zonesByProvince);

    const handlePriceChange = (zoneId, value) => {
        // Solo permitir números
        const numValue = value.replace(/[^0-9]/g, '');
        setEdits(prev => ({
            ...prev,
            [zoneId]: numValue
        }));
    };

    const handleSaveZone = async (zoneId) => {
        const newPrice = edits[zoneId];
        if (newPrice === undefined) return;

        setSaving(true);
        setMessage({ type: '', text: '' });

        const result = await updateZonePrice(zoneId, newPrice);

        if (result.success) {
            setMessage({ type: 'success', text: '✅ Precio actualizado correctamente' });
            // Eliminar de edits
            const newEdits = { ...edits };
            delete newEdits[zoneId];
            setEdits(newEdits);
            
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } else {
            setMessage({ type: 'error', text: '❌ Error al actualizar: ' + result.error });
        }
        setSaving(false);
    };

    const handleSaveAllInline = async (province) => {
        const provinceZones = zonesByProvince[province] || [];
        const zonesToUpdate = provinceZones.filter(z => edits[z.id] !== undefined);

        if (zonesToUpdate.length === 0) return;

        setSaving(true);
        setMessage({ type: '', text: 'Actualizando múltiples zonas...' });

        try {
            for (const zone of zonesToUpdate) {
                await updateZonePrice(zone.id, edits[zone.id]);
            }
            
            // Limpiar edits de esta provincia
            const newEdits = { ...edits };
            zonesToUpdate.forEach(z => delete newEdits[z.id]);
            setEdits(newEdits);

            setMessage({ type: 'success', text: `✅ Se actualizaron ${zonesToUpdate.length} zonas de ${province}` });
            setTimeout(() => setMessage({ type: '', text: '' }), 5000);
        } catch (error) {
            setMessage({ type: 'error', text: '❌ Error en actualización masiva' });
        } finally {
            setSaving(false);
        }
    };

    const handleAddZone = async (e) => {
        e.preventDefault();
        if (!newZoneData.name || !newZoneData.cost) {
            setMessage({ type: 'error', text: '❌ Nombre y costo son obligatorios' });
            return;
        }

        setSaving(true);
        const result = await addNewZone({
            ...newZoneData,
            areas: newZoneData.areas.split(',').map(a => a.trim()).filter(Boolean),
            cost: Number(newZoneData.cost)
        });

        if (result.success) {
            setMessage({ type: 'success', text: '✅ Nueva zona añadida exitosamente' });
            setShowAddModal(false);
            setNewZoneData({
                name: '',
                province: 'San José',
                cost: '',
                areas: '',
                requiresContact: false
            });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } else {
            setMessage({ type: 'error', text: '❌ Error al añadir zona: ' + result.error });
        }
        setSaving(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />
                    <p className="text-gray-600 font-medium">Cargando zonas de envío...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto pb-24">
            <AdminPageHeader
                icon={Truck}
                title="Gestión de Envíos"
                subtitle="Configura los precios de entrega por distrito y provincia"
                gradient="from-orange-500 via-amber-500 to-orange-600"
                stats={[
                    { value: zones.length, label: 'Zonas Totales' },
                    { value: provinces.length, label: 'Provincias' }
                ]}
                actions={
                    zones.length === 0 && (
                        <button
                            onClick={async () => {
                                setSaving(true);
                                const res = await initializeShippingZones();
                                if (res.success) {
                                    setMessage({ type: 'success', text: '✅ Datos iniciales cargados desde el sistema anterior' });
                                } else {
                                    setMessage({ type: 'error', text: '❌ Error al cargar datos: ' + res.error });
                                }
                                setSaving(false);
                                setTimeout(() => setMessage({ type: '', text: '' }), 5000);
                            }}
                            disabled={saving}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                        >
                            <RefreshCw size={18} className={saving ? 'animate-spin' : ''} />
                            Migrar Datos Previos
                        </button>
                    )
                }
            />

            {/* Alertas con Framer Motion */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`mb-6 p-4 rounded-2xl flex items-center gap-3 shadow-lg ${
                            message.type === 'success' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-red-500 text-white'
                        }`}
                    >
                        {message.type === 'success' ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
                        <p className="font-bold">{message.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Buscador y Botón de Agregar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="flex-1 bg-white rounded-3xl shadow-xl p-4 border border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar distrito o zona (ej: Escazú...)"
                            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl transition-all outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-3xl font-black shadow-xl hover:shadow-orange-500/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                >
                    <Plus size={24} />
                    NUEVA ZONA
                </button>
            </div>

            {/* Listado por Provincias o Estado Vacío */}
            <div className="space-y-4">
                {zones.length === 0 ? (
                    <div className="bg-white rounded-3xl shadow-xl p-12 text-center border-2 border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Truck size={40} className="text-orange-500" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">No hay zonas configuradas</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Parece que es la primera vez que usas el gestor dinámico. 
                            Puedes migrar los datos que estaban "hardcodeados" anteriormente con un solo clic.
                        </p>
                        <button
                            onClick={async () => {
                                setSaving(true);
                                const res = await initializeShippingZones();
                                if (res.success) {
                                    setMessage({ type: 'success', text: '✅ Datos iniciales migrados con éxito' });
                                } else {
                                    setMessage({ type: 'error', text: '❌ Error: ' + res.error });
                                }
                                setSaving(false);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2 mx-auto"
                        >
                            <RefreshCw size={24} className={saving ? 'animate-spin' : ''} />
                            CARGAR ZONAS INICIALES
                        </button>
                    </div>
                ) : (
                    provinces.map(province => {
                        const provinceZones = zonesByProvince[province];
                        const filteredZones = provinceZones.filter(z => 
                            z.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            z.areas.some(a => a.toLowerCase().includes(searchTerm.toLowerCase()))
                        );

                        if (searchTerm && filteredZones.length === 0) return null;

                        const colors = PROVINCE_COLORS[province] || PROVINCE_COLORS['Otro'];
                        const isExpanded = expandedProvince === province || searchTerm;
                        const pendingEditsCount = provinceZones.filter(z => edits[z.id] !== undefined).length;

                        return (
                            <div key={province} className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden transition-all hover:shadow-xl">
                                {/* ... resto del listado ... */}
                                <button
                                    onClick={() => setExpandedProvince(isExpanded ? null : province)}
                                    className={`w-full p-6 flex items-center justify-between transition-colors ${colors.hover}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center shadow-lg`}>
                                            <MapPin className="text-white" size={24} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="text-xl font-bold text-gray-900">{province}</h3>
                                            <p className="text-sm text-gray-500">{provinceZones.length} distritos configurados</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {pendingEditsCount > 0 && (
                                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                                {pendingEditsCount} cambios pendientes
                                            </span>
                                        )}
                                        {isExpanded ? <ChevronUp size={24} className="text-gray-400" /> : <ChevronDown size={24} className="text-gray-400" />}
                                    </div>
                                </button>

                                {/* Detalle de Zonas */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-gray-100"
                                        >
                                            <div className="p-4 md:p-6 space-y-3 bg-gray-50/50">
                                                {/* Acción Masiva por Provincia */}
                                                {pendingEditsCount > 1 && (
                                                    <div className="flex justify-end mb-4">
                                                        <button
                                                            onClick={() => handleSaveAllInline(province)}
                                                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md hover:shadow-lg scale-95 hover:scale-100"
                                                        >
                                                            <Save size={18} />
                                                            Guardar Todo en {province}
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {filteredZones.map(zone => {
                                                        const isEditing = edits[zone.id] !== undefined;
                                                        const currentPrice = isEditing ? edits[zone.id] : zone.cost;

                                                        return (
                                                            <div 
                                                                key={zone.id} 
                                                                className={`bg-white p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${
                                                                    isEditing ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-gray-100 hover:border-orange-200'
                                                                }`}
                                                            >
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-bold text-gray-900 truncate">{zone.name}</h4>
                                                                    <p className="text-xs text-gray-500 truncate">
                                                                        {zone.areas.length > 0 ? zone.areas.join(', ') : 'Sin distritos específicos'}
                                                                    </p>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <div className="relative">
                                                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                                                        <input
                                                                            type="text"
                                                                            value={currentPrice}
                                                                            onChange={(e) => handlePriceChange(zone.id, e.target.value)}
                                                                            className="w-28 pl-8 pr-3 py-2 bg-gray-50 border-2 border-gray-100 rounded-xl font-bold text-gray-800 focus:bg-white focus:border-orange-500 transition-all outline-none"
                                                                        />
                                                                    </div>
                                                                    
                                                                    {isEditing && (
                                                                        <button
                                                                            onClick={() => handleSaveZone(zone.id)}
                                                                            disabled={saving}
                                                                            className="bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-xl shadow-md transition-all active:scale-95"
                                                                            title="Guardar este precio"
                                                                        >
                                                                            {saving ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Botón flotante para Guardar Todo (si hay muchos cambios) */}
            {Object.keys(edits).length > 2 && (
                <div className="fixed bottom-8 right-8 z-50">
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={async () => {
                            setSaving(true);
                            for (const id of Object.keys(edits)) {
                                await updateZonePrice(id, edits[id]);
                            }
                            setEdits({});
                            setMessage({ type: 'success', text: '✅ Todos los cambios guardados' });
                            setSaving(false);
                            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
                        }}
                        className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-4 rounded-3xl font-black shadow-2xl hover:shadow-orange-500/40 transition-all hover:-translate-y-2 active:scale-95 text-lg"
                    >
                        <Save size={24} />
                        GUARDAR TODOS LOS CAMBIOS ({Object.keys(edits).length})
                    </motion.button>
                </div>
            )}
            {/* Modal para Agregar Nueva Zona */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Truck size={24} />
                                    Agregar Nueva Zona
                                </h2>
                                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleAddZone} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Nombre de la Zona / Ciudad</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all"
                                        placeholder="Ej: Escazú Centro"
                                        value={newZoneData.name}
                                        onChange={(e) => setNewZoneData(prev => ({ ...prev, name: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Provincia</label>
                                        <select
                                            className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all"
                                            value={newZoneData.province}
                                            onChange={(e) => setNewZoneData(prev => ({ ...prev, province: e.target.value }))}
                                        >
                                            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1">Costo de Envío</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="number"
                                                required
                                                className="w-full pl-10 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all"
                                                placeholder="2500"
                                                value={newZoneData.cost}
                                                onChange={(e) => setNewZoneData(prev => ({ ...prev, cost: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Distritos / Áreas (Separados por coma)</label>
                                    <textarea
                                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-orange-500 outline-none transition-all h-24 resize-none"
                                        placeholder="Ej: San Rafael, Guachipelín, Bello Horizonte"
                                        value={newZoneData.areas}
                                        onChange={(e) => setNewZoneData(prev => ({ ...prev, areas: e.target.value }))}
                                    />
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                                    <input
                                        type="checkbox"
                                        id="requiresContact"
                                        className="w-5 h-5 accent-orange-500"
                                        checked={newZoneData.requiresContact}
                                        onChange={(e) => setNewZoneData(prev => ({ ...prev, requiresContact: e.target.checked }))}
                                    />
                                    <label htmlFor="requiresContact" className="text-sm font-medium text-gray-700 cursor-pointer">
                                        Requiere contacto por WhatsApp (Fuera de cobertura normal)
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-4 px-6 border-2 border-gray-100 text-gray-500 font-bold rounded-2xl hover:bg-gray-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex-1 py-4 px-6 bg-orange-500 text-white font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        {saving ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} />}
                                        Crear Zona
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
