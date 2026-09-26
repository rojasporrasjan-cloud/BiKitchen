/* global process, Buffer */
/**
 * Netlify Serverless Function: cambios-semana
 *
 * El link que le llega al cliente por WhatsApp para pedir los cambios de su
 * pack de esta semana, sin cuenta ni contraseña:
 *
 *     https://bikitchencr.com/cambios/<pedidoId>.<fecha>.<firma>
 *
 * POR QUÉ UNA FUNCIÓN Y NO FIRESTORE DESDE EL NAVEGADOR: las reglas no dejan a
 * nadie sin sesión tocar un pedido, y está bien que así sea. Acá se revisa todo
 * antes de escribir —que el link sea legítimo, que no haya pasado la hora
 * límite, que el cambio esté en la lista de Gina— y se escribe en el pedido
 * por su ID REAL, con update(): si el documento no existe falla, en vez de
 * crear uno fantasma (ver CLAUDE.md, regla 17).
 *
 * LA FIRMA: un HMAC del pedido y la fecha con CAMBIOS_SECRETO. Sin el secreto
 * no se puede inventar un link para otro pedido ni para otra semana, y no hace
 * falta guardar los links en ningún lado: cero lecturas extra.
 *
 * Acciones (POST, JSON):
 *   { accion: 'ver', codigo }                         → lo que la página muestra
 *   { accion: 'guardar', codigo, cambios, proteinas, notas }
 *   { accion: 'generar', pedidos: [{ id, fecha }] }   → solo el dueño (token de Firebase)
 *
 * Variables en Netlify:
 *   CAMBIOS_SECRETO     → cualquier texto largo y al azar (no cambiarlo: rompe los links ya mandados)
 *   SITIO_URL           → opcional, por defecto https://bikitchencr.com
 *   SUPER_ADMIN_EMAILS  → los mismos de la función de Kommo
 */

import crypto from 'node:crypto';
import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import {
    loQueSePuedeCambiar, validarPedidoDeCambios, cambioParaGuardar, loGuardadoParaElLink,
    estaCerrada, horaLimiteDe, horaLimiteEnPalabras
} from '../../src/utils/cambiosDeLaSemana.js';
import { entregasDelPedido } from '../../src/utils/proteinasPorEntrega.js';

let db;
let auth;
try {
    const app = getApps().length === 0 ? initializeApp() : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
} catch (err) {
    console.error('[Cambios] Firebase init:', err.message);
}

const SECRETO = process.env.CAMBIOS_SECRETO;
const SITIO = (process.env.SITIO_URL || 'https://bikitchencr.com').replace(/\/+$/, '');
const SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS || 'rojasporrasjan@gmail.com')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
});

// ── La firma del link ─────────────────────────────────────────────────────

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const ID_PEDIDO = /^[A-Za-z0-9_-]{6,64}$/;

const firmar = (id, fecha) => crypto
    .createHmac('sha256', SECRETO)
    .update(`${id}|${fecha}`)
    .digest('base64url')
    .slice(0, 22);

export const codigoPara = (id, fecha) => `${id}.${fecha}.${firmar(id, fecha)}`;

/** { id, fecha } si el código es legítimo, o null. */
const leerCodigo = (codigo) => {
    const [id, fecha, firma, ...resto] = String(codigo || '').trim().split('.');
    if (resto.length || !ID_PEDIDO.test(id || '') || !FECHA_ISO.test(fecha || '') || !firma) return null;
    const esperada = Buffer.from(firmar(id, fecha));
    const recibida = Buffer.from(firma);
    if (esperada.length !== recibida.length || !crypto.timingSafeEqual(esperada, recibida)) return null;
    return { id, fecha };
};

// ── Lo que se lee de Firestore ────────────────────────────────────────────

// El menú y las sustituciones son los mismos para todos los clientes: una
// instancia que sigue viva no los vuelve a leer por 10 minutos. Son las
// lecturas que más se repetirían un miércoles con 60 clientes abriendo el link.
let cacheMenu = { hasta: 0, menus: null, sustituciones: null };
const menuYSustituciones = async () => {
    if (Date.now() < cacheMenu.hasta && cacheMenu.menus) return cacheMenu;
    const [m, s] = await Promise.all([
        db.doc('menus_oficial/current').get(),
        db.doc('config/substitutions').get()
    ]);
    cacheMenu = { hasta: Date.now() + 10 * 60 * 1000, menus: m.exists ? m.data() : null, sustituciones: s.exists ? s.data() : {} };
    return cacheMenu;
};

const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || '';

/**
 * El pedido y lo que se puede hacer con él, o un error que se le puede mostrar
 * al cliente tal cual.
 */
