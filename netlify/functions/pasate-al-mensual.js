/* global process */
/**
 * Netlify Scheduled Function: pasate-al-mensual
 *
 * Los martes a las 11 a. m. de Costa Rica: a quien compra pack SEMANAL (tuvo
 * entrega en los últimos 7 días o tiene una por venir) y no tiene un mensual
 * vivo, la oferta de pasarse al mensual con los desayunos de regalo el primer
 * mes (plantilla aprobada `pasate_al_mensual_desayunos`, bot 117990).
 * Quién: paraPasarseAlMensual (src/utils/enviosDeVentas.js).
 *
 * Es MARKETING: máximo 2 por persona por semana, nada a "no molestar".
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. PASATE_MENSUAL_AUTOMATICO:
 *   (sin poner) / "no" → nada · "prueba" → UNA muestra a CAMBIOS_TELEFONO_PRUEBA
 *   "si" → a todos. Bot: KOMMO_BOT_PASATE_MENSUAL.
 * Lecturas: los pedidos con entregas de hace 7 días a 6 semanas adelante.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { leerPedidosDelCiclo } from '../../src/utils/envioDeCambios.js';
import { hoyEnCostaRica, sumarDias } from '../../src/utils/avisosDePago.js';
import { fechasEntre } from '../../src/utils/consultaPorFechas.js';
import { correrAviso, responder } from '../../src/utils/avisoDelDia.js';
import { conReglasDeMarketing } from '../../src/utils/cierresDePedidos.js';
import { paraPasarseAlMensual } from '../../src/utils/enviosDeVentas.js';
import { leerFichas, anotarMarketing } from './cierre-de-pedidos.js';

export const TOPE = 60;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[PasateAlMensual] Firebase init:', err.message);
}

export const correr = ({ ahora = new Date(), modo = process.env.PASATE_MENSUAL_AUTOMATICO } = {}) => {
    const hoy = hoyEnCostaRica(ahora);
    return correrAviso({
        tipo: 'pasate-mensual', clave: hoy, modo, tope: TOPE, db, ahora, env: process.env,
        bot: process.env.KOMMO_BOT_PASATE_MENSUAL, variableBot: 'KOMMO_BOT_PASATE_MENSUAL',
        enviarPorKommo, soloAlNumeroDePrueba,
        lista: async () => paraPasarseAlMensual(await leerPedidosDelCiclo(db, fechasEntre(sumarDias(hoy, -7), sumarDias(hoy, 42))), hoy),
        filtrar: async (destinatarios) => {
            const fichas = await leerFichas(db, destinatarios.map(d => d.telefono));
            return conReglasDeMarketing(destinatarios, { fichas, hoy, ahora }).quedan;
        },
        despues: (enviados) => anotarMarketing(db, enviados.map(d => d.telefono), ahora)
    });
};

export default () => responder('PasateAlMensual', correr);

// Martes a las 17:00 UTC = 11:00 a. m. en Costa Rica
export const config = {
    schedule: '0 17 * * 2'
};
