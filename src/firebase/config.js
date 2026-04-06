import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
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
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let analytics;
if (firebaseConfig.measurementId) {
    try {
        analytics = getAnalytics(app);
    } catch (e) {
        console.warn("Analytics initialization failed:", e);
    }
}

// Configurar Firestore SIN caché persistente para evitar problemas en móviles
// Esto asegura que siempre se obtengan datos frescos del servidor
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});

export const auth = getAuth(app);
export const storage = getStorage(app);
