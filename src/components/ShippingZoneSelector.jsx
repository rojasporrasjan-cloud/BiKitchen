import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Truck, ChevronDown, ChevronUp, Search, Check } from 'lucide-react';
import { useShipping } from '../context/ShippingContext';

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

export default function ShippingZoneSelector({ selectedZone, onZoneChange, error }) {
    const { SHIPPING_ZONES } = useShipping();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProvince, setExpandedProvince] = useState(null);

    // Agrupar zonas por provincia
    const zonesByProvince = SHIPPING_ZONES.reduce((acc, zone) => {
        if (!acc[zone.province]) {
            acc[zone.province] = [];
        }
        acc[zone.province].push(zone);
        return acc;
    }, {});

    // Filtrar zonas según búsqueda
    const filteredZones = searchTerm
        ? SHIPPING_ZONES.filter(zone =>
            zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            zone.areas.some(area => area.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        : null;

    const selectedZoneInfo = SHIPPING_ZONES.find(z => z.id === selectedZone);

    const handleZoneSelect = (zoneId) => {
        onZoneChange(zoneId);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative">
            {/* Botón principal para abrir selector */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-4 text-left border-2 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all ${
                    error
                        ? 'border-red-500 bg-red-50'
                        : selectedZone
                            ? 'border-green-500 bg-green-50/30'
                            : 'border-gray-300 hover:border-orange-400 bg-white'
                }`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                        {selectedZoneInfo ? (
                            <>
                                <div className={`w-10 h-10 rounded-full ${PROVINCE_COLORS[selectedZoneInfo.province]?.icon || 'bg-orange-500'} flex items-center justify-center flex-shrink-0`}>
                                    <MapPin size={20} className="text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                        {selectedZoneInfo.name}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {selectedZoneInfo.cost !== null 
                                            ? `₡${selectedZoneInfo.cost.toLocaleString('es-CR')}` 
                                            : 'Consultar costo'}
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <MapPin size={20} className="text-gray-400" />
                                </div>
                                <span className="text-gray-500">📍 Selecciona tu zona de entrega...</span>
                            </>
                        )}
                    </div>
                    <ChevronDown
                        size={20}
                        className={`transition-transform ${isOpen ? 'rotate-180' : ''} ${
                            selectedZone ? 'text-green-600' : 'text-gray-400'
                        }`}
                    />
                </div>
            </button>

            {/* Panel desplegable con zonas */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden"
                    >
                        {/* Barra de búsqueda */}
                        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
                            <div className="relative">
                                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Buscar por zona o distrito..."
                                    className="w-full pl-10 pr-4 py-2.5 text-sm border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-400"
                                    style={{ fontSize: '16px' }}
                                />
                            </div>
                        </div>

                        {/* Lista de zonas */}
                        <div className="max-h-96 overflow-y-auto">
                            {filteredZones ? (
                                // Resultados de búsqueda
                                <div className="p-2">
                                    {filteredZones.length > 0 ? (
                                        filteredZones.map((zone) => (
                                            <ZoneCard
                                                key={zone.id}
                                                zone={zone}
                                                isSelected={selectedZone === zone.id}
                                                onSelect={handleZoneSelect}
                                            />
                                        ))
                                    ) : (
                                        <div className="p-8 text-center">
                                            <p className="text-gray-500">No se encontraron zonas</p>
                                            <p className="text-sm text-gray-400 mt-1">Intenta con otro término de búsqueda</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Vista por provincias
                                <div>
                                    {Object.entries(zonesByProvince).map(([province, zones]) => (
                                        <ProvinceSection
                                            key={province}
                                            province={province}
                                            zones={zones}
                                            selectedZone={selectedZone}
                                            isExpanded={expandedProvince === province}
                                            onToggle={() => setExpandedProvince(expandedProvince === province ? null : province)}
                                            onZoneSelect={handleZoneSelect}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ProvinceSection({ province, zones, selectedZone, isExpanded, onToggle, onZoneSelect }) {
    const colors = PROVINCE_COLORS[province] || PROVINCE_COLORS['Otro'];
    const hasSelectedZone = zones.some(z => z.id === selectedZone);

    return (
        <div className="border-b border-gray-100 last:border-b-0">
            <button
                type="button"
                onClick={onToggle}
                className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${colors.hover}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
                        <MapPin size={16} className="text-white" />
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-gray-900">{province}</p>
                        <p className="text-xs text-gray-500">{zones.length} zona{zones.length !== 1 ? 's' : ''}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasSelectedZone && (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                            <Check size={14} className="text-white" />
                        </div>
                    )}
                    {isExpanded ? (
                        <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                        <ChevronDown size={18} className="text-gray-400" />
                    )}
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className={`p-2 ${colors.bg} space-y-1`}>
                            {zones.map((zone) => (
                                <ZoneCard
                                    key={zone.id}
                                    zone={zone}
                                    isSelected={selectedZone === zone.id}
                                    onSelect={onZoneSelect}
                                    provinceColor={colors}
                                />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ZoneCard({ zone, isSelected, onSelect, provinceColor }) {
    const colors = provinceColor || PROVINCE_COLORS[zone.province] || PROVINCE_COLORS['Otro'];

    return (
        <motion.button
            type="button"
            onClick={() => onSelect(zone.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full p-3 rounded-xl text-left transition-all ${
                isSelected
                    ? `bg-gradient-to-br ${colors.gradient} text-white shadow-lg`
                    : `bg-white border-2 ${colors.border} hover:shadow-md`
            }`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-white/20' : `bg-gradient-to-br ${colors.gradient}`
                    }`}>
                        <Truck size={18} className={isSelected ? 'text-white' : 'text-white'} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${
                            isSelected ? 'text-white' : 'text-gray-900'
                        }`}>
                            {zone.name}
                        </p>
                        {zone.areas.length > 0 && (
                            <p className={`text-xs truncate ${
                                isSelected ? 'text-white/80' : 'text-gray-500'
                            }`}>
                                {zone.areas.slice(0, 2).join(', ')}
                                {zone.areas.length > 2 && '...'}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${
                        isSelected
                            ? 'bg-white/20 text-white'
                            : `${colors.bg} ${colors.text}`
                    }`}>
                        {zone.cost !== null ? `₡${zone.cost.toLocaleString('es-CR')}` : 'Consultar'}
                    </div>
                    {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                            <Check size={14} className={colors.text} />
                        </div>
                    )}
                </div>
            </div>
        </motion.button>
    );
}
