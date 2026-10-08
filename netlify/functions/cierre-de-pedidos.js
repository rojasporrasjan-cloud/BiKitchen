/* global process */
/**
 * Netlify Scheduled Function: cierre-de-pedidos
 *
 * Lunes, jueves y viernes a las 9 a. m. de Costa Rica (Jan, 8 oct 2026: a las 2 p. m.
 * era tarde, la gente tiene que poder responder desde temprano): "hoy cerramos pedidos a
 * las 8 p. m." a los clientes que YA compraron para ese día de reparto y esta
 * vez no tienen entrega. Lunes → miércoles, jueves → sábado, viernes → lunes.
 * Quién y las reglas: src/utils/cierresDePedidos.js.
 *
 * Es MARKETING (Meta lo cobra por mensaje). Reglas que no se negocian:
 *   - máximo 2 de marketing por persona por semana (cuenta en kommo_contactos)
 *   - nada a quien tiene "no molestar" vigente (30 días, lo pone kommo-sync)
 *   - presupuesto de US$200 al mes (kommo_presupuesto/{AAAA-MM}); si no alcanza, NO manda
 *   - con más de TOPE personas no manda NADA (un filtro roto no le escribe a todos)
 *   - una sola vez por fecha de reparto (envios_del_dia/cierre-pedidos_{fecha})
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. CIERRE_PEDIDOS_AUTOMATICO:
 *   (sin poner) / "no" → nada · "prueba" → UNA muestra a CAMBIOS_TELEFONO_PRUEBA
 *   y la lista real queda en envios_kommo · "si" → a todos.
 * Bots (plantillas aprobadas, SIN disparador): KOMMO_BOT_CIERRE_MIERCOLES,
 * KOMMO_BOT_CIERRE_SABADO, KOMMO_BOT_CIERRE_LUNES. Sin el bot de ese día, no sale.
 *
 * Lecturas (regla 17): los pedidos con entregas de las últimas 8 semanas hasta
 * el día del reparto (consulta por fechas, no la colección entera), las fichas
 * de kommo_contactos de los que quedaron (una por persona) y 2 documentos.
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { leerPedidosDelCiclo, destinatarioDeRenovacion, destinatariosUnicos } from '../../src/utils/envioDeCambios.js';
import { hoyEnCostaRica, sumarDias } from '../../src/utils/avisosDePago.js';
import { fechasEntre } from '../../src/utils/consultaPorFechas.js';
import { normalizarTelefono } from '../../src/utils/telefonoRelleno.js';
import { COLECCION_CONSTANCIAS, responder } from '../../src/utils/avisoDelDia.js';
import { entradaDeRegistro, anotarEnvio } from '../../src/utils/registroDeEnvios.js';
import {
    cierreDeHoy, clientesSinEntrega, conReglasDeMarketing, presupuestoDelMes,
    semanaIso, mesDe, SEMANAS_DE_HISTORIA
} from '../../src/utils/cierresDePedidos.js';

export const TOPE = 150;
const TIPO = 'cierre-pedidos';
/**
 * Con "si", el cierre manda de verdad DESDE este día. Antes sigue en prueba:
 * las promociones del 6 y 7 oct 2026 (HOY5, proteínas) no quedaron contadas en
 * kommo_contactos, y el cierre del viernes 9 le habría mandado la tercera de la
 * semana a la gente del lunes. El lunes 12 empieza una semana limpia.
 */
export const CIERRE_DE_VERDAD_DESDE = '2026-10-12';

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[CierreDePedidos] Firebase init:', err.message);
}

/** Las fichas de Kommo de esos teléfonos (una lectura por persona). */
export const leerFichas = async (base, telefonos = []) => {
    const tels = [...new Set(telefonos.map(normalizarTelefono).filter(t => t.length === 8))];
    if (!tels.length) return new Map();
    const refs = tels.map(t => base.collection('kommo_contactos').doc(t));
    const snaps = await base.getAll(...refs);
    return new Map(snaps.filter(s => s.exists).map(s => [s.id, s.data()]));
};

/**
 * Anota el marketing que salió: +1 en la semana de cada persona y el gasto del
 * mes. Lo usan también otros envíos de marketing (volver-a-invitar) y las
 * difusiones a mano del panel. `tipo` deja la fecha de ESE mensaje, para no
 * repetirlo antes de 14 días (conReglasDeMarketing).
 */
export const anotarMarketing = async (base, telefonos = [], ahora = new Date(), tipo = '') => {
    const hoy = hoyEnCostaRica(ahora);
    const semana = semanaIso(hoy);
    const tels = [...new Set(telefonos.map(normalizarTelefono).filter(t => t.length === 8))];
    for (let i = 0; i < tels.length; i += 400) {
        const tanda = base.batch();
        tels.slice(i, i + 400).forEach(t => tanda.set(base.collection('kommo_contactos').doc(t), {
            marketing: { [semana]: FieldValue.increment(1) },
            ultimaDifusion: ahora.toISOString(),
            ...(tipo ? { ultimoPorTipo: { [tipo]: ahora.toISOString() } } : {})
        }, { merge: true }));
        await tanda.commit();
    }
    if (tels.length) {
        await base.collection('kommo_presupuesto').doc(mesDe(hoy))
            .set({ mensajes: FieldValue.increment(tels.length), actualizado: ahora.toISOString() }, { merge: true });
    }
};

