/* global process, Buffer */
/**
 * Netlify Serverless Function: planilla
 *
 * El reloj de entrada y salida (link para el iPad de Gina) y la planilla del
 * panel (Jan, 8 oct 2026).
 *
 * EL RELOJ (sin sesión, con el código del link):
 *   { accion: 'reloj', codigo }                       → empleados activos y si están adentro hoy
 *   { accion: 'marcar', codigo, empleadoId, pin }     → marca entrada o salida con la hora DEL SERVIDOR
 *
 * EL PANEL (solo el dueño, token de Firebase):
 *   { accion: 'empleados' } · { accion: 'guardarEmpleado', empleado }
 *   { accion: 'marcas', desde, hasta } · { accion: 'agregarMarca', marca } · { accion: 'borrarMarca', id }
 *   { accion: 'link' }                                → el link del reloj
 *
 * Todo pasa por acá y no por las reglas de Firestore: el iPad no tiene sesión,
 * y así las colecciones `empleados` y `marcas_reloj` quedan cerradas al navegador.
 *
 * EL CÓDIGO del link es una firma con CAMBIOS_SECRETO (como el de Gina para los
 * packs, con otro texto adentro). Si se filtra, se cambia VERSION.
 *
 * LECTURAS (regla 17): el reloj lee los empleados (pocos) y las marcas de HOY;
 * la planilla, las marcas de las fechas que se piden. Nunca colecciones enteras.
 */

import crypto from 'node:crypto';
import { appDeAdmin } from '../../src/utils/firebaseAdminApp.js';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { fechaCR, momentoCR, siguienteMarca, estadoActual } from '../../src/utils/planilla.js';
import { SEGUNDOS_ENTRE_MARCAS, COLORES_EMPLEADO } from '../../src/data/planilla.js';

let db;
let auth;
try {
    const app = appDeAdmin();
    db = getFirestore(app);
    auth = getAuth(app);
} catch (err) {
    console.error('[Planilla] Firebase init:', err.message);
}

const VERSION = 'v1';
const SITIO = (process.env.SITIO_URL || 'https://bikitchencr.com').replace(/\/+$/, '');
const EMPLEADOS = 'empleados';
const MARCAS = 'marcas_reloj';
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
});

export const codigoDelReloj = () => crypto
    .createHmac('sha256', process.env.CAMBIOS_SECRETO || '')
    .update(`reloj|bikitchen|${VERSION}`)
    .digest('base64url')
    .slice(0, 24);

const codigoValido = (codigo) => {
    const esperado = Buffer.from(codigoDelReloj());
    const recibido = Buffer.from(String(codigo || ''));
    return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
};

const superAdmins = () => (process.env.SUPER_ADMIN_EMAILS || 'rojasporrasjan@gmail.com')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const esDueno = async (authHeader) => {
    const idToken = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!idToken || !auth) return 'Falta la sesión.';
    try {
        const decoded = await auth.verifyIdToken(idToken);
        return superAdmins().includes(String(decoded.email || '').toLowerCase()) ? null : 'Esta pantalla es solo para el dueño.';
    } catch {
        return 'La sesión venció. Volvé a entrar.';
    }
};

const leerEmpleados = async () => (await db.collection(EMPLEADOS).get()).docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)));

const marcasDeHoy = async (hoy) => (await db.collection(MARCAS).where('fecha', '==', hoy).get()).docs
    .map(d => ({ id: d.id, ...d.data() }));

// ── El reloj ──────────────────────────────────────────────────────────────
const reloj = async ({ ahora = new Date() } = {}) => {
    const hoy = fechaCR(ahora);
    const [empleados, marcas] = await Promise.all([leerEmpleados(), marcasDeHoy(hoy)]);
    return json(200, {
        hoy,
        ahora: ahora.toISOString(),
        empleados: empleados.filter(e => e.activo !== false).map(e => ({
            id: e.id,
            nombre: e.nombre,
            color: e.color || COLORES_EMPLEADO[0],
            tienePin: !!e.pin,
            ...estadoActual(marcas.filter(m => m.empleadoId === e.id))
        }))
    });
};

const marcar = async ({ empleadoId, pin }, ahora = new Date()) => {
    const snap = await db.collection(EMPLEADOS).doc(String(empleadoId || '_')).get();
    if (!snap.exists || snap.data().activo === false) return json(404, { error: 'No encontramos a esa persona. Avisale a Jan.' });
    const empleado = snap.data();
    if (empleado.pin && String(pin || '') !== String(empleado.pin)) return json(403, { error: 'El PIN no es correcto.' });

    const hoy = fechaCR(ahora);
    const suyas = (await db.collection(MARCAS).where('fecha', '==', hoy).where('empleadoId', '==', snap.id).get())
        .docs.map(d => d.data());
    const ultima = [...suyas].sort((a, b) => String(a.en).localeCompare(String(b.en))).at(-1);
    if (ultima && (ahora - new Date(ultima.en)) / 1000 < SEGUNDOS_ENTRE_MARCAS) {
        return json(409, { error: 'Ya marcaste hace un momento.', tipo: ultima.tipo, en: ultima.en });
    }
    const marca = {
        empleadoId: snap.id,
        nombre: empleado.nombre,
        tipo: siguienteMarca(suyas),
        en: ahora.toISOString(),
        fecha: hoy,
        origen: 'reloj'
    };
    await db.collection(MARCAS).add(marca);
    return json(200, { tipo: marca.tipo, en: marca.en, nombre: empleado.nombre });
};

