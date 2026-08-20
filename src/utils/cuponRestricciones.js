/**
 * Restricciones de cupones: a qué packs aplican y si son solo de primera compra.
 *
 * El sistema de cupones ya tenía `singleUsePerUser`, pero eso es "una vez por
 * persona", no "solo en la primera compra": alguien con diez pedidos encima
 * igual podía usarlo. Y el descuento se calculaba sobre el carrito COMPLETO, sin
 * mirar qué llevaba adentro.
 *
 * Acá va lo que faltaba, en funciones puras para poder probarlo sin Firebase.
 */

/** Todo el texto de un ítem, en minúsculas, para buscarle palabras. */
const textoDe = (item = {}) => [
    item.nombre, item.name, item.title,
    item.plan, item.planLabel,
    item.category, item.categoryLabel,
    item.size
].filter(Boolean).join(' ').toLowerCase();

/**
 * Categorías a las que se puede limitar un cupón.
 *
 * `aplica` recibe el texto del ítem ya en minúsculas. Se buscan palabras y no
 * identificadores exactos porque los nombres varían mucho entre la web, el
 * importador y los pedidos escritos a mano.
 */
export const CATEGORIAS_CUPON = [
    {
        id: 'semanales',
        label: 'Packs semanales',
        aplica: (t) => /\bsemanal(es)?\b/.test(t)
            || (/\bpack\b/.test(t) && /5\s*comidas|cinco comidas/.test(t))
    },
    {
        id: 'familiares',
        label: 'Packs familiares',
        aplica: (t) => /\bfamiliar(es)?\b/.test(t)
    },
    {
        id: 'proteinas500',
        label: 'Pack de proteínas 500 g',
        // Tiene que decir proteína Y 500: el de 250 g no entra
        aplica: (t) => /prote[íi]na/.test(t) && /500\s*g/.test(t)
    },
    {
        id: 'individuales',
        label: 'Packs individuales',
        aplica: (t) => /\bindividual(es)?\b/.test(t)
    }
];

/** ¿Este ítem entra en alguna de las categorías elegidas? */
export const itemAplica = (item, aplicaA = []) => {
    if (!Array.isArray(aplicaA) || aplicaA.length === 0) return true; // sin límite = todo
    const t = textoDe(item);
    return CATEGORIAS_CUPON.some((c) => aplicaA.includes(c.id) && c.aplica(t));
};

const precioDe = (item = {}) => {
    const p = Number(item.precio ?? item.price ?? 0) || 0;
    const c = Number(item.cantidad ?? item.quantity ?? 1) || 1;
    return p * c;
};

/** Los ítems del carrito que califican para el cupón. */
export const itemsQueAplican = (items = [], aplicaA = []) =>
    items.filter((i) => itemAplica(i, aplicaA));

/**
 * Monto sobre el que se calcula el descuento.
 *
 * Es la suma de los ítems que califican, NO el total del carrito. Si alguien
 * mete un pack semanal y un postre, el 20% sale solo del pack.
 */
export const montoQueAplica = (items = [], aplicaA = []) =>
    itemsQueAplican(items, aplicaA).reduce((s, i) => s + precioDe(i), 0);

/**
 * Descuento del cupón sobre los ítems que califican.
 *
 * @returns {{ descuento: number, montoBase: number, itemsAplicables: number }}
 */
export const descuentoConRestricciones = (cupon = {}, items = []) => {
    const aplicaA = cupon.aplicaA || [];
    const aplicables = itemsQueAplican(items, aplicaA);
    const montoBase = aplicables.reduce((s, i) => s + precioDe(i), 0);

    if (montoBase <= 0) return { descuento: 0, montoBase: 0, itemsAplicables: 0 };

    let descuento = 0;
    if (cupon.type === 'percentage') {
        descuento = Math.round(montoBase * ((Number(cupon.value) || 0) / 100));
    } else if (cupon.type === 'fixed') {
        // Un descuento fijo nunca puede pasarse del monto que califica
        descuento = Math.min(Number(cupon.value) || 0, montoBase);
    }

    if (cupon.maxDiscount && descuento > cupon.maxDiscount) descuento = cupon.maxDiscount;

    return { descuento, montoBase, itemsAplicables: aplicables.length };
};

/** Nombres legibles de las categorías, para mostrarle al cliente qué aplica. */
export const etiquetasDe = (aplicaA = []) => CATEGORIAS_CUPON
    .filter((c) => aplicaA.includes(c.id))
    .map((c) => c.label);

/**
 * Mensaje de por qué el cupón no se puede usar con este carrito.
 * Devuelve null si sí se puede.
 */
export const motivoNoAplica = (cupon = {}, items = []) => {
    const aplicaA = cupon.aplicaA || [];
    if (aplicaA.length === 0) return null;
    if (itemsQueAplican(items, aplicaA).length > 0) return null;

    const nombres = etiquetasDe(aplicaA);
    return `Este cupón solo aplica a: ${nombres.join(', ')}.`;
};
