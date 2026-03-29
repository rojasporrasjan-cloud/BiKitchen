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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
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

    const loadOrdersForDate = async (date, force = false) => {
        setLoading(true);
        try {
            console.log('[Sheets] Cargando pedidos para fecha:', date);
            const cacheKey = `sheets_orders_${date}`;
            if (force) invalidateCache(cacheKey);

            const rawOrders = await cachedFetch(cacheKey, async () => {
                const q = query(
                    collection(db, "pedidos"),
                    where("fecha_entrega", "==", date),
                    orderBy("cliente", "asc")
                );
                const snapshot = await getDocs(q);
                console.log('[Sheets] Documentos encontrados:', snapshot.size);
                return snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }, 'dashboard');

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

                // Fila 1: Proteína
                const row1 = [
                    { content: `Plato ${p.numero}`, rowSpan: 3, styles: { valign: 'middle', halign: 'center' } }, // # Plato
                    p.proteina.nombre || 'Sin proteína', // Descripción
                    `${p.proteina.gramosPorPorcion || 120}`, // Cantidad (grams)
                    { content: String(totalPlatos), rowSpan: 3, styles: { valign: 'middle', halign: 'center', fontStyle: 'bold', fontSize: 10 } }, // Platos (merged)
                    { content: specsTexto, rowSpan: (platos.length * 3), styles: { valign: 'top' } } // Especificaciones (merged for WHOLE table? Or per plate?)
                    // REVISIÓN: La imagen muestra "Especificaciones" como columna vacía o con notas. 
                    // Si las notas son GENERALES del menú, mejor un merge grande. 
                    // Si son por plato, necesitaríamos saber qué cliente pidió qué plato. El modelo actual no linkea obs->plato específico fácilmente, 
                    // pero asumimos que las notas del menú aplican al bloque.
                    // Sin embargo, autotable rowSpan across diverse Dynamic content is tricky if we iterate.
                    // Vamos a poner las specs en la PRIMERA celda del primer plato y hacer rowspan gigante?
                    // Mejor: Pongamos las specs en una columna separada que se repita o se mergee por plato.
                    // El usuario dijo "ahi hay que poner cuantos menus son si hay indicaciones...".
                    // Intentaremos hacer merge por PLATO si pudiéramos filtrar, pero como no podemos, haremos un merge GIGANTE para todo el menú
                    // O simplemente repetirlo vacio en los otros.
                ];

                // Ajuste: Rowspan de Specs será tricky si iteramos.
                // Mejor estrategia: Que la columna Specs sea independiente o se llene solo en la primera fila del primer plato con rowspan = totalRows.

                // Recalculando body pus:

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
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent outline-none text-sm font-medium text-white"
                        />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                {/* Excel Export */}
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-8 shadow-sm border border-green-200 cursor-pointer"
                    onClick={orders.length > 0 ? generateExcel : null}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-green-500 text-white rounded-lg">
                            <FileSpreadsheet size={32} />
                        </div>
                        <Download size={20} className="text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Exportar Excel</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Descarga CSV con cálculos de cocción y lista de empaque.
                    </p>
                    <button
                        onClick={generateExcel}
                        disabled={orders.length === 0}
                        className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <FileSpreadsheet size={18} />
                        Descargar Excel
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
