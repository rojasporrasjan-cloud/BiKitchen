/**
 * Netlify Scheduled Function: ventas-por-envio
 *
 * Todas las noches (11:30 p. m. de Costa Rica) calcula cuánto vendió cada
 * WhatsApp que salió a clientes en los últimos 30 días: quién de los que lo
 * recibieron hizo un pedido en las 72 horas siguientes y por cuánto. El cálculo
 * vive en src/utils/ventasPorEnvio.js.
 *
 * Lo guarda en UN documento, `kommo_estadisticas/ventas`. El panel (Listas de
 * Difusión) lo lee con la función `kommo` en una sola lectura. El botón
 * "Recalcular" del panel corre esto mismo a pedido.
 *
 * NO manda nada. Lecturas (regla 17): los envíos de los últimos 30 días
 * (`envios_kommo`, por fecha) y los pedidos con entregas desde el primer envío
 * hasta 6 semanas adelante (consulta por fechas, no la colección entera).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { leerPedidosDelCiclo } from '../../src/utils/envioDeCambios.js';
import { hoyEnCostaRica, sumarDias } from '../../src/utils/avisosDePago.js';
import { fechasEntre } from '../../src/utils/consultaPorFechas.js';
import { responder } from '../../src/utils/avisoDelDia.js';
import { COLECCION_ENVIOS } from '../../src/utils/registroDeEnvios.js';
import {
    resumenDeVentas, totalesPorTipo, enviosQueCuentan, msDeFecha, HORAS_DE_VENTA, DIAS_DE_HISTORIA
} from '../../src/utils/ventasPorEnvio.js';

export const COLECCION_ESTADISTICAS = 'kommo_estadisticas';
export const DOC_VENTAS = 'ventas';

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[VentasPorEnvio] Firebase init:', err.message);
}

/** Calcula y guarda. `base` es el Firestore de administrador (se pasa en las pruebas). */
export const calcularVentas = async (base = db, ahora = new Date()) => {
    if (!base) return { estado: 'sin-firestore' };
    const desde = new Date(ahora.getTime() - DIAS_DE_HISTORIA * 24 * 3600 * 1000).toISOString();
    const snap = await base.collection(COLECCION_ENVIOS).where('cuando', '>=', desde).get();
    const registro = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const cuentan = enviosQueCuentan(registro);

    let pedidos = [];
    if (cuentan.length) {
        const primero = Math.min(...cuentan.map(e => msDeFecha(e.cuando)));
        const hoy = hoyEnCostaRica(ahora);
        pedidos = await leerPedidosDelCiclo(base, fechasEntre(hoyEnCostaRica(new Date(primero)), sumarDias(hoy, 42)));
    }

    const envios = resumenDeVentas(cuentan, pedidos);
    const resultado = {
        calculadoEn: ahora.toISOString(),
        dias: DIAS_DE_HISTORIA,
        horas: HORAS_DE_VENTA,
        envios,
        porTipo: totalesPorTipo(envios),
        leidos: { envios: registro.length, pedidos: pedidos.length }
    };
    await base.collection(COLECCION_ESTADISTICAS).doc(DOC_VENTAS).set(resultado);
    return { estado: 'ok', detalle: { envios: envios.length, pedidosLeidos: pedidos.length } };
};

export default () => responder('VentasPorEnvio', () => calcularVentas());

// Todos los días a las 05:30 UTC = 11:30 p. m. en Costa Rica
export const config = {
    schedule: '30 5 * * *'
};
