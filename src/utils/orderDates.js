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
            
            // Mensual: 4 entregas (mensual, monthly, two pack, familiar)
            if (plan === 'monthly' || /mensual|monthly/.test(planLabel) || /two pack|familiar/.test(name)) {
                targetCount = Math.max(targetCount, 4);
            } 
            // Quincenal: 2 entregas (quincenal, biweekly)
            else if (plan === 'biweekly' || /quincenal|biweekly/.test(planLabel)) {
                targetCount = Math.max(targetCount, 2);
            }
        });
    }

    // Revisar plan a nivel de pedido si no se determinó por ítems
    const orderPlan = textJoin(order.plan);
    if (/mensual|monthly|two pack|familiar/.test(orderPlan)) {
        targetCount = Math.max(targetCount, 4);
    } else if (/quincenal|biweekly/.test(orderPlan)) {
        targetCount = Math.max(targetCount, 2);
    }

    // 2. Intentar obtener fechas ya guardadas
    const savedSched = Array.isArray(order.fechas_entrega)
        ? order.fechas_entrega
        : (Array.isArray(order.details?.fechasEntrega) ? order.details.fechasEntrega : []);
    
    const validSched = savedSched.filter(Boolean);

    // Si ya tenemos el número correcto de fechas guardadas, usarlas
    if (validSched.length >= targetCount && targetCount > 1) {
        return validSched;
    }

    // 3. Fallback: Calcular a partir de la fecha base si faltan fechas o es un plan multi-entrega
    const baseStr = order.fecha_entrega || order.details?.fechaEntrega;
    if (!baseStr) return validSched.length > 0 ? validSched : [];

    try {
        const base = new Date(`${baseStr}T00:00:00`);
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
    } catch {
        return validSched.length > 0 ? validSched : [baseStr];
    }
};
