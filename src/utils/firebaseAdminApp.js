/* global process, Buffer */
/**
 * La app de firebase-admin para las funciones de Netlify.
 *
 * En Netlify NO hay credenciales de Google por defecto: `initializeApp()` sin
 * nada no sabe ni de qué proyecto es, así que ni verifica una sesión
 * (verifyIdToken) ni lee Firestore. Esto la arma con la cuenta de servicio:
 *
 *   FIREBASE_CLIENT_EMAIL   el correo de la cuenta de servicio
 *   la llave privada, de una de dos formas:
 *     - FIREBASE_LLAVE_CLAVE → abre la llave CIFRADA de src/data/llaveFirebaseCifrada.js
 *       (la forma que se usa: la llave sola ocupa casi 2 KB y las funciones de
 *        Netlify tienen un tope de 4 KB para TODAS las variables juntas)
 *     - FIREBASE_PRIVATE_KEY → la llave en texto, con los saltos como "\n"
 *   FIREBASE_PROJECT_ID  o, si no está, VITE_FIREBASE_PROJECT_ID (ya existe)
 *
 * Sin llave igual se inicia con el proyecto, y verificar la sesión del dueño
 * funciona; leer o escribir Firestore falla con un error claro.
 */

import { createDecipheriv } from 'node:crypto';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { LLAVE_FIREBASE_CIFRADA } from '../data/llaveFirebaseCifrada.js';

/** Abre un paquete base64(iv[12] + tag[16] + datos) de AES-256-GCM. */
export const abrirLlave = (paquete, claveBase64) => {
    const bytes = Buffer.from(paquete, 'base64');
    const descifrador = createDecipheriv('aes-256-gcm', Buffer.from(claveBase64, 'base64'), bytes.subarray(0, 12));
    descifrador.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([descifrador.update(bytes.subarray(28)), descifrador.final()]).toString('utf8');
};

const llavePrivada = () => {
    if (process.env.FIREBASE_LLAVE_CLAVE && LLAVE_FIREBASE_CIFRADA) {
        return abrirLlave(LLAVE_FIREBASE_CIFRADA, process.env.FIREBASE_LLAVE_CLAVE);
    }
    return process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
};

export const appDeAdmin = () => {
    if (getApps().length > 0) return getApp();
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = clientEmail ? llavePrivada() : '';
    if (clientEmail && privateKey) {
        return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
    }
    return initializeApp(projectId ? { projectId } : undefined);
};

/** ¿Tiene con qué leer y escribir Firestore? */
export const tieneCuentaDeServicio = () => !!(process.env.FIREBASE_CLIENT_EMAIL
    && (process.env.FIREBASE_LLAVE_CLAVE || process.env.FIREBASE_PRIVATE_KEY));
