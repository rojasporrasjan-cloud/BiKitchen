import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Check, X, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
    subscribeToPushNotifications, 
    unsubscribeFromPushNotifications,
    checkSubscriptionStatus 
} from '../utils/pushNotifications';
import toast from 'react-hot-toast';

/**
 * Componente para gestionar configuración de notificaciones
 * Se puede usar en Mi Cuenta o como modal
 */
export default function NotificationSettings({ compact = false }) {
    const { currentUser, isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [subscribing, setSubscribing] = useState(false);
    const [status, setStatus] = useState({
        subscribed: false,
        permission: 'default',
        supported: true
    });

    useEffect(() => {
        checkStatus();
    }, [currentUser]);

    const checkStatus = async () => {
        setLoading(true);
        const result = await checkSubscriptionStatus(currentUser?.uid);
        setStatus({
            subscribed: result.subscribed,
            permission: result.permission,
            supported: result.permission !== 'unsupported'
        });
        setLoading(false);
    };

    const handleSubscribe = async () => {
        if (!currentUser) {
            toast.error('Debes iniciar sesión para activar notificaciones');
            return;
        }

        setSubscribing(true);
        const result = await subscribeToPushNotifications(currentUser.uid, isAdmin);
        
        if (result.success) {
            toast.success('¡Notificaciones activadas!');
            setStatus(prev => ({ ...prev, subscribed: true, permission: 'granted' }));
        } else {
            toast.error(result.error || 'No se pudieron activar las notificaciones');
        }
        setSubscribing(false);
    };

    const handleUnsubscribe = async () => {
        setSubscribing(true);
        const result = await unsubscribeFromPushNotifications(currentUser?.uid);
        
        if (result.success) {
            toast.success('Notificaciones desactivadas');
            setStatus(prev => ({ ...prev, subscribed: false }));
        } else {
            toast.error('Error al desactivar notificaciones');
        }
        setSubscribing(false);
    };

    // No soportado
    if (!status.supported) {
        return (
            <div className={`${compact ? 'p-3' : 'p-4'} bg-gray-50 rounded-xl`}>
                <div className="flex items-center gap-3 text-gray-500">
                    <BellOff size={20} />
                    <span className="text-sm">
                        Tu navegador no soporta notificaciones push
                    </span>
                </div>
            </div>
        );
    }

    // Permiso denegado permanentemente
    if (status.permission === 'denied') {
        return (
            <div className={`${compact ? 'p-3' : 'p-4'} bg-red-50 rounded-xl border border-red-100`}>
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <BellOff size={20} className="text-red-600" />
                    </div>
                    <div>
                        <p className="font-medium text-red-800">Notificaciones bloqueadas</p>
                        <p className="text-sm text-red-600 mt-1">
                            Has bloqueado las notificaciones. Para activarlas, ve a la configuración de tu navegador.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading
    if (loading) {
        return (
            <div className={`${compact ? 'p-3' : 'p-4'} bg-gray-50 rounded-xl`}>
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Verificando estado...</span>
                </div>
            </div>
        );
    }

    // Versión compacta (para usar en listas)
    if (compact) {
        return (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status.subscribed ? 'bg-green-100' : 'bg-gray-200'}`}>
                        {status.subscribed ? (
                            <Bell size={18} className="text-green-600" />
                        ) : (
                            <BellOff size={18} className="text-gray-500" />
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-gray-900 text-sm">Notificaciones</p>
                        <p className="text-xs text-gray-500">
                            {status.subscribed ? 'Activadas' : 'Desactivadas'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={status.subscribed ? handleUnsubscribe : handleSubscribe}
                    disabled={subscribing}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        status.subscribed
                            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            : 'bg-bikitchen-orange text-white hover:bg-orange-600'
                    }`}
                >
                    {subscribing ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : status.subscribed ? (
                        'Desactivar'
                    ) : (
                        'Activar'
                    )}
                </button>
            </div>
        );
    }

    // Versión completa
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Bell size={20} className="text-bikitchen-orange" />
                    Notificaciones Push
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                    Recibe alertas sobre tus pedidos y promociones
                </p>
            </div>

            {/* Content */}
            <div className="p-4">
                {status.subscribed ? (
                    <div className="space-y-4">
                        {/* Estado activo */}
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                            <div className="p-2 bg-green-100 rounded-full">
                                <Check size={20} className="text-green-600" />
                            </div>
                            <div>
                                <p className="font-medium text-green-800">Notificaciones activas</p>
                                <p className="text-sm text-green-600">
                                    {isAdmin 
                                        ? 'Recibirás alertas de nuevos pedidos'
                                        : 'Te avisaremos sobre tus pedidos y promos'}
                                </p>
                            </div>
                        </div>

                        {/* Tipos de notificaciones */}
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-700">Recibirás notificaciones de:</p>
                            <ul className="space-y-1 text-sm text-gray-600">
                                {isAdmin ? (
                                    <>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-green-500" />
                                            Nuevos pedidos
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-green-500" />
                                            Nuevos clientes registrados
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-green-500" />
                                            Alertas de inventario
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-green-500" />
                                            Estado de tus pedidos
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-green-500" />
                                            Promociones especiales
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <Check size={14} className="text-green-500" />
                                            Cupones exclusivos
                                        </li>
                                    </>
                                )}
                            </ul>
                        </div>

                        {/* Botón desactivar */}
                        <button
                            onClick={handleUnsubscribe}
                            disabled={subscribing}
                            className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            {subscribing ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <BellOff size={18} />
                                    Desactivar notificaciones
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Ilustración */}
                        <div className="text-center py-4">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-3">
                                <Smartphone size={32} className="text-bikitchen-orange" />
                            </div>
                            <h4 className="font-semibold text-gray-900">Mantente informado</h4>
                            <p className="text-sm text-gray-500 mt-1">
                                {isAdmin 
                                    ? 'Recibe alertas instantáneas de nuevos pedidos'
                                    : 'Entérate al instante del estado de tus pedidos'}
                            </p>
                        </div>

                        {/* Beneficios */}
                        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                            {isAdmin ? (
                                <>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Bell size={14} className="text-bikitchen-orange" />
                                        Nuevos pedidos al instante
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Bell size={14} className="text-bikitchen-orange" />
                                        Alertas de clientes nuevos
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Bell size={14} className="text-bikitchen-orange" />
                                        Sigue tu pedido en tiempo real
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Bell size={14} className="text-bikitchen-orange" />
                                        Ofertas exclusivas primero
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Botón activar */}
                        <button
                            onClick={handleSubscribe}
                            disabled={subscribing}
                            className="w-full py-3 px-4 bg-bikitchen-orange text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                        >
                            {subscribing ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <>
                                    <Bell size={18} />
                                    Activar notificaciones
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/**
 * Botón simple para activar notificaciones (para usar en navbar o header)
 */
export function NotificationButton({ className = '' }) {
    const { currentUser, isAdmin } = useAuth();
    const [status, setStatus] = useState({ subscribed: false });

    useEffect(() => {
        if (currentUser) {
            checkSubscriptionStatus(currentUser.uid).then(setStatus);
        }
    }, [currentUser]);

    const handleClick = async () => {
        if (!currentUser) {
            toast.error('Inicia sesión para activar notificaciones');
            return;
        }

        if (status.subscribed) {
            // Ya está suscrito, podría abrir un panel de notificaciones
            toast('Ya tienes las notificaciones activadas', { icon: '🔔' });
        } else {
            const result = await subscribeToPushNotifications(currentUser.uid, isAdmin);
            if (result.success) {
                toast.success('¡Notificaciones activadas!');
                setStatus({ subscribed: true });
            }
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`relative p-2 rounded-lg transition-colors ${
                status.subscribed 
                    ? 'text-bikitchen-orange hover:bg-orange-50' 
                    : 'text-gray-500 hover:bg-gray-100'
            } ${className}`}
            title={status.subscribed ? 'Notificaciones activas' : 'Activar notificaciones'}
        >
            <Bell size={20} />
            {status.subscribed && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
        </button>
    );
}
