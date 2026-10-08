/* global process */
/**
 * Netlify Scheduled Function: seguimiento-consulta
 *
 * Cada hora, de 8 a. m. a 8 p. m. de Costa Rica: a quien escribió por WhatsApp
 * hace 18 a 23,5 horas y no tiene un pedido vivo, un "¿te ayudo a escoger tu
 * pack?". Como cae dentro de las 24 h desde su último mensaje, va como mensaje
 * libre del bot (sin plantilla) y no lo cobra Meta como marketing. Uno por
 * persona cada 7 días (`seguimientoEn` en su ficha de kommo_contactos).
 * Quién: leTocaSeguimiento / tienePedidoVivo (src/utils/enviosDeVentas.js).
 *
 * Jan, 8 oct 2026: esta semana más de 50 personas preguntaron precios y planes;
 * el que pregunta y no recibe respuesta compra en otro lado.
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. SEGUIMIENTO_AUTOMATICO:
 *   (sin poner) / "no" → nada · "prueba" → UNA muestra a CAMBIOS_TELEFONO_PRUEBA
 *   y la lista real queda en envios_kommo · "si" → a todos.
 * Bot: KOMMO_BOT_SEGUIMIENTO (bot de Kommo con un mensaje de texto, SIN plantilla
 * y SIN disparador).
 *
 * Lecturas: las fichas de kommo_contactos con último mensaje en esa ventana
 * (consulta por rango) y, por cada una, sus pedidos (consulta `in` por teléfono).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { hoyEnCostaRica } from '../../src/utils/avisosDePago.js';
import { correrAviso, responder, COLECCION_CONSTANCIAS } from '../../src/utils/avisoDelDia.js';
import { variantesDeTelefono } from '../../src/utils/avisosDeEntrega.js';
import { noMolestarVigente } from '../../src/utils/kommoSync.js';
import {
    leTocaSeguimiento, tienePedidoVivo, SEGUIMIENTO_DESDE_HORAS, SEGUIMIENTO_HASTA_HORAS
} from '../../src/utils/enviosDeVentas.js';

export const TOPE = 40;
/** Horas de Costa Rica en que se manda (nadie quiere un "¿te ayudo?" a las 3 a. m.). */
export const DESDE_HORA = 8;
export const HASTA_HORA = 20;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[SeguimientoConsulta] Firebase init:', err.message);
}

const horaCr = (ahora) => (ahora.getUTCHours() + 24 - 6) % 24;

export const correr = async ({ ahora = new Date(), modo = process.env.SEGUIMIENTO_AUTOMATICO, base = db } = {}) => {
    const h = horaCr(ahora);
    if (h < DESDE_HORA || h > HASTA_HORA) return { estado: 'fuera-de-horario' };
    const hoy = hoyEnCostaRica(ahora);
    // En prueba: UNA muestra al día, no una por hora
    if (modo === 'prueba' && base) {
        const previa = await base.collection(COLECCION_CONSTANCIAS).doc(`seguimiento_${hoy}`).get();
        if (previa.exists && previa.data()?.estado === 'prueba') return { estado: 'prueba-ya-mandada-hoy' };
    }
    return correrAviso({
        tipo: 'seguimiento', clave: modo === 'prueba' ? hoy : ahora.toISOString().slice(0, 13), modo, tope: TOPE, db: base, ahora, env: process.env,
        bot: process.env.KOMMO_BOT_SEGUIMIENTO, variableBot: 'KOMMO_BOT_SEGUIMIENTO',
        enviarPorKommo, soloAlNumeroDePrueba,
        lista: async () => {
            const desde = new Date(ahora.getTime() - SEGUIMIENTO_HASTA_HORAS * 3600000).toISOString();
            const hasta = new Date(ahora.getTime() - SEGUIMIENTO_DESDE_HORAS * 3600000).toISOString();
            const snap = await base.collection('kommo_contactos')
                .where('ultimoEntrante', '>=', desde).where('ultimoEntrante', '<=', hasta).limit(200).get();
            const items = [];
            for (const doc of snap.docs) {
                const ficha = doc.data();
                if (!leTocaSeguimiento(ficha, { ahora, noMolestar: noMolestarVigente(ficha, ahora) })) continue;
                const variantes = variantesDeTelefono(doc.id);
                if (!variantes.length) continue;
                const pedidos = await base.collection('pedidos').where('telefono', 'in', variantes).limit(10).get();
                if (tienePedidoVivo(pedidos.docs.map(d => ({ id: d.id, ...d.data() })), hoy, ahora)) continue;
                items.push({ pedido: { id: doc.id, cliente: ficha.nombre || '', telefono: doc.id }, fecha: hoy, ultima: false });
            }
            return items;
        },
        // Que no le vuelva a llegar en 7 días
        despues: async (enviados) => {
            const tanda = base.batch();
            enviados.forEach(d => tanda.set(base.collection('kommo_contactos').doc(d.telefono), { seguimientoEn: ahora.toISOString() }, { merge: true }));
            await tanda.commit();
        }
    });
};

export default () => responder('SeguimientoConsulta', correr);

// Cada hora a los :15 (el código solo manda de 8 a. m. a 8 p. m. de Costa Rica)
export const config = {
    schedule: '15 * * * *'
};
