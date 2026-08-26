/**
 * Ajustes de la impresora de etiquetas.
 *
 * Existen porque no hay forma de calcular en qué punto exacto del cabezal cae
 * el rollo: depende de cómo esté montado físicamente. En vez de adivinar un
 * número en el código, se calibra una vez desde el panel y queda guardado.
 *
 * Se guardan en DOS lados a propósito:
 *
 *   localStorage → respuesta inmediata y funciona sin internet. Es lo que se
 *                  lee al abrir la pantalla, para no mostrar la etiqueta mal
 *                  calibrada mientras llega la red.
 *   Firestore    → la impresora es siempre la misma, así que la calibración
 *                  sirve para cualquiera que entre desde cualquier computadora.
 *                  Vive en `admin_config`, que ya es solo-admin en las reglas.
 *
 * Si Firestore falla, se sigue trabajando con lo local: calibrar no puede
 * depender de que haya internet.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

const STORAGE_KEY = 'bikitchen_printer_settings';
const REMOTE_COLLECTION = 'admin_config';
const REMOTE_DOC = 'printer_labels';

export const DEFAULT_SETTINGS = {
    // Tamaño real del rollo cargado
    widthMm: 30,
    heightMm: 20,
    // Corrimiento del contenido sobre la etiqueta, en milímetros.
    // Positivo = hacia la derecha / hacia abajo.
    offsetXmm: 0,
    offsetYmm: 0,
    // 1..15, más alto = más oscuro
    density: 15,
    // 1 (lenta, más nítida) .. 5 (rápida).
    // 3 es el valor con el que salió la primera etiqueta física correcta.
    speed: 3,
    // ── Diseño de la etiqueta ──
    // Qué se imprime y qué tan grande. Se toca desde el panel, sin programar.
    useLogo: true,
    brandText: 'BIKITCHEN FOOD',  // se usa cuando el logo está apagado
    showTipo: true,               // la línea del plan (Regular, Keto…)
    showVence: true,
    showDivider: true,
    logoScale: 1,                 // 0.6 a 1.4 sobre el tamaño base
    dishScale: 1,                 // 0.6 a 1.4 sobre el tamaño base

    // ── Fiabilidad en lotes ──
    // La M110 imprime a ~18 mm/s: una etiqueta de 20 mm tarda más de un segundo
    // en salir. Si la siguiente se manda antes de que termine, la impresora se
    // queda sin memoria y pierde etiquetas. Pasó de verdad: de un lote de 11
    // salieron 9 y la décima quedó cortada.
    //
    // 0 = calcular la pausa según el alto de la etiqueta (recomendado).
    interLabelDelayMs: 0,
    // Escribir esperando el acuse de la impresora. Más lento y mucho más
    // seguro; con "sin confirmación" los bloques se pierden en lotes largos.
    reliableWrite: true
};

export const readSettings = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
};

export const saveSettings = (settings) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Si no se puede guardar, se sigue usando lo que está en memoria.
    }
    return settings;
};

export const resetSettings = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // sin efecto
    }
    saveSharedSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
};

/**
 * Trae la calibración compartida. Devuelve null si no hay o si falla la red,
 * y en ese caso quien llama se queda con la local.
 */
export const loadSharedSettings = async () => {
    try {
        const snap = await getDoc(doc(db, REMOTE_COLLECTION, REMOTE_DOC));
        if (!snap.exists()) return null;
        const data = snap.data();
        if (!data || typeof data !== 'object') return null;
        const merged = { ...DEFAULT_SETTINGS, ...data };
        delete merged.updatedAt;
        delete merged.updatedBy;
        // Cachear para el próximo arranque, incluso sin internet.
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* opcional */ }
        return merged;
    } catch (err) {
        console.error('[printerSettings] No se pudo leer la calibración compartida:', err);
        return null;
    }
};

/** Publica la calibración para las demás computadoras. No bloquea la impresión. */
export const saveSharedSettings = async (settings, user = null) => {
    try {
        await setDoc(
            doc(db, REMOTE_COLLECTION, REMOTE_DOC),
            { ...settings, updatedAt: new Date().toISOString(), updatedBy: user },
            { merge: true }
        );
        return true;
    } catch (err) {
        console.error('[printerSettings] No se pudo guardar la calibración compartida:', err);
        return false;
    }
};
