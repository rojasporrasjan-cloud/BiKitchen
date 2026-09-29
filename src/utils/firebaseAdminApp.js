/* global process */
/**
 * La app de firebase-admin para las funciones de Netlify.
 *
 * En Netlify NO hay credenciales de Google por defecto: `initializeApp()` sin
 * nada no sabe ni de qué proyecto es, así que ni verifica una sesión
 * (verifyIdToken) ni lee Firestore. Esto la arma con las variables de Netlify:
 *
 *   FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY  → la cuenta de servicio
 *       (Firebase Console → Configuración → Cuentas de servicio → Generar clave)
 *   FIREBASE_PROJECT_ID  o, si no está, VITE_FIREBASE_PROJECT_ID (ya existe)
 *
 * Sin la cuenta de servicio igual se inicia con el proyecto, y verificar la
 * sesión del dueño funciona; leer o escribir Firestore falla con un error claro.
 *
 * La clave se guarda en Netlify con los saltos de línea como "\n": acá se
 * vuelven saltos de verdad.
 */

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';

export const appDeAdmin = () => {
    if (getApps().length > 0) return getApp();
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (clientEmail && privateKey) {
        return initializeApp({
            credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
            projectId
        });
    }
    return initializeApp(projectId ? { projectId } : undefined);
};

/** ¿Tiene con qué leer y escribir Firestore? */
export const tieneCuentaDeServicio = () => !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
