import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Bell, Smartphone, Check } from 'lucide-react';

// Hook para detectar si se puede instalar la PWA
export function usePWAInstall() {
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia('(display-mode: standalone)').matches;
        }
        return false;
    });

    useEffect(() => {
        // Capturar el evento de instalación
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };

        // Detectar cuando se instala
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setInstallPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const install = async () => {
        if (!installPrompt) return false;

        installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;

        if (outcome === 'accepted') {
            setInstallPrompt(null);
            return true;
        }
        return false;
    };

    return { canInstall: !!installPrompt, isInstalled, install };
}

// Hook para Push Notifications
export function usePushNotifications() {
    const [permission, setPermission] = useState(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission;
        }
        return 'default';
    });
    const [isSubscribed, setIsSubscribed] = useState(false);

    const checkSubscription = useCallback(async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            } catch (error) {
                console.error('Error checking subscription:', error);
            }
        }
    }, []);

    useEffect(() => {
        checkSubscription();
    }, [checkSubscription]);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            return { success: false, error: 'Notificaciones no soportadas' };
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                // Aquí podrías suscribir al usuario a push notifications
                // Esto requiere un servidor con VAPID keys
                setIsSubscribed(true);

                // Mostrar notificación de prueba
                new Notification('¡Notificaciones activadas! 🎉', {
                    body: 'Te avisaremos sobre promociones y el estado de tus pedidos.',
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png'
                });

                return { success: true };
            }

            return { success: false, error: 'Permiso denegado' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    };

    const sendTestNotification = () => {
        if (permission === 'granted') {
            new Notification('BiKitchen 🍽️', {
                body: '¡Esta es una notificación de prueba!',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png'
            });
        }
    };

    return {
        permission,
        isSubscribed,
        isSupported: 'Notification' in window,
        requestPermission,
        sendTestNotification
    };
}

// Hook para detectar si es dispositivo móvil
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            // Detectar por user agent y tamaño de pantalla
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
            const isSmallScreen = window.innerWidth <= 768;
            setIsMobile(isMobileUA || isSmallScreen);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}

// Banner de instalación PWA - Solo aparece en móviles
export function PWAInstallBanner() {
    const { canInstall, install } = usePWAInstall();
    const isMobile = useIsMobile();
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        const wasDismissed = localStorage.getItem('pwa_banner_dismissed');
        if (wasDismissed) {
            const dismissedTime = parseInt(wasDismissed);
            // Mostrar de nuevo después de 7 días
            return Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000;
        }
        return false;
    });
    const [installed, setInstalled] = useState(false);

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
    };

    const handleInstall = async () => {
        const success = await install();
        if (success) {
            setInstalled(true);
            setTimeout(() => setDismissed(true), 2000);
        }
    };

    // Solo mostrar en dispositivos móviles
    if (!canInstall || dismissed || !isMobile) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-[70]"
            >
                {installed ? (
                    <div className="flex items-center gap-3 text-green-600">
                        <Check size={24} />
                        <span className="font-medium">¡App instalada correctamente!</span>
                    </div>
                ) : (
                    <>
                        <button
                            onClick={handleDismiss}
                            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-bikitchen-orange/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                <Smartphone size={24} className="text-bikitchen-orange" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 mb-1">
                                    Instalar BiKitchen
                                </h3>
                                <p className="text-sm text-gray-500 mb-3">
                                    Agrega la app a tu pantalla de inicio para acceso rápido
                                </p>
                                <button
                                    onClick={handleInstall}
                                    className="flex items-center gap-2 bg-bikitchen-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-bikitchen-orange-dark transition-colors"
                                >
                                    <Download size={16} />
                                    Instalar App
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

// Banner de notificaciones
export function NotificationBanner() {
    const { permission, isSupported, requestPermission } = usePushNotifications();
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('notification_banner_dismissed') === 'true';
    });
    const [loading, setLoading] = useState(false);

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('notification_banner_dismissed', 'true');
    };

    const handleEnable = async () => {
        setLoading(true);
        await requestPermission();
        setLoading(false);
        setDismissed(true);
        localStorage.setItem('notification_banner_dismissed', 'true');
    };

    // No mostrar si no es soportado, ya tiene permiso, o fue descartado
    if (!isSupported || permission !== 'default' || dismissed) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -100, opacity: 0 }}
                className="fixed top-24 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl shadow-2xl p-4 z-[60] text-white"
            >
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 text-white/60 hover:text-white"
                >
                    <X size={18} />
                </button>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Bell size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold mb-1">
                            ¿Activar notificaciones?
                        </h3>
                        <p className="text-sm text-white/80 mb-3">
                            Recibe alertas de promociones y el estado de tus pedidos
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleEnable}
                                disabled={loading}
                                className="flex items-center gap-2 bg-white text-purple-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                <Bell size={16} />
                                {loading ? 'Activando...' : 'Activar'}
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2 text-white/80 hover:text-white text-sm"
                            >
                                Ahora no
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

// Componente combinado para mostrar ambos banners
export default function PWAPrompt() {
    const [showNotificationBanner, setShowNotificationBanner] = useState(false);

    useEffect(() => {
        // Mostrar banner de notificaciones después de 10 segundos
        const timer = setTimeout(() => {
            setShowNotificationBanner(true);
        }, 10000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <PWAInstallBanner />
            {showNotificationBanner && <NotificationBanner />}
        </>
    );
}
