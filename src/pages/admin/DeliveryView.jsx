import React, { useState } from 'react';
import { Truck, MapPin, Phone, Check, User, Navigation, Clock, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DRIVERS = [
    { id: 'd1', name: 'Carlos R.', status: 'available', avatar: '👨🏻‍✈️' },
    { id: 'd2', name: 'Miguel A.', status: 'busy', avatar: '👷🏽‍♂️' },
    { id: 'd3', name: 'Ana P.', status: 'available', avatar: '👩🏻‍✈️' }
];

const ZONES = [
    {
        id: 'sj',
        name: 'San José Centro',
        driver: 'd1',
        deliveries: [
            { id: 1, client: "Juan Pérez", address: "Av. Segunda, Calle 5", phone: "8888-1111", status: "pending", time: "10:00 AM" },
            { id: 2, client: "Maria Salas", address: "Barrio Amón, Casa 22", phone: "8888-2222", status: "delivered", time: "09:30 AM" }
        ]
    },
    {
        id: 'he',
        name: 'Heredia',
        driver: 'd2',
        deliveries: [
            { id: 3, client: "Pedro Sánchez", address: "San Joaquín, Flores", phone: "8888-3333", status: "in_transit", time: "11:15 AM" },
            { id: 4, client: "Luisa Mora", address: "Belén, La Ribera", phone: "8888-4444", status: "pending", time: "11:45 AM" },
            { id: 5, client: "Diego Ruiz", address: "Mercedes Norte", phone: "8888-5555", status: "pending", time: "12:30 PM" }
        ]
    },
    {
        id: 'al',
        name: 'Alajuela',
        driver: null,
        deliveries: [
            { id: 6, client: "Carmen Vega", address: "El Coyol, Alajuela", phone: "8888-6666", status: "pending", time: "02:00 PM" }
        ]
    }
];

export default function DeliveryView() {
    const [zones, setZones] = useState(ZONES);

    const updateStatus = (zoneId, deliveryId, newStatus) => {
        setZones(zones.map(zone => {
            if (zone.id !== zoneId) return zone;
            return {
                ...zone,
                deliveries: zone.deliveries.map(d =>
                    d.id === deliveryId ? { ...d, status: newStatus } : d
                )
            };
        }));
    };

    const assignDriver = (zoneId, driverId) => {
        setZones(zones.map(zone =>
            zone.id === zoneId ? { ...zone, driver: driverId } : zone
        ));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-gray-100 text-gray-600';
            case 'in_transit': return 'bg-blue-100 text-blue-700';
            case 'delivered': return 'bg-green-100 text-green-700';
            case 'failed': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'in_transit': return 'En Ruta';
            case 'delivered': return 'Entregado';
            case 'failed': return 'Fallido';
            default: return status;
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Truck className="text-orange-500" size={32} />
                        Logística de Despacho
                    </h1>
                    <p className="text-gray-500">Gestión de rutas y asignación de choferes.</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-orange-500">
                            {zones.reduce((acc, z) => acc + z.deliveries.filter(d => d.status === 'delivered').length, 0)}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Entregados</div>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-blue-600">
                            {zones.reduce((acc, z) => acc + z.deliveries.filter(d => d.status === 'in_transit').length, 0)}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">En Ruta</div>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-center">
                        <div className="text-2xl font-bold text-gray-400">
                            {zones.reduce((acc, z) => acc + z.deliveries.filter(d => d.status === 'pending').length, 0)}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">Pendientes</div>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Zones List */}
                <div className="lg:col-span-2 space-y-6">
                    {zones.map((zone) => (
                        <div key={zone.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Zone Header */}
                            <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <MapPin size={20} className="text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{zone.name}</h3>
                                        <p className="text-xs text-gray-500">{zone.deliveries.length} entregas programadas</p>
                                    </div>
                                </div>

                                {/* Driver Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 uppercase font-bold">Chofer:</span>
                                    <select
                                        className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-orange-500"
                                        value={zone.driver || ''}
                                        onChange={(e) => assignDriver(zone.id, e.target.value)}
                                    >
                                        <option value="">Sin asignar</option>
                                        {DRIVERS.map(d => (
                                            <option key={d.id} value={d.id}>{d.avatar} {d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Deliveries List */}
                            <div className="divide-y divide-gray-100">
                                {zone.deliveries.map((delivery) => (
                                    <div key={delivery.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center group">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-gray-800">{delivery.client}</span>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${getStatusColor(delivery.status)}`}>
                                                    {getStatusLabel(delivery.status)}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-500 flex items-center gap-4">
                                                <span className="flex items-center gap-1"><Navigation size={14} /> {delivery.address}</span>
                                                <span className="flex items-center gap-1"><Clock size={14} /> {delivery.time}</span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            {delivery.status === 'pending' && (
                                                <button
                                                    onClick={() => updateStatus(zone.id, delivery.id, 'in_transit')}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                    title="Iniciar Ruta"
                                                >
                                                    <Truck size={18} />
                                                </button>
                                            )}
                                            {delivery.status === 'in_transit' && (
                                                <button
                                                    onClick={() => updateStatus(zone.id, delivery.id, 'delivered')}
                                                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                    title="Marcar Entregado"
                                                >
                                                    <Check size={18} />
                                                </button>
                                            )}
                                            <a
                                                href={`tel:${delivery.phone}`}
                                                className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                                                title="Llamar Cliente"
                                            >
                                                <Phone size={18} />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Drivers Status Sidebar */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <User size={20} className="text-orange-500" />
                            Estado de Flota
                        </h3>
                        <div className="space-y-4">
                            {DRIVERS.map(driver => (
                                <div key={driver.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl">
                                            {driver.avatar}
                                        </div>
                                        <div>
                                            <div className="font-bold text-sm text-gray-800">{driver.name}</div>
                                            <div className="text-xs text-gray-500">
                                                {zones.find(z => z.driver === driver.id)?.name || 'Sin ruta asignada'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-2.5 h-2.5 rounded-full ${driver.status === 'available' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                        <div className="flex items-start gap-3">
                            <ShieldAlert className="text-blue-600 shrink-0" size={24} />
                            <div>
                                <h4 className="font-bold text-blue-800 text-sm mb-1">Aviso de Tráfico</h4>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Se reporta congestión alta en la Ruta 27 hacia Alajuela. Considerar rutas alternas para las entregas de la tarde.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
