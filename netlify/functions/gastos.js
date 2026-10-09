/* global process */
/**
 * Netlify Serverless Function: gastos
 *
 * Gina anota cada gasto desde su celular con un link (Jan, 9 oct 2026: "Gina va
 * a meter todos los gastos de ahora en adelante, de una manera sencilla").
 * Jan los ve en el panel → Gastos, y salen en el control de cada semana.
 *
 * CON EL CÓDIGO DEL LINK (sin sesión) o CON SESIÓN DE ADMIN (Gina o Jan en el panel):
 *   { accion: 'lista', desde, hasta }                → los gastos de esas fechas
 *   { accion: 'guardar', idGasto, gasto }            → guarda o corrige un gasto
 *   { accion: 'borrar', id }                         → borra un gasto
 * SOLO EL DUEÑO:
 *   { accion: 'link' }                               → el link para Gina
 * Jan (9 oct): Gina es la que mete los gastos, así que en el panel las admins
 * también anotan, corrigen y borran.
 *
 * El link tiene su propio código (no abre el reloj ni la planilla). `idGasto` lo
 * inventa el celular una vez por gasto: un reintento con mala señal no lo duplica.
 * Regla 17: nunca más de dos meses de gastos en una consulta.
 */
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { firmaDeLink, mismoCodigo, rolDeSesion, respuesta as json } from '../../src/utils/accesoServidor.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { validarGasto } from '../../src/utils/gastos.js';

let db;
let auth;
try {
    const app = appDeAdmin();
    db = getFirestore(app);
    auth = getAuth(app);
} catch (err) {
    console.error('[Gastos] Firebase init:', err.message);
}

const SITIO = (process.env.SITIO_URL || 'https://bikitchencr.com').replace(/\/+$/, '');
const GASTOS = 'gastos';
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[A-Za-z0-9_-]{8,64}$/;
const DIAS_MAXIMOS = 62;

export const codigoDeGastos = () => firmaDeLink('gastos-gina|bikitchen');

const lista = async ({ desde, hasta }) => {
    if (!FECHA.test(String(desde)) || !FECHA.test(String(hasta)) || desde > hasta
        || (new Date(hasta) - new Date(desde)) / 86400000 > DIAS_MAXIMOS) {
        return json(400, { error: 'Fechas inválidas.' });
    }
    const snap = await db.collection(GASTOS).where('fecha', '>=', desde).where('fecha', '<=', hasta).get();
    return json(200, { gastos: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
};

const guardar = async ({ idGasto, gasto: entrada }, origen) => {
    if (!ID.test(String(idGasto || ''))) return json(400, { error: 'Gasto inválido.' });
    const { gasto, error } = validarGasto(entrada || {});
    if (error) return json(400, { error });
    const ref = db.collection(GASTOS).doc(String(idGasto));
    const ahora = new Date().toISOString();
    const antes = await ref.get();
    const guardado = { ...gasto, actualizado: ahora, creado: antes.exists ? antes.data().creado : ahora, origen };
    await ref.set(guardado);
    return json(200, { id: ref.id, gasto: { id: ref.id, ...guardado } });
};

const borrar = async ({ id }) => {
    const ref = db.collection(GASTOS).doc(String(id || '_'));
    if (!(await ref.get()).exists) return json(404, { error: 'Ese gasto ya no existe.' });
    await ref.delete();
    return json(200, { ok: true });
};

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.CAMBIOS_SECRETO || !db) {
        console.error('[Gastos] Falta CAMBIOS_SECRETO o Firestore no inició');
        return json(500, { error: 'Los gastos todavía no están disponibles.' });
    }
    let entrada;
    try {
        entrada = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Petición inválida.' });
    }
    try {
        const { accion, codigo } = entrada;
        let rol;
        if (codigo !== undefined) {
            if (!mismoCodigo(codigoDeGastos(), codigo)) return json(404, { error: 'Este link no es válido. Pedile uno nuevo a Jan.' });
            rol = 'link';
        } else {
            const quien = await rolDeSesion({ auth, db, authHeader: event.headers?.authorization });
            if (quien.error) return json(403, { error: quien.error });
            rol = quien.rol;
        }
        if (accion === 'lista') return await lista(entrada);
        if (accion === 'guardar') return await guardar(entrada, rol === 'link' ? 'link-gina' : `panel-${rol}`);
        if (accion === 'borrar') return await borrar(entrada);
        if (accion === 'link') {
            if (rol !== 'dueno') return json(403, { error: 'Solo Jan saca el link.' });
            return json(200, { url: `${SITIO}/gastos/${codigoDeGastos()}` });
        }
        return json(400, { error: 'Acción desconocida.' });
    } catch (err) {
        console.error('[Gastos] Error:', err);
        return json(500, { error: 'No se pudo. Probá de nuevo.' });
    }
};
