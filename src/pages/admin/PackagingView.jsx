import React, { useState, useEffect } from 'react';
import { Package, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function PackagingView() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadOrders = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'pedidos'),
                    where('fecha_entrega', '==', selectedDate)
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, status: 'pending', ...doc.data() }));
                setOrders(data);
            } catch (error) {
                console.error('Error cargando pedidos para empaque:', error);
                setOrders([]);
            }
            setLoading(false);
        };

        loadOrders();
    }, [selectedDate]);

    const toggleOrderStatus = (orderId) => {
        setOrders(prev => prev.map(o =>
            o.id === orderId ? { ...o, status: o.status === 'ready' ? 'pending' : 'ready' } : o
        ));
    };

    return (
        <div>
            <div className="mb-8 space-y-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="text-primary" /> Empaque
                    </h1>
                    <p className="text-gray-500">Checklist de armado de pedidos por fecha de entrega.</p>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={20} className="text-primary" />
                        <span className="font-medium">Fecha de Entrega:</span>
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                    <div className="sm:ml-auto text-sm text-gray-500">
                        {loading
                            ? 'Cargando pedidos...'
                            : `${orders.length} pedido${orders.length !== 1 ? 's' : ''} para esta fecha`}
                    </div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map((order) => (
                    <div
                        key={order.id}
                        className={`bg-white rounded-xl shadow-sm border-2 transition-all ${order.status === 'ready' ? 'border-green-500 opacity-90' : 'border-transparent'}`}
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900">{order.cliente}</h3>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                        {order.plan || 'Sin plan definido'}
                                    </span>
                                </div>
                                {order.status === 'ready' && <CheckCircle className="text-green-500" size={24} />}
                            </div>

                            <div className="space-y-3 mb-6">
                                {order.menu?.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-gray-700 text-sm">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                                            defaultChecked={order.status === 'ready'}
                                        />
                                        <span>
                                            {item.cantidad ? `${item.cantidad}x ` : ''}{item.nombre}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {order.observaciones && (
                                <div className="bg-yellow-50 p-3 rounded-lg mb-6 flex gap-2 text-yellow-800 text-sm">
                                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                                    <p>{order.observaciones}</p>
                                </div>
                            )}

                            <button
                                onClick={() => toggleOrderStatus(order.id)}
                                className={`w-full py-2 rounded-lg font-medium transition-colors ${order.status === 'ready'
                                    ? 'bg-gray-100 text-gray-500'
                                    : 'bg-primary text-white hover:bg-primary-dark shadow-md'
                                }`}
                            >
                                {order.status === 'ready' ? 'Listo para entrega' : 'Marcar como Listo'}
                            </button>
                        </div>
                    </div>
                ))}

                {!loading && orders.length === 0 && (
                    <div className="text-center py-12 text-gray-400 col-span-full">
                        <Package size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No hay pedidos para la fecha seleccionada</p>
                        <p className="text-sm mt-2">Revisa que existan pedidos con esa fecha de entrega</p>
                    </div>
                )}
            </div>
        </div>
    );
}
