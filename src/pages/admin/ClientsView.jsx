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
    Copy,
    UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase/config';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    deleteDoc,
    doc
} from 'firebase/firestore';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { useOrders } from '../../context/OrdersContext';
import ClientProfileModal from '../../components/admin/ClientProfileModal';

export default function ClientsView() {
    const { orders } = useOrders(); // Access global orders for CRM history
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

    // Modal state for Profile
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [profileRelatedOrders, setProfileRelatedOrders] = useState([]);
    const [profilePoints, setProfilePoints] = useState(null);

    const [loading, setLoading] = useState(true);

    // Cargar clientes desde Firebase
    useEffect(() => {
        // LIMITAR LECTITRAS: Solo cargar los primeros 50 clientes por defecto
        const q = query(collection(db, "clientes"), orderBy("nombre", "asc"), limit(50));

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

    const handleViewClient = async (client) => {
        // Find related orders using phone (primary) or email/name
        const cPhone = (client.telefono || '').replace(/[^0-9]/g, '');
        const cEmail = (client.correo || '').toLowerCase();

        const related = orders.filter(o => {
            const oPhone = (o.details?.phone || o.telefono || '').replace(/[^0-9]/g, '');
            const oEmail = (o.details?.email || o.correo || '').toLowerCase();

            if (cPhone && oPhone) return cPhone === oPhone;
            if (cEmail && oEmail) return cEmail === oEmail;
            return false;
        });

        // Calculate Stats
        const totalOrders = related.length;
        const totalSpent = related.reduce((acc, o) => {
            const val = typeof o.totalValue === 'number' ? o.totalValue : (typeof o.total === 'number' ? o.total : 0);
            return acc + val;
        }, 0);
        const deliveredOrders = related.filter(o => ['delivered', 'entregado'].includes(o.status)).length;
        const coupons = Array.from(new Set(related.map(o => o.cupon || o.coupon).filter(Boolean)));

        // Loyalty (Optional fetch)
        let puntos = null;
        // Skipping loyalty fetch for now to keep it snappy, or add it if needed later

        setProfileData({
            nombre: client.nombre,
            telefono: client.telefono,
            correo: client.correo,
            direccion: client.direccion,
            totalOrders,
            totalSpent,
            deliveredOrders,
            coupons,
            clienteDb: client // It IS a registered client
        });
        setProfileRelatedOrders(related);
        setProfilePoints(null); // Placeholder
        setShowProfileModal(true);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <AdminPageHeader
                icon={Users}
                title="Clientes"
                subtitle="Gestión completa de tu base de clientes"
                gradient="from-blue-500 via-cyan-400 to-teal-400"
                stats={[
                    { value: clients.length, label: 'Total' },
                    { value: clients.filter(c => c.totalPedidos > 0).length, label: 'Activos' },
                    {
                        value: clients.filter(c => {
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return new Date(c.fechaRegistro) > weekAgo;
                        }).length, label: 'Nuevos (7d)'
                    }
                ]}
                actions={[
                    <button
                        key="add"
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-blue-600 text-sm font-semibold hover:bg-blue-50 shadow-md transition-colors"
                    >
                        <Plus size={16} /> Nuevo Cliente
                    </button>
                ]}
            />

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-white via-blue-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Total Clientes</span>
                        <div className="p-2 bg-gradient-to-br from-blue-400 to-cyan-500 text-white rounded-xl shadow-lg">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{clients.length}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-white via-green-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Activos</span>
                        <div className="p-2 bg-gradient-to-br from-green-400 to-emerald-500 text-white rounded-xl shadow-lg">
                            <Calendar size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {clients.filter(c => c.totalPedidos > 0).length}
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-white via-purple-50/20 to-white p-6 rounded-3xl shadow-xl border border-gray-100/50 hover:shadow-2xl hover:scale-105 transition-all duration-300"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 font-medium">Nuevos (7d)</span>
                        <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-500 text-white rounded-xl shadow-lg">
                            <UserPlus size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900">
                        {clients.filter(c => {
                            const weekAgo = new Date();
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            return new Date(c.fechaRegistro) > weekAgo;
                        }).length}
                    </div>
                </motion.div>
            </motion.div>

            {/* Search */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-white via-gray-50/30 to-white rounded-3xl p-6 shadow-xl border border-gray-100/50"
            >
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o correo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm transition-all"
                    />
                </div>
            </motion.div>

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
                                    onClick={() => handleViewClient(client)}
                                    className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Eye size={14} />
                                    Ver Perfil
                                </button>
                                {/* Removed 'Repetir' button as it was non-functional */}
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

            {/* NEW: Client Profile Modal */}
            <ClientProfileModal
                isOpen={showProfileModal}
                onClose={() => setShowProfileModal(false)}
                clientProfile={profileData}
                relatedOrders={profileRelatedOrders}
                clientPoints={profilePoints}
            />
        </div>
    );
}
