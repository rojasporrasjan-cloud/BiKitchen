/**
 * Registro operativo de trabajos de impresión.
 *
 * Sirve para diagnóstico: qué se mandó a imprimir, cuándo, cuánto y si fue
 * simulación o impresión real. NO es fuente de verdad de nada: los pedidos y la
 * producción se calculan siempre desde `pedidos`, jamás desde acá.
 *
 * Vive en localStorage y no en Firestore a propósito. `firestore.rules` termina
 * con un `allow read, write: if false` para todo lo que no esté declarado, así
 * que una colección nueva sería rechazada en silencio; y la cabecera de ese
 * archivo advierte que desplegarlo podría romper el checkout. Un registro de
 * diagnóstico no justifica tocar las reglas de la base de datos.
 *
 * Si algún día hace falta compartirlo entre computadoras, se cambia solo este
 * archivo: nadie más habla con el almacenamiento.
 */

const STORAGE_KEY = 'bikitchen_print_jobs';
const MAX_ENTRIES = 200;

export const JOB_KIND = {
    BATCH: 'lote',
    REPRINT: 'reimpresion'
};

export const readJobLog = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

/**
 * Agrega una entrada al registro.
 *
 * @param {{ productionDate, expirationDate, quantity, kind, simulated, status, detail, user }} entry
 */
export const appendJobLog = (entry) => {
    const registro = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        productionDate: entry.productionDate || null,
        expirationDate: entry.expirationDate || null,
        quantity: entry.quantity || 0,
        kind: entry.kind || JOB_KIND.BATCH,
        simulated: entry.simulated !== false,
        status: entry.status || 'desconocido',
        detail: entry.detail || '',
        user: entry.user || null
    };

    try {
        const actual = readJobLog();
        const siguiente = [registro, ...actual].slice(0, MAX_ENTRIES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(siguiente));
    } catch {
        // Que no se pueda registrar nunca debe impedir imprimir.
    }

    return registro;
};

export const clearJobLog = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // sin efecto
    }
};
