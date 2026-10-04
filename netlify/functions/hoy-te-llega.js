/* global process */
/**
 * Netlify Scheduled Function: hoy-te-llega
 *
 * Los días de reparto (lunes, miércoles y sábado) a las 7 a. m. de Costa Rica:
 * "hoy te llega tu pedido entre 9 a. m. y 2 p. m." a cada cliente con entrega
 * HOY. Baja los chats de "¿a qué hora llega?". Quién: entreganHoy
 * (avisosDeEntrega.js) — pagados y no cancelados.
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. HOY_TE_LLEGA_AUTOMATICO:
 *   (sin poner) / "no" → nada · "prueba" → UNA muestra a CAMBIOS_TELEFONO_PRUEBA
 *   "si" → a todos. Bot: KOMMO_BOT_HOY_TE_LLEGA (plantilla `hoy_te_llega`).
 * Lecturas: solo los pedidos de hoy (las dos consultas de la hoja).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { leerPedidosDelCiclo } from '../../src/utils/envioDeCambios.js';
import { hoyEnCostaRica } from '../../src/utils/avisosDePago.js';
import { entreganHoy } from '../../src/utils/avisosDeEntrega.js';
import { correrAviso, responder } from '../../src/utils/avisoDelDia.js';

export const TOPE = 150;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[HoyTeLlega] Firebase init:', err.message);
}

export const correr = ({ ahora = new Date(), modo = process.env.HOY_TE_LLEGA_AUTOMATICO } = {}) => {
    const hoy = hoyEnCostaRica(ahora);
    return correrAviso({
        tipo: 'hoy-te-llega', clave: hoy, modo, tope: TOPE, db, ahora, env: process.env,
        bot: process.env.KOMMO_BOT_HOY_TE_LLEGA, variableBot: 'KOMMO_BOT_HOY_TE_LLEGA',
        enviarPorKommo, soloAlNumeroDePrueba,
        lista: async () => entreganHoy(await leerPedidosDelCiclo(db, [hoy]), hoy)
    });
};

export default () => responder('HoyTeLlega', correr);

// Lunes, miércoles y sábado a las 13:00 UTC = 7:00 a. m. en Costa Rica
export const config = {
    schedule: '0 13 * * 1,3,6'
};
