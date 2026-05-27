import React, { useState, useEffect, useMemo } from 'react';
import { Bell, Send, Users, Gift, Clock, CheckCircle, Search, X, Loader2, BellRing, Megaphone, History, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendClientNotification } from '../../services/clientService';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const QUICK_TEMPLATES = [
    {
        id: 'promo',
        icon: '🎁',
        label: 'Promoción',
        color: 'bg-pink-50 text-pink-600 border-pink-100',
        title: '🎁 ¡Nueva Promoción!',
        message: 'Tenemos una promoción especial para ti esta semana. ¡No te la pierdas!',
    },
    {
        id: 'menu',
        icon: '🍽️',
        label: 'Nuevo Menú',
        color: 'bg-orange-50 text-orange-600 border-orange-100',
        title: '🍽️ ¡Ya está el Menú de la Semana!',
        message: 'Ya subimos el menú de esta semana. Entra y haz tu pedido antes de que se agote.',
    },
    {
        id: 'reminder',
        icon: '⏰',
        label: 'Recordatorio',
        color: 'bg-blue-50 text-blue-600 border-blue-100',
        title: '⏰ ¡Cierre de Pedidos Pronto!',
        message: 'Los pedidos de esta semana cierran pronto. ¿Ya hiciste el tuyo?',
    },
    {
        id: 'thanks',
        icon: '💛',
        label: 'Agradecimiento',
        color: 'bg-yellow-50 text-yellow-600 border-yellow-100',
        title: '💛 ¡Gracias por tu preferencia!',
        message: 'Gracias por confiar en BiKitchen. Tu apoyo nos motiva a seguir cocinando con amor.',
    },
];

