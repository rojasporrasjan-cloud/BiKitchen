import React, { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    Calendar,
    ChefHat,
    Package as PackageIcon,
    Printer
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// Utilidades de logística: normalización de pedidos y armado de hojas
import {
    mapPedidosFromLegacy,
    buildKitchenSheetData,
    buildPackagingSheetData
} from '../../utils/logisticsUtils';

export default function SheetsView() {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    // Pedidos ya normalizados al modelo de platos/ingredientes
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadOrdersForDate();
    }, [selectedDate]);

    const loadOrdersForDate = async () => {
        setLoading(true);
        try {
            console.log('[Sheets] Cargando pedidos para fecha:', selectedDate);
            const q = query(
                collection(db, "pedidos"),
                where("fecha_entrega", "==", selectedDate),
                orderBy("cliente", "asc")
            );

            const snapshot = await getDocs(q);
            console.log('[Sheets] Documentos encontrados:', snapshot.size);

            const rawOrders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (rawOrders.length > 0) {
                console.log('[Sheets] Ejemplo de pedido crudo:', rawOrders[0]);
            }

            // Normalizar al modelo de platos/ingredientes (proteína, carbo, vegetal)
            const normalized = mapPedidosFromLegacy(rawOrders);

            if (normalized.length > 0) {
                console.log('[Sheets] Ejemplo de pedido normalizado:', normalized[0]);
            }

            setOrders(normalized);
        } catch (error) {
            console.error("[Sheets] Error loading orders:", error);
        }
        setLoading(false);
    };

    const generateKitchenSheet = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('BiKitchen - Hoja de Cocina', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(
            `Fecha: ${new Date(selectedDate).toLocaleDateString('es-CR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`,
            105,
            30,
            { align: 'center' }
        );

        // Construir estructura consolidada por menú/plato usando el modelo normalizado
        const kitchenData = buildKitchenSheetData(orders, {});

        let currentY = 40;

        Object.values(kitchenData.porMenu).forEach((menuBlock, indexMenu) => {
            if (indexMenu > 0) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`Menú: ${menuBlock.tipoMenu}`, 14, currentY);
            currentY += 6;

            // Tabla por plato (1–5) con sus ingredientes
            const platos = Object.values(menuBlock.platos).sort(
                (a, b) => (a.numero || 0) - (b.numero || 0)
            );

            const head = [['Plato', 'Proteína (g)', 'Carbo (g / tazas)', 'Vegetal (g / tazas)', 'Platos']];
            const body = platos.map((p) => {
                const carboTexto = `${p.carbo.totalGramos || 0} g / ${p.carbo.totalTazas || 0} taza(s)`;
                const vegetalTexto = `${p.vegetal.totalGramos || 0} g / ${
                    p.vegetal.totalTazas || 0
                } taza(s)`;
                return [
                    `Plato ${p.numero}`,
                    `${p.proteina.totalGramos || 0} g`,
                    carboTexto,
                    vegetalTexto,
                    p.totalPlatos || 0
                ];
            });

            autoTable(doc, {
                startY: currentY,
                head,
                body,
                theme: 'grid',
                headStyles: { fillColor: [148, 201, 115], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 45 },
                    3: { cellWidth: 45 },
                    4: { cellWidth: 20, halign: 'center' }
                }
            });

            currentY = doc.lastAutoTable.finalY + 8;

            // Observaciones por cliente para este tipo de menú
            const obs = kitchenData.observacionesPorMenu[menuBlock.tipoMenu] || [];
            if (obs.length > 0) {
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text('Observaciones de clientes:', 14, currentY);
                currentY += 6;

                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                obs.forEach((o) => {
                    if (currentY > 270) {
                        doc.addPage();
                        currentY = 20;
                    }
                    doc.text(`- ${o.cliente}: ${o.observaciones}`, 16, currentY);
                    currentY += 5;
                });
            }
        });

        // Sección de desayunos (clientes que llevan desayuno)
        let yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : currentY + 12;
        if (kitchenData.desayunos.length > 0) {
            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Desayunos', 14, yPos);
            yPos += 6;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            kitchenData.desayunos.forEach((d) => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(`- ${d.cliente} (${d.tipoMenu})`, 16, yPos);
                yPos += 5;
            });
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado: ${new Date().toLocaleString('es-CR')}`, 14, 285);
        doc.text('BiKitchen Food - Sistema de Gestión', 105, 285, { align: 'center' });

        doc.save(`Hoja_Cocina_${selectedDate}.pdf`);
    };

    const generatePackingSheet = () => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('BiKitchen - Hoja de Empaque', 105, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(
            `Fecha: ${new Date(selectedDate).toLocaleDateString('es-CR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`,
            105,
            30,
            { align: 'center' }
        );

        // Construir datos detallados por cliente usando el modelo normalizado
        const packagingData = buildPackagingSheetData(orders, {}, null);

        // Tabla por cliente (resumen)
        const tableData = packagingData.clientes.map((c) => {
            const platosTexto = (c.platos || [])
                .map(
                    (p) =>
                        `P${p.numero}: ${p.proteina?.nombre || ''} / ${p.carbo?.nombre || ''} / ${
                            p.vegetal?.nombre || ''
                        }`
                )
                .join('\n');

            return [
                c.cliente,
                c.tipoMenu || '',
                platosTexto,
                c.observaciones || ''
            ];
        });

        autoTable(doc, {
            startY: 40,
            head: [['Cliente', 'Menú', 'Platos (P1–P5)', 'Observaciones']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [148, 201, 115], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 35, fontStyle: 'bold' },
                1: { cellWidth: 30 },
                2: { cellWidth: 85 },
                3: { cellWidth: 45, fontSize: 7 }
            }
        });

        // Sección de desayunos
        let yPos = doc.lastAutoTable.finalY + 10;
        if (packagingData.desayunos.length > 0) {
            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            doc.text('Desayunos', 14, yPos);
            yPos += 6;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            packagingData.desayunos.forEach((d) => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(`- ${d.cliente} (${d.tipoMenu})`, 16, yPos);
                yPos += 5;
            });
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Generado: ${new Date().toLocaleString('es-CR')}`, 14, 285);
        doc.text('BiKitchen Food - Sistema de Gestión', 105, 285, { align: 'center' });

        doc.save(`Hoja_Empaque_${selectedDate}.pdf`);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hojas de Producción</h1>
                <p className="text-sm text-gray-500 mt-1">Genera hojas de cocina y empaque automáticamente</p>
            </div>

            {/* Date Selector */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
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
                    <div className="ml-auto text-sm text-gray-500">
                        {orders.length} pedido{orders.length !== 1 ? 's' : ''} para esta fecha
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kitchen Sheet */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 shadow-sm border border-blue-200 cursor-pointer"
                    onClick={orders.length > 0 ? generateKitchenSheet : null}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-500 text-white rounded-lg">
                            <ChefHat size={32} />
                        </div>
                        <Download size={20} className="text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Hoja de Cocina</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Genera PDF con menús agrupados, cantidades y totales de ingredientes para el equipo de cocina.
                    </p>
                    <button
                        onClick={generateKitchenSheet}
                        disabled={orders.length === 0}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Printer size={18} />
                        Generar Hoja de Cocina
                    </button>
                </motion.div>

                {/* Packing Sheet */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-8 shadow-sm border border-purple-200 cursor-pointer"
                    onClick={orders.length > 0 ? generatePackingSheet : null}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-purple-500 text-white rounded-lg">
                            <PackageIcon size={32} />
                        </div>
                        <Download size={20} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Hoja de Empaque</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Genera PDF con listado por cliente, menús del día y etiquetas para cada plato.
                    </p>
                    <button
                        onClick={generatePackingSheet}
                        disabled={orders.length === 0}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Printer size={18} />
                        Generar Hoja de Empaque
                    </button>
                </motion.div>
            </div>

            {/* Preview */}
            {orders.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-orange-500" />
                        Vista Previa de Pedidos
                    </h3>
                    <div className="space-y-3">
                        {orders.map((order, idx) => (
                            <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-semibold text-gray-900">{order.cliente}</div>
                                    <div className="text-xs text-gray-500">{order.plan}</div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {order.menu?.map((m, i) => (
                                        <div key={i} className="flex items-center gap-2 mt-1">
                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                            <span>{m.nombre}</span>
                                            <span className="text-xs text-gray-400">
                                                ({m.proteina}, {m.carbo}, {m.ensalada})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                {order.observaciones && (
                                    <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                        ⚠️ {order.observaciones}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {orders.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay pedidos para la fecha seleccionada</p>
                    <p className="text-sm mt-2">Selecciona otra fecha o crea nuevos pedidos</p>
                </div>
            )}
        </div>
    );
}
