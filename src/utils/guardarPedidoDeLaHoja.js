/**
 * Armar el cambio que se le manda a Firestore al editar un pedido desde la hoja.
 *
 * Se separa de la pantalla porque tiene una trampa: las proteinas elegidas NO
 * viven en la raiz del pedido, viven DENTRO del primer item, en `proteinas`.
 * Escribirlas arriba no rompe nada visible —el PATCH devuelve 200— pero la hoja
 * sigue leyendo las de adentro y todo queda igual, sin ningun error a la vista.
 *
 * Por eso hay que reescribir el arreglo `items` completo: Firestore no sabe
 * actualizar un campo dentro de un elemento de un arreglo.
 */

import { cambiosDeFecha } from './cambiarFechaDelPedido';

/** Los renglones escritos a mano, limpios y sin vacios. */
export const proteinasEscritas = (texto) => String(texto ?? '')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

/**
 * El arreglo `items` con las proteinas puestas en el primero.
 *
 * Solo se toca el primer item porque es donde el pedido guarda la eleccion del
 * pack; los demas —cuando los hay— son productos sueltos con su propio nombre.
 */
export const itemsConProteinas = (items, proteinas) => {
    const lista = Array.isArray(items) ? items : [];
    if (lista.length === 0) return lista;
    return lista.map((it, i) => (i === 0 ? { ...it, proteinas: [...(proteinas || [])] } : it));
};

/**
 * El objeto que se le pasa a `updateDoc`.
 *
 * Devuelve `null` cuando no hay nada que cambiar: mandar un PATCH vacio gasta
 * una escritura y ensucia la fecha de modificacion sin motivo.
 *
 * @param {object} pedido    el pedido tal como esta guardado
 * @param {object} edicion   { observaciones, proteinas }
 */
export const cambiosDelPedido = (pedido, edicion = {}) => {
    const cambios = {};

    const notasAntes = String(pedido?.observaciones ?? '');
    const notasAhora = String(edicion.observaciones ?? '');
    if (notasAhora !== notasAntes) cambios.observaciones = notasAhora;

    // `proteinas: null` significa "este pedido no es de proteinas, no las toques"
    if (Array.isArray(edicion.proteinas)) {
        const antes = (pedido?.items?.[0]?.proteinas) || [];
        const ahora = edicion.proteinas;
        const distintas = antes.length !== ahora.length
            || antes.some((x, i) => String(x) !== String(ahora[i]));
        if (distintas) cambios.items = itemsConProteinas(pedido?.items, ahora);
    }

    // El menu de un personalizado: los platos completos, pegados de WhatsApp.
    if (Array.isArray(edicion.menu)) {
        Object.assign(cambios, cambiosDelMenuDelPedido(pedido, edicion.menu) || {});
    }

    // El nombre del pack: de ahi salen el gramaje, la familia y en que hoja va.
    if (typeof edicion.plan === 'string') {
        Object.assign(cambios, cambiosDelNombreDelPack(pedido, edicion.plan) || {});
    }

    // Las fechas de entrega, con su propia regla de "solo esta" o "todas".
    if (edicion.fechas) {
        Object.assign(cambios, cambiosDeFecha(pedido, edicion.fechas) || {});
    }

    return Object.keys(cambios).length ? cambios : null;
};

/**
 * Cambiar el NOMBRE del pack.
 *
 * El nombre no es una etiqueta: la hoja lo lee para decidir tres cosas.
 *
 *   El GRAMAJE     "Pack 5 Proteinas (250g)" cocina 250. El pedido de Patrick
 *                  dice 250 y el es de 500, y no habia forma de arreglarlo.
 *   La FAMILIA     de ahi sale si es bajo calorias, sin carbos, keto...
 *   La HOJA        un nombre que empieza con PERSONALIZADO sale en su propia
 *                  hoja, con los platos del pedido en vez del menu semanal.
 *                  Es lo que necesitan Mayela y Catherine.
 *
 * Se escribe en `plan`, en la raiz. Es de donde la hoja saca `mainPackName`;
 * `tipoMenu` queda como estaba y solo se usa si `plan` viene vacio.
 */
export const cambiosDelNombreDelPack = (pedido, nombre) => {
    const antes = String(pedido?.plan ?? '').trim();
    const ahora = String(nombre ?? '').trim();

    // Un nombre vacio dejaria al pedido sin familia y sin gramaje: la hoja no
    // sabria ni donde ponerlo ni cuanto cocinarle.
    if (!ahora || ahora === antes) return null;

    return { plan: ahora };
};

