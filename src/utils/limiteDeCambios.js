/**
 * Cuántos cambios de ingredientes trae un pedido, y si se pasa del límite.
 *
 * "hacen muchos cambios de ingredientes en especificaciones, y quiere
 *  implementar algo para que solo puedan hacer como 2 cambios nada más porque
 *  si no es mucho despelote en la cocina" — Gina, 14 de setiembre de 2026.
 *
 * LA REGLA (decidida por Jan ese día):
 *
 *   - 2 cambios EN TOTAL por pack, sumando proteína, vegetal y harina.
 *   - Un cambio es "esto por aquello". Las restricciones —"no mariscos",
 *     "sin lácteos", alergias— NO cuentan: se aceptan siempre, aparte.
 *   - En la tienda web no se puede pasar de 2.
 *   - En lo que meten ellos (WhatsApp, especificaciones) se AVISA, no se bloquea.
 *   - Los clientes que ya tienen más se respetan hasta que renueven; la hoja
 *     los marca para que Gina lo sepa.
 *
 * Los cambios llegan de dos lados y se suman:
 *
 *   1. Los que eligió el cliente en la web: `customizations.proteinChanges`,
 *      `vegeChanges` y `carboChanges` de cada ítem.
 *   2. Los escritos en las observaciones: "Cambiar torta de yuca por PURE DE
 *      PAPA", "Plato 2 (Cochinita pibil) → Fajitas de pollo", "omelette en vez
 *      de pancakes".
 *
 * Un texto dice cuántos con el número de cosas que cambia: "Cambiar cochinita
 * y almuercitos por fajitas y pollo napolitano" son DOS cambios en una frase
 * (Karla Juárez, lunes 14).
 */

export const MAX_CAMBIOS_POR_PACK = 2;

const CAMPOS_ESTRUCTURADOS = ['proteinChanges', 'vegeChanges', 'carboChanges'];

/** Los cambios elegidos en la web, de todos los ítems del pedido. */
export const cambiosElegidosEnLaWeb = (pedido) => {
    const lista = Array.isArray(pedido?.items) && pedido.items.length ? pedido.items : (pedido?.menu || []);
    return (lista || []).reduce((total, it) => {
        const c = it?.customizations;
        if (!c || typeof c !== 'object') return total;
        return total + CAMPOS_ESTRUCTURADOS
            .reduce((n, campo) => n + (Array.isArray(c[campo]) ? c[campo].filter(x => x && (x.newValue || x.newProtein)).length : 0), 0);
    }, 0);
};

/** Cuántas cosas nombra un pedazo de frase: "cochinita y almuercitos" son 2. */
const cuantasCosas = (texto) => {
    const limpio = String(texto || '')
        .replace(/\([^)]*\)/g, ' ')                // "(chat 2 set)", "(lleva pack deluxe)"
        .replace(/\bel\s+|\bla\s+|\blos\s+|\blas\s+/gi, ' ')
        .trim();
    if (!limpio) return 1;
    // "cochinita y almuercitos", "tilapia, lomo y pollo". No se parte "pollo
    // en salsa de hongos y champiñones": solo cuenta si cada lado es corto.
    const partes = limpio.split(/\s*,\s*|\s+y\s+/i).map(p => p.trim()).filter(Boolean);
    if (partes.length < 2) return 1;
    return partes.every(p => p.split(/\s+/).length <= 4) ? partes.length : 1;
};

/**
 * Los cambios escritos en un texto, con qué se cambia por qué.
 *
 * @returns {string[]} un renglón por cambio encontrado (para mostrarlo)
 */
export const cambiosEscritos = (texto) => {
    const encontrados = [];
    const t = String(texto || '');

    // "Cambiar X por Y" / "cambio de X por Y" / "cambió X por Y"
    const reCambiar = /\bcambi(?:ar|o|ó|a|en)\s+(?:de\s+|el\s+|la\s+|los\s+|las\s+)?(.+?)\s+por\s+([^·.\n;]+)/gi;
    let m;
    while ((m = reCambiar.exec(t)) !== null) {
        const n = cuantasCosas(m[1]);
        for (let i = 0; i < n; i++) encontrados.push(`${m[1].trim()} → ${m[2].trim()}`);
    }

    // "Plato 2 (Cochinita pibil) → Fajitas…" — lo que deja el panel al editar.
    // SOLO con "Plato N" adelante: una flecha suelta en una nota interna
    // ("Lugar escrito → Gina como Alajuela Tejar", Marianela Alfaro) no es un
    // cambio de comida.
    const reFlecha = /\bplato\s*\d+\s*(?:\([^)]*\))?\s*(?:→|->)\s*([^·.\n;]+)/gi;
    while ((m = reFlecha.exec(t)) !== null) {
        encontrados.push(`${m[0].split(/→|->/)[0].trim()} → ${m[1].trim()}`);
    }

    // "omelette en vez de pancakes"
    const reEnVez = /([^·.\n;]+?)\s+en\s+vez\s+de\s+([^·.\n;]+)/gi;
    while ((m = reEnVez.exec(t)) !== null) {
        if (/\bcambi(?:ar|o|ó|a|en)\b|→|->/i.test(m[0])) continue;
        encontrados.push(`${m[2].trim()} → ${m[1].trim()}`);
    }

    return encontrados;
};

/**
 * Todos los cambios de un pedido.
 *
 * @returns {{ total: number, web: number, escritos: string[], seExcede: boolean }}
 */
export const contarCambios = (pedido) => {
    const web = cambiosElegidosEnLaWeb(pedido);
    const escritos = cambiosEscritos(pedido?.observaciones);
    const total = web + escritos.length;
    return { total, web, escritos, seExcede: total > MAX_CAMBIOS_POR_PACK };
};

/** El aviso para crear un pedido desde WhatsApp, o null. */
export const avisoDeCambiosDeMas = (pedido) => {
    const { total, seExcede } = contarCambios(pedido);
    if (!seExcede) return null;
    return `Este pedido trae ${total} cambios de ingredientes y el máximo es ${MAX_CAMBIOS_POR_PACK} por pack. `
        + 'Si es un cliente nuevo o una renovación, hablá con el cliente para dejarlo en 2. '
        + 'Las restricciones (no mariscos, sin lácteos) no cuentan.';
};

/**
 * Los avisos para el recuadro de revisión de la hoja: amarillos, porque los
 * clientes que ya lo pagaron se respetan hasta renovar.
 */
export const avisosDeCambiosEnLaHoja = (pedidos = []) => (pedidos || [])
    .filter(p => p && !/^cancel/i.test(String(p.status || '')))
    .map(p => ({ p, c: contarCambios(p) }))
    .filter(({ c }) => c.seExcede)
    .map(({ p, c }) => ({
        pedidoId: p.id || null,
        cliente: p.cliente || '',
        que: `Tiene ${c.total} cambios de ingredientes (el máximo es ${MAX_CAMBIOS_POR_PACK} por pack). `
            + 'Se respeta porque ya está pagado; al renovar hay que dejarlo en 2.',
        comoSeArregla: 'Cuando renueve, avisale del límite de 2 cambios.',
        gravedad: 'media'
    }));
