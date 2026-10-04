/* global process */
/**
 * Netlify Scheduled Function: guia-de-congelado
 *
 * Los días de reparto a las 3 p. m. de Costa Rica (ya entregado): la tarjeta
 * de cómo guardar el pack y en qué orden comer los platos, a cada pedido cuya
 * PRIMERA entrega fue hoy. Quién: primeraEntregaHoy (avisosDeEntrega.js).
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. GUIA_CONGELADO_AUTOMATICO:
 *   (sin poner) / "no" → nada · "prueba" → UNA muestra a CAMBIOS_TELEFONO_PRUEBA
 *   "si" → a todos. Bot: KOMMO_BOT_GUIA_CONGELADO (plantilla `guia_de_congelado`,
 *   con la tarjeta como imagen).
 * Lecturas: solo los pedidos de hoy.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { leerPedidosDelCiclo } from '../../src/utils/envioDeCambios.js';
import { hoyEnCostaRica } from '../../src/utils/avisosDePago.js';
import { primeraEntregaHoy } from '../../src/utils/avisosDeEntrega.js';
import { correrAviso, responder } from '../../src/utils/avisoDelDia.js';

export const TOPE = 80;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[GuiaDeCongelado] Firebase init:', err.message);
}

export const correr = ({ ahora = new Date(), modo = process.env.GUIA_CONGELADO_AUTOMATICO } = {}) => {
    const hoy = hoyEnCostaRica(ahora);
    return correrAviso({
        tipo: 'guia-congelado', clave: hoy, modo, tope: TOPE, db, ahora, env: process.env,
        bot: process.env.KOMMO_BOT_GUIA_CONGELADO, variableBot: 'KOMMO_BOT_GUIA_CONGELADO',
        enviarPorKommo, soloAlNumeroDePrueba,
        lista: async () => primeraEntregaHoy(await leerPedidosDelCiclo(db, [hoy]), hoy)
    });
};

export default () => responder('GuiaDeCongelado', correr);

// Lunes, miércoles y sábado a las 21:00 UTC = 3:00 p. m. en Costa Rica
export const config = {
    schedule: '0 21 * * 1,3,6'
};