// ── El panel ──────────────────────────────────────────────────────────────
const guardarEmpleado = async ({ empleado = {} }) => {
    const nombre = String(empleado.nombre || '').trim();
    const tarifaHora = Number(empleado.tarifaHora);
    if (!nombre) return json(400, { error: 'Falta el nombre.' });
    if (!Number.isFinite(tarifaHora) || tarifaHora < 0) return json(400, { error: 'La tarifa por hora tiene que ser un número.' });
    const pin = String(empleado.pin ?? '').trim();
    if (pin && !/^\d{4}$/.test(pin)) return json(400, { error: 'El PIN son 4 números (o vacío para no pedirlo).' });
    const datos = {
        nombre,
        tarifaHora: Math.round(tarifaHora),
        activo: empleado.activo !== false,
        pin,
        color: COLORES_EMPLEADO.includes(empleado.color) ? empleado.color : COLORES_EMPLEADO[0],
        actualizado: new Date().toISOString()
    };
    if (empleado.id) {
        const ref = db.collection(EMPLEADOS).doc(String(empleado.id));
        if (!(await ref.get()).exists) return json(404, { error: 'Ese empleado no existe.' });
        await ref.update(datos);                      // update: nunca crea uno fantasma
        return json(200, { id: ref.id });
    }
    const ref = await db.collection(EMPLEADOS).add({ ...datos, creado: datos.actualizado });
    return json(200, { id: ref.id });
};

const marcas = async ({ desde, hasta }) => {
    if (!FECHA.test(String(desde)) || !FECHA.test(String(hasta))) return json(400, { error: 'Fechas inválidas.' });
    const snap = await db.collection(MARCAS).where('fecha', '>=', desde).where('fecha', '<=', hasta).get();
    return json(200, { marcas: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
};

const agregarMarca = async ({ marca = {} }) => {
    const { empleadoId, fecha, hora, tipo, nota } = marca;
    if (!['entrada', 'salida'].includes(tipo)) return json(400, { error: 'Tiene que ser entrada o salida.' });
    if (!FECHA.test(String(fecha))) return json(400, { error: 'Fecha inválida.' });
    const en = momentoCR(fecha, hora);
    if (!en) return json(400, { error: 'Hora inválida.' });
    const snap = await db.collection(EMPLEADOS).doc(String(empleadoId || '_')).get();
    if (!snap.exists) return json(404, { error: 'Ese empleado no existe.' });
    const ref = await db.collection(MARCAS).add({
        empleadoId: snap.id, nombre: snap.data().nombre, tipo, en, fecha,
        origen: 'panel', nota: String(nota || 'Corregida a mano')
    });
    return json(200, { id: ref.id });
};

const borrarMarca = async ({ id }) => {
    const ref = db.collection(MARCAS).doc(String(id || '_'));
    if (!(await ref.get()).exists) return json(404, { error: 'Esa marca ya no existe.' });
    await ref.delete();
    return json(200, { ok: true });
};

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.CAMBIOS_SECRETO || !db) {
        console.error('[Planilla] Falta CAMBIOS_SECRETO o Firestore no inició');
        return json(500, { error: 'El reloj todavía no está disponible.' });
    }
    let entrada;
    try {
        entrada = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Petición inválida.' });
    }
    try {
        const { accion } = entrada;
        if (accion === 'reloj' || accion === 'marcar') {
            if (!codigoValido(entrada.codigo)) return json(404, { error: 'Este link del reloj no es válido. Pedile uno nuevo a Jan.' });
            return accion === 'reloj' ? await reloj() : await marcar(entrada);
        }
        const motivo = await esDueno(event.headers?.authorization);
        if (motivo) return json(403, { error: motivo });
        if (accion === 'empleados') return json(200, { empleados: await leerEmpleados() });
        if (accion === 'guardarEmpleado') return await guardarEmpleado(entrada);
        if (accion === 'marcas') return await marcas(entrada);
        if (accion === 'agregarMarca') return await agregarMarca(entrada);
        if (accion === 'borrarMarca') return await borrarMarca(entrada);
        if (accion === 'link') return json(200, { url: `${SITIO}/reloj/${codigoDelReloj()}` });
        return json(400, { error: 'Acción desconocida.' });
    } catch (err) {
        console.error('[Planilla] Error:', err);
        return json(500, { error: 'No se pudo. Probá de nuevo.' });
    }
};
