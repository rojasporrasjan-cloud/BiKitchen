import React, { useState, useEffect } from 'react';
import {
    Gift, Search, Check, X, Loader2,
    Calendar, DollarSign, MessageSquare, Mail, RefreshCw, Ticket,
    AlertCircle, Filter, Clock, Smartphone, Building
} from 'lucide-react';
import {
    getAllCoupons,
    updateCoupon,
    deleteCoupon
} from '../../utils/firestoreCoupons';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function GiftCardsView() {
    const [giftCards, setGiftCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all'); // all, pending, active
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        loadGiftCards();
    }, []);

    const loadGiftCards = async () => {
        setLoading(true);
        try {
            const data = await getAllCoupons();
            // Filtrar solo los que son Gift Cards
            const cards = data.filter(c => c.isGiftCard === true);
            setGiftCards(cards);
        } catch (error) {
            toast.error('Error al cargar tarjetas de regalo');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async (card) => {
        if (!confirm(`¿Confirmar pago y activar la tarjeta ${card.code} por ₡${card.value.toLocaleString('es-CR')}?`)) return;
        
        setProcessingId(card.id);
        try {
            await updateCoupon(card.id, { 
                active: true, 
                paymentStatus: 'completed',
                activatedAt: new Date().toISOString()
            });
            toast.success('¡Tarjeta activada correctamente!');
            loadGiftCards();
        } catch (error) {
            toast.error('Error al activar la tarjeta');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (card) => {
        if (!confirm(`¿Eliminar la solicitud de tarjeta "${card.code}"?`)) return;

        try {
            await deleteCoupon(card.id);
            toast.success('Solicitud eliminada');
            loadGiftCards();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const filteredCards = giftCards.filter(card => {
        const matchesSearch = 
            card.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.senderName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (filter === 'pending') return matchesSearch && card.paymentStatus === 'pending';
        if (filter === 'active') return matchesSearch && card.active === true;
        return matchesSearch;
    });

    return (
        <div className="p-6">
            <AdminPageHeader
                icon={Gift}
                title="Tarjetas de Regalo"
                subtitle="Gestiona solicitudes y confirma pagos de gift cards"
                gradient="from-pink-500 via-purple-400 to-indigo-400"
                stats={[
                    { value: giftCards.length, label: 'Solicitudes' },
                    { value: giftCards.filter(c => c.paymentStatus === 'pending').length, label: 'Pendientes' },
                    { value: giftCards.filter(c => c.active).length, label: 'Activas' }
                ]}
                actions={[
                    <button
                        key="refresh"
                        onClick={loadGiftCards}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
                    >
                        <RefreshCw size={16} /> Actualizar
                    </button>
                ]}
            />

            {/* Instructions Alert */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 flex items-start gap-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                    <AlertCircle size={24} className="text-indigo-600" />
                </div>
                <div>
                    <h4 className="font-bold text-indigo-900 text-sm mb-1 uppercase tracking-wide">¿Cómo activar una tarjeta?</h4>
                    <p className="text-sm text-indigo-800 leading-relaxed font-semibold">
                        Cuando recibas el comprobante de pago por WhatsApp (Sinpe o Transferencia), busca el código correspondiente aquí y haz clic en <span className="text-green-600 font-bold underline">Confirmar Pago</span>. Esto activará el código de inmediato para que el cliente pueda canjearlo en su próximo pedido.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código, remitente o destinatario..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all"
                    />
                </div>
                <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'all' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'pending' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Pendientes
                    </button>
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === 'active' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Activas
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={40} className="animate-spin text-purple-500" />
                </div>
            ) : filteredCards.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                    <Gift size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No se encontraron tarjetas de regalo</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                        {filteredCards.map((card) => (
                            <motion.div
                                key={card.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`bg-white rounded-3xl p-6 shadow-xl border transition-all hover:shadow-2xl ${
                                    card.paymentStatus === 'pending' ? 'border-orange-100' : 'border-green-100'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`p-3 rounded-2xl ${
                                        card.paymentStatus === 'pending' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                                    }`}>
                                        <Ticket size={24} />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-gray-900">₡{card.value.toLocaleString('es-CR')}</p>
                                        <p className="text-xs text-gray-500">{card.occasion || 'Regalo'}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-mono font-bold bg-gray-100 px-2 py-1 rounded select-all capitalize">
                                            {card.code}
                                        </span>
                                        {card.paymentStatus === 'pending' ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                <Clock size={10} /> Pendiente
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                <Check size={10} /> Activa
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50">
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">De:</p>
                                            <p className="text-sm font-semibold text-gray-700 truncate">{card.senderName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 uppercase font-bold">Para:</p>
                                            <p className="text-sm font-semibold text-gray-700 truncate">{card.recipientName}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 pt-2">
                                        {card.recipientEmail && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Mail size={12} className="shrink-0" />
                                                <span className="truncate">{card.recipientEmail}</span>
                                            </div>
                                        )}
                                        {card.recipientPhone && (
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <Smartphone size={12} className="shrink-0" />
                                                <span>{card.recipientPhone}</span>
                                            </div>
                                        )}
                                        {card.paymentMethod && (
                                            <div className="flex items-center gap-2 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-lg w-fit">
                                                {card.paymentMethod === 'sinpe' ? <Smartphone size={12} /> : <Building size={12} />}
                                                <span className="uppercase tracking-wider text-[10px]">
                                                    {card.paymentMethod === 'sinpe' ? 'SINPE Móvil' : 'Transferencia'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {card.personalMessage && (
                                    <div className="bg-gray-50 rounded-2xl p-3 mb-6 italic text-xs text-gray-600">
                                        "{card.personalMessage}"
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {card.paymentStatus === 'pending' ? (
                                        <button
                                            onClick={() => handleConfirmPayment(card)}
                                            disabled={processingId === card.id}
                                            className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                                        >
                                            {processingId === card.id ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Check size={16} /> Confirmar Pago
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div className="flex-1 py-2 bg-gray-50 text-green-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-green-100">
                                            <Check size={16} /> Pagado
                                        </div>
                                    )}
                                    <button
                                        onClick={() => handleDelete(card)}
                                        className="p-2 border border-red-100 text-red-500 rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
