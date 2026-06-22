import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import {
    mapPedidosFromLegacy,
    buildKitchenSheetData,
    buildPackagingSheetData
} from '../../utils/logisticsUtils';
import { getOfficialMenus } from '../../utils/firestoreMenus';
import { getScheduleFromOrder } from '../../utils/orderDates';

export default function PrintProductionView() {
    const [searchParams] = useSearchParams();
    const date = searchParams.get('date');
    const viewMode = searchParams.get('view') || 'all';
    const [orders, setOrders] = useState([]);
    const [officialMenus, setOfficialMenus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [empaqueTab, setEmpaqueTab] = useState('packs');
    const [kitchenAssignments, setKitchenAssignments] = useState({});
    
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

                // Filtrar localmente usando el schedule real (Solo pedidos confirmados)
                rawOrders = rawOrders.filter(order => {
                    const status = (order.status || order.estado || '').toLowerCase();
                    const isConfirmed = ['confirmed', 'confirmado', 'pagado', 'preparing', 'preparando', 'making', 'ready', 'listo'].includes(status);
                    
                    if (!isConfirmed) return false;
                    
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

    useEffect(() => {
        if (!loading && orders.length > 0) {
            // Auto-trigger print slightly after render
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [loading, orders]);

    if (!date) return <div className="p-8 text-center text-xl">Falta la fecha en la URL</div>;
    if (loading) return <div className="p-8 text-center text-xl">Cargando datos para impresión...</div>;
    if (orders.length === 0) return <div className="p-8 text-center text-xl">No hay pedidos para esta fecha.</div>;

    const kitchenData = buildKitchenSheetData(orders, {});
    const packagingData = buildPackagingSheetData(orders, {}, null);

    // Group packaging data by Pack
    const packsMap = {};
    packagingData.clientes.forEach((c) => {
        const packName = c.plan || c.tipoMenu || 'Pack Estándar';
        if (!packsMap[packName]) {
            packsMap[packName] = { name: packName, clientes: [], platosBase: [], totalPacks: 0 };
        }
        // Find duplicate client
        const existingClient = packsMap[packName].clientes.find(existing => existing.nombre === c.cliente);
        if (existingClient) {
            existingClient.cantidad += (c.cantidadMenus || 1);
            if (c.observaciones) existingClient.observaciones += ` | ${c.observaciones}`;
        } else {
            packsMap[packName].clientes.push({ 
                nombre: c.cliente, 
                cantidad: c.cantidadMenus || 1, 
                observaciones: c.observaciones || '',
                platos: c.platos || [],
                rawPedido: c
            });
        }
        packsMap[packName].totalPacks += (c.cantidadMenus || 1);
        if (packsMap[packName].platosBase.length === 0 && c.platos && c.platos.length > 0) {
            packsMap[packName].platosBase = c.platos;
        }
    });

    const mapPackNameToMenuKey = (name) => {
        const n = name.toLowerCase();
        if (n.includes('bajo calor')) return 'bajoCalorias';
        if (n.includes('sin carbos')) return 'sinCarbos';
        if (n.includes('keto')) return 'keto';
        if (n.includes('vegetariano')) return 'vegetariano';
        if (n.includes('casadito')) return 'casaditos';
        if (n.includes('full pack')) return 'fullPack';
        if (n.includes('regular') || n.includes('estandar') || n.includes('estándar')) return 'regular';
        if ((n.includes('mensual') || n.includes('quincenal')) && !n.includes('proteína') && !n.includes('proteina')) return 'regular';
        return null;
    };

    const isIndividualPack = (name) => {
        const n = name.toLowerCase();
        return n.includes('individual') || n.includes('proteína') || n.includes('proteina') || n.includes('granel');
    };

    const allPackNames = Object.keys(packsMap).sort();
    const regularPackNames = allPackNames.filter(n => !isIndividualPack(n));
    const individualPackNames = allPackNames.filter(n => isIndividualPack(n));

    const renderIndividuales = () => {
        const clientsData = {};
        individualPackNames.forEach(packName => {
            const packData = packsMap[packName];
            packData.clientes.forEach(c => {
                if (!clientsData[c.nombre]) {
                    clientsData[c.nombre] = { nombre: c.nombre, items: [], observaciones: c.observaciones };
                }
                
                if (c.platos && c.platos.length > 0) {
                    c.platos.forEach(p => {
                        // Como es solo la proteína a granel, sacamos el nombre y los gramos
                        const protName = p.proteina?.nombre || packName;
                        const qty = p.proteina?.gramosPorPorcion ? `${p.proteina.gramosPorPorcion}g` : '1 porción';
                        
                        clientsData[c.nombre].items.push({
                            name: protName,
                            qty: qty,
                            count: c.cantidad
                        });
                    });
                } else {
                    // Fallback
                    clientsData[c.nombre].items.push({
                        name: packName,
                        qty: `${c.cantidad} packs`
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
                    <tbody>
                        {clientNames.map((clientName, idx) => {
                            const client = clientsData[clientName];
                            const items = client.items;
                            
                            return (
                                <React.Fragment key={clientName}>
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
                                </React.Fragment>
                            );
                        })}
                    </tbody>
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
        const itemsMap = {};
        const missingMenus = [];
        
        const guessCategory = (name) => {
            const n = name.toLowerCase();
            if (n.includes('pollo') || n.includes('pescado') || n.includes('tilapia') || n.includes('salmón') || n.includes('salmon') || n.includes('atun') || n.includes('corvina')) return 'Aves y Pescados';
            if (n.includes('res') || n.includes('cerdo') || n.includes('carne') || n.includes('lomo') || n.includes('fajitas') || n.includes('chicharrón') || n.includes('mechada') || n.includes('pibil') || n.includes('torta') || n.includes('pork') || n.includes('bistec')) return 'Res y Cerdo';
            if (n.includes('arroz') || n.includes('garbanzo') || n.includes('vegetal') || n.includes('picadillo') || n.includes('ayote') || n.includes('brócoli') || n.includes('zuchinni') || n.includes('tomate') || n.includes('lentejas') || n.includes('pasta') || n.includes('spaguetti')) return 'Arroces y Vegetales';
            if (n.includes('papa') || n.includes('camote') || n.includes('yuca') || n.includes('frijol') || n.includes('maduro') || n.includes('puré') || n.includes('coleslaw') || n.includes('plátano') || n.includes('ensalada')) return 'Guarniciones y Tubérculos';
            return 'Otros';
        };

        // 1. Process regular packs
        regularPackNames.forEach(packName => {
            const packData = packsMap[packName];
            if (packData.totalPacks === 0) return;
            
            const menuKey = mapPackNameToMenuKey(packName);
            const rawPlatos = (officialMenus && menuKey && Array.isArray(officialMenus[menuKey])) ? officialMenus[menuKey] : [];
            
            if (rawPlatos.length === 0) {
                // El menú oficial no está configurado, así que no sabemos qué ingredientes lleva este pack.
                // Lo saltamos para que no aparezca el nombre del pack (Ej. "Pack Bajo Calorías") como si fuera un ingrediente.
                missingMenus.push(packName);
                return;
            }

            const platosEmpaque = rawPlatos.map((p, idx) => {
                const isOfficial = typeof p.proteina === 'string';
                return {
                    proteina: {
                        nombre: isOfficial ? p.proteina : p.proteina?.nombre,
                        gramosPorPorcion: 150
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
                    const name = p.proteina.nombre;
                    const grams = (p.proteina.gramosPorPorcion || 150) * totalPlatos;
                    if (!itemsMap[name]) itemsMap[name] = { name, category: guessCategory(name), totalQty: 0, unit: 'g' };
                    itemsMap[name].totalQty += grams;
                }
                if (p.vegetal?.nombre && p.vegetal.nombre !== '—') {
                    const name = p.vegetal.nombre;
                    const units = (p.vegetal.cantidadPorPorcion || 1) * totalPlatos;
                    if (!itemsMap[name]) itemsMap[name] = { name, category: guessCategory(name), totalQty: 0, unit: 'taza(s)' };
                    itemsMap[name].totalQty += units;
                }
                const showCarbo = menuKey !== 'keto' && menuKey !== 'sinCarbos' && p.carbo?.nombre && p.carbo.nombre !== '—';
                if (showCarbo) {
                    const name = p.carbo.nombre;
                    const units = (p.carbo.cantidadPorPorcion || 0.5) * totalPlatos;
                    if (!itemsMap[name]) itemsMap[name] = { name, category: guessCategory(name), totalQty: 0, unit: 'taza(s)' };
                    itemsMap[name].totalQty += units;
                }
            });
        });

        // 2. Process Individuales
        individualPackNames.forEach(packName => {
            const packData = packsMap[packName];
            packData.clientes.forEach(c => {
                if (c.platos && c.platos.length > 0) {
                    c.platos.forEach(p => {
                        const name = p.proteina?.nombre || packName;
                        const grams = (p.proteina?.gramosPorPorcion || 150) * c.cantidad;
                        if (!itemsMap[name]) itemsMap[name] = { name, category: guessCategory(name), totalQty: 0, unit: 'g' };
                        itemsMap[name].totalQty += grams;
                    });
                } else {
                    const name = packName;
                    if (!itemsMap[name]) itemsMap[name] = { name, category: guessCategory(name), totalQty: 0, unit: 'g' };
                    itemsMap[name].totalQty += (150 * c.cantidad); // Fallback a 150g si no hay platos definidos
                }
            });
        });

        // Sort items alphabetically
        return {
            items: Object.values(itemsMap).sort((a, b) => a.name.localeCompare(b.name)),
            missingMenus
        };
    };

    const { items: allKitchenItems, missingMenus } = getAllKitchenItems();

    const handleAssignCook = (itemName, cookName) => {
        setKitchenAssignments(prev => ({ ...prev, [itemName]: cookName }));
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
                <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h2 className="text-2xl font-bold text-blue-900 mb-2">Asignación de Plazas (Cocineras)</h2>
                    <p className="text-base text-blue-800 mb-6">Agrupamos todos los ingredientes de la semana por secciones. Escribe a la par de cada uno el nombre de la cocinera responsable. En la impresión, se agruparán automáticamente por cocinera.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {categories.map(cat => {
                            const itemsInCat = allKitchenItems.filter(item => item.category === cat);
                            if (itemsInCat.length === 0) return null;
                            return (
                                <div key={cat} className="bg-white p-4 rounded shadow-sm border border-gray-300">
                                    <h3 className="font-bold border-b-2 border-blue-200 pb-2 mb-3 text-blue-800 uppercase text-sm tracking-wider">{cat}</h3>
                                    <div className="space-y-3">
                                        {itemsInCat.map(item => (
                                            <div key={item.name} className="flex flex-col text-xs">
                                                <label className="font-semibold text-gray-700 mb-1">{item.name}</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Ej. Rosa" 
                                                    value={kitchenAssignments[item.name] || ''}
                                                    onChange={(e) => handleAssignCook(item.name, e.target.value.toUpperCase())}
                                                    className="border border-gray-400 rounded p-1.5 w-full uppercase focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                        ))}
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
        allKitchenItems.forEach(item => {
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
                <h1 className="text-4xl font-black text-center mb-8 text-gray-900 uppercase tracking-wider print:text-3xl">Hoja de Cocina</h1>
                {renderKitchenConfig()}
                
                <div className="space-y-12">
                    {cookNames.map(cook => {
                        const items = groupedByCook[cook];
                        if (items.length === 0) return null;

                        return (
                            <div key={cook} className="break-inside-avoid print:break-inside-avoid">
                                <table className="w-full text-sm border-collapse border-2 border-black mb-2">
                                    <thead>
                                        <tr>
                                            <th colSpan="3" className="border-2 border-black p-3 font-bold text-center text-xl uppercase tracking-widest bg-white">
                                                {cook}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => {
                                            // Lógica de empaque autogenerada según el Excel de Gina
                                            let empaqueNote = '';
                                            if (item.unit === 'g') {
                                                if (item.totalQty >= 1000) {
                                                    const kg = item.totalQty / 1000;
                                                    empaqueNote = `empacar en tazas de ${item.totalQty % 1000 === 0 ? 'kg' : '500g / kg'}`;
                                                } else {
                                                    empaqueNote = 'empacar 1 taza de 250 g';
                                                }
                                            } else if (item.unit === 'taza(s)') {
                                                empaqueNote = ''; // Normalmente no llevan instrucción en el excel de Gina
                                            }

                                            return (
                                                <tr key={idx} className="border-b border-black last:border-b-0">
                                                    <td className="border-r border-black p-3 font-medium text-gray-900 w-1/2">{item.name}</td>
                                                    <td className="border-r border-black p-3 text-center font-bold text-lg w-1/4">
                                                        {item.totalQty} {item.unit === 'g' ? 'g' : (item.unit === 'taza(s)' ? 'TAZAS' : item.unit)}
                                                    </td>
                                                    <td className="p-3 text-gray-800 w-1/4 italic">
                                                        {empaqueNote}
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
        );
    };

    return (
        <div className="bg-white text-black min-h-screen p-4 text-xs font-sans print:m-0 print:p-0">
            {/* Ocultar en impresión pero dar info en pantalla */}
            <div className="mb-4 print:hidden text-center">
                <h1 className="text-2xl font-bold text-gray-800">Vista de Producción para: {date}</h1>
                <div className="text-gray-500 mt-1">
                    {viewMode === 'empaque' && 'Mostrando solo Hoja de Empaque'}
                    {viewMode === 'cocina' && 'Mostrando solo Hoja de Cocina'}
                </div>
                
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
                            className={`px-6 py-2 rounded-lg font-bold border-2 transition-all ${empaqueTab === 'individuales' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-purple-600 border-purple-200 hover:border-purple-600'}`}
                        >
                            Ver Individuales y Proteínas
                        </button>
                    </div>
                )}

                <button 
                    onClick={() => window.print()} 
                    className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg"
                >
                    Imprimir Ahora
                </button>
            </div>

            {/* SECCIÓN 1: HOJA DE EMPAQUE */}
            {viewMode !== 'cocina' && (
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-center mb-8 text-gray-900 uppercase tracking-wider print:hidden">
                        {empaqueTab === 'packs' ? 'Hoja de Empaque - Packs' : 'Hoja de Empaque - Individuales'}
                    </h1>
                    
                    {empaqueTab === 'individuales' ? (
                        renderIndividuales()
                    ) : (
                        regularPackNames.map((packName) => {
                            const packData = packsMap[packName];
                            const kitchenMenuData = kitchenData.porMenu[packName];
                
                const menuKey = mapPackNameToMenuKey(packName);
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
                const platosEmpaque = (rawPlatos.length > 0 ? rawPlatos : packData.platosBase).map((p, idx) => {
                    const original = packData.platosBase[idx] || {};
                    const isOfficial = typeof p.proteina === 'string';
                    return {
                        numero: p.numero || idx + 1,
                        proteina: {
                            nombre: isOfficial ? p.proteina : (p.proteina?.nombre || original.proteina?.nombre || '—'),
                            gramosPorPorcion: isOfficial ? 150 : (p.proteina?.gramosPorPorcion || original.proteina?.gramosPorPorcion || 150)
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
                        <div key={`empaque-${packName}`} className="mb-12 print:mb-0 print:break-after-page print:[page-break-after:always]">
                            {/* ESTILO EXCEL */}
                            <div className="w-full">
                                {/* Cabecera Tipo Excel (Amarillo) */}
                                <div className="bg-yellow-400 text-black font-bold text-lg p-2 border border-black text-center uppercase tracking-wide">
                                    {packName.replace(/\s*\d{1,3}(?:[.,]\d{3})*\s*(?:colones|col|¢)/i, '')} <span className="text-gray-800 text-base">({packData.totalPacks} Packs)</span>
                                </div>
                                
                                {/* CANTIDAD POR PLATO (Estilo Excel) */}
                                <div className="border-x border-black bg-white flex flex-col text-xs font-bold w-full uppercase">
                                    <div className="flex border-b border-black">
                                        <div className="w-48 p-1 border-r border-black">CANTIDAD POR PLATO</div>
                                        <div className="flex-1 p-1">{platosEmpaque[0]?.proteina?.gramosPorPorcion ? `${platosEmpaque[0].proteina.gramosPorPorcion} GRAMOS DE PROTEINA` : '150 GRAMOS DE PROTEINA'}</div>
                                    </div>
                                    <div className="flex border-b border-black">
                                        <div className="w-48 p-1 border-r border-black">CANTIDAD POR PLATO</div>
                                        <div className="flex-1 p-1">{platosEmpaque[0]?.vegetal?.cantidadPorPorcion ? `${platosEmpaque[0].vegetal.cantidadPorPorcion} TAZA(S) DE VEGETALES` : '1 TAZA DE VEGETALES'}</div>
                                    </div>
                                    {showCarbos && (
                                        <div className="flex border-b border-black">
                                            <div className="w-48 p-1 border-r border-black">CANTIDAD POR PLATO</div>
                                            <div className="flex-1 p-1">{platosEmpaque[0]?.carbo?.cantidadPorPorcion ? `${platosEmpaque[0].carbo.cantidadPorPorcion} TAZA(S) DE HARINA` : '1/2 TAZA DE HARINA'}</div>
                                        </div>
                                    )}
                                </div>

                                <table className="w-full border-collapse border border-black text-sm table-fixed">
                                    <thead>
                                        <tr className="bg-white">
                                            <th className="border border-black p-2 w-20 text-center"># de Plato</th>
                                            <th className="border border-black p-2 w-64 text-left">Descripcion</th>
                                            <th className="border border-black p-2 w-24 text-center">Cantidad</th>
                                            <th className="border border-black p-2 w-20 text-center">Platos</th>
                                            <th className="border border-black p-2 text-left">Especificaciones</th>
                                            <th className="border border-black p-2 text-left">Cliente</th>
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
                                                    if (client.incluyeDesayuno) tags.push('Desayunos');
                                                    
                                                    const isTwoPack = client.categoria === 'two_pack' || /two\s*pack/i.test(client.categoryLabel || '') || /two\s*pack/i.test(client.plan || '');
                                                    if (isTwoPack) tags.push('Two Pack');

                                                    const isIndividuales = client.categoria === 'individuales' || /individual/i.test(client.categoryLabel || '') || /individual/i.test(client.plan || '');
                                                    if (isIndividuales) tags.push('Individuales');

                                                    let notes = client.observaciones ? `** ${client.observaciones}` : '';
                                                    if (tags.length > 0) {
                                                        const tagsStr = `[${tags.join(', ')}]`;
                                                        notes = notes ? `${tagsStr}\n${notes}` : tagsStr;
                                                    }

                                                    let clientDisplayName = `${client.nombre} (${client.cantidad})`;
                                                    if (client.rawPedido) {
                                                        const schedule = getScheduleFromOrder(client.rawPedido);
                                                        const dateIdx = schedule.indexOf(date);
                                                        if (schedule.length > 1 && dateIdx !== -1) {
                                                            clientDisplayName = `${client.nombre} (${client.cantidad}) (Semana ${dateIdx + 1})`;
                                                        }
                                                    }

                                                    return (
                                                        <>
                                                            <td className="border border-black p-2 align-middle whitespace-pre-wrap">{notes}</td>
                                                            <td className="border border-black p-2 align-middle">{clientDisplayName}</td>
                                                        </>
                                                    );
                                                } else {
                                                    return (
                                                        <>
                                                            <td className="border border-black p-2"></td>
                                                            <td className="border border-black p-2"></td>
                                                        </>
                                                    );
                                                }
                                            };

                                            return (
                                                <tbody key={idx} className="break-inside-avoid print:break-inside-avoid">
                                                    {/* FILA 1: PROTEÍNA */}
                                                    <tr>
                                                        <td className="border border-black p-2 text-center font-bold align-middle" rowSpan={rowsPerPlate}>Plato {p.numero}</td>
                                                        <td className="border border-black p-2 font-medium bg-gray-50">{p.proteina?.nombre || ''}</td>
                                                        <td className="border border-black p-2 text-center bg-gray-50">{p.proteina?.gramosPorPorcion ? `${p.proteina.gramosPorPorcion}` : ''}</td>
                                                        <td className="border border-black p-2 text-center font-bold text-base align-middle" rowSpan={rowsPerPlate}>{totalPlatos}</td>
                                                        {renderClientCells(0)}
                                                    </tr>
                                                    {/* FILA 2: VEGETALES */}
                                                    <tr>
                                                        <td className="border border-black p-2">{p.vegetal?.nombre || ''}</td>
                                                        <td className="border border-black p-2 text-center">{p.vegetal?.cantidadPorPorcion ? `${p.vegetal.cantidadPorPorcion}` : ''}</td>
                                                        {renderClientCells(1)}
                                                    </tr>
                                                    {/* FILA 3: CARBOS (si aplica) */}
                                                    {showCarbos && (
                                                        <tr>
                                                            <td className="border border-black p-2">{p.carbo?.nombre || ''}</td>
                                                            <td className="border border-black p-2 text-center">{p.carbo?.cantidadPorPorcion ? `${p.carbo.cantidadPorPorcion}` : ''}</td>
                                                            {renderClientCells(2)}
                                                        </tr>
                                                    )}
                                                </tbody>
                                            );
                                        })}
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
                    @page { size: landscape; margin: 5mm; }
                    .page-break-after { page-break-after: always; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
