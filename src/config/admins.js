/**
 * Admin email list — loaded from VITE_ADMIN_EMAILS env var (gitignored .env).
 * To add/remove admins without code changes, edit .env and redeploy.
 * Firestore role (role: 'admin') is the primary mechanism; this is a bootstrap fallback.
 */
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.toLowerCase().trim())
    .filter(Boolean);

/**
 * Super admins — jerarquía por encima de 'admin'.
 * Las herramientas internas del dueño solo se muestran a estos correos.
 *
 * OJO: esto controla QUÉ SE MUESTRA en el panel, no permisos. Un 'admin' normal
 * conserva lectura y escritura completas en Firestore (ver firestore.rules).
 *
 * Configurable con VITE_SUPER_ADMIN_EMAILS; si no está definida se usa el
 * fallback, para que la jerarquía funcione sin depender de una variable de entorno.
 */
const SUPER_ADMIN_FALLBACK = ['rojasporrasjan@gmail.com'];

export const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.toLowerCase().trim())
    .filter(Boolean);

/**
 * @param {string} email
 * @returns {boolean} true si el correo pertenece a un super admin
 */
export const isSuperAdminEmail = (email) => {
    if (!email || typeof email !== 'string') return false;
    const list = SUPER_ADMIN_EMAILS.length > 0 ? SUPER_ADMIN_EMAILS : SUPER_ADMIN_FALLBACK;
    return list.includes(email.toLowerCase().trim());
};
