/* global process */
/**
 * Netlify Scheduled Function: que-tal-todo
 *
 * El día después de cada reparto (domingo, martes y jueves) a las 11 a. m. de
 * Costa Rica: "¿qué tal todo?" a cada cliente NUEVO que ayer recibió su
 * primera entrega. Quién: nuevosQueRecibieronAyer (avisosDeEntrega.js).
 *
 * "Nuevo" = ese teléfono no tiene ningún otro pedido con entregas antes. Para
 * saberlo sin bajar la colección (regla 17), por cada candidato se buscan los
 * pedidos de su número con una consulta `in` (variantesDeTelefono).
 *
 * MANDA WHATSAPP REALES. Viene APAGADA. QUE_TAL_AUTOMATICO:
 *   (sin poner) / "no" → nada · "prueba" → UNA muestra a CAMBIOS_TELEFONO_PRUEBA
 *   "si" → a todos. Bot: KOMMO_BOT_QUE_TAL (plantilla `que_tal_todo`).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { enviarPorKommo, soloAlNumeroDePrueba } from './cambios-miercoles.js';
import { leerPedidosDelCiclo } from '../../src/utils/envioDeCambios.js';
import { hoyEnCostaRica, sumarDias } from '../../src/utils/avisosDePago.js';
import { nuevosQueRecibieronAyer, variantesDeTelefono } from '../../src/utils/avisosDeEntrega.js';
import { correrAviso, responder } from '../../src/utils/avisoDelDia.js';

export const TOPE = 30;

let db;
try {
    db = getFirestore(appDeAdmin());
} catch (err) {
    console.error('[QueTalTodo] Firebase init:', err.message);
}

/** Los pedidos de ayer y, por cada primera entrega, los demás pedidos de ese número. */
const lista = async (hoy) => {
    const ayer = sumarDias(hoy, -1);
    const deAyer = await leerPedidosDelCiclo(db, [ayer]);
    const candidatos = nuevosQueRecibieronAyer(deAyer, hoy, []);
    const historial = [...deAyer];
    for (const { pedido } of candidatos) {
        const variantes = variantesDeTelefono(pedido.telefono);
        if (variantes.length === 0) continue;
        const snap = await db.collection('pedidos').where('telefono', 'in', variantes).get();
        snap.docs.forEach(d => historial.push({ id: d.id, ...d.data() }));
    }
    return nuevosQueRecibieronAyer(deAyer, hoy, historial);
};

export const correr = ({ ahora = new Date(), modo = process.env.QUE_TAL_AUTOMATICO } = {}) => {
    const hoy = hoyEnCostaRica(ahora);
    return correrAviso({
        tipo: 'que-tal', clave: hoy, modo, tope: TOPE, db, ahora, env: process.env,
        bot: process.env.KOMMO_BOT_QUE_TAL, variableBot: 'KOMMO_BOT_QUE_TAL',
        enviarPorKommo, soloAlNumeroDePrueba,
        lista: () => lista(hoy)
    });
};

export default () => responder('QueTalTodo', correr);

// Domingo, martes y jueves a las 17:00 UTC = 11:00 a. m. en Costa Rica
export const config = {
    schedule: '0 17 * * 0,2,4'
};
