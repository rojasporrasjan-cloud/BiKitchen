/**
 * Netlify Serverless Function: kommo
 *
 * Puente entre el panel de BiKitchen y la API de Kommo.
 *
 * POR QUÉ ES UNA FUNCTION Y NO UNA LLAMADA DESDE EL NAVEGADOR:
 * el token de Kommo da acceso total a la cuenta — contactos, leads, bots. Si
 * viviera en el front, cualquiera podría leerlo desde el navegador y mandarle
 * WhatsApp a toda la base de clientes. Por eso vive solo acá, en variables de
 * entorno SIN el prefijo VITE_ (ese prefijo lo metería en el bundle del cliente).
 *
 * Variables que hay que configurar en Netlify:
 *   KOMMO_SUBDOMINIO     → "algo" de algo.kommo.com
 *   KOMMO_TOKEN          → token de larga duración (integración privada)
 *   SUPER_ADMIN_EMAILS   → correos separados por coma que pueden usar esto
 *
 * CADA LLAMADA HACE UN SOLO PASO a propósito. El panel va llamando en ciclo y
 * muestra el avance. Así ninguna invocación se acerca al límite de tiempo de
 * Netlify, y si algo falla se sabe exactamente en qué lote fue.
 *
 * Endpoint: POST /.netlify/functions/kommo
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let auth;
try {
    const apps = getApps();
    auth = getAuth(apps.length === 0 ? initializeApp() : getApp());
} catch (err) {
    console.error('[Kommo] Firebase init:', err.message);
}

const SUBDOMINIO = process.env.KOMMO_SUBDOMINIO;
const TOKEN = process.env.KOMMO_TOKEN;

const SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS || 'rojasporrasjan@gmail.com')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const json = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
});

/**
 * Solo el dueño puede disparar esto: manda mensajes reales a clientes reales.
 * Se verifica el token de Firebase del navegador, no un secreto compartido.
 */
const verificarDueno = async (authHeader) => {
    const idToken = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!idToken) return { ok: false, motivo: 'Falta la sesión.' };
    if (!auth) return { ok: false, motivo: 'El servidor no pudo verificar la sesión.' };

    try {
        const decoded = await auth.verifyIdToken(idToken);
        const correo = String(decoded.email || '').toLowerCase();
        if (!SUPER_ADMINS.includes(correo)) {
            return { ok: false, motivo: 'Esta acción es solo para el dueño.' };
        }
        return { ok: true, correo };
    } catch (err) {
        console.error('[Kommo] Token inválido:', err.message);
        return { ok: false, motivo: 'La sesión venció. Volvé a entrar.' };
    }
};

/** Llama a la API de Kommo y devuelve el error tal cual si algo falla. */
const kommo = async (ruta, { method = 'GET', body } = {}) => {
    const res = await fetch(`https://${SUBDOMINIO}.kommo.com${ruta}`, {
        method,
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
    });

    // 204/202 sin cuerpo son respuestas válidas de Kommo
    const texto = await res.text();
    const datos = texto ? JSON.parse(texto) : null;

    if (!res.ok) {
        const detalle = datos?.['validation-errors'] || datos?.detail || datos?.title || texto;
        throw new Error(`Kommo respondió ${res.status}: ${JSON.stringify(detalle).slice(0, 400)}`);
    }
    return datos;
};

/**
 * Qué hay en la cuenta: los bots y los campos personalizados de contacto.
 * Sirve para descubrir el bot_id y los ids de campos sin salir del panel.
 */
const diagnostico = async () => {
    const cuenta = await kommo('/api/v4/account');
    const campos = await kommo('/api/v4/contacts/custom_fields?limit=250');

    let bots = [];
    try {
        const res = await kommo('/api/v4/bots?limit=250');
        bots = (res?._embedded?.bots || []).map((b) => ({ id: b.id, nombre: b.name }));
    } catch (err) {
        // Si el plan no tiene Salesbot, esto falla y hay que decirlo claro
        bots = { error: err.message };
    }

    return {
        cuenta: { id: cuenta?.id, nombre: cuenta?.name, subdominio: cuenta?.subdomain },
        campos: (campos?._embedded?.custom_fields || []).map((c) => ({
            id: c.id, nombre: c.name, tipo: c.type, codigo: c.code
        })),
        bots
    };
};

/** Una página del listado de contactos, para armar el índice teléfono → id. */
const paginaContactos = async (pagina = 1) => {
    const res = await kommo(`/api/v4/contacts?limit=250&page=${pagina}`);
    const contactos = res?._embedded?.contacts || [];
    return { contactos, hayMas: contactos.length === 250 };
};

export const handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    if (!SUBDOMINIO || !TOKEN) {
        return json(500, {
            error: 'Falta configurar KOMMO_SUBDOMINIO y KOMMO_TOKEN en Netlify.'
        });
    }

    const permiso = await verificarDueno(event.headers?.authorization);
    if (!permiso.ok) return json(403, { error: permiso.motivo });

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch {
        return json(400, { error: 'El cuerpo de la petición no es JSON válido.' });
    }

    const { accion } = payload;

    try {
        if (accion === 'diagnostico') {
            return json(200, await diagnostico());
        }

        if (accion === 'contactos') {
            return json(200, await paginaContactos(payload.pagina || 1));
        }

        // Crea un lote de contactos nuevos (máx 50). Devuelve los ids creados.
        if (accion === 'crear') {
            const creados = await kommo('/api/v4/contacts', {
                method: 'POST',
                body: payload.contactos || []
            });
            return json(200, {
                ids: (creados?._embedded?.contacts || []).map((c) => c.id)
            });
        }

        // Actualiza un lote existente (máx 50). Cada uno lleva su `id`.
        if (accion === 'actualizar') {
            await kommo('/api/v4/contacts', {
                method: 'PATCH',
                body: payload.contactos || []
            });
            return json(200, { ok: true });
        }

        // Lanza el Salesbot (máx 100). ESTE es el que manda los WhatsApp.
        if (accion === 'enviar') {
            if (!payload.ejecuciones?.length) {
                return json(400, { error: 'No hay contactos a los que mandarles.' });
            }
            await kommo('/api/v4/bots/run', {
                method: 'POST',
                body: payload.ejecuciones
            });
            console.log(`[Kommo] ${permiso.correo} lanzó el bot para ${payload.ejecuciones.length} contactos`);
            return json(200, { ok: true, enviados: payload.ejecuciones.length });
        }

        return json(400, { error: `Acción desconocida: ${accion}` });
    } catch (err) {
        console.error('[Kommo] Error:', err.message);
        return json(502, { error: err.message });
    }
};
