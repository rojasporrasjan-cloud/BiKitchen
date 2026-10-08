/* global process */
/**
 * Netlify Scheduled Function: volver-a-invitar
 *
 * Los martes a las 10 a. m. de Costa Rica: a quien recibió su ÚLTIMA entrega
 * hace 2 a 3 semanas y no volvió a pedir, una invitación a volver. Como corre
 * una vez por semana y la ventana es de 7 días, a cada cliente le llega una
 * sola vez. Quién: paraVolverAInvitar (avisosDeEntrega.js).
 *
 * Es MARKETING: Meta lo cobra por mensaje y puede no entregarlo si la persona
 * recibió muchas promociones. Por eso el tope es bajo.
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. VOLVER_A_INVITAR_AUTOMATICO:
 *   (sin poner) / "no" → nada · "prueba" → UNA muestra a CAMBIOS_TELEFONO_PRUEBA
 *   "si" → a todos. Bot: KOMMO_BOT_VOLVER_A_INVITAR (plantilla `volver_a_invitar`).
 * Lecturas: los pedidos con entregas de hace 3 semanas a 6 semanas adelante
 * (para saber quién ya volvió), no la colección entera.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { leerPedidosDelCiclo } from '../../src/utils/envioDeCambios.js';
import { hoyEnCostaRica, sumarDias } from '../../src/utils/avisosDePago.js';
import { fechasEntre } from '../../src/utils/consultaPorFechas.js';
import { paraVolverAInvitar, INVITAR_DESDE_DIAS } from '../../src/utils/avisosDeEntrega.js';
import { correrAviso, responder } from '../../src/utils/avisoDelDia.js';
import { conReglasDeMarketing } from '../../src/utils/cierresDePedidos.js';
import { leerFichas, anotarMarketing } from './cierre-de-pedidos.js';

export const TOPE = 40;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[VolverAInvitar] Firebase init:', err.message);
}

export const correr = ({ ahora = new Date(), modo = process.env.VOLVER_A_INVITAR_AUTOMATICO } = {}) => {
    const hoy = hoyEnCostaRica(ahora);
    return correrAviso({
        tipo: 'volver-a-invitar', clave: hoy, modo, tope: TOPE, db, ahora, env: process.env,
        bot: process.env.KOMMO_BOT_VOLVER_A_INVITAR, variableBot: 'KOMMO_BOT_VOLVER_A_INVITAR',
        enviarPorKommo, soloAlNumeroDePrueba,
        lista: async () => {
            const fechas = fechasEntre(sumarDias(hoy, -INVITAR_DESDE_DIAS), sumarDias(hoy, 42));
            return paraVolverAInvitar(await leerPedidosDelCiclo(db, fechas), hoy);
        },
        // Marketing: máximo 2 por semana por persona y nada a "no molestar"
        filtrar: async (destinatarios) => {
            const fichas = await leerFichas(db, destinatarios.map(d => d.telefono));
            return conReglasDeMarketing(destinatarios, { fichas, hoy, ahora, tipo: 'volver-a-invitar' }).quedan;
        },
        despues: (enviados) => anotarMarketing(db, enviados.map(d => d.telefono), ahora, 'volver-a-invitar')
    });
};

export default () => responder('VolverAInvitar', correr);

// Martes a las 16:00 UTC = 10:00 a. m. en Costa Rica
export const config = {
    schedule: '0 16 * * 2'
};
