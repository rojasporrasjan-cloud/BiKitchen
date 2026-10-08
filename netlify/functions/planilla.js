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
const ESTADO = 'estado_reloj';            // un candado por persona (ver `marcar`)
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
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
        ahora: ahora.toISOString(),             // el iPad corrige su reloj con esto
        empleados: empleados.filter(e => e.activo !== false).map(e => ({
            id: e.id,
            nombre: e.nombre,
            color: e.color || COLORES_EMPLEADO[0],
            tienePin: !!e.pin,
            ...estadoActual(marcas.filter(m => m.empleadoId === e.id))
        }))
    });
};

/**
 * Marcar desde el iPad. Tres cosas para que no se dañe con mala señal:
 *
 * - `idMarca` lo inventa el iPad UNA vez por toque y lo repite en cada
 *   reintento: es el id del documento, así que un reintento devuelve la marca
 *   que ya estaba en vez de hacer otra (una respuesta perdida no duplica).
 * - Todo va en una transacción que lee y escribe el candado de la persona
 *   (`estado_reloj/<id>`): dos toques al mismo tiempo se hacen uno detrás del otro.
 * - `tipo` es lo que la persona confirmó en la pantalla. Si no calza con lo que
 *   ya hay (ya estaba adentro, ya había salido), no se marca y se le dice.
 *
 * Sin internet, el iPad guarda el toque y lo manda después con `hace` (ms desde
 * que se tocó): la hora sale del reloj del SERVIDOR menos ese rato, así que
 * cambiarle la hora al iPad no cambia la marca.
 */
const ID_MARCA = /^[A-Za-z0-9_-]{8,64}$/;
const HACE_MAXIMO = 24 * 60 * 60 * 1000;
const SIN_INTERNET_DESDE = 2 * 60 * 1000;

const marcar = async ({ empleadoId, pin, idMarca, tipo, hace }, ahora = new Date()) => {
    if (idMarca !== undefined && !ID_MARCA.test(String(idMarca))) return json(400, { error: 'Marca inválida.' });
    if (tipo !== undefined && !['entrada', 'salida'].includes(tipo)) return json(400, { error: 'Marca inválida.' });
    const atraso = Number(hace || 0);
    if (!Number.isFinite(atraso) || atraso < 0 || atraso > HACE_MAXIMO) return json(400, { error: 'Esa marca es de hace más de un día. Avisale a Jan.' });

    const ref = db.collection(EMPLEADOS).doc(String(empleadoId || '_'));
    const snap = await ref.get();
    if (!snap.exists || snap.data().activo === false) return json(404, { error: 'No encontramos a esa persona. Avisale a Jan.' });
    const empleado = snap.data();
    if (empleado.pin && String(pin || '') !== String(empleado.pin)) return json(403, { error: 'El PIN no es correcto.' });

    const en = new Date(ahora.getTime() - atraso);
    const fecha = fechaCR(en);
    const marcaRef = idMarca ? db.collection(MARCAS).doc(String(idMarca)) : db.collection(MARCAS).doc();

    return db.runTransaction(async (t) => {
        const yaEsta = await t.get(marcaRef);
        if (yaEsta.exists) {
            const m = yaEsta.data();
            return json(200, { tipo: m.tipo, en: m.en, nombre: m.nombre, repetida: false });
        }
        const candado = db.collection(ESTADO).doc(snap.id);
        await t.get(candado);
        const suyas = (await t.get(db.collection(MARCAS).where('fecha', '==', fecha).where('empleadoId', '==', snap.id)))
            .docs.map(d => d.data());

        const cerca = suyas.find(m => Math.abs(new Date(m.en) - en) < SEGUNDOS_ENTRE_MARCAS * 1000);
        if (cerca) return json(409, { error: 'Ya marcaste hace un momento.', tipo: cerca.tipo, en: cerca.en });
        const antes = suyas.filter(m => String(m.en) < en.toISOString());
        const toca = siguienteMarca(antes);
        if (tipo && tipo !== toca) {
            const { adentro, desde } = estadoActual(antes);
            let error = 'Ya tenías la salida marcada.';
            if (tipo === 'entrada') error = 'Ya estabas adentro.';
            else if (!desde) error = 'Hoy no tenés la entrada marcada.';
            return json(409, { error, tipo: adentro ? 'entrada' : 'salida', en: desde });
        }

        const marca = {
            empleadoId: snap.id,
            nombre: empleado.nombre,
            tipo: toca,
            en: en.toISOString(),
            fecha,
            origen: atraso > SIN_INTERNET_DESDE ? 'reloj-sin-internet' : 'reloj'
        };
        t.set(candado, { ultima: marca.en, actualizado: ahora.toISOString() });
        t.create(marcaRef, marca);
        return json(200, { tipo: marca.tipo, en: marca.en, nombre: empleado.nombre });
    });
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
    // Dos pestañas (o dos clics) cargando la misma lista no duplican a nadie
    const llave = (t) => String(t || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
    const repetido = (await leerEmpleados()).find(e => llave(e.nombre) === llave(nombre));
    if (repetido) return json(409, { error: `Ya hay alguien que se llama ${repetido.nombre}.`, id: repetido.id });
    const ref = await db.collection(EMPLEADOS).add({ ...datos, creado: datos.actualizado });
    return json(200, { id: ref.id });
};

const marcas = async ({ desde, hasta }) => {
    if (!FECHA.test(String(desde)) || !FECHA.test(String(hasta))) return json(400, { error: 'Fechas inválidas.' });
    const snap = await db.collection(MARCAS).where('fecha', '>=', desde).where('fecha', '<=', hasta).get();
    return json(200, { marcas: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
};

// Las correcciones del panel pasan por el mismo candado que el iPad
const agregarMarca = async ({ marca = {} }) => {
    const { empleadoId, fecha, hora, tipo, nota } = marca;
    if (!['entrada', 'salida'].includes(tipo)) return json(400, { error: 'Tiene que ser entrada o salida.' });
    if (!FECHA.test(String(fecha))) return json(400, { error: 'Fecha inválida.' });
    if (!HORA.test(String(hora))) return json(400, { error: 'Hora inválida.' });
    const en = momentoCR(fecha, hora);
    const snap = await db.collection(EMPLEADOS).doc(String(empleadoId || '_')).get();
    if (!snap.exists) return json(404, { error: 'Ese empleado no existe.' });
    const ref = db.collection(MARCAS).doc();
    await db.runTransaction(async (t) => {
        const candado = db.collection(ESTADO).doc(snap.id);
        await t.get(candado);
        t.set(candado, { ultima: en, actualizado: new Date().toISOString() });
        t.create(ref, {
            empleadoId: snap.id, nombre: snap.data().nombre, tipo, en, fecha,
            origen: 'panel', nota: String(nota || 'Corregida a mano')
        });
    });
    return json(200, { id: ref.id });
};

const borrarMarca = async ({ id }) => {
    const ref = db.collection(MARCAS).doc(String(id || '_'));
    return db.runTransaction(async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists) return json(404, { error: 'Esa marca ya no existe.' });
        const candado = db.collection(ESTADO).doc(String(snap.data().empleadoId || '_'));
        await t.get(candado);
        t.set(candado, { borrada: snap.id, actualizado: new Date().toISOString() });
        t.delete(ref);
        return json(200, { ok: true });
    });
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
