/**
 * La cola del reloj del iPad: cada toque se guarda AQUÍ primero y después se
 * manda. Si no hay internet, queda guardado en el iPad y se manda solo cuando
 * vuelva, en el orden en que se tocó.
 *
 * Cada toque lleva su `idMarca` (inventado una vez); el servidor lo usa como id
 * del documento, así que mandar lo mismo dos veces (un reintento, otra pestaña
 * abierta) nunca duplica una marca.
 */

const LLAVE = 'bikitchen-reloj-pendientes-v1';
let memoria = [];             // si el iPad no deja guardar (modo privado), al menos vive mientras la página esté abierta

export const leerCola = () => {
    try {
        const guardada = JSON.parse(localStorage.getItem(LLAVE) || '[]');
        return Array.isArray(guardada) ? guardada : memoria;
    } catch {
        return memoria;
    }
};

export const guardarCola = (cola) => {
    memoria = cola;
    try { localStorage.setItem(LLAVE, JSON.stringify(cola)); } catch { /* queda en memoria */ }
};

const idNuevo = () => globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** Un toque: `accion` es una de ACCIONES_RELOJ ({ tipo, motivo }). */
export const nuevaMarca = (empleado, { tipo, motivo }, pin) => ({
    idMarca: idNuevo(),
    empleadoId: empleado.id,
    nombre: empleado.nombre,
    tipo,
    motivo: motivo || null,
    pin: pin || '',
    tocado: Date.now()
});

/** El estado de cada persona con lo que todavía no se mandó encima. */
export const conPendientes = (empleados, cola, desfase = 0) => empleados.map((e) => {
    const ultima = cola.filter(m => m.empleadoId === e.id).at(-1);
    if (!ultima) return e;
    return {
        ...e,
        adentro: ultima.tipo === 'entrada',
        almorzando: ultima.tipo === 'salida' && ultima.motivo === 'almuerzo',
        desde: new Date(ultima.tocado + desfase).toISOString(),
        pendiente: true
    };
});

/**
 * Manda la cola en orden. En el primer "sin internet" se detiene: eso y lo de
 * atrás esperan. Lo que el servidor contestó (guardada, ya estaba, PIN malo)
 * queda en `resultados` y sale de la cola.
 */
export const enviarCola = async (cola, enviar, ahora = Date.now) => {
    const resultados = new Map();
    for (const m of cola) {
        try {
            const datos = await enviar({
                empleadoId: m.empleadoId, pin: m.pin, idMarca: m.idMarca, tipo: m.tipo,
                ...(m.motivo ? { motivo: m.motivo } : {}),
                hace: Math.max(0, ahora() - m.tocado)
            });
            resultados.set(m.idMarca, { ok: true, datos });
        } catch (e) {
            if (e.sinInternet) break;
            resultados.set(m.idMarca, { ok: false, status: e.status, datos: e.datos || {}, error: e.message });
        }
    }
    return resultados;
};
