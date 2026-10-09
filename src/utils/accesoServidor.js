/* global process, Buffer */
/**
 * Lo que comparten las funciones de Netlify que se abren por link o desde el panel
 * (planilla, gastos): la firma de los links y quién tiene sesión.
 * Solo corre en el servidor (usa node:crypto).
 */
import crypto from 'node:crypto';

/**
 * El código de un link: una firma con CAMBIOS_SECRETO de un texto propio de cada
 * link. Si un link se filtra, se le cambia la versión y el viejo deja de servir.
 */
export const firmaDeLink = (texto, version = 'v1') => crypto
    .createHmac('sha256', process.env.CAMBIOS_SECRETO || '')
    .update(`${texto}|${version}`)
    .digest('base64url')
    .slice(0, 24);

/** Compara sin dar pistas por el tiempo que tarda. */
export const mismoCodigo = (esperado, recibido) => {
    const a = Buffer.from(String(esperado || ''));
    const b = Buffer.from(String(recibido || ''));
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

const lista = (valor) => String(valor || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
const superAdmins = () => lista(process.env.SUPER_ADMIN_EMAILS || 'rojasporrasjan@gmail.com');
const correosDeAdmin = () => lista(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS);

/**
 * Quién llama desde el panel: { rol: 'dueno' } · { rol: 'admin' } · { error }.
 * Los mismos admins que deja entrar el panel: la lista de correos o el rol
 * 'admin' del usuario (una lectura, solo si el correo no está en las listas).
 */
export const rolDeSesion = async ({ auth, db, authHeader }) => {
    const idToken = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
    if (!idToken || !auth) return { error: 'Falta la sesión.' };
    let decoded;
    try {
        decoded = await auth.verifyIdToken(idToken);
    } catch {
        return { error: 'La sesión venció. Volvé a entrar.' };
    }
    const correo = String(decoded.email || '').toLowerCase();
    if (superAdmins().includes(correo)) return { rol: 'dueno' };
    if (correosDeAdmin().includes(correo)) return { rol: 'admin' };
    const usuario = await db.collection('users').doc(decoded.uid).get();
    const rol = String(usuario.exists ? usuario.data().role || '' : '').toLowerCase();
    return rol === 'admin' ? { rol: 'admin' } : { error: 'Esta pantalla es solo para administradores.' };
};

export const respuesta = (statusCode, body) => ({
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
});
