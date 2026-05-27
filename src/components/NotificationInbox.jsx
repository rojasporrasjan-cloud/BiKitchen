import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Clock, ChevronRight } from 'lucide-react';
import { db } from '../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { dismissNotification } from '../services/clientService';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationInbox({ transparent = false }) {
    const { currentUser } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // ── Listen to client notifications ───────────────────────────
    useEffect(() => {
        if (!currentUser?.email) return;
        const clientRef = doc(db, 'clientes', currentUser.email.toLowerCase());
        return onSnapshot(clientRef, snap => {
            if (!snap.exists()) return;
            const all = (snap.data().notifications || [])
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            setNotifications(all);
        });
    }, [currentUser]);

    // ── Close on outside click ────────────────────────────────────
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unread = notifications.filter(n => !n.dismissed).length;

    const handleDismiss = async (notifId, e) => {
        e.stopPropagation();
        if (!currentUser?.email) return;
        await dismissNotification(currentUser.email.toLowerCase(), notifId);
    };

    const handleDismissAll = async () => {
        if (!currentUser?.email) return;
        const pending = notifications.filter(n => !n.dismissed);
        await Promise.all(pending.map(n => dismissNotification(currentUser.email.toLowerCase(), n.id)));
    };

    if (!currentUser) return null;

    return (
        <div className="relative" ref={ref}>
            {/* Bell button */}
            <button
                onClick={() => setOpen(o => !o)}
                className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all border ${
                    transparent
                        ? 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                        : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
                }`}
                title="Notificaciones"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-14 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[9999]"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                <Bell size={16} className="text-orange-500" />
                                <span className="font-black text-gray-900 text-sm">Notificaciones</span>
                                {unread > 0 && (
                                    <span className="bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                        {unread} nueva{unread !== 1 ? 's' : ''}
                                    </span>
                                )}
                            </div>
                            {unread > 0 && (
                                <button
                                    onClick={handleDismissAll}
                                    className="text-xs font-bold text-orange-500 hover:text-orange-700 transition-colors"
                                >
                                    Marcar todas
                                </button>
                            )}
                        </div>

                        {/* List */}
                        <div className="max-h-[380px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Bell size={32} className="mx-auto text-gray-200 mb-3" />
                                    <p className="text-sm font-semibold text-gray-400">Sin notificaciones</p>
                                    <p className="text-xs text-gray-300 mt-1">Te avisaremos cuando haya novedades</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {notifications.map(n => (
                                        <div
                                            key={n.id}
                                            className={`flex items-start gap-3 px-4 py-3.5 transition-colors ${n.dismissed ? 'opacity-50' : 'hover:bg-orange-50/50'}`}
                                        >
                                            {/* Dot */}
                                            <div className="mt-1.5 shrink-0">
                                                {n.dismissed
                                                    ? <div className="w-2 h-2 rounded-full bg-gray-200" />
                                                    : <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                                }
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm leading-tight ${n.dismissed ? 'text-gray-400 font-medium' : 'text-gray-900 font-bold'}`}>
                                                    {n.title}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {n.message}
                                                </p>
                                                <p className="text-[10px] text-gray-300 mt-1.5 flex items-center gap-1">
                                                    <Clock size={9} />
                                                    {new Date(n.date).toLocaleDateString('es-CR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>

                                            {/* Dismiss */}
                                            {!n.dismissed && (
                                                <button
                                                    onClick={(e) => handleDismiss(n.id, e)}
                                                    className="shrink-0 p-1 text-gray-300 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors mt-0.5"
                                                    title="Marcar como leída"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                                <p className="text-[10px] text-gray-400 text-center font-medium">
                                    {notifications.length} notificación{notifications.length !== 1 ? 'es' : ''} en total
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
