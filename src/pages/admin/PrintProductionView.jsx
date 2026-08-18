import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
    mapPedidosFromLegacy,
    buildKitchenSheetData,
    buildPackagingSheetData
} from '../../utils/logisticsUtils';
import {
    mapPackNameToMenuKey,
    isIndividualPack,
    getDefaultGrams
} from '../../utils/packClassification';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import { getScheduleFromOrder } from '../../utils/orderDates';
import { ESTADOS_QUE_IMPRIMEN } from '../../utils/estadosPedido';
import { revisarHoja } from '../../utils/revisarHoja';
import { sumarAGranel } from '../../utils/granelKitchen';
import RevisionHoja from '../../components/admin/RevisionHoja';
import { cargarPedidosExcel19Agosto } from '../../data/customExcelOrders19Aug';
import { individualesData, getProductUnits } from '../../data/individualesData';

const MENU_LABELS = {
    regular: 'PACK REGULAR',
    fullPack: 'FULL PACK',
    bajoCalorias: 'PACK BAJO EN CALORÍAS',
    sinCarbos: 'PACK SIN CARBOS',
    keto: 'PACK KETO',
    vegetariano: 'PACK VEGETARIANO',
    casaditos: 'PACK CASADITOS',
};

export default function PrintProductionView() {
    const [searchParams] = useSearchParams();
    const date = searchParams.get('date');
    const viewMode = searchParams.get('view') || 'all';
    const [orders, setOrders] = useState([]);
    const [officialMenus, setOfficialMenus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [empaqueTab, setEmpaqueTab] = useState('packs');
    const [kitchenAssignments, setKitchenAssignments] = useState({});
    const [categoryCookInputs, setCategoryCookInputs] = useState({});
    const [selectedKitchenItems, setSelectedKitchenItems] = useState([]);
    const [bulkSelectedCook, setBulkSelectedCook] = useState('');
    const [importingExcel, setImportingExcel] = useState(false);

    const handleCargarMenuExcel19Agosto = async () => {
        if (!window.confirm('¿Deseas cargar los 6 pedidos personalizados del Excel (Carolina Laurito, Christian Vargas, Beatriz González, Mariana Salas, Sonia Oreamuno, Bryan Ocampo) directamente para el 19 de Agosto en la Hoja de Producción?')) return;
        setImportingExcel(true);
        try {
            await cargarPedidosExcel19Agosto(db);
            alert('¡Los 6 pedidos personalizados del Excel han sido creados e ingresados exitosamente a la Hoja de Producción!');
            window.location.reload();
        } catch (err) {
            console.error('Error al cargar pedidos del Excel:', err);
            alert('Ocurrió un error al guardar los pedidos en Firestore: ' + err.message);
        } finally {
            setImportingExcel(false);
        }
    };

    // ... useEffect code ...

    useEffect(() => {
        if (!date) return;
        const loadOrders = async () => {
            setLoading(true);
            try {
                const targetDate = new Date(date + "T12:00:00");
                const pastDate = new Date(targetDate);
                pastDate.setDate(pastDate.getDate() - 40); // Buscar hasta 40 días atrás para mensualidades
                const pastDateStr = pastDate.toISOString().split('T')[0];

                const q = query(
                    collection(db, "pedidos"),
                    where("fecha_entrega", ">=", pastDateStr)
                );

                const snapshot = await getDocs(q);
                let rawOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Filtrar localmente usando el schedule real (Excluir sólo cancelados / archivados)
                // Solo se imprime lo confirmado. `in_transit` entra a propósito:
                // un pack mensual se despacha la semana 1 y queda "en ruta", pero
                // sus semanas 2, 3 y 4 todavía hay que cocinarlas.
                rawOrders = rawOrders.filter(order => {
                    const status = (order.status || order.estado || '').toLowerCase();
                    if (!ESTADOS_QUE_IMPRIMEN.includes(status)) return false;

                    const schedule = getScheduleFromOrder(order);
                    return schedule.includes(date);
                });

                // Ordenar por cliente
                rawOrders.sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''));

                setOrders(mapPedidosFromLegacy(rawOrders));
                const menus = await getOfficialMenus();
                setOfficialMenus(menus);
            } catch (error) {
                console.error("Error loading data:", error);
            }
            setLoading(false);
        };
        loadOrders();
    }, [date]);


    if (!date) return <div className="p-8 text-center text-xl">Falta la fecha en la URL</div>;
    if (loading) return <div className="p-8 text-center text-xl">Cargando datos para impresión...</div>;
    if (orders.length === 0) return (
        <div className="p-8 text-center text-xl space-y-6 max-w-2xl mx-auto mt-12 bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <div className="text-gray-700 font-semibold">No se encontraron pedidos registrados para el: <span className="text-purple-600 font-black">{date}</span></div>
            {date === '2026-08-19' && (
                <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500 mb-4">¿Querés ingresar automáticamente los 6 menús personalizados del Excel a la producción de esta fecha?</p>
                    <button
                        onClick={handleCargarMenuExcel19Agosto}
                        disabled={importingExcel}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-base rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-3 cursor-pointer"
                    >
                        {importingExcel ? '⏳ Cargando pedidos a la base de datos...' : '⚡ Cargar Automáticamente 6 Menús Personalizados Excel (19 Agosto)'}
                    </button>
                </div>
            )}
        </div>
    );

    const kitchenData = buildKitchenSheetData(orders, {});
    const packagingData = buildPackagingSheetData(orders, {}, null);

    // Group packaging data by Pack
    const packsMap = {};

    const addClientToPackMap = (pName, cData, overridePlates = null) => {
        if (!packsMap[pName]) {
            packsMap[pName] = { name: pName, clientes: [], platosBase: [], totalPacks: 0 };
        }
        const existingClient = packsMap[pName].clientes.find(existing => existing.nombre === cData.cliente);
        if (existingClient) {
            existingClient.cantidad += (cData.cantidadMenus || 1);
            if (cData.observaciones) existingClient.observaciones += ` | ${cData.observaciones}`;
        } else {
            packsMap[pName].clientes.push({
                nombre: cData.cliente,
                cantidad: cData.cantidadMenus || 1,
                observaciones: cData.observaciones || '',
                platos: overridePlates !== null ? overridePlates : (cData.platos || []),
                zona_envio: cData.zona_envio || cData.rawPedido?.zona_envio || '',
                incluyeDesayuno: !!cData.incluyeDesayuno,
                categoria: cData.categoria || '',
                categoryLabel: cData.categoryLabel || '',
                plan: cData.plan || cData.tipoMenu || '',
                rawPedido: cData
            });
        }
        packsMap[pName].totalPacks += (cData.cantidadMenus || 1);
        if (packsMap[pName].platosBase.length === 0 && cData.platos && cData.platos.length > 0 && overridePlates === null) {
            packsMap[pName].platosBase = cData.platos;
        }
    };

    packagingData.clientes.forEach((c) => {
        const isIndividual = c.categoria === 'individuales' || String(c.plan || c.tipoMenu || '').toLowerCase().includes('individual');

        let packsInOrder = [];

        if (isIndividual) {
            packsInOrder.push({ name: c.plan || c.tipoMenu || 'Pack Individuales', qty: c.cantidadMenus || 1, forceIndividual: true });
        } else {
            if (c.platos && c.platos.length > 0) {
                c.platos.forEach(p => {
                    let pName = p.proteina?.nombre;
                    if (!pName || pName === 'Proteína' || pName === '—') {
                        pName = c.plan || c.tipoMenu || 'Pack Estándar';
                    }
                    // Si el nombre del plato es un producto individual (tortas, empanadas, etc),
                    // enviarlo a la tabla de Individuales, no crear un pack fantasma
                    const isItemIndividual = isIndividualPack(pName);
                    packsInOrder.push({ name: pName, qty: (p.cantidad || 1), forceIndividual: isItemIndividual });
                });
            } else {
                packsInOrder.push({ name: c.plan || c.tipoMenu || 'Pack Estándar', qty: c.cantidadMenus || 1 });
            }
        }

        const aggregatedPacks = {};
        packsInOrder.forEach(pack => {
            if (!aggregatedPacks[pack.name]) aggregatedPacks[pack.name] = 0;
            aggregatedPacks[pack.name] += pack.qty;
        });

        const cleanCustomerNotes = (rawObs) => {
            if (!rawObs) return '';
            let text = String(rawObs);
            text = text.replace(/promoci[oó]n\s+almuerzo\s+y\s+cena\s+con\s+regal[ií]a\s+desayunos?\s+en\s+ambos\s+packs/gi, '');
            text = text.replace(/promoci[oó]n\s+almuerzo\s+y\s+cena\s+con\s+regal[ií]a\s+de\s+desayunos?/gi, '');
            text = text.replace(/promoci[oó]n\s+almuerzo\s+y\s+cena/gi, '');
            text = text.replace(/regal[ií]a\s+de\s+desayunos?/gi, '');
            text = text.replace(/regal[ií]a\s+desayunos?/gi, '');
            text = text.replace(/\bLleva\s+cena\b/gi, '');
            text = text.replace(/\bLleva\s+desayunos?\b/gi, '');
            text = text.replace(/\bLleva\s+también:[^\n·]+/gi, '');

            return text.split(/[·|\n]+/)
                .map(s => s.trim())
                .filter(s => s.length > 0 && !/^(lleva|promo|regal[ií]a)/i.test(s))
                .join(' · ');
        };

        Object.entries(aggregatedPacks).forEach(([packName, totalQty]) => {
            const nameLower = packName.toLowerCase();
            const obsLower = String(c.observaciones || '').toLowerCase();
            const obsHasCena = /\bcenas?\b/.test(obsLower);

            const hasBreakfastGift = nameLower.includes('regalia de desayuno') || nameLower.includes('regalía de desayuno') || nameLower.includes('+ desayuno') || nameLower.includes('con desayuno') || nameLower.includes('desayuno gratis');
            const obsHasBreakfast = obsLower.includes('desayunos') && (obsLower.includes('regalía') || obsLower.includes('regalia') || obsLower.includes('lleva') || obsLower.includes('con desayunos'));

            // La promo se detecta SOLO por lo que dice el pedido, nunca por el monto.
            // Un umbral de precio falla en silencio en las dos direcciones: un pack
            // con descuento se queda sin cenas, y un pedido grande sin promo las
            // recibe de más. La cocina no tiene cómo darse cuenta.
            const isCenaPromo = nameLower.includes('almuerzo y cena')
                || nameLower.includes('dos semanas con desayuno')
                || ((nameLower.includes('quincenal') || nameLower.includes('dos semanas') || nameLower.includes('2 semanas')) && (nameLower.includes('desayuno') || nameLower.includes('regalia') || nameLower.includes('regalía') || nameLower.includes('gratis')))
                || obsHasCena;



            const filteredPlates = isIndividual ? c.platos : (c.platos || []).filter(p => p.proteina?.nombre === packName);
            const clientForPack = { ...c, cantidadMenus: totalQty };
            const cleanObs = cleanCustomerNotes(c.observaciones);

            if (isCenaPromo) {
                // Copia para la tabla de ALMUERZOS → decir que también lleva cena
                const almuerzoClient = { ...clientForPack };
                almuerzoClient.observaciones = cleanObs ? `${cleanObs} · Lleva cena` : 'Lleva cena';
                addClientToPackMap(packName, almuerzoClient, filteredPlates.length > 0 ? filteredPlates : null);

                // Copia para la tabla de CENAS → decir qué pack de almuerzo lleva
                const menuKey = mapPackNameToMenuKey(packName);
                const packLabel = (menuKey && MENU_LABELS[menuKey]) ? MENU_LABELS[menuKey] : packName;
                const cenaClient = { ...clientForPack };
                cenaClient.observaciones = cleanObs ? `${cleanObs} · Lleva ${packLabel}` : `Lleva ${packLabel}`;
                addClientToPackMap(`CENAS - ${packName}`, cenaClient, filteredPlates.length > 0 ? filteredPlates : null);
            } else {
                const normClient = { ...clientForPack, observaciones: cleanObs };
                addClientToPackMap(packName, normClient, filteredPlates.length > 0 ? filteredPlates : null);
            }

            const menuKey = mapPackNameToMenuKey(packName);

            if ((c.incluyeDesayuno || hasBreakfastGift || obsHasBreakfast) && menuKey !== 'desayuno') {
                const desClient = { ...clientForPack, observaciones: cleanObs };
                addClientToPackMap('Pack de Desayunos', { ...desClient, cantidadMenus: totalQty }, []);
            }
        });
    });

    const allPackNames = Object.keys(packsMap).sort();
    const isDesayunoPack = (n) => mapPackNameToMenuKey(n) === 'desayuno';

    const isActuallyIndividual = (packName) => {
        if (isIndividualPack(packName)) return true;
        if (!mapPackNameToMenuKey(packName)) return true; // Si no pertenece a las 7 familias de packs oficiales, es un platillo individual/a la carta!
        const packData = packsMap[packName];
        if (!packData) return false;
        return packData.clientes.some(c => {
            const obs = String(c.observaciones || '').toLowerCase();
            if (obs.includes('proteina') || obs.includes('proteína') || obs.includes('individual') || obs.includes('granel')) return true;
            const cat = String(c.categoria || '').toLowerCase();
            if (cat.includes('individual')) return true;
            return false;
        });
    };

    // ── Consolidar packs que comparten el mismo menú (mismos platos) ──
    // "Pack Bajo Calorías Promo Almuerzo y Cena" y "Pack 2 Semanas Bajo Calorías"
    // tienen los MISMOS platos → se fusionan en UNA sola hoja de empaque.
    const MENU_ORDER = ['regular', 'fullPack', 'bajoCalorias', 'sinCarbos', 'keto', 'vegetariano', 'casaditos', null];

    const consolidatedPacksMap = {};
    const packNameToConsolidated = {}; // mapea nombre original → nombre consolidado

    allPackNames.forEach(packName => {
        if (isActuallyIndividual(packName) || isDesayunoPack(packName)) return;

        const menuKey = mapPackNameToMenuKey(packName);
        // Si tiene menuKey, consolidar bajo el label de la familia
        let consolidatedName = (menuKey && MENU_LABELS[menuKey]) ? MENU_LABELS[menuKey] : packName;

        // Si es una hoja de cenas, agregar el prefijo al nombre consolidado
        if (packName.startsWith('CENAS -')) {
            consolidatedName = `CENAS - ${consolidatedName.replace('CENAS - ', '')}`;
        }

        packNameToConsolidated[packName] = consolidatedName;

        if (!consolidatedPacksMap[consolidatedName]) {
            consolidatedPacksMap[consolidatedName] = {
                name: consolidatedName,
                clientes: [],
                platosBase: [],
                totalPacks: 0,
                sourcePackNames: [], // nombres originales de las promos fusionadas
                menuKey: menuKey,
            };
        }

        const target = consolidatedPacksMap[consolidatedName];
        const source = packsMap[packName];

        // Agregar cada cliente a la hoja consolidada
        source.clientes.forEach(c => {
            target.clientes.push({ ...c });
        });

        target.totalPacks += source.totalPacks;
        if (target.platosBase.length === 0 && source.platosBase.length > 0) {
            target.platosBase = source.platosBase;
        }
        if (!target.sourcePackNames.includes(packName)) {
            target.sourcePackNames.push(packName);
        }
    });

    // Ordenar las hojas consolidadas por familia de menú
    const getMenuIndex = (name) => {
        const entry = consolidatedPacksMap[name];
        const key = entry?.menuKey || mapPackNameToMenuKey(name);
        const idx = MENU_ORDER.indexOf(key);
        return idx === -1 ? MENU_ORDER.length : idx;
    };

    const regularPackNames = Object.keys(consolidatedPacksMap).sort((a, b) => {
        const idxA = getMenuIndex(a);
        const idxB = getMenuIndex(b);
        if (idxA !== idxB) return idxA - idxB;
        const countA = consolidatedPacksMap[a]?.totalPacks || 0;
        const countB = consolidatedPacksMap[b]?.totalPacks || 0;
        if (countA !== countB) return countB - countA;
        return a.localeCompare(b);
    });

    const sortedIndividualNames = allPackNames.filter(n => isActuallyIndividual(n) && !isDesayunoPack(n));
    const individualPackNames = sortedIndividualNames;
    const desayunoPackNames = allPackNames.filter(n => isDesayunoPack(n));

    const clientToOtherPacks = {};
    Object.keys(packsMap).forEach(pName => {
        // Usar nombres cortos y genéricos para no ensuciar la hoja de empaque
        let shortName = pName;
        if (isDesayunoPack(pName)) {
            shortName = 'Desayunos';
        } else if (isActuallyIndividual(pName)) {
            shortName = 'Individuales';
        } else {
            const menuKey = mapPackNameToMenuKey(pName);
            shortName = (menuKey && MENU_LABELS[menuKey]) ? MENU_LABELS[menuKey] : pName;
        }

        packsMap[pName].clientes.forEach(c => {
            const cName = c.nombre.trim().toLowerCase();
            if (!clientToOtherPacks[cName]) clientToOtherPacks[cName] = [];
            if (!clientToOtherPacks[cName].includes(shortName)) {
                clientToOtherPacks[cName].push(shortName);
            }
        });
    });

    const getOtherPacksTag = (cName, currentPackName) => {
        if (!cName) return '';

        // Normalizar el pack actual para poder filtrarlo
        let currentShortName = currentPackName;
        if (isDesayunoPack(currentPackName)) {
            currentShortName = 'Desayunos';
        } else if (isActuallyIndividual(currentPackName)) {
            currentShortName = 'Individuales';
        } else {
            const menuKey = mapPackNameToMenuKey(currentPackName);
            currentShortName = (menuKey && MENU_LABELS[menuKey]) ? MENU_LABELS[menuKey] : currentPackName;
        }

        const nameLower = cName.trim().toLowerCase();
        let otherPacks = (clientToOtherPacks[nameLower] || []).filter(p => p !== currentShortName);

        // No imprimir 'Desayunos' en 'Lleva también' si las observaciones ya dicen que lleva desayuno
        const clientObj = packsMap[currentPackName]?.clientes?.find(c => c.nombre.trim().toLowerCase() === nameLower);
        if (clientObj && clientObj.observaciones && clientObj.observaciones.toLowerCase().includes('desayun')) {
            otherPacks = otherPacks.filter(p => p !== 'Desayunos');
        }

        if (otherPacks.length > 0) {
            return `Lleva también: ${otherPacks.join(', ')}`;
        }
        return '';
    };

    const renderDesayunosTable = (packName, packData, currentDate) => {
        const menuKey = mapPackNameToMenuKey(packName);
        let rawPlatos = (officialMenus && menuKey && officialMenus[menuKey]) ? officialMenus[menuKey].platos || officialMenus[menuKey] : [];
        if (!rawPlatos || rawPlatos.length === 0) rawPlatos = packData.platosBase || []; // fallback

        // No expandir clientes — usar una fila por cliente con (N) al lado del nombre
        const clientsList = [...packData.clientes];

        const rowsPerChunk = 10;
        const totalChunks = Math.ceil(clientsList.length / rowsPerChunk) || 1;

        const tables = [];

        for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
            const chunkClients = clientsList.slice(chunkIdx * rowsPerChunk, (chunkIdx + 1) * rowsPerChunk);
            // Si rawPlatos tiene 5, y chunkClients tiene 10, maxRows = 10.
            const maxRows = Math.max(rawPlatos.length > 0 ? rawPlatos.length : 5, chunkClients.length);
            const rows = [];

            for (let i = 0; i < maxRows; i++) {
                const dish = rawPlatos[i];

                let dishDesc = '';
                if (dish) {
                    const original = packData.platosBase[i] || {};
                    const isOfficial = typeof dish.proteina === 'string';
                    dishDesc = isOfficial ? dish.proteina : (dish.proteina?.nombre || original.proteina?.nombre || '—');
                }

                const client = chunkClients[i];
                let clientName = '';
                let clientNote = '';
                if (client) {
                    const zone = client.zona_envio || '';
                    const zoneStr = zone && zone !== 'No especificada' && zone.toLowerCase() !== 'recoge en tienda' ? `, ${zone}` : '';
                    const qty = client.cantidad || 1;

                    let displayName = client.nombre;
                    if (client.rawPedido) {
                        const schedule = getScheduleFromOrder(client.rawPedido);
                        const dateIdx = schedule.indexOf(currentDate);
                        if (schedule.length > 1 && dateIdx !== -1) {
                            displayName = `${client.nombre} (Semana ${dateIdx + 1})`;
                        }
                    }
                    clientName = qty > 1 ? `${displayName} (${qty})${zoneStr}` : `${displayName}${zoneStr}`;

                    const tags = [];
                    if (client.rawPedido?.plan && !client.rawPedido.plan.toLowerCase().includes('desayuno')) tags.push(client.rawPedido.plan);
                    const otherPacksTag = getOtherPacksTag(client.nombre, packName);
                    if (otherPacksTag) tags.push(otherPacksTag);

                    // Las observaciones TIENEN que salir acá.
                    //
                    // Esta tabla solo imprimía las etiquetas (el pack, otros packs
                    // del cliente) y se comía las observaciones. En el pedido de
                    // Beatriz González eso significaba que "No queso ni lactosa"
                    // nunca llegaba a cocina: una intolerancia invisible en la
                    // hoja de la que se preparan sus desayunos.
                    clientNote = [client.observaciones, tags.join(' | ')]
                        .filter(Boolean).join(' — ');
                }

                rows.push(
                    <tr key={i} className="border border-black bg-white break-inside-avoid print:break-inside-avoid">
                        <td className="border border-black p-2 text-center">{dish ? (i + 1) : ''}</td>
                        <td className="border border-black p-2 text-left">{dishDesc}</td>
                        <td className="border border-black p-2 text-center font-bold">{dish ? packData.totalPacks : ''}</td>
                        <td className="border border-black p-2 text-xs text-center">{clientNote}</td>
                        <td className={`border border-black p-2 text-center ${client ? 'bg-[#e2f0d9]' : ''}`}>{clientName}</td>
                    </tr>
                );
            }

            tables.push(
                <div key={`empaque-${packName}-chunk-${chunkIdx}`} className="mb-12 print:mb-0 print:break-after-page print:[page-break-after:always]">
                    <table className="w-full border-collapse border border-black text-sm table-fixed">
                        <thead>
                            <tr>
                                <th colSpan="5" className="bg-[#f4b084] text-black font-bold text-2xl p-2 border border-black text-center uppercase tracking-wide">
                                    DESAYUNOS {totalChunks > 1 ? `(Bloque ${chunkIdx + 1})` : ''}
                                </th>
                            </tr>
                            <tr className="bg-[#fce4d6]">
                                <th className="border border-black p-2 w-16 text-center">Plato</th>
                                <th className="border border-black p-2 text-center">Descripcion</th>
                                <th className="border border-black p-2 w-24 text-center">Cantidad</th>
                                <th className="border border-black p-2 w-48 text-center">NOTA</th>
                                <th className="border border-black p-2 w-64 text-center">Cliente</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows}
                        </tbody>
                    </table>
                </div>
            );
        }

        return (
            <div key={`empaque-${packName}`} className="print:break-after-page print:[page-break-after:always]">
                {tables}
            </div>
        );
    };

    const renderIndividuales = () => {
        // ... (existing code)
        const clientsData = {};
        individualPackNames.forEach(packName => {
            const packData = packsMap[packName];
            packData.clientes.forEach(c => {
                const zone = c.zona_envio || '';
                const zoneStr = zone && zone !== 'No especificada' && zone.toLowerCase() !== 'recoge en tienda' ? `, ${zone}` : '';
                const fullName = `${c.nombre}${zoneStr}`;

                const otherPacksTag = getOtherPacksTag(c.nombre, packName);
                const obs = c.observaciones ? `${c.observaciones}` : '';
                const finalObs = [obs, otherPacksTag].filter(Boolean).join(' | ');

                if (!clientsData[fullName]) {
                    clientsData[fullName] = { nombre: fullName, items: [], observaciones: finalObs };
                }

                const formatQty = (nameStr, count, gramsVal) => {
                    const n = String(nameStr || '').toLowerCase();
                    if (gramsVal && gramsVal > 0) return `${gramsVal * count}g`;
                    const kgMatch = n.match(/(\d+(?:\.\d+)?)\s*kg/i);
                    if (kgMatch) {
                        const val = parseFloat(kgMatch[1]) * count;
                        return `${val} kg`;
                    }
                    if (n.includes('(kg)') || n.includes(' kg') || n.includes('/kg') || n.includes(' kilo')) {
                        return `${count} kg`;
                    }
                    const gMatch = n.match(/(\d+)\s*g/i);
                    if (gMatch) {
                        const val = parseInt(gMatch[1], 10) * count;
                        return `${val}g`;
                    }
                    return `${count} porción${count > 1 ? 'es' : ''}`;
                };

                if (c.platos && c.platos.length > 0) {
                    c.platos.forEach(p => {
                        let protName = p.proteina?.nombre || packName;
                        if (p.descripcion && p.descripcion.trim() !== '') {
                            protName += ` (${p.descripcion})`;
                        }
                        const grams = p.proteina?.gramosPorPorcion;
                        const itemCount = p.cantidad || c.cantidad || 1;
                        let qty = formatQty(protName, itemCount, grams);

                        clientsData[fullName].items.push({
                            name: protName,
                            qty: qty,
                            count: itemCount
                        });
                    });
                } else {
                    const itemCount = c.cantidad || 1;
                    let qty = formatQty(packName, itemCount, null);
                    clientsData[fullName].items.push({
                        name: packName,
                        qty: qty,
                        count: itemCount
                    });
                }
            });
        });

        const clientNames = Object.keys(clientsData).sort();
        if (clientNames.length === 0) return null;

        return (
            <div className="mb-12 print:break-inside-avoid">
                <table className="w-full text-sm border-collapse border border-black mb-8 font-sans">
                    <thead>
                        <tr>
                            <th colSpan="3" className="border border-black p-2 font-bold text-center text-lg bg-gray-50 uppercase tracking-widest">
                                INDIVIDUALES
                            </th>
                        </tr>
                    </thead>
                    {clientNames.map((clientName, idx) => {
                        const client = clientsData[clientName];
                        const items = client.items;

                        return (
                            <tbody key={clientName} className="break-inside-avoid print:break-inside-avoid">
                                {items.map((item, itemIdx) => (
                                    <tr key={itemIdx}>
                                        <td className="border border-black p-3 font-medium text-gray-800">{item.name}</td>
                                        <td className="border border-black p-3 text-center font-semibold">{item.qty}</td>
                                        {itemIdx === 0 && (
                                            <td className="border border-black p-3 bg-[#e2f0d9] align-middle font-bold text-gray-900" rowSpan={items.length}>
                                                {clientName} {client.observaciones ? <span className="text-red-600 block text-xs mt-1">({client.observaciones})</span> : ''}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {/* Fila en blanco separadora */}
                                {idx < clientNames.length - 1 && (
                                    <tr>
                                        <td colSpan="3" className="h-4 border border-black bg-white"></td>
                                    </tr>
                                )}
                            </tbody>
                        );
                    })}
                </table>
            </div>
        );
    };

    const renderCocinaIndividuales = () => {
        const ingreds = {};
        individualPackNames.forEach(packName => {
            const packData = packsMap[packName];
            packData.clientes.forEach(c => {
                if (c.platos && c.platos.length > 0) {
                    c.platos.forEach(p => {
                        const protName = p.proteina?.nombre || packName;
                        const gramos = (p.proteina?.gramosPorPorcion || 0) * c.cantidad;
                        ingreds[protName] = (ingreds[protName] || 0) + gramos;
                    });
                } else {
                    ingreds[packName] = (ingreds[packName] || 0) + c.cantidad;
                }
            });
        });

        const ingredNames = Object.keys(ingreds).sort();
        if (ingredNames.length === 0) return null;

        return (
            <div className="mt-8 break-inside-avoid">
                <h2 className="text-xl font-bold bg-[#ffd966] text-black p-2 border border-black text-center uppercase mb-4">
                    TOTAL INDIVIDUALES Y PROTEÍNAS
                </h2>
                <table className="w-full text-sm border-collapse border border-black">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-2 text-left">Proteína / Producto</th>
                            <th className="border border-black p-2 text-center">Total a Cocinar (g)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ingredNames.map((name, i) => (
                            <tr key={i}>
                                <td className="border border-black p-2 font-medium">{name}</td>
                                <td className="border border-black p-2 text-center font-bold">{ingreds[name]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // ==========================================
    // LOGICA NUEVA DE HOJA DE COCINA GLOBAL
    // ==========================================
    const getAllKitchenItems = () => {
        const bulkItemsMap = {};
        const individualItemsMap = {};
        const missingMenus = [];

        const guessCategory = (name) => {
            const n = name.toLowerCase();
            if (n.includes('pollo') || n.includes('pescado') || n.includes('tilapia') || n.includes('salmón') || n.includes('salmon') || n.includes('atun') || n.includes('corvina')) return 'Aves y Pescados';
            if (n.includes('res') || n.includes('cerdo') || n.includes('carne') || n.includes('lomo') || n.includes('fajitas') || n.includes('chicharrón') || n.includes('mechada') || n.includes('pibil') || n.includes('torta') || n.includes('pork') || n.includes('bistec')) return 'Res y Cerdo';
            if (n.includes('arroz') || n.includes('garbanzo') || n.includes('vegetal') || n.includes('picadillo') || n.includes('ayote') || n.includes('brócoli') || n.includes('zuchinni') || n.includes('tomate') || n.includes('lentejas') || n.includes('pasta') || n.includes('spaguetti')) return 'Arroces y Vegetales';
            if (n.includes('papa') || n.includes('camote') || n.includes('yuca') || n.includes('frijol') || n.includes('maduro') || n.includes('puré') || n.includes('coleslaw') || n.includes('plátano') || n.includes('ensalada')) return 'Guarniciones y Tubérculos';
            return 'Otros';
        };

        // 1. Process regular packs (Granel para ollas)
        regularPackNames.forEach(packName => {
            const packData = consolidatedPacksMap[packName];
            if (!packData || packData.totalPacks === 0) return;

            const menuKey = packData.menuKey || mapPackNameToMenuKey(packName);
            let rawPlatos = officialMenus && menuKey ? (Array.isArray(officialMenus[menuKey]) ? officialMenus[menuKey] : (officialMenus[menuKey]?.platos || [])) : [];
            if (!rawPlatos || rawPlatos.length === 0) rawPlatos = packData.platosBase || [];

            if (rawPlatos.length === 0) {
                missingMenus.push(packName);
            }

            const platosEmpaque = rawPlatos.map((p, idx) => {
                const isOfficial = typeof p.proteina === 'string';
                return {
                    proteina: {
                        nombre: isOfficial ? p.proteina : p.proteina?.nombre,
                        gramosPorPorcion: getDefaultGrams(packName)
                    },
                    vegetal: {
                        nombre: isOfficial ? p.vegetal : p.vegetal?.nombre,
                        cantidadPorPorcion: 1
                    },
                    carbo: {
                        nombre: isOfficial ? p.carbo : p.carbo?.nombre,
                        cantidadPorPorcion: 0.5
                    }
                };
            });

            const totalPlatos = packData.totalPacks || 0;
            platosEmpaque.forEach(p => {
                if (p.proteina?.nombre && p.proteina.nombre !== '—') {
                    const grams = (p.proteina.gramosPorPorcion || getDefaultGrams(packName)) * totalPlatos;
                    sumarAGranel(bulkItemsMap, p.proteina.nombre, grams, 'g', guessCategory);
                }
                if (p.vegetal?.nombre && p.vegetal.nombre !== '—') {
                    const units = (p.vegetal.cantidadPorPorcion || 1) * totalPlatos;
                    sumarAGranel(bulkItemsMap, p.vegetal.nombre, units, 'taza(s)', guessCategory);
                }
                const showCarbo = menuKey !== 'keto' && menuKey !== 'sinCarbos' && p.carbo?.nombre && p.carbo.nombre !== '—';
                if (showCarbo) {
                    const units = (p.carbo.cantidadPorPorcion || 0.5) * totalPlatos;
                    sumarAGranel(bulkItemsMap, p.carbo.nombre, units, 'taza(s)', guessCategory);
                }
            });
        });

        // 2. Process Individuales (Pre-empacados directamente en cocina)
        individualPackNames.forEach(packName => {
            const packData = packsMap[packName];
            packData.clientes.forEach(c => {
                if (c.platos && c.platos.length > 0) {
                    c.platos.forEach(p => {
                        const name = p.proteina?.nombre || packName;
                        const spec = p.descripcion || c.plan || c.tipoMenu || c.categoryLabel || '';
                        const portionGrams = p.proteina?.gramosPorPorcion || null;

                        const key = portionGrams ? `${name} (${portionGrams}g)` : name;

                        if (!individualItemsMap[key]) {
                            individualItemsMap[key] = {
                                name,
                                category: guessCategory(name),
                                totalQty: 0,
                                unit: 'unidades',
                                portionSpec: spec,
                                portionGrams: portionGrams,
                                isIndividual: true
                            };
                        }
                        individualItemsMap[key].totalQty += c.cantidad;
                        if (spec && !individualItemsMap[key].portionSpec) {
                            individualItemsMap[key].portionSpec = spec;
                        }
                    });
                } else {
                    const name = packName;
                    const spec = c.plan || c.tipoMenu || c.categoryLabel || '';
                    if (!individualItemsMap[name]) {
                        individualItemsMap[name] = {
                            name,
                            category: guessCategory(name),
                            totalQty: 0,
                            unit: 'unidades',
                            portionSpec: spec,
                            isIndividual: true
                        };
                    }
                    individualItemsMap[name].totalQty += c.cantidad;
                }
            });
        });

        const bulkItems = Object.values(bulkItemsMap).sort((a, b) => a.name.localeCompare(b.name));
        const individualItems = Object.values(individualItemsMap).sort((a, b) => a.name.localeCompare(b.name));

        return {
            bulkItems,
            individualItems,
            items: [...bulkItems, ...individualItems],
            missingMenus
        };
    };

    // OJO: acá NO puede ir un useMemo. Arriba hay tres `return` tempranos
    // (sin fecha / cargando / sin pedidos), así que en el primer render este
    // punto no se alcanza. Al llegar los datos sí, y React cuenta un hook de más:
    // "Rendered more hooks than during the previous render" y se cae la pantalla.
    //
    // Tampoco serviría: sus dependencias serían `kitchenData` y `packsMap`, que se
    // reconstruyen en cada render, así que cambiarían de identidad siempre.
    // Para memoizar de verdad hay que subir TODO el armado de datos por encima de
    // los returns, no solo esta llamada.
    const { bulkItems, individualItems, items: allKitchenItems, missingMenus } = getAllKitchenItems();

    const handleAssignCook = (itemName, cookName) => {
        setKitchenAssignments(prev => ({ ...prev, [itemName]: cookName }));
    };

    const handleAssignCategory = (catName) => {
        const cook = (categoryCookInputs[catName] || '').trim().toUpperCase();
        if (!cook) return;
        const itemsInCat = bulkItems.filter(item => item.category === catName);
        const updates = {};
        itemsInCat.forEach(item => {
            updates[item.name] = cook;
        });
        setKitchenAssignments(prev => ({ ...prev, ...updates }));
    };

    const handleAssignSelected = () => {
        const cook = bulkSelectedCook.trim().toUpperCase();
        if (!cook || selectedKitchenItems.length === 0) return;
        const updates = {};
        selectedKitchenItems.forEach(itemName => {
            updates[itemName] = cook;
        });
        setKitchenAssignments(prev => ({ ...prev, ...updates }));
        setSelectedKitchenItems([]);
        setBulkSelectedCook('');
    };

    const toggleSelectItem = (itemName) => {
        setSelectedKitchenItems(prev =>
            prev.includes(itemName) ? prev.filter(i => i !== itemName) : [...prev, itemName]
        );
    };

    const toggleSelectCategory = (catName) => {
        const itemsInCat = bulkItems.filter(item => item.category === catName).map(i => i.name);
        const allSelected = itemsInCat.every(i => selectedKitchenItems.includes(i));
        if (allSelected) {
            setSelectedKitchenItems(prev => prev.filter(i => !itemsInCat.includes(i)));
        } else {
            setSelectedKitchenItems(prev => Array.from(new Set([...prev, ...itemsInCat])));
        }
    };

    const renderKitchenConfig = () => {
        const categories = ['Aves y Pescados', 'Res y Cerdo', 'Arroces y Vegetales', 'Guarniciones y Tubérculos', 'Otros'];

        return (
            <div className="mb-8 print:hidden">
                {missingMenus.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded shadow-sm">
                        <div className="flex items-center mb-2">
                            <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            <h3 className="font-bold text-lg">Falta configurar el Menú Semanal Oficial</h3>
                        </div>
                        <p className="text-sm mb-2">No podemos mostrar los ingredientes a cocinar de los siguientes packs porque no tienen un menú registrado en la pestaña de "Menú Semanal":</p>
                        <ul className="list-disc ml-8 text-sm font-semibold mb-2">
                            {missingMenus.map(m => <li key={m}>{m}</li>)}
                        </ul>
                        <p className="text-sm italic">Ve a la pestaña <b>Menú Semanal</b> y guarda los platillos para esta fecha. Si estos packs son individuales o a granel, por favor revisa que contengan la palabra "Individual" o "Proteína" en el nombre para que el sistema no intente buscarles un menú semanal.</p>
                    </div>
                )}

                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-blue-200">
                        <div>
                            <h2 className="text-2xl font-black text-blue-900">Asignación de Plazas por Cocinera (Estaciones)</h2>
                            <p className="text-sm text-blue-800">
                                Asigna fácilmente por estación completa o marca varias casillas para asignar cocinera de un solo tiro.
                            </p>
                        </div>

                        {selectedKitchenItems.length > 0 && (
                            <div className="flex items-center gap-2 bg-yellow-100 p-2.5 rounded border border-yellow-300 shadow-sm animate-fade-in">
                                <span className="font-bold text-xs text-yellow-900 whitespace-nowrap">
                                    {selectedKitchenItems.length} seleccionados:
                                </span>
                                <input
                                    type="text"
                                    placeholder="Nombre Cocinera"
                                    value={bulkSelectedCook}
                                    onChange={(e) => setBulkSelectedCook(e.target.value.toUpperCase())}
                                    className="border border-gray-400 rounded px-2 py-1 text-xs uppercase w-32 focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleAssignSelected}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1 rounded transition-colors"
                                >
                                    Asignar
                                </button>
                                <button
                                    onClick={() => setSelectedKitchenItems([])}
                                    className="text-gray-500 hover:text-gray-700 text-xs underline ml-1"
                                >
                                    Limpiar
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map(cat => {
                            const itemsInCat = bulkItems.filter(item => item.category === cat);
                            if (itemsInCat.length === 0) return null;
                            const allCatSelected = itemsInCat.every(i => selectedKitchenItems.includes(i.name));

                            return (
                                <div key={cat} className="bg-white p-4 rounded-lg shadow-sm border border-gray-300 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between border-b-2 border-blue-200 pb-2 mb-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={allCatSelected}
                                                    onChange={() => toggleSelectCategory(cat)}
                                                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                                                    title="Seleccionar todos los platillos de esta categoría"
                                                />
                                                <h3 className="font-black text-blue-900 uppercase text-xs tracking-wider">{cat}</h3>
                                            </div>
                                            <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                                                {itemsInCat.length} platillos
                                            </span>
                                        </div>

                                        {/* Quick assign station bar */}
                                        <div className="mb-4 bg-gray-50 p-2 rounded border border-gray-200 flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Ej. ROSA"
                                                value={categoryCookInputs[cat] || ''}
                                                onChange={(e) => setCategoryCookInputs(prev => ({ ...prev, [cat]: e.target.value.toUpperCase() }))}
                                                className="border border-gray-300 rounded px-2 py-1 text-xs uppercase w-full focus:ring-1 focus:ring-blue-500"
                                            />
                                            <button
                                                onClick={() => handleAssignCategory(cat)}
                                                className="bg-gray-900 hover:bg-black text-white text-[11px] font-bold px-2.5 py-1 rounded whitespace-nowrap transition-colors"
                                                title="Asignar esta cocinera a toda la categoría"
                                            >
                                                Asignar Estación
                                            </button>
                                        </div>

                                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                                            {itemsInCat.map(item => {
                                                const isSelected = selectedKitchenItems.includes(item.name);
                                                const currentCook = kitchenAssignments[item.name] || '';

                                                return (
                                                    <div
                                                        key={item.name}
                                                        className={`flex items-center justify-between p-2 rounded border transition-all text-xs ${isSelected ? 'bg-blue-50 border-blue-400' : 'bg-gray-50/60 border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleSelectItem(item.name)}
                                                                className="w-3.5 h-3.5 rounded text-blue-600 cursor-pointer flex-shrink-0"
                                                            />
                                                            <span className="font-semibold text-gray-800 truncate" title={item.name}>
                                                                {item.name}
                                                            </span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Cocinera"
                                                            value={currentCook}
                                                            onChange={(e) => handleAssignCook(item.name, e.target.value.toUpperCase())}
                                                            className="border border-gray-300 rounded p-1 w-24 text-right uppercase text-[11px] font-bold text-blue-900 focus:ring-1 focus:ring-blue-500 flex-shrink-0"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderHojaCocinaGlobal = () => {
        const groupedByCook = {};
        bulkItems.forEach(item => {
            const cookName = kitchenAssignments[item.name]?.trim() || 'SIN ASIGNAR';
            if (!groupedByCook[cookName]) groupedByCook[cookName] = [];
            groupedByCook[cookName].push(item);
        });

        const cookNames = Object.keys(groupedByCook).sort((a, b) => {
            if (a === 'SIN ASIGNAR') return 1;
            if (b === 'SIN ASIGNAR') return -1;
            return a.localeCompare(b);
        });

        return (
            <div className="mt-12 print:mt-0">
                <h1 className="text-4xl font-black text-center mb-2 text-gray-900 uppercase tracking-wider print:text-3xl">Hoja de Cocina</h1>
                <p className="text-center text-sm font-semibold text-gray-600 mb-8 print:mb-4">
                    Resumen de cocción a granel para ollas (Cantidades totales a preparar).
                </p>

                {renderKitchenConfig()}

                {/* SECCIÓN 1: PRODUCCIÓN A GRANEL PARA PACKS */}
                <div className="mb-12">
                    <div className="bg-gray-900 text-white p-3 font-bold text-base uppercase tracking-wide rounded-t border-2 border-black flex justify-between items-center">
                        <span>🥘 1. PRODUCCIÓN A GRANEL PARA PACKS (Ollas / Contenedores de Empaque)</span>
                        <span className="text-xs font-normal bg-gray-800 px-3 py-1 rounded">Se cocina a granel para que Empaque pese las porciones</span>
                    </div>

                    <div className="space-y-8 mt-4">
                        {cookNames.map(cook => {
                            const items = groupedByCook[cook];
                            if (items.length === 0) return null;

                            return (
                                <div key={cook} className="break-inside-avoid print:break-inside-avoid">
                                    <table className="w-full text-sm border-collapse border-2 border-black mb-2">
                                        <thead>
                                            <tr>
                                                <th colSpan="2" className="border-2 border-black p-2.5 font-bold text-center text-xl uppercase tracking-widest bg-gray-100 text-gray-900">
                                                    {cook}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, idx) => {
                                                return (
                                                    <tr key={idx} className="border-b border-black last:border-b-0 bg-white">
                                                        <td className="border-r border-black p-2.5 font-medium text-gray-900 w-2/3">{item.name}</td>
                                                        <td className="p-2.5 text-center font-extrabold text-lg text-gray-900 w-1/3">
                                                            {Math.round(item.totalQty * 1.30)} {item.unit === 'g' ? 'g' : item.unit.toUpperCase()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SECCIÓN 2: PRODUCTOS INDIVIDUALES (EMPACADOS DIRECTAMENTE EN COCINA) */}
                {individualItems.length > 0 && (
                    <div className="mt-8 break-inside-avoid print:break-inside-avoid">
                        <div className="bg-[#ffd966] text-black border-2 border-black p-3 font-bold text-base uppercase tracking-wide rounded-t flex justify-between items-center">
                            <span>📦 2. PRODUCTOS INDIVIDUALES Y MOLDES (Empacados Directamente en Cocina)</span>
                            <span className="text-xs font-bold bg-black text-white px-3 py-1 rounded">Se cocinan, dividen y empacan en cocina</span>
                        </div>

                        <table className="w-full text-sm border-collapse border-2 border-black border-t-0">
                            <thead>
                                <tr className="bg-yellow-100">
                                    <th className="border border-black p-2.5 text-left w-1/2">Producto / Platillo Individual</th>
                                    <th className="border border-black p-2.5 text-center w-1/4">Cantidad Total a Preparar</th>
                                    <th className="border border-black p-2.5 text-left w-1/4">Instrucción de Empaque en Cocina</th>
                                </tr>
                            </thead>
                            <tbody>
                                {individualItems.map((item, idx) => {
                                    let packInstruction = '';
                                    const isDesayunoOrPlatoUnico = /burrito|omelet|pinto|desayuno|molde|casado|pastel/i.test(item.name);

                                    if (isDesayunoOrPlatoUnico) {
                                        packInstruction = `Cocinar y empacar ENTERO (${item.totalQty} ${item.totalQty === 1 ? 'unidad' : 'unidades'})`;
                                    } else if (item.portionGrams) {
                                        packInstruction = `Empacar porción individual de ${item.portionGrams} g`;
                                    } else {
                                        const gramsMatch = item.name.match(/(\d+)\s*(g|gr|gramos|kg)/i) || (item.portionSpec && item.portionSpec.match(/(\d+)\s*(g|gr|gramos|kg)/i));
                                        const tazasMatch = item.name.match(/(\d+)\s*tazas?/i) || (item.portionSpec && item.portionSpec.match(/(\d+)\s*tazas?/i));

                                        if (gramsMatch) {
                                            const val = gramsMatch[1];
                                            const unit = gramsMatch[2].toLowerCase() === 'kg' ? 'kg' : 'g';
                                            packInstruction = `Empacar porción individual de ${val} ${unit}`;
                                        } else if (tazasMatch) {
                                            packInstruction = `Empacar porción de ${tazasMatch[1]} tazas`;
                                        } else {
                                            const cleanName = item.name.toLowerCase().trim();
                                            const catalogItem = individualesData.find(d => d.nombre && d.nombre.toLowerCase().trim() === cleanName);
                                            if (catalogItem && catalogItem.categoria) {
                                                const units = getProductUnits(catalogItem.categoria);
                                                packInstruction = `Empacar porción de ${units.labelPequeno || 'porción de pedido'}`;
                                            } else {
                                                packInstruction = `Empacar porción según etiqueta del cliente`;
                                            }
                                        }
                                    }

                                    return (
                                        <tr key={idx} className="border-b border-black last:border-b-0 bg-white">
                                            <td className="border-r border-black p-3 font-bold text-gray-900">{item.name}</td>
                                            <td className="border-r border-black p-3 text-center font-bold text-lg text-blue-900">
                                                {item.totalQty} {item.totalQty === 1 ? 'UNIDAD / PEDIDO' : 'UNIDADES / PEDIDOS'}
                                            </td>
                                            <td className="p-3 text-gray-900 font-bold italic bg-amber-50">
                                                👉 {packInstruction}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const escapeXml = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    };

    const handleExportToExcel = () => {
        let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Font ss:FontName="Calibri" ss:Size="11"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1E3A8A"/>
   <Alignment ss:Horizontal="Center"/>
  </Style>
  <Style ss:ID="PackHeader">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#FACC15" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="DesayunoHeader">
   <Font ss:FontName="Calibri" ss:Size="14" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#F4B084" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1F2937" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="CookHeader">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="IndividualHeader">
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#000000"/>
   <Interior ss:Color="#FEF08A" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="BoldCell">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="CenterBold">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="ClientCell">
   <Interior ss:Color="#E2F0D9" ss:Pattern="Solid"/>
   <Alignment ss:Vertical="Top"/>
  </Style>
 </Styles>
`;

        // ═════════════════════════════════════════
        // PESTAÑA 1: HOJA DE COCINA
        // ═════════════════════════════════════════
        xml += `<Worksheet ss:Name="Hoja de Cocina">
  <Table>
   <Column ss:Width="260"/>
   <Column ss:Width="120"/>
   <Column ss:Width="100"/>
   <Column ss:Width="260"/>
   <Row ss:Height="30">
    <Cell ss:MergeAcross="3" ss:StyleID="Title"><Data ss:Type="String">HOJA DE COCINA GLOBAL - BIKITCHEN (${date || ''})</Data></Cell>
   </Row>
   <Row/>
   <Row ss:Height="24">
    <Cell ss:MergeAcross="3" ss:StyleID="Header"><Data ss:Type="String">1. PRODUCCIÓN A GRANEL PARA PACKS (OLLAS)</Data></Cell>
   </Row>`;

        const groupedByCook = {};
        bulkItems.forEach(item => {
            const cookName = kitchenAssignments[item.name]?.trim() || 'SIN ASIGNAR';
            if (!groupedByCook[cookName]) groupedByCook[cookName] = [];
            groupedByCook[cookName].push(item);
        });

        Object.keys(groupedByCook).sort().forEach(cook => {
            const items = groupedByCook[cook];
            if (items.length === 0) return;

            xml += `
   <Row ss:Height="22">
    <Cell ss:MergeAcross="3" ss:StyleID="CookHeader"><Data ss:Type="String">COCINERA: ${cook}</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="BoldCell"><Data ss:Type="String">Ingrediente / Platillo</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="String">Cantidad Total</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="String">Unidad</Data></Cell>
    <Cell ss:StyleID="BoldCell"><Data ss:Type="String">Instrucción de Empaque</Data></Cell>
   </Row>`;

            items.forEach(item => {
                let empaqueNote = '';
                if (item.unit === 'g') {
                    const tazas500 = Math.ceil(item.totalQty / 500);
                    empaqueNote = tazas500 <= 1 ? 'empacar 1 taza de 500 g' : `empacar ${tazas500} tazas de 500 g`;
                }
                xml += `
   <Row>
    <Cell><Data ss:Type="String">${escapeXml(item.name)}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="Number">${item.totalQty}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="String">${item.unit === 'g' ? 'g' : item.unit.toUpperCase()}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(empaqueNote)}</Data></Cell>
   </Row>`;
            });
            xml += `<Row/>`;
        });

        if (individualItems.length > 0) {
            xml += `
   <Row ss:Height="24">
    <Cell ss:MergeAcross="3" ss:StyleID="IndividualHeader"><Data ss:Type="String">2. PRODUCTOS INDIVIDUALES Y MOLDES (EMPACADOS DIRECTAMENTE EN COCINA)</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="BoldCell"><Data ss:Type="String">Producto / Platillo Individual</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="String">Cantidad Total</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="String">Unidad</Data></Cell>
    <Cell ss:StyleID="BoldCell"><Data ss:Type="String">Instrucción de Empaque</Data></Cell>
   </Row>`;

            individualItems.forEach(item => {
                let packInstruction = 'Empacar en cocina';
                if (item.portionSpec) {
                    const portionMatch = item.portionSpec.match(/(\d+)\s*porciones?/i);
                    const gramsMatch = item.portionSpec.match(/(\d+)\s*g/i);
                    const kgMatch = item.portionSpec.match(/(\d+)\s*kg/i);
                    if (portionMatch) packInstruction = `empacar en porciones de ${portionMatch[1]}`;
                    else if (gramsMatch) packInstruction = `empacar 1 taza de ${gramsMatch[1]}g`;
                    else if (kgMatch) packInstruction = `empacar 1 taza de ${kgMatch[1]} kg`;
                    else packInstruction = `empacar según: ${item.portionSpec}`;
                }

                xml += `
   <Row>
    <Cell><Data ss:Type="String">${escapeXml(item.name)}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="Number">${item.totalQty}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="String">UNIDADES</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(packInstruction)}</Data></Cell>
   </Row>`;
            });
        }

        xml += `
  </Table>
 </Worksheet>`;

        // ═════════════════════════════════════════
        // PESTAÑA 2: HOJA DE EMPAQUE DE PACKS (Formato Rico de Web App)
        // ═════════════════════════════════════════
        xml += `<Worksheet ss:Name="Hojas de Empaque Packs">
  <Table>
   <Column ss:Width="90"/>
   <Column ss:Width="250"/>
   <Column ss:Width="90"/>
   <Column ss:Width="70"/>
   <Column ss:Width="250"/>
   <Column ss:Width="280"/>`;

        regularPackNames.forEach(packName => {
            const packData = consolidatedPacksMap[packName];
            const menuKey = packData?.menuKey || mapPackNameToMenuKey(packName);
            let rawPlatos = (officialMenus && menuKey && officialMenus[menuKey]) ? officialMenus[menuKey].platos || officialMenus[menuKey] : [];
            if (!rawPlatos || rawPlatos.length === 0) rawPlatos = packData?.platosBase || [];
            if (!rawPlatos || rawPlatos.length === 0) return;

            const totalPacks = packData.totalPacks || 0;
            const defaultGrams = getDefaultGrams(packName);

            // Yellow Title Header
            xml += `
   <Row ss:Height="28">
    <Cell ss:MergeAcross="5" ss:StyleID="PackHeader"><Data ss:Type="String">${escapeXml(packName.toUpperCase())} (${totalPacks} PACKS)</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="BoldCell"><Data ss:Type="String">CANTIDAD POR PLATO</Data></Cell>
    <Cell ss:MergeAcross="4"><Data ss:Type="String">${defaultGrams} GRAMOS DE PROTEINA</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="BoldCell"><Data ss:Type="String">CANTIDAD POR PLATO</Data></Cell>
    <Cell ss:MergeAcross="4"><Data ss:Type="String">1 TAZA(S) DE VEGETALES</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="BoldCell"><Data ss:Type="String">CANTIDAD POR PLATO</Data></Cell>
    <Cell ss:MergeAcross="4"><Data ss:Type="String">0.5 TAZA(S) DE HARINA</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="Header"><Data ss:Type="String"># de Plato</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Descripcion</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Cantidad</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Platos</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Especificaciones</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Cliente</Data></Cell>
   </Row>`;

            // Clients List String
            const clientsListStr = packData.clientes.map(c => {
                const zone = c.zona_envio || '';
                const zoneStr = zone && zone !== 'No especificada' && zone.toLowerCase() !== 'recoge en tienda' ? `, ${zone}` : '';
                return `${c.nombre} (${c.cantidad})${zoneStr}`;
            }).join(' | ');

            rawPlatos.forEach((dish, dishIdx) => {
                const isOfficial = typeof dish.proteina === 'string';
                const protName = isOfficial ? dish.proteina : (dish.proteina?.nombre || '—');
                const vegName = isOfficial ? dish.vegetal : (dish.vegetal?.nombre || '—');
                const showCarbo = menuKey !== 'keto' && menuKey !== 'sinCarbos';
                const carboName = showCarbo ? (isOfficial ? dish.carbo : (dish.carbo?.nombre || '—')) : '—';

                // Row 1: Proteina
                xml += `
   <Row>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="String">Plato ${dishIdx + 1}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(protName)}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="Number">${defaultGrams}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="Number">${totalPacks}</Data></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="ClientCell"><Data ss:Type="String">${dishIdx === 0 ? escapeXml(clientsListStr) : ''}</Data></Cell>
   </Row>`;

                // Row 2: Vegetal
                xml += `
   <Row>
    <Cell></Cell>
    <Cell><Data ss:Type="String">${escapeXml(vegName)}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="Number">1</Data></Cell>
    <Cell></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell></Cell>
   </Row>`;

                // Row 3: Carbo
                xml += `
   <Row>
    <Cell></Cell>
    <Cell><Data ss:Type="String">${escapeXml(carboName)}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="Number">0.5</Data></Cell>
    <Cell></Cell>
    <Cell><Data ss:Type="String"></Data></Cell>
    <Cell></Cell>
   </Row>`;
            });

            xml += `<Row/><Row/>`;
        });

        xml += `
  </Table>
 </Worksheet>`;

        // ═════════════════════════════════════════
        // PESTAÑA 3: DESAYUNOS E INDIVIDUALES
        // ═════════════════════════════════════════
        xml += `<Worksheet ss:Name="Desayunos e Individuales">
  <Table>
   <Column ss:Width="250"/>
   <Column ss:Width="150"/>
   <Column ss:Width="280"/>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="2" ss:StyleID="DesayunoHeader"><Data ss:Type="String">DESAYUNOS E INDIVIDUALES</Data></Cell>
   </Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="Header"><Data ss:Type="String">Producto / Platillo</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Cantidad</Data></Cell>
    <Cell ss:StyleID="Header"><Data ss:Type="String">Cliente (Zona / Observaciones)</Data></Cell>
   </Row>`;

        individualPackNames.forEach(pName => {
            const pData = packsMap[pName];
            pData.clientes.forEach(c => {
                const zone = c.zona_envio || '';
                const zoneStr = zone && zone !== 'No especificada' && zone.toLowerCase() !== 'recoge en tienda' ? `, ${zone}` : '';
                const obs = c.observaciones ? ` [${c.observaciones}]` : '';

                xml += `
   <Row>
    <Cell><Data ss:Type="String">${escapeXml(pName)}</Data></Cell>
    <Cell ss:StyleID="CenterBold"><Data ss:Type="String">${c.cantidad} unidad(es)</Data></Cell>
    <Cell ss:StyleID="ClientCell"><Data ss:Type="String">${escapeXml(c.nombre)}${escapeXml(zoneStr)}${escapeXml(obs)}</Data></Cell>
   </Row>`;
            });
        });

        xml += `
  </Table>
 </Worksheet>`;

        xml += `</Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Produccion_BiKitchen_${date || 'export'}.xls`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-white text-black min-h-screen p-4 text-xs font-sans print:m-0 print:p-0">
            {/* Ocultar en impresión pero dar info en pantalla */}
            <div className="mb-4 print:hidden text-center">
                <h1 className="text-2xl font-bold text-gray-800">Vista de Producción para: {date}</h1>
                <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    {viewMode === 'empaque' && 'Mostrando solo Hoja de Empaque'}
                    {viewMode === 'cocina' && 'Mostrando solo Hoja de Cocina'}
                </div>

                <RevisionHoja revision={revisarHoja(orders, officialMenus, date)} />

                {viewMode !== 'cocina' && (
                    <div className="mt-4 flex justify-center gap-4">
                        <button
                            onClick={() => setEmpaqueTab('packs')}
                            className={`px-6 py-2 rounded-lg font-bold border-2 transition-all ${empaqueTab === 'packs' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-600 border-purple-200 hover:border-purple-600'}`}
                        >
                            Ver Packs Normales
                        </button>
                        <button
                            onClick={() => setEmpaqueTab('individuales')}
                            className={`px-4 py-2 border rounded shadow transition-colors ${empaqueTab === 'individuales'
                                    ? 'bg-purple-600 text-white font-bold border-purple-600'
                                    : 'bg-white text-purple-600 font-bold border-purple-200 hover:bg-purple-50'
                                }`}
                        >
                            Ver Individuales y Desayunos
                        </button>
                    </div>
                )}

                <div className="mt-6 flex justify-center gap-4">
                    <button
                        onClick={() => window.print()}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg flex items-center gap-2"
                    >
                        🖨️ Imprimir Documento
                    </button>
                    <button
                        onClick={handleExportToExcel}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg flex items-center gap-2"
                    >
                        📊 Descargar Excel Completo (.xls)
                    </button>
                    {date === '2026-08-19' && (
                        <button
                            onClick={handleCargarMenuExcel19Agosto}
                            disabled={importingExcel}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition shadow-lg flex items-center gap-2 cursor-pointer"
                        >
                            {importingExcel ? '⏳ Cargando...' : '⚡ Cargar 6 Menús Excel (19 Ago)'}
                        </button>
                    )}
                </div>
            </div>

            {/* SECCIÓN 1: HOJA DE EMPAQUE */}
            {viewMode !== 'cocina' && (
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-center mb-8 text-gray-900 uppercase tracking-wider print:hidden">
                        {empaqueTab === 'packs' ? 'Hoja de Empaque - Packs' : 'Hoja de Empaque - Individuales'}
                    </h1>

                    {empaqueTab === 'individuales' ? (
                        <>
                            {desayunoPackNames.map(packName => renderDesayunosTable(packName, packsMap[packName], date))}
                            {renderIndividuales(individualPackNames)}
                        </>
                    ) : (
                        regularPackNames.map((packName) => {
                            const packData = consolidatedPacksMap[packName];
                            const kitchenMenuData = kitchenData.porMenu[packName] || (packData.sourcePackNames?.length > 0 ? kitchenData.porMenu[packData.sourcePackNames[0]] : null);

                            const menuKey = packData.menuKey || mapPackNameToMenuKey(packName);
                            let rawPlatos = (officialMenus && menuKey && officialMenus[menuKey]) ? officialMenus[menuKey].platos || officialMenus[menuKey] : [];
                            if (!rawPlatos || rawPlatos.length === 0) rawPlatos = packData.platosBase || []; // fallback

                            // Generar especificaciones
                            const specsList = packData.clientes.map(c => {
                                const note = c.observaciones ? ` ** ${c.observaciones}` : '';
                                return `${c.nombre} (${c.cantidad})${note}`;
                            });

                            // Resumen de cocina (si existe)
                            let resumenCocina = null;
                            if (kitchenMenuData) {
                                const platesCocina = Object.values(kitchenMenuData.platos).sort((a, b) => (a.numero || 0) - (b.numero || 0));
                                // Consolidar ingredientes
                                const ingreds = {};
                                platesCocina.forEach(p => {
                                    const protName = p.proteina?.nombre || 'Proteína';
                                    const vegName = p.vegetal?.nombre || 'Vegetales';
                                    const carbName = p.carbo?.nombre || 'Carbohidratos';

                                    ingreds[protName] = (ingreds[protName] || 0) + (p.proteina.totalGramos || 0);

                                    // Para vegetales y carbos, sumamos cantidadBase si unidad es igual. 
                                    // Simplificación: sumamos "unidades" si hay mezcla
                                    ingreds[vegName] = (ingreds[vegName] || 0) + (p.vegetal.cantidadBase || 0) * (p.totalPlatos || 0);
                                    ingreds[carbName] = (ingreds[carbName] || 0) + (p.carbo.cantidadBase || 0) * (p.totalPlatos || 0);
                                });

                                resumenCocina = Object.entries(ingreds).filter(([, qty]) => qty > 0).map(([name, qty]) => ({ name, qty }));
                            }
                            let effectivePlatos = rawPlatos.length > 0 ? rawPlatos : (packData.platosBase.length > 0 ? packData.platosBase : [
                                { numero: 1, proteina: { nombre: 'Proteína' }, vegetal: { nombre: 'Vegetales' }, carbo: { nombre: 'Harinas' } },
                                { numero: 2, proteina: { nombre: 'Proteína' }, vegetal: { nombre: 'Vegetales' }, carbo: { nombre: 'Harinas' } },
                                { numero: 3, proteina: { nombre: 'Proteína' }, vegetal: { nombre: 'Vegetales' }, carbo: { nombre: 'Harinas' } },
                                { numero: 4, proteina: { nombre: 'Proteína' }, vegetal: { nombre: 'Vegetales' }, carbo: { nombre: 'Harinas' } },
                                { numero: 5, proteina: { nombre: 'Proteína' }, vegetal: { nombre: 'Vegetales' }, carbo: { nombre: 'Harinas' } }
                            ]);

                            const platosEmpaque = effectivePlatos.map((p, idx) => {
                                const original = packData.platosBase[idx] || {};
                                const isOfficial = typeof p.proteina === 'string';
                                return {
                                    numero: p.numero || idx + 1,
                                    proteina: {
                                        nombre: isOfficial ? p.proteina : (p.proteina?.nombre || original.proteina?.nombre || '—'),
                                        gramosPorPorcion: isOfficial ? getDefaultGrams(packName) : (p.proteina?.gramosPorPorcion || original.proteina?.gramosPorPorcion || getDefaultGrams(packName))
                                    },
                                    vegetal: {
                                        nombre: isOfficial ? p.vegetal : (p.vegetal?.nombre || original.vegetal?.nombre || '—'),
                                        cantidadPorPorcion: isOfficial ? 1 : (p.vegetal?.cantidadPorPorcion || original.vegetal?.cantidadPorPorcion || 1)
                                    },
                                    carbo: {
                                        nombre: isOfficial ? p.carbo : (p.carbo?.nombre || original.carbo?.nombre || '—'),
                                        cantidadPorPorcion: isOfficial ? 0.5 : (p.carbo?.cantidadPorPorcion || original.carbo?.cantidadPorPorcion || 0.5)
                                    }
                                };
                            });

                            const showCarbos = menuKey !== 'keto' && menuKey !== 'sinCarbos';
                            const rowsPerPlate = showCarbos ? 3 : 2;

                            return (
                                <div key={`empaque-${packName}`} className="pack-table-container mb-12 print:mb-0 print:break-after-page print:[page-break-after:always] break-inside-avoid print:break-inside-avoid">
                                    {/* ESTILO EXCEL */}
                                    <div className="w-full">
                                        {/* Cabecera Tipo Excel (Amarillo) */}
                                        <div className="bg-yellow-400 text-black font-bold text-lg p-1.5 print:py-1 print:text-base border border-black text-center uppercase tracking-wide">
                                            {packName.replace(/\s*\d{1,3}(?:[.,]\d{3})*\s*(?:colones|col|¢)/i, '')} <span className="text-gray-800 text-base print:text-sm">({packData.totalPacks} Packs)</span>
                                        </div>

                                        {/* CANTIDAD POR PLATO (Estilo Excel) */}
                                        <div className="border-x border-black bg-white flex flex-col text-xs print:text-[10px] font-bold w-full uppercase">
                                            <div className="flex border-b border-black">
                                                <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                <div className="flex-1 p-0.5 px-1">{platosEmpaque[0]?.proteina?.gramosPorPorcion ? `${platosEmpaque[0].proteina.gramosPorPorcion} GRAMOS DE PROTEINA` : `${getDefaultGrams(packName)} GRAMOS DE PROTEINA`}</div>
                                            </div>
                                            <div className="flex border-b border-black">
                                                <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                <div className="flex-1 p-0.5 px-1">{platosEmpaque[0]?.vegetal?.cantidadPorPorcion ? `${platosEmpaque[0].vegetal.cantidadPorPorcion} TAZA(S) DE VEGETALES` : '1 TAZA DE VEGETALES'}</div>
                                            </div>
                                            {showCarbos && (
                                                <div className="flex border-b border-black">
                                                    <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                    <div className="flex-1 p-0.5 px-1">{platosEmpaque[0]?.carbo?.cantidadPorPorcion ? `${platosEmpaque[0].carbo.cantidadPorPorcion} TAZA(S) DE HARINA` : '1/2 TAZA DE HARINA'}</div>
                                                </div>
                                            )}
                                        </div>

                                        <table className="w-full border-collapse border border-black text-xs print:text-[11px] table-fixed">
                                            <thead>
                                                <tr className="bg-white">
                                                    <th className="border border-black p-1 print:py-0.5 print:px-1 w-20 text-center"># de Plato</th>
                                                    <th className="border border-black p-1 print:py-0.5 print:px-1 w-64 text-left">Descripcion</th>
                                                    <th className="border border-black p-1 print:py-0.5 print:px-1 w-24 text-center">Cantidad</th>
                                                    <th className="border border-black p-1 print:py-0.5 print:px-1 w-20 text-center">Platos</th>
                                                    <th className="border border-black p-1 print:py-0.5 print:px-1 text-left">Especificaciones</th>
                                                    <th className="border border-black p-1 print:py-0.5 print:px-1 text-left">Cliente</th>
                                                </tr>
                                            </thead>
                                            {platosEmpaque.map((p, idx) => {
                                                const totalPlatos = packData.totalPacks || 0;

                                                // Función para obtener la celda del cliente en base al índice absoluto de la fila
                                                const renderClientCells = (subRowIndex) => {
                                                    const absoluteRowIndex = idx * rowsPerPlate + subRowIndex;
                                                    const client = packData.clientes[absoluteRowIndex];

                                                    if (client) {
                                                        const tags = [];
                                                        const hasDesayunoAlready = client.incluyeDesayuno || (client.observaciones && client.observaciones.toLowerCase().includes('desayun'));
                                                        if (client.incluyeDesayuno) tags.push('🌅 Desayunos');

                                                        const isTwoPack = client.categoria === 'two_pack' || /two\s*pack/i.test(client.categoryLabel || '') || /two\s*pack/i.test(client.plan || '');
                                                        if (isTwoPack) tags.push('Two Pack');

                                                        const isIndividuales = client.categoria === 'individuales' || /individual/i.test(client.categoryLabel || '') || /individual/i.test(client.plan || '');
                                                        if (isIndividuales) tags.push('Individuales');

                                                        let otherPacksTag = getOtherPacksTag(client.nombre, packName);
                                                        // Quitar "Desayunos" del tag si ya se mostró arriba o en observaciones
                                                        if (hasDesayunoAlready && otherPacksTag) {
                                                            const cleaned = otherPacksTag.replace('Lleva también: ', '').split(', ').filter(p => p !== 'Desayunos').join(', ');
                                                            otherPacksTag = cleaned ? `Lleva también: ${cleaned}` : '';
                                                        }
                                                        if (otherPacksTag) tags.push(otherPacksTag);

                                                        let notes = client.observaciones ? `** ${client.observaciones}` : '';
                                                        if (tags.length > 0) {
                                                            const tagsStr = tags.map(t => `** ${t}`).join('\n');
                                                            notes = notes ? `${tagsStr}\n${notes}` : tagsStr;
                                                        }

                                                        const zone = client.zona_envio || '';
                                                        const zoneStr = zone && zone !== 'No especificada' && zone.toLowerCase() !== 'recoge en tienda' ? `, ${zone}` : '';
                                                        let clientDisplayName = `${client.nombre} (${client.cantidad})${zoneStr}`;
                                                        if (client.rawPedido) {
                                                            const schedule = getScheduleFromOrder(client.rawPedido);
                                                            const dateIdx = schedule.indexOf(date);
                                                            if (schedule.length > 1 && dateIdx !== -1) {
                                                                clientDisplayName = `${client.nombre} (${client.cantidad}) (Semana ${dateIdx + 1})${zoneStr}`;
                                                            }
                                                        }

                                                        return (
                                                            <>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle whitespace-pre-wrap text-xs print:text-[10px] leading-tight print:leading-tight">{notes}</td>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle text-xs print:text-[11px] font-medium">{clientDisplayName}</td>
                                                            </>
                                                        );
                                                    } else {
                                                        return (
                                                            <>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1"></td>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1"></td>
                                                            </>
                                                        );
                                                    }
                                                };

                                                return (
                                                    <tbody key={idx} className="break-inside-avoid print:break-inside-avoid">
                                                        {/* FILA 1: PROTEÍNA */}
                                                        <tr>
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1 text-center font-bold align-middle" rowSpan={rowsPerPlate}>Plato {p.numero}</td>
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1 font-medium bg-gray-50">{p.proteina?.nombre || ''}</td>
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1 text-center bg-gray-50">{p.proteina?.gramosPorPorcion ? `${p.proteina.gramosPorPorcion}` : ''}</td>
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1 text-center font-bold text-base print:text-sm align-middle" rowSpan={rowsPerPlate}>{totalPlatos}</td>
                                                            {renderClientCells(0)}
                                                        </tr>
                                                        {/* FILA 2: VEGETALES */}
                                                        <tr>
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1">{p.vegetal?.nombre || ''}</td>
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{p.vegetal?.cantidadPorPorcion ? `${p.vegetal.cantidadPorPorcion}` : ''}</td>
                                                            {renderClientCells(1)}
                                                        </tr>
                                                        {/* FILA 3: CARBOS (si aplica) */}
                                                        {showCarbos && (
                                                            <tr className="break-inside-avoid">
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1">{p.carbo?.nombre || ''}</td>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{p.carbo?.cantidadPorPorcion ? `${p.carbo.cantidadPorPorcion}` : ''}</td>
                                                                {renderClientCells(2)}
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                );
                                            })}
                                            {/* Filas adicionales si hay más clientes que filas de platos disponbles */}
                                            {(() => {
                                                const totalAvailableRows = platosEmpaque.length * rowsPerPlate;
                                                if (packData.clientes.length <= totalAvailableRows) return null;
                                                const extraClients = packData.clientes.slice(totalAvailableRows);
                                                return (
                                                    <tbody className="break-inside-avoid print:break-inside-avoid">
                                                        {extraClients.map((client, extraIdx) => {
                                                            const tags = [];
                                                            const hasDesayunoAlready = client.incluyeDesayuno || (client.observaciones && client.observaciones.toLowerCase().includes('desayun'));
                                                            if (client.incluyeDesayuno) tags.push('🌅 Desayunos');
                                                            const isTwoPack = client.categoria === 'two_pack' || /two\s*pack/i.test(client.categoryLabel || '') || /two\s*pack/i.test(client.plan || '');
                                                            if (isTwoPack) tags.push('Two Pack');
                                                            const isIndividuales = client.categoria === 'individuales' || /individual/i.test(client.categoryLabel || '') || /individual/i.test(client.plan || '');
                                                            if (isIndividuales) tags.push('Individuales');
                                                            let otherPacksTag = getOtherPacksTag(client.nombre, packName);
                                                            if (hasDesayunoAlready && otherPacksTag) {
                                                                const cleaned = otherPacksTag.replace('Lleva también: ', '').split(', ').filter(p => p !== 'Desayunos').join(', ');
                                                                otherPacksTag = cleaned ? `Lleva también: ${cleaned}` : '';
                                                            }
                                                            if (otherPacksTag) tags.push(otherPacksTag);
                                                            let notes = client.observaciones ? `** ${client.observaciones}` : '';
                                                            if (tags.length > 0) {
                                                                const tagsStr = tags.map(t => `** ${t}`).join('\n');
                                                                notes = notes ? `${tagsStr}\n${notes}` : tagsStr;
                                                            }
                                                            const zone = client.zona_envio || '';
                                                            const zoneStr = zone && zone !== 'No especificada' && zone.toLowerCase() !== 'recoge en tienda' ? `, ${zone}` : '';
                                                            let clientDisplayName = `${client.nombre} (${client.cantidad})${zoneStr}`;

                                                            return (
                                                                <tr key={`extra-${extraIdx}`}>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1"></td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 font-medium bg-gray-50 text-gray-400">—</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1"></td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1"></td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle whitespace-pre-wrap text-xs print:text-[10px] leading-tight print:leading-tight">{notes}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle text-xs print:text-[11px] font-medium">{clientDisplayName}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                );
                                            })()}
                                        </table>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {viewMode === 'all' && (
                <div className="print:break-before-page w-full h-4 border-b-2 border-dashed border-gray-300 my-8 print:my-0 print:border-none"></div>
            )}

            {/* SECCIÓN 2: HOJA DE COCINA (Resúmenes) */}
            {viewMode !== 'empaque' && renderHojaCocinaGlobal()}

            <style>{`
                @media print {
                    @page { size: landscape; margin: 4mm; }
                    html, body { height: 100%; margin: 0; padding: 0; }
                    .page-break-after { page-break-after: always; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .pack-table-container {
                        height: 95vh !important;
                        min-height: 95vh !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: flex-start !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .pack-table-container > div {
                        height: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .pack-table-container table {
                        flex: 1 1 auto !important;
                        height: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}
