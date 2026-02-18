// Script temporal para actualizar precios del Two Pack con 25% de descuento
// Ejecutar desde la consola del navegador en localhost

import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function updateTwoPackPrices() {
  try {
    const ref = doc(db, 'config', 'pack_prices');
    const snap = await getDoc(ref);
    
    const currentPrices = snap.exists() ? snap.data() : {};
    
    // Precios correctos del Two Pack con 25% de descuento
    // Fórmula: semanal × 4 × 0.75
    const twoPackPrices = {
      'Pack Sin Carbos': { weekly: 49000, biweekly: 91000, monthly: 147000 },      // 49000 × 4 × 0.75 = 147000
      'Pack Bajo Calorías': { weekly: 51700, biweekly: 93000, monthly: 155100 },   // 51700 × 4 × 0.75 = 155100
      'Pack Regular': { weekly: 55700, biweekly: 100260, monthly: 167100 },        // 55700 × 4 × 0.75 = 167100
      'Pack Casaditos': { weekly: 55700, biweekly: 100260, monthly: 167100 },      // 55700 × 4 × 0.75 = 167100
      'Full Pack': { weekly: 67800, biweekly: 126000, monthly: 203400 },           // 67800 × 4 × 0.75 = 203400
      'Pack Vegetariano': { weekly: 55700, biweekly: 100260, monthly: 167100 },    // 55700 × 4 × 0.75 = 167100
      'Pack Keto': { weekly: 67800, biweekly: 126000, monthly: 203400 }            // 67800 × 4 × 0.75 = 203400
    };
    
    const updatedPrices = {
      ...currentPrices,
      two_pack: {
        ...currentPrices.two_pack,
        packs: twoPackPrices
      },
      lastModifiedAt: serverTimestamp()
    };
    
    await setDoc(ref, updatedPrices, { merge: true });
    
    console.log('✅ Precios del Two Pack actualizados correctamente con 25% de descuento');
    console.log('Nuevos precios:', twoPackPrices);
    
    return true;
  } catch (error) {
    console.error('❌ Error actualizando precios:', error);
    return false;
  }
}

// Para ejecutar desde consola:
// import { updateTwoPackPrices } from './scripts/updateTwoPackPrices';
// updateTwoPackPrices();
