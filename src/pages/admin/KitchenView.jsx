import React, { useState, useEffect } from 'react';
import { ChefHat, Scale, CheckCircle, Circle, AlertCircle, TrendingUp, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function KitchenView() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [production, setProduction] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadProduction = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'pedidos'),
                    where('fecha_entrega', '==', selectedDate)
                );

                const snapshot = await getDocs(q);
                const pedidos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                const dishesMap = {};

                pedidos.forEach(pedido => {
                    pedido.menu?.forEach(item => {
                        const id = item.nombre;
                        if (!dishesMap[id]) {
                            const proteinaMatch = (item.proteina || '').match(/(\d+)/);
                            const gramsPerPortion = proteinaMatch ? parseInt(proteinaMatch[1], 10) : 150;

                            dishesMap[id] = {
                                id,
                                name: item.nombre,
                                portions: 0,
                                gramsPerPortion,
                                totalKg: 0,
                                status: 'pending'
                            };
                        }

                        const portions = item.cantidad || 1;
                        dishesMap[id].portions += portions;
                        dishesMap[id].totalKg = (dishesMap[id].portions * dishesMap[id].gramsPerPortion) / 1000;
                    });
                });

                const dishes = Object.values(dishesMap);
                const newProduction = dishes.length
                    ? [{ category: 'Producción del Día', items: dishes }]
                    : [];

                setProduction(newProduction);
            } catch (error) {
                console.error('Error cargando producción:', error);
                setProduction([]);
            }
            setLoading(false);
        };

        loadProduction();
    }, [selectedDate]);

    const toggleStatus = (categoryIndex, itemId) => {
        const newProduction = [...production];
        const category = newProduction[categoryIndex];
        const itemIndex = category.items.findIndex(i => i.id === itemId);

        if (itemIndex !== -1) {
            const item = category.items[itemIndex];
            item.status = item.status === 'pending' ? 'done' : 'pending';
            setProduction(newProduction);
        }
    };

    // Calculate Progress
    const totalItems = production.reduce((acc, cat) => acc + cat.items.length, 0);
    const completedItems = production.reduce((acc, cat) => acc + cat.items.filter(i => i.status === 'done').length, 0);
    const progress = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header & Progress */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8 space-y-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ChefHat className="text-orange-500" size={32} />
                            Producción del Día
                        </h1>
                        <p className="text-gray-500">Gestión de cocina y control de gramajes a partir de los pedidos confirmados.</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-orange-500">{progress}%</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Completado</div>
                    </div>
                </div>

                {/* Date Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={20} className="text-orange-500" />
                        <span className="font-medium">Fecha de Entrega:</span>
                    </div>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                    />
                    <div className="sm:ml-auto text-sm text-gray-500">
                        {loading
                            ? 'Cargando producción...'
                            : `${totalItems} ítem${totalItems !== 1 ? 's' : ''} en producción`}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full relative"
                    >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </motion.div>
                </div>
            </div>

            {/* Production Lists */}
            <div className="grid gap-8">
                {production.map((section, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                                🥘 {section.category}
                            </h2>
                            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                                {section.items.filter(i => i.status === 'done').length} / {section.items.length} listos
                            </span>
                        </div>
                        <div className="divide-y divide-gray-100">
                            <AnimatePresence>
                                {section.items.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className={`p-5 flex items-center justify-between transition-colors cursor-pointer group ${item.status === 'done' ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}
                                        onClick={() => toggleStatus(idx, item.id)}
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className={`p-1 rounded-full transition-all duration-300 ${item.status === 'done' ? 'text-orange-500 scale-110' : 'text-gray-300 group-hover:text-orange-500'}`}>
                                                {item.status === 'done' ? <CheckCircle size={28} className="fill-current" /> : <Circle size={28} />}
                                            </div>
                                            <div>
                                                <h3 className={`font-bold text-lg transition-all ${item.status === 'done' ? 'text-gray-400 line-through decoration-2' : 'text-gray-800'}`}>
                                                    {item.name}
                                                </h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-medium">{item.portions} porciones</span>
                                                    <span>x</span>
                                                    <span>{item.gramsPerPortion}g por porción (proteína)</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right pl-4 border-l border-gray-100 ml-4">
                                            <div className={`flex items-center gap-1 justify-end font-bold text-xl ${item.status === 'done' ? 'text-gray-400' : 'text-orange-500'}`}>
                                                <Scale size={20} />
                                                {item.totalKg.toFixed(2)} <span className="text-sm font-normal text-gray-500">kg total</span>
                                            </div>
                                            {item.status !== 'done' && (
                                                <div className="flex items-center gap-1 text-xs text-orange-500 font-medium justify-end mt-1 animate-pulse">
                                                    <AlertCircle size={12} />
                                                    Pendiente
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                ))}

                {!loading && production.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                        <ChefHat size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No hay producción para la fecha seleccionada</p>
                        <p className="text-sm mt-2">Revisa que existan pedidos con esa fecha de entrega</p>
                    </div>
                )}
            </div>
        </div>
    );
}
