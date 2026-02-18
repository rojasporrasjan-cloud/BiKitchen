import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyD6ZUpIYtXhTFp9lZGZgLX4mPp959H0PCo",
    authDomain: "bikitchen-food.firebaseapp.com",
    projectId: "bikitchen-food",
    storageBucket: "bikitchen-food.firebasestorage.app",
    messagingSenderId: "281700974825",
    appId: "1:281700974825:web:0b45828ccc7745b340b078"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics;
try {
    analytics = getAnalytics(app);
} catch (e) { }

// Configurar Firestore SIN caché persistente para evitar problemas en móviles
// Esto asegura que siempre se obtengan datos frescos del servidor
export const db = initializeFirestore(app, {
    localCache: memoryLocalCache()
});

export const auth = getAuth(app);
export const storage = getStorage(app);
