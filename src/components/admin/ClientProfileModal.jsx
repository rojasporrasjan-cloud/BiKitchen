import React from 'react';
import { nivelPorPuntos } from '../../config/loyalty';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    User,
    Phone,
    Mail,
    MapPin,
    Calendar,
    ShoppingBag,
    Award,
    Star,
    TrendingUp,
    ExternalLink,
    Send,
    Plus,
    Minus,
    Gift,
    Bell,
    CheckCircle2
} from 'lucide-react';
import { sendClientNotification, updateClientPoints } from '../../services/clientService';
import toast from 'react-hot-toast';

/**
 * Modal to display detailed client profile and history.
 * 
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - clientProfile: object { nombre, telefono, correo, ... }
 * - clientPoints: object (optional loyalty points)
 * - relatedOrders: array of order objects
 */
export default function ClientProfileModal({ isOpen, onClose, clientProfile, clientPoints, relatedOrders }) {
    const [activeTab, setActiveTab] = React.useState('history'); // history, crm
    const [notifTitle, setNotifTitle] = React.useState('');
    const [notifMessage, setNotifMessage] = React.useState('');
    const [pointsDelta, setPointsDelta] = React.useState(0);
    const [pointsReason, setPointsReason] = React.useState('');
    const [sending, setSending] = React.useState(false);

    if (!isOpen || !clientProfile) return null;

    const { nombre, telefono, correo, direccion, totalOrders, totalSpent, deliveredOrders, coupons, clienteDb, tieneCuenta } = clientProfile;
    
    // El saldo REAL vive en la colección `loyalty`, en el campo `points`.
    //
    // Acá se leía `clientPoints?.puntos_actuales`, un nombre de campo que ese
    // documento no tiene, así que siempre caía al respaldo `clienteDb.totalPuntos`
    // — una copia paralela en `clientes` que se desincroniza. En el caso de
    // Alexandra Mora el admin mostraba 2289 pts (los de UN pedido) mientras su
    // saldo real era 0, y ella veía Bronce sin puntos. La clienta tenía razón.
    // `currentPoints` primero: es el campo canonico, el que ve el cliente.
    const puntosActuales = clientPoints?.currentPoints
        ?? clientPoints?.points
        ?? clienteDb?.totalPuntos
        ?? 0;

    // El nivel sale de la tabla oficial del proyecto, no de umbrales propios.
    // Acá decía "Oro" con más de 1000 puntos, cuando Oro arranca en 5000: el
    // admin le prometía a Gina un nivel que el cliente no tenía.
    const nivelCliente = nivelPorPuntos(clientPoints?.totalEarned ?? puntosActuales);

    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CR', {
            style: 'currency',
            currency: 'CRC',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    // Helper for dates
    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-CR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleSendNotification = async () => {
        if (!notifMessage) return toast.error('Escribe un mensaje');
        setSending(true);
        try {
            // El clientId en la base de datos es el id del documento en 'clientes'
            const cid = clientProfile.clienteDb?.id || clientProfile.correo || `tel_${clientProfile.telefono}`;
            await sendClientNotification(cid, {
                title: notifTitle || 'Notificación de BiKitchen',
                message: notifMessage,
                type: 'popup'
            });
            toast.success('Notificación enviada');
            setNotifTitle('');
            setNotifMessage('');
        } catch (error) {
            toast.error('Error al enviar notificación');
        } finally {
            setSending(false);
        }
    };

    const handleUpdatePoints = async () => {
        if (pointsDelta === 0) return toast.error('Ingresa una cantidad de puntos');
        setSending(true);
        try {
            const cid = clientProfile.clienteDb?.id || clientProfile.correo || `tel_${clientProfile.telefono}`;
            await updateClientPoints(cid, pointsDelta, pointsReason);
            toast.success('Puntos actualizados');
            setPointsDelta(0);
            setPointsReason('');
        } catch (error) {
            toast.error('Error al actualizar puntos');
        } finally {
            setSending(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                onClick={onClose}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex justify-between items-start shrink-0">
                        <div className="flex items-center gap-4 text-white">
                            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-2xl font-bold border-2 border-white/30">
                                {nombre?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{nombre}</h2>
                                <div className="flex items-center gap-2 text-blue-100 text-sm mt-1">
                                    {tieneCuenta ? (
                                        <span className="bg-green-400 text-white px-2 py-0.5 rounded-full border border-green-300 shadow-sm flex items-center gap-1 font-bold text-[10px] tracking-tight">
                                            <CheckCircle2 size={12} /> CUENTA DE SISTEMA
                                        </span>
                                    ) : (
                                        <span className="bg-white/10 px-2 py-0.5 rounded-full text-[10px] font-bold">INVITADO (SIN CUENTA)</span>
                                    )}
                                    {totalOrders > 5 && (
                                        <span className="bg-amber-400/20 text-amber-100 px-2 py-0.5 rounded-full border border-amber-400/30 flex items-center gap-1 text-[10px]">
                                            <Star size={12} /> Frecuente
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content Scrollable */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Left Column: Info & Stats */}
                            <div className="space-y-6">
                                {/* Contact Info */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Contacto</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Phone size={16} />
                                            </div>
                                            <span className="font-medium">{telefono || 'Sin teléfono'}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-700">
                                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                                                <Mail size={16} />
                                            </div>
                                            <span className="text-sm truncate" title={correo}>{correo || 'Sin correo'}</span>
                                        </div>
                                        <div className="flex items-start gap-3 text-gray-700">
                                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                                                <MapPin size={16} />
                                            </div>
                                            <span className="text-sm">{direccion || 'Sin dirección registrada'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Lifetime Stats */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Estadísticas</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="text-xs text-gray-500 mb-1">Pedidos Totales</div>
                                            <div className="text-xl font-bold text-gray-900">{totalOrders}</div>
                                        </div>
                                        <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                            <div className="text-xs text-green-600 mb-1">Entregados</div>
                                            <div className="text-xl font-bold text-green-700">{deliveredOrders}</div>
                                        </div>
                                        <div className="col-span-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <TrendingUp size={14} className="text-blue-600" />
                                                <div className="text-xs text-blue-600 font-medium">Inversión Total</div>
                                            </div>
                                            <div className="text-2xl font-bold text-blue-700">{formatCurrency(totalSpent)}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Loyalty Points */}
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-100">
                                    <h3 className="text-sm font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <Award size={16} /> Puntos de Lealtad
                                    </h3>
                                    <div className="text-3xl font-bold text-amber-600 mb-1">
                                        {puntosActuales} pts
                                    </div>
                                    <div className="text-xs text-amber-600/80">
                                        Nivel: {nivelCliente?.name || 'Bronce'}
                                    </div>
                                </div>

                                {/* Admin Navigation */}
                                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => setActiveTab('history')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                                    >
                                        <ShoppingBag size={18} />
                                        <span className="font-semibold text-sm">Historial de Pedidos</span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('crm')}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${activeTab === 'crm' ? 'bg-orange-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                                    >
                                        <Bell size={18} />
                                        <span className="font-semibold text-sm">Acciones CRM (Popups)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right Column: Dynamic Tabs */}
                            <div className="md:col-span-2 space-y-6">
                                {activeTab === 'crm' ? (
                                    <div className="space-y-6">
                                        {/* Send Message Form */}
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <Send size={20} className="text-blue-500" />
                                                Enviar Notificación Emergente
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título (Opcional)</label>
                                                    <input
                                                        type="text"
                                                        value={notifTitle}
                                                        onChange={(e) => setNotifTitle(e.target.value)}
                                                        placeholder="Ej: ¡Nuevo Regalo para ti!"
                                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mensaje</label>
                                                    <textarea
                                                        value={notifMessage}
                                                        onChange={(e) => setNotifMessage(e.target.value)}
                                                        placeholder="Escribe el mensaje que el cliente verá en un popup..."
                                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 text-sm h-24 resize-none"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleSendNotification}
                                                    disabled={sending}
                                                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                                >
                                                    {sending ? 'Enviando...' : 'Enviar Notificación'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Adjust Points Form */}
                                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <Award size={20} className="text-amber-500" />
                                                Regalar BiPuntos / Compensación
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex gap-4">
                                                    <div className="flex-1">
                                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Puntos (+ o -)</label>
                                                        <input
                                                            type="number"
                                                            value={pointsDelta}
                                                            onChange={(e) => setPointsDelta(parseInt(e.target.value) || 0)}
                                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 text-sm font-bold"
                                                        />
                                                    </div>
                                                    <div className="flex items-end gap-2">
                                                        <button onClick={() => setPointsDelta(prev => prev + 100)} className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 hover:bg-amber-100"><Plus size={18} /></button>
                                                        <button onClick={() => setPointsDelta(prev => prev - 100)} className="p-3 bg-gray-50 text-gray-600 rounded-xl border border-gray-200 hover:bg-gray-100"><Minus size={18} /></button>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo del Regalo</label>
                                                    <input
                                                        type="text"
                                                        value={pointsReason}
                                                        onChange={(e) => setPointsReason(e.target.value)}
                                                        placeholder="Ej: Regalo de cumpleaños o cortesía por retraso"
                                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 text-sm"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleUpdatePoints}
                                                    disabled={sending}
                                                    className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                                >
                                                    {sending ? 'Procesando...' : 'Aplicar Regalo / Ajuste'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                {/* Coupons Used */}
                                {coupons && coupons.length > 0 && (
                                    <div className="mb-4">
                                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cupones Usados</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {coupons.map((c, i) => (
                                                <span key={i} className="px-2 py-1 bg-pink-50 text-pink-600 rounded-md text-xs font-medium border border-pink-100">
                                                    {c}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Recent Orders List */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <ShoppingBag size={18} className="text-gray-400" />
                                            Historial de Pedidos
                                        </h3>
                                        <span className="text-xs text-gray-500">{relatedOrders.length} registros found</span>
                                    </div>

                                    <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                                        {relatedOrders.length === 0 ? (
                                            <div className="p-8 text-center text-gray-400">
                                                No hay historial de pedidos disponible.
                                            </div>
                                        ) : (
                                            relatedOrders
                                                .sort((a, b) => {
                                                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
                                                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
                                                    return dateB - dateA;
                                                })
                                                .map((order) => {
                                                    const statusColors = {
                                                        pending: 'bg-yellow-100 text-yellow-700',
                                                        confirmed: 'bg-blue-100 text-blue-700',
                                                        delivered: 'bg-green-100 text-green-700',
                                                        cancelled: 'bg-red-100 text-red-700',
                                                        in_transit: 'bg-purple-100 text-purple-700'
                                                    };

                                                    return (
                                                        <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <div className="font-semibold text-gray-800 text-sm">
                                                                        #{order.displayId || 'ID'}
                                                                        <span className="text-gray-400 font-normal ml-2">
                                                                            {formatDate(order.createdAt)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                                        Entrega: {order.fecha_entrega || order.details?.fechaEntrega || 'Pendiente'}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className="font-bold text-gray-900 text-sm">
                                                                        {formatCurrency(order.totalValue || order.total || 0)}
                                                                    </div>
                                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase mt-1 ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                                                                        {order.status}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Detailed Order Info */}
                                                            <div className="grid grid-cols-2 gap-4 text-[11px] text-gray-500 bg-gray-50/50 p-2 rounded-lg border border-gray-100 mb-2">
                                                                <div>
                                                                    <span className="font-bold text-gray-700">Zona:</span> {order.zona_envio || order.zona || order.details?.zona || 'N/A'}
                                                                </div>
                                                                <div>
                                                                    <span className="font-bold text-gray-700">Pago:</span> {order.metodoPago || order.paymentMethod}
                                                                </div>
                                                                <div className="col-span-2 border-t border-gray-200 mt-1 pt-1">
                                                                    <span className="font-bold text-gray-700">Dir:</span> {order.direccion}
                                                                </div>
                                                                {order.cupon && (
                                                                    <div className="col-span-2">
                                                                        <span className="font-bold text-pink-600">Cupón:</span> {order.cupon}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Order Items Preview */}
                                                            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 mt-2">
                                                                {(order.items || order.details?.cart || [])
                                                                    .map(i => `${i.name || 'Item'} (x${i.quantity || 1})`)
                                                                    .join(', ') || 'Detalles no disponibles'}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                                </>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
