import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
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
import { anotarLecturas } from '../../utils/contadorFirestore';
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
import { COLECCION_AJUSTES, aplicarAjustes, cantidadFinal, conAjuste, claveDeRenglon } from '../../utils/ajustesDeCocina';
import { unidadesPosibles, convertir, desdeUnidad, UNIDADES } from '../../utils/unidadesDeCocina';
import { cuantoCocinar, parteDeIndividuales } from '../../utils/cuantoCocinar';
import { COLECCION_PRODUCCION, claveDeProduccion, acumularCocinado, cocinadoDeLaHoja } from '../../utils/produccionAcumulada';
import { COLECCION_TANDAS, pedidosDeLaTanda, pasaElAdelanto, esRecurrente, acumularEnviados, claveDePedido, canceladosDespuesDeEnviar, cicloDeProduccion } from '../../utils/tandasDeCocina';
import { familiasPorVolumen, tandaDeCadaPreparacion, conCabecerasDeTanda, cargaPorTanda } from '../../utils/tandasDeEmpaque';
import { leerAdelanto } from '../../utils/leerAdelantoDeGina';
import { agregarPestanaDeCocina, agregarPestanaDeEmpaque, agregarPestanaDeAvisos, agregarPestanaDeEmpaquePorPack } from '../../utils/excelCuatroPestanas';
import RevisionHoja from '../../components/admin/RevisionHoja';
import { problemasParaLaHoja } from '../../utils/revisionDeLaHoja';
import { problemasDelMenu } from '../../utils/revisionDeMenus';
import { leerAsignaciones, guardarAsignaciones } from '../../utils/asignacionesDeCocina';
import { apartarCambiosEscritos, packsDe } from '../../utils/cambiosEscritos';
import { marcasDePedidoRepetido, llaveDeCliente } from '../../utils/clientesRepetidos';
import EditorDePedido from '../../components/admin/EditorDePedido';
import { cambiosDelPedido, cambioParaCancelar, cuantasProteinasPide } from '../../utils/guardarPedidoDeLaHoja';
import EditorDeMenu from '../../components/admin/EditorDeMenu';
import { cambiosDelMenu, platosParaEditar, cambioDeUnPlato } from '../../utils/guardarMenuDeLaHoja';
import { invalidateCacheByType } from '../../utils/firestoreCache';
import CeldaEditable from '../../components/admin/CeldaEditable';
import AgregarClienteAlPack from '../../components/admin/AgregarClienteAlPack';
import { pedidoNuevo, idParaPedidoNuevo } from '../../utils/agregarPedidoDesdeLaHoja';
import { individualesData, getProductUnits } from '../../data/individualesData';
import ExcelJS from 'exceljs';
import { agregarHojasGina } from '../../utils/excelHojaProduccion';
import { packSeParteEnAlmuerzoYCena } from '../../utils/labels/labelDomain';
import { repartirPlatillos, sugerirCocinera, TIPO_POR_CATEGORIA } from '../../utils/asignacionCocineras';
import { COCINERAS } from '../../data/cocineras';
import { separarDesayunos, separarPersonalizadosDePack, agruparCambiosDePack } from '../../utils/desayunosPersonalizados';

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
    const [searchParams, setSearchParams] = useSearchParams();
    const { currentUser } = useAuth();
    const date = searchParams.get('date');

    // La hoja de COCINA puede cubrir varios dias: Gina empieza a cocinar el
    // jueves para el sabado y el lunes. Se pasan separadas por coma:
    //   ?date=2026-09-05,2026-09-07&tanda=adelanto
    const fechas = String(date || '').split(',').map(f => f.trim()).filter(Boolean);
    const primeraFecha = fechas[0] || '';
    // `adelanto` = solo mensuales y quincenales, que son los que ya estan
    // pagados y no dependen de lo que entre esta semana.
    const soloRecurrentes = searchParams.get('tanda') === 'adelanto';
    // Adelanto POR FECHA: el viernes el sabado sale completo y del lunes solo
    // los mensuales y quincenales, en la misma hoja.
    //   ?date=2026-09-05,2026-09-07&adelanto=2026-09-07
    const adelantoEnLaUrl = String(searchParams.get('adelanto') || '')
        .split(',').map(f => f.trim()).filter(Boolean);
    // Si no se dice cual fecha va recortada, se asume que la PRIMERA va completa
    // y las demas de adelanto: es como se usa siempre —el sabado entero y del
    // lunes solo lo que ya esta pagado—. Sin esto, abrir la hoja con dos fechas
    // y sin `adelanto` dejaba las pestanas del lunes vacias sin decir por que.
    const fechasDeAdelanto = new Set(
        adelantoEnLaUrl.length > 0 ? adelantoEnLaUrl : fechas.slice(1)
    );
    // Del dia de adelanto se puede traer UNA sola familia de packs. Los bajo
    // calorias son los mas del lunes y se pueden dejar hechos el viernes; el
    // resto pasa demasiado tiempo guardado.
    //   ?date=2026-09-05,2026-09-07&soloPacks=bajoCalorias
    const soloPacks = searchParams.get('soloPacks') || '';

    /**
     * El proximo dia de reparto despues del primero de la hoja.
     *
     * Se reparte lunes, miercoles y sabado. Del sabado el que sigue es el
     * lunes, que es justo el que se adelanta.
     */
    /** "lunes 7" — para los textos del control de arriba. */
    const nombreDelDiaCorto = (f) => {
        const d = new Date(`${f}T12:00:00`);
        if (Number.isNaN(d.getTime())) return String(f);
        const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        return `${dias[d.getDay()]} ${d.getDate()}`;
    };

    const proximoDiaDeReparto = (desde) => {
        const d = new Date(`${desde}T12:00:00`);
        if (Number.isNaN(d.getTime())) return '';
        for (let i = 1; i <= 7; i++) {
            const x = new Date(d);
            x.setDate(x.getDate() + i);
            if ([1, 3, 6].includes(x.getDay())) return x.toISOString().split('T')[0];
        }
        return '';
    };
    // La llave de la tanda NO sale de la URL, sale del CICLO de produccion.
    //
    // Las tres hojas del mismo ciclo se abren distinto —la del jueves con
    // `soloPacks`, la del viernes sin el, la del sabado con una sola fecha— y
    // cuando la llave se armaba con las fechas mas la familia cada una generaba
    // una llave propia. Ninguna veia a la anterior: el viernes se le volvia a
    // pedir a la cocina todo lo que ya habia hecho el jueves y las cantidades
    // adelantadas no se descontaban.
    const claveDeTanda = cicloDeProduccion(fechas);

    const [yaEnviados, setYaEnviados] = useState([]);
    const [tandasPrevias, setTandasPrevias] = useState([]);
    const viewMode = searchParams.get('view') || 'all';

    // Lo que Gina corrige a mano sobre la hoja de cocina. Se guarda por fecha y
    // manda sobre el calculo: ella es la que ve si el numero esta mal.
    const [ajustesCocina, setAjustesCocina] = useState({});
    const [guardandoAjuste, setGuardandoAjuste] = useState(false);
    const [descargando, setDescargando] = useState(false);
    const [errorDeAjuste, setErrorDeAjuste] = useState('');

    useEffect(() => {
        if (!date) return;
        let vigente = true;
        getDoc(doc(db, COLECCION_AJUSTES, date))
            .then(d => { if (vigente) setAjustesCocina(d.exists() ? (d.data().renglones || {}) : {}); })
            .catch(err => console.error('[Cocina] No se pudieron leer los ajustes:', err));
        return () => { vigente = false; };
    }, [date]);

    const [guardandoTanda, setGuardandoTanda] = useState(false);

    /**
     * Deja anotado que ESTOS pedidos ya se le mandaron a la cocina.
     *
     * Es lo unico que hace que la hoja del viernes no repita lo del miercoles.
     * Se guarda al MANDARLA, no al imprimirla: una hoja impresa y descartada no
     * deberia descontar nada.
     */
    const marcarTandaEnviada = async () => {
        if (cleanOrders.length === 0) return;
        const cuantos = cleanOrders.length;
        if (!window.confirm(
            `Marcar como enviados a cocina ${cuantos} pedido${cuantos === 1 ? '' : 's'} de ${fechas.join(' y ')}.

` +
            'La próxima hoja de cocina ya NO los va a incluir. Solo hacelo cuando de verdad le hayás mandado esta hoja a Gina.'
        )) return;

        setGuardandoTanda(true);
        try {
            await setDoc(doc(collection(db, COLECCION_TANDAS)), {
                clave: claveDeTanda,
                fechas,
                soloRecurrentes,
                pedidos: cleanOrders.map(claveDePedido),
                cuantos,
                // Cuanto se va a cocinar de cada preparacion, con las
                // correcciones de Gina ya puestas. Sin esto, cocinar de mas a
                // proposito —"dejar 5 kg para el sabado"— no se le descuenta a
                // la hoja siguiente y se cocina dos veces.
                cocinado: cocinadoDeLaHoja(bulkItems.map(r => ({
                    name: r.name, unit: r.unit,
                    aCocinar: cantidadFinal(r, cantidadACocinar(r))
                }))),
                enviada: new Date().toISOString()
            });
            const previas = [...tandasPrevias, {
                pedidos: cleanOrders.map(claveDePedido),
                // La hora tiene que venir tambien en la copia de memoria, o el
                // recuadro de arriba decia "ya se mando" sin poder decir cuando,
                // que es justo lo que uno quiere confirmar.
                enviada: new Date().toISOString(),
                cocinado: cocinadoDeLaHoja(bulkItems.map(r => ({
                    name: r.name, unit: r.unit,
                    aCocinar: cantidadFinal(r, cantidadACocinar(r))
                })))
            }];
            setTandasPrevias(previas);
            setYaEnviados(acumularEnviados(previas));
        } catch (err) {
            console.error('[Cocina] No se pudo guardar la tanda:', err);
            alert(err?.code === 'permission-denied'
                ? 'Firebase no deja guardar las tandas todavía. Falta publicar la regla de `tandas_cocina`.'
                : 'No se pudo guardar. Revisá la conexión e intentá de nuevo.');
        }
        setGuardandoTanda(false);
    };

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
    // El reparto de estaciones se guarda POR FECHA y se recupera al abrir.
    //
    // Antes vivia solo en memoria: se repartian cuarenta platillos, se cerraba
    // la pagina y se perdia todo. Volver el sabado a la hoja del lunes era
    // repartir de cero, o imprimir con "SIN ASIGNAR" en media hoja.
    const [kitchenAssignments, setKitchenAssignments] = useState(
        () => leerAsignaciones(String(date || '').split(',')[0].trim())
    );
    const [categoryCookInputs, setCategoryCookInputs] = useState({});

    // El pedido que se esta arreglando desde la hoja, o null.
    const [pedidoEnEdicion, setPedidoEnEdicion] = useState(null);

    /**
     * Abre el editor con el pedido crudo, buscado por nombre de cliente.
     *
     * Se busca en `cleanOrders` y se usa `rawPedido` porque lo que hay que
     * escribir es el documento tal cual esta guardado, no la version que la
     * hoja transformo para mostrar.
     */
    const abrirEditor = (pedidoId, nombreCliente) => {
        // Por id primero: un cliente puede tener dos pedidos el mismo dia y por
        // nombre se abria el que no era. El nombre queda de respaldo.
        const enLaHoja = (pedidoId && cleanOrders.find(o => (o.rawPedido?.id || o.id) === pedidoId))
            || cleanOrders.find(o =>
                String(o.cliente || o.nombre || '').trim().toLowerCase()
                === String(nombreCliente || '').trim().toLowerCase());
        const crudo = enLaHoja?.rawPedido || enLaHoja;
        if (!crudo?.id) return;
        const plan = crudo.plan || crudo.tipoMenu || '';
        setPedidoEnEdicion({
            id: crudo.id,
            cliente: crudo.cliente || nombreCliente,
            plan,
            observaciones: crudo.observaciones || '',
            items: crudo.items || [],
            proteinas: crudo.items?.[0]?.proteinas || [],
            cuantasProteinas: cuantasProteinasPide(plan)
        });
    };

    const guardarEdicion = async (edicion) => {
        const cambios = cambiosDelPedido(pedidoEnEdicion, edicion);
        if (!cambios) return;
        await updateDoc(doc(db, 'pedidos', pedidoEnEdicion.id), cambios);
    };

    const cancelarPedidoDeLaHoja = async () => {
        await updateDoc(doc(db, 'pedidos', pedidoEnEdicion.id), cambioParaCancelar());
    };

    /**
     * Guarda UNA celda del menu editada en la tabla de la hoja.
     *
     * `packName` es como se ve en la hoja —"CENAS - PACK SIN CARBOS"— y hay que
     * traducirlo a la clave del documento antes de escribir.
     */
    const guardarCeldaDeMenu = async (packName, numeroPlato, campo, valor) => {
        const esCena = /^CENAS\s*-/i.test(String(packName || ''));
        const base = String(packName || '').replace(/^CENAS\s*-\s*/i, '').trim();
        const familia = mapPackNameToMenuKey(base);
        const cambios = cambioDeUnPlato({ familia, esCena, numeroPlato, campo, valor, menus: officialMenus });
        if (!cambios) return;

        await updateDoc(doc(db, 'menus_oficial', 'current'), cambios);
        // Sin esto la pagina vuelve a servir el menu viejo de su cache la
        // proxima vez que cargue: el campo `meta.invalidateCache` es solo una
        // marca en el documento, no borra nada del navegador. Paso de verdad al
        // corregir el typo de los chayotes: Firestore quedo bien y la hoja
        // siguio imprimiendo lo anterior.
        invalidateCacheByType('menus_official');
        setOfficialMenus(prev => {
            const copia = { ...prev };
            if (esCena) copia.cena = { ...(copia.cena || {}), [familia]: cambios[`cena.${familia}`] };
            else copia[familia] = cambios[familia];
            return copia;
        });
    };

    // El pack al que se le esta agregando un cliente, o null.
    const [packParaAgregar, setPackParaAgregar] = useState(null);

    const agregarClienteAlPack = async (datos) => {
        const fecha = fechas[0] || date;
        const id = idParaPedidoNuevo(fecha, datos.cliente);
        await setDoc(doc(db, 'pedidos', id), pedidoNuevo({
            ...datos,
            plan: packParaAgregar,
            fecha,
            quien: currentUser?.email || 'hoja-produccion'
        }));
    };

    // El menu de la semana que se esta corrigiendo, o null.
    const [menuEnEdicion, setMenuEnEdicion] = useState(null);

    /**
     * Abre el editor del menu de una familia.
     *
     * `familia` es la clave del documento —sinCarbos, regular, fullPack— y no
     * el titulo que se ve en la hoja, que viene con mayusculas y a veces con el
     * prefijo "CENAS -".
     */
    const abrirMenu = (familia, esCena, titulo, cuantosClientes) => {
        if (!officialMenus || !familia) return;
        setMenuEnEdicion({
            familia, esCena, titulo, cuantosClientes,
            platos: platosParaEditar(officialMenus, familia, esCena)
        });
    };

    const guardarMenuEditado = async (platos) => {
        const cambios = cambiosDelMenu({
            familia: menuEnEdicion.familia,
            esCena: menuEnEdicion.esCena,
            platos,
            menus: officialMenus
        });
        if (!cambios) return;
        await updateDoc(doc(db, 'menus_oficial', 'current'), cambios);
        invalidateCacheByType('menus_official');
        // La hoja lee de `officialMenus`: sin esto habria que recargar para ver
        // el cambio que uno acaba de hacer.
        setOfficialMenus(prev => {
            const copia = { ...prev };
            if (menuEnEdicion.esCena) {
                copia.cena = { ...(copia.cena || {}), [menuEnEdicion.familia]: cambios[`cena.${menuEnEdicion.familia}`] };
            } else {
                copia[menuEnEdicion.familia] = cambios[menuEnEdicion.familia];
            }
            return copia;
        });
    };

    // Al cambiar de dia se trae el reparto de ESE dia, no el de antes
    useEffect(() => {
        setKitchenAssignments(leerAsignaciones(fechas[0]));
    }, [fechas[0]]);

    /**
     * Cambia el reparto y lo guarda en el mismo paso.
     *
     * Se guarda ACA y no en un useEffect a proposito. Con el efecto habia una
     * carrera: al cambiar de dia, la fecha cambiaba antes que el estado, asi
     * que el reparto del miercoles se guardaba encima del sabado y despues se
     * leia ya pisado.
     */
    const cambiarAsignaciones = (cambio) => {
        setKitchenAssignments(prev => {
            const siguiente = typeof cambio === 'function' ? cambio(prev) : cambio;
            guardarAsignaciones(fechas[0], siguiente);
            return siguiente;
        });
    };
    const [resumenReparto, setResumenReparto] = useState(null);
    // Platos que Gina dijo que son el mismo. Se guardan en el navegador para
    // no tener que rehacerlas cada semana.
    const [unionesDePlatos, setUnionesDePlatos] = useState(() => leerUniones());
    // El Excel del adelanto que Gina llena a mano el jueves. Se carga desde la
    // pantalla porque no vive en Firestore: es un archivo suyo.
    const [adelantoDeGina, setAdelantoDeGina] = useState(null);
    const [errorDeAdelanto, setErrorDeAdelanto] = useState('');
    // Ver la hoja SIN descontar nada: las cantidades completas del dia. Es como
    // Gina revisa que no falte, antes de mirar cuanto le queda por hacer.
    const [sinRebaja, setSinRebaja] = useState(true);
    // Los controles finos —sumar el adelanto, que familia traer— los deja
    // puestos el boton del dia. Se esconden porque eran cinco botones mas en una
    // pantalla que ya tenia demasiados: "hay mucho desorden" (Jan).
    const [verAjustes, setVerAjustes] = useState(false);
    const [selectedKitchenItems, setSelectedKitchenItems] = useState([]);
    const [bulkSelectedCook, setBulkSelectedCook] = useState('');

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


    useEffect(() => {
        if (!date) return;
        setLoading(true);
        const targetDate = new Date(primeraFecha + "T12:00:00");
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
            // Esta es la pantalla mas cara del panel y la que agoto la cuota el 3
            // de setiembre de 2026: cada apertura se baja los ~545 pedidos. Sin
            // anotarlo, el contador de la barra marcaba 0% mientras se gastaba
            // todo, que fue justo lo que no dejo verlo venir.
            //
            // Se cuentan los CAMBIOS y no `snapshot.size`: la primera vez traen
            // lo mismo —todos los documentos llegan como 'added'—, pero despues
            // el listener solo cobra lo que cambio, y sumar el total en cada
            // refresco inflaria la cuenta hasta volverla inservible.
            anotarLecturas(snapshot.docChanges().length, 'Hoja de producción');

            let rawOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            rawOrders = rawOrders.filter(order => {
                const status = (order.status || order.estado || '').toLowerCase();
                if (!ESTADOS_QUE_IMPRIMEN.includes(status)) return false;

                const schedule = getScheduleFromOrder(order);
                return schedule.some(f => fechas.includes(f));
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

    // Que pedidos ya se le mandaron a la cocina en tandas anteriores. Sin esto
    // la hoja del viernes repetiria lo del miercoles y se cocinaria dos veces.
    useEffect(() => {
        if (!claveDeTanda) return;
        let vigente = true;
        getDocs(query(collection(db, COLECCION_TANDAS), where('clave', '==', claveDeTanda)))
            .then(snap => {
                if (!vigente) return;
                const previas = snap.docs.map(d => d.data());
                setTandasPrevias(previas);
                setYaEnviados(acumularEnviados(previas));
            })
            .catch(err => console.error('[Cocina] No se pudieron leer las tandas:', err));
        return () => { vigente = false; };
    }, [claveDeTanda]);


    if (!fechas.length) return <div className="p-8 text-center text-xl">Falta la fecha en la URL</div>;
    if (loading) return <div className="p-8 text-center text-xl">Cargando datos para impresión...</div>;
    if (orders.length === 0) return (
        <div className="p-8 text-center text-xl space-y-6 max-w-2xl mx-auto mt-12 bg-white p-6 rounded-2xl shadow-xl border border-gray-100">
            <div className="text-gray-700 font-semibold">No se encontraron pedidos registrados para el: <span className="text-purple-600 font-black">{date}</span></div>
        </div>
    );

    // `cleanOrders` es lo que REALMENTE se cocina; `fusionados` son los pedidos
    // que se descartaron por parecerse a otro. La revision tiene que mirar lo
    // que se cocina, no lo que entro: antes contaba `orders` y el panel decia
    // "21 pedidos" cuando a la cocina llegaban 18.
    const { pedidos: todosLosPedidos, fusionados } = deduplicateOrdersByClient(orders);

    // La COCINA recibe la hoja por tandas: el miercoles los mensuales y
    // quincenales, el viernes y el sabado lo que fue entrando. Cada hoja lleva
    // SOLO lo que no se mando antes, o se cocina dos veces.
    //
    // El EMPAQUE y las etiquetas no se tocan: esos siguen saliendo completos
    // por fecha de entrega, que es como se reparten.
    const calendarioDelPedido = (p) => getScheduleFromOrder(p.rawPedido || p);

    /** "SÁB 5" / "LUN 7", para marcar de que dia es cada cliente. */
    const etiquetaDelDia = (f) => {
        const d = new Date(`${f}T12:00:00`);
        if (Number.isNaN(d.getTime())) return '';
        const dias = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
        return `${dias[d.getDay()]} ${d.getDate()}`;
    };

    /**
     * De que dia es la comida de este cliente.
     *
     * Cuando la hoja cubre el sabado y el adelanto del lunes, los dos caen en la
     * misma tabla y no habia como saber cual bolsa sale hoy. Con una sola fecha
     * no se muestra: el titulo ya lo dice y repetirlo en cada fila es ruido.
     */
    /**
     * La primera fecha de este cliente dentro de la hoja, para poder ordenar.
     *
     * Empaque los arma DE CORRIDA por dia: primero todos los del sabado, que se
     * cierran hoy, y despues los del lunes, que van a refri sin cerrar porque
     * todavia les faltan cenas y desayunos. Intercalados obligan a leer el dia
     * en cada nombre y a saltar entre dos montones.
     *
     *   "Corrida del sabado, corrida del lunes, y ya los del lunes quedan
     *    guardados" — Jan, 9 de setiembre de 2026.
     */
    const primerDiaDelCliente = (c) => {
        for (const fuente of [c?.rawPedido?.rawPedido, c?.rawPedido, c]) {
            if (!fuente) continue;
            const suyas = (calendarioDelPedido(fuente) || []).filter(f => fechas.includes(f));
            if (suyas.length > 0) return suyas.slice().sort()[0];
        }
        return '';
    };

    /** Ordena una lista de clientes por dia de entrega, respetando el resto. */
    const porDiaDeEntrega = (clientes) => (clientes || []).slice().sort((a, b) => {
        const fa = primerDiaDelCliente(a);
        const fb = primerDiaDelCliente(b);
        if (fa === fb) return 0;
        if (!fa) return 1;
        if (!fb) return -1;
        return fa < fb ? -1 : 1;
    });

    const diaDelCliente = (c) => {
        if (fechas.length < 2) return '';
        // El pedido no siempre queda a la misma profundidad: segun por donde
        // pase —pack normal, pack familiar, bloque de cambios— el cliente trae
        // el pedido en `rawPedido`, en `rawPedido.rawPedido`, o en el mismo
        // objeto. Se prueban los tres y gana el primero que tenga fechas de
        // esta hoja: si no, el dia salia vacio justo en los bloques donde mas
        // hace falta —Rebeca Toval es del sabado y su bloque no lo decia—.
        for (const fuente of [c?.rawPedido?.rawPedido, c?.rawPedido, c]) {
            if (!fuente) continue;
            const suyas = (calendarioDelPedido(fuente) || []).filter(f => fechas.includes(f));
            if (suyas.length > 0) return ` · ${suyas.map(etiquetaDelDia).join(' + ')}`;
        }
        return '';
    };

    /** Si se pidio adelantar una sola familia, cual pedido califica. */
    const familiaPermitida = soloPacks
        ? (p) => mapPackNameToMenuKey(p.plan || p.tipoMenu || '') === soloPacks
        : null;

    /** Si TODAS las entregas de este pedido caen en un dia de adelanto. */
    const esSoloDeAdelanto = (p) => {
        if (fechasDeAdelanto.size === 0) return false;
        const suyas = (calendarioDelPedido(p) || []).filter(f => fechas.includes(f));
        return suyas.length > 0 && suyas.every(f => fechasDeAdelanto.has(f));
    };

    /**
     * De un dia de adelanto se alistan los PACKS, pero no los desayunos.
     *
     * Un pack de almuerzos se puede dejar hecho; un gallo pinto con huevo no.
     * Lo confirmo Gina: del lunes no se preparan desayunos. Sin esto, la hoja
     * pedia 35 desayunos que nadie iba a hacer.
     *
     * Se quita el desayuno del pedido, no el pedido: el cliente igual lleva su
     * pack de almuerzos ese dia.
     */
    const sinDesayunosDeAdelanto = (pedidos) => pedidos
        // Un pack que es SOLO desayunos no se adelanta del todo
        .filter(p => !(esSoloDeAdelanto(p) && mapPackNameToMenuKey(p.plan || p.tipoMenu || '') === 'desayuno'))
        .map(p => (esSoloDeAdelanto(p) ? { ...p, incluyeDesayuno: false, packsDesayuno: 0 } : p));

    // "Ver TODO" tiene que apagar los DOS descuentos, no uno solo:
    //
    //   `yaEnviados`  saca pedidos ENTEROS que ya se mandaron a cocinar
    //   `yaCocinado`  resta CANTIDADES que ya estan hechas
    //
    // Apagando solo el segundo, la hoja salia casi vacia —solo los individuales
    // que entraron despues— y parecia que no habia nada que cocinar.
    const { nuevos: cleanOrders, repetidos: yaEnLaCocina } = pedidosDeLaTanda(
        sinDesayunosDeAdelanto(todosLosPedidos),
        sinRebaja ? [] : yaEnviados,
        { soloRecurrentes, calendario: calendarioDelPedido, fechas, fechasDeAdelanto, familiaPermitida }
    );

    // El empaque sigue saliendo por fecha de entrega, pero si una fecha va como
    // adelanto tambien se recorta ahi: de lunes solo se empacan los mensuales y
    // quincenales, que son los unicos que se cocinaron.
    const pedidosParaEmpaque = sinDesayunosDeAdelanto(
        todosLosPedidos.filter(p =>
            pasaElAdelanto(p, { fechas, fechasDeAdelanto, calendario: calendarioDelPedido, familiaPermitida })
        )
    );
    // El aviso de "se cancelo despues de mandarse" solo tiene sentido si la hoja
    // cubre el CICLO entero. Abriendo un solo dia —el lunes suelto, cuando la
    // tanda se mando por sabado y lunes juntos— los pedidos del sabado no estan
    // cargados y parecian cancelados: salian 15 avisos falsos de una vez y el
    // aviso de verdad se perdia entre ellos.
    const cubreElCicloEntero = claveDeTanda
        ? claveDeTanda.split('_').every(f => fechas.includes(f))
        : false;
    const canceladosYaCocinados = cubreElCicloEntero
        ? canceladosDespuesDeEnviar(yaEnviados, todosLosPedidos)
        : [];

    const kitchenData = buildKitchenSheetData(cleanOrders, {});
    const packagingData = buildPackagingSheetData(pedidosParaEmpaque, {}, null);
    // Lo mismo pero solo con los de la tanda, para la tabla de produccion.
    const cocinaData = buildPackagingSheetData(cleanOrders, {}, null);

    // Group packaging data by Pack
    //
    // Se arman DOS mapas con la misma logica:
    //   packsMap        -> todos los pedidos por fecha de entrega. Es el del EMPAQUE.
    //   packsMapCocina  -> solo los de esta tanda. Es el de la COCINA.
    //
    // Antes habia uno solo, hecho con todos los pedidos, y la tabla de produccion
    // lo usaba: el adelanto del jueves le pedia a Gina las cantidades de la SEMANA
    // ENTERA aunque el encabezado dijera "54 pedidos". Cocinaba de mas el jueves y
    // la hoja del viernes se lo volvia a pedir.
    const packsMap = {};
    const packsMapCocina = {};

    const addClientToPackMap = (mapa, pName, cData, overridePlates = null) => {
        const packsMap = mapa;
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
                // La nota SIN filtrar para empaque. `observaciones` ya paso por
                // notaParaEmpaque, que la parte en las rayas y bota lo que parece
                // apunte interno; eso se comia cambios de plato de verdad —a Allan
                // Quesada le borraba "cambiar gallo pinto por burritos"—.
                observacionesOriginales: cData.observacionesOriginales || cData.observaciones || '',
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

    const llenarMapaDePacks = (clientes, mapa) => clientes.forEach((c) => {
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

            // El `categoryLabel` DEL ITEM es donde el checkout de la web guarda
            // "Almuerzo y Cena". El plan del pedido queda en "Full Pack" a secas,
            // asi que sin esto el Full Pack mensual de almuerzo y cena de Diego
            // Andres Flores —₡223.960, tres entregas por delante— salia en la
            // hoja del miercoles con cinco almuerzos y NINGUNA cena.
            const categoriasDeItems = ((c.rawPedido?.items || c.items || []))
                .map(i => i?.categoryLabel || '').filter(Boolean).join(' ');
            const orderPlanText = `${c.plan || ''} ${c.tipoMenu || ''} ${c.categoryLabel || ''} ${c.categoria || ''} ${c.rawPedido?.plan || ''} ${c.rawPedido?.tipoMenu || ''} ${categoriasDeItems}`;
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
                addClientToPackMap(mapa, packName, almuerzoClient, filteredPlates.length > 0 ? filteredPlates : null);

                // Copia para la tabla de CENAS → decir qué pack de almuerzo lleva (SIN los cambios específicos del menú de almuerzo)
                const menuKey = mapPackNameToMenuKey(packName);
                const packLabel = (menuKey && MENU_LABELS[menuKey]) ? MENU_LABELS[menuKey] : packName;
                const cenaClient = { ...clientForPack };
                const cleanCenaObs = filterObsForCenas(cleanObs);
                cenaClient.observaciones = appendTagUnique(cleanCenaObs, `Lleva ${packLabel}`);
                addClientToPackMap(mapa, `CENAS - ${packName}`, cenaClient, null);
            } else {
                const normClient = { ...clientForPack, observaciones: cleanObs };
                addClientToPackMap(mapa, packName, normClient, filteredPlates.length > 0 ? filteredPlates : null);
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
                const desClient = { ...clientForPack, observaciones: cleanObs, observacionesOriginales: c.observaciones || '' };
                addClientToPackMap(mapa, 'Pack de Desayunos', { ...desClient, cantidadMenus: packsDeDesayuno }, []);
            }
        });
    });

    // El empaque lleva TODOS los pedidos de esas fechas: es como se reparte.
    llenarMapaDePacks(packagingData.clientes, packsMap);
    // La cocina lleva solo los de esta tanda: es lo que hay que cocinar hoy.
    llenarMapaDePacks(cocinaData.clientes, packsMapCocina);

    const allPackNames = Object.keys(packsMap).sort();
    const isDesayunoPack = (n) => mapPackNameToMenuKey(n) === 'desayuno';


    // ── Consolidar packs que comparten el mismo menú (mismos platos) ──
    // "Pack Bajo Calorías Promo Almuerzo y Cena" y "Pack 2 Semanas Bajo Calorías"
    // tienen los MISMOS platos → se fusionan en UNA sola hoja de empaque.
    const MENU_ORDER = ['regular', 'fullPack', 'bajoCalorias', 'sinCarbos', 'keto', 'vegetariano', 'casaditos', null];

    const consolidatedPacksMap = {};
    const packNameToConsolidated = {}; // mapea nombre original → nombre consolidado

    // El mismo consolidado pero de la tanda, para la tabla de produccion.
    /**
     * Junta los packs que comparten menu bajo un solo nombre.
     *
     * Es funcion y no codigo suelto porque la hoja de cocina se calcula VARIAS
     * veces con distintos pedidos: el sabado completo, el lunes solo mensuales,
     * y las dos juntas. Cada una necesita su propio mapa consolidado.
     */
    const consolidarParaCocina = (mapaDePacks) => {
        const salida = {};
        Object.keys(mapaDePacks).forEach(packName => {
            if (isActuallyIndividual(packName) || isDesayunoPack(packName)) return;
            const menuKey = mapPackNameToMenuKey(packName);
            let nombre = nombreDeHojaDeEmpaque(packName, menuKey ? MENU_LABELS[menuKey] : null);
            if (packName.startsWith('CENAS -')) nombre = `CENAS - ${nombre.replace('CENAS - ', '')}`;
            if (!salida[nombre]) {
                salida[nombre] = {
                    name: nombre, clientes: [], platosBase: [], totalPacks: 0,
                    sourcePackNames: [], menuKey
                };
            }
            const destino = salida[nombre];
            const origen = mapaDePacks[packName];
            origen.clientes.forEach(c => destino.clientes.push({ ...c }));
            destino.totalPacks += origen.totalPacks;
            if (destino.platosBase.length === 0 && origen.platosBase.length > 0) destino.platosBase = origen.platosBase;
            if (!destino.sourcePackNames.includes(packName)) destino.sourcePackNames.push(packName);
        });
        return salida;
    };

    const consolidatedPacksMapCocina = consolidarParaCocina(packsMapCocina);

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

    /**
     * El ORDEN por volumen. Lo usan LAS DOS hojas.
     *
     * Las cocineras entran temprano y los de empaque llegan unas dos horas
     * despues. Arrancando por la familia que mas packs tiene, a esa hora ya hay
     * treinta bolsas listas y el empaque trabaja de corrido.
     *
     * Y la hoja de EMPAQUE tiene que ir en el mismo orden que la de cocina, o se
     * contradicen: la de Paula empezaba por Pack Regular —5 packs— cuando la
     * cocina estaba haciendo bajo calorias, que son 30. Llegaba y lo primero de
     * su hoja todavia no existia.
     *
     * La olla NO se parte: una preparacion que ocupan varias familias se cocina
     * entera cuando le toca a la mas grande.
     */
    const familiasDelDia = Object.entries(consolidatedPacksMap)
        .map(([nombre, datos]) => ({ nombre, packs: datos?.totalPacks || 0 }));
    const ordenDeFamilias = familiasPorVolumen(familiasDelDia);

    /** En que puesto va una familia. Las CENAS van pegadas a su almuerzo. */
    const puestoDeFamilia = (nombre) => {
        const base = String(nombre || '').replace(/^CENAS\s*-\s*/i, '').trim().toLowerCase();
        const i = ordenDeFamilias.findIndex(f => f.nombre.toLowerCase() === base);
        return i === -1 ? ordenDeFamilias.length : i;
    };

    const regularPackNames = Object.keys(consolidatedPacksMap).sort((a, b) => {
        const pa = puestoDeFamilia(a);
        const pb = puestoDeFamilia(b);
        if (pa !== pb) return pa - pb;
        // Dentro de la familia: primero el almuerzo, despues su cena
        const cenaA = /^CENAS\s*-/i.test(a) ? 1 : 0;
        const cenaB = /^CENAS\s*-/i.test(b) ? 1 : 0;
        if (cenaA !== cenaB) return cenaA - cenaB;
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

        // Quien cambio su desayuno sale de esta tabla y va a la suya.
        //
        // Tres de los cinco desayunos son gallo pinto, asi que "cambiar gallo
        // pinto por burritos" no toca un plato: toca tres. Mientras esa gente
        // contaba en el total de aca, la cocina hacia gallo pinto para ellos
        // tambien y sus burritos no los hacia nadie.
        const { estandar, personalizados, packsEstandar } = separarDesayunos(packData.clientes, rawPlatos);

        // No expandir clientes — usar una fila por cliente con (N) al lado del nombre
        const clientsList = [...estandar];

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
                        <td className="border border-black p-2 text-center font-bold">{dish ? packsEstandar : ''}</td>
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

        // Un bloque por cliente que no come el menu de la semana. Va con SUS
        // platos y con el original tachado al lado, para que la cocina vea de
        // que se cambio y no tenga que ir a buscarlo en la nota.
        personalizados.forEach((cliente) => {
            const zona = cliente.zona_envio && cliente.zona_envio !== 'No especificada'
                ? `, ${cliente.zona_envio}` : '';
            const cuantos = Number(cliente.cantidad) > 0 ? Number(cliente.cantidad) : 1;

            tables.push(
                <div key={`desayuno-propio-${cliente.nombre}`} className="mb-12 print:mb-0 print:break-after-page print:[page-break-after:always]">
                    <table className="w-full border-collapse border border-black text-sm table-fixed">
                        <thead>
                            <tr>
                                <th colSpan="4" className="bg-[#f4b084] text-black font-bold text-2xl p-2 border border-black text-center uppercase tracking-wide">
                                    Desayunos de {cliente.nombre}{zona}{cuantos > 1 ? ` (${cuantos})` : ''}
                                </th>
                            </tr>
                            <tr>
                                <th colSpan="4" className="bg-[#fff2cc] text-black p-2 border border-black text-left text-sm font-normal">
                                    No lleva el menú de la semana. Pidió: <strong>{cliente.cambio.texto}</strong>
                                </th>
                            </tr>
                            <tr className="bg-[#fce4d6]">
                                <th className="border border-black p-2 w-16 text-center">Plato</th>
                                <th className="border border-black p-2 text-center">Qué se le hace</th>
                                <th className="border border-black p-2 w-24 text-center">Cantidad</th>
                                <th className="border border-black p-2 w-64 text-center">En vez de</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cliente.platos.map((plato) => (
                                <tr key={plato.numero} className="border border-black bg-white break-inside-avoid print:break-inside-avoid">
                                    <td className="border border-black p-2 text-center">{plato.numero}</td>
                                    <td className={`border border-black p-2 text-left ${plato.estado === 'quitado' ? 'line-through text-gray-500' : ''} ${plato.estado === 'cambiado' ? 'font-bold bg-[#e2f0d9]' : ''}`}>
                                        {plato.estado === 'quitado' ? 'NO LLEVA' : plato.nombre}
                                    </td>
                                    <td className="border border-black p-2 text-center font-bold">
                                        {plato.estado === 'quitado' ? '—' : cuantos}
                                    </td>
                                    <td className="border border-black p-2 text-xs text-center text-gray-600">
                                        {plato.original || ''}
                                    </td>
                                </tr>
                            ))}
                            {cliente.observaciones ? (
                                <tr className="border border-black bg-[#fff2cc]">
                                    <td colSpan="4" className="border border-black p-2 text-xs text-left">
                                        <strong>Nota del pedido:</strong> {cliente.observaciones}
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            );
        });

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
                const fullName = `${c.nombre}${zoneStr}${diaDelCliente(c)}`;

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
                            <tbody key={`${clientName}-${idx}`} className="break-inside-avoid print:break-inside-avoid">
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

    // LOGICA NUEVA DE HOJA DE COCINA GLOBAL
    // ==========================================
    /**
     * Se llama DOS veces: con los mapas de la tanda —lo que hay que cocinar
     * hoy— y con los de la semana completa, para poder ofrecer adelantar.
     */
    const getAllKitchenItems = (mapaConsolidado, mapaPacks) => {
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

        // De que pack viene lo que se esta sumando ahora. Lo lee `acumularPlato`
        // para dejar anotado en cada renglon a que familias sirve: sin eso la
        // hoja no puede saber que el arroz lo ocupa el bajo calorias y por lo
        // tanto va de primero.
        let packEnCurso = null;

        const anotarFamilia = (clave) => {
            const renglon = bulkItemsMap[clave];
            if (!renglon || !packEnCurso) return;
            if (!renglon.familias) renglon.familias = [];
            if (!renglon.familias.includes(packEnCurso)) renglon.familias.push(packEnCurso);
        };

        const acumularPlato = (nombreCrudo, cantidad, unidad, platos = 0, esComponente = false) => {
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
                    const clave = acumularPlato(parte, suyo.cantidad, suyo.unidad, platos, true);
                    if (primera === null) primera = clave;
                });
                return primera;
            }

            // El nombre con el que entra: lo que una persona marco como el mismo
            // plato, o el nucleo (toda la "carne mechada" es una sola olla).
            const nombre = nombreParaAcumular(nombreCrudo, destinos);
            const encontrado = esComponente
                ? { clave: null, ambiguo: [] }
                : buscarRenglonDelMismoPlato(bulkItemsMap, nombre, unidad);

            if (encontrado.ambiguo.length > 0) {
                // Calzaba con varios: juntarlo con el que no es seria peor que
                // dejarlo aparte. Se avisa y se separa.
                avisosDeUnion.push({ nombre, calzaCon: encontrado.ambiguo });
            }

            if (encontrado.clave) {
                const renglon = bulkItemsMap[encontrado.clave];
                renglon.totalQty += cantidad;
                renglon.porciones = (renglon.porciones || 0) + (Number(platos) || 0);
                renglon.name = nombreMasCompleto(renglon.name, nombre);
                anotarFamilia(encontrado.clave);
                return encontrado.clave;
            }

            sumarAGranel(bulkItemsMap, nombre, cantidad, unidad, guessCategory, platos, esComponente);
            anotarFamilia(claveGranel(nombre, unidad));
            return claveGranel(nombre, unidad);
        };

        // 1. Process regular packs (Granel para ollas)
        Object.keys(mapaConsolidado).forEach(packName => {
            const packData = mapaConsolidado[packName];
            if (!packData || packData.totalPacks === 0) return;

            const isCenaSheet = packName.startsWith('CENAS -');
            const basePackName = isCenaSheet ? packName.replace(/^CENAS\s*-\s*/i, '') : packName;
            const menuKey = packData.menuKey || mapPackNameToMenuKey(basePackName);
            packEnCurso = packName;

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
                    acumularPlato(p.proteina.nombre, grams, 'g', totalPlatos);
                }
                if (p.vegetal?.nombre && p.vegetal.nombre !== '—') {
                    const units = (p.vegetal.cantidadPorPorcion || porcion.vegetal) * totalPlatos;
                    acumularPlato(p.vegetal.nombre, units, 'taza(s)', totalPlatos);
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

        // A que familias de pack pertenece cada cliente.
        //
        // Un individual de alguien que TAMBIEN lleva pack no es un plato suelto:
        // va en la misma bolsa que su pack, y la bolsa no se cierra sin el. Si se
        // cocina de ultimo --con los individuales de quienes no llevan pack-- esa
        // bolsa se queda abierta esperando y el empaque se traba, que es justo lo
        // que las tandas vienen a evitar. Diana Gonzalez lleva bajo calorias y
        // tres proteinas de 250 g: sus proteinas se cocinan con el bajo calorias.
        const familiasDelCliente = new Map();
        Object.keys(mapaConsolidado).forEach(nombreFamilia => {
            (mapaConsolidado[nombreFamilia]?.clientes || []).forEach(c => {
                const k = String(c?.nombre || '').trim().toLowerCase();
                if (!k) return;
                if (!familiasDelCliente.has(k)) familiasDelCliente.set(k, []);
                const suyas = familiasDelCliente.get(k);
                if (!suyas.includes(nombreFamilia)) suyas.push(nombreFamilia);
            });
        });

        // 2. Process Individuales (Pre-empacados directamente en cocina)
        Object.keys(mapaPacks).filter(n => isActuallyIndividual(n) && !isDesayunoPack(n)).forEach(packName => {
            const packData = mapaPacks[packName];
            if (!packData || !packData.clientes) return;
            packEnCurso = packName;

            packData.clientes.forEach(c => {
                // Si este cliente lleva pack, su individual hereda esa familia y
                // se cocina cuando le toca a ella, no al final.
                const familiasSuyas = familiasDelCliente.get(String(c?.nombre || '').trim().toLowerCase());
                packEnCurso = familiasSuyas && familiasSuyas.length ? familiasSuyas[0] : packName;
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

        return { bulkItems, missingMenus, avisosDeUnion, familiasDelCliente };
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
    /** Lo ya cocinado en las hojas anteriores de esta misma hornada. */
    // Lo ya cocinado sale de dos lados y se SUMAN: las hojas anteriores que se
    // mandaron desde el sistema, y el Excel que Gina llena a mano el jueves.
    const yaCocinado = (() => {
        // Sin rebaja no se descuenta nada: la hoja muestra lo que pide el dia
        // completo. Es un interruptor de la vista, no un cambio de los datos.
        if (sinRebaja) return {};
        const total = { ...acumularCocinado(tandasPrevias) };
        Object.entries(adelantoDeGina?.cocinado || {}).forEach(([clave, cantidad]) => {
            total[clave] = (total[clave] || 0) + cantidad;
        });
        return total;
    })();

    /**
     * Cuanto hay que cocinar HOY de este renglon.
     *
     * Es lo que piden los pedidos menos lo que ya se cocino. Sin ese descuento,
     * cocinar de mas a proposito —"dejar 5 kg de carne para el sabado", que Gina
     * hace todas las semanas porque se congela— no servia de nada: la hoja
     * siguiente lo volvia a pedir completo.
     */
    const cantidadACocinar = (item) => {
        const pide = cuantoCocinar(item);
        const hecho = Number(yaCocinado[claveDeProduccion(item?.name, item?.unit)]) || 0;
        return Math.max(0, pide - hecho);
    };

    /** Lo que pide TODA la hornada, para poder adelantar de una vez. */
    const pideTodaLaSemana = (item) => Number(pideLaSemana[claveDeProduccion(item?.name, item?.unit)]) || 0;

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
    const { bulkItems: bulkDeLaTanda, missingMenus, avisosDeUnion, familiasDelCliente } = getAllKitchenItems(consolidatedPacksMapCocina, packsMapCocina);
    // Lo mismo pero de TODO el sabado y el lunes: es lo que se ofrece adelantar
    // cuando la preparacion se congela y no vale la pena prender la olla dos veces.
    const bulkSemana = getAllKitchenItems(consolidatedPacksMap, packsMap).bulkItems;

    /**
     * Sobre que cantidades se trabaja.
     *
     * RESTAR DOS VECES ERA EL BUG. Con el interruptor en "lo que FALTA" pasaban
     * las dos cosas a la vez: los pedidos ya mandados salian de la lista, Y
     * ADEMAS se le restaba a cada renglon lo que esos mismos pedidos habian
     * hecho cocinar. La comida quedaba descontada dos veces y la hoja del
     * viernes pedia casi cero.
     *
     * Medido el 7 de setiembre sobre el ciclo del 5 y 7: la hoja completa pide
     * 193 tazas de arroz, la tanda del jueves cocino 70, y el viernes la
     * pantalla mostraba 13. Deberia mostrar lo que falta, no 13.
     *
     * Cuando se rebaja, la base tiene que ser el ciclo COMPLETO y el descuento
     * hace el trabajo. Es exactamente lo que ya hacia bien la pestana 4 del
     * Excel; ahora la pantalla dice lo mismo que el archivo.
     */
    const bulkItems = sinRebaja ? bulkDeLaTanda : bulkSemana;

    const bulkOrdenado = tandaDeCadaPreparacion(bulkItems, ordenDeFamilias)
        .sort((a, b) => (a.tanda - b.tanda)
            // El menu 1 completo primero: es lo que Paula empaca al llegar
            || (a.soloCena === b.soloCena ? 0 : (a.soloCena ? 1 : -1))
            || (Number(b.totalQty) || 0) - (Number(a.totalQty) || 0)
            || String(a.name).localeCompare(String(b.name)));

    /**
     * La hoja de cocina de CUALQUIER grupo de pedidos.
     *
     * Recorre el mismo camino que la hoja de la pantalla —empaque, mapa de
     * packs, consolidado, granel— pero arrancando de los pedidos que se le
     * pasen. Es lo que permite sacar el sabado y el lunes por separado en el
     * mismo Excel sin recalcular a mano.
     */
    const hojaDeCocinaDe = (pedidos) => {
        if (!pedidos || pedidos.length === 0) return [];
        const datos = buildPackagingSheetData(pedidos, {}, null);
        const mapa = {};
        llenarMapaDePacks(datos.clientes, mapa);
        return getAllKitchenItems(consolidarParaCocina(mapa), mapa).bulkItems;
    };
    const pideLaSemana = {};
    bulkSemana.forEach(r => { pideLaSemana[claveDeProduccion(r.name, r.unit)] = cuantoCocinar(r); });

    /**
     * Carga el Excel del adelanto: lo que Gina ya cocino el jueves.
     *
     * Se busca la pestana por nombre y, si no aparece, la primera que tenga
     * pares "plato / cantidad". Lo que no se pueda convertir NO se descuenta:
     * queda listado para que se resuelva a mano.
     */
    const handleCargarAdelanto = async (evento) => {
        const archivo = evento.target.files?.[0];
        if (!archivo) return;
        setErrorDeAdelanto('');
        try {
            const wb = new ExcelJS.Workbook();
            await wb.xlsx.load(await archivo.arrayBuffer());

            const hoja = wb.worksheets.find(w => /desglose/i.test(w.name)) || wb.worksheets[0];
            if (!hoja) throw new Error('El archivo no tiene ninguna pestana');

            const filas = [];
            hoja.eachRow((fila) => {
                const celdas = [];
                fila.eachCell({ includeEmpty: false }, (celda) => {
                    const v = celda.value;
                    const texto = (v && typeof v === 'object' && 'result' in v) ? v.result : v;
                    if (texto !== null && texto !== undefined && String(texto).trim() !== '') celdas.push(texto);
                });
                if (celdas.length > 0) filas.push([String(celdas[0]).trim(), celdas[1] ?? null]);
            });

            const leido = leerAdelanto(filas);
            setAdelantoDeGina({ ...leido, archivo: archivo.name, pestana: hoja.name });
        } catch (err) {
            console.error('[Adelanto] No se pudo leer el archivo:', err);
            setErrorDeAdelanto(err.message || 'No se pudo leer el archivo');
            setAdelantoDeGina(null);
        }
    };

    /**
     * El Excel de cuatro pestanas.
     *
     * Las cuatro salen del MISMO calculo, cambiando solo que pedidos entran.
     * Van separadas porque responden preguntas distintas: dos dicen cuanto pide
     * el dia y dos cuanto falta poner en la olla hoy. Mezclarlas en una columna
     * dejaria la duda de si el numero ya trae el descuento, y esa duda se paga
     * cocinando de mas o de menos.
     */
    const handleExportarCuatroPestanas = async (wbCompartido = null) => {
        const enFecha = (f) => todosLosPedidos.filter(p => (calendarioDelPedido(p) || []).includes(f));

        // Las fechas marcadas como adelanto van recortadas a los recurrentes;
        // el resto entra completo.
        const fechasCompletas = fechas.filter(f => !fechasDeAdelanto.has(f));
        const fechasRecortadas = fechas.filter(f => fechasDeAdelanto.has(f));

        const pedidosCompletos = fechasCompletas.flatMap(enFecha);
        const pedidosRecortados = fechasRecortadas
            .flatMap(enFecha)
            .filter(p => esRecurrente(p, calendarioDelPedido))
            .filter(p => !familiaPermitida || familiaPermitida(p));

        // Un pedido que entrega en las dos fechas no puede contarse dos veces
        const sinRepetir = (lista) => {
            const vistos = new Set();
            return lista.filter(p => {
                const k = claveDePedido(p);
                if (vistos.has(k)) return false;
                vistos.add(k);
                return true;
            });
        };

        const armarRenglones = (bulk) => bulk
            .map(item => {
                const pide = cuantoCocinar(item);
                const hecho = Number(yaCocinado[claveDeProduccion(item.name, item.unit)]) || 0;
                return {
                    name: item.name,
                    unit: item.unit,
                    pide,
                    hecho,
                    falta: Math.max(0, pide - hecho),
                    cocinera: kitchenAssignments[item.name]?.trim() || 'SIN ASIGNAR',
                    empacaCocina: !!item.empacaCocina,
                    nota: item.empacaCocina
                        ? getKitchenPackingInstruction(item)
                        : (item.kitchenNotes || []).join(' | ')
                };
            })
            .filter(r => r.pide > 0
            );
        // El orden final —por unidad y de mayor a menor— lo pone la pestana:
        // es una decision de como se lee la hoja, no de que datos lleva.

        // La pestana 4 descuenta SIEMPRE, aunque la pantalla este en "sin rebaja":
        // para eso existe. `yaCocinado` sigue el interruptor de la pantalla, asi
        // que aca se arma el descuento aparte.
        const descuento = {};
        Object.entries(acumularCocinado(tandasPrevias)).forEach(([k, v]) => { descuento[k] = v; });
        Object.entries(adelantoDeGina?.cocinado || {}).forEach(([k, v]) => {
            descuento[k] = (descuento[k] || 0) + v;
        });
        const hayDescuento = Object.keys(descuento).length > 0;

        const armarRenglonesConDescuento = (bulk) => armarRenglones(bulk).map(r => {
            const hecho = Number(descuento[claveDeProduccion(r.name, r.unit)]) || 0;
            return { ...r, hecho, falta: Math.max(0, r.pide - hecho) };
        });

        const bulkCompletos = hojaDeCocinaDe(sinRepetir(pedidosCompletos));
        const bulkRecortados = hojaDeCocinaDe(sinRepetir(pedidosRecortados));
        const bulkTodo = hojaDeCocinaDe(sinRepetir([...pedidosCompletos, ...pedidosRecortados]));

        // "SABADO", "LUNES": el nombre del dia solo, para que la pestana se lea
        // de un vistazo. Excel corta los nombres largos a 31 caracteres.
        const diaCorto = (lista) => lista
            .map(f => new Date(f + 'T12:00:00')
                .toLocaleDateString('es-CR', { weekday: 'long' }).toUpperCase())
            .join(' y ') || 'SIN FECHA';

        const dia = (f) => {
            const d = new Date(f + 'T12:00:00');
            return d.toLocaleDateString('es-CR', { weekday: 'long', day: 'numeric', month: 'long' });
        };
        const etiquetaCompletas = fechasCompletas.map(dia).join(' y ') || 'sin fecha';
        const etiquetaRecortadas = fechasRecortadas.map(dia).join(' y ') || 'sin fecha';

        const wb = wbCompartido || new ExcelJS.Workbook();
        if (!wbCompartido) { wb.creator = 'BiKitchen'; wb.created = new Date(); }

        // El orden va de lo simple a lo compuesto: primero cada dia por su
        // cuenta, despues las dos juntas, y de ultimo lo que falta. Asi se puede
        // cotejar pestana por pestana sin tener que cruzar papeles.
        agregarPestanaDeCocina(wb, {
            titulo: `1 COCINA ${diaCorto(fechasCompletas)}`,
            explicacion: `TODO lo que piden los pedidos de ${etiquetaCompletas}. Cantidades completas, sin rebajar nada.`,
            renglones: armarRenglones(bulkCompletos)
        });

        // Las pestanas del adelanto solo existen si hay un dia que adelantar.
        // La hoja de un solo dia —el miercoles— las sacaba igual y quedaban
        // vacias y tituladas "2 COCINA SIN FECHA mensuales".
        const hayAdelanto = fechasRecortadas.length > 0;

        if (hayAdelanto) agregarPestanaDeCocina(wb, {
            titulo: `2 COCINA ${diaCorto(fechasRecortadas)} mensuales`,
            explicacion: `De ${etiquetaRecortadas}, SOLO los packs mensuales y quincenales (los de mas de una entrega, que ya estan pagados). Cantidades completas, sin rebajar nada.`,
            renglones: armarRenglones(bulkRecortados)
        });

        agregarPestanaDeCocina(wb, {
            titulo: '3 COCINA TODO JUNTO',
            explicacion: `Las pestanas 1 y 2 sumadas: ${etiquetaCompletas} completo mas los mensuales y quincenales de ${etiquetaRecortadas}. Cantidades completas, SIN rebajar nada. Esta es la lista entera de lo que hay que tener listo.`,
            renglones: armarRenglones(bulkTodo)
        });

        agregarPestanaDeCocina(wb, {
            titulo: '4 FALTA COCINAR',
            explicacion: hayDescuento
                ? 'Lo mismo de la pestana 3, menos lo que Gina ya cocino el jueves. La columna FALTA COCINAR es lo que hay que poner en la olla hoy.'
                : 'No se cargo el archivo del adelanto, asi que no hay nada que descontar: esta pestana es igual a la 3.',
            renglones: armarRenglonesConDescuento(bulkTodo),
            conDescuento: true
        });

        // ── El EMPAQUE, que es otra pregunta ──────────────────────────────
        // La cocina dice cuanto hacer de cada cosa; el empaque dice que le va a
        // cada cliente. Van en pestanas aparte porque se leen distinto y las usa
        // gente distinta.
        const paraEmpaque = (pedidos) => sinRepetir(pedidos).map(p => ({
            cliente: p.cliente,
            zona: p.zona || p.rawPedido?.zona_envio || '',
            paquete: p.plan || p.tipoMenu || '',
            cantidad: p.cantidadMenus || 1,
            entregas: (calendarioDelPedido(p) || []).length,
            // El MISMO filtro que las pestanas de packs: sin esto, en la pestana
            // 5 salia impreso "INTERNO: pago confirmado por Gina" al lado del
            // cliente, que no le dice a nadie que meter en la bolsa.
            observaciones: notaParaEmpaque(p.observaciones || p.rawPedido?.observaciones || '')
        }));

        agregarPestanaDeEmpaque(wb, {
            titulo: `5 EMPAQUE ${diaCorto(fechasCompletas)}`,
            explicacion: `Todos los pedidos de ${etiquetaCompletas}. Uno por cliente, con lo que lleva y sus cambios.`,
            clientes: paraEmpaque(pedidosCompletos)
        });

        if (hayAdelanto) agregarPestanaDeEmpaque(wb, {
            titulo: `6 EMPAQUE ${diaCorto(fechasRecortadas)} mensuales`,
            explicacion: `De ${etiquetaRecortadas}, SOLO los mensuales y quincenales, que son los que se alistan por adelantado. Estos hay que descontarlos de la hoja de ${etiquetaRecortadas} cuando llegue el dia, o se empacan dos veces.`,
            clientes: paraEmpaque(pedidosRecortados)
        });

        if (adelantoDeGina) agregarPestanaDeAvisos(wb, adelantoDeGina);

        if (wbCompartido) return;
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Hoja de cocina ${fechas.join(' y ')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    /**
     * El empaque de lo que se adelanta, en su propio archivo.
     *
     * Los mensuales y quincenales del lunes se empacan el sabado, junto con
     * todo lo del sabado. Quien empaca necesita esa lista SOLA: si va mezclada
     * con la del dia, se arman bolsas del lunes creyendo que salen hoy.
     *
     * Va agrupado por pack y no por cliente porque asi se arman las estaciones.
     */
    const handleExportarEmpaqueDelAdelanto = async (wbCompartido = null) => {
        const fechasRecortadas = fechas.filter(f => fechasDeAdelanto.has(f));
        if (fechasRecortadas.length === 0) {
            if (wbCompartido) return;   // en el archivo completo simplemente no va esa pestaña
            alert('Esta hoja no tiene ningun dia marcado como adelanto. '
                + 'Abrila con dos fechas —por ejemplo ?date=2026-09-05,2026-09-07— '
                + 'y del segundo dia se toman solo los mensuales y quincenales.');
            return;
        }

        const enAdelanto = new Set(
            todosLosPedidos
                .filter(p => (calendarioDelPedido(p) || []).some(f => fechasDeAdelanto.has(f)))
                .filter(p => esRecurrente(p, calendarioDelPedido))
                .filter(p => !familiaPermitida || familiaPermitida(p))
                .map(claveDePedido)
        );

        // Se usan los MISMOS grupos que muestra la pantalla —almuerzos y cenas
        // separados— para que el Excel y la hoja digan lo mismo.
        const grupos = Object.entries(packsMap)
            .map(([nombre, data]) => ({
                pack: nombre,
                clientes: (data.clientes || [])
                    .filter(c => enAdelanto.has(claveDePedido(c.rawPedido || c)))
                    .map(c => ({
                        cliente: c.nombre,
                        zona: c.zona_envio && c.zona_envio !== 'No especificada' ? c.zona_envio : '',
                        packs: Number(c.cantidad) > 0 ? Number(c.cantidad) : 1,
                        nota: notaParaEmpaque(c.observaciones)
                    }))
                    .sort((a, b) => String(a.cliente).localeCompare(String(b.cliente)))
            }))
            .filter(g => g.clientes.length > 0)
            .sort((a, b) => a.pack.localeCompare(b.pack));

        const wb = wbCompartido || new ExcelJS.Workbook();
        if (!wbCompartido) { wb.creator = 'BiKitchen'; wb.created = new Date(); }

        agregarPestanaDeEmpaquePorPack(wb, {
            titulo: `EMPAQUE ${fechasRecortadas.join(' y ')} (adelanto)`,
            explicacion: `Se empaca HOY, junto con lo del dia. SOLO los packs mensuales y quincenales de `
                + `${fechasRecortadas.join(' y ')}, que son los que ya estan pagados. `
                + `NO van desayunos ni individuales: esos se hacen el mismo dia de la entrega.`,
            grupos
        });

        if (wbCompartido) return;
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url2 = URL.createObjectURL(blob);
        const a2 = document.createElement('a');
        a2.href = url2;
        a2.download = `Empaque adelanto ${fechasRecortadas.join(' y ')}.xlsx`;
        document.body.appendChild(a2);
        a2.click();
        document.body.removeChild(a2);
        URL.revokeObjectURL(url2);
    };

    /**
     * UN archivo con todo lo de la hoja.
     *
     * Antes eran tres botones que sacaban tres Excel distintos —el formato de
     * Gina, el de cocina y el del empaque del adelanto— y habia que acordarse
     * de bajar los tres y de cual era cual. Ahora es un solo archivo, con las
     * pestanas en el orden en que se usan: primero lo que Gina lee para armar,
     * despues lo que hay que cocinar, y de ultimo lo que se empaca adelantado.
     */
    const handleDescargarTodo = async () => {
        setDescargando(true);
        try {
            const wb = new ExcelJS.Workbook();
            wb.creator = 'BiKitchen';
            wb.created = new Date();

            await handleExportToExcel(wb);
            await handleExportarCuatroPestanas(wb);
            await handleExportarEmpaqueDelAdelanto(wb);

            const buffer = await wb.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Hoja BiKitchen ${fechas.join(' y ')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('[Hoja] No se pudo armar el Excel:', err);
            alert('No se pudo armar el Excel: ' + err.message);
        } finally {
            setDescargando(false);
        }
    };

    const handleAssignCook = (itemName, cookName) => {
        cambiarAsignaciones(prev => ({ ...prev, [itemName]: cookName }));
    };

    const handleAssignCategory = (catName) => {
        const cook = (categoryCookInputs[catName] || '').trim().toUpperCase();
        if (!cook) return;
        const itemsInCat = bulkItems.filter(item => item.category === catName);
        const updates = {};
        itemsInCat.forEach(item => {
            updates[item.name] = cook;
        });
        cambiarAsignaciones(prev => ({ ...prev, ...updates }));
    };

    const handleAssignSelected = () => {
        const cook = bulkSelectedCook.trim().toUpperCase();
        if (!cook || selectedKitchenItems.length === 0) return;
        const updates = {};
        selectedKitchenItems.forEach(itemName => {
            updates[itemName] = cook;
        });
        cambiarAsignaciones(prev => ({ ...prev, ...updates }));
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
        cambiarAsignaciones(prev => ({ ...prev, ...asignaciones }));
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
                                onClick={() => { cambiarAsignaciones({}); setResumenReparto(null); }}
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
                                        {resumenReparto.sinAsignar.map((x, iAviso) => (
                                            <li key={`${x.nombre}-${iAviso}`}><b>{x.nombre}</b> — {x.motivo}</li>
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
                                            {itemsInCat.map((item, iItem) => {
                                                const isSelected = selectedKitchenItems.includes(item.name);
                                                const currentCook = kitchenAssignments[item.name] || '';
                                                const sugerencia = sugerirCocinera(item.name, TIPO_POR_CATEGORIA[item.category]);

                                                return (
                                                    <div
                                                        key={`${item.name}-${iItem}`}
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
        // Ya viene ordenado por tanda: primero lo de la familia mas grande.
        bulkOrdenado.forEach(item => {
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

                {/* EL PLAN DEL DIA.
                    Las cocineras van en paralelo, pero la tanda es un punto de
                    encuentro: Paula no puede empacar bajo calorias si le falta
                    el pure de Osmany. Ver quien carga mas ANTES de empezar deja
                    repartir distinto; verlo despues solo sirve para lamentarse. */}
                {(() => {
                    const quien = (item) => kitchenAssignments[item.name]?.trim()
                        || sugerirCocinera(item.name, TIPO_POR_CATEGORIA[item.category])?.cocinera
                        || '';
                    const carga = cargaPorTanda(bulkOrdenado, quien);
                    if (carga.length === 0) return null;
                    const nombres = [...new Set(carga.flatMap(c => Object.keys(c.porCocinera)))]
                        .sort((a, b) => (a === 'SIN ASIGNAR' ? 1 : b === 'SIN ASIGNAR' ? -1 : a.localeCompare(b)));

                    // overflow-x-auto en vez de overflow-hidden: con hidden, en el
                    // celular la tabla de 518px quedaba cortada y no se veia quien
                    // marca el ritmo de cada tanda. Ahora desliza.
                    return (
                        <div className="mb-8 border-2 border-black rounded overflow-x-auto print:overflow-hidden break-inside-avoid print:break-inside-avoid">
                            <div className="bg-gray-900 text-white p-2.5 font-bold uppercase tracking-wide text-sm">
                                🗓️ Plan del día — nadie pasa a la tanda siguiente hasta que todas terminen la de ahora
                            </div>
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="bg-gray-200 text-xs uppercase font-bold">
                                        <th className="border border-black p-2 text-left">Tanda</th>
                                        {nombres.map(n => (
                                            <th key={n} className="border border-black p-2 text-center">{n}</th>
                                        ))}
                                        <th className="border border-black p-2 text-center">Total</th>
                                        <th className="border border-black p-2 text-left">Marca el ritmo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {carga.map((c, i) => {
                                        const fam = ordenDeFamilias[c.tanda];
                                        const primera = i === 0;
                                        return (
                                            <tr key={`${c.tanda}-${c.menu}`} className={primera ? 'bg-amber-100 font-bold' : 'bg-white'}>
                                                <td className="border border-black p-2">
                                                    {fam ? `${fam.nombre} · menú ${c.menu}${c.menu === 2 ? ' (cenas)' : ''}` : 'Individuales y desayunos sueltos (nadie espera por ellos)'}
                                                    {primera && (
                                                        <div className="text-[11px] font-bold text-amber-800 normal-case">
                                                            Al terminar esta, Paula empieza a empacar
                                                        </div>
                                                    )}
                                                </td>
                                                {nombres.map(n => (
                                                    <td key={n} className="border border-black p-2 text-center">
                                                        {c.porCocinera[n] || ''}
                                                    </td>
                                                ))}
                                                <td className="border border-black p-2 text-center font-bold">{c.total}</td>
                                                <td className="border border-black p-2 text-xs">
                                                    {c.cuelloDeBotella
                                                        ? `${c.cuelloDeBotella.cocinera} — ${c.cuelloDeBotella.cuantas} preparaciones`
                                                        : ''}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    );
                })()}

                {renderKitchenConfig()}

                {/* Estado de la tanda: que lleva esta hoja y que ya se mando antes */}
                <div className="mb-6 border-2 border-black print:border rounded overflow-hidden">
                    <div className="bg-gray-900 text-white px-4 py-2 font-bold uppercase tracking-wide text-sm">
                        Hoja de cocina · {fechas.join('  +  ')}
                        {soloRecurrentes && ' · SOLO MENSUALES Y QUINCENALES'}
                    </div>
                    <div className="p-4 bg-white text-sm">
                        <b>{cleanOrders.length}</b> pedido{cleanOrders.length === 1 ? '' : 's'} para cocinar en esta hoja.
                        {yaEnLaCocina.length > 0 && (
                            <span className="text-gray-600"> · <b>{yaEnLaCocina.length}</b> ya se mandaron antes y no se repiten.</span>
                        )}
                        {canceladosYaCocinados.length > 0 && (
                            <div className="mt-2 text-red-700 font-bold">
                                Ojo: {canceladosYaCocinados.length} pedido(s) se cancelaron DESPUÉS de mandarse a cocinar
                                ({canceladosYaCocinados.join(', ')}). Esa comida ya está hecha: no la empaquen.
                            </div>
                        )}
                        {/* El boton se veia IGUAL antes y despues de apretarlo, asi
                            que no habia forma de saber si ya se habia hecho. Ahora
                            el recuadro dice en palabras que paso y que falta. */}
                        {(() => {
                            const enviadas = (tandasPrevias || [])
                                .map(t => t?.enviada).filter(Boolean).sort();
                            const ultima = enviadas[enviadas.length - 1];
                            const cuando = ultima
                                ? new Date(ultima).toLocaleString('es-CR', {
                                    weekday: 'long', day: 'numeric', month: 'long',
                                    hour: 'numeric', minute: '2-digit'
                                })
                                : null;
                            const nada = cleanOrders.length === 0;

                            return (
                                <div className="mt-3 print:hidden">
                                    {enviadas.length > 0 && (
                                        <div className="mb-2 text-xs text-green-800 bg-green-50 border border-green-300 rounded px-3 py-2">
                                            ✅ De este ciclo ya {enviadas.length === 1 ? 'mandaste 1 hoja' : `mandaste ${enviadas.length} hojas`}.
                                            {cuando && <> La última: <b>{cuando}</b>.</>}
                                            {yaEnLaCocina.length > 0 && <> Esos <b>{yaEnLaCocina.length}</b> pedidos ya no se repiten acá.</>}
                                        </div>
                                    )}
                                    {nada ? (
                                        <div className="text-xs text-gray-600 bg-gray-100 border border-gray-300 rounded px-3 py-2">
                                            No hay nada nuevo que cocinar: todo lo de este ciclo ya se le mandó a Gina.
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                onClick={marcarTandaEnviada}
                                                disabled={guardandoTanda}
                                                className="px-4 py-2 bg-black text-white text-xs font-bold uppercase rounded disabled:opacity-40"
                                            >
                                                {guardandoTanda ? 'Guardando…' : `Listo, ya le pasé estos ${cleanOrders.length} pedidos a Gina`}
                                            </button>
                                            <p className="mt-1.5 text-xs text-gray-500 max-w-xl">
                                                Apretalo <b>después</b> de mandarle la hoja. Sirve para que la hoja del día
                                                siguiente no le vuelva a pedir lo que ya cocinó. Si no lo apretás, no se
                                                daña nada: la próxima hoja sale con todo otra vez.
                                            </p>
                                        </>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                </div>

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
                                <div key={cook} className="break-inside-avoid print:break-inside-avoid overflow-x-auto print:overflow-visible">
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
                                            {conCabecerasDeTanda(
                                                agruparArroces(aplicarAjustes(items, ajustesCocina), cantidadACocinar),
                                                ordenDeFamilias
                                            ).map((fila, idx) => {
                                                // Por donde empezar. Es lo unico que le decia a la
                                                // cocinera cual es la meta de las primeras dos horas.
                                                if (fila.tipo === 'tanda') {
                                                    return (
                                                        <tr key={`tanda-${idx}`} className="bg-amber-100 border-y-2 border-black">
                                                            <td colSpan="4" className="p-2 text-sm font-black uppercase tracking-wide text-amber-900">
                                                                {fila.familia
                                                                    ? `TANDA ${fila.numero}${fila.paso} — ${fila.familia} · MENÚ ${fila.menu}${fila.menu === 2 ? ' (cenas)' : ''} · ${fila.packs} ${fila.packs === 1 ? 'pack' : 'packs'}`
                                                                    : 'AL FINAL — lo que no pertenece a ningún pack'}
                                                                {fila.saltadas?.length > 0 && (
                                                                    <div className="normal-case text-[11px] font-bold text-amber-800">
                                                                        {`No hay tanda ${fila.saltadas.map(x => x.numero).join(' ni ')}: las ollas de ${fila.saltadas.map(x => x.nombre).join(' y ')} ya salieron arriba, se comparten con una familia más grande.`}
                                                                    </div>
                                                                )}
                                                                {fila.esLaPrimera && (
                                                                    <span className="ml-3 font-bold normal-case text-xs text-amber-800">
                                                                        Empezar por acá. Al terminar el menú 1, Paula ya puede empacar.
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                }
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
                                                            {(() => {
                                                                // El numero se MUESTRA en la unidad elegida y se GUARDA en la
                                                                // del renglon. Asi Gina escribe "60 porciones" y el resto de
                                                                // la hoja —el granel, el Excel, la tanda— sigue leyendo
                                                                // gramos, sin que nadie tenga que acordarse de en que unidad
                                                                // estaba mirando.
                                                                const opciones = unidadesPosibles(item);
                                                                const guardada = ajustesCocina?.[claveDeRenglon(item.name, item.unit)]?.unidadVista;
                                                                const vista = opciones.includes(guardada) ? guardada : opciones[0];
                                                                const enBase = cantidadFinal(item, cantidadACocinar(item));
                                                                const mostrado = convertir({ ...item, totalQty: enBase }, vista);
                                                                const valor = mostrado === null ? enBase
                                                                    : (vista === 'kg' ? Math.round(mostrado * 10) / 10 : Math.ceil(mostrado - 0.0001));
                                                                return (
                                                                    <input
                                                                        type="number"
                                                                        step="any"
                                                                        className="w-20 text-center font-extrabold text-lg bg-transparent border-b border-dashed border-gray-400 focus:border-solid focus:border-sky-600 focus:outline-none print:border-none"
                                                                        value={valor}
                                                                        onChange={(e) => {
                                                                            const v = e.target.value;
                                                                            const enUnidadBase = v === '' ? null : desdeUnidad(item, v, vista);
                                                                            guardarAjuste(item.name, item.unit, {
                                                                                cantidad: enUnidadBase === null ? null : Math.round(enUnidadBase * 100) / 100
                                                                            });
                                                                        }}
                                                                        aria-label={`Cantidad a cocinar de ${item.name}`}
                                                                    />
                                                                );
                                                            })()}{' '}
                                                            {/* La unidad la elige quien lee: Gina manda la lasaña en
                                                                PORCIONES y la carne en KILOS. Solo se ofrecen las que
                                                                se pueden convertir de verdad — gramos y tazas no. */}
                                                            {(() => {
                                                                const opciones = unidadesPosibles(item);
                                                                const elegida = ajustesCocina?.[claveDeRenglon(item.name, item.unit)]?.unidadVista;
                                                                const actual = opciones.includes(elegida) ? elegida : opciones[0];
                                                                if (opciones.length < 2) {
                                                                    return item.unit === 'g' ? 'g' : item.unit.toUpperCase();
                                                                }
                                                                return (
                                                                    <select
                                                                        value={actual}
                                                                        onChange={(e) => guardarAjuste(item.name, item.unit, { unidadVista: e.target.value })}
                                                                        className="bg-transparent font-bold uppercase text-sm border-b border-dashed border-gray-400 focus:outline-none print:border-none print:appearance-none"
                                                                        aria-label={`Unidad de ${item.name}`}
                                                                    >
                                                                        {opciones.map(u => (
                                                                            <option key={u} value={u}>{UNIDADES[u]?.corta || u}</option>
                                                                        ))}
                                                                    </select>
                                                                );
                                                            })()}
                                                            {(() => {
                                                                // El equivalente en la otra unidad, chiquito debajo: sirve
                                                                // para comparar contra la lista de Gina sin dividir a mano.
                                                                const opciones = unidadesPosibles(item);
                                                                const elegida = ajustesCocina?.[claveDeRenglon(item.name, item.unit)]?.unidadVista;
                                                                const actual = opciones.includes(elegida) ? elegida : opciones[0];
                                                                const otra = opciones.find(u => u !== actual && u !== 'kg');
                                                                if (!otra) return null;
                                                                // El MISMO numero que el de arriba, que ya trae la merma.
                                                                // Con el crudo, el equivalente decia 5900 g donde la hoja
                                                                // pedia 7670 y parecian dos renglones distintos.
                                                                const base = cantidadFinal(item, cantidadACocinar(item));
                                                                const v = convertir({ ...item, totalQty: base }, otra);
                                                                if (v === null) return null;
                                                                return (
                                                                    <span className="block text-[9px] font-normal text-gray-500">
                                                                        = {Math.ceil(v - 0.0001)} {UNIDADES[otra]?.corta || otra}
                                                                    </span>
                                                                );
                                                            })()}
                                                            {(() => {
                                                                // Lo ya hecho y lo que pide toda la hornada. Con esto se
                                                                // decide adelantar: si el sabado y el lunes juntos piden
                                                                // 20 kg y hoy solo tocan 10, se pueden hacer los 20 de
                                                                // una y el viernes no los vuelve a pedir.
                                                                const hecho = Number(yaCocinado[claveDeProduccion(item.name, item.unit)]) || 0;
                                                                const semana = pideTodaLaSemana(item);
                                                                const pide = cuantoCocinar(item);
                                                                const u = item.unit === 'g' ? 'g' : item.unit;
                                                                if (!hecho && semana <= pide) return null;
                                                                return (
                                                                    <span className="block text-[9px] font-normal leading-tight">
                                                                        {hecho > 0 && (
                                                                            <span className="block text-green-700 font-bold">
                                                                                ya hecho: {Math.ceil(hecho)} {u}
                                                                            </span>
                                                                        )}
                                                                        {semana > pide && (
                                                                            <span className="block text-gray-500">
                                                                                toda la hornada: {Math.ceil(Math.max(0, semana - hecho))} {u}
                                                                            </span>
                                                                        )}
                                                                    </span>
                                                                );
                                                            })()}
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

    const handleExportToExcel = async (wbCompartido = null) => {
        try {
            if (typeof window !== 'undefined' && !window.Buffer) {
                // Ensuring Uint8Array fallback if Buffer is missing in browser
                window.Buffer = window.Buffer || Uint8Array;
            }

            const wb = wbCompartido || new ExcelJS.Workbook();
            wb.creator = wb.creator || 'BiKitchen System';
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

            const DIAS = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
            const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
                'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

            /** "SABADO 5 SEPTIEMBRE", tal como titula ella sus pestañas. */
            const nombreDelDia = (f, conMes = true) => {
                const d = new Date(`${f}T12:00:00`);
                if (Number.isNaN(d.getTime())) return String(f);
                return conMes
                    ? `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`
                    : `${DIAS[d.getDay()]} ${d.getDate()}`;
            };

            /**
             * El titulo de la pestaña del dia.
             *
             * Con dos fechas salia el `date` crudo —"Entregas del
             * 2026-09-05,2026-09-07"—, que no se lee y no dice cual es cual.
             */
            const etiquetaDia = fechas.length === 0
                ? 'PRODUCCION'
                : fechas.map((f, i) => nombreDelDia(f, i === fechas.length - 1)).join(' + ');

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
                // El MISMO filtro que la pestana de entregas. Antes las pestanas de
                // packs usaban solo `sanitizeNote`, que no bota las notas internas:
                // en la casilla de especificaciones de Melany Escalante salio
                // impreso "PAGO CONFIRMADO por Gina... la tarjeta habia salido
                // rechazada", que no le dice a nadie que meter en el envase y le
                // roba el espacio a la instruccion de verdad.
                notaParaEmpaque(sanitizeNote(sinSustituciones(c.observaciones)))
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

                const {
                    estandar: clientesEstandarDelBloque,
                    personalizados: conCambioDelBloque,
                    packsEstandar: packsEstandarDelBloque
                } = separarPersonalizadosDePack(packData.clientes || [], platos, packName);
                const { grupos: gruposDelBloque, propios: propiosDelBloque } =
                    agruparCambiosDePack(conCambioDelBloque);
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
                    // Los tres bloques, igual que en pantalla: el menu tal cual,
                    // los que cambiaron UN ingrediente (juntos los que pidieron el
                    // mismo cambio) y los de menu propio. Antes el Excel mandaba
                    // los clientes en una sola lista y quien empacaba tenia que
                    // cruzar cada nota con su fila.
                    totalPlatos: packsEstandarDelBloque,
                    clientes: clientesEstandarDelBloque.map(c => ({
                        etiqueta: etiquetaDeCliente(c),
                        notas: notasDeCliente(c, packName)
                    })),
                    gruposDeCambio: gruposDelBloque.map(g => ({
                        texto: g.texto,
                        total: g.total,
                        platos: g.platos,
                        clientes: g.clientes.map(c => ({ etiqueta: etiquetaDeCliente(c) }))
                    })),
                    personalizados: propiosDelBloque.map(c => ({
                        etiqueta: etiquetaDeCliente(c),
                        notas: notasDeCliente(c, packName),
                        texto: c.cambio?.texto || '',
                        platos: c.platos
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
            // Del EMPAQUE, no de la tanda de cocina. La tanda descuenta lo que ya
            // se mando a cocinar, y esta lista es para despachar: si sale de ahi,
            // faltan clientes que si aparecen en las pestanas de packs y la misma
            // hoja se contradice.
            /**
             * Para que dia es la comida de este cliente.
             *
             * Cuando la hoja cubre el sabado y el lunes se empacan las dos cosas
             * el mismo dia, y sin esta columna no hay como saber cual bolsa sale
             * hoy y cual es el adelanto que se guarda.
             */
            const diaDelPedido = (o) => {
                const suyas = (calendarioDelPedido(o) || []).filter(f => fechas.includes(f));
                if (suyas.length === 0) return '';
                return suyas
                    .map(f => nombreDelDia(f, false) + (fechasDeAdelanto.has(f) ? ' (adelanto)' : ''))
                    .join(' + ');
            };

            const entregas = pedidosParaEmpaque
                .map(o => ({
                    dia: diaDelPedido(o),
                    cliente: o.cliente,
                    zona: o.zona_envio,
                    paquete: o.plan || o.tipoMenu,
                    // Sin teléfonos ni notas de control: esta lista se usa para despachar
                    cambios: notaParaEmpaque(sanitizeNote(o.observaciones))
                }))
                // Primero por dia y despues por nombre: asi lo del sabado queda
                // junto y el adelanto del lunes aparte, que es como se empaca.
                .sort((a, b) => String(a.dia || '').localeCompare(String(b.dia || ''))
                    || String(a.cliente || '').localeCompare(String(b.cliente || '')));

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
            bulkOrdenado.forEach(item => {
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

            if (wbCompartido) return;
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

                {/* LOS CUATRO DIAS.
                    Cada hoja de la semana necesita una combinacion distinta de
                    fechas, adelanto, familia, vista y rebaja. Armarlas a mano es
                    lo que hizo que el 4 de setiembre la hoja saliera con un
                    tercio de las cantidades y Gina la tuviera que rehacer.
                    Aca cada boton deja todo puesto de una vez. */}
                {(() => {
                    const iso = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
                    const proximo = (dow) => {
                        const d = new Date(); d.setHours(12, 0, 0, 0);
                        for (let i = 0; i <= 7; i++) {
                            const x = new Date(d); x.setDate(x.getDate() + i);
                            if (x.getDay() === dow) return x;
                        }
                        return d;
                    };
                    const sab = proximo(6);
                    const lun = new Date(sab); lun.setDate(lun.getDate() + 2);
                    const mie = proximo(3);
                    const ciclo = `${iso(sab)},${iso(lun)}`;

                    const ir = (cfg) => {
                        const p = new URLSearchParams();
                        p.set('date', cfg.date);
                        if (cfg.adelanto) p.set('adelanto', cfg.adelanto);
                        if (cfg.soloPacks) p.set('soloPacks', cfg.soloPacks);
                        if (cfg.view) p.set('view', cfg.view);
                        setSearchParams(p);
                        // El jueves no hay nada que descontar todavia; el viernes
                        // y el sabado si, o se le vuelve a pedir a la cocina lo
                        // que ya hizo.
                        setSinRebaja(!cfg.rebajar);
                    };

                    const dias = [
                        {
                            t: 'MARTES', s: `Empaque y cocina del ${nombreDelDiaCorto(iso(mie))}`,
                            cfg: { date: iso(mie), rebajar: false }
                        },
                        // El adelanto son TODOS los mensuales y quincenales del lunes,
                        // no una sola familia. `esRecurrente` ya deja fuera los
                        // semanales; `soloPacks` era un recorte extra a bajo calorias
                        // que dejaba sin adelantar dos tercios de la comida del lunes.
                        // "El adelanto seria los paquetes mensuales y quincenales"
                        // — Jan, 9 de setiembre de 2026.
                        {
                            t: 'JUEVES', s: `Solo cocina · ${nombreDelDiaCorto(iso(sab))} + adelanto del ${nombreDelDiaCorto(iso(lun))}`,
                            cfg: { date: ciclo, adelanto: iso(lun), view: 'cocina', rebajar: false }
                        },
                        {
                            t: 'VIERNES', s: 'Empaque y cocina, descontando lo del jueves',
                            cfg: { date: ciclo, adelanto: iso(lun), rebajar: true }
                        },
                        {
                            t: 'SÁBADO', s: `Empaque del ${nombreDelDiaCorto(iso(lun))} y lo que falte de cocina`,
                            cfg: { date: ciclo, adelanto: iso(lun), rebajar: true }
                        }
                    ];

                    return (
                        <div className="max-w-3xl mx-auto mb-3 p-3 rounded-xl bg-white border-2 border-gray-200 print:hidden">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">¿Qué hoja vas a sacar hoy?</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {dias.map(d => (
                                    <button
                                        key={d.t}
                                        onClick={() => ir(d.cfg)}
                                        className="text-left p-2 rounded-lg border-2 border-gray-200 hover:border-bikitchen-orange hover:bg-orange-50 transition-colors"
                                    >
                                        <span className="block font-black text-sm text-gray-800">{d.t}</span>
                                        <span className="block text-[11px] text-gray-500 leading-tight mt-0.5">{d.s}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Que cubre esta hoja. Antes habia que armar la URL a mano y la
                    hoja salia con un tercio de las cantidades: Gina tuvo que
                    rehacerla entera el 4 de setiembre. */}
                {(() => {
                    const base = fechas[0];
                    const siguiente = fechas[1] || proximoDiaDeReparto(base);
                    if (!base || !siguiente) return null;
                    const sumado = fechas.length > 1;

                    const cambiar = (conAdelanto, familia) => {
                        const p = new URLSearchParams(searchParams);
                        p.set('date', conAdelanto ? `${base},${siguiente}` : base);
                        if (conAdelanto) p.set('adelanto', siguiente); else p.delete('adelanto');
                        if (conAdelanto && familia) p.set('soloPacks', familia); else p.delete('soloPacks');
                        setSearchParams(p);
                    };

                    // En una linea, lo que cubre la hoja. Los botones para
                    // cambiarlo solo aparecen si se piden.
                    const resumen = sumado
                        ? `${nombreDelDiaCorto(base)} completo + del ${nombreDelDiaCorto(siguiente)} ${soloPacks === 'bajoCalorias' ? 'solo los bajo calorías' : soloPacks === 'sinCarbos' ? 'solo los sin carbos' : 'los mensuales y quincenales'}`
                        : `solo ${nombreDelDiaCorto(base)}`;

                    return (
                        <div className="max-w-3xl mx-auto mb-3 p-3 rounded-xl bg-sky-50 border-2 border-sky-300 text-left">
                            <div className="flex items-start justify-between gap-3">
                                <p className="text-sm text-sky-900">
                                    Esta hoja cubre: <b>{resumen}</b>
                                    {!sinRebaja && <> · <b>descontando</b> lo que ya se cocinó</>}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setVerAjustes(v => !v)}
                                    className="shrink-0 text-xs font-bold text-sky-700 underline print:hidden"
                                >
                                    {verAjustes ? 'ocultar' : 'ajustar'}
                                </button>
                            </div>
                            <div className={verAjustes ? 'mt-3 pt-3 border-t border-sky-300' : 'hidden'}>
                            <label className="flex items-center gap-2 font-bold text-sky-900 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sumado}
                                    onChange={(e) => cambiar(e.target.checked, soloPacks)}
                                    className="w-4 h-4 accent-bikitchen-orange"
                                />
                                Sumar el adelanto del {nombreDelDiaCorto(siguiente)}
                            </label>
                            <p className="text-[11px] text-sky-800 mt-1 ml-6">
                                Del día que se adelanta van solo los packs mensuales y quincenales,
                                sin desayunos. Sin esto la hoja cocina únicamente para {nombreDelDiaCorto(base)}.
                            </p>
                            {sumado && (
                                <div className="mt-2 ml-6 flex flex-wrap items-center gap-2 text-sm">
                                    <span className="text-sky-900">Del {nombreDelDiaCorto(siguiente)} traer:</span>
                                    {[
                                        { v: '', t: 'Todos los mensuales y quincenales' },
                                        { v: 'bajoCalorias', t: 'Solo Bajo Calorías' },
                                        { v: 'sinCarbos', t: 'Solo Sin Carbos' }
                                    ].map(o => (
                                        <button
                                            key={o.v || 'todos'}
                                            onClick={() => cambiar(true, o.v)}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                                                soloPacks === o.v
                                                    ? 'bg-bikitchen-orange text-white'
                                                    : 'bg-white border border-sky-300 text-sky-800 hover:bg-sky-100'
                                            }`}
                                        >
                                            {o.t}
                                        </button>
                                    ))}
                                </div>
                            )}
                            </div>
                        </div>
                    );
                })()}
                <div className="flex flex-wrap items-center justify-center gap-3 mt-2 mb-3">
                    <div className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {viewMode === 'empaque' && 'Mostrando solo Hoja de Empaque'}
                        {viewMode === 'cocina' && 'Mostrando solo Hoja de Cocina'}
                    </div>
                </div>

                <RevisionHoja
                    revision={revisarHoja(cleanOrders, officialMenus, date)}
                    fusionados={fusionados}
                    // El menu tambien se revisa. El 8 de setiembre la hoja salio
                    // con los pedidos perfectos y el menu equivocado —el Sin
                    // Carbos con proteinas del pack vegetariano y las cenas con
                    // el menu de la semana pasada— y eso es igual de caro: se
                    // cocina lo que no era.
                    extra={[...problemasDelMenu({
                        menus: officialMenus,
                        fecha: fechas[0] || date
                    }), ...problemasParaLaHoja({
                        fecha: fechas[0] || date,
                        preparaciones: bulkItems,
                        // Los campos crudos viven en `rawPedido`: `cleanOrders`
                        // ya viene transformado para la hoja. Leerlos del nivel
                        // de arriba devolvia undefined y las revisiones daban
                        // cero sin fallar, que es la peor forma de fallar.
                        pedidos: cleanOrders.map(p => ({
                            id: p.rawPedido?.id || p.id,
                            cliente: p.cliente || p.nombre || '',
                            plan: p.plan || p.tipoMenu || '',
                            categoryLabel: p.categoryLabel || p.rawPedido?.categoryLabel || '',
                            numeroOrden: p.numeroOrden || p.rawPedido?.numeroOrden || p.id,
                            fechas: p.rawPedido?.fechas_entrega
                                || (p.rawPedido?.fecha_entrega ? [p.rawPedido.fecha_entrega] : []),
                            telefono: p.telefono || p.rawPedido?.telefono,
                            zona: p.zona || p.zona_envio || p.rawPedido?.zona_envio || p.rawPedido?.direccion,
                            esPack: !isActuallyIndividual(p.plan || p.tipoMenu || ''),
                            esDesayuno: isDesayunoPack(p.plan || p.tipoMenu || ''),
                            // Las proteinas elegidas viven DENTRO del item, en
                            // `proteinas`. Leerlas del nombre del item devolvia el
                            // nombre del pack y la revision acusaba a todo el mundo
                            // de no haber elegido nada.
                            platos: (p.rawPedido?.items || p.items || [])
                                .flatMap(i => (i?.proteinas?.length
                                    ? i.proteinas
                                    : [i?.nombre || i?.name || i?.planName || '']))
                                .filter(Boolean),
                            familias: familiasDelCliente.get(
                                String(p.cliente || p.nombre || '').trim().toLowerCase()
                            ) || []
                        }))
                    })]}
                    onArreglar={abrirEditor}
                    onArreglarMenu={(familia) => abrirMenu(
                        familia, false, `Menú ${familia}`,
                        cleanOrders.filter(o => mapPackNameToMenuKey(o.plan || o.tipoMenu || '') === familia).length
                    )}
                />

                {pedidoEnEdicion && (
                    <EditorDePedido
                        pedido={pedidoEnEdicion}
                        onGuardar={guardarEdicion}
                        onCancelarPedido={cancelarPedidoDeLaHoja}
                        onCerrar={() => setPedidoEnEdicion(null)}
                    />
                )}

                {packParaAgregar && (
                    <AgregarClienteAlPack
                        packName={packParaAgregar}
                        fecha={fechas[0] || date}
                        onGuardar={agregarClienteAlPack}
                        onCerrar={() => setPackParaAgregar(null)}
                    />
                )}

                {menuEnEdicion && (
                    <EditorDeMenu
                        familia={menuEnEdicion.familia}
                        titulo={menuEnEdicion.titulo}
                        esCena={menuEnEdicion.esCena}
                        platosIniciales={menuEnEdicion.platos}
                        cuantosClientes={menuEnEdicion.cuantosClientes}
                        onGuardar={guardarMenuEditado}
                        onCerrar={() => setMenuEnEdicion(null)}
                    />
                )}

                {viewMode !== 'cocina' && (
                    <div className="mt-4 flex flex-wrap justify-center gap-4">
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

                <div className="mt-6 flex flex-wrap justify-center gap-3 sm:gap-4">
                    <button
                        onClick={() => window.print()}
                        className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition shadow-lg flex items-center gap-2"
                    >
                        🖨️ Imprimir Documento
                    </button>
                    <button
                        onClick={handleDescargarTodo}
                        disabled={descargando}
                        className="px-8 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition shadow-lg flex items-center gap-2 disabled:opacity-60"
                        title="Un solo archivo: el formato de Gina, lo que hay que cocinar y el empaque del adelanto"
                    >
                        {descargando ? '⏳ Armando el archivo…' : '📊 Descargar Excel de la hoja'}
                    </button>

                    {fechas.length > 1 && (
                        <div className="w-full px-4 py-2 rounded-lg bg-sky-50 border-2 border-sky-300 text-sm text-sky-900">
                            <b>Qué trae esta hoja:</b>{' '}
                            {fechas.filter(f => !fechasDeAdelanto.has(f)).join(', ') || '—'} <b>completo</b>
                            {' · '}
                            {fechas.filter(f => fechasDeAdelanto.has(f)).join(', ') || '—'}{' '}
                            <b>solo mensuales y quincenales, sin desayunos</b>
                            {adelantoEnLaUrl.length === 0 && (
                                <span className="block text-[11px] mt-0.5">
                                    (no se indicó cuál día va recortado, así que se tomó el primero como completo)
                                </span>
                            )}
                        </div>
                    )}

                    <label className={`px-5 py-3 rounded-lg font-bold shadow cursor-pointer flex items-center gap-3 border-2 transition ${sinRebaja
                        ? 'bg-amber-100 border-amber-500 text-amber-900'
                        : 'bg-white border-gray-300 text-gray-700'}`}>
                        <input
                            type="checkbox"
                            checked={sinRebaja}
                            onChange={(e) => setSinRebaja(e.target.checked)}
                            className="w-5 h-5 cursor-pointer"
                        />
                        <span>
                            {sinRebaja ? 'Viendo TODO (sin rebajar)' : 'Viendo lo que FALTA'}
                            <span className="block text-[11px] font-normal">
                                {sinRebaja
                                    ? 'Las cantidades completas del dia'
                                    : 'Ya descontado lo que Gina cocino'}
                            </span>
                        </span>
                    </label>

                    <label className="px-5 py-3 bg-white border-2 border-indigo-300 text-indigo-900 rounded-lg font-bold hover:bg-indigo-50 transition shadow cursor-pointer flex items-center gap-2 text-sm">
                        📥 Cargar el adelanto de Gina
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleCargarAdelanto}
                            className="hidden"
                        />
                    </label>

                    {adelantoDeGina && (
                        <span className="text-sm text-green-800 font-semibold">
                            ✓ {adelantoDeGina.descontados.length} preparaciones descontadas
                            {adelantoDeGina.sinConvertir.length > 0 &&
                                ` · ${adelantoDeGina.sinConvertir.length} sin descontar (ver pestaña "Revisar a mano")`}
                        </span>
                    )}
                    {errorDeAdelanto && (
                        <span className="text-sm text-red-700 font-semibold">No se pudo leer: {errorDeAdelanto}</span>
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
                        // Cada familia se dibuja DOS veces: primero los packs que van
                        // TAL CUAL —de corrida, pum pum pum— y despues los que llevan un
                        // cambio escrito, que se arman uno por uno.
                        //
                        //   "Si son treinta y cuatro packs y treinta no tienen ningun
                        //    cambio, y cuatro si, se nos pueden enredar y perder esos
                        //    cuatro" — Jan, 9 de setiembre de 2026.
                        //
                        // La segunda pasada devuelve null cuando no hay ninguno, asi que
                        // una familia sin cambios se sigue viendo igual que siempre.
                        regularPackNames.flatMap((n) => [
                            { packName: n, soloConCambio: false },
                            { packName: n, soloConCambio: true }
                        ]).map(({ packName, soloConCambio }) => {
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

                            // Quien cambio un plato sale de esta tabla y va a la suya.
                            //
                            // La columna de platos y la de clientes van por su lado: el
                            // nombre de Guillermo Vargas caia en la fila del arroz aunque
                            // su cambio fuera de la tilapia, y el Plato 1 seguia contando
                            // 4 tilapias — una para el que no come tilapia.
                            // El nombre del pack hace falta para saber contra que
                            // composicion comparar: un "3 vegetales y 1 carbo" solo es
                            // personalizacion si NO es lo que ese pack lleva de fabrica.
                            const { estandar: estandarSinOrden, personalizados: clientesPropios } =
                                separarPersonalizadosDePack(packData.clientes, platosEmpaque, packName);
                            // De corrida por dia: primero los del sabado, que se cierran
                            // hoy; despues los del lunes, que van a refri.
                            const ordenados = porDiaDeEntrega(estandarSinOrden);
                            // Y aparte los que llevan un cambio ESCRITO en la nota, que la
                            // hoja no reconocia como cambio y se perdian entre los demas.
                            const partido = apartarCambiosEscritos(ordenados, (c) => c.observaciones);
                            const clientesEstandar = soloConCambio ? partido.conCambioEscrito : partido.sinCambio;
                            if (soloConCambio && clientesEstandar.length === 0) return null;
                            // MISMA formula que usaba `separarPersonalizadosDePack` para su
                            // `packsEstandar`, para que partir la familia en dos no cambie
                            // como se cuenta. `cantidadDePacks` cuenta distinto y bajaba los
                            // numeros de toda la hoja.
                            const packsEstandar = packsDe(clientesEstandar);
                            // Los que cambiaron algo NO son excepciones sueltas: si cinco
                            // pidieron el mismo cambio, son otra linea de cinco. Se agrupan
                            // por el cambio para poder armarlos de corrido igual que los
                            // estandar. Los de composicion propia van solos: su envase se
                            // arma distinto y no se puede juntar con nadie.
                            const { grupos: gruposDeCambio, propios: clientesDeMenuPropio } =
                                agruparCambiosDePack(clientesPropios);

                            return (
                                <div key={`empaque-${packName}-${soloConCambio ? "cambio" : "tal-cual"}`} className="pack-table-container mb-12 print:mb-0 print:break-after-page print:[page-break-after:always] break-inside-avoid print:break-inside-avoid">
                                    {/* ESTILO EXCEL */}
                                    {/* overflow-x-auto: en el celular la tabla mide 513px
                                        sobre una pantalla de 375 y quedaba CORTADA —no se
                                        veian ni Especificaciones ni Cliente—. Ahora desliza.
                                        En impresion vuelve a visible: el papel es apaisado y
                                        la tabla entra entera. */}
                                    {/* Sin clientes no se dibuja la tabla. Al partir la familia en dos
                                        hojas, la de "tal cual" puede quedar vacia —si TODOS llevan
                                        cambio— y salia una cabecera diciendo "AQUI VAN 0 PACKS"
                                        encima de una tabla sin nada. Los bloques de cambio y de menu
                                        propio siguen saliendo igual: son otra cosa. */}
                                    {clientesEstandar.length > 0 && (
                                    <div className="w-full overflow-x-auto print:overflow-visible">
                                        {/* Cabecera Tipo Excel (Amarillo) */}
                                        <div className="bg-yellow-400 text-black font-bold text-lg p-1.5 print:py-1 print:text-base border border-black text-center uppercase tracking-wide">
                                            {/* El numero de TANDA, el mismo que usa la cocina.
                                                Sin el, la hoja se lee "4 packs, 3 packs, 4 packs" y
                                                parece desordenada: cada tabla muestra solo su
                                                pedacito, pero el orden lo manda el total de la
                                                familia —almuerzos MAS cenas—. Con la tanda al
                                                frente, Paula ve que va en el mismo orden que la
                                                cocina y de mayor a menor. */}
                                            <span className="text-gray-900">TANDA {puestoDeFamilia(packName) + 1}</span>
                                            {'  —  '}
                                            {packName.replace(/\s*\d{1,3}(?:[.,]\d{3})*\s*(?:colones|col|¢)/i, '')}
                                            {soloConCambio && ' — CON CAMBIO'}
                                            {' '}
                                            <span className="text-gray-800 text-base print:text-sm">
                                                {(() => {
                                                    const fam = ordenDeFamilias[puestoDeFamilia(packName)];
                                                    // Los packs DE ESTE BLOQUE, no los de la familia: la
                                                    // familia se dibuja en dos hojas —los que van tal cual
                                                    // y los que llevan cambio— y las dos decian el total,
                                                    // asi que las dos ponian "30 packs" con 13 en una.
                                                    const suyos = `${packsEstandar} ${packsEstandar === 1 ? 'pack' : 'packs'}`;
                                                    // El numero que MANDA EL ORDEN va primero. Con el de la
                                                    // tabla adelante, la hoja se leia "4 packs, 3 packs,
                                                    // 4 packs" y parecia desordenada. Con el de la familia
                                                    // adelante se lee 5, 5, 4, 2, 1, 1: de mayor a menor.
                                                    return fam && fam.packs !== packsEstandar
                                                        ? `(${fam.packs} en la familia · aquí van ${suyos})`
                                                        : `(${suyos})`;
                                                })()}
                                            </span>
                                            {/* Meter un cliente que falta, sin salir de la hoja. Carlos H.
                                                Herrera no salio en la hoja del lunes porque se cargo con la
                                                entrega ya pasada. No se imprime: es para la pantalla. */}
                                            <button
                                                type="button"
                                                onClick={() => setPackParaAgregar(packName)}
                                                className="print:hidden ml-3 px-2.5 py-1 rounded-lg border-2 border-gray-800 bg-white text-gray-900 text-[11px] font-bold hover:bg-gray-100 align-middle"
                                                title={`Agregar un cliente a ${packName}`}
                                            >
                                                + Agregar cliente
                                            </button>
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
                                                const totalPlatos = packsEstandar * (p.vecesPorPack || 1);
                                                // Si alguien sale dos veces en ESTA tabla, cada linea dice
                                                // cual de sus pedidos es. Christian Vargas tiene dos packs
                                                // Regular a proposito y salian identicos: se leia duplicado.
                                                const marcasRepetido = marcasDePedidoRepetido(clientesEstandar);

                                                // Función para obtener la celda del cliente en base al índice absoluto de la fila
                                                const renderClientCells = (subRowIndex) => {
                                                    const absoluteRowIndex = idx * rowsPerPlate + subRowIndex;
                                                    const client = clientesEstandar[absoluteRowIndex];

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
                                                        let clientDisplayName = `${client.nombre} (${client.cantidad})${zoneStr}${diaDelCliente(client)}`;
                                                        if (client.rawPedido) {
                                                            const schedule = getScheduleFromOrder(client.rawPedido);
                                                            const dateIdx = schedule.indexOf(date);
                                                            if (schedule.length > 1 && dateIdx !== -1) {
                                                                clientDisplayName = `${client.nombre} (${client.cantidad}) (Semana ${dateIdx + 1})${zoneStr}`;
                                                            }
                                                        }
                                                        clientDisplayName += marcasRepetido[absoluteRowIndex] || '';

                                                        return (
                                                            <>
                                                                {/* La casilla de especificaciones tambien abre el pedido: es lo que
                                                                    Gina mas necesita cambiar, y buscarlo en otra pantalla era el
                                                                    camino largo. Se imprime igual que antes. */}
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle whitespace-pre-wrap text-xs print:text-[10px] leading-tight print:leading-tight">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => abrirEditor(client.rawPedido?.id, client.nombre)}
                                                                        title={`Cambiar las especificaciones de ${client.nombre}`}
                                                                        className="text-left w-full whitespace-pre-wrap hover:underline decoration-dotted underline-offset-2 hover:text-blue-700 print:hover:no-underline"
                                                                    >
                                                                        {notes || <span className="text-gray-300 print:hidden">+ especificación</span>}
                                                                    </button>
                                                                </td>
                                                                {/* El nombre es un boton: tocarlo abre SU pedido para arreglarlo sin
                                                                    salir de la hoja. Se ve y se imprime como texto; el subrayado
                                                                    solo aparece al pasar el mouse. */}
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle text-xs print:text-[11px] font-medium">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => abrirEditor(client.rawPedido?.id, client.nombre)}
                                                                        title={`Arreglar el pedido de ${client.nombre}`}
                                                                        className="text-left w-full hover:underline hover:text-blue-700 print:hover:no-underline"
                                                                    >
                                                                        {clientDisplayName}
                                                                    </button>
                                                                </td>
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
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1 font-medium bg-gray-50">
                                                                <CeldaEditable
                                                                    valor={p.proteina?.nombre || ''}
                                                                    titulo={`Proteína del plato ${p.numero} — cambia el menú de todos los que llevan este pack`}
                                                                    onGuardar={(v) => guardarCeldaDeMenu(packName, p.numero, 'proteina', v)}
                                                                />
                                                            </td>
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1 text-center bg-gray-50">{p.proteina?.gramosPorPorcion ? `${p.proteina.gramosPorPorcion}` : ''}</td>
                                                            <td className="border border-black p-1 print:py-0.5 print:px-1 text-center font-bold text-base print:text-sm align-middle" rowSpan={rowsPerPlate}>{totalPlatos}</td>
                                                            {renderClientCells(0)}
                                                        </tr>
                                                        {/* FILA 2: VEGETALES (el Paquete Deluxe no lleva) */}
                                                        {showVegetales && (
                                                            <tr>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 ">
                                                                <CeldaEditable
                                                                    valor={p.vegetal?.nombre || ''}
                                                                    titulo={`Vegetales del plato ${p.numero} — cambia el menú de todos los que llevan este pack`}
                                                                    onGuardar={(v) => guardarCeldaDeMenu(packName, p.numero, 'vegetal', v)}
                                                                />
                                                            </td>
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{p.vegetal?.cantidadPorPorcion ? `${p.vegetal.cantidadPorPorcion}` : ''}</td>
                                                                {renderClientCells(1)}
                                                            </tr>
                                                        )}
                                                        {/* FILA 3: CARBOS (si aplica) */}
                                                        {showCarbos && (
                                                            <tr className="break-inside-avoid">
                                                                <td className="border border-black p-1 print:py-0.5 print:px-1">
                                                                    <CeldaEditable
                                                                        valor={p.carbo?.nombre || ''}
                                                                        titulo={`Carbohidrato del plato ${p.numero} — cambia el menú de todos los que llevan este pack`}
                                                                        onGuardar={(v) => guardarCeldaDeMenu(packName, p.numero, 'carbo', v)}
                                                                    />
                                                                </td>
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
                                                if (clientesEstandar.length <= totalAvailableRows) return null;
                                                const extraClients = clientesEstandar.slice(totalAvailableRows);
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
                                                                    {/* La casilla de especificaciones tambien abre el pedido: es lo que
                                                                        Gina mas necesita cambiar, y buscarlo en otra pantalla era el
                                                                        camino largo. Se imprime igual que antes. */}
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle whitespace-pre-wrap text-xs print:text-[10px] leading-tight print:leading-tight">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => abrirEditor(client.rawPedido?.id, client.nombre)}
                                                                            title={`Cambiar las especificaciones de ${client.nombre}`}
                                                                            className="text-left w-full whitespace-pre-wrap hover:underline decoration-dotted underline-offset-2 hover:text-blue-700 print:hover:no-underline"
                                                                        >
                                                                            {notes || <span className="text-gray-300 print:hidden">+ especificación</span>}
                                                                        </button>
                                                                    </td>
                                                                    {/* El nombre es un boton: tocarlo abre SU pedido para arreglarlo sin
                                                                        salir de la hoja. Se ve y se imprime como texto; el subrayado
                                                                        solo aparece al pasar el mouse. */}
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle text-xs print:text-[11px] font-medium">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => abrirEditor(client.rawPedido?.id, client.nombre)}
                                                                            title={`Arreglar el pedido de ${client.nombre}`}
                                                                            className="text-left w-full hover:underline hover:text-blue-700 print:hover:no-underline"
                                                                        >
                                                                            {clientDisplayName}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                );
                                            })()}
                                        </table>
                                    </div>
                                    )}

                                    {/* BLOQUE 2: los que cambiaron UN ingrediente, agrupados por
                                        el cambio. Cinco que pidieron pure de papa se arman de
                                        corrido, como los estandar, no de a uno. */}
                                    {!soloConCambio && gruposDeCambio.map((grupo) => {
                                        // El mismo formato que la tabla amarilla: mismas columnas,
                                        // mismo orden y editable igual.
                                        //
                                        // Antes era otra tabla —Plato/Proteina/Vegetal/Carbo/En vez
                                        // de, todo horizontal— y por eso no tomaba ninguna funcion
                                        // de edicion: no tenia donde ponerlas. Lo que decia la
                                        // columna "En vez de" ahora va en Especificaciones, que es
                                        // donde quien empaca ya busca las instrucciones.
                                        const filasPorPlato = 1 + (showVegetales ? 1 : 0) + (showCarbos ? 1 : 0);
                                        const clientesDelGrupo = grupo.clientes;
                                        return (
                                        <div key={`cambio-${packName}-${grupo.clave}`} className="mt-6 print:mt-4 break-inside-avoid print:break-inside-avoid">
                                            <div className="bg-yellow-400 text-black font-bold text-lg p-1.5 print:py-1 print:text-base border border-black text-center uppercase tracking-wide">
                                                <span className="text-gray-900">TANDA {puestoDeFamilia(packName) + 1}</span>
                                                {'  —  '}
                                                {packName} — CON CAMBIO{' '}
                                                <span className="text-gray-800 text-base print:text-sm">
                                                    ({grupo.total} {grupo.total === 1 ? 'pack' : 'packs'})
                                                </span>
                                            </div>
                                            <div className="bg-[#fff2cc] text-black text-xs print:text-[10px] p-1.5 border-x border-b border-black">
                                                Todos estos llevan el mismo cambio: <strong>{grupo.texto}</strong>
                                            </div>

                                            <div className="w-full overflow-x-auto print:overflow-visible">
                                                <div className="border-x border-black bg-white flex flex-col text-xs print:text-[10px] font-bold w-full uppercase">
                                                    <div className="flex border-b border-black">
                                                        <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                        <div className="flex-1 p-0.5 px-1">{porcion.textoPorcion || `${getDefaultGrams(packName)} GRAMOS DE PROTEINA`}</div>
                                                    </div>
                                                    {showVegetales && (
                                                        <div className="flex border-b border-black">
                                                            <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                            <div className="flex-1 p-0.5 px-1">{`${porcion.vegetal} TAZA(S) DE VEGETALES`}</div>
                                                        </div>
                                                    )}
                                                    {showCarbos && (
                                                        <div className="flex border-b border-black">
                                                            <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                            <div className="flex-1 p-0.5 px-1">{`${porcion.carbo} TAZA(S) DE HARINA`}</div>
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
                                                            <th className="border border-black p-1 print:py-0.5 print:px-1 w-64 text-left">Cliente</th>
                                                        </tr>
                                                    </thead>
                                                    {grupo.platos.map((plato, idx) => {
                                                        // La parte que cambio va resaltada, igual que antes, y en
                                                        // Especificaciones queda escrito a que reemplaza.
                                                        const fondo = (parte) => plato.cambiada === parte ? 'bg-[#e2f0d9] font-bold' : '';
                                                        const enVezDe = plato.original
                                                            ? `** ${String(plato[plato.cambiada] || '').toUpperCase()} en vez de ${plato.original}`
                                                            : '';
                                                        return (
                                                            <tbody key={plato.numero} className="break-inside-avoid print:break-inside-avoid">
                                                                <tr>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 text-center font-bold align-middle" rowSpan={filasPorPlato}>Plato {plato.numero}</td>
                                                                    <td className={`border border-black p-1 print:py-0.5 print:px-1 font-medium bg-gray-50 ${fondo('proteina')}`}>{plato.proteina || ''}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 text-center bg-gray-50">{porcion.proteina || ''}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 text-center font-bold text-base print:text-sm align-middle" rowSpan={filasPorPlato}>{grupo.total}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle whitespace-pre-wrap text-xs print:text-[10px] leading-tight" rowSpan={filasPorPlato}>{enVezDe}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle whitespace-pre-wrap text-xs print:text-[11px] font-medium" rowSpan={filasPorPlato}>
                                                                        {idx === 0 && (() => {
                                                                            // La llave era el NOMBRE, y los dos pedidos de Christian
                                                                            // Vargas chocaban: React avisa que con llaves repetidas
                                                                            // puede duplicar U OMITIR elementos. Un cliente que
                                                                            // desaparece de la hoja es comida que no se empaca.
                                                                            const marcas = marcasDePedidoRepetido(clientesDelGrupo);
                                                                            return clientesDelGrupo.map((c, iCli) => {
                                                                            const zona = c.zona_envio && c.zona_envio !== 'No especificada' ? `, ${c.zona_envio}` : '';
                                                                            const cuantos = Number(c.cantidad) > 0 ? Number(c.cantidad) : 1;
                                                                            return (
                                                                                <button
                                                                                    key={llaveDeCliente(c, iCli)}
                                                                                    type="button"
                                                                                    onClick={() => abrirEditor(c.rawPedido?.id, c.nombre)}
                                                                                    title={`Arreglar el pedido de ${c.nombre}`}
                                                                                    className="block text-left w-full hover:underline hover:text-blue-700 print:hover:no-underline"
                                                                                >
                                                                                    {`${c.nombre} (${cuantos})${zona}${diaDelCliente(c)}${marcas[iCli] || ''}`}
                                                                                </button>
                                                                            );
                                                                            });
                                                                        })()}
                                                                    </td>
                                                                </tr>
                                                                {showVegetales && (
                                                                    <tr>
                                                                        <td className={`border border-black p-1 print:py-0.5 print:px-1 ${fondo('vegetal')}`}>{plato.vegetal || ''}</td>
                                                                        <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{porcion.vegetal ?? ''}</td>
                                                                    </tr>
                                                                )}
                                                                {showCarbos && (
                                                                    <tr>
                                                                        <td className={`border border-black p-1 print:py-0.5 print:px-1 ${fondo('carbo')}`}>{plato.carbo || ''}</td>
                                                                        <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{porcion.carbo ?? ''}</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        );
                                                    })}
                                                </table>
                                            </div>
                                        </div>
                                        );
                                    })}

                                    {/* BLOQUE 3: menu propio. Uno por cliente, porque el envase
                                        se arma distinto y no se puede juntar con nadie.
                                        Usa el MISMO formato que la tabla amarilla: antes era otra
                                        tabla horizontal y por eso no se podia editar nada ahi. */}
                                    {!soloConCambio && clientesDeMenuPropio.map((cliente) => {
                                        const zona = cliente.zona_envio && cliente.zona_envio !== 'No especificada'
                                            ? `, ${cliente.zona_envio}` : '';
                                        const cuantos = Number(cliente.cantidad) > 0 ? Number(cliente.cantidad) : 1;
                                        const filasPorPlato = 1 + (showVegetales ? 1 : 0) + (showCarbos ? 1 : 0);
                                        return (
                                            <div key={`propio-${packName}-${cliente.nombre}`} className="mt-6 print:mt-4 break-inside-avoid print:break-inside-avoid">
                                                <div className="bg-yellow-400 text-black font-bold text-lg p-1.5 print:py-1 print:text-base border border-black text-center uppercase tracking-wide">
                                                    <span className="text-gray-900">TANDA {puestoDeFamilia(packName) + 1}</span>
                                                    {'  —  '}
                                                    {packName} — MENÚ PROPIO{' '}
                                                    <span className="text-gray-800 text-base print:text-sm">({cuantos} {cuantos === 1 ? 'pack' : 'packs'})</span>
                                                </div>
                                                <div className="bg-[#fff2cc] text-black text-xs print:text-[10px] p-1.5 border-x border-b border-black">
                                                    No lleva el menú tal cual. Pidió: <strong>{cliente.cambio?.texto || ''}</strong>
                                                </div>

                                                <div className="w-full overflow-x-auto print:overflow-visible">
                                                    <div className="border-x border-black bg-white flex flex-col text-xs print:text-[10px] font-bold w-full uppercase">
                                                        <div className="flex border-b border-black">
                                                            <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                            <div className="flex-1 p-0.5 px-1">{porcion.textoPorcion || `${getDefaultGrams(packName)} GRAMOS DE PROTEINA`}</div>
                                                        </div>
                                                        {showVegetales && (
                                                            <div className="flex border-b border-black">
                                                                <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                                <div className="flex-1 p-0.5 px-1">{`${porcion.vegetal} TAZA(S) DE VEGETALES`}</div>
                                                            </div>
                                                        )}
                                                        {showCarbos && (
                                                            <div className="flex border-b border-black">
                                                                <div className="w-48 p-0.5 px-1 border-r border-black">CANTIDAD POR PLATO</div>
                                                                <div className="flex-1 p-0.5 px-1">{`${porcion.carbo} TAZA(S) DE HARINA`}</div>
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
                                                                <th className="border border-black p-1 print:py-0.5 print:px-1 w-64 text-left">Cliente</th>
                                                            </tr>
                                                        </thead>
                                                        {(cliente.platos || []).map((plato, idx) => (
                                                            <tbody key={plato.numero ?? idx} className="break-inside-avoid print:break-inside-avoid">
                                                                <tr>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 text-center font-bold align-middle" rowSpan={filasPorPlato}>Plato {plato.numero ?? idx + 1}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 font-medium bg-gray-50">{plato.proteina || ''}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 text-center bg-gray-50">{porcion.proteina || ''}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 text-center font-bold text-base print:text-sm align-middle" rowSpan={filasPorPlato}>{cuantos}</td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle whitespace-pre-wrap text-xs print:text-[10px] leading-tight" rowSpan={filasPorPlato}>
                                                                        {idx === 0 ? (() => {
                                                                            // Las mismas etiquetas que arma el bloque estandar.
                                                                            // `notasDeCliente` NO existe en este alcance: vive dentro
                                                                            // del armado del Excel, y usarlo aca tumbaba la hoja
                                                                            // entera con "notasDeCliente is not defined" apenas
                                                                            // aparecia un cliente con menu propio.
                                                                            const tags = etiquetasDeEmpaque(cliente, {
                                                                                esTwoPack: detectIsTwoPack(cliente.rawPedido || cliente),
                                                                                otrosPacks: getOtherPacksTag(cliente.nombre, packName)
                                                                            });
                                                                            const obs = sinSustituciones(cliente.observaciones);
                                                                            const lineas = tags.map(x => `** ${x}`);
                                                                            if (obs) lineas.push(`** ${obs}`);
                                                                            return lineas.join('\n');
                                                                        })() : ''}
                                                                    </td>
                                                                    <td className="border border-black p-1 print:py-0.5 print:px-1 align-middle text-xs print:text-[11px] font-medium" rowSpan={filasPorPlato}>
                                                                        {idx === 0 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => abrirEditor(cliente.rawPedido?.id, cliente.nombre)}
                                                                                title={`Arreglar el pedido de ${cliente.nombre}`}
                                                                                className="text-left w-full hover:underline hover:text-blue-700 print:hover:no-underline"
                                                                            >
                                                                                {`${cliente.nombre} (${cuantos})${zona}${diaDelCliente(cliente)}`}
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                                {showVegetales && (
                                                                    <tr>
                                                                        <td className="border border-black p-1 print:py-0.5 print:px-1">{plato.vegetal || ''}</td>
                                                                        <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{porcion.vegetal ?? ''}</td>
                                                                    </tr>
                                                                )}
                                                                {showCarbos && (
                                                                    <tr>
                                                                        <td className="border border-black p-1 print:py-0.5 print:px-1">{plato.carbo || ''}</td>
                                                                        <td className="border border-black p-1 print:py-0.5 print:px-1 text-center">{porcion.carbo ?? ''}</td>
                                                                    </tr>
                                                                )}
                                                            </tbody>
                                                        ))}
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
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
