/* global process */
/**
 * Netlify Scheduled Function: menu-de-la-semana
 *
 * Los lunes a las 4 p. m. de Costa Rica (el menú nuevo se sube el lunes): el
 * menú de la semana, con la plantilla de SU tipo de pack (keto, bajo en
 * calorías, casaditos, familiar), a quien compró ese tipo y su última entrega
 * fue hace 3 a 8 semanas sin nada después. Los de 2–3 semanas ya reciben
 * "volver a invitar"; los que tienen pack vivo reciben el link de cambios.
 * Quién: paraMenuDeLaSemana (src/utils/enviosDeVentas.js).
 *
 * Es MARKETING: máximo 2 por persona por semana, nada a "no molestar".
 * Ojo: si Gina no pasó el menú nuevo a tiempo, mejor dejarlo apagado esa semana.
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. MENU_SEMANA_AUTOMATICO:
 *   (sin poner) / "no" → nada · "prueba" → UNA muestra por tipo a CAMBIOS_TELEFONO_PRUEBA
 *   "si" → a todos. Un bot por tipo: KOMMO_BOT_MENU_KETO, KOMMO_BOT_MENU_BAJO_CALORIAS,
 *   KOMMO_BOT_MENU_CASADITOS, KOMMO_BOT_MENU_FAMILIAR (sin el bot, ese tipo no sale).
 * Lecturas: los pedidos con entregas de hace 8 semanas a 6 semanas adelante.
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { leerPedidosDelCiclo } from '../../src/utils/envioDeCambios.js';
import { hoyEnCostaRica, sumarDias } from '../../src/utils/avisosDePago.js';
import { fechasEntre } from '../../src/utils/consultaPorFechas.js';
import { correrAviso, responder } from '../../src/utils/avisoDelDia.js';
import { conReglasDeMarketing } from '../../src/utils/cierresDePedidos.js';
import { paraMenuDeLaSemana, FAMILIAS_DE_MENU, MENU_DESDE_SEMANAS } from '../../src/utils/enviosDeVentas.js';
import { leerFichas, anotarMarketing } from './cierre-de-pedidos.js';

export const TOPE = 80;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[MenuDeLaSemana] Firebase init:', err.message);
}

export const correr = async ({ ahora = new Date(), modo = process.env.MENU_SEMANA_AUTOMATICO } = {}) => {
    if (modo !== 'si' && modo !== 'prueba') return { estado: 'apagado' };
    const hoy = hoyEnCostaRica(ahora);
    let grupos = null;
    const resultados = {};
    for (const fam of FAMILIAS_DE_MENU) {
        resultados[fam.id] = await correrAviso({
            tipo: 'menu-semana', clave: `${hoy}-${fam.id}`, modo, tope: TOPE, db, ahora, env: process.env,
            bot: process.env[fam.bot], variableBot: fam.bot,
            enviarPorKommo, soloAlNumeroDePrueba,
            // Los pedidos se leen una vez para los cuatro tipos
            lista: async () => {
                if (!grupos) {
                    const fechas = fechasEntre(sumarDias(hoy, -7 * MENU_DESDE_SEMANAS), sumarDias(hoy, 42));
                    grupos = paraMenuDeLaSemana(await leerPedidosDelCiclo(db, fechas), hoy);
                }
                return grupos[fam.id] || [];
            },
            filtrar: async (destinatarios) => {
                const fichas = await leerFichas(db, destinatarios.map(d => d.telefono));
                return conReglasDeMarketing(destinatarios, { fichas, hoy, ahora }).quedan;
            },
            despues: (enviados) => anotarMarketing(db, enviados.map(d => d.telefono), ahora)
        });
    }
    return { estado: 'ok', detalle: resultados };
};

export default () => responder('MenuDeLaSemana', correr);

// Lunes a las 22:00 UTC = 4:00 p. m. en Costa Rica
export const config = {
    schedule: '0 22 * * 1'
};
