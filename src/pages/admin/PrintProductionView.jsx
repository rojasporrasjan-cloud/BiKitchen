import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import {
    mapPedidosFromLegacy,
    buildKitchenSheetData,
    buildPackagingSheetData,
    detectIsTwoPack
} from '../../utils/logisticsUtils';
import {
    mapPackNameToMenuKey,
    isIndividualPack,
    esPersonalizado,
    nombreDeHojaDeEmpaque,
    llevaFilaDeCarbo,
    llevaFilaDeVegetal,
    porcionesDelPack,

    avisoDeFamilia,
    getDefaultGrams
} from '../../utils/packClassification';
import { getOfficialMenus, DEFAULT_MENUS } from '../../utils/firestoreMenus';
import { getScheduleFromOrder } from '../../utils/orderDates';
import { ESTADOS_QUE_IMPRIMEN } from '../../utils/estadosPedido';
import { revisarHoja } from '../../utils/revisarHoja';
import {
    sumarAGranel,
    claveGranel,
    cleanIndividualDishName,
    isMoldOrSpecialDish,
    parseQuantityAndUnit,
    textoDeCantidad,
    aplicarSustitucionesAlGranel,
    limpiarGranelVacio
} from '../../utils/granelKitchen';
import { buscarRenglonDelMismoPlato, nombreMasCompleto } from '../../utils/mismoPlato';
import {
    destinosDeUnion,
    agregarUnion,
    quitarUnion,
    leerUniones,
    guardarUniones
} from '../../utils/unionesDePlatos';
import { separarComponentes, nombreParaAcumular } from '../../utils/platosCompuestos';
import { separarPorY, cantidadDeGuarnicion } from '../../utils/guarnicionesSeparadas';
import { agruparArroces } from '../../utils/agruparArroces';
import { COLECCION_AJUSTES, aplicarAjustes, cantidadFinal, conAjuste } from '../../utils/ajustesDeCocina';
import { cuantoCocinar, parteDeIndividuales } from '../../utils/cuantoCocinar';
import RevisionHoja from '../../components/admin/RevisionHoja';
import { individualesData, getProductUnits } from '../../data/individualesData';
import ExcelJS from 'exceljs';
import { agregarHojasGina } from '../../utils/excelHojaProduccion';
import { packSeParteEnAlmuerzoYCena } from '../../utils/labels/labelDomain';
import { consolidarCocina, formatearCantidad } from '../../utils/cocinaConsolidada';
import { repartirPlatillos, sugerirCocinera, TIPO_POR_CATEGORIA } from '../../utils/asignacionCocineras';
import { COCINERAS } from '../../data/cocineras';

