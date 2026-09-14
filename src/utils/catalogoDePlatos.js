/**
 * Los nombres de platos que se pueden sugerir al escribir en la hoja.
 *
 * "yo pongo tilapia, me pongan todas las tilapias que hay para yo poder
 *  seleccionarla" — Jan, 14 de setiembre de 2026.
 *
 * Escribir el nombre IGUAL importa más que ahorrar teclas: "Pollo al curry" y
 * "pollo curry" son dos ollas distintas en la hoja de cocina, y "Filet de
 * tilapia" contra "tilapia" no se juntan solos.
 *
 * El orden de las fuentes decide cómo queda escrito un nombre repetido:
 *   1. La lista de proteínas de la semana (PAQUETES DE PROTEÍNA del Excel).
 *   2. Los platos del menú de la semana, de todas las familias y cenas.
 *   3. Los individuales de la tienda.
 *   4. Lo que ya se escribió en otros pedidos.
 * Nada de esto se lee de Firestore aparte: todo viene de lo que la pantalla ya
 * tiene cargado (REGLA 17).
 */

const sinTildes = (s) => String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/** "Pollo en salsa de paprika(500 g)" → "Pollo en salsa de paprika". */
export const nombreSinMedida = (nombre) => String(nombre ?? '')
    .replace(/\s*\(\s*\d[\d.,]*\s*(?:g|gr|gramos|kg|ml|l|tazas?|unidades?|porciones?|moldes?)\b[^)]*\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

// Lo que en el menú ocupa una casilla pero no es un plato.
const NO_ES_PLATO = /^(?:—|-|–|n\/a|no aplica|sin carbo|ninguno|\.)?$/i;
const ES_PRUEBA = /prueba/i;

/** Los platos de un menú: arreglos de { proteina, vegetal, carbo }, también dentro de `cena`. */
const platosDelMenu = (menus) => {
    const nombres = [];
    const recorrer = (valor, profundidad) => {
        if (!valor || profundidad > 2) return;
        if (Array.isArray(valor)) {
            valor.forEach((plato) => {
                if (plato && typeof plato === 'object') {
                    ['proteina', 'vegetal', 'carbo'].forEach(campo => nombres.push(plato[campo]));
                }
            });
            return;
        }
        if (typeof valor === 'object') {
            Object.entries(valor).forEach(([clave, v]) => {
                if (clave === 'meta' || clave === 'proteinasDisponibles') return;
                recorrer(v, profundidad + 1);
            });
        }
    };
    recorrer(menus, 0);
    return nombres;
};

/** Lo ya escrito en pedidos: proteínas de la compra, las de cada semana y los platos del menú propio. */
const platosDePedidos = (pedidos) => {
    const nombres = [];
    (pedidos || []).forEach((p) => {
        [...(Array.isArray(p?.items) ? p.items : []), ...(Array.isArray(p?.menu) ? p.menu : [])].forEach((it) => {
            (Array.isArray(it?.proteinas) ? it.proteinas : []).forEach(n => nombres.push(n));
            ['proteina', 'vegetal', 'carbo'].forEach(campo => nombres.push(it?.[campo]));
        });
        Object.values(p?.proteinasPorEntrega || {}).forEach(l => (Array.isArray(l) ? l : []).forEach(n => nombres.push(n)));
    });
    return nombres;
};

/**
 * @param {{menus?: object, individuales?: Array<{nombre}>, pedidos?: Array}} fuentes
 * @returns {string[]} nombres sin repetir (sin importar tildes ni mayúsculas)
 */
export const catalogoDePlatos = ({ menus = null, individuales = [], pedidos = [] } = {}) => {
    const vistos = new Map();
    const agregar = (crudo) => {
        if (typeof crudo !== 'string') return;
        const nombre = nombreSinMedida(crudo);
        if (NO_ES_PLATO.test(nombre) || nombre.length < 3 || ES_PRUEBA.test(nombre)) return;
        const clave = sinTildes(nombre);
        if (!vistos.has(clave)) vistos.set(clave, nombre);
    };
    (Array.isArray(menus?.proteinasDisponibles) ? menus.proteinasDisponibles : []).forEach(agregar);
    platosDelMenu(menus).forEach(agregar);
    (individuales || []).forEach(i => agregar(i?.nombre));
    platosDePedidos(pedidos).forEach(agregar);
    return [...vistos.values()];
};

/**
 * Los del catálogo que tienen TODAS las palabras escritas, en cualquier orden
 * y sin importar tildes: "tilapia" trae "Filet de tilapia" y "Tilapia
 * empanizada"; "pollo criolla" trae "Filet de pollo con salsa criolla".
 *
 * Primero los que EMPIEZAN con lo escrito, después el resto, cada grupo en el
 * orden del catálogo (la lista de la semana va primero).
 */
export const buscarPlatos = (catalogo, texto, maximo = 12) => {
    const palabras = sinTildes(texto).split(/\s+/).filter(Boolean);
    if (palabras.length === 0) return [];
    const inicio = palabras.join(' ');
    const encontrados = (catalogo || []).filter((n) => {
        const limpio = sinTildes(n);
        return palabras.every(p => limpio.includes(p));
    });
    const empiezan = encontrados.filter(n => sinTildes(n).startsWith(inicio));
    const resto = encontrados.filter(n => !sinTildes(n).startsWith(inicio));
    return [...empiezan, ...resto].slice(0, maximo);
};