const cargar = async (codigo) => {
    const leido = leerCodigo(codigo);
    if (!leido) return { error: 'Este link no es válido. Pedile uno nuevo a BiKitchen por WhatsApp.', status: 404 };

    const ref = db.collection('pedidos').doc(leido.id);
    const snap = await ref.get();
    if (!snap.exists) return { error: 'No encontramos tu pedido. Escribinos por WhatsApp.', status: 404 };
    const pedido = snap.data();

    if (/^cancel/i.test(String(pedido.status || ''))) {
        return { error: 'Este pedido está cancelado. Si es un error, escribinos por WhatsApp.', status: 410 };
    }
    if (!entregasDelPedido(pedido).includes(leido.fecha)) {
        return { error: 'Esa entrega ya no está en tu pedido. Escribinos por WhatsApp.', status: 410 };
    }

    const { menus, sustituciones } = await menuYSustituciones();
    const permitido = loQueSePuedeCambiar(pedido, menus, sustituciones);
    if (!permitido) {
        return { error: 'Tu pack no tiene cambios desde este link. Escribinos por WhatsApp y con gusto te ayudamos.', status: 422 };
    }
    return { ref, pedido, fecha: leido.fecha, permitido };
};

// ── Acciones ──────────────────────────────────────────────────────────────

const ver = async ({ codigo }) => {
    const c = await cargar(codigo);
    if (c.error) return json(c.status, { error: c.error });
    const { pedido, fecha, permitido } = c;
    return json(200, {
        // Solo lo que la página necesita: nada de teléfono, dirección ni correo.
        nombre: primerNombre(pedido.cliente),
        pack: pedido.plan || pedido.items?.[0]?.nombre || '',
        fecha,
        cierre: horaLimiteDe(fecha)?.toISOString() || null,
        cierreEnPalabras: horaLimiteEnPalabras(fecha),
        cerrada: estaCerrada(fecha),
        permitido,
        // El detalle del link, no el texto de la hoja: ese lo puede haber
        // escrito Gina y no es del cliente. En proteínas, lo guardado para la
        // entrega (lo que va a cocinar la hoja).
        guardado: loGuardadoParaElLink(pedido, fecha, permitido)
    });
};

const guardar = async (entrada) => {
    const c = await cargar(entrada.codigo);
    if (c.error) return json(c.status, { error: c.error });
    const { ref, pedido, fecha, permitido } = c;

    if (estaCerrada(fecha)) {
        return json(409, { error: `Los cambios de esta entrega se cerraron el ${horaLimiteEnPalabras(fecha)}. Escribinos por WhatsApp y vemos si todavía se puede.` });
    }

    const { errores, limpio } = validarPedidoDeCambios(permitido, entrada);
    if (errores.length) return json(422, { error: errores.join(' ') });

    const cambio = cambioParaGuardar(pedido, fecha, limpio);
    // update() y no set(): si el pedido no existiera, falla en vez de crear otro.
    await ref.update({ ...cambio, updatedAt: new Date().toISOString() });
    return json(200, { ok: true, guardado: cambio.cambiosDelLink[fecha] });
};

const generar = async (entrada, authHeader) => {
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

    const pedidos = Array.isArray(entrada.pedidos) ? entrada.pedidos.slice(0, 500) : [];
    const links = pedidos
        .filter(p => ID_PEDIDO.test(String(p?.id || '')) && FECHA_ISO.test(String(p?.fecha || '')))
        .map(p => ({ id: p.id, fecha: p.fecha, url: `${SITIO}/cambios/${codigoPara(p.id, p.fecha)}` }));
    return json(200, { links });
};

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!SECRETO || !db) {
        console.error('[Cambios] Falta CAMBIOS_SECRETO o Firestore no inició');
        return json(500, { error: 'El servicio de cambios no está disponible. Escribinos por WhatsApp.' });
    }

    let entrada;
    try {
        entrada = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'Petición inválida.' });
    }

    try {
        if (entrada.accion === 'ver') return await ver(entrada);
        if (entrada.accion === 'guardar') return await guardar(entrada);
        if (entrada.accion === 'generar') return await generar(entrada, event.headers?.authorization);
        return json(400, { error: 'Acción desconocida.' });
    } catch (err) {
        console.error('[Cambios] Error:', err);
        const cuota = err?.code === 8 || /RESOURCE_EXHAUSTED|quota/i.test(String(err?.message));
        return json(503, {
            error: cuota
                ? 'Estamos con mucho movimiento. Probá de nuevo en un rato o escribinos por WhatsApp.'
                : 'No pudimos guardar. Probá de nuevo o escribinos por WhatsApp.'
        });
    }
};
