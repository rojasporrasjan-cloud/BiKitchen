/* global process, Buffer */
/**
 * Netlify Serverless Function: packs-gina
 *
 * El link de Gina para ver los packs mensuales sin entrar al panel:
 *
 *     https://bikitchencr.com/packs-mensuales/<código>
 *
 *   { accion: 'ver', codigo }   → la lista (packsParaGina.js), sin datos de contacto
 *   { accion: 'generar' }       → el link; solo para el dueño (token de Firebase)
 *
 * EL CÓDIGO es una firma con CAMBIOS_SECRETO (el mismo de los links de cambios,
 * con otro texto adentro: un código no sirve para el otro). Si el link se
 * filtra, se cambia VERSION y el viejo deja de abrir, sin tocar los de cambios.
 *
 * LECTURAS (regla 17): las consultas de las fechas de hace 2 semanas a 5
 * semanas adelante, no la colección entera. Una instancia que sigue viva
 * guarda la lista 5 minutos.
 */

import crypto from 'node:crypto';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { leerPedidosDelCiclo, cicloEnCostaRica } from '../../src/utils/envioDeCambios.js';
import { resumenDePacks, fechasParaConsultar } from '../../src/utils/packsParaGina.js';

let db;
let auth;
try {
    const app = getApps().length === 0 ? initializeApp() : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
} catch (err) {
    console.error('[PacksGina] Firebase init:', err.message);
}

const SECRETO = process.env.CAMBIOS_SECRETO;
const VERSION = 'v1';
const SITIO = (process.env.SITIO_URL || 'https://bikitchencr.com').replace(/\/+$/, '');
const SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS || 'rojasporrasjan@gmail.com')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const CACHE_MS = 5 * 60 * 1000;

const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
});

export const codigoDeGina = () => crypto
    .createHmac('sha256', SECRETO)
    .update(`packs-mensuales|gina|${VERSION}`)
    .digest('base64url')
    .slice(0, 24);

const codigoValido = (codigo) => {
    const esperado = Buffer.from(codigoDeGina());
    const recibido = Buffer.from(String(codigo || ''));
    return esperado.length === recibido.length && crypto.timingSafeEqual(esperado, recibido);
};

/** El "hoy" de Costa Rica aunque el servidor esté en UTC. */
const hoyEnCostaRica = (ahora = new Date()) =>
    new Date(ahora.getTime() - 6 * 60 * 60 * 1000 + ahora.getTimezoneOffset() * 60 * 1000);

let cache = { hasta: 0, datos: null };

const ver = async ({ codigo }) => {
    if (!codigoValido(codigo)) return json(404, { error: 'Este link no es válido. Pedile uno nuevo a Jan.' });
    if (Date.now() < cache.hasta && cache.datos) return json(200, cache.datos);

    const hoy = hoyEnCostaRica();
    const pedidos = await leerPedidosDelCiclo(db, fechasParaConsultar(hoy));
    const datos = {
        ...resumenDePacks(pedidos, hoy),
        ciclo: cicloEnCostaRica(),
        actualizado: new Date().toISOString()
    };
    cache = { hasta: Date.now() + CACHE_MS, datos };
    return json(200, datos);
};

const generar = async (authHeader) => {
    const idToken = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!idToken || !auth) return json(403, { error: 'Falta la sesión.' });
    try {
        const decoded = await auth.verifyIdToken(idToken);
        if (!SUPER_ADMINS.includes(String(decoded.email || '').toLowerCase())) {
            return json(403, { error: 'Esta acción es solo para el dueño.' });
        }
    } catch {
        return json(403, { error: 'La sesión venció. Volvé a entrar.' });
    }
    return json(200, { url: `${SITIO}/packs-mensuales/${codigoDeGina()}` });
};

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!SECRETO || !db) {
        console.error('[PacksGina] Falta CAMBIOS_SECRETO o Firestore no inició');
        return json(500, { error: 'Esta página todavía no está disponible.' });
    }
    let entrada;
    try {
        entrada = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Petición inválida.' });
    }
    try {
        if (entrada.accion === 'ver') return await ver(entrada);
        if (entrada.accion === 'generar') return await generar(event.headers?.authorization);
        return json(400, { error: 'Acción desconocida.' });
    } catch (err) {
        console.error('[PacksGina] Error:', err);
        const cuota = err?.code === 8 || /RESOURCE_EXHAUSTED|quota/i.test(String(err?.message));
        return json(503, { error: cuota ? 'Hay mucho movimiento. Probá de nuevo en un rato.' : 'No se pudo cargar. Probá de nuevo.' });
    }
};