export default function NotificationsView() {
    const [activeTab, setActiveTab] = useState('send');
    const [clients, setClients] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [sending, setSending] = useState(false);

    // Form
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetMode, setTargetMode] = useState('all'); // 'all' | 'select'
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [search, setSearch] = useState('');
    const [showClientList, setShowClientList] = useState(false);

    // ── Load clients ──────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const snap = await getDocs(collection(db, 'clientes'));
                const list = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(c => c.correo || c.id.includes('@')) // solo los que tienen email
                    .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
                setClients(list);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingClients(false);
            }
        };
        load();
    }, []);

    // ── Load history ──────────────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
                const snap = await getDocs(q);
                setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { /* index might not exist yet */ }
        };
        if (activeTab === 'history') load();
    }, [activeTab]);

    // ── Filtered client list ──────────────────────────────────────
    const filteredClients = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return clients;
        return clients.filter(c =>
            (c.nombre || '').toLowerCase().includes(q) ||
            (c.correo || c.id || '').toLowerCase().includes(q) ||
            (c.telefono || '').includes(q)
        );
    }, [clients, search]);

    const targetClients = targetMode === 'all' ? clients : clients.filter(c => selectedIds.has(c.id));

    // ── Send ──────────────────────────────────────────────────────
    const handleSend = async () => {
        if (!title.trim() || !message.trim()) { toast.error('Escribe el título y el mensaje'); return; }
        if (targetMode === 'select' && selectedIds.size === 0) { toast.error('Selecciona al menos un cliente'); return; }

        setSending(true);
        let ok = 0, fail = 0;
        for (const client of targetClients) {
            try {
                await sendClientNotification(client.id, { title: title.trim(), message: message.trim(), type: 'custom' });
                ok++;
            } catch { fail++; }
        }
        setSending(false);

        if (fail === 0) toast.success(`✅ Notificación enviada a ${ok} cliente${ok !== 1 ? 's' : ''}`);
        else toast.error(`Enviada a ${ok}, fallaron ${fail}`);

        setTitle(''); setMessage(''); setSelectedIds(new Set());
    };

    const toggleClient = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === filteredClients.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredClients.map(c => c.id)));
    };

    return (
        <div className="space-y-6 max-w-5xl">
            <AdminPageHeader
                icon={BellRing}
                title="Notificaciones"
                subtitle="Envía mensajes a todos tus clientes o a uno en particular"
                gradient="from-indigo-500 via-purple-500 to-pink-500"
                stats={[
                    { value: clients.length, label: 'Clientes' },
                    { value: targetMode === 'select' ? selectedIds.size : clients.length, label: 'Destinatarios' },
                ]}
            />

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
                {[{ id: 'send', label: 'Enviar', icon: Send }, { id: 'history', label: 'Historial', icon: History }].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ── ENVIAR ── */}
            {activeTab === 'send' && (
                <div className="grid lg:grid-cols-5 gap-6">

                    {/* Form — 3 cols */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* Plantillas rápidas */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Plantillas rápidas</p>
                            <div className="grid grid-cols-2 gap-2">
                                {QUICK_TEMPLATES.map(t => (
                                    <button
                                        key={t.id}
                                        onClick={() => { setTitle(t.title); setMessage(t.message); }}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:scale-[1.02] ${t.color}`}
                                    >
                                        <span>{t.icon}</span>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mensaje */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Mensaje</p>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Título</label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Ej: ¡Nueva promo esta semana!"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 outline-none text-sm"
                                    maxLength={80}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cuerpo del mensaje</label>
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Escribe el detalle aquí..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 outline-none text-sm resize-none"
                                    maxLength={300}
                                />
                                <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/300</p>
                            </div>
                        </div>

                        {/* Destinatarios */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Destinatarios</p>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => { setTargetMode('all'); setSelectedIds(new Set()); }}
                                    className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${targetMode === 'all' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    <Users size={16} className="inline mr-2" />
                                    Todos ({clients.length})
                                </button>
                                <button
                                    onClick={() => setTargetMode('select')}
                                    className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${targetMode === 'select' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    Seleccionar
                                    {selectedIds.size > 0 && <span className="ml-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{selectedIds.size}</span>}
                                </button>
                            </div>

                            {targetMode === 'select' && (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                placeholder="Buscar cliente..."
                                                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-orange-400"
                                            />
                                        </div>
                                        <button
                                            onClick={() => setShowClientList(!showClientList)}
                                            className="px-3 py-2 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
                                        >
                                            {showClientList ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                    </div>

                                    {showClientList && (
                                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                                            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                                                <button onClick={toggleAll} className="text-xs font-bold text-orange-600 hover:text-orange-700">
                                                    {selectedIds.size === filteredClients.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                                </button>
                                                <span className="text-xs text-gray-400">{filteredClients.length} clientes</span>
                                            </div>
                                            <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                                                {loadingClients ? (
                                                    <div className="p-4 text-center text-gray-400 text-sm">Cargando...</div>
                                                ) : filteredClients.length === 0 ? (
                                                    <div className="p-4 text-center text-gray-400 text-sm">Sin resultados</div>
                                                ) : filteredClients.map(c => (
                                                    <label key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 cursor-pointer transition-colors">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.has(c.id)}
                                                            onChange={() => toggleClient(c.id)}
                                                            className="w-4 h-4 accent-orange-500 rounded"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-900 truncate">{c.nombre || c.id}</p>
                                                            <p className="text-xs text-gray-400 truncate">{c.correo || c.id}</p>
                                                        </div>
                                                        {c.totalPedidos > 0 && (
                                                            <span className="text-xs text-gray-400">{c.totalPedidos} pedidos</span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Botón enviar */}
                        <button
                            onClick={handleSend}
                            disabled={sending || !title.trim() || !message.trim() || (targetMode === 'select' && selectedIds.size === 0)}
                            className="w-full py-4 bg-gray-900 hover:bg-orange-600 text-white font-black rounded-2xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                        >
                            {sending ? <><Loader2 size={18} className="animate-spin" /> Enviando...</> : <><Send size={18} /> Enviar a {targetMode === 'all' ? `${clients.length} clientes` : `${selectedIds.size} seleccionados`}</>}
                        </button>
                    </div>

                    {/* Preview — 2 cols */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-6">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Vista previa</p>
                            <div className="bg-gray-50 rounded-2xl p-4">
                                <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                                            <Bell size={18} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-gray-900 text-sm leading-tight">
                                                {title || 'Título de la notificación'}
                                            </p>
                                            <p className="text-gray-500 text-xs mt-1 leading-relaxed line-clamp-3">
                                                {message || 'El mensaje aparecerá aquí...'}
                                            </p>
                                            <p className="text-gray-300 text-[10px] mt-2 font-bold uppercase tracking-widest">
                                                BiKitchen · Ahora
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-3 text-center">
                                Así se verá en la app del cliente
                            </p>

                            {targetMode === 'select' && selectedIds.size > 0 && (
                                <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-100">
                                    <p className="text-xs font-bold text-orange-700 mb-1">Clientes seleccionados:</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {[...selectedIds].map(id => {
                                            const c = clients.find(x => x.id === id);
                                            return (
                                                <div key={id} className="flex items-center justify-between text-xs text-orange-800">
                                                    <span className="truncate">{c?.nombre || id}</span>
                                                    <button onClick={() => toggleClient(id)} className="ml-2 text-orange-400 hover:text-orange-600 shrink-0">
                                                        <X size={12} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── HISTORIAL ── */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="font-black text-gray-900 flex items-center gap-2">
                            <History size={18} />
                            Últimas notificaciones enviadas
                        </h2>
                    </div>
                    {history.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <Bell size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="font-semibold">Aún no se han enviado notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 max-h-[60vh] overflow-y-auto">
                            {history.map(n => (
                                <div key={n.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                                    <div className={`p-2 rounded-xl shrink-0 ${n.read ? 'bg-gray-100' : 'bg-orange-100'}`}>
                                        <Bell size={16} className={n.read ? 'text-gray-400' : 'text-orange-500'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-900 text-sm">{n.title}</p>
                                        <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{n.body}</p>
                                        <p className="text-gray-300 text-[10px] mt-1">
                                            {n.createdAt?.toDate?.()?.toLocaleString('es-CR') || '—'}
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shrink-0 ${n.read ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-700'}`}>
                                        {n.read ? 'Leída' : 'Enviada'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
