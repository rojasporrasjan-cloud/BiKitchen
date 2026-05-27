/**
 * Admin email list — loaded from VITE_ADMIN_EMAILS env var (gitignored .env).
 * To add/remove admins without code changes, edit .env and redeploy.
 * Firestore role (role: 'admin') is the primary mechanism; this is a bootstrap fallback.
 */
export const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.toLowerCase().trim())
    .filter(Boolean);
