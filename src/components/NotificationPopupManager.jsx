import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Gift, Star, Clock, CheckCircle2, MessageSquare } from 'lucide-react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { dismissNotification } from '../services/clientService';

const NotificationPopupManager = () => {
    const { currentUser } = useAuth();
    const [activeNotification, setActiveNotification] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Solo escuchamos si hay un usuario identificado
        // Prioridad: Email del usuario autenticado
        if (!currentUser?.email) return;

        const clientId = currentUser.email.toLowerCase();
        const clientRef = doc(db, 'clientes', clientId);

        const unsubscribe = onSnapshot(clientRef, (docSnap) => {
            console.log('[NotificationManager] Snapshot received');
            if (docSnap.exists()) {
                const data = docSnap.data();
                const notifications = data.notifications || [];
                console.log('[NotificationManager] Notifications found:', notifications.length);
                
                // Buscar la notificación más reciente que no esté descartada
                const pending = notifications
                    .filter(n => !n.dismissed)
                    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

                if (pending) {
                    console.log('[NotificationManager] Showing pending notification:', pending.id);
                    setActiveNotification(pending);
                    setIsOpen(true);
                } else {
                    setIsOpen(false);
                }
            } else {
                console.log('[NotificationManager] No client document found');
            }
        }, (error) => {
            console.error('[NotificationManager] Error listening for notifications:', error);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const handleDismiss = async () => {
        if (!activeNotification || !currentUser?.email) return;
        
        try {
            setIsOpen(false);
            const clientId = currentUser.email.toLowerCase();
            await dismissNotification(clientId, activeNotification.id);
        } catch (error) {
            console.error('[NotificationManager] Error dismissing notification:', error);
        }
    };

    if (!activeNotification) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden relative border border-gray-100"
                    >
                        {/* Decorative Background */}
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 opacity-10"></div>
                        
                        <div className="p-8 pb-6 text-center relative">
                            {/* Icon Wrapper */}
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-blue-500/30 transform -rotate-3">
                                <Bell className="w-10 h-10 animate-bounce" />
                            </div>

                            <h2 className="text-2xl font-black text-gray-900 mb-3 leading-tight">
                                {activeNotification.title}
                            </h2>
                            
                            <p className="text-gray-600 text-sm leading-relaxed mb-8">
                                {activeNotification.message}
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleDismiss}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98]"
                                >
                                    ¡Entendido!
                                </button>
                                
                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-widest flex items-center justify-center gap-2">
                                    <Clock size={10} />
                                    Enviado el {new Date(activeNotification.date).toLocaleDateString('es-CR')}
                                </div>
                            </div>
                        </div>

                        {/* Top corner cross */}
                        <button 
                            onClick={handleDismiss}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default NotificationPopupManager;
