import React, { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    Calendar,
    ChefHat,
    Package as PackageIcon,
    Printer,
    ClipboardList,
    RefreshCw,
    FileSpreadsheet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../../firebase/config';
import { cachedFetch, invalidateCache } from '../../utils/firestoreCache';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { getScheduleFromOrder } from '../../utils/orderDates';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
// Utilidades de logística: normalización de pedidos y armado de hojas
import {
    mapPedidosFromLegacy,
    buildKitchenSheetData,
    buildPackagingSheetData
} from '../../utils/logisticsUtils';
import { useOrders } from '../../context/OrdersContext';

export default function SheetsView() {
    const { orders: allOrders } = useOrders();
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    // Pedidos ya normalizados al modelo de platos/ingredientes
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(false);
    // Pedidos de esta fecha que NO están confirmados. Esta pantalla los muestra,
    // pero la hoja que se imprime para cocina y empaque solo incluye confirmados,
    // así que hay que avisarlo o se cocina de menos.
    const [sinConfirmar, setSinConfirmar] = useState([]);

    // Obtener fechas disponibles de pedidos activos
    useEffect(() => {
        if (!allOrders || allOrders.length === 0) return;
        
        const dates = allOrders
            .map(o => o.fecha_entrega || (o.details && o.details.fechaEntrega))
            .filter(Boolean); // Remover nulls/undefined
            
        // Valores únicos, ordenados descendente
        const uniqueDates = [...new Set(dates)].sort((a, b) => new Date(b) - new Date(a));
        
        setAvailableDates(uniqueDates);
        
        // Auto-seleccionar la primera fecha disponible si es la primera carga
        if (uniqueDates.length > 0 && !uniqueDates.includes(selectedDate)) {
            setSelectedDate(uniqueDates[0]);
        }
    }, [allOrders]);

    const loadOrdersForDate = async (date, force = false) => {
        setLoading(true);
        try {
            const cacheKey = `sheets_orders_${date}`;
            if (force) invalidateCache(cacheKey);

            const rawOrders = await cachedFetch(cacheKey, async () => {
                const targetDate = new Date(date + "T12:00:00");
                const pastDate = new Date(targetDate);
                pastDate.setDate(pastDate.getDate() - 40); // Buscar hasta 40 días atrás para mensualidades
                const pastDateStr = pastDate.toISOString().split('T')[0];

                // Obtener todos los pedidos recientes que podrían tener entregas en esta fecha
                const q = query(
                    collection(db, "pedidos"),
                    where("fecha_entrega", ">=", pastDateStr)
                );
                
                const snapshot = await getDocs(q);
                let results = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Filtrar localmente usando la función que genera el schedule real
                results = results.filter(order => {
                    if (order.status === 'cancelled') return false;
                    const schedule = getScheduleFromOrder(order);
                    return schedule.includes(date);
                });

                // Ordenar por cliente
                results.sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''));

                return results;
            }, 'dashboard');

            // Mismos estados que acepta PrintProductionView para la hoja impresa
            const ESTADOS_QUE_SI_IMPRIMEN = ['confirmed', 'confirmado', 'pagado', 'preparing', 'preparando', 'making', 'ready', 'listo'];
            setSinConfirmar(
                rawOrders.filter(o => !ESTADOS_QUE_SI_IMPRIMEN.includes((o.status || o.estado || '').toLowerCase()))
            );

            const normalized = mapPedidosFromLegacy(rawOrders);

            setOrders(normalized);
        } catch (error) {
            console.error("[Sheets] Error loading orders:", error);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadOrdersForDate(selectedDate);
    }, [selectedDate]);

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

            // -------------------------------------------------------------------------
            // TABLA REDISEÑADA (Row-based: Prot / Veg / Carb)
            // Columnas: # de Plato | Descripción | Cantidad | Platos | Especificaciones
            // -------------------------------------------------------------------------

            const platos = Object.values(menuBlock.platos).sort(
                (a, b) => (a.numero || 0) - (b.numero || 0)
            );

            // Preparar las observaciones de este menú para la columna de specs
            // Formato: "Juan: Sin cebolla\nMaria: Poca sal"
            const obsList = kitchenData.observacionesPorMenu[menuBlock.tipoMenu] || [];
            // Filtrar duplicados si es necesario o agrupar
            let specsTexto = '';
            if (obsList.length > 0) {
                specsTexto = obsList.map(o => `${o.cliente}: ${o.observaciones}`).join('\n');
            }

            const head = [['# de Plato', 'Descripción', 'Cantidad', 'Platos', 'Especificaciones']];
            const body = [];

            platos.forEach((p) => {
                const totalPlatos = p.totalPlatos || 0;

                // Proteína
                const cells1 = [
                    { content: `Plato ${p.numero}`, rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } },
                    p.proteina.nombre || '-',
                    `${p.proteina.gramosPorPorcion || 0} g`,
                    { content: String(totalPlatos), rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', fontSize: 11 } }
                ];

                // Si es el PRIMER plato de la lista, añadimos la celda de specs con rowspan gigante
                if (p === platos[0]) {
                    cells1.push({
                        content: specsTexto,
                        rowSpan: (platos.length * 3),
                        styles: { valign: 'top', fontSize: 8, overflow: 'linebreak' }
                    });
                }

                body.push(cells1);

                // Vegetal
                const vegQty = p.vegetal.unidadBase === 'taza' ? `${p.vegetal.cantidadBase} taza(s)` : `${p.vegetal.cantidadBase} g`;
                body.push([
                    p.vegetal.nombre || 'Vegetales',
                    vegQty
                ]);

                // Carbo
                const carboQty = p.carbo.unidadBase === 'taza' ? `${p.carbo.cantidadBase} taza(s)` : `${p.carbo.cantidadBase} g`;
                body.push([
                    p.carbo.nombre || 'Harina/Carbo',
                    carboQty
                ]);
            });

            // Headers para la tabla ("CANTIDAD POR PLATO" simulation in header)
            // La imagen tiene un header amarillo complejo "Menú #1 Bajo Calorias"
            // y luego filas de "CANTIDAD POR PLATO...".
            // Nosotros usaremos columnas estándar para limpieza.

            autoTable(doc, {
                startY: currentY,
                head,
                body,
                theme: 'grid',
                headStyles: {
                    fillColor: [255, 193, 7], // Amber/Yellow header like image
                    textColor: 0, // Black text
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    lineColor: [0, 0, 0]
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.1,
                    textColor: 0
                },
                columnStyles: {
                    0: { cellWidth: 20 }, // # Plato
                    1: { cellWidth: 80 }, // Descripcion
                    2: { cellWidth: 25, halign: 'center' }, // Cantidad
                    3: { cellWidth: 15, halign: 'center' }, // Platos
                    4: { cellWidth: 50 }  // Specs
                },
                didParseCell: (data) => {
                    // Logic to handle missing cells due to rowspans if needed? 
                    // AutoTable handles content-based rowspans well usually.
                }
            });

            currentY = doc.lastAutoTable.finalY + 15;
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

    const generateExcel = () => {
        // "Hoja de Empaque" Detallada (Row per Meal)
        // Requerimiento: Agrupar por plato, listar especificaciones y cliente.

        let rows = [];

        orders.forEach(order => {
            const qtyMenus = order.cantidadMenus || 1;
            const cliente = order.cliente || 'Anónimo';
            const notas = order.observaciones ? order.observaciones.replace(/"/g, '""') : '';

            // Expandir cada plato del menú
            if (Array.isArray(order.platos)) {
                order.platos.forEach(plato => {
                    // Nombre compuesto del plato
                    const pName = plato.proteina?.nombre || 'Proteína';
                    const cName = plato.carbo?.nombre || 'Carbo';
                    const vName = plato.vegetal?.nombre || 'Veg';
                    const platoFull = `${pName} con ${cName} y ${vName}`;

                    // Specs
                    const protSpec = `${plato.proteina?.gramosPorPorcion || 0}g`;
                    const carboSpec = plato.carbo ? `${plato.carbo.cantidadPorPorcion}${plato.carbo.unidad}` : '-';
                    const vegSpec = plato.vegetal ? `${plato.vegetal.cantidadPorPorcion}${plato.vegetal.unidad}` : '-';
                    const guarniciones = `C:${carboSpec} V:${vegSpec}`;

                    // Repetir por cantidad de menús (si pidió 2 packs, son 2 de este plato)
                    for (let i = 0; i < qtyMenus; i++) {
                        rows.push({
                            plato: platoFull,
                            proteinaDesc: pName, // para ordenar
                            cantidad: 1, // 1 plato individual
                            specs: protSpec,
                            guarniciones: guarniciones,
                            notas: notas,
                            cliente: cliente
                        });
                    }
                });
            }
        });

        // Ordenar por Nombre del Plato (Proteína) para agrupar en el Excel
        rows.sort((a, b) => a.proteinaDesc.localeCompare(b.proteinaDesc));

        // Generar CSV
        let csvContent = "\uFEFF"; // BOM
        csvContent += "HOJA DE EMPAQUE DETALLADA - " + selectedDate + "\n\n";
        csvContent += "Plato (Descripción),Cantidad,Proteína,Guarniciones,Notas,Cliente\n";

        rows.forEach(r => {
            csvContent += `"${r.plato}",${r.cantidad},"${r.specs}","${r.guarniciones}","${r.notas}","${r.cliente}"\n`;
        });

        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Empaque_Detalle_${selectedDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const generatePackingSheet = () => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for better grid

        // Datos normalizados
        const packagingData = buildPackagingSheetData(orders, {}, null);

        // Agrupar por PACK (Tipo de Menú)
        // Estructura: packName -> { clientes: [], platosBase: [], totalPacks: N }
        const packsMap = {};

        packagingData.clientes.forEach((c) => {
            const packName = c.plan || c.tipoMenu || 'Pack Estándar';
            if (!packsMap[packName]) {
                packsMap[packName] = {
                    name: packName,
                    clientes: [],
                    platosBase: [], // Se tomará del primer cliente
                    totalPacks: 0
                };
            }
            // Agrupar clientes por nombre para sumar cantidades si un cliente pidió 2 packs del mismo
            const existingClient = packsMap[packName].clientes.find(cli => cli.nombre === c.cliente);
            if (existingClient) {
                existingClient.cantidad += (c.cantidadMenus || 1);
                // Concatenar observaciones si son diferentes
                if (c.observaciones && !existingClient.observaciones.includes(c.observaciones)) {
                    existingClient.observaciones += ` | ${c.observaciones}`;
                }
            } else {
                packsMap[packName].clientes.push({
                    nombre: c.cliente,
                    cantidad: c.cantidadMenus || 1,
                    observaciones: c.observaciones || ''
                });
            }

            packsMap[packName].totalPacks += (c.cantidadMenus || 1);

            // Guardar referencia de platos del primer cliente para saber qué incluye el pack
            if (packsMap[packName].platosBase.length === 0 && c.platos && c.platos.length > 0) {
                packsMap[packName].platosBase = c.platos;
            }
        });

        const packNames = Object.keys(packsMap).sort();

        if (packNames.length === 0) {
            doc.text('No hay pedidos para generar hoja de empaque.', 14, 20);
            doc.save(`Hoja_Empaque_${selectedDate}.pdf`);
            return;
        }

        packNames.forEach((packName, indexPack) => {
            if (indexPack > 0) doc.addPage();

            const packData = packsMap[packName];
            const clientesList = packData.clientes; // Array de objetos {nombre, cantidad, observaciones}
            // Sort clients alphabetically
            clientesList.sort((a, b) => a.nombre.localeCompare(b.nombre));

            // Prepare "Especificaciones" text (list of clients/notes)
            // FORMAT: "Juan Perez (1) - Sin cebolla"
            let specsList = [];
            clientesList.forEach(c => {
                const note = c.observaciones ? `** ${c.observaciones}` : '';
                specsList.push(`${c.nombre} (${c.cantidad})${note ? `\n   ${note}` : ''}`);
            });
            const specsText = specsList.join('\n');


            // --- HEADER ---
            // Yellow Header Bar
            doc.setFillColor(255, 193, 7); // Amber/Yellow
            doc.rect(14, 10, 269, 10, 'F');
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0);
            doc.text(`${packName}`, 148.5, 17, { align: 'center' });

            // Standard Portions Sub-header (Mocked based on image)
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0);

            // Draw a simple table for standard portions manually or via text
            let yPos = 25;
            doc.setLineWidth(0.3);
            doc.line(14, yPos, 283, yPos); // Top line

            const standards = [
                { label: "CANTIDAD POR PLATO", value: "120 GRAMOS DE CARNE(PROTEINA)" },
                { label: "CANTIDAD POR PLATO", value: "1 TAZA DE VEGETALES" },
                { label: "CANTIDAD POR PLATO", value: "1/2 TAZA DE HARINA" }
            ];

            standards.forEach((std) => {
                doc.setFont(undefined, 'bold');
                doc.text(std.label, 16, yPos + 4);
                doc.setFont(undefined, 'normal');
                doc.text(std.value, 80, yPos + 4);
                yPos += 6;
                doc.line(14, yPos, 283, yPos);
            });


            // --- MAIN GRID TABLE ---
            const head = [['# de Plato', 'Descripcion', 'Cantidad', 'Platos', 'Especificaciones']];
            const body = [];

            // Sort plates 1-6
            const platos = (packData.platosBase || []).sort((a, b) => (a.numero || 0) - (b.numero || 0));

            platos.forEach((p, idx) => {
                const plateNum = p.numero || (idx + 1);
                const totalPlatos = packData.totalPacks; // Approx total packs = total plates of this type

                // We need 3 rows per Plate:
                // Row 1: Protein
                // Row 2: Veg
                // Row 3: Carb

                // Row 1 (Protein) - Valid Cells
                const row1 = [
                    { content: `Plato ${plateNum}`, rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold' } }, // # Plato
                    p.proteina?.nombre || '', // Descripcion
                    p.proteina?.gramosPorPorcion ? `${p.proteina.gramosPorPorcion}` : '', // Cantidad
                    { content: String(totalPlatos), rowSpan: 3, styles: { valign: 'middle', halign: 'center' } }, // Platos (merged)
                ];

                // Add Specs only on the very first row of the very first plate (spanning all rows)
                if (idx === 0) {
                    // Calculate total rows for rowspan: numPlates * 3
                    const totalRows = platos.length * 3;
                    row1.push({
                        content: specsText,
                        rowSpan: totalRows,
                        styles: { valign: 'top', fontSize: 8, cellWidth: 'auto' }
                    });
                }
                // Note: For other rows, the 'Especificaciones' column is skipped in definition because rowSpan covers it.
                // autoTable will handle it if we strictly define columns.

                body.push(row1);

                // Row 2 (Vegetable)
                const vegUnit = p.vegetal?.unidad === 'taza' ? 'taza' : 'g'; // simplified unit
                const vegQty = p.vegetal?.cantidadPorPorcion || '';

                body.push([
                    p.vegetal?.nombre || '', // Descripcion
                    vegQty ? `${vegQty}` : ''  // Cantidad
                    // Platos merged
                    // Specs merged
                ]);

                // Row 3 (Starch/Carb)
                const carbUnit = p.carbo?.unidad === 'taza' ? 'taza' : 'g';
                const carbQty = p.carbo?.cantidadPorPorcion || '';

                body.push([
                    p.carbo?.nombre || '', // Descripcion
                    carbQty ? `${carbQty}` : ''
                    // Platos merged
                    // Specs merged
                ]);
            });


            autoTable(doc, {
                startY: yPos, // Start after the standard portion header
                head: head,
                body: body,
                theme: 'grid', // Strict grid as requested
                styles: {
                    fontSize: 10,
                    cellPadding: 2,
                    lineColor: [0, 0, 0],
                    lineWidth: 0.2, // Thicker strict lines
                    textColor: 0,
                    overflow: 'linebreak'
                },
                headStyles: {
                    fillColor: [255, 255, 255], // White header with bold text
                    textColor: 0,
                    fontStyle: 'bold',
                    lineWidth: 0.2,
                    lineColor: [0, 0, 0],
                    halign: 'center' // Center headers
                },
                columnStyles: {
                    0: { cellWidth: 25 }, // # Plato
                    1: { cellWidth: 90 }, // Descripcion
                    2: { cellWidth: 20, halign: 'center' }, // Cantidad
                    3: { cellWidth: 20, halign: 'center' }, // Platos
                    4: { cellWidth: 110 } // Especificaciones (Rest of landscape width)
                }
            });

            // Footer info
            doc.setFontSize(8);
            doc.text(`Generado: ${new Date().toLocaleString('es-CR')} | Total Packs: ${packData.totalPacks}`, 14, 195); // Bottom of landscape
        });

        doc.save(`Hoja_Empaque_Grid_${selectedDate}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <AdminPageHeader
                icon={ClipboardList}
                title="Hojas de Producción"
                subtitle="Genera hojas de cocina y empaque automáticamente por fecha"
                gradient="from-teal-500 via-cyan-400 to-blue-400"
                stats={[
                    { value: orders.length, label: 'Pedidos' },
                    { value: selectedDate, label: 'Fecha' }
                ]}
                actions={[
                    <div key="date" className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                        <Calendar size={18} className="text-white" />
                        <select
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent outline-none text-sm font-medium text-white appearance-none cursor-pointer"
                        >
                            <option value={selectedDate} className="text-gray-900">{selectedDate}</option>
                            {availableDates.filter(d => d !== selectedDate).map(date => (
                                <option key={date} value={date} className="text-gray-900">{date}</option>
                            ))}
                        </select>
                    </div>,
                    <button
                        key="refresh"
                        onClick={() => loadOrdersForDate(selectedDate, true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Actualizar
                    </button>
                ]}
            />

            {/* Pedidos que se ven acá pero NO salen en la hoja impresa */}
            {sinConfirmar.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <p className="font-bold text-amber-900">
                        ⚠️ {sinConfirmar.length} pedido{sinConfirmar.length > 1 ? 's' : ''} de esta fecha no va{sinConfirmar.length > 1 ? 'n' : ''} a salir en la hoja impresa
                    </p>
                    <p className="text-sm text-amber-800 mt-1">
                        La hoja de cocina y la de empaque solo incluyen pedidos confirmados.
                        Confirmalos en <strong>Pedidos</strong> antes de imprimir, o esa comida no se prepara.
                    </p>
                    <ul className="mt-3 space-y-1 text-sm text-amber-900">
                        {sinConfirmar.map(o => (
                            <li key={o.id}>
                                • <strong>{o.cliente || 'Sin nombre'}</strong> — {o.numeroOrden || o.id.slice(0, 8)}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Date Selector */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 text-gray-700">
                        <Calendar size={20} className="text-orange-500" />
                        <span className="font-medium">Fecha de Entrega:</span>
                    </div>
                    <select
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 bg-white cursor-pointer"
                    >
                        <option value={selectedDate}>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}</option>
                        {availableDates.filter(d => d !== selectedDate).map(date => (
                            <option key={date} value={date}>
                                {new Date(date + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
                            </option>
                        ))}
                    </select>
                    <div className="ml-auto text-sm text-gray-500">
                        {orders.length} pedido{orders.length !== 1 ? 's' : ''} para esta fecha
                    </div>
                </div>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Kitchen Sheet */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-8 shadow-sm border border-blue-200 cursor-pointer"
                    onClick={() => {
                        if (orders.length > 0) {
                            window.open(`/admin/print-production?date=${selectedDate}&view=cocina`, '_blank');
                        }
                    }}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-500 text-white rounded-lg">
                            <ChefHat size={32} />
                        </div>
                        <Printer size={20} className="text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Hoja de Cocina</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Abre una vista web idéntica al Excel con las cantidades y totales de ingredientes para el equipo de cocina. Lista para imprimir.
                    </p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (orders.length > 0) {
                                window.open(`/admin/print-production?date=${selectedDate}&view=cocina`, '_blank');
                            }
                        }}
                        disabled={orders.length === 0}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Printer size={18} />
                        Abrir Hoja de Cocina
                    </button>
                </motion.div>

                {/* Packing Sheet */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-8 shadow-sm border border-purple-200 cursor-pointer"
                    onClick={() => {
                        if (orders.length > 0) {
                            window.open(`/admin/print-production?date=${selectedDate}&view=empaque`, '_blank');
                        }
                    }}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-purple-500 text-white rounded-lg">
                            <PackageIcon size={32} />
                        </div>
                        <Printer size={20} className="text-purple-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Hoja de Empaque</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Abre una vista web idéntica al Excel con el listado por cliente y las etiquetas para cada plato. Lista para imprimir.
                    </p>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (orders.length > 0) {
                                window.open(`/admin/print-production?date=${selectedDate}&view=empaque`, '_blank');
                            }
                        }}
                        disabled={orders.length === 0}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Printer size={18} />
                        Abrir Hoja de Empaque
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
