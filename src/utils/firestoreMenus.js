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
  getDocFromServer,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { cachedFetch, invalidateCache, invalidateCacheByType, setCache } from './firestoreCache';

// Menú oficial por defecto (plantilla BiKitchen)
export const DEFAULT_MENUS = {
  sinCarbos: [
    { numero: 1, proteina: 'Pollo en salsa criolla', vegetal: 'Picadillo de zucchini', carbo: '—' },
    { numero: 2, proteina: 'Lomo de cerdo en salsa gravy', vegetal: 'Vegetales salteados', carbo: '—' },
    { numero: 3, proteina: 'Pollo al pesto', vegetal: 'Crema de vegetales', carbo: '—' },
    { numero: 4, proteina: 'Fajitas de lomo con chimichurri', vegetal: 'Picadillo de vainica y zanahoria', carbo: '—' },
    { numero: 5, proteina: 'Pollo en salsa de hongos', vegetal: 'Chayotes gratinados', carbo: '—' }
  ],
  bajoCalorias: [
    { numero: 1, proteina: 'Pollo en salsa criolla', vegetal: 'Ensalada fresca', carbo: 'Arroz y frijoles' },
    { numero: 2, proteina: 'Carne mechada', vegetal: 'Ensalada verde', carbo: 'Picadillo de papa' },
    { numero: 3, proteina: 'Filet de tilapia al ajillo', vegetal: 'Vegetales salteados', carbo: 'Arroz blanco' },
    { numero: 4, proteina: 'Pollo en salsa de mostaza', vegetal: 'Ensalada mixta', carbo: 'Picadillo mixto' },
    { numero: 5, proteina: 'Pollo asado', vegetal: 'Ensalada fresca', carbo: 'Arroz blanco' }
  ],
  regular: [
    { numero: 1, proteina: 'Pollo en salsa criolla', vegetal: 'Ensalada fresca', carbo: 'Arroz y frijoles' },
    { numero: 2, proteina: 'Carne mechada', vegetal: 'Ensalada verde', carbo: 'Picadillo de papa' },
    { numero: 3, proteina: 'Filet de tilapia al ajillo', vegetal: 'Vegetales salteados', carbo: 'Arroz blanco' },
    { numero: 4, proteina: 'Pollo en salsa de mostaza', vegetal: 'Ensalada mixta', carbo: 'Picadillo mixto' },
    { numero: 5, proteina: 'Pollo asado', vegetal: 'Ensalada fresca', carbo: 'Arroz blanco' }
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
    { numero: 1, proteina: 'Pollo en salsa criolla', vegetal: 'Ensalada fresca', carbo: 'Arroz y frijoles' },
    { numero: 2, proteina: 'Carne mechada', vegetal: 'Ensalada verde', carbo: 'Picadillo de papa' },
    { numero: 3, proteina: 'Filet de tilapia al ajillo', vegetal: 'Vegetales salteados', carbo: 'Arroz blanco' },
    { numero: 4, proteina: 'Pollo en salsa de mostaza', vegetal: 'Ensalada mixta', carbo: 'Picadillo mixto' },
    { numero: 5, proteina: 'Pollo asado', vegetal: 'Ensalada fresca', carbo: 'Arroz blanco' }
  ],
  desayuno: [
    { numero: 1, proteina: 'Gallo pinto con huevos revueltos', vegetal: 'Queso fresco', carbo: 'Tortilla' },
    { numero: 2, proteina: 'Tostadas francesas con miel', vegetal: 'Frutas frescas', carbo: 'Café o jugo' },
    { numero: 3, proteina: 'Pastel de tortilla con frijol y queso', vegetal: 'Natilla', carbo: 'Café o jugo' },
    { numero: 4, proteina: 'Flautas de queso con salsa ranchera', vegetal: 'Frijoles molidos', carbo: 'Café o jugo' },
    { numero: 5, proteina: 'Gallo pinto con huevo y jamón', vegetal: 'Queso y natilla', carbo: 'Tortilla' }
  ],
  familiarPremium: [
    { numero: 1, proteina: 'Spaguettis en salsa pomodoro con pollo', vegetal: '4 porciones', carbo: '—' },
    { numero: 2, proteina: 'Salchichas con papas', vegetal: '4 porciones', carbo: '—' },
    { numero: 3, proteina: 'Trocitos de cerdo en salsa de piña', vegetal: '500 g', carbo: '—' },
    { numero: 4, proteina: 'Crema de ayote sazón', vegetal: '4 porciones', carbo: '—' },
    { numero: 5, proteina: 'Tortas de huevo con espinacas', vegetal: '4 porciones', carbo: '—' },
    { numero: 6, proteina: 'Puré de camote', vegetal: '4 porciones', carbo: '—' }
  ],
  familiarDeluxe: [
    { numero: 1, proteina: 'Arroz con palmito gratinado', vegetal: '4 porciones', carbo: '—' },
    { numero: 2, proteina: 'Carne mechada en salsa', vegetal: '4 porciones', carbo: '—' },
    { numero: 3, proteina: 'Pollo con papas achiotado', vegetal: '4 porciones', carbo: '—' },
    { numero: 4, proteina: 'Picadillo de vainica con zanahoria y carne molida', vegetal: '4 porciones', carbo: '—' },
    { numero: 5, proteina: 'Filet de tilapia empanizada', vegetal: '4 porciones', carbo: '—' },
    { numero: 6, proteina: 'Yuca al ajillo', vegetal: '4 porciones', carbo: '—' },
    { numero: 7, proteina: 'Escabeche de vegetales', vegetal: '4 porciones', carbo: '—' }
  ],
  // ========== MENÚS DE CENA (Separados del almuerzo) ==========
  // Estructura: { menuType: { cena: [...platos] } }
  cena: {
    fullPack: [
      { numero: 1, proteina: 'Fajitas mixtas encebolladas', vegetal: 'Ensalada fresca', carbo: 'Papas salteadas' },
      { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Vegetales salteados', carbo: 'Puré de papa' },
      { numero: 3, proteina: 'Pollo en salsa de mostaza', vegetal: 'Ensalada mixta', carbo: 'Arroz blanco' },
      { numero: 4, proteina: 'Carne en salsa de res', vegetal: 'Ensalada verde', carbo: 'Arroz y frijoles' },
      { numero: 5, proteina: 'Filet de tilapia al ajillo', vegetal: 'Vegetales al vapor', carbo: 'Arroz blanco' }
    ],
    keto: [
      { numero: 1, proteina: 'Salmón con mantequilla de ajo', vegetal: 'Espárragos envueltos en tocino', carbo: '—' },
      { numero: 2, proteina: 'Pollo relleno de queso y espinaca', vegetal: 'Coliflor rostizada', carbo: '—' },
      { numero: 3, proteina: 'Lomo en salsa cremosa', vegetal: 'Ensalada César sin crutones', carbo: '—' },
      { numero: 4, proteina: 'Camarones al ajillo', vegetal: 'Calabacín en espiral', carbo: '—' },
      { numero: 5, proteina: 'Bistec con mantequilla de hierbas', vegetal: 'Champiñones salteados', carbo: '—' }
    ],
    bajoCalorias: [
      { numero: 1, proteina: 'Fajitas mixtas encebolladas', vegetal: 'Ensalada fresca', carbo: 'Papas salteadas' },
      { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Vegetales salteados', carbo: 'Puré de papa' },
      { numero: 3, proteina: 'Pollo en salsa de mostaza', vegetal: 'Ensalada mixta', carbo: 'Arroz blanco' },
      { numero: 4, proteina: 'Carne en salsa de res', vegetal: 'Ensalada verde', carbo: 'Arroz y frijoles' },
      { numero: 5, proteina: 'Filet de tilapia al ajillo', vegetal: 'Vegetales al vapor', carbo: 'Arroz blanco' }
    ],
    sinCarbos: [
      { numero: 1, proteina: 'Cerdo en salsa BBQ', vegetal: 'Picadillo mixto', carbo: '—' },
      { numero: 2, proteina: 'Pollo en salsa de mostaza', vegetal: 'Vegetales salteados', carbo: '—' },
      { numero: 3, proteina: 'Filet de tilapia al ajillo', vegetal: 'Picadillo de zucchini', carbo: '—' },
      { numero: 4, proteina: 'Carne en salsa de res', vegetal: 'Ayotes salteados', carbo: '—' },
      { numero: 5, proteina: 'Pollo en salsa criolla', vegetal: 'Picadillo de chayote', carbo: '—' }
    ],
    regular: [
      { numero: 1, proteina: 'Fajitas mixtas encebolladas', vegetal: 'Ensalada fresca', carbo: 'Papas salteadas' },
      { numero: 2, proteina: 'Pollo en salsa criolla', vegetal: 'Vegetales salteados', carbo: 'Puré de papa' },
      { numero: 3, proteina: 'Pollo en salsa de mostaza', vegetal: 'Ensalada mixta', carbo: 'Arroz blanco' },
      { numero: 4, proteina: 'Carne en salsa de res', vegetal: 'Ensalada verde', carbo: 'Arroz y frijoles' },
      { numero: 5, proteina: 'Filet de tilapia al ajillo', vegetal: 'Vegetales al vapor', carbo: 'Arroz blanco' }
    ],
    vegetariano: [
      { numero: 1, proteina: 'Tofu teriyaki', vegetal: 'Edamame y brócoli', carbo: 'Arroz jazmín' },
      { numero: 2, proteina: 'Hamburguesa de frijol negro', vegetal: 'Ensalada de col', carbo: 'Camote asado' },
      { numero: 3, proteina: 'Curry de garbanzos', vegetal: 'Espinacas', carbo: 'Arroz basmati' },
      { numero: 4, proteina: 'Falafel horneado', vegetal: 'Ensalada tabule', carbo: 'Pan pita' },
      { numero: 5, proteina: 'Pasta primavera', vegetal: 'Vegetales de temporada', carbo: 'Pasta integral' }
    ],
    casaditos: [
      { numero: 1, proteina: 'Pollo guisado', vegetal: 'Ensalada de repollo', carbo: 'Arroz y frijoles' },
      { numero: 2, proteina: 'Carne en salsa', vegetal: 'Picadillo de papa', carbo: 'Tortillas' },
      { numero: 3, proteina: 'Cerdo en salsa roja', vegetal: 'Ensalada rusa', carbo: 'Arroz blanco' },
      { numero: 4, proteina: 'Bistec a la plancha', vegetal: 'Plátano maduro', carbo: 'Arroz y frijoles' },
      { numero: 5, proteina: 'Pollo frito', vegetal: 'Ensalada verde', carbo: 'Puré de papa' }
    ]
  }
};

/**
 * getOfficialMenus
 * 
 * Obtiene el menú oficial actual. Si no existe en Firestore, retorna la plantilla por defecto.
 * OPTIMIZADO: Usa caché local para reducir lecturas de Firestore
 * @param {boolean} forceRefresh - Si es true, ignora el caché y obtiene datos frescos de Firebase
 */
export async function getOfficialMenus(forceRefresh = false) {
  try {
    const ref = doc(db, 'menus_oficial', 'current');
    if (forceRefresh) {
      // Usar getDocFromServer para saltar el caché de Firebase SDK
      const snap = await getDocFromServer(ref);

      if (!snap.exists()) {
        console.warn('[getOfficialMenus] ⚠️ No existe documento current');
        // ELIMINADO: No intentar crear defaults automáticamente en lectura pública
        // Esto causaba que un error de red o permisos reiniciara la BD

        const error = new Error('No hay menús configurados en Firebase.');
        error.code = 'NO_MENUS_CONFIGURED';
        throw error;
      }

      const data = snap.data();
      // Actualizar caché local
      setCache('menus_official_current', data, 'menus_official');
      return data;
    }

    return await cachedFetch('menus_official_current', async () => {
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        const error = new Error('No hay menús configurados.');
        error.code = 'NO_MENUS_CONFIGURED';
        throw error;
      }
      return snap.data();
    }, 'menus_official');
  } catch (error) {
    console.error('[getOfficialMenus] Error:', error);
    throw error;
  }
}

/**
 * saveOfficialMenus
 * 
 * Guarda el menú oficial (único documento, sin fechas).
 */
export async function saveOfficialMenus(data, meta = {}) {
  const ref = doc(db, 'menus_oficial', 'current');

  // Limpiar campos antiguos de cena (cenaFullPack, cenaKeto, etc.)
  const cleanedData = { ...data };
  delete cleanedData.cenaFullPack;
  delete cleanedData.cenaKeto;
  delete cleanedData.cenaBajoCalorias;
  delete cleanedData.cenaSinCarbos;
  delete cleanedData.cenaRegular;
  delete cleanedData.cenaVegetariano;
  delete cleanedData.cenaCasaditos;

  const payload = {
    ...cleanedData,
    meta: {
      lastModifiedAt: serverTimestamp(),
      lastModifiedTimestamp: Date.now(), // Timestamp para forzar actualización
      ...meta
    }
  };

  
  if (Array.isArray(payload.desayuno)) {
      payload.desayuno.forEach((d, i) => {
      });
  }

  // VALIDACIÓN DE SEGURIDAD
  const isReset = meta.resetBy === 'admin' || meta.desayunosInitialized;
  const hasCriticalData = Array.isArray(data.desayuno) && Array.isArray(data.fullPack) && Array.isArray(data.regular);

  if (!isReset && !hasCriticalData && !meta.force) {
    console.error('❌ BLOQUEO DE SEGURIDAD: Intentando guardar menús incompletos', {
      hasDesayuno: Array.isArray(data.desayuno),
      hasFullPack: Array.isArray(data.fullPack),
      hasRegular: Array.isArray(data.regular)
    });
    throw new Error('SAFETY_LOCK: No se pueden guardar menús incompletos/vacíos. Recarga la página.');
  }

  await setDoc(ref, payload, { merge: false }); // merge: false para sobrescribir completamente

  // CRÍTICO: Invalidar TODO el caché de menús para forzar recarga en móviles
  invalidateCacheByType('menus_official');
  invalidateCache('menus_official');

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

/**
 * ensureDesayunosExist
 * 
 * Asegura que los desayunos existan en Firebase (sin usar caché).
 * Útil para inicialización o cuando se detecta que faltan desayunos.
 */
export async function ensureDesayunosExist() {
  try {
    const ref = doc(db, 'menus_oficial', 'current');
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // Si no existe el documento, crear con todos los menús por defecto
      await setDoc(ref, {
        ...DEFAULT_MENUS,
        meta: {
          lastModifiedAt: serverTimestamp(),
          createdBy: 'system',
          desayunosInitialized: true
        }
      });
      invalidateCache('menus_official');
      return true;
    }

    const data = snap.data();
    // Mejorar validación: Solo inicializar si el campo falta por COMPLETO o es nulo
    // Si ya tiene un array (aunque sea corto o con campos vacíos), respetarlo para no borrar cambios de Gina
    if (data.desayuno === undefined || data.desayuno === null) {
      // Si existe el documento pero no tiene la propiedad desayuno, agregarla
      await setDoc(ref, {
        desayuno: DEFAULT_MENUS.desayuno,
        meta: {
          ...data.meta,
          lastModifiedAt: serverTimestamp(),
          desayunosAddedBy: 'system'
        }
      }, { merge: true });
      invalidateCache('menus_official');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error asegurando desayunos:', error);
    return false;
  }
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

/**
 * getPackPrices
 * 
 * Obtiene los precios de los packs desde Firestore.
 * OPTIMIZADO: Usa caché local para reducir lecturas de Firestore
 */
export async function getPackPrices() {
  return cachedFetch('pack_prices', async () => {
    try {
      const ref = doc(db, 'config', 'pack_prices');
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        return null; // Usar precios por defecto
      }

      return snap.data();
    } catch (error) {
      console.error('[Menus] Error obteniendo precios:', error);
      return null;
    }
  }, 'prices');
}

/**
 * savePackPrices
 * 
 * Guarda los precios de los packs en Firestore.
 */
export async function savePackPrices(prices) {
  const ref = doc(db, 'config', 'pack_prices');

  const payload = {
    ...prices,
    lastModifiedAt: serverTimestamp()
  };

  await setDoc(ref, payload, { merge: true });

  // Invalidar caché
  invalidateCache('pack_prices');
}

/**
 * getIndividualPrices
 *
 * Obtiene las configuraciones de descuento de platos individuales desde Firestore.
 */
export async function getIndividualPrices() {
  return cachedFetch('individual_prices', async () => {
    try {
      const ref = doc(db, 'config', 'individual_prices');
      const snap = await getDoc(ref);
      if (!snap.exists()) return {};
      // Excluir campos de metadata del documento (no son configs de producto)
      const { lastModifiedAt, ...configs } = snap.data();
      return configs;
    } catch (error) {
      console.error('[Menus] Error obteniendo precios individuales:', error);
      return {};
    }
  }, 'prices');
}

/**
 * saveIndividualPrices
 *
 * Guarda las configuraciones de descuento de platos individuales en Firestore.
 */
export async function saveIndividualPrices(prices) {
  const ref = doc(db, 'config', 'individual_prices');
  await setDoc(ref, { ...prices, lastModifiedAt: serverTimestamp() }, { merge: true });
  invalidateCache('individual_prices');
}

/**
 * fixTwoPackPrices
 * 
 * Actualiza los precios del Two Pack en Firebase.
 * El Two Pack tiene 25% de descuento en el pack mensual + 10% de descuento en el envío mensual.
 */
export async function fixTwoPackPrices() {
  try {
    // IMPORTANTE: Esta función solo debe ejecutarse cuando hay permisos de admin
    // Si falla, no hacer nada (usuarios sin login no pueden escribir)
    const ref = doc(db, 'config', 'pack_prices');
    const snap = await getDoc(ref);

    const currentPrices = snap.exists() ? snap.data() : {};

    // Precios del Two Pack con 25% de descuento en pack mensual (Fórmula: semanal × 4 × 0.75)
    const twoPackPrices = {
      'Pack Sin Carbos': { weekly: 49000, biweekly: 91000, monthly: 147000 },
      'Pack Bajo Calorías': { weekly: 51700, biweekly: 93000, monthly: 155100 },
      'Pack Regular': { weekly: 55700, biweekly: 100260, monthly: 167100 },
      'Pack Casaditos': { weekly: 55700, biweekly: 100260, monthly: 167100 },
      'Full Pack': { weekly: 67800, biweekly: 126000, monthly: 203400 },
      'Pack Vegetariano': { weekly: 55700, biweekly: 100260, monthly: 167100 },
      'Pack Keto': { weekly: 67800, biweekly: 126000, monthly: 203400 }
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

    return true;
  } catch (error) {
    // Silenciar error de permisos - es normal para usuarios sin login
    if (error.code === 'permission-denied') {
      return false;
    }
    console.error('❌ Error actualizando precios:', error);
    return false;
  }
}
