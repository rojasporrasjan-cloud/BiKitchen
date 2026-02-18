import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAJqCEGTB3ezOPfXrNlHsw6rLJioTAd6_o",
  authDomain: "bikitchen-app.firebaseapp.com",
  projectId: "bikitchen-app",
  storageBucket: "bikitchen-app.firebasestorage.app",
  messagingSenderId: "597611402552",
  appId: "1:597611402552:web:d4bb1a0804e1f3b791ddcd",
  measurementId: "G-VJBDBGPHV6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateWhatsAppNumber() {
  try {
    console.log('🔄 Actualizando número de WhatsApp en Firebase...');
    
    const configRef = doc(db, 'config', 'contact');
    
    await setDoc(configRef, {
      whatsappPhone: '50672752645',
      whatsappPhoneAlt: '50688311500',
      updatedAt: new Date().toISOString(),
      description: 'Configuración de números de WhatsApp para BiKitchen'
    });
    
    console.log('✅ Número actualizado exitosamente a: 50672752645 (7275-2645)');
    console.log('✅ El cambio se reflejará automáticamente en la aplicación');
    
  } catch (error) {
    console.error('❌ Error actualizando número:', error);
  }
}

updateWhatsAppNumber();
