/**
 * Utilidades para manejo de fechas y calendarios de entrega en BiKitchen.
 * Centraliza la lógica para que PDF, Emails y Admin UI muestren lo mismo.
 */

/**
 * Parsea una string de fecha ISO (YYYY-MM-DD) a objeto Date de forma segura.
 */
export const parseDateStr = (s) => {
    if (!s) return null;
    try {
        const d = new Date(`${s}T00:00:00`);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
};

/**
 * Genera el calendario de entregas (1, 2 o 4 fechas) basado en el plan detectado.
 * @param {Object} order - El objeto de pedido desde Firestore
 * @returns {string[]} Array de fechas en formato YYYY-MM-DD
 */
export const getScheduleFromOrder = (order) => {
    // Normalización de texto para búsqueda
    const textJoin = (s) => (s || '').toString().toLowerCase();

    // 1. Identificar el número de entregas esperadas según el plan
    let targetCount = 1;

    // Revisar ítems del pedido
    const items = Array.isArray(order.items) && order.items.length > 0
        ? order.items
        : (Array.isArray(order.details?.cart) && order.details.cart.length > 0 ? order.details.cart : (order.menu || []));

    if (items.length > 0) {
        items.forEach(i => {
            const plan = textJoin(i.plan);
            const planLabel = textJoin(i.planLabel);
            const name = textJoin(i.name || i.nombre);
            const category = textJoin(i.category || '');
            const id = textJoin(i.id || '');

            // Planes: monthly (4 entregas) o biweekly (2 entregas)
            // El plan field es el indicador principal
            if (plan === 'monthly') {
                targetCount = Math.max(targetCount, 4);
            } else if (plan === 'biweekly') {
                targetCount = Math.max(targetCount, 2);
            }
            // Fallback: buscar en etiquetas y categoría
            else if (/mensual|monthly/.test(planLabel) || /mensual|monthly/.test(category)) {
                targetCount = Math.max(targetCount, 4);
            } else if (/quincenal|biweekly/.test(planLabel) || /quincenal|biweekly/.test(category)) {
                targetCount = Math.max(targetCount, 2);
            }
        });
    }

    // Revisar plan a nivel de pedido si no se determinó por ítems
    const orderPlan = textJoin(order.plan);
    if (orderPlan === 'monthly') {
        targetCount = Math.max(targetCount, 4);
    } else if (orderPlan === 'biweekly') {
        targetCount = Math.max(targetCount, 2);
    }

    // 2. Intentar obtener fechas ya guardadas
    const savedSched = Array.isArray(order.fechas_entrega)
        ? order.fechas_entrega
        : (Array.isArray(order.details?.fechasEntrega) ? order.details.fechasEntrega : []);
    
    const validSched = savedSched.filter(Boolean);

    // Las fechas GUARDADAS mandan siempre que haya más de una.
    //
    // Se calcularon al comprar, con el carrito completo delante, así que son la
    // verdad. Lo que se deduce acá arriba trabaja con el pedido ya guardado, al
    // que el checkout le quita el campo `plan` del ítem: si la etiqueta que queda
    // no dice "quincenal" o "mensual", targetCount cae a 1 y las semanas 2, 3 y 4
    // desaparecían de la hoja de producción aunque estuvieran guardadas.
    //
    // Antes esto pedía además targetCount > 1, que es justo lo que fallaba en ese
    // caso. Nadie escribe fechas_entrega con varias fechas por accidente: solo lo
    // hacen el checkout y el importador, y en los dos casos es a propósito.
    if (validSched.length > 1 && validSched.length >= targetCount) {
        return validSched;
    }

    // 3. Fallback: Calcular a partir de la fecha base si faltan fechas o es un plan multi-entrega
    const baseStr = order.fecha_entrega || order.details?.fechaEntrega;
    if (!baseStr) return validSched.length > 0 ? validSched : [];

    try {
        // Parsear fecha en HORA LOCAL (no UTC) para evitar offset de timezone
        // Formato esperado: "YYYY-MM-DD"
        const [year, month, day] = baseStr.split('-');
        const base = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        if (isNaN(base.getTime())) return validSched.length > 0 ? validSched : [baseStr];

        const step = 7; // Entregas semanales
        const out = [];
        for (let i = 0; i < targetCount; i++) {
            const d = new Date(base);
            d.setDate(base.getDate() + i * step);
            const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            out.push(iso);
        }
        return out;
    } catch (e) {
        console.error('[getScheduleFromOrder] Error parseando fecha:', baseStr, e);
        return validSched.length > 0 ? validSched : [baseStr];
    }
};
