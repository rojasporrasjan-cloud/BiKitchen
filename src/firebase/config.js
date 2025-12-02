import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAJqCEGTB3ezOPfXrNlHsw6rLJioTAd6_o",
    authDomain: "bikitchen-app.firebaseapp.com",
    projectId: "bikitchen-app",
    storageBucket: "bikitchen-app.firebasestorage.app",
    messagingSenderId: "597611402552",
    appId: "1:597611402552:web:d4bb1a0804e1f3b791ddcd",
    measurementId: "G-VJBDBGPHV6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