export const correr = async ({ ahora = new Date(), modo: modoPedido = process.env.CIERRE_PEDIDOS_AUTOMATICO, env = process.env } = {}) => {
    if (modoPedido !== 'si' && modoPedido !== 'prueba') return { estado: 'apagado' };
    const hoy = hoyEnCostaRica(ahora);
    const modo = modoPedido === 'si' && hoy < CIERRE_DE_VERDAD_DESDE ? 'prueba' : modoPedido;
    const cierre = cierreDeHoy(hoy);
    if (!cierre) return { estado: 'hoy-no-toca', detalle: { hoy } };

    const bot = env[cierre.bot];
    const faltan = ['KOMMO_SUBDOMINIO', 'KOMMO_TOKEN'].filter(v => !env[v]);
    if (!bot) faltan.push(cierre.bot);
    if (modo === 'prueba' && !env.CAMBIOS_TELEFONO_PRUEBA) faltan.push('CAMBIOS_TELEFONO_PRUEBA');
    if (faltan.length) return { estado: 'sin-configurar', detalle: { faltan } };
    if (!db) return { estado: 'sin-firestore' };

    const clave = cierre.fechaEntrega;
    const constancia = db.collection(COLECCION_CONSTANCIAS).doc(`${TIPO}_${clave}`);
    const previa = await constancia.get();
    if (previa.exists && previa.data()?.estado === 'enviado' && modo === 'si') {
        return { estado: 'ya-enviado', detalle: { clave } };
    }

    const fechas = fechasEntre(sumarDias(clave, -7 * SEMANAS_DE_HISTORIA), clave);
    const pedidos = await leerPedidosDelCiclo(db, fechas);
    const todos = destinatariosUnicos(clientesSinEntrega(pedidos, clave).map(destinatarioDeRenovacion));
    const fichas = await leerFichas(db, todos.map(d => d.telefono));
    const { quedan, fuera } = conReglasDeMarketing(todos, { fichas, hoy, ahora, tipo: TIPO });

    const anotar = (estado, extra = {}) => Promise.all([
        constancia.set({ estado, cuantos: quedan.length, fuera: fuera.length, revisadoEn: ahora.toISOString(), ...extra }, { merge: true }),
        anotarEnvio(db, entradaDeRegistro({ tipo: TIPO, modo, estado, ahora, lesHabriaLlegado: quedan, ...extra.registro }))
    ]);

    if (quedan.length === 0) {
        await constancia.set({ estado: 'nadie', fuera: fuera.length, revisadoEn: ahora.toISOString() }, { merge: true });
        return { estado: 'nadie', detalle: { clave, fuera: fuera.length } };
    }
    if (quedan.length > TOPE) {
        await anotar('frenado-por-tope');
        return { estado: 'frenado-por-tope', detalle: { cuantos: quedan.length } };
    }
    if (modo === 'si') {
        const gasto = await db.collection('kommo_presupuesto').doc(mesDe(hoy)).get();
        const p = presupuestoDelMes({ mensajesDelMes: Number(gasto.data()?.mensajes) || 0, cuantos: quedan.length });
        if (!p.alcanza) {
            await anotar('frenado-por-presupuesto');
            return { estado: 'frenado-por-presupuesto', detalle: p };
        }
    }

    const destinatarios = modo === 'prueba' ? soloAlNumeroDePrueba(quedan, '', clave) : quedan;
    const { conId } = await enviarPorKommo(destinatarios, {
        bot,
        camposIds: { entrega: env.KOMMO_CAMPO_ENTREGA, pack: env.KOMMO_CAMPO_PACK },
        segmentoId: TIPO
    });

    const estado = modo === 'si' ? 'enviado' : 'prueba';
    if (modo === 'si') await anotarMarketing(db, conId.map(c => c.d.telefono), ahora, TIPO);
    await constancia.set({ estado, enviadoEn: ahora.toISOString(), enviados: conId.length, cuantos: quedan.length, fuera: fuera.length }, { merge: true });
    await anotarEnvio(db, entradaDeRegistro({
        tipo: TIPO, modo, estado, ahora,
        enviados: conId.map(c => c.d), lesHabriaLlegado: modo === 'prueba' ? quedan : []
    }));
    return { estado, detalle: { cierre: cierre.nombre, fecha: clave, enviados: conId.length, fuera } };
};

export default () => responder('CierreDePedidos', correr);

// Lunes, jueves y viernes a las 15:00 UTC = 9:00 a. m. en Costa Rica
export const config = {
    schedule: '0 15 * * 1,4,5'
};
