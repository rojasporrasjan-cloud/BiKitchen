/**
 * Script para inicializar la configuración de WhatsApp en Firebase
 * Ejecutar con: node scripts/initWhatsAppConfig.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Configuración de Firebase (usar las mismas credenciales del proyecto)
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function initializeWhatsAppConfig() {
    try {
        console.log('🔧 Inicializando configuración de WhatsApp en Firebase...');
        
        const configRef = doc(db, 'config', 'contact');
        
        const configData = {
            whatsappPhone: '50660813117', // Número de pruebas
            whatsappPhoneAlt: '50688311500', // Número alternativo
            updatedAt: new Date().toISOString(),
            description: 'Configuración de números de WhatsApp para BiKitchen'
        };
        
        await setDoc(configRef, configData);
        
        console.log('✅ Configuración inicializada exitosamente:');
        console.log('   - Número principal:', configData.whatsappPhone);
        console.log('   - Número alternativo:', configData.whatsappPhoneAlt);
        console.log('\n📱 Para cambiar el número, actualiza el documento config/contact en Firebase Console');
        console.log('   o usa el hook updateWhatsAppPhone() desde la aplicación.');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al inicializar configuración:', error);
        process.exit(1);
    }
}

initializeWhatsAppConfig();