/**
 * Cuantas proteinas pide el nombre del pack, o 0 si no es un pack de proteinas.
 *
 * Sirve para saber si mostrar el campo y contra que comparar. "Pack de 3
 * proteinas de 250 g" pide 3; "Pack Regular" no pide ninguna.
 */
export const cuantasProteinasPide = (nombre) => {
    const m = String(nombre || '').match(/(\d+)\s*prote[ií]nas?/i);
    const n = m ? Number(m[1]) : 0;
    return n > 1 ? n : 0;
};

/** El cambio para sacar un pedido de la hoja sin borrarlo. */
export const cambioParaCancelar = (motivo = 'Cancelado desde la hoja de produccion') => ({
    status: 'cancelled',
    canceladoMotivo: motivo
});

/* ═══════════════════════════════════════════════════════════════════════════
 * EL MENÚ DE UN PERSONALIZADO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un personalizado —Dalia Parrales, Maycol Ávila— lleva el menú de la semana
 * con algunos platos cambiados, y ese menú vive DENTRO de su pedido: en el item
 * del pack, como tres listas paralelas `proteinas`, `vegetales` y `carbos`. No
 * sale del menú oficial, así que cada semana hay que ponérselo a mano.
 *
 * Hasta el 10 de setiembre de 2026 no había cómo: el editor del pedido solo
 * cambiaba notas, y la celda de la tabla escribía en el menú OFICIAL de la
 * familia —la hoja traduce "Personalizado Bajo Calorías — Dalia" a
 * `bajoCalorias`—, o sea que cambiarle un plato a Dalia se lo cambiaba a los 43
 * packs de Bajo en Calorías, y a ella no.
 */

/**
 * Renglones del mensaje que NO son platos.
 *
 * Gina y Jan pegan el mensaje entero de WhatsApp, con los datos del cliente
 * arriba. "Cliente: Dalia / Lugar Curri / Teléfono 8850…" son tres renglones
 * seguidos, igual que un plato, y sin este filtro salían como el Plato 1.
 */
const NO_ES_PLATO = [
    /^cliente\b/i, /^nombre\b/i, /^lugar\b/i, /^zona\b/i, /^direcci[oó]n\b/i,
    /^tel[eé]fono\b/i, /^tel\b/i, /^cel(ular)?\b/i, /^entrega\b/i, /^fecha\b/i,
    /^\d+\s*men[uú]s?\b/i,          // "3 menus bajos en calorias"
    /\bas[ií] queda\b/i,            // "asi queda el menu de dalia esta entrega"
    /^[\d\s-]{7,}$/                 // un telefono suelto
];

