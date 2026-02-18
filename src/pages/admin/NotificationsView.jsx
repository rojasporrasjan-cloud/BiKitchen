import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    Bell, Send, Users, ShoppingBag, Megaphone, 
    Check, X, Loader2, Gift, AlertCircle,
    Clock, CheckCircle, Filter, BellRing
} from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { 
    createNotification, 
    NOTIFICATION_TYPES,
    sendLocalNotification 
} from '../../utils/pushNotifications';
import { useAuth } from '../../context/AuthContext';
import NotificationSettings from '../../components/NotificationSettings';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function NotificationsView() {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('send'); // 'send' | 'history' | 'settings'
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [subscribers, setSubscribers] = useState({ total: 0, admins: 0, users: 0 });
    
    // Form para enviar notificación masiva
    const [formData, setFormData] = useState({
        type: 'custom',
        title: '',
        message: '',
        url: '/',
        target: 'all' // 'all' | 'users' | 'admins'
    });

    useEffect(() => {
        loadSubscribers();
        loadNotificationHistory();
    }, []);

    const loadSubscribers = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'push_subscriptions'));
            let admins = 0;
            let users = 0;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.isAdmin) admins++;
                else users++;
            });

            setSubscribers({ total: admins + users, admins, users });
        } catch (error) {
            console.error('Error loading subscribers:', error);
        }
    };

    const loadNotificationHistory = async () => {
        try {
            const q = query(
                collection(db, 'notifications'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifs);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    };

    const handleSendNotification = async () => {
        if (!formData.title || !formData.message) {
            toast.error('Completa el título y mensaje');
            return;
        }

        setLoading(true);
        try {
            // Obtener suscriptores según el target
            let q;
            if (formData.target === 'admins') {
                q = query(collection(db, 'push_subscriptions'), where('isAdmin', '==', true));
            } else if (formData.target === 'users') {
                q = query(collection(db, 'push_subscriptions'), where('isAdmin', '==', false));
            } else {
                q = query(collection(db, 'push_subscriptions'));
            }

            const snapshot = await getDocs(q);
            let sentCount = 0;

            // Crear notificación para cada suscriptor
            for (const doc of snapshot.docs) {
                const subscriber = doc.data();
                await createNotification(subscriber.userId, 'custom', {
                    title: formData.title,
                    message: formData.message,
                    url: formData.url
                });
                sentCount++;
            }

            toast.success(`Notificación enviada a ${sentCount} usuarios`);
            setFormData({ ...formData, title: '', message: '' });
            loadNotificationHistory();
        } catch (error) {
            console.error('Error sending notification:', error);
            toast.error('Error al enviar notificación');
        }
        setLoading(false);
    };

    const quickNotifications = [
        {
            id: 'promo',
            icon: Gift,
            label: 'Nueva Promoción',
            color: 'bg-pink-100 text-pink-600',
            defaults: {
                title: '🎁 ¡Nueva Promoción!',
                message: 'Tenemos una promoción especial para ti. ¡No te la pierdas!',
                url: '/promociones'
            }
        },
        {
            id: 'menu',
            icon: ShoppingBag,
            label: 'Nuevo Menú',
            color: 'bg-orange-100 text-orange-600',
            defaults: {
                title: '🍽️ ¡Nuevo Menú Semanal!',
                message: 'Ya está disponible el menú de esta semana. ¡Haz tu pedido!',
                url: '/packs'
            }
        },
        {
            id: 'reminder',
            icon: Clock,
            label: 'Recordatorio',
            color: 'bg-blue-100 text-blue-600',
            defaults: {
                title: '⏰ ¡No olvides tu pedido!',
                message: 'Los pedidos cierran pronto. ¿Ya hiciste el tuyo?',
                url: '/packs'
            }
        }
    ];

    const applyQuickNotification = (quick) => {
        setFormData({
            ...formData,
            ...quick.defaults,
            type: quick.id
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <AdminPageHeader
                icon={BellRing}
                title="Notificaciones Push"
                subtitle="Envía notificaciones a tus clientes y gestiona alertas en tiempo real"
                gradient="from-green-500 via-teal-400 to-cyan-400"
                stats={[
                    { value: subscribers.total, label: 'Suscriptores' },
                    { value: subscribers.users, label: 'Usuarios' },
                    { value: notifications.length, label: 'Enviadas' }
                ]}
                actions={[
                    <div key="stats" className="flex gap-3">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
                            <p className="text-xs text-white/80">Admins</p>
                            <p className="text-xl font-bold text-white">{subscribers.admins}</p>
                        </div>
                    </div>
                ]}
            />

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                {[
                    { id: 'send', label: 'Enviar', icon: Send },
                    { id: 'history', label: 'Historial', icon: Clock },
                    { id: 'settings', label: 'Mi Configuración', icon: Bell }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-[2px] ${
                            activeTab === tab.id
                                ? 'text-bikitchen-orange border-bikitchen-orange'
                                : 'text-gray-500 border-transparent hover:text-gray-700'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'send' && (
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Form */}
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100">
                        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                            <Megaphone size={20} />
                            Enviar Notificación
                        </h2>

                        {/* Quick Actions */}
                        <div className="mb-6">
                            <p className="text-sm text-gray-500 mb-2">Plantillas rápidas:</p>
                            <div className="flex flex-wrap gap-2">
                                {quickNotifications.map(quick => (
                                    <button
                                        key={quick.id}
                                        onClick={() => applyQuickNotification(quick)}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ${quick.color} hover:opacity-80 transition-opacity`}
                                    >
                                        <quick.icon size={16} />
                                        {quick.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Destinatarios
                                </label>
                                <select
                                    value={formData.target}
                                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bikitchen-orange/20 focus:border-bikitchen-orange"
                                >
                                    <option value="all">Todos ({subscribers.total})</option>
                                    <option value="users">Solo Clientes ({subscribers.users})</option>
                                    <option value="admins">Solo Admins ({subscribers.admins})</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Título
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Ej: ¡Nueva promoción disponible!"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bikitchen-orange/20 focus:border-bikitchen-orange"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Mensaje
                                </label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    placeholder="Escribe el mensaje de la notificación..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bikitchen-orange/20 focus:border-bikitchen-orange resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    URL de destino
                                </label>
                                <input
                                    type="text"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    placeholder="Ej: /promociones"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bikitchen-orange/20 focus:border-bikitchen-orange"
                                />
                            </div>

                            <button
                                onClick={handleSendNotification}
                                disabled={loading || !formData.title || !formData.message}
                                className="w-full py-3 bg-bikitchen-orange text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 size={20} className="animate-spin" />
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Enviar Notificación
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-white rounded-2xl p-6 border border-gray-100">
                        <h3 className="font-semibold text-gray-900 mb-4">Vista Previa</h3>
                        
                        <div className="bg-gray-100 rounded-xl p-4">
                            <div className="bg-white rounded-lg shadow-lg p-4 max-w-xs">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-bikitchen-orange rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Bell size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">
                                            {formData.title || 'Título de la notificación'}
                                        </p>
                                        <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                                            {formData.message || 'El mensaje aparecerá aquí...'}
                                        </p>
                                        <p className="text-gray-400 text-xs mt-2">
                                            BiKitchen • Ahora
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-4 text-center">
                            Así se verá la notificación en el dispositivo
                        </p>
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl border border-gray-100">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Historial de Notificaciones</h2>
                    </div>
                    
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Bell size={48} className="mx-auto mb-3 opacity-30" />
                            <p>No hay notificaciones enviadas</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                            {notifications.map(notif => (
                                <div key={notif.id} className="p-4 hover:bg-gray-50">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${notif.read ? 'bg-gray-100' : 'bg-orange-100'}`}>
                                                <Bell size={16} className={notif.read ? 'text-gray-500' : 'text-bikitchen-orange'} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{notif.title}</p>
                                                <p className="text-sm text-gray-600 mt-0.5">{notif.body}</p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {notif.createdAt?.toDate?.()?.toLocaleString('es-CR') || 'Fecha desconocida'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded-full ${
                                            notif.read 
                                                ? 'bg-gray-100 text-gray-600' 
                                                : 'bg-green-100 text-green-700'
                                        }`}>
                                            {notif.read ? 'Leída' : 'Enviada'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="max-w-lg">
                    <NotificationSettings />
                    
                    <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-blue-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-blue-900">Notificaciones de Admin</p>
                                <p className="text-sm text-blue-700 mt-1">
                                    Como administrador, recibirás alertas de:
                                </p>
                                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                                    <li>• Nuevos pedidos recibidos</li>
                                    <li>• Nuevos clientes registrados</li>
                                    <li>• Alertas de inventario bajo</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
