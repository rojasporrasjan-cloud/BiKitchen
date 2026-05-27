import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { cachedFetch, invalidateCache } from '../../utils/firestoreCache';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { ClipboardList, Printer, Calendar, RefreshCw, FileText } from 'lucide-react';
import { mapPedidosFromLegacy } from '../../utils/logisticsUtils';

/**
 * DispatchSheetView ("Hoja de Despacho / Reparto")
 * Displays a print-friendly, Excel-like table of daily production/dispatch totals.
 */
export default function DispatchSheetView() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sheetData, setSheetData] = useState({ sections: [], totals: {} });

    // Load orders for selected date
    const loadOrders = async (force = false) => {
        setLoading(true);
        try {
            const cacheKey = `dispatch_orders_${selectedDate}`;
            if (force) invalidateCache(cacheKey);

            const rawOrders = await cachedFetch(cacheKey, async () => {
                const q = query(
                    collection(db, "pedidos"),
                    where("fecha_entrega", "==", selectedDate)
                );
                const snapshot = await getDocs(q);
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }, 'dashboard'); // share cache group with dashboard/sheets

            // Normalize orders using shared utility
            const normalized = mapPedidosFromLegacy(rawOrders);
            setOrders(normalized);
            processSheetData(normalized);

        } catch (error) {
            console.error("Error loading dispatch orders:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadOrders();
    }, [selectedDate]);

    // Process orders into "Matrix" format for the sheet
    const processSheetData = (orderList) => {
        // Structure:
        // Sections: [ { title: 'DESAYUNOS', rows: [ { name: 'Pinto con Huevo', qty: 15 } ] } ]

        const sectionsMap = {
            'desayuno': {},
            'almuerzo': {},
            'cena': {},
            'snack': {},
            'individuales': {},
            'otros': {}
        };

        let grandTotal = 0;

        orderList.forEach(order => {
            // Check "menu" items (from packs)
            if (Array.isArray(order.menu)) {
                order.menu.forEach(item => {
                    // Determine category
                    // item might have 'category' or we infer from 'tipoMenu' of the order?
                    // In normalized data, item often has 'nombre', 'proteina', 'carbo', 'vegetal'

                    // Logic: Aggregate by Dish Name (or Components)
                    // Requirements say: "Group by 'category'... then by 'dish' name."

                    // If item has category, use it. Else default to 'almuerzo' or generic.
                    // normalize names:
                    const rawCat = item.category || 'almuerzo'; // default
                    const cat = rawCat.toLowerCase().includes('desayuno') ? 'desayuno' :
                        rawCat.toLowerCase().includes('cena') ? 'cena' :
                            rawCat.toLowerCase().includes('snack') ? 'snack' :
                                'almuerzo'; // default bucket

                    const dishName = item.nombre || 'Plato Genérico';
                    const qty = parseInt(item.cantidad || 1);
                    const key = dishName.trim();

                    if (!sectionsMap[cat][key]) sectionsMap[cat][key] = 0;
                    sectionsMap[cat][key] += qty;
                    grandTotal += qty;
                });
            }

            // Also check "items" (manual/individual items)
            if (Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const cat = 'individuales';
                    const dishName = item.name || item.nombre || 'Item';
                    const qty = parseInt(item.quantity || item.cantidad || 1);
                    const key = dishName.trim();

                    if (!sectionsMap[cat][key]) sectionsMap[cat][key] = 0;
                    sectionsMap[cat][key] += qty;
                    grandTotal += qty;
                });
            }
        });

        // Convert map to array for rendering
        const finalSections = Object.entries(sectionsMap).map(([key, items]) => {
            const rows = Object.entries(items).map(([name, qty]) => ({ name, qty }));
            // Sort alphabetically
            rows.sort((a, b) => a.name.localeCompare(b.name));
            return {
                title: key.toUpperCase(),
                rows,
                total: rows.reduce((sum, r) => sum + r.qty, 0)
            };
        }).filter(s => s.rows.length > 0); // Hide empty sections

        setSheetData({ sections: finalSections, grandTotal });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* Header - Hidden on Print */}
            <div className="no-print">
                <AdminPageHeader
                    icon={ClipboardList}
                    title="Hoja de Despacho"
                    subtitle="Totales de platos para carga y despacho"
                    stats={[
                        { value: orders.length, label: 'Pedidos' },
                        { value: sheetData.grandTotal, label: 'Total Platos' }
                    ]}
                    actions={[
                        <div key="date" className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                            <Calendar size={18} className="text-gray-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent outline-none text-sm font-medium text-gray-700"
                            />
                        </div>,
                        <button
                            key="print"
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                            <Printer size={18} />
                            Imprimir Hoja
                        </button>,
                        <button
                            key="refresh"
                            onClick={() => loadOrders(true)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Actualizar datos"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    ]}
                />
            </div>

            {/* Print Friendly Sheet */}
            <div className="bg-white p-8 shadow-sm border border-gray-200 min-h-[11in] mx-auto print-sheet" style={{ maxWidth: '8.5in' }}>

                {/* Print Header */}
                <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-bold text-black uppercase tracking-wider">Hoja de Despacho</h1>
                        <p className="text-sm text-gray-600 mt-1">BiKitchen Food Management</p>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-black">
                            {new Date(selectedDate).toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Generado: {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                </div>

                {/* Main Table Layout */}
                {loading ? (
                    <div className="py-12 text-center text-gray-400 italic">Cargando datos...</div>
                ) : sheetData.sections.length === 0 ? (
                    <div className="py-12 text-center text-gray-400 italic">No hay platos registrados para esta fecha.</div>
                ) : (
                    <div className="space-y-8">
                        {/* Summary Box */}
                        <div className="border border-black p-4 flex justify-between items-center bg-gray-50 print-bg-none">
                            <div className="text-sm font-semibold uppercase text-gray-600">Resumen General</div>
                            <div className="flex gap-8">
                                <div className="text-center">
                                    <div className="text-2xl font-bold leading-none">{orders.length}</div>
                                    <div className="text-[10px] uppercase tracking-wider">Pedidos</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold leading-none">{sheetData.grandTotal}</div>
                                    <div className="text-[10px] uppercase tracking-wider">Platos Totales</div>
                                </div>
                            </div>
                        </div>

                        {/* Sections */}
                        {sheetData.sections.map((section, idx) => (
                            <div key={idx} className="break-inside-avoid">
                                <h3 className="text-lg font-bold border-b border-black mb-2 pb-1 flex justify-between items-end">
                                    <span>{section.title}</span>
                                    <span className="text-sm font-normal">Total: {section.total}</span>
                                </h3>
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-300">
                                            <th className="py-2 font-semibold text-gray-700 w-3/4">Plato / Ítem</th>
                                            <th className="py-2 font-semibold text-black w-1/4 text-center">Cantidad</th>
                                            <th className="py-2 font-semibold text-gray-400 w-16 text-right print:hidden">Check</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {section.rows.map((row, rIdx) => (
                                            <tr key={rIdx} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-2 pr-4 align-top">{row.name}</td>
                                                <td className="py-2 font-bold text-center align-top">{row.qty}</td>
                                                <td className="py-2 text-right print:hidden">
                                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                )}

                {/* Print Footer */}
                <div className="mt-12 pt-4 border-t border-gray-300 flex justify-between text-xs text-gray-400 print:fixed print:bottom-4 print:left-0 print:right-0 print:px-8">
                    <span>BiKitchen Food - Internal Use Only</span>
                    <span>Page 1 of 1</span>
                </div>
            </div>

            {/* CSS for Print */}
            <style>{`
                @media print {
                    @page { size: letter; margin: 0.5in; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .print-sheet { 
                        box-shadow: none !important; 
                        border: none !important; 
                        padding: 0 !important; 
                        margin: 0 !important;
                        max-width: 100% !important;
                    }
                    .print-bg-none { background: none !important; }
                }
            `}</style>
        </div>
    );
}
