import React, { useState, useEffect } from 'react';
import usePedidosDeFechas from '../../hooks/usePedidosDeFechas';
import { fechasDeReparto } from '../../utils/consultaPorFechas';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { ClipboardList, Printer, Calendar, RefreshCw, FileText } from 'lucide-react';
import { mapPedidosFromLegacy } from '../../utils/logisticsUtils';
import { conProteinasDeLaEntrega } from '../../utils/proteinasPorEntrega';
import { getScheduleFromOrder } from '../../utils/orderDates';

/**
 * DispatchSheetView ("Hoja de Despacho / Reparto")
 * Displays a print-friendly, Excel-like table of daily production/dispatch totals.
 */
export default function DispatchSheetView() {
    // Las fechas del calendario de reparto: ya no se baja la lista entera de
    // pedidos para armar el selector.
    const [availableDates] = useState(() => fechasDeReparto().filter(f => {
        const hace3 = new Date(); hace3.setDate(hace3.getDate() - 3);
        return f >= hace3.toISOString().split('T')[0];
    }));
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [orders, setOrders] = useState([]);
    const [sheetData, setSheetData] = useState({ sections: [], totals: {} });

    useEffect(() => {
        if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
            setSelectedDate(availableDates[0]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Solo los pedidos de ESTA fecha, en vivo (ver consultaPorFechas.js). Antes
    // eran los ultimos 40 dias con getDocs: ~340 lecturas cada apertura.
    const { pedidos: pedidosDeLaFecha, cargando: loading } = usePedidosDeFechas([selectedDate], 'Hoja de despacho');

    useEffect(() => {
        const rawOrders = (pedidosDeLaFecha || []).filter(order => {
            // Un pedido cancelado no se empaca
            if (order.status === 'cancelled') return false;
            return getScheduleFromOrder(order).includes(selectedDate);
        });
        // Los packs de proteinas con la lista de ESTA entrega. Va antes de
        // las dos cosas de abajo porque processSheetData lee los items
        // crudos: si solo se aplicara a `normalized`, el despacho diria las
        // proteinas de la compra y la cocina las de la semana.
        const deEstaEntrega = rawOrders.map(o => conProteinasDeLaEntrega(o, [selectedDate]));
        setOrders(mapPedidosFromLegacy(deEstaEntrega, [selectedDate]));
        // PASAMOS los crudos A processSheetData EN LUGAR DE normalized
        // PORQUE mapPedidosFromLegacy ELIMINA EL CARRITO Y LOS ITEMS ORIGINALES
        processSheetData(deEstaEntrega);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pedidosDeLaFecha, selectedDate]);

    // La lista llega en vivo: "Actualizar" ya no tiene que volver a consultar.
    const loadOrders = () => {};

    const processSheetData = (orderList) => {
        const sectionsMap = {};
        let grandTotal = 0; // Total de bolsas/entregas

        orderList.forEach(order => {
            const zona = order.zona || order.detalles_entrega?.zona || 'Ruta General';
            if (!sectionsMap[zona]) sectionsMap[zona] = [];
            
            sectionsMap[zona].push({
                cliente: order.cliente || 'Sin nombre',
                direccion: order.direccion || order.detalles_entrega?.direccion || order.details?.address || 'Sin dirección',
                telefono: order.telefono || order.detalles_entrega?.telefono || order.details?.phone || '-',
                plan: order.tipoMenu || order.plan || 'Pack',
                observaciones: order.observaciones || ''
            });
            
            grandTotal += 1;
        });

        // Convert map to array for rendering
        const finalSections = Object.entries(sectionsMap).map(([zona, entregas]) => {
            // Sort alphabetically by client name
            entregas.sort((a, b) => a.cliente.localeCompare(b.cliente));
            return {
                title: zona.toUpperCase(),
                rows: entregas,
                total: entregas.length
            };
        });

        // Sort sections alphabetically, but keep "RUTA GENERAL" at the end if there are other zones
        finalSections.sort((a, b) => {
            if (a.title === 'RUTA GENERAL') return 1;
            if (b.title === 'RUTA GENERAL') return -1;
            return a.title.localeCompare(b.title);
        });

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
                    title="Hoja de Despacho (Rutas)"
                    subtitle="Manifiesto de entrega para repartidores"
                    stats={[
                        { value: sheetData.grandTotal, label: 'Total Entregas' }
                    ]}
                    actions={[
                        <div key="date" className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200">
                            <Calendar size={18} className="text-gray-500" />
                            <select
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent outline-none text-sm font-medium text-gray-700 appearance-none cursor-pointer pr-4"
                            >
                                {!availableDates.includes(selectedDate) && <option value={selectedDate}>{selectedDate}</option>}
                                {availableDates.map(date => (
                                    <option key={date} value={date}>
                                        {new Date(date + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                                    </option>
                                ))}
                            </select>
                            {/* Un reparto fuera de lunes, miercoles y sabado: el selector ya
                                no sale de los pedidos, asi que se elige a mano. */}
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                                aria-label="Elegir otro día"
                                className="ml-2 bg-transparent outline-none text-sm text-gray-700 border-l border-gray-200 pl-2"
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
                            {new Date(selectedDate + "T12:00:00").toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
                                    <div className="text-2xl font-bold leading-none">{sheetData.grandTotal}</div>
                                    <div className="text-[10px] uppercase tracking-wider">Entregas Totales (Bolsas)</div>
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
                                        <tr className="border-b border-gray-300 bg-gray-100">
                                            <th className="py-2 px-2 font-semibold text-gray-700 w-1/4">Cliente</th>
                                            <th className="py-2 px-2 font-semibold text-gray-700 w-2/4">Dirección / Zona</th>
                                            <th className="py-2 px-2 font-semibold text-gray-700 w-1/4">Contacto / Detalle</th>
                                            <th className="py-2 px-2 font-semibold text-gray-400 w-16 text-right print:hidden">Check</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {section.rows.map((row, rIdx) => (
                                            <tr key={rIdx} className="border-b border-gray-200 hover:bg-gray-50">
                                                <td className="py-3 px-2 align-top font-bold text-gray-900">{row.cliente}</td>
                                                <td className="py-3 px-2 align-top text-gray-700">
                                                    {row.direccion}
                                                    {row.observaciones && (
                                                        <div className="text-xs text-orange-600 mt-1 font-semibold italic">⚠️ {row.observaciones}</div>
                                                    )}
                                                </td>
                                                <td className="py-3 px-2 align-top text-gray-600">
                                                    <div className="font-medium text-xs bg-gray-100 px-1 py-0.5 rounded inline-block mb-1">{row.plan}</div>
                                                    <div className="text-xs">{row.telefono}</div>
                                                </td>
                                                <td className="py-3 px-2 text-right align-top print:hidden">
                                                    <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black" />
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
