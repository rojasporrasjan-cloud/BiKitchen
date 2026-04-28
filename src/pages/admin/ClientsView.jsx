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
    UserPlus,
    MessageSquare,
    RefreshCw,
    Globe,
    Bell,
    Send,
    CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase/config';
import { upsertClient, sendClientNotification } from '../../services/clientService';
import { sendBulkEmail } from '../../services/emailNotifications';
import toast from 'react-hot-toast';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    deleteDoc,
    doc,
    getDocs,
    where
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

    // Global Actions state
    const [showGlobalModal, setShowGlobalModal] = useState(false);
    const [globalType, setGlobalType] = useState('popup'); // popup, email
    const [globalTitle, setGlobalTitle] = useState('');
    const [globalMessage, setGlobalMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const [loading, setLoading] = useState(true);

    // Cargar clientes desde Firebase
    useEffect(() => {
        // LIMITAR LECTITRAS: Cargar hasta 150 clientes
        const q = query(collection(db, "clientes"), orderBy("nombre", "asc"), limit(150));

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

    const handleMigrateClients = async () => {
        if (!window.confirm('Esto registrará/actualizará todos los clientes basados en los pedidos históricos. ¿Continuar?')) return;

        const tid = toast.loading('Migrando clientes...');
        try {
            let processed = 0;
            const uniqueClients = new Map();
            const pedidosSnap = await getDocs(collection(db, "pedidos"));
            const ordersSnap = await getDocs(collection(db, "orders"));

            const allOrders = [
                ...pedidosSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                ...ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
            ];

            console.log(`[Migration] Total pedidos encontrados: ${allOrders.length}`);

            allOrders.forEach(order => {
                const nombre = order.cliente || order.client || order.details?.name;
                const rawTel = (order.telefono || order.details?.phone || '');
                const telefono = rawTel.replace(/[^0-9]/g, '');
                const correo = (order.correo || order.details?.email || '').toLowerCase().trim();

                if (!nombre) return;
                const key = correo || `tel_${telefono}`;
                if (!key || key === 'tel_') return;

                if (!uniqueClients.has(key)) {
                    uniqueClients.set(key, {
                        nombre,
                        telefono,
                        correo,
                        direccion: order.direccion || order.details?.address,
                        orderCount: 1
                    });
                } else {
                    const existing = uniqueClients.get(key);
                    existing.orderCount += 1;
                    if (!existing.direccion && (order.direccion || order.details?.address)) {
                        existing.direccion = order.direccion || order.details?.address;
                    }
                }
            });

            console.log(`[Migration] Iniciando upsert de ${uniqueClients.size} clientes únicos`);

            for (const [key, data] of uniqueClients) {
                const { orderCount, ...clientInfo } = data;
                await upsertClient(clientInfo, false, { manualTotalOrders: orderCount });
                processed++;
            }

            toast.success(`Migración completada: ${processed} clientes registrados`, { id: tid });
        } catch (error) {
            console.error("Error migrating clients:", error);
            toast.error("Error durante la migración", { id: tid });
        }
    };

    const handleVerifyAccounts = async () => {
        const tid = toast.loading('Verificando cuentas de sistema y pedidos...');
        try {
            const pedidosSnap = await getDocs(collection(db, "pedidos"));
            const ordersLegacySnap = await getDocs(collection(db, "orders"));

            const allOrders = [
                ...pedidosSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                ...ordersLegacySnap.docs.map(d => ({ id: d.id, ...d.data() }))
            ];

            console.log(`[CRM] Total historial: ${allOrders.length} pedidos`);

            let updated = 0;
            for (const client of clients) {
                if (client.correo || client.telefono) {
                    const cPhone = (client.telefono || '').replace(/[^0-9]/g, '');
                    const cEmail = (client.correo || '').toLowerCase().trim();

                    const count = allOrders.filter(o => {
                        const oPhone = (o.details?.phone || o.telefono || '').replace(/[^0-9]/g, '');
                        const oEmail = (o.details?.email || o.correo || '').toLowerCase().trim();

                        // Comparación robusta de correo
                        const emailMatch = cEmail && oEmail === cEmail;

                        // Comparación robusta de teléfono (últimos 8 dígitos para evitar problemas con 506)
                        const phoneMatch = cPhone && oPhone && (
                            oPhone === cPhone ||
                            (oPhone.length >= 8 && cPhone.length >= 8 && oPhone.slice(-8) === cPhone.slice(-8))
                        );

                        return emailMatch || phoneMatch;
                    }).length;

                    await upsertClient(client, false, { manualTotalOrders: count });
                    updated++;
                }
            }
            toast.success(`Verificación completa: ${updated} clientes revisados`, { id: tid });
        } catch (error) {
            console.error("Error verifying accounts:", error);
            toast.error("Error en verificación", { id: tid });
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
            tieneCuenta: client.tieneCuenta,
            clienteDb: client // It IS a registered client
        });
        setProfileRelatedOrders(related);
        setProfilePoints(null); // Placeholder
        setShowProfileModal(true);
    };

    const handleGlobalAction = async () => {
        if (!globalMessage) return toast.error('El mensaje es obligatorio');

        const count = clients.length;
        if (count === 0) return toast.error('No hay clientes en la lista');

        const confirmMsg = globalType === 'popup'
            ? `¿Enviar notificación popup a ${count} clientes?`
            : `¿Enviar correo masivo a ${count} clientes?`;

        if (!window.confirm(confirmMsg)) return;

        setIsProcessing(true);
        const tid = toast.loading('Procesando envío global...');

        try {
            if (globalType === 'popup') {
                // Enviar a todos los clientes (Popup)
                const promises = clients.map(c =>
                    sendClientNotification(c.id, {
                        title: globalTitle || 'Novedades de BiKitchen',
                        message: globalMessage,
                        type: 'popup'
                    })
                );
                await Promise.all(promises);
                toast.success(`Popups enviados a ${count} clientes`, { id: tid });
            } else {
                // Enviar correo masivo
                const recipients = clients.map(c => c.correo).filter(Boolean);
                if (recipients.length === 0) throw new Error('Ningún cliente tiene correo registrado');

                const result = await sendBulkEmail(recipients, globalTitle, globalMessage);
                if (result.success) {
                    toast.success(`Correos enviados: ${result.count}/${recipients.length}`, { id: tid });
                } else {
                    throw new Error(result.error);
                }
            }

            setShowGlobalModal(false);
            setGlobalMessage('');
            setGlobalTitle('');
        } catch (error) {
            console.error("[GlobalAction] Error:", error);
            toast.error(`Error: ${error.message}`, { id: tid });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
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
                    </button>,
                    <button
                        key="migrate"
                        onClick={handleMigrateClients}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md transition-colors"
                    >
                        <RefreshCw size={16} /> Sincronizar Historial
                    </button>,
                    <button
                        key="global"
                        onClick={() => setShowGlobalModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 shadow-md transition-colors"
                    >
                        <Globe size={16} /> Envío Global
                    </button>,
                    <button
                        key="verify-accounts"
                        onClick={handleVerifyAccounts}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700 shadow-md transition-colors"
                    >
                        <UserPlus size={16} /> Validar Cuentas
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
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-gray-500 font-medium">
                                                {client.totalPedidos || 0} pedidos
                                            </span>
                                            {client.tieneCuenta ? (
                                                <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 border border-green-200">
                                                    <CheckCircle2 size={8} /> SISTEMA
                                                </span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-500 text-[9px] px-1.5 py-0.5 rounded-full font-bold border border-gray-200">
                                                    INVITADO
                                                </span>
                                            )}
                                        </div>
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
                                    <span className="truncate">{client.correo || 'Sin correo'}</span>
                                </div>
                            </div>

                            {/* Contact Shortcuts */}
                            <div className="flex gap-2 mb-4">
                                <a
                                    href={`https://wa.me/506${(client.telefono || '').replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-all border border-green-100"
                                >
                                    <MessageSquare size={14} />
                                    WhatsApp
                                </a>
                                <a
                                    href={`mailto:${client.correo}`}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all border border-blue-100"
                                >
                                    <Mail size={14} />
                                    Gmail
                                </a>
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

            {/* Global Action Modal */}
            <AnimatePresence>
                {showGlobalModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                                    <Globe className="text-orange-500" /> Acciones Globales
                                </h2>
                                <button onClick={() => setShowGlobalModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                                    <Edit2 size={20} />
                                </button>
                            </div>

                            {/* Type Selector */}
                            <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
                                <button
                                    onClick={() => setGlobalType('popup')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${globalType === 'popup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Bell size={18} /> Notificación (Popup)
                                </button>
                                <button
                                    onClick={() => setGlobalType('email')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${globalType === 'email' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    <Mail size={18} /> Email Masivo
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Asunto / Título</label>
                                    <input
                                        type="text"
                                        value={globalTitle}
                                        onChange={(e) => setGlobalTitle(e.target.value)}
                                        placeholder={globalType === 'popup' ? "Ej: ¡Menu de Semana Santa!" : "Asunto del correo..."}
                                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:outline-none text-sm transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Mensaje</label>
                                    <textarea
                                        value={globalMessage}
                                        onChange={(e) => setGlobalMessage(e.target.value)}
                                        placeholder="Escribe el contenido del mensaje aquí..."
                                        rows="4"
                                        className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-blue-500 focus:outline-none text-sm transition-colors resize-none"
                                    />
                                </div>

                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                                    <p className="text-[11px] text-amber-700 font-medium">
                                        <strong>⚠️ Aviso:</strong> Esta acción enviará el mensaje a los <strong>{clients.length}</strong> clientes listados actualmente.
                                    </p>
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowGlobalModal(false)}
                                        className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-black hover:bg-gray-200 transition-all active:scale-95"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleGlobalAction}
                                        disabled={isProcessing}
                                        className={`flex-[2] py-4 rounded-2xl font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${globalType === 'popup' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20'}`}
                                    >
                                        {isProcessing ? 'Procesando...' : globalType === 'popup' ? 'Enviar Notificación' : 'Enviar Correo Global'}
                                    </button>
                                </div>
                            </div>
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
