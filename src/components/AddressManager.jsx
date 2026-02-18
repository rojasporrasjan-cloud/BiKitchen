import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { 
    MapPin, Plus, Edit2, Trash2, Check, X, Star, 
    Home, Building, Briefcase, Heart
} from 'lucide-react';

const ADDRESS_TYPES = [
    { id: 'home', label: 'Casa', icon: Home },
    { id: 'work', label: 'Trabajo', icon: Briefcase },
    { id: 'other', label: 'Otro', icon: MapPin }
];

// Componente para seleccionar dirección en checkout
export function AddressSelector({ 
    addresses, 
    selectedId, 
    onSelect, 
    onAddNew
}) {
    if (addresses.length === 0) {
        return (
            <button
                type="button"
                onClick={onAddNew}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-bikitchen-orange hover:text-bikitchen-orange transition-colors flex items-center justify-center gap-2"
            >
                <Plus size={20} />
                Agregar dirección
            </button>
        );
    }

    return (
        <div className="space-y-3">
            {addresses.map((address) => {
                const TypeIcon = ADDRESS_TYPES.find(t => t.id === address.type)?.icon || MapPin;
                const isSelected = selectedId === address.id;
                
                return (
                    <button
                        key={address.id}
                        type="button"
                        onClick={() => onSelect(address)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-3 ${
                            isSelected
                                ? 'border-bikitchen-orange bg-bikitchen-orange/5'
                                : 'border-gray-200 hover:border-gray-300'
                        }`}
                    >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected 
                                ? 'bg-bikitchen-orange text-white' 
                                : 'bg-gray-100 text-gray-500'
                        }`}>
                            <TypeIcon size={20} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">
                                    {address.label || ADDRESS_TYPES.find(t => t.id === address.type)?.label || 'Dirección'}
                                </span>
                                {address.isDefault && (
                                    <span className="text-xs bg-bikitchen-orange/10 text-bikitchen-orange px-2 py-0.5 rounded-full">
                                        Principal
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">
                                {address.direccion}
                            </p>
                            {address.referencias && (
                                <p className="text-xs text-gray-400 truncate">
                                    Ref: {address.referencias}
                                </p>
                            )}
                        </div>

                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected
                                ? 'border-bikitchen-orange bg-bikitchen-orange'
                                : 'border-gray-300'
                        }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                        </div>
                    </button>
                );
            })}
            
            <button
                type="button"
                onClick={onAddNew}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-bikitchen-orange hover:text-bikitchen-orange transition-colors flex items-center justify-center gap-2 text-sm"
            >
                <Plus size={16} />
                Agregar otra dirección
            </button>
        </div>
    );
}

// Modal para agregar/editar dirección
export function AddressModal({ 
    isOpen, 
    onClose, 
    onSave, 
    editAddress = null 
}) {
    const [formData, setFormData] = useState({
        type: editAddress?.type || 'home',
        label: editAddress?.label || '',
        direccion: editAddress?.direccion || '',
        referencias: editAddress?.referencias || '',
        isDefault: editAddress?.isDefault || false
    });
    const [errors, setErrors] = useState({});

    const handleSave = () => {
        const newErrors = {};
        if (!formData.direccion.trim()) {
            newErrors.direccion = 'La dirección es requerida';
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        onSave({
            ...formData,
            label: formData.label || ADDRESS_TYPES.find(t => t.id === formData.type)?.label
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">
                        {editAddress ? 'Editar Dirección' : 'Nueva Dirección'}
                    </h3>
                </div>

                <div className="p-6 space-y-4">
                    {/* Tipo de dirección */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tipo de dirección
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {ADDRESS_TYPES.map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                                        formData.type === type.id
                                            ? 'border-bikitchen-orange bg-bikitchen-orange/10 text-bikitchen-orange'
                                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    <type.icon size={20} />
                                    <span className="text-xs font-medium">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Etiqueta personalizada */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre/Etiqueta (opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.label}
                            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                            placeholder="Ej: Casa de mamá, Oficina centro..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                        />
                    </div>

                    {/* Dirección */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dirección completa *
                        </label>
                        <textarea
                            value={formData.direccion}
                            onChange={(e) => {
                                setFormData({ ...formData, direccion: e.target.value });
                                if (errors.direccion) setErrors({ ...errors, direccion: null });
                            }}
                            rows={2}
                            placeholder="Provincia, cantón, distrito, señas exactas..."
                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 ${
                                errors.direccion ? 'border-red-500' : 'border-gray-200'
                            }`}
                        />
                        {errors.direccion && (
                            <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>
                        )}
                    </div>

                    {/* Referencias */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Referencias (opcional)
                        </label>
                        <input
                            type="text"
                            value={formData.referencias}
                            onChange={(e) => setFormData({ ...formData, referencias: e.target.value })}
                            placeholder="Ej: Portón negro, frente al parque..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                        />
                    </div>

                    {/* Default checkbox */}
                    <label className="flex items-center gap-3 cursor-pointer">
                        <div 
                            onClick={() => setFormData({ ...formData, isDefault: !formData.isDefault })}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                formData.isDefault
                                    ? 'bg-bikitchen-orange border-bikitchen-orange'
                                    : 'border-gray-300'
                            }`}
                        >
                            {formData.isDefault && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-sm text-gray-700">
                            Usar como dirección principal
                        </span>
                    </label>
                </div>

                <div className="p-6 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200:bg-gray-600 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 py-3 px-4 bg-bikitchen-orange text-white rounded-xl font-medium hover:bg-bikitchen-orange-dark transition-colors"
                    >
                        {editAddress ? 'Guardar Cambios' : 'Agregar Dirección'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// Componente completo de gestión de direcciones (para página de perfil)
export default function AddressManager({ 
    addresses, 
    onAdd, 
    onUpdate, 
    onDelete, 
    onSetDefault 
}) {
    const [showModal, setShowModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState(null);

    const handleEdit = (address) => {
        setEditingAddress(address);
        setShowModal(true);
    };

    const handleSave = (data) => {
        if (editingAddress) {
            onUpdate(editingAddress.id, data);
        } else {
            onAdd(data);
        }
        setEditingAddress(null);
    };

    const handleDelete = (id) => {
        if (confirm('¿Eliminar esta dirección?')) {
            onDelete(id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="text-bikitchen-orange" size={20} />
                    Mis Direcciones
                </h3>
                <button
                    onClick={() => {
                        setEditingAddress(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 text-sm text-bikitchen-orange font-medium hover:text-bikitchen-orange-dark"
                >
                    <Plus size={18} />
                    Agregar
                </button>
            </div>

            {addresses.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 mb-4">
                        No tienes direcciones guardadas
                    </p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-bikitchen-orange font-medium hover:underline"
                    >
                        Agregar tu primera dirección
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {addresses.map((address) => {
                        const TypeIcon = ADDRESS_TYPES.find(t => t.id === address.type)?.icon || MapPin;
                        
                        return (
                            <div
                                key={address.id}
                                className="bg-white rounded-xl p-4 border border-gray-100 flex items-start gap-3"
                            >
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                                    <TypeIcon size={20} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-semibold text-gray-900">
                                            {address.label}
                                        </span>
                                        {address.isDefault && (
                                            <span className="text-xs bg-bikitchen-orange/10 text-bikitchen-orange px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <Star size={10} />
                                                Principal
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        {address.direccion}
                                    </p>
                                    {address.referencias && (
                                        <p className="text-xs text-gray-400 mt-1">
                                            Ref: {address.referencias}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    {!address.isDefault && (
                                        <button
                                            onClick={() => onSetDefault(address.id)}
                                            className="p-2 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50:bg-yellow-900/20 rounded-lg transition-colors"
                                            title="Hacer principal"
                                        >
                                            <Star size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleEdit(address)}
                                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50:bg-blue-900/20 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(address.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {showModal && (
                    <AddressModal
                        isOpen={showModal}
                        onClose={() => {
                            setShowModal(false);
                            setEditingAddress(null);
                        }}
                        onSave={handleSave}
                        editAddress={editingAddress}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
