import { initializeApp, getApps, getApp } from "firebase/app";
import {
    initializeFirestore,
    memoryLocalCache,
    persistentLocalCache,
    persistentMultipleTabManager
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase configuration loaded from environment variables.
// Set these in Netlify: Site → Configuration → Environment variables
// For local dev: create .env.local and add these values.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Caché de Firestore EN DISCO (IndexedDB), no solo en memoria.
 *
 * Por qué se cambió (10 de setiembre de 2026):
 * Con caché solo en memoria, cada recarga de la página volvía a bajar la
 * colección `pedidos` entera desde el servidor. Estando logueado como admin eso
 * son ~545 lecturas por carga, y la hoja de producción se las baja otra vez:
 * ~1.090 por abrirla. El plan Spark da 50.000 al día, o sea 46 recargas. Se
 * agotó dos veces en un mismo día de cocina y dejó el panel inservible.
 *
 * Con caché en disco, `onSnapshot` guarda el token de la consulta: al recargar
 * reanuda desde ahí y el servidor manda SOLO los documentos que cambiaron. Una
 * recarga pasa de ~545 lecturas a unas pocas.
 *
 * Sobre "datos frescos" —que era la razón del caché en memoria—: los listeners
 * siguen recibiendo lo del servidor. Lo único que cambia es que primero pintan
 * lo que ya tenían en disco y un instante después llega la actualización. No se
 * queda con datos viejos; los muestra antes.
 *
 * El fallback es a propósito: en Safari privado y en algunos navegadores de
 * móvil IndexedDB no está disponible. Ahí vuelve al modo de antes en vez de
 * dejar la app sin base de datos.
 */
let firestore;
try {
    firestore = initializeFirestore(app, {
        // multipleTab: la hoja y los pedidos se usan abiertos a la vez
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
} catch (error) {
    console.error('[firebase] Sin caché en disco, se sigue en memoria:', error);
    firestore = initializeFirestore(app, { localCache: memoryLocalCache() });
}

export const db = firestore;

export const auth = getAuth(app);
export const storage = getStorage(app);
