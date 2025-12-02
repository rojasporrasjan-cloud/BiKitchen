import React, { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Search,
    Phone,
    Mail,
    Calendar,
    Edit2,
    Trash2,
    Eye,
    Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase/config';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    deleteDoc,
    doc
} from 'firebase/firestore';

export default function ClientsView() {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [loading, setLoading] = useState(true);

    // Cargar clientes desde Firebase
    useEffect(() => {
        const q = query(collection(db, "clientes"), orderBy("nombre", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const clientsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setClients(clientsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching clients:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredClients = clients.filter(client =>
        client.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.telefono?.includes(searchTerm) ||
        client.correo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddClient = async (clientData) => {
        try {
            await addDoc(collection(db, "clientes"), {
                ...clientData,
                fechaRegistro: new Date().toISOString(),
                totalPedidos: 0
            });
            setShowAddModal(false);
        } catch (error) {
            console.error("Error adding client:", error);
        }
    };

    const handleDeleteClient = async (clientId) => {
        if (window.confirm('¿Estás seguro de eliminar este cliente?')) {
            try {
                await deleteDoc(doc(db, "clientes", clientId));
            } catch (error) {
                console.error("Error deleting client:", error);
            }
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Clientes</h1>
                    <p className="text-sm text-gray-500 mt-1">Gestión de base de clientes</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus size={16} />
                    Nuevo Cliente
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Total Clientes</span>
                        <Users className="text-blue-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{clients.length}</div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Activos Este Mes</span>
                        <Calendar className="text-green-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                        {clients.filter(c => c.totalPedidos > 0).length}
                    </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500">Nuevos (7 días)</span>
                        <Plus className="text-purple-600" size={20} />
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                        {clients.filter(c => {
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return new Date(c.fechaRegistro) > weekAgo;
                        }).length}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o correo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-sm"
                    />
                </div>
            </div>

            {/* Clients Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                    {filteredClients.map((client) => (
                        <motion.div
                            key={client.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                                        {client.nombre?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{client.nombre}</h3>
                                        <span className="text-xs text-gray-500">
                                            {client.totalPedidos || 0} pedidos
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Phone size={14} className="text-gray-400" />
                                    <span>{client.telefono}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Mail size={14} className="text-gray-400" />
                                    <span className="truncate">{client.correo}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => setSelectedClient(client)}
                                    className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Eye size={14} />
                                    Ver
                                </button>
                                <button className="flex-1 py-2 px-3 bg-green-50 text-green-600 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-1">
                                    <Copy size={14} />
                                    Repetir
                                </button>
                                <button
                                    onClick={() => handleDeleteClient(client.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredClients.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No se encontraron clientes</p>
                </div>
            )}

            {/* Add Client Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-xl p-6 max-w-md w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Nuevo Cliente</h2>
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                const formData = new FormData(e.target);
                                handleAddClient({
                                    nombre: formData.get('nombre'),
                                    telefono: formData.get('telefono'),
                                    correo: formData.get('correo'),
                                    direccion: formData.get('direccion')
                                });
                            }}>
                                <div className="space-y-4">
                                    <input
                                        name="nombre"
                                        type="text"
                                        placeholder="Nombre completo"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                    />
                                    <input
                                        name="telefono"
                                        type="tel"
                                        placeholder="Teléfono"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                    />
                                    <input
                                        name="correo"
                                        type="email"
                                        placeholder="Correo electrónico"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                    />
                                    <textarea
                                        name="direccion"
                                        placeholder="Dirección de entrega"
                                        rows="2"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-2 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 px-4 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors"
                                    >
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