import {
    MARGEN_COCINA,
    conMargen,
    filterNoteForDish,
    notaParaEmpaque,
    cantidadDePacks,
    normalizeClientKey,
    esMismoCliente,
    listarSustituciones,
    textoSustitucion,
    etiquetasDeEmpaque,
    sinSustituciones,
    deduplicateOrdersByClient
} from '../../utils/productionHelpers';

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

    // Lo que Gina corrige a mano sobre la hoja de cocina. Se guarda por fecha y
    // manda sobre el calculo: ella es la que ve si el numero esta mal.
    const [ajustesCocina, setAjustesCocina] = useState({});
    const [guardandoAjuste, setGuardandoAjuste] = useState(false);
    const [errorDeAjuste, setErrorDeAjuste] = useState('');

    useEffect(() => {
        if (!date) return;
        let vigente = true;
        getDoc(doc(db, COLECCION_AJUSTES, date))
            .then(d => { if (vigente) setAjustesCocina(d.exists() ? (d.data().renglones || {}) : {}); })
            .catch(err => console.error('[Cocina] No se pudieron leer los ajustes:', err));
        return () => { vigente = false; };
    }, [date]);

    const guardarAjuste = async (nombre, unidad, cambio) => {
        const previos = ajustesCocina;
        const siguientes = conAjuste(ajustesCocina, nombre, unidad, cambio);
        setAjustesCocina(siguientes);
        setGuardandoAjuste(true);
        try {
            await setDoc(doc(db, COLECCION_AJUSTES, date), {
                fecha: date,
                renglones: siguientes,
                actualizado: new Date().toISOString()
            }, { merge: true });
            setErrorDeAjuste('');
        } catch (err) {
            // Si no se guardo, la hoja NO puede seguir mostrando el numero nuevo:
            // Gina lo daria por bueno y se cocinaria con un dato que no existe.
            console.error('[Cocina] No se pudo guardar el ajuste:', err);
            setAjustesCocina(previos);
            setErrorDeAjuste(
                err?.code === 'permission-denied'
                    ? 'Firebase no deja guardar los cambios de la hoja de cocina todavía. Falta publicar la regla de `ajustes_cocina`.'
                    : 'No se pudo guardar el cambio. Revisá la conexión e intentá de nuevo.'
            );
        }
        setGuardandoAjuste(false);
    };
    const [orders, setOrders] = useState([]);
    const [officialMenus, setOfficialMenus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [empaqueTab, setEmpaqueTab] = useState('packs');
    const [kitchenAssignments, setKitchenAssignments] = useState({});
    const [categoryCookInputs, setCategoryCookInputs] = useState({});
    const [resumenReparto, setResumenReparto] = useState(null);
    // Platos que Gina dijo que son el mismo. Se guardan en el navegador para
    // no tener que rehacerlas cada semana.
    const [unionesDePlatos, setUnionesDePlatos] = useState(() => leerUniones());
    const [selectedKitchenItems, setSelectedKitchenItems] = useState([]);
    const [bulkSelectedCook, setBulkSelectedCook] = useState('');
    const [importingExcel, setImportingExcel] = useState(false);

    const resolvePlatosForPack = (packName, packData) => {
        const isCenaSheet = packName.startsWith('CENAS -');
        const basePackName = isCenaSheet ? packName.replace(/^CENAS\s*-\s*/i, '') : packName;
        const menuKey = packData?.menuKey || mapPackNameToMenuKey(basePackName);

        // Un PERSONALIZADO trae sus platos escritos en el pedido y esos mandan,
        // pase lo que pase con el nombre. Hace falta porque el nombre TIENE que
        // decir "Sin Carbos" o "Desayunos" para que la hoja lo clasifique bien
        // —donde imprimirlo, si lleva harina— y en cuanto lo dice, esta funcion
        // le buscaba el menu oficial de ESTA semana. A Fatima Arauz, que lleva
        // el menu del 25 al 31 de agosto, le habria puesto los platos de otra.
        if (esPersonalizado(basePackName)) return packData?.platosBase || [];

        let rawPlatos = [];
        if (officialMenus && menuKey) {
            if (isCenaSheet) {
                const cenaKeyCap = menuKey.charAt(0).toUpperCase() + menuKey.slice(1);
                const cenaMenuObj = officialMenus.cena?.[menuKey]
                    || officialMenus[`cena_${menuKey}`]
                    || officialMenus[`cena${cenaKeyCap}`]
                    || officialMenus[`cena${menuKey}`];

                if (cenaMenuObj) {
                    rawPlatos = Array.isArray(cenaMenuObj) ? cenaMenuObj : (cenaMenuObj.platos || []);
                }
            } else {
                const menuObj = officialMenus[menuKey];
                if (menuObj) {
                    rawPlatos = Array.isArray(menuObj) ? menuObj : (menuObj.platos || []);
                }
            }
        }

        if (isCenaSheet && (!rawPlatos || rawPlatos.length === 0)) {
            const defCenaObj = DEFAULT_MENUS.cena?.[menuKey] || DEFAULT_MENUS.cena?.bajoCalorias || DEFAULT_MENUS.cena?.regular || [];
            rawPlatos = Array.isArray(defCenaObj) ? defCenaObj : (defCenaObj.platos || []);
        }

        if (!isCenaSheet && (!rawPlatos || rawPlatos.length === 0)) {
            const defMenuObj = DEFAULT_MENUS[menuKey] || [];
            rawPlatos = Array.isArray(defMenuObj) ? defMenuObj : (defMenuObj.platos || []);
            if (!rawPlatos || rawPlatos.length === 0) rawPlatos = packData?.platosBase || [];
        }

        return rawPlatos || [];
    };

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

    useEffect(() => {
        if (!date) return;
        setLoading(true);
        const targetDate = new Date(date + "T12:00:00");
        const pastDate = new Date(targetDate);
        pastDate.setDate(pastDate.getDate() - 40); // Buscar hasta 40 días atrás para mensualidades
        const pastDateStr = pastDate.toISOString().split('T')[0];

        const q = query(
            collection(db, "pedidos"),
            where("fecha_entrega", ">=", pastDateStr)
        );

        // Cargar menús oficiales
        getOfficialMenus().then(menus => setOfficialMenus(menus)).catch(console.error);

        // Listener en tiempo real: cualquier cambio en observaciones o pedidos se refleja al instante
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let rawOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            rawOrders = rawOrders.filter(order => {
                const status = (order.status || order.estado || '').toLowerCase();
                if (!ESTADOS_QUE_IMPRIMEN.includes(status)) return false;

                const schedule = getScheduleFromOrder(order);
                return schedule.includes(date);
            });

            rawOrders.sort((a, b) => (a.cliente || '').localeCompare(b.cliente || ''));

            setOrders(mapPedidosFromLegacy(rawOrders));
            setLoading(false);
        }, (error) => {
            console.error("Error in real-time orders listener:", error);
            setLoading(false);
        });

        return () => unsubscribe();
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

    // `cleanOrders` es lo que REALMENTE se cocina; `fusionados` son los pedidos
    // que se descartaron por parecerse a otro. La revision tiene que mirar lo
    // que se cocina, no lo que entro: antes contaba `orders` y el panel decia
    // "21 pedidos" cuando a la cocina llegaban 18.
    const { pedidos: cleanOrders, fusionados } = deduplicateOrdersByClient(orders);
    const kitchenData = buildKitchenSheetData(cleanOrders, {});
    const packagingData = buildPackagingSheetData(cleanOrders, {}, null);

    // Group packaging data by Pack
    const packsMap = {};

    const addClientToPackMap = (pName, cData, overridePlates = null) => {
        if (!packsMap[pName]) {
            packsMap[pName] = { name: pName, clientes: [], platosBase: [], totalPacks: 0 };
        }
        // Misma regla que deduplicateOrdersByClient: si cada una comparara los
        // nombres a su manera, la hoja y las etiquetas dirian cantidades distintas.
        const existingClient = packsMap[pName].clientes.find(
            existing => esMismoCliente(existing.nombre, cData.cliente)
        );

        if (existingClient) {
            existingClient.cantidad += (cData.cantidadMenus || 1);
            if (cData.observaciones) {
                if (!existingClient.observaciones) {
                    existingClient.observaciones = cData.observaciones;
                } else if (!existingClient.observaciones.toLowerCase().includes(cData.observaciones.toLowerCase())) {
                    existingClient.observaciones += ` · ${cData.observaciones}`;
                }
            }
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

    const isActuallyIndividual = (packName) => {
        // Un menú PERSONALIZADO se empaca como pack —con sus platos, gramaje y
        // vegetal/carbo— pero sus platos NO salen del menú semanal, sino del propio
        // pedido. Gina los lleva así en su pestaña "Personalizado": Dalia Parrales
        // con 3 packs sin cerdo, Maycol Ávila con dos menús y sin vainica.
        if (esPersonalizado(packName)) return false;

        if (isIndividualPack(packName)) return true;
        // Si pertenece a una de las 7 familias de packs oficiales (Bajo Calorías, Full Pack, Keto, etc),
        // NUNCA es individual, sin importar si en las notas dice "120g proteína"
        if (mapPackNameToMenuKey(packName)) return false;
        return true;
    };

    packagingData.clientes.forEach((c) => {
        // El MISMO criterio que usa el resto de la hoja. Antes acá se pedía que el
        // plan dijera "individual", y el de un pedido de individuales es el nombre
        // del PRIMER plato: el de Larissa Serendero decía "Cochinita pibil". Al no
        // reconocerla, se la trataba como un pack con ese nombre y el filtro de
        // abajo le dejaba solo el plato que coincidía — perdía el Taco alambre y el
        // Arroz estilo cantones que sí pagó.
        const isIndividual = c.categoria === 'individuales'
            || isActuallyIndividual(c.plan || c.tipoMenu || '');

        let packsInOrder = [];

        if (isIndividual) {
            packsInOrder.push({ name: c.plan || c.tipoMenu || 'Pack Individuales', qty: c.cantidadMenus || 1, forceIndividual: true });
        } else {
            const mainPackName = c.plan || c.tipoMenu || 'Pack Estándar';

            // Un cliente puede comprar VARIOS packs iguales. Esa cantidad puede venir
            // en `cantidadMenus` (pedidos de la web) o solo en el ítem (pedidos que
            // entraron por WhatsApp). Mirando únicamente `cantidadMenus`, el pedido de
            // "3x Pack Mensual Bajo Calorías" —₡232.500, o sea 3 × ₡77.500— salía en
            // la hoja como UN pack: el cliente recibía la tercera parte de lo que pagó.
            //
            // Se toma el mayor de los dos y no la suma: son dos formas de escribir el
            // mismo dato, no dos cantidades distintas. Solo aplica a packs; en los
            // individuales la cantidad ya viaja dentro de cada plato.
            packsInOrder.push({ name: mainPackName, qty: cantidadDePacks(c) });

            // Un mismo pedido puede traer el pack Y productos sueltos: Priscilla lleva
            // su pack quincenal y aparte tortas de maduro, en el mismo pedido. Esos
            // platos se perdían, porque más abajo solo se conservan los que calzan con
            // el nombre del pack: el cliente pagaba algo que nadie empacaba.
            //
            // Se descarta lo que sea un pack conocido (mapPackNameToMenuKey lo
            // reconoce) para no convertir el propio pack en un "individual" cuando el
            // nombre del ítem y el del plan no coinciden exactamente.
            // Solo hace falta cuando el pack principal es un pack de MENÚ: sus platos
            // salen del menú semanal, así que cualquier otro producto del pedido queda
            // invisible. Si el pack ya es un producto suelto (ej: "Pack 3 Proteínas"),
            // sus platos se listan enteros más abajo y separarlos los duplicaría.
            if (mapPackNameToMenuKey(mainPackName)) {
                (c.rawPedido?.items || []).forEach(item => {
                    const nombre = String(item?.nombre || '').trim();
                    if (!nombre || nombre === mainPackName) return;
                    if (mapPackNameToMenuKey(nombre)) return;

                    packsInOrder.push({ name: nombre, qty: Number(item.cantidad) || 1, forceIndividual: true });
                });
            }
        }

        const aggregatedPacks = {};
        // Los productos sueltos no se parten en cenas: un postre no tiene "versión cena"
        const productosSueltos = new Set();
        packsInOrder.forEach(pack => {
            if (!aggregatedPacks[pack.name]) aggregatedPacks[pack.name] = 0;
            aggregatedPacks[pack.name] += pack.qty;
            if (pack.forceIndividual) productosSueltos.add(pack.name);
        });

        // Esta hoja la lee quien empaca: se le quitan los teléfonos y las notas de
        // control interno, que solo le tapaban los cambios de plato de verdad.
        const cleanCustomerNotes = (rawObs) => notaParaEmpaque(rawObs);

        Object.entries(aggregatedPacks).forEach(([packName, totalQty]) => {
            const nameLower = packName.toLowerCase();
            const obsLower = String(c.observaciones || '').toLowerCase();
            const obsHasCena = /\bcenas?\b/.test(obsLower);

            const hasBreakfastGift = nameLower.includes('regalia') && nameLower.includes('desayun')
                || nameLower.includes('+ desayuno')
                || nameLower.includes('con desayuno')
                || nameLower.includes('desayuno gratis');
            const obsHasBreakfast = obsLower.includes('desayun') && (obsLower.includes('regalía') || obsLower.includes('regalia') || obsLower.includes('lleva') || obsLower.includes('con desayunos'));

            const orderPlanText = `${c.plan || ''} ${c.tipoMenu || ''} ${c.categoryLabel || ''} ${c.categoria || ''} ${c.rawPedido?.plan || ''} ${c.rawPedido?.tipoMenu || ''}`;
            const combinedText = `${nameLower} ${obsLower} ${orderPlanText.toLowerCase()}`;
            // La regla vive en labelDomain para que la hoja y las etiquetas no puedan
            // contradecirse: antes esta vista contaba "two pack" como cena y el
            // impresor de etiquetas no, así que Gina cocinaba packs que nadie pidió.
            const isCenaPromo = !productosSueltos.has(packName) && packSeParteEnAlmuerzoYCena(packName, combinedText);

            const filteredPlates = isIndividual ? c.platos : (c.platos || []).filter(p => p.proteina?.nombre === packName);
            const clientForPack = { ...c, cantidadMenus: totalQty };
            const cleanObs = cleanCustomerNotes(c.observaciones);

            const appendTagUnique = (existing, tag) => {
                if (!existing) return tag;
                if (existing.toLowerCase().includes(tag.toLowerCase())) return existing;
                return `${existing} · ${tag}`;
            };

            const filterObsForCenas = (obs) => {
                if (!obs) return '';
                return String(obs)
                    .replace(/cambiar\s+almuercitos[^·|—]*/gi, '')
                    .replace(/cambiar\s+cochinita[^·|—]*/gi, '')
                    .replace(/cambiar\s+fajitas[^·|—]*/gi, '')
                    .replace(/cambiar\s+relish[^·|—]*/gi, '')
                    .replace(/cambiar\s+gajos[^·|—]*/gi, '')
                    .replace(/cambiar\s+pastel[^·|—]*/gi, '')
                    .replace(/cambiar\s+arroz[^·|—]*/gi, '')
                    .replace(/^\s*[\·\|—]+\s*/, '')
                    .replace(/\s*[\·\|—]+\s*$/, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            };

            if (isCenaPromo) {
                // Copia para la tabla de ALMUERZOS → decir que también lleva cena
                const almuerzoClient = { ...clientForPack };
                almuerzoClient.observaciones = appendTagUnique(cleanObs, 'Lleva cena');
                addClientToPackMap(packName, almuerzoClient, filteredPlates.length > 0 ? filteredPlates : null);

                // Copia para la tabla de CENAS → decir qué pack de almuerzo lleva (SIN los cambios específicos del menú de almuerzo)
                const menuKey = mapPackNameToMenuKey(packName);
                const packLabel = (menuKey && MENU_LABELS[menuKey]) ? MENU_LABELS[menuKey] : packName;
                const cenaClient = { ...clientForPack };
                const cleanCenaObs = filterObsForCenas(cleanObs);
                cenaClient.observaciones = appendTagUnique(cleanCenaObs, `Lleva ${packLabel}`);
                addClientToPackMap(`CENAS - ${packName}`, cenaClient, null);
            } else {
                const normClient = { ...clientForPack, observaciones: cleanObs };
                addClientToPackMap(packName, normClient, filteredPlates.length > 0 ? filteredPlates : null);
            }

            const menuKey = mapPackNameToMenuKey(packName);

            // Los desayunos van UNA vez por cliente, no una por cada línea del pedido.
            // Priscilla lleva su pack y aparte tortas de maduro: al separarlas, este
            // bloque corría dos veces y le contaba 2 packs de desayunos en vez de 1.
            const esProductoSuelto = productosSueltos.has(packName);
            if (!esProductoSuelto && (c.incluyeDesayuno || hasBreakfastGift || obsHasBreakfast) && menuKey !== 'desayuno') {
                // Los packs de desayuno se cuentan aparte: Christopher lleva UN
                // personalizado de almuerzo y DOS packs de desayunos.
                const packsDeDesayuno = Number(c.packsDesayuno) > 0 ? Number(c.packsDesayuno) : totalQty;
                const desClient = { ...clientForPack, observaciones: cleanObs };
                addClientToPackMap('Pack de Desayunos', { ...desClient, cantidadMenus: packsDeDesayuno }, []);
            }
        });
    });

    const allPackNames = Object.keys(packsMap).sort();
    const isDesayunoPack = (n) => mapPackNameToMenuKey(n) === 'desayuno';


    // ── Consolidar packs que comparten el mismo menú (mismos platos) ──
    // "Pack Bajo Calorías Promo Almuerzo y Cena" y "Pack 2 Semanas Bajo Calorías"
    // tienen los MISMOS platos → se fusionan en UNA sola hoja de empaque.
    const MENU_ORDER = ['regular', 'fullPack', 'bajoCalorias', 'sinCarbos', 'keto', 'vegetariano', 'casaditos', null];

    const consolidatedPacksMap = {};
    const packNameToConsolidated = {}; // mapea nombre original → nombre consolidado

    allPackNames.forEach(packName => {
        if (isActuallyIndividual(packName) || isDesayunoPack(packName)) return;

        const menuKey = mapPackNameToMenuKey(packName);
        // Si tiene menuKey, consolidar bajo el label de la familia. Un
        // PERSONALIZADO se queda con su nombre: comparte la forma de empaque de
        // la familia pero NO sus platos.
        let consolidatedName = nombreDeHojaDeEmpaque(packName, menuKey ? MENU_LABELS[menuKey] : null);

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

        const nameKey = normalizeClientKey(cName);

        // Misma regla de nombres que la fusion: comparar palabras, no subcadenas.
        // Con `includes()` a un cliente le aparecia el "Lleva tambien" de otro.
        let matchedPacks = [];
        Object.keys(clientToOtherPacks).forEach(registeredName => {
            if (esMismoCliente(registeredName, cName)) {
                matchedPacks.push(...clientToOtherPacks[registeredName]);
            }
        });

        let otherPacks = [...new Set(matchedPacks)].filter(p => p !== currentShortName);

        // No imprimir 'Desayunos' en 'Lleva también' si las observaciones ya dicen que lleva desayuno
        const clientObj = packsMap[currentPackName]?.clientes?.find(c => normalizeClientKey(c.nombre) === nameKey);
        if (clientObj && clientObj.observaciones && clientObj.observaciones.toLowerCase().includes('desayun')) {
            otherPacks = otherPacks.filter(p => p !== 'Desayunos');
        }

        if (otherPacks.length > 0) {
            return `Lleva también: ${otherPacks.join(', ')}`;
        }
        return '';
    };

    const renderDesayunosTable = (packName, packData, currentDate) => {
        const rawPlatos = resolvePlatosForPack(packName, packData);

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

                const formatQty = (nameStr, count, gramsVal, medida = '') =>
                    textoDeCantidad(nameStr, medida, count, gramsVal);

                if (c.platos && c.platos.length > 0) {
                    c.platos.forEach(p => {
                        let protName = p.proteina?.nombre || packName;
                        if (p.descripcion && p.descripcion.trim() !== '') {
                            protName += ` (${p.descripcion})`;
                        }
                        const grams = p.proteina?.gramosPorPorcion;
                        const itemCount = p.cantidad || c.cantidad || 1;
                        // La medida escrita en el pedido MANDA: sin ella el parser
                        // le ponia 250 g a toda proteina y esta tabla contradecia al
                        // granel de la misma hoja (Fatima Arauz, cenas de 120 g).
                        let qty = formatQty(protName, itemCount, grams, p.medida);

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
    /**
     * Qué se cocina junto.
     *
     * El resto de la hoja está ordenada por menú, que es como se empaca. Para
     * cocinar sirve al revés: una preparación por renglón, con el total de una
     * vez, y al lado a cuántos platos de cada menú va para poder repartirla al
     * salir de la olla.
     */
    const renderQueSeCocinaJunto = () => {
        const merma = Math.round((MARGEN_COCINA - 1) * 100);
        const { preparaciones } = consolidarCocina(cleanOrders, { marginPercent: merma });
        if (preparaciones.length === 0) return null;

        const porTipo = preparaciones.reduce((acc, p) => {
            (acc[p.tipo] = acc[p.tipo] || []).push(p);
            return acc;
        }, {});

        return (
            <div className="mb-10 print:break-after-page print:[page-break-after:always]">
                <h2 className="bg-black text-white text-center font-bold text-xl p-2 border border-black uppercase tracking-wide">
                    Qué se cocina junto — {date}
                </h2>
                <p className="text-xs text-gray-600 border-x border-b border-black p-2 print:text-[10px]">
                    Una línea por preparación, sumando todos los menús. La columna de la
                    derecha dice cómo repartirla cuando salga de la olla.
                    {merma > 0 && ` Las cantidades ya traen el ${merma}% de merma.`}
                </p>

                {Object.entries(porTipo).map(([tipo, lista]) => (
                    <table key={tipo} className="w-full border-collapse border border-black text-sm mb-6 table-fixed">
                        <thead>
                            <tr>
                                <th colSpan="4" className="bg-[#f4b084] border border-black p-1.5 text-left font-bold uppercase">
                                    {tipo}s — {lista.length} preparacion{lista.length === 1 ? '' : 'es'}
                                </th>
                            </tr>
                            <tr className="bg-[#fce4d6]">
                                <th className="border border-black p-1.5 text-left w-[38%]">Preparación</th>
                                <th className="border border-black p-1.5 text-center w-20">Porciones</th>
                                <th className="border border-black p-1.5 text-center w-28">Cantidad</th>
                                <th className="border border-black p-1.5 text-left">Cómo repartirlo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lista.map(p => (
                                <tr key={`${p.tipo}-${p.nombre}-${p.unidad}`} className="break-inside-avoid">
                                    <td className="border border-black p-1.5 font-medium">
                                        {p.nombre}
                                        {p.esSustitucion && (
                                            <span className="ml-2 text-[10px] font-bold text-red-700">CAMBIO</span>
                                        )}
                                    </td>
                                    <td className="border border-black p-1.5 text-center font-bold text-base">
                                        {p.porcionesCocina}
                                    </td>
                                    <td className="border border-black p-1.5 text-center font-bold">
                                        {p.porPorcion > 0 ? formatearCantidad(p.totalCocina, p.unidad) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-xs print:text-[10px]">
                                        {p.hayQueRepartir
                                            ? p.desglose.map(d => `${d.porciones} → ${d.origen}`).join('  ·  ')
                                            : <span className="text-gray-400">todo junto</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ))}
            </div>
        );
    };

    // LOGICA NUEVA DE HOJA DE COCINA GLOBAL
    // ==========================================
    const getAllKitchenItems = () => {
        const bulkItemsMap = {};
        const missingMenus = [];

        const guessCategory = (name) => {
            const n = name.toLowerCase();
            if (n.includes('pollo') || n.includes('pescado') || n.includes('tilapia') || n.includes('salmón') || n.includes('salmon') || n.includes('atun') || n.includes('corvina')) return 'Aves y Pescados';
            if (n.includes('res') || n.includes('cerdo') || n.includes('carne') || n.includes('lomo') || n.includes('fajitas') || n.includes('chicharrón') || n.includes('mechada') || n.includes('pibil') || n.includes('torta') || n.includes('pork') || n.includes('bistec')) return 'Res y Cerdo';
            if (n.includes('arroz') || n.includes('garbanzo') || n.includes('vegetal') || n.includes('picadillo') || n.includes('ayote') || n.includes('brócoli') || n.includes('zuchinni') || n.includes('tomate') || n.includes('lentejas') || n.includes('pasta') || n.includes('spaguetti')) return 'Arroces y Vegetales';
            if (n.includes('papa') || n.includes('camote') || n.includes('yuca') || n.includes('frijol') || n.includes('maduro') || n.includes('puré') || n.includes('coleslaw') || n.includes('plátano') || n.includes('ensalada')) return 'Guarniciones y Tubérculos';
            return 'Otros';
        };

        // Platos que calzaban con varios renglones y hubo que dejar aparte
        const avisosDeUnion = [];

        /**
         * Suma un plato al acumulador, juntandolo con el renglon que ya lo tiene.
         *
         * El mismo plato se escribe distinto segun de donde venga: el menu de un
         * pack, el menu de otro pack, un individual. El acumulador se indexa por
         * nombre exacto, asi que sin esto sale en varios renglones y la cocina lo
         * prepara varias veces, cada una con una parte del total. Se veia como
         * "Milanesa de pollo 196 g" cuando el dia pedia bastante mas.
         *
         * La clave del renglon NO cambia al juntar, solo el nombre que se muestra.
         * Es a proposito: las sustituciones restan por el nombre original y tienen
         * que seguir encontrando su renglon.
         */
        // Lo que Gina marcó como el mismo plato manda sobre el emparejador:
        // ella sabe que las tres carnes mechadas salen de una sola olla, cosa
        // que de los nombres no se deduce.
        const destinos = destinosDeUnion(unionesDePlatos);

        const acumularPlato = (nombreCrudo, cantidad, unidad, platos = 0) => {
            // Un renglon puede ser varias ollas: "Arroz, frijoles y maduros" son
            // tres preparaciones. Cada una lleva la MISMA cantidad que traia el
            // renglon: si decia 4 tazas, son 4 de cada cosa.
            //
            // Se parte por coma y tambien por " y " cuando las dos partes son
            // ingredientes sueltos: "Arroz y frijoles" son dos ollas. Y cada
            // parte usa SU unidad — los maduros del casadito se cuentan de a dos
            // por plato, no por taza.
            const componentes = separarComponentes(nombreCrudo)
                .flatMap(parte => separarPorY(parte));
            if (componentes.length > 1) {
                let primera = null;
                componentes.forEach(parte => {
                    const suyo = cantidadDeGuarnicion(parte, cantidad, unidad, platos);
                    const clave = acumularPlato(parte, suyo.cantidad, suyo.unidad, platos);
                    if (primera === null) primera = clave;
                });
                return primera;
            }

            // El nombre con el que entra: lo que una persona marco como el mismo
            // plato, o el nucleo (toda la "carne mechada" es una sola olla).
            const nombre = nombreParaAcumular(nombreCrudo, destinos);
            const encontrado = buscarRenglonDelMismoPlato(bulkItemsMap, nombre, unidad);

            if (encontrado.ambiguo.length > 0) {
                // Calzaba con varios: juntarlo con el que no es seria peor que
                // dejarlo aparte. Se avisa y se separa.
                avisosDeUnion.push({ nombre, calzaCon: encontrado.ambiguo });
            }

            if (encontrado.clave) {
                const renglon = bulkItemsMap[encontrado.clave];
                renglon.totalQty += cantidad;
                renglon.name = nombreMasCompleto(renglon.name, nombre);
                return encontrado.clave;
            }

            sumarAGranel(bulkItemsMap, nombre, cantidad, unidad, guessCategory);
            return claveGranel(nombre, unidad);
        };

        // 1. Process regular packs (Granel para ollas)
        regularPackNames.forEach(packName => {
            const packData = consolidatedPacksMap[packName];
            if (!packData || packData.totalPacks === 0) return;

            const isCenaSheet = packName.startsWith('CENAS -');
            const basePackName = isCenaSheet ? packName.replace(/^CENAS\s*-\s*/i, '') : packName;
            const menuKey = packData.menuKey || mapPackNameToMenuKey(basePackName);

            const rawPlatos = resolvePlatosForPack(packName, packData);

            if (rawPlatos.length === 0) {
                missingMenus.push(packName);
            }

            const porcionDeLaFamilia = porcionesDelPack(packName);
            const platosEmpaque = rawPlatos.map((p, idx) => {
                const isOfficial = typeof p.proteina === 'string';

                // El menu oficial guarda los platos como texto y no trae gramaje:
                // ahi el default del nombre del pack es lo unico que hay. Pero un
                // PERSONALIZADO trae la porcion escrita en el pedido, y esa manda.
                // Se estaba tirando y se cocinaba con el default del nombre, que
                // para un pack sin gramos en el titulo son 150 g parejo.
                // Y si la FAMILIA tiene su propio gramaje, ese le gana al default
                // del nombre: un plato familiar es una bandeja de 1 kg y se
                // cocinaba con los 150 g de siempre. Al Paquete Deluxe de Rebeca
                // Toval —siete platos— le faltaban casi ocho kilos.
                const gramosDelPlato = Number(p.proteina?.gramosPorPorcion) > 0
                    ? Number(p.proteina.gramosPorPorcion)
                    : (porcionesDelPack(packName).proteina || getDefaultGrams(packName));

                return {
                    vecesPorPack: Number(p.vecesPorPack) > 0 ? Number(p.vecesPorPack) : 1,
                    proteina: {
                        nombre: isOfficial ? p.proteina : p.proteina?.nombre,
                        // Tambien para los del menu oficial: ahi se usaba el default
                        // del NOMBRE y se saltaba el de la familia, asi que un plato
                        // familiar se cocinaba con 150 g en vez de 1 kg.
                        gramosPorPorcion: gramosDelPlato
                    },
                    vegetal: {
                        nombre: isOfficial ? p.vegetal : p.vegetal?.nombre,
                        // El granel tenia su propia copia de 1 y 0,5 para todos:
                        // el keto pedia 1 taza de vegetal cuando lleva 1,5, y los
                        // casaditos 0,5 de harina cuando llevan 1,5.
                        cantidadPorPorcion: Number(p.vegetal?.cantidadPorPorcion) > 0
                            ? Number(p.vegetal.cantidadPorPorcion)
                            : (porcionDeLaFamilia.vegetal ?? 1)
                    },
                    carbo: {
                        nombre: isOfficial ? p.carbo : p.carbo?.nombre,
                        cantidadPorPorcion: Number(p.carbo?.cantidadPorPorcion) > 0
                            ? Number(p.carbo.cantidadPorPorcion)
                            : (porcionDeLaFamilia.carbo ?? 0.5)
                    }
                };
            });

            const packsDelPack = packData.totalPacks || 0;
            platosEmpaque.forEach(p => {
                // Un plato que se hace varias veces por pack cuenta esas veces:
                // si no, el pack de Christopher pedia 960 g de proteina cuando
                // sus 20 platos necesitan 2400 g.
                const totalPlatos = packsDelPack * (p.vecesPorPack || 1);
                const porcion = porcionesDelPack(packName);
                if (p.proteina?.nombre && p.proteina.nombre !== '—') {
                    // Un plato familiar se cocina por KILO: el gramaje de la familia
                    // manda cuando el plato no trae el suyo.
                    const grams = (p.proteina.gramosPorPorcion || porcion.proteina || getDefaultGrams(packName)) * totalPlatos;
                    acumularPlato(p.proteina.nombre, grams, 'g');
                }
                if (p.vegetal?.nombre && p.vegetal.nombre !== '—') {
                    const units = (p.vegetal.cantidadPorPorcion || porcion.vegetal) * totalPlatos;
                    acumularPlato(p.vegetal.nombre, units, 'taza(s)');
                }
                const showCarbo = menuKey !== 'keto' && menuKey !== 'sinCarbos' && p.carbo?.nombre && p.carbo.nombre !== '—';
                if (showCarbo) {
                    const units = (p.carbo.cantidadPorPorcion || porcion.carbo) * totalPlatos;
                    acumularPlato(p.carbo.nombre, units, 'taza(s)', totalPlatos);
                }
            });

            // Lo que el cliente pidió cambiar tiene que cocinarse. Arriba se sumó
            // el menú oficial parejo para todos; acá se le resta al plato original
            // la porción de quien lo cambió y se le suma al sustituto.
            (packData.clientes || []).forEach(c => {
                const subs = listarSustituciones(c.rawPedido || c);
                if (subs.length === 0) return;
                aplicarSustitucionesAlGranel(bulkItemsMap, {
                    sustituciones: subs,
                    platos: platosEmpaque,
                    porciones: cantidadDePacks(c),
                    gramosPorPorcion: getDefaultGrams(packName),
                    categoria: guessCategory,
                    acumular: acumularPlato
                });
            });
        });

        // 2. Process Individuales (Pre-empacados directamente en cocina)
        individualPackNames.forEach(packName => {
            const packData = packsMap[packName];
            if (!packData || !packData.clientes) return;

            packData.clientes.forEach(c => {
                const processItem = (rawName, pGrams, pDesc, pCount = null) => {
                    const itemCount = pCount || c.cantidad || 1;
                    const specStr = pDesc || c.plan || c.tipoMenu || c.categoryLabel || c.observaciones || '';
                    const cleanName = cleanIndividualDishName(rawName);

                    const parsed = parseQuantityAndUnit(rawName, specStr, itemCount, pGrams);
                    const portionGrams = pGrams || parsed.portionGrams;
                    const nameLower = cleanName.toLowerCase();

                    // Un individual va SIEMPRE al mismo lugar que los packs.
                    // Antes se partía en dos tablas y el mismo plato terminaba en
                    // las dos: "Albóndigas de res" por el pack y "Albóndigas de
                    // res artesanales" por el individual, cocinadas dos veces.
                    //
                    // El renglón se busca por plato, no por nombre exacto, porque
                    // el pack y el individual casi nunca lo escriben igual.
                    const clave = acumularPlato(cleanName, parsed.totalQty, parsed.unit);
                    const renglon = bulkItemsMap[clave];
                    if (renglon) {
                        // Este plato lo empaca cocina, no Empaque: hay que decirlo
                        // en la hoja o se empaca dos veces o ninguna.
                        renglon.empacaCocina = true;
                        if (!renglon.portionGrams && portionGrams) renglon.portionGrams = portionGrams;
                        if (!renglon.portionSpec && specStr) renglon.portionSpec = specStr;
                        if (isMoldOrSpecialDish(nameLower)) renglon.esMolde = true;

                        if (!renglon.individualEntries) renglon.individualEntries = [];
                        renglon.individualEntries.push({
                            qty: parsed.totalQty,
                            unit: parsed.unit,
                            portionGrams: portionGrams
                        });
                    }
                };

                const itemsToProcess = [];
                if (c.platos && c.platos.length > 0) {
                    c.platos.forEach(p => {
                        const rawName = p.proteina?.nombre || p.nombre || packName;
                        itemsToProcess.push({
                            name: rawName,
                            grams: p.proteina?.gramosPorPorcion || p.gramos,
                            // La medida de ESE plato manda: mapPedidosFromLegacy la guarda
                            // tal como la escribio Gina ("120 g", "1 unidad", "4 tazas").
                            // Sin ella el parser adivina por el tipo de plato y a toda
                            // proteina le pone 250 g: a Fatima Arauz le ponia el doble en
                            // cada una de sus cenas Sin Carbos, que son de 120 g.
                            desc: p.medida || p.descripcion || '',
                            count: p.cantidad || 1
                        });
                    });
                } else if (c.rawPedido && c.rawPedido.items && c.rawPedido.items.length > 0) {
                    c.rawPedido.items.forEach(it => {
                        itemsToProcess.push({
                            name: it.nombre || it.name || packName,
                            grams: it.gramos || it.proteinaGramos,
                            desc: it.desc || it.planLabel || '',
                            count: it.cantidad || 1
                        });
                    });
                } else if (c.items && c.items.length > 0) {
                    c.items.forEach(it => {
                        itemsToProcess.push({
                            name: it.nombre || it.name || packName,
                            grams: it.gramos,
                            desc: it.desc || '',
                            count: it.cantidad || 1
                        });
                    });
                } else {
                    itemsToProcess.push({ name: packName, grams: null, desc: '', count: c.cantidad || 1 });
                }

                itemsToProcess.forEach(it => {
                    processItem(it.name, it.grams, it.desc, it.count);
                });
            });
        });

        // Un plato que quedó en cero por las sustituciones ya no se cocina.
        limpiarGranelVacio(bulkItemsMap);

        // Format consolidated kitchen notes for bulk items
        Object.values(bulkItemsMap).forEach(item => {
            if (!item.individualEntries || item.individualEntries.length === 0) return;

            const gramsMap = {};
            let tazasCount = 0;
            let unidadesCount = 0;

            item.individualEntries.forEach(e => {
                if (e.unit === 'g' && e.portionGrams && e.portionGrams > 0) {
                    const tazas = Math.max(1, Math.round(e.qty / e.portionGrams));
                    gramsMap[e.portionGrams] = (gramsMap[e.portionGrams] || 0) + tazas;
                } else if (e.unit === 'g') {
                    gramsMap['g_raw'] = (gramsMap['g_raw'] || 0) + e.qty;
                } else if (e.unit === 'taza(s)') {
                    tazasCount += e.qty;
                } else {
                    unidadesCount += e.qty;
                }
            });

            const parts = [];
            Object.entries(gramsMap).forEach(([gStr, count]) => {
                if (gStr === 'g_raw') {
                    parts.push(`${count}g`);
                } else {
                    parts.push(count > 1 ? `${count} tazas de ${gStr}g` : `1 taza de ${gStr}g`);
                }
            });
            if (tazasCount > 0) {
                parts.push(tazasCount > 1 ? `${tazasCount} tazas` : `1 taza`);
            }
            if (unidadesCount > 0) {
                parts.push(unidadesCount > 1 ? `${unidadesCount} unidades` : `1 unidad`);
            }

            if (parts.length > 0) {
                item.kitchenNotes = [`Empacar en cocina: ${parts.join(' + ')} para Individuales`];
            }
        });

        const bulkItems = Object.values(bulkItemsMap).sort((a, b) => a.name.localeCompare(b.name));

        return { bulkItems, missingMenus, avisosDeUnion };
    };

    /**
     * Cuánto hay que poner a cocinar.
     *
     * La merma es lo que se encoge o se pierde al cocinar, así que va sobre lo
     * que se pesa o se mide. A las unidades NO se les aplica: no se puede
     * cocinar 1,3 canelones, y redondear inventaría comida que nadie pidió.
     */
    // La merma es para las ollas de los packs, donde se reparte a ojo. Un
    // individual se pesa y se empaca: "si son 250 poner 250" (Gina). Y los
    // gramos se redondean siempre hacia arriba.
    const cantidadACocinar = (item) => cuantoCocinar(item);

    const getKitchenPackingInstruction = (item) => {
        const pGrams = item.portionGrams;
        // Lo que hay que APARTAR es lo de los individuales, no el total: el resto
        // va a las ollas de los packs. Con el total, el pollo al pesto decia
        // "empacar 2 porciones de 250g" cuando solo UNA es de individual.
        const qty = parteDeIndividuales(item) || item.totalQty;

        if (pGrams && pGrams > 0) {
            const numTazas = Math.round(qty / pGrams);
            if (numTazas > 1) {
                return `Para INDIVIDUALES: apartar ${numTazas} porciones de ${pGrams}g`;
            }
            return `Para INDIVIDUALES: apartar 1 porción de ${pGrams}g`;
        }

        if (item.unit === 'kg') {
            return `Para INDIVIDUALES: apartar ${qty} kg en contenedor`;
        }
        if (item.unit === 'taza(s)') {
            return `Para INDIVIDUALES: apartar ${qty} taza(s)`;
        }
        if (item.unit === 'unidades') {
            if (qty > 1) return `Para INDIVIDUALES: apartar ${qty} unidades`;
            return 'Empacar 1 unidad por porción';
        }

        const name = String(item.name || '').toLowerCase();
        if (name.includes('molde') || name.includes('canelones')) {
            return 'Empacar entero en molde';
        }
        if (name.includes('burrito') || name.includes('omelet') || name.includes('pinto') || name.includes('pancake')) {
            return 'Empacar porción individual de desayuno';
        }
        return 'Empacar porción individual';
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
    const { bulkItems, missingMenus, avisosDeUnion } = getAllKitchenItems();

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

    /**
     * Reparte de una vez lo que está en blanco, según lo que hace cada quien.
     *
     * Lo ya escrito a mano no se toca: si alguien puso otro nombre fue porque
     * ese día se repartió distinto, y la máquina no tiene por qué corregirlo.
     */
    const handleRepartirAuto = () => {
        const platillos = bulkItems.map(item => ({
            name: item.name,
            tipo: TIPO_POR_CATEGORIA[item.category]
        }));
        const { asignaciones, nuevas, sinAsignar } = repartirPlatillos(platillos, kitchenAssignments);
        setKitchenAssignments(prev => ({ ...prev, ...asignaciones }));
        setResumenReparto({ nuevas, sinAsignar });
    };

    /**
     * Junta los renglones marcados en uno solo.
     *
     * El emparejador automático solo une lo que puede probar. Cuando un nombre
     * calza con varios —"Carne mechada en salsa" contra "de res en salsa" y
     * "en salsa criolla"— no une ninguno, porque elegir mal sería peor. Acá lo
     * decide quien cocina, que es quien sabe si es la misma olla.
     */
    const handleJuntarSeleccionados = () => {
        if (selectedKitchenItems.length < 2) return;
        const nuevas = agregarUnion(unionesDePlatos, selectedKitchenItems);
        setUnionesDePlatos(nuevas);
        guardarUniones(nuevas);
        setSelectedKitchenItems([]);
    };

    const handleDeshacerUnion = (nombre) => {
        const nuevas = quitarUnion(unionesDePlatos, nombre);
        setUnionesDePlatos(nuevas);
        guardarUniones(nuevas);
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
                                Dale a <b>Repartir automáticamente</b> y se llenan solas según lo que hace cada quien.
                                Lo que ya escribiste a mano no se toca.
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-blue-900">
                                {COCINERAS.map(c => (
                                    <span key={c.id}><b>{c.nombre}</b>: {c.hace}</span>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                            <button
                                onClick={handleRepartirAuto}
                                className="bg-green-700 hover:bg-green-800 text-white font-bold text-sm px-4 py-2 rounded shadow transition-colors"
                            >
                                Repartir automáticamente
                            </button>
                            <button
                                onClick={() => { setKitchenAssignments({}); setResumenReparto(null); }}
                                className="text-xs text-gray-600 underline hover:text-gray-900"
                            >
                                Borrar todo
                            </button>
                        </div>

                        {selectedKitchenItems.length > 0 && (
                            <div className="flex items-center gap-2 bg-yellow-100 p-2.5 rounded border border-yellow-300 shadow-sm animate-fade-in">
                                <span className="font-bold text-xs text-yellow-900 whitespace-nowrap">
                                    {selectedKitchenItems.length} seleccionados:
                                </span>
                                <input
                                    type="text"
                                    placeholder="Nombre Cocinera"
                                    list="lista-cocineras"
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
                                {selectedKitchenItems.length >= 2 && (
                                    <button
                                        onClick={handleJuntarSeleccionados}
                                        className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3 py-1 rounded transition-colors"
                                        title="Marcar que son el mismo plato: se cocinan en una sola olla"
                                    >
                                        Es el mismo plato
                                    </button>
                                )}
                                <button
                                    onClick={() => setSelectedKitchenItems([])}
                                    className="text-gray-500 hover:text-gray-700 text-xs underline ml-1"
                                >
                                    Limpiar
                                </button>
                            </div>
                        )}
                    </div>

                    {unionesDePlatos.length > 0 && (
                        <div className="mb-5 p-3 rounded border bg-purple-50 border-purple-300 text-sm">
                            <b className="text-purple-900">Platos que marcaste como el mismo</b>
                            <p className="text-xs text-purple-800 mt-0.5">
                                Se cocinan en un solo renglón. Queda guardado para las próximas semanas.
                            </p>
                            <ul className="mt-2 space-y-1">
                                {unionesDePlatos.map((grupo, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <button
                                            onClick={() => handleDeshacerUnion(grupo[0])}
                                            className="text-[11px] text-purple-700 underline hover:text-purple-900 flex-shrink-0"
                                        >
                                            separar
                                        </button>
                                        <span className="text-purple-900">{grupo.join('  =  ')}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {resumenReparto && (
                        <div className="mb-5 p-3 rounded border bg-green-50 border-green-300 text-sm">
                            <b className="text-green-900">
                                {resumenReparto.nuevas === 0
                                    ? 'No quedaba nada en blanco.'
                                    : `Se repartieron ${resumenReparto.nuevas} platillos.`}
                            </b>
                            {resumenReparto.sinAsignar.length > 0 && (
                                <div className="mt-2 text-amber-900">
                                    Estos quedaron sin dueño, hay que ponerlos a mano:
                                    <ul className="list-disc ml-6 mt-1">
                                        {resumenReparto.sinAsignar.map(x => (
                                            <li key={x.nombre}><b>{x.nombre}</b> — {x.motivo}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <datalist id="lista-cocineras">
                        {COCINERAS.map(c => <option key={c.id} value={c.nombre} />)}
                    </datalist>

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
                                                list="lista-cocineras"
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
                                                const sugerencia = sugerirCocinera(item.name, TIPO_POR_CATEGORIA[item.category]);

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
                                                            <div className="overflow-hidden">
                                                                <span className="font-semibold text-gray-800 truncate block" title={item.name}>
                                                                    {item.name}
                                                                </span>
                                                                {!currentCook && (
                                                                    <span className={`text-[10px] ${sugerencia.cocinera ? 'text-green-700' : 'text-amber-700'}`}>
                                                                        {sugerencia.cocinera ? `sugerido: ${sugerencia.cocinera}` : sugerencia.motivo}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            placeholder="Cocinera"
                                                            list="lista-cocineras"
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
                        <span>🥘 PRODUCCIÓN DEL DÍA — TODO LO QUE HAY QUE COCINAR (los packs con 30% de merma; los individuales van exactos)</span>
                        <span className="text-xs font-normal bg-gray-800 px-3 py-1 rounded">Lo marcado COCINA se empaca ahí mismo; el resto baja a Empaque</span>
                    </div>

                    {errorDeAjuste && (
                        <div className="border-2 border-red-600 bg-red-50 text-red-900 p-3 text-sm font-bold print:hidden">
                            {errorDeAjuste}
                        </div>
                    )}

                    <div className="space-y-8 mt-4">
                        {cookNames.map(cook => {
                            const items = groupedByCook[cook];
                            if (items.length === 0) return null;

                            return (
                                <div key={cook} className="break-inside-avoid print:break-inside-avoid">
                                    <table className="w-full text-sm border-collapse border-2 border-black mb-2">
                                        <thead>
                                            <tr>
                                                <th colSpan="4" className="border-2 border-black p-2.5 font-bold text-center text-xl uppercase tracking-widest bg-gray-100 text-gray-900">
                                                    {cook}
                                                </th>
                                            </tr>
                                            <tr className="bg-gray-200 text-gray-800 text-xs uppercase font-bold">
                                                <th className="border border-black p-2 text-left w-2/5">Ingrediente / Platillo</th>
                                                <th className="border border-black p-2 text-center w-[15%]">Cantidad a cocinar</th>
                                                <th className="border border-black p-2 text-center w-[15%]">¿Quién empaca?</th>
                                                <th className="border border-black p-2 text-left w-[30%]">Nota de Empaque en Cocina</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {agruparArroces(aplicarAjustes(items, ajustesCocina), cantidadACocinar).map((fila, idx) => {
                                                // El arroz se cocina TODO JUNTO: va el total y debajo
                                                // en cuanto hay que dividirlo.
                                                if (fila.tipo === 'grupo') {
                                                    return (
                                                        <tr key={`arroz-${idx}`} className="border-b border-black bg-gray-900 text-white">
                                                            <td className="border-r border-black p-2.5 font-bold uppercase tracking-wide">
                                                                {fila.nombre}
                                                            </td>
                                                            <td className="border-r border-black p-2.5 text-center font-extrabold text-lg">
                                                                {fila.total} {fila.unit === 'g' ? 'g' : fila.unit.toUpperCase()}
                                                            </td>
                                                            <td className="border-r border-black p-2.5 text-center text-[11px] font-semibold uppercase">Cocina</td>
                                                            <td className="p-2.5 text-left text-xs font-bold">
                                                                Una sola olla. Dividir en los {fila.cuantos} arroces de abajo.
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                const item = fila.item;
                                                const esHijo = fila.tipo === 'hijo';
                                                const hasNotes = item.kitchenNotes && item.kitchenNotes.length > 0;
                                                // Lo que empaca cocina va marcado: si se confunde con lo
                                                // que baja a Empaque, se empaca dos veces o ninguna.
                                                const empacaCocina = !!item.empacaCocina;
                                                return (
                                                    <tr key={idx} className={`border-b border-black last:border-b-0 ${empacaCocina ? 'bg-[#fffbe6]' : 'bg-white'}`}>
                                                        <td className={`border-r border-black p-2.5 font-bold text-gray-900 ${esHijo ? 'pl-8' : ''}`}>
                                                            {esHijo && <span className="text-gray-400 mr-1">└</span>}
                                                            {item.name}
                                                            {item.esMolde && (
                                                                <span className="ml-2 text-[10px] font-bold text-gray-600">(molde / se arma entero)</span>
                                                            )}
                                                        </td>
                                                        <td className={`border-r border-black p-2.5 text-center font-extrabold text-lg text-gray-900 ${item.ajustado ? 'bg-sky-50' : ''}`}>
                                                            {/* Gina corrige el numero aca mismo cuando el calculo se
                                                                equivoca. Se guarda para esta fecha y manda sobre el calculo. */}
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                className="w-20 text-center font-extrabold text-lg bg-transparent border-b border-dashed border-gray-400 focus:border-solid focus:border-sky-600 focus:outline-none print:border-none"
                                                                value={cantidadFinal(item, cantidadACocinar(item))}
                                                                onChange={(e) => {
                                                                    const v = e.target.value;
                                                                    guardarAjuste(item.name, item.unit, {
                                                                        cantidad: v === '' ? null : Number(v)
                                                                    });
                                                                }}
                                                                aria-label={`Cantidad a cocinar de ${item.name}`}
                                                            />{' '}
                                                            {item.unit === 'g' ? 'g' : item.unit.toUpperCase()}
                                                            {item.ajustado && (
                                                                <span className="block text-[9px] font-bold text-sky-700 uppercase print:hidden">corregido a mano</span>
                                                            )}
                                                            {item.unit === 'unidades' && (
                                                                <span className="block text-[9px] font-normal text-gray-500">sin merma</span>
                                                            )}
                                                        </td>
                                                        <td className="border-r border-black p-2.5 text-center">
                                                            {empacaCocina ? (
                                                                <span className="inline-block bg-black text-white text-[10px] font-bold px-2 py-1 rounded uppercase">
                                                                    Cocina
                                                                </span>
                                                            ) : (
                                                                <span className="text-gray-500 text-[11px] font-semibold uppercase">Empaque</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2.5 text-left text-xs font-bold text-amber-900 bg-amber-50">
                                                            {/* La nota tambien se puede corregir: es la instruccion de
                                                                empaque y a veces el calculo la escribe mal. */}
                                                            <textarea
                                                                rows={2}
                                                                className="w-full bg-transparent text-xs font-bold text-amber-900 resize-none border-b border-dashed border-amber-300 focus:border-solid focus:border-sky-600 focus:outline-none print:border-none"
                                                                value={item.notaAjustada ?? (
                                                                    empacaCocina ? `👉 ${getKitchenPackingInstruction(item)}`
                                                                        : hasNotes ? item.kitchenNotes.join(' | ')
                                                                        : ''
                                                                )}
                                                                placeholder="Olla a granel (Packs)"
                                                                onChange={(e) => guardarAjuste(item.name, item.unit, { nota: e.target.value })}
                                                                aria-label={`Nota de empaque de ${item.name}`}
                                                            />
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

                {avisosDeUnion.length > 0 && (
                    <div className="mt-8 p-4 border-2 border-amber-500 bg-amber-50 rounded print:break-inside-avoid">
                        <b className="text-amber-900">Revisar antes de cocinar</b>
                        <p className="text-sm text-amber-900 mt-1">
                            Estos platos calzaban con más de un renglón, así que se dejaron
                            aparte en vez de adivinar. Si son el mismo, hay que juntarlos a mano:
                        </p>
                        <ul className="list-disc ml-6 mt-2 text-sm text-amber-900">
                            {avisosDeUnion.map((a, i) => (
                                <li key={i}><b>{a.nombre}</b> — calza con: {a.calzaCon.join(', ')}</li>
                            ))}
                        </ul>
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

    const handleExportToExcel = async () => {
        try {
            if (typeof window !== 'undefined' && !window.Buffer) {
                // Ensuring Uint8Array fallback if Buffer is missing in browser
                window.Buffer = window.Buffer || Uint8Array;
            }

            const wb = new ExcelJS.Workbook();
            wb.creator = 'BiKitchen System';
            wb.lastModifiedBy = 'BiKitchen System';
            wb.created = new Date();

            const thinBorder = {
                top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
                right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
            };
            const sanitizeNote = (obs) => {
                if (!obs) return '';
                const cleaned = String(obs)
                    .replace(/^Incluye:.*$/i, '')
                    .replace(/Incluye:[^|]*/gi, '')
                    .replace(/\b\d{2,3}[\.,]?\d{3}\b/g, '')
                    .replace(/\b(colones|crc|¢|₡|\$)\b/gi, '')
                    .replace(/^\s*[-—*|]+\s*/, '')
                    .replace(/\s*—\s*$/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();

                const parts = cleaned.split(/\s*[\·\|—]\s*/).map(p => p.trim()).filter(Boolean);
                const uniqueParts = [];
                parts.forEach(p => {
                    const lower = p.toLowerCase();
                    if (!uniqueParts.some(u => u.toLowerCase() === lower)) {
                        uniqueParts.push(p);
                    }
                });
                return uniqueParts.join(' · ');
            };

            // ═════════════════════════════════════════════════════════════════
            // PESTAÑAS EN EL FORMATO DE GINA
            //
            // Ella arma su archivo a mano con una pestaña por familia de pack y
            // los dos menús del día uno al lado del otro. Se respeta ese formato
            // para que lo entienda de una y pueda editarlo si algo cambia.
            // ═════════════════════════════════════════════════════════════════

            /** "MIERCOLES 26 AGOSTO", tal como titula ella sus pestañas. */
            const etiquetaDia = (() => {
                if (!date) return 'PRODUCCION';
                const d = new Date(`${date}T12:00:00`);
                if (Number.isNaN(d.getTime())) return String(date);
                const dias = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
                const meses = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
                    'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
                return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
            })();

            /** Nombre y zona; y la semana cuando el pack tiene varias entregas. */
            const etiquetaDeCliente = (c) => {
                const zona = c.zona_envio || '';
                const zonaStr = zona && zona !== 'No especificada' && zona.toLowerCase() !== 'recoge en tienda'
                    ? `, ${zona}` : '';
                if (c.rawPedido) {
                    const schedule = getScheduleFromOrder(c.rawPedido);
                    const idx = schedule.indexOf(date);
                    if (schedule.length > 1 && idx !== -1) {
                        return `${c.nombre} (${c.cantidad}) (Semana ${idx + 1})${zonaStr}`;
                    }
                }
                return `${c.nombre} (${c.cantidad})${zonaStr}`;
            };

            // TWO PACK va de primero: es lo que decide cuantos packs se empacan.
            // Mismas etiquetas que la pantalla: si el Excel armara su propia lista,
            // volveria a callarse cosas —antes no decia que el cliente llevaba
            // desayunos— y nadie se daria cuenta hasta que faltara en la bolsa.
            const notasDeCliente = (c, packName) => [
                ...etiquetasDeEmpaque(c, {
                    esTwoPack: detectIsTwoPack(c.rawPedido || c),
                    otrosPacks: getOtherPacksTag(c.nombre, packName)
                }),
                sanitizeNote(sinSustituciones(c.observaciones))
            ].filter(Boolean).join(' | ');

            /** Los platos del pack con el gramaje ya resuelto. */
            const platosDelPack = (packName, packData) => {
                const rawPlatos = resolvePlatosForPack(packName, packData);
                const base = rawPlatos.length > 0 ? rawPlatos : (packData.platosBase || []);
                const gramosPack = getDefaultGrams(packName);
                const porcion = porcionesDelPack(packName);

                return base.map((p, idx) => {
                    const original = (packData.platosBase || [])[idx] || {};
                    // El menú oficial guarda los platos como texto; los del pedido, como objetos
                    const esOficial = typeof p.proteina === 'string';
                    return {
                        numero: p.numero || idx + 1,
                        vecesPorPack: Number(p.vecesPorPack || original.vecesPorPack) > 0
                            ? Number(p.vecesPorPack || original.vecesPorPack)
                            : 1,
                        proteina: {
                            nombre: esOficial ? p.proteina : (p.proteina?.nombre || original.proteina?.nombre || '—'),
                            // En un familiar el plato es una bandeja entera: el numero
                            // por persona no significa nada y confunde a quien empaca.
                            gramosPorPorcion: porcion.textoPorcion ? null
                                : (esOficial ? gramosPack
                                    : (p.proteina?.gramosPorPorcion || original.proteina?.gramosPorPorcion || gramosPack))
                        },
                        vegetal: {
                            nombre: esOficial ? p.vegetal : (p.vegetal?.nombre || original.vegetal?.nombre || '—'),
                            cantidadPorPorcion: esOficial ? porcion.vegetal
                                : (p.vegetal?.cantidadPorPorcion || original.vegetal?.cantidadPorPorcion || porcion.vegetal)
                        },
                        carbo: {
                            nombre: esOficial ? p.carbo : (p.carbo?.nombre || original.carbo?.nombre || '—'),
                            cantidadPorPorcion: esOficial ? porcion.carbo
                                : (p.carbo?.cantidadPorPorcion || original.carbo?.cantidadPorPorcion || porcion.carbo)
                        }
                    };
                });
            };

            /** Un bloque de menú listo para escribirse en la pestaña. */
            const bloqueDeMenu = (packName, packData, numero) => {
                if (!packData) return null;
                const menuKey = packData.menuKey || mapPackNameToMenuKey(packName);
                // Keto y Sin Carbos no llevan harina: su bloque es de dos filas por plato
                const platos = platosDelPack(packName, packData);
                const llevaCarbo = llevaFilaDeCarbo(platos, menuKey);
                // El Paquete Deluxe son platos completos para 4 personas y no
                // llevan vegetal aparte: la fila salia en blanco.
                const llevaVegetal = llevaFilaDeVegetal(platos);

                // Un pack familiar no se mide en gramos por persona: el plato es una
                // bandeja entera. "es por kg o 4 tazas la porcion" — Gina.
                const porcionDelPack = porcionesDelPack(packName);
                const aviso = avisoDeFamilia(packName);
                const porciones = porcionDelPack.textoPorcion
                    ? [porcionDelPack.textoPorcion]
                    : [`${platos[0]?.proteina?.gramosPorPorcion || getDefaultGrams(packName)} GRAMOS DE PROTEINA`];
                if (llevaVegetal) porciones.push(`${platos[0]?.vegetal?.cantidadPorPorcion ?? porcionDelPack.vegetal} TAZA(S) DE VEGETALES`);
                if (llevaCarbo) porciones.push(`${platos[0]?.carbo?.cantidadPorPorcion ?? porcionDelPack.carbo} TAZA(S) DE HARINA`);

                return {
                    // "Menú #2" ya dice que es la cena: repetir el prefijo sobra
                    titulo: `Menú #${numero} ${packName.replace(/^CENAS\s*-\s*/i, '')}`,
                    porciones,
                    platos,
                    llevaCarbo,
                    llevaVegetal,
                    // "KETO — SE COCINA APARTE". Va en su propia linea y no como una
                    // "CANTIDAD POR PLATO", que no es.
                    aviso,
                    // Como se nombra la porcion cuando el plato no se mide en gramos
                    // por persona (bandejas familiares). Lo usa el Resumen por Menu.
                    porcionPlato: porcionDelPack.porcionCorta || null,
                    totalPlatos: packData.totalPacks || 0,
                    clientes: (packData.clientes || []).map(c => ({
                        etiqueta: etiquetaDeCliente(c),
                        notas: notasDeCliente(c, packName)
                    }))
                };
            };

            // Cada familia es una pestaña: el menú de almuerzo y, al lado, el de cena
            const nombresDeAlmuerzo = regularPackNames.filter(n => !n.startsWith('CENAS -'));
            const familias = nombresDeAlmuerzo.map(packName => ({
                titulo: packName,
                menu1: bloqueDeMenu(packName, consolidatedPacksMap[packName], 1),
                menu2: consolidatedPacksMap[`CENAS - ${packName}`]
                    ? bloqueDeMenu(`CENAS - ${packName}`, consolidatedPacksMap[`CENAS - ${packName}`], 2)
                    : null
            }));

            // Cenas de una familia que ese día no lleva almuerzos: van en su propia pestaña
            regularPackNames.filter(n => n.startsWith('CENAS -')).forEach(nombreCena => {
                const base = nombreCena.replace(/^CENAS\s*-\s*/i, '');
                if (nombresDeAlmuerzo.includes(base)) return;
                familias.push({
                    titulo: nombreCena,
                    menu1: bloqueDeMenu(nombreCena, consolidatedPacksMap[nombreCena], 2),
                    menu2: null
                });
            });

            // ── Desayunos ──
            // UN bloque por menú de desayunos. Puede haber más de uno el mismo
            // día: quien lleva el de la semana y quien lleva el de otra —a Fátima
            // Arauz se le repusieron los del menú del 25 al 31 de agosto—. Antes
            // era un solo bloque y su nombre salía junto a desayunos ajenos.
            const desayunos = [];
            allPackNames.filter(n => isDesayunoPack(n)).forEach(packName => {
                const packData = packsMap[packName];
                if (!packData?.clientes?.length) return;
                desayunos.push({
                    // El pack genérico no necesita título; un personalizado sí, o
                    // no se sabe de quién son esos desayunos.
                    titulo: esPersonalizado(packName) ? packName : '',
                    totalPlatos: packData.totalPacks || 0,
                    platos: platosDelPack(packName, packData),
                    clientes: packData.clientes.map(c => ({
                        etiqueta: etiquetaDeCliente(c),
                        notas: notasDeCliente(c, packName)
                    }))
                });
            });

            // ── Individuales ──
            // La MISMA funcion que usa la tabla de la pantalla. Estaban escritas
            // dos veces, palabra por palabra, y fue asi como se separaron: la de
            // arriba dejo de leer la medida escrita y las dos salidas de la misma
            // hoja empezaron a decir gramajes distintos.
            const formatoCantidad = (nombre, cuenta, gramos) =>
                textoDeCantidad(nombre, '', cuenta, gramos);

            const individuales = [];
            allPackNames.filter(n => isActuallyIndividual(n) && !isDesayunoPack(n)).forEach(packName => {
                const packData = packsMap[packName];
                if (!packData?.clientes) return;

                packData.clientes.forEach(c => {
                    const etiqueta = etiquetaDeCliente(c);
                    let entrada = individuales.find(i => i.cliente === etiqueta);
                    if (!entrada) {
                        entrada = { cliente: etiqueta, notas: '', lineas: [] };
                        individuales.push(entrada);
                    }
                    // La nota va una sola vez, junto al nombre, como en la hoja impresa
                    const notas = notasDeCliente(c, packName);
                    if (notas && !entrada.notas.includes(notas)) {
                        entrada.notas = entrada.notas ? `${entrada.notas} · ${notas}` : notas;
                    }

                    if (c.platos && c.platos.length > 0) {
                        c.platos.forEach(p => {
                            const nombre = p.proteina?.nombre || packName;

                            // La etiqueta del plan ("Individuales", "Semanal") no es una
                            // porción: solo sirve si trae un número ("8 porciones",
                            // "2 tazas"). Si no, ensucia el nombre y ocupa la columna
                            // de cantidad con una palabra que no dice cuánto va.
                            const etiqueta = String(p.descripcion || '').trim();
                            const etiquetaUtil = /\d/.test(etiqueta) ? etiqueta : '';
                            const desc = nombre;
                            // Cuando el producto no se mide en gramos, parseQuantityAndUnit
                            // adivina "tazas" y a un pastel le ponía "1 taza". La etiqueta
                            // del propio producto ("8 porciones") es el dato de verdad.
                            const veces = p.cantidad || c.cantidad || 1;
                            const gramos = p.proteina?.gramosPorPorcion;
                            // La medida escrita en el pedido manda sobre todo: es la que Gina
                            // anotó y la que se cocina. Solo si no viene se recurre a la
                            // etiqueta del producto o al cálculo.
                            const cantidad = p.medida
                                ? (veces > 1 ? `${veces} × ${p.medida}` : p.medida)
                                : (!gramos && etiquetaUtil)
                                ? (veces > 1 ? `${veces} × ${etiquetaUtil}` : etiquetaUtil)
                                : formatoCantidad(nombre, veces, gramos);

                            entrada.lineas.push({ desc, cantidad, notas });
                        });
                    } else {
                        entrada.lineas.push({
                            desc: packName,
                            cantidad: formatoCantidad(packName, c.cantidad || 1, null)
                        });
                    }
                });
            });

            // ── Entregas del día ──
            const entregas = cleanOrders
                .map(o => ({
                    cliente: o.cliente,
                    zona: o.zona_envio,
                    paquete: o.plan || o.tipoMenu,
                    // Sin teléfonos ni notas de control: esta lista se usa para despachar
                    cambios: notaParaEmpaque(sanitizeNote(o.observaciones))
                }))
                .sort((a, b) => String(a.cliente || '').localeCompare(String(b.cliente || '')));

            agregarHojasGina(wb, { etiquetaDia, entregas, familias, desayunos, individuales });

            // ═════════════════════════════════════════════════════════════════
            // PESTAÑA EXTRA: HOJA DE COCINA (los totales a cocinar)
            // ═════════════════════════════════════════════════════════════════
            const wsCocina = wb.addWorksheet('Hoja Cocina', {
                views: [{ showGridLines: true }],
                pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
            });

            wsCocina.columns = [
                { width: 45 }, // A: Ingrediente / Platillo
                { width: 28 }, // B: Cantidad Total
                { width: 15 }, // C: Unidad
                { width: 65 }  // D: Nota de Empaque en Cocina
            ];

            wsCocina.mergeCells('A1:D1');
            const titleCellCocina = wsCocina.getCell('A1');
            titleCellCocina.value = `HOJA DE COCINA - ${date || ''}`;
            titleCellCocina.font = { name: 'Calibri', size: 16, bold: true };
            titleCellCocina.alignment = { horizontal: 'center', vertical: 'middle' };
            wsCocina.getRow(1).height = 32;

            wsCocina.mergeCells('A3:D3');
            const subCocinaHeader = wsCocina.getCell('A3');
            subCocinaHeader.value = '1. PRODUCCIÓN A GRANEL PARA PACKS E INDIVIDUALES (OLLAS - CANTIDADES CON 30% DE MERMA INCLUIDO)';
            subCocinaHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
            subCocinaHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            subCocinaHeader.alignment = { horizontal: 'center', vertical: 'middle' };
            wsCocina.getRow(3).height = 24;

            let cRowIdx = 5;

            const groupedByCook = {};
            bulkItems.forEach(item => {
                const cookName = kitchenAssignments[item.name]?.trim() || 'SIN ASIGNAR';
                if (!groupedByCook[cookName]) groupedByCook[cookName] = [];
                groupedByCook[cookName].push(item);
            });

            const cookKeys = Object.keys(groupedByCook).sort((a, b) => {
                if (a === 'SIN ASIGNAR') return 1;
                if (b === 'SIN ASIGNAR') return -1;
                return a.localeCompare(b);
            });

            cookKeys.forEach((cook, cookIdx) => {
                const items = groupedByCook[cook];
                if (items.length === 0) return;

                if (cookIdx > 0 && cRowIdx > 5) {
                    wsCocina.getRow(cRowIdx - 1).pageBreak = true;
                }

                wsCocina.mergeCells(`A${cRowIdx}:D${cRowIdx}`);
                const cookCell = wsCocina.getCell(`A${cRowIdx}`);
                cookCell.value = `COCINERA: ${cook.toUpperCase()}`;
                cookCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
                cookCell.font = { name: 'Calibri', size: 12, bold: true };
                wsCocina.getRow(cRowIdx).height = 24;
                cRowIdx++;

                const cHeaders = ['Ingrediente / Platillo', 'Cantidad a cocinar (+30% merma)', 'Unidad', 'Nota de Empaque en Cocina'];
                const cHeaderRow = wsCocina.getRow(cRowIdx);
                cHeaderRow.height = 22;
                cHeaders.forEach((h, colI) => {
                    const cell = cHeaderRow.getCell(colI + 1);
                    cell.value = h;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF374151' } };
                    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    cell.border = thinBorder;
                });
                cRowIdx++;

                items.forEach(item => {
                    const hasNotes = item.kitchenNotes && item.kitchenNotes.length > 0;
                    // Igual que en pantalla: quien lea el Excel tiene que ver lo
                    // mismo que quien lea la hoja impresa.
                    const noteStr = item.empacaCocina
                        ? `COCINA EMPACA → ${getKitchenPackingInstruction(item)}`
                        : (hasNotes ? item.kitchenNotes.join(' | ') : '');

                    const row = wsCocina.getRow(cRowIdx);
                    const estimatedLines = Math.max(1, Math.ceil(noteStr.length / 55));
                    row.height = Math.max(22, estimatedLines * 16);

                    row.getCell(1).value = item.name;
                    row.getCell(2).value = cantidadACocinar(item);
                    row.getCell(3).value = item.unit === 'g' ? 'g' : item.unit.toUpperCase();
                    row.getCell(4).value = noteStr;

                    for (let c = 1; c <= 4; c++) {
                        const cell = row.getCell(c);
                        cell.border = thinBorder;
                        cell.font = { name: 'Calibri', size: 10 };
                        if (c === 2 || c === 3) cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        if (c === 2) cell.font = { name: 'Calibri', size: 10, bold: true };
                        if (c === 4) {
                            cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                            if (noteStr) cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF78350F' } };
                        }
                    }
                    cRowIdx++;
                });

                cRowIdx += 2; // Blank spacing
            });


            // ═════════════════════════════════════════════════════════════════
            // PESTAÑA EXTRA: RESUMEN DE PEDIDOS
            // ═════════════════════════════════════════════════════════════════
            const wsResumen = wb.addWorksheet('Resumen Pedidos', {
                views: [{ showGridLines: true }]
            });

            wsResumen.columns = [
                { width: 22 }, // A: # Orden
                { width: 32 }, // B: Cliente
                { width: 16 }, // C: Teléfono
                { width: 36 }, // D: Zona
                { width: 45 }, // E: Plan
                { width: 40 }, // F: Fechas
                { width: 60 }, // G: Observaciones
                { width: 16 }  // H: Estado
            ];

            wsResumen.mergeCells('A1:H1');
            const resTitle = wsResumen.getCell('A1');
            resTitle.value = `RESUMEN GENERAL DE PEDIDOS (${date || ''})`;
            resTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            resTitle.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
            resTitle.alignment = { horizontal: 'center', vertical: 'middle' };
            wsResumen.getRow(1).height = 32;

            let rRowIdx = 3;
            const rHeaders = ['# Órden', 'Cliente', 'Teléfono', 'Zona de Envío', 'Plan / Menú', 'Entregas Programadas', 'Observaciones / Cambios', 'Estado'];
            const rHeaderRow = wsResumen.getRow(rRowIdx);
            rHeaderRow.height = 24;
            rHeaders.forEach((h, colI) => {
                const cell = rHeaderRow.getCell(colI + 1);
                cell.value = h;
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
                cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = thinBorder;
            });
            rRowIdx++;

            orders.forEach((o, index) => {
                const sch = getScheduleFromOrder(o);
                const datesStr = Array.isArray(sch) && sch.length > 0 ? sch.join(', ') : (o.fecha_entrega || '—');
                const row = wsResumen.getRow(rRowIdx);
                row.height = 24;

                const orderNum = o.numeroOrden || (o.id ? (o.id.startsWith('ORD-') ? o.id : `#${o.id}`) : '—');
                const rawStatus = (o.status || 'Confirmado').toLowerCase();
                const statusText = rawStatus.includes('entregad') ? 'Entregado' : (rawStatus.includes('cancel') ? 'Cancelado' : 'Confirmado');

                row.getCell(1).value = orderNum;
                row.getCell(2).value = o.cliente || o.nombre || '—';
                row.getCell(3).value = o.telefono || '—';
                row.getCell(4).value = o.zona_envio || o.zona || '—';
                row.getCell(5).value = o.tipoMenu || o.plan || '—';
                row.getCell(6).value = datesStr;
                row.getCell(7).value = o.observaciones || o.cambios || '—';
                row.getCell(8).value = statusText;

                // Alternating row colors for executive clarity
                const isEven = index % 2 === 0;
                const rowFill = isEven
                    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
                    : { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };

                for (let c = 1; c <= 8; c++) {
                    const cell = row.getCell(c);
                    cell.border = thinBorder;
                    cell.fill = rowFill;
                    cell.font = { name: 'Calibri', size: 10 };

                    if (c === 1 || c === 3) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                    } else if (c === 8) {
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.font = { name: 'Calibri', size: 10, bold: true };
                        if (statusText === 'Entregado' || statusText === 'Confirmado') {
                            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2F0D9' } };
                        }
                    } else {
                        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
                    }
                }
                rRowIdx++;
            });

            // Trigger Download using Uint8Array buffer to be 100% compatible with browser
            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Tabla para resumenes ${etiquetaDia}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error al generar el Excel:', err);
            alert('Error al generar el archivo Excel: ' + err.message);
        }
    };

    return (
        <div className="bg-white text-black min-h-screen p-4 text-xs font-sans print:m-0 print:p-0">
            {/* Ocultar en impresión pero dar info en pantalla */}
            <div className="mb-4 print:hidden text-center">
                <h1 className="text-2xl font-bold text-gray-800">Vista de Producción para: {date}</h1>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 mb-3">
                    <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {viewMode === 'empaque' && 'Mostrando solo Hoja de Empaque'}
                        {viewMode === 'cocina' && 'Mostrando solo Hoja de Cocina'}
                    </div>
                </div>

                <RevisionHoja revision={revisarHoja(cleanOrders, officialMenus, date)} fusionados={fusionados} />

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
                        📊 Descargar Excel (formato de Gina)
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

                            const isCenaSheet = packName.startsWith('CENAS -');
                            const basePackName = isCenaSheet ? packName.replace(/^CENAS\s*-\s*/i, '') : packName;
                            const menuKey = packData.menuKey || mapPackNameToMenuKey(basePackName);
                            const rawPlatos = resolvePlatosForPack(packName, packData);

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

                            const porcion = porcionesDelPack(packName);
                            const platosEmpaque = effectivePlatos.map((p, idx) => {
                                const original = packData.platosBase[idx] || {};
                                const isOfficial = typeof p.proteina === 'string';
                                return {
                                    numero: p.numero || idx + 1,
                                    vecesPorPack: Number(p.vecesPorPack || original.vecesPorPack) > 0
                                        ? Number(p.vecesPorPack || original.vecesPorPack)
                                        : 1,
                                    proteina: {
                                        nombre: isOfficial ? p.proteina : (p.proteina?.nombre || original.proteina?.nombre || '—'),
                                        gramosPorPorcion: porcion.textoPorcion ? null
                                            : (isOfficial ? getDefaultGrams(packName) : (p.proteina?.gramosPorPorcion || original.proteina?.gramosPorPorcion || getDefaultGrams(packName)))
                                    },
                                    vegetal: {
                                        nombre: isOfficial ? p.vegetal : (p.vegetal?.nombre || original.vegetal?.nombre || '—'),
                                        cantidadPorPorcion: isOfficial ? porcion.vegetal : (p.vegetal?.cantidadPorPorcion || original.vegetal?.cantidadPorPorcion || porcion.vegetal)
                                    },
                                    carbo: {
                                        nombre: isOfficial ? p.carbo : (p.carbo?.nombre || original.carbo?.nombre || '—'),
                                        cantidadPorPorcion: isOfficial ? porcion.carbo : (p.carbo?.cantidadPorPorcion || original.carbo?.cantidadPorPorcion || porcion.carbo)
                                    }
                                };
                            });

                            const showCarbos = llevaFilaDeCarbo(platosEmpaque, menuKey);
                            const showVegetales = llevaFilaDeVegetal(platosEmpaque);
                            const rowsPerPlate = 1 + (showVegetales ? 1 : 0) + (showCarbos ? 1 : 0);

                            return (
                                <div key={`empaque-${packName}`} className="pack-table-container mb-12 print:mb-0 print:break-after-page print:[page-break-after:always] break-inside-avoid print:break-inside-avoid">
                                    {/* ESTILO EXCEL */}
                                    <div className="w-full">
                                        {/* Cabecera Tipo Excel (Amarillo) */}
                                        <div className="bg-yellow-400 text-black font-bold text-lg p-1.5 print:py-1 print:text-base border border-black text-center uppercase tracking-wide">
                                            {packName.replace(/\s*\d{1,3}(?:[.,]\d{3})*\s*(?:colones|col|¢)/i, '')} <span className="text-gray-800 text-base print:text-sm">({packData.totalPacks} Packs)</span>
                                            {/* "Ojala en la hoja especifique que es keto porque se cocina
                                                aparte, igual cuando es vegetariano" — Gina. */}
                                            {avisoDeFamilia(packName) && (
                                                <div className="mt-1 bg-black text-white text-sm print:text-xs font-bold tracking-wide py-0.5">
                                                    {avisoDeFamilia(packName)}
                                                </div>
                                            )}
                                        </div>

                                        {/* CANTIDAD POR PLATO (Estilo Excel) */}
                                        <div className="border-x border-black bg-white flex flex-col text-xs print:text-[10px] font-bold w-full uppercase">
                                            {/* Un pack familiar no se mide en gramos por persona: el plato
                                                es una bandeja entera. "es por kg o 4 tazas la porcion" — Gina. */}
                                            <div className="flex border-b border-black">
                                                <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                <div className="flex-1 p-0.5 px-1">{porcion.textoPorcion || (platosEmpaque[0]?.proteina?.gramosPorPorcion ? `${platosEmpaque[0].proteina.gramosPorPorcion} GRAMOS DE PROTEINA` : `${getDefaultGrams(packName)} GRAMOS DE PROTEINA`)}</div>
                                            </div>
                                            {showVegetales && (
                                                <div className="flex border-b border-black">
                                                    <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                    <div className="flex-1 p-0.5 px-1">{`${platosEmpaque[0]?.vegetal?.cantidadPorPorcion ?? porcion.vegetal} TAZA(S) DE VEGETALES`}</div>
                                                </div>
                                            )}
                                            {showCarbos && (
                                                <div className="flex border-b border-black">
                                                    <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                    <div className="flex-1 p-0.5 px-1">{`${platosEmpaque[0]?.carbo?.cantidadPorPorcion ?? porcion.carbo} TAZA(S) DE HARINA`}</div>
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
                                                const totalPlatos = (packData.totalPacks || 0) * (p.vecesPorPack || 1);

                                                // Función para obtener la celda del cliente en base al índice absoluto de la fila
                                                const renderClientCells = (subRowIndex) => {
                                                    const absoluteRowIndex = idx * rowsPerPlate + subRowIndex;
                                                    const client = packData.clientes[absoluteRowIndex];

                                                    if (client) {
                                                        // Las MISMAS etiquetas que el Excel: si cada salida armara su lista,
                                                        // volverian a decir cosas distintas y nadie se daria cuenta.
                                                        const tags = etiquetasDeEmpaque(client, {
                                                            esTwoPack: detectIsTwoPack(client.rawPedido || client),
                                                            otrosPacks: getOtherPacksTag(client.nombre, packName)
                                                        });

                                                        const dishObs = filterNoteForDish(sinSustituciones(client.observaciones), platosEmpaque[idx], platosEmpaque);
                                                        let notes = dishObs ? `** ${dishObs}` : '';
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
                                                        {/* FILA 2: VEGETALES (el Paquete Deluxe no lleva) */}
                                                        {showVegetales && (
                                                            <tr>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1">{p.vegetal?.nombre || ''}</td>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{p.vegetal?.cantidadPorPorcion ? `${p.vegetal.cantidadPorPorcion}` : ''}</td>
                                                                {renderClientCells(1)}
                                                            </tr>
                                                        )}
                                                        {/* FILA 3: CARBOS (si aplica) */}
                                                        {showCarbos && (
                                                            <tr className="break-inside-avoid">
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1">{p.carbo?.nombre || ''}</td>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{p.carbo?.cantidadPorPorcion ? `${p.carbo.cantidadPorPorcion}` : ''}</td>
                                                                {renderClientCells(showVegetales ? 2 : 1)}
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
                                                            const hasDesayunoAlready = client.incluyeDesayuno || (client.observaciones && client.observaciones.toLowerCase().includes('desayun'));
                                                            // Las MISMAS etiquetas que el Excel y que la tabla de arriba.
                                                            const tags = etiquetasDeEmpaque(client, { esTwoPack: detectIsTwoPack(client.rawPedido || client) });
                                                            let otherPacksTag = getOtherPacksTag(client.nombre, packName);
                                                            if (hasDesayunoAlready && otherPacksTag) {
                                                                const cleaned = otherPacksTag.replace('Lleva también: ', '').split(', ').filter(p => p !== 'Desayunos').join(', ');
                                                                otherPacksTag = cleaned ? `Lleva también: ${cleaned}` : '';
                                                            }
                                                            if (otherPacksTag) tags.push(otherPacksTag);
                                                            
                                                            let clientNotesText = sinSustituciones(client.observaciones || client.rawPedido?.observaciones || client.rawPedido?.details?.notes || '');
                                                            if (client.rawPedido?.items) {
                                                                client.rawPedido.items.forEach(it => {
                                                                    if (it.observaciones && !clientNotesText.includes(it.observaciones)) {
                                                                        clientNotesText = clientNotesText ? `${clientNotesText} · ${it.observaciones}` : it.observaciones;
                                                                    }
                                                                });
                                                            }
                                                            let notes = clientNotesText ? `** ${clientNotesText}` : '';
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
            {viewMode !== 'empaque' && renderQueSeCocinaJunto()}
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