const limpiar = (s) => String(s || '')
    .replace(/^[\s•◽▪️\-*·]+/u, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Lee un menú pegado: un plato por bloque, separados por un renglón en blanco.
 *
 *     Fajitas de pollo al limon y hierbas
 *     Chayotes salteados al ajillo
 *     Arroz blanco
 *
 *     Carne de res en salsa criolla
 *     …
 *
 * En cada bloque va la proteína, después el vegetal y después el carbo. Un
 * bloque de dos renglones es un plato sin harina (Sin Carbos, Keto).
 *
 * @returns {{ platos: Array<{proteina, vegetal, carbo}>, ignorados: string[] }}
 *   `ignorados` son los bloques que no parecen un plato, para mostrarlos antes
 *   de guardar: un plato que se pierde en silencio es un plato que no se cocina.
 */
export const leerMenuPegado = (texto) => {
    const bloques = String(texto || '')
        .replace(/\r/g, '')
        .split(/\n\s*\n/);

    const platos = [];
    const ignorados = [];

    bloques.forEach((bloque) => {
        const renglones = bloque.split('\n').map(limpiar).filter(Boolean);
        const utiles = renglones.filter(r => !NO_ES_PLATO.some(re => re.test(r)));
        const descartados = renglones.filter(r => NO_ES_PLATO.some(re => re.test(r)));
        if (descartados.length > 0 && utiles.length > 0) ignorados.push(...descartados);
        if (utiles.length === 0) return;

        if (utiles.length === 2 || utiles.length === 3) {
            platos.push({ proteina: utiles[0], vegetal: utiles[1], carbo: utiles[2] || '' });
        } else {
            ignorados.push(utiles.join(' / '));
        }
    });

    return { platos, ignorados };
};

/**
 * El menú de un pedido, como texto para editar: un bloque por plato.
 *
 * Es el formato de `leerMenuPegado` al revés, para que el campo arranque con lo
 * que el pedido tiene hoy y se vea qué se está reemplazando.
 */
export const menuComoTexto = (platos = []) => (platos || [])
    .map(p => [p.proteina, p.vegetal, p.carbo].filter(x => x && String(x).trim()).join('\n'))
    .filter(Boolean)
    .join('\n\n');

/** La lista del pedido que tiene los platos: `menu` en los viejos, `items` en los nuevos. */
const traeDetalle = (lista) => Array.isArray(lista)
    && lista.some(it => Array.isArray(it?.proteinas) && it.proteinas.length > 0);

/**
 * Dónde vive el menú dentro del pedido.
 *
 * Tiene que ser la MISMA regla que usa la hoja para leerlo (`logisticsUtils`):
 * si la hoja lee `menu` y aquí se escribe `items`, se guarda sin error y la
 * hoja sigue imprimiendo el menú viejo. Es la trampa de Xiomara Vilchez.
 */
export const listaDelMenu = (pedido) => {
    if (traeDetalle(pedido?.menu)) return 'menu';
    if (traeDetalle(pedido?.items)) return 'items';
    return Array.isArray(pedido?.items) && pedido.items.length > 0 ? 'items'
        : (Array.isArray(pedido?.menu) && pedido.menu.length > 0 ? 'menu' : 'items');
};

/** Los platos que el pedido tiene hoy, en el formato de `leerMenuPegado`. */
export const menuDelPedido = (pedido) => {
    const lista = pedido?.[listaDelMenu(pedido)] || [];
    const item = lista.find(it => Array.isArray(it?.proteinas) && it.proteinas.length > 0);
    if (!item) return [];
    return item.proteinas.map((prot, i) => ({
        proteina: prot || '',
        vegetal: (item.vegetales || [])[i] || '',
        carbo: (item.carbos || [])[i] || ''
    }));
};

/**
 * La lista del pedido con el menú nuevo puesto en el item del pack.
 *
 * - Se escribe en el item que ya tenía los platos; si ninguno los tenía, en el
 *   primero.
 * - `cantidades` y `medidas` van plato por plato. Si el menú nuevo tiene la
 *   misma cantidad de platos se conservan; si no, se quitan, porque quedarían
 *   corridas y le pondrían "2 veces" o "1 kg" al plato equivocado.
 * - Los cambios POR PLATO (`proteinChanges`, `vegeChanges`, `carboChanges`) se
 *   quitan: eran cambios sobre el menú anterior y encima del nuevo la hoja
 *   imprimiría "Fajitas → Tilapia". El menú pegado ya es el que queda.
 */
export const listaConMenu = (lista, platos) => {
    const items = Array.isArray(lista) ? lista : [];
    const base = items.length > 0 ? items : [{}];
    let destino = base.findIndex(it => Array.isArray(it?.proteinas) && it.proteinas.length > 0);
    if (destino === -1) destino = 0;

    return base.map((it, i) => {
        if (i !== destino) return it;
        const nuevo = {
            ...it,
            proteinas: platos.map(p => p.proteina || ''),
            vegetales: platos.map(p => p.vegetal || ''),
            carbos: platos.map(p => p.carbo || '')
        };
        const mismoLargo = (Array.isArray(it?.proteinas) ? it.proteinas.length : -1) === platos.length;
        if (!mismoLargo) {
            delete nuevo.cantidades;
            delete nuevo.medidas;
        }
        if (nuevo.customizations && typeof nuevo.customizations === 'object') {
            const { proteinChanges, vegeChanges, carboChanges, ...resto } = nuevo.customizations;
            nuevo.customizations = resto;
        }
        return nuevo;
    });
};

/**
 * Lo que hay que mandarle a Firestore para cambiar el menú, o `null` si es el mismo.
 */
export const cambiosDelMenuDelPedido = (pedido, platos) => {
    if (!Array.isArray(platos) || platos.length === 0) return null;
    const antes = menuDelPedido(pedido);
    const igual = antes.length === platos.length && antes.every((p, i) =>
        p.proteina === platos[i].proteina && p.vegetal === platos[i].vegetal && p.carbo === platos[i].carbo);
    if (igual) return null;
    const campo = listaDelMenu(pedido);
    return { [campo]: listaConMenu(pedido?.[campo], platos) };
};
