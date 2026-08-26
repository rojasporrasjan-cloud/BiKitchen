/**
 * Production View Helper Utilities
 */

export const MARGEN_COCINA = 1.30;

export const conMargen = (cantidad) => Math.round((Number(cantidad) || 0) * MARGEN_COCINA);

export const normalizeClientKey = (name) => {
    if (!name) return '';
    return String(name)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
};

/**
 * Fusiona pedidos del mismo cliente (mismo nombre normalizado o mismo teléfono).
 *
 * Cuando hay match, el segundo pedido se descarta: solo se conservan sus
 * observaciones y zona de envío, sus ITEMS se pierden. Por eso se devuelve
 * también `fusionados`, para que la pantalla pueda avisar cuáles pedidos
 * quedaron absorbidos por otro (ver RevisionHoja).
 *
 * Vive acá (no en PrintProductionView) para que Etiquetas pueda usar la MISMA
 * fusión que la hoja de producción: si cada pantalla dedupilcara a su manera,
 * la cantidad de etiquetas y la cantidad que se cocina podrían no coincidir.
 *
 * @param {Array} ordersList - pedidos ya normalizados por mapPedidosFromLegacy
 * @returns {{ pedidos: Array, fusionados: Array }}
 */
export const deduplicateOrdersByClient = (ordersList) => {
    if (!ordersList || ordersList.length === 0) return { pedidos: [], fusionados: [] };
    const seen = new Map();
    const result = [];
    const fusionados = [];

    ordersList.forEach(order => {
        const clientName = order.cliente || order.nombre || '';
        const normKey = normalizeClientKey(clientName);
        const tokens = normKey.split(/\s+/).filter(t => t.length > 2);

        let existingKey = null;
        for (const [key, val] of seen.entries()) {
            const keyTokens = key.split(/\s+/).filter(t => t.length > 2);
            const samePhone = order.telefono && val.telefono && String(order.telefono).replace(/\D/g, '') === String(val.telefono).replace(/\D/g, '') && String(order.telefono).replace(/\D/g, '').length >= 8;
            const isMatch = key === normKey ||
                samePhone ||
                (tokens.length >= 2 && tokens.every(t => key.includes(t))) ||
                (keyTokens.length >= 2 && keyTokens.every(t => normKey.includes(t)));

            if (isMatch) {
                existingKey = key;
                break;
            }
        }

        if (existingKey) {
            const existingOrder = seen.get(existingKey);
            const numeroDe = (o) => o.rawPedido?.numeroOrden || o.numeroOrden || o.id;
            fusionados.push({
                cliente: order.cliente || existingOrder.cliente || '',
                absorbido: numeroDe(order),
                absorbidoPlan: order.plan || order.tipoMenu || '',
                conserva: numeroDe(existingOrder),
                conservaPlan: existingOrder.plan || existingOrder.tipoMenu || ''
            });
            const newObs = order.observaciones || order.details?.notes || '';
            if (newObs) {
                if (!existingOrder.observaciones) {
                    existingOrder.observaciones = newObs;
                } else if (!existingOrder.observaciones.toLowerCase().includes(newObs.toLowerCase())) {
                    existingOrder.observaciones += ` · ${newObs}`;
                }
            }
            if (order.zona_envio && !existingOrder.zona_envio) {
                existingOrder.zona_envio = order.zona_envio;
            }
        } else {
            const orderCopy = { ...order };
            seen.set(normKey, orderCopy);
            result.push(orderCopy);
        }
    });

    return { pedidos: result, fusionados };
};

export const filterNoteForDish = (obs, currentDish, allDishes) => {
    if (!obs) return '';
    const currentProt = (currentDish?.proteina?.nombre || (typeof currentDish?.proteina === 'string' ? currentDish.proteina : '') || '').toLowerCase();

    const clauses = String(obs).split(/\s*[\·\|—]\s*/).map(c => c.trim()).filter(Boolean);

    const filteredClauses = clauses.filter(clause => {
        const lowerClause = clause.toLowerCase();

        if (lowerClause.includes('cambiar ')) {
            const match = lowerClause.match(/cambiar\s+(.*?)(?:\s+por\s+|$)/i);
            if (match && match[1]) {
                const sourceDishText = match[1].trim();
                const currentKeywords = currentProt.split(/\s+/).filter(k => k.length > 3 && !['salsa', 'con', 'para', 'de', 'el', 'la'].includes(k));
                const matchesCurrentDish = currentKeywords.some(kw => sourceDishText.includes(kw));

                if (matchesCurrentDish) {
                    return true; // Keep this change instruction on its home dish!
                }

                const matchesOtherDish = (allDishes || []).some(d => {
                    const dishProt = (d.proteina?.nombre || (typeof d.proteina === 'string' ? d.proteina : '') || '').toLowerCase();
                    if (!dishProt || dishProt === currentProt) return false;
                    const keywords = dishProt.split(/\s+/).filter(k => k.length > 3 && !['salsa', 'con', 'para', 'de', 'el', 'la'].includes(k));
                    return keywords.some(kw => sourceDishText.includes(kw));
                });

                if (matchesOtherDish) {
                    return false;
                }
            }
        }

        return true;
    });

    return filteredClauses.join(' · ');
};
