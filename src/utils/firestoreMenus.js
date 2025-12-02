/**
 * firestoreMenus.js
 *
 * Utilidades para gestionar el menú oficial de BiKitchen.
 * Usa un único documento "oficial" sin depender de fechas.
 * 
 * Colección: menus_oficial (documento único "current")
 */

import { db } from '../firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

// Menú oficial por defecto (plantilla BiKitchen)
const DEFAULT_MENUS = {
  sinCarbos: [
    { numero: 1, proteina: 'Trocitos de res en salsa de hongos', vegetal: 'Ayotes salteados', carbo: '—' },
    { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Picadillo mixto', carbo: '—' },
    { numero: 3, proteina: 'Bistec de cerdo encebollado', vegetal: 'Vegetales asados', carbo: '—' },
    { numero: 4, proteina: 'Fajitas de pollo encebolladas', vegetal: 'Picadillo mixto', carbo: '—' },
    { numero: 5, proteina: 'Pollo en salsa BBQ', vegetal: 'Ensalada coleslaw', carbo: '—' }
  ],
  bajoCalorias: [
    { numero: 1, proteina: 'Canelones relleno de carne molida', vegetal: 'Ayotes salteados', carbo: 'Arroz blanco' },
    { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Guiso de chayote con maíz dulce', carbo: 'Arroz blanco' },
    { numero: 3, proteina: 'Bistec de cerdo encebollado', vegetal: 'Vegetales asados', carbo: 'Puré de papa' },
    { numero: 4, proteina: 'Fajitas de pollo encebolladas', vegetal: 'Picadillo mixto', carbo: 'Arroz jardinero' },
    { numero: 5, proteina: 'Pollo en salsa BBQ', vegetal: 'Ensalada coleslaw', carbo: 'Yuca frita' }
  ],
  regular: [
    { numero: 1, proteina: 'Canelones relleno de carne molida', vegetal: 'Ayotes salteados', carbo: 'Arroz blanco' },
    { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Guiso de chayote con maíz dulce', carbo: 'Arroz blanco' },
    { numero: 3, proteina: 'Bistec de cerdo encebollado', vegetal: 'Vegetales asados', carbo: 'Puré de papa' },
    { numero: 4, proteina: 'Fajitas de pollo encebolladas', vegetal: 'Picadillo mixto', carbo: 'Arroz jardinero' },
    { numero: 5, proteina: 'Pollo en salsa BBQ', vegetal: 'Ensalada coleslaw', carbo: 'Yuca frita' }
  ],
  keto: [
    { numero: 1, proteina: 'Zucchini rellenos con carne molida', vegetal: 'Vegetales salteados', carbo: '—' },
    { numero: 2, proteina: 'Pollo al curry con crema de coco', vegetal: 'Brócoli salteado', carbo: '—' },
    { numero: 3, proteina: 'Bistec de res con mantequilla de ajo', vegetal: 'Zanahoria baby y kale', carbo: '—' },
    { numero: 4, proteina: 'Pechuga de pollo rellena de queso crema', vegetal: 'Zuchinni asado', carbo: '—' },
    { numero: 5, proteina: 'Pollo BBQ con tocino', vegetal: 'Ensalada coleslaw keto', carbo: '—' }
  ],
  vegetariano: [
    { numero: 1, proteina: 'Tofu en salsa teriyaki', vegetal: 'Brócoli salteado', carbo: 'Arroz integral' },
    { numero: 2, proteina: 'Hamburguesa de lentejas', vegetal: 'Zanahoria y repollo al vapor', carbo: 'Puré de papa' },
    { numero: 3, proteina: 'Canelones rellenos de espinaca y ricotta', vegetal: 'Ayotes salteados', carbo: 'Arroz blanco' },
    { numero: 4, proteina: 'Tortilla de vegetales', vegetal: 'Picadillo mixto', carbo: 'Yuca frita' },
    { numero: 5, proteina: 'Ensalada de garbanzos con aguacate', vegetal: 'Ensalada verde', carbo: 'Quinoa' }
  ],
  casaditos: [
    { numero: 1, proteina: 'Pollo en salsa criolla', vegetal: 'Ensalada verde', carbo: 'Arroz y frijoles' },
    { numero: 2, proteina: 'Bistec encebollado', vegetal: 'Picadillo de papa', carbo: 'Arroz blanco' },
    { numero: 3, proteina: 'Carne mechada', vegetal: 'Picadillo de chayote', carbo: 'Arroz blanco' },
    { numero: 4, proteina: 'Pescado empanizado', vegetal: 'Ensalada coleslaw', carbo: 'Puré de papa' },
    { numero: 5, proteina: 'Cerdo en salsa BBQ', vegetal: 'Zanahoria salteada', carbo: 'Arroz integral' }
  ],
  fullPack: [
    { numero: 1, proteina: 'Pollo en salsa BBQ', vegetal: 'Picadillo mixto', carbo: 'Puré de papa' },
    { numero: 2, proteina: 'Bistec encebollado', vegetal: 'Vegetales asados', carbo: 'Arroz blanco' },
    { numero: 3, proteina: 'Fajitas de pollo encebolladas', vegetal: 'Ensalada coleslaw', carbo: 'Yuca frita' },
    { numero: 4, proteina: 'Carne en salsa criolla', vegetal: 'Ayotes salteados', carbo: 'Arroz jardinero' },
    { numero: 5, proteina: 'Pollo al curry', vegetal: 'Guiso de chayote con maíz dulce', carbo: 'Arroz blanco' }
  ]
};

/**
 * getOfficialMenus
 * 
 * Obtiene el menú oficial actual. Si no existe en Firestore, retorna la plantilla por defecto.
 */
export async function getOfficialMenus() {
  try {
    const ref = doc(db, 'menus_oficial', 'current');
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      // Si no existe, guardar la plantilla por defecto y retornarla
      await saveOfficialMenus(DEFAULT_MENUS);
      return DEFAULT_MENUS;
    }
    
    const data = snap.data();
    // Normalizar: asegurar que ceroCarbos exista como alias de sinCarbos
    if (data.sinCarbos && !data.ceroCarbos) {
      data.ceroCarbos = data.sinCarbos;
    }
    return data;
  } catch (error) {
    console.error('[Menus] Error obteniendo menú oficial:', error);
    // En caso de error, retornar plantilla por defecto
    return DEFAULT_MENUS;
  }
}

/**
 * saveOfficialMenus
 * 
 * Guarda el menú oficial (único documento, sin fechas).
 */
export async function saveOfficialMenus(data, meta = {}) {
  const ref = doc(db, 'menus_oficial', 'current');
  
  // Asegurar que ceroCarbos sea alias de sinCarbos
  const payload = {
    ...data,
    ceroCarbos: data.sinCarbos || data.ceroCarbos,
    meta: {
      lastModifiedAt: serverTimestamp(),
      ...meta
    }
  };
  
  await setDoc(ref, payload, { merge: true });
}

/**
 * resetToDefaultMenus
 * 
 * Restaura el menú oficial a la plantilla por defecto.
 */
export async function resetToDefaultMenus() {
  await saveOfficialMenus(DEFAULT_MENUS, { resetBy: 'admin' });
  return DEFAULT_MENUS;
}

// Funciones legacy para compatibilidad (redirigen al menú oficial)
export async function getMenusByWeek() {
  return getOfficialMenus();
}

export async function saveMenusByWeek(weekId, data, meta = {}) {
  return saveOfficialMenus(data, meta);
}

export async function getBaseMenus() {
  return DEFAULT_MENUS;
}

export async function getActiveWeek() {
  return 'oficial';
}

export async function setActiveWeek() {
  // No hace nada, siempre es el menú oficial
  return;
}

export async function duplicatePreviousWeek() {
  // Retorna el menú oficial actual
  return getOfficialMenus();
}
