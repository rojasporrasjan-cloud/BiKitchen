/**
 * BiPuntos — reglas del programa en un solo lugar.
 *
 * Antes estos números estaban repartidos: la tasa en cuatro archivos y el premio
 * por referido con DOS valores distintos (200 en la configuración del hook, 1000
 * en la página de Referidos y en el otorgamiento real). Lo que se otorgaba de
 * verdad eran 1000, así que ese es el número que queda.
 *
 * OJO: netlify/functions/nmi-charge.js no puede importar de acá (se empaqueta
 * aparte). Usa `pedido.pointsToAward`, que el checkout calcula con estas mismas
 * reglas, y solo cae en 2% parejo si ese campo no viene.
 */

/** 2 BiPuntos por cada ₡100 gastados. */
export const TASA_PUNTOS = 0.02;

/** Puntos por crear la cuenta. */
export const BONO_BIENVENIDA = 500;

/** Puntos para quien refiere, cuando el referido confirma su pedido. */
export const PUNTOS_REFERIDO = 1000;

/** Cuánto vale un punto al canjearlo (₡1.000 de cupón cuesta 500 puntos). */
export const VALOR_PUNTO_CRC = 2;

/**
 * Niveles por puntos ACUMULADOS en total (no por los disponibles).
 * El multiplicador se aplica de verdad al otorgar: ver calcularPuntos().
 *
 * CUÁNTO CUESTA CADA NIVEL, en plata:
 *
 * La tasa base son 2 puntos por cada ₡100, y cada punto vale ₡2 al canjearlo.
 * O sea que sin multiplicador el cliente recibe de vuelta un 4% de lo que gasta.
 * El multiplicador va directo sobre ese 4%:
 *
 *   Bronce  1x    → 4%
 *   Plata   1.2x  → 4.8%
 *   Oro     1.3x  → 5.2%
 *   Platino 1.5x  → 6%
 *
 * Oro estaba en 1.5x (6%) y Platino en 2x (8%). Un 8% de devolución en comida es
 * insostenible: los programas del rubro andan entre 2% y 5%, y acá el nivel se
 * gana con puntos acumulados que NUNCA bajan, así que quien llega a Platino
 * cobra ese 8% para siempre aunque no vuelva a comprar.
 */
export const NIVELES = [
    {
        name: 'Bronce',
        minPoints: 0,
        icon: '🥉',
        color: 'from-amber-600 to-amber-700',
        multiplier: 1,
        benefits: ['Gana 2 BiPuntos por cada ₡100', 'Acceso a Tienda de Recompensas']
    },
    {
        name: 'Plata',
        minPoints: 1500,
        icon: '🥈',
        color: 'from-gray-400 to-gray-500',
        multiplier: 1.2,
        benefits: ['Gana 2.4 BiPuntos por cada ₡100 (1.2x)', 'Acceso a Tienda de Recompensas']
    },
    {
        name: 'Oro',
        minPoints: 5000,
        icon: '🥇',
        color: 'from-yellow-400 to-yellow-500',
        multiplier: 1.3,
        benefits: ['Gana 2.6 BiPuntos por cada ₡100 (1.3x)', 'Acceso a Tienda de Recompensas']
    },
    {
        name: 'Platino',
        minPoints: 15000,
        icon: '💎',
        color: 'from-cyan-400 to-blue-500',
        multiplier: 1.5,
        benefits: ['Gana 3 BiPuntos por cada ₡100 (1.5x)', 'Acceso a Tienda de Recompensas']
    }
];

/**
 * Nivel que corresponde a una cantidad de puntos acumulados.
 * @param {number} totalAcumulado
 */
export const nivelPorPuntos = (totalAcumulado = 0) => {
    let nivel = NIVELES[0];
    for (const n of NIVELES) {
        if (totalAcumulado >= n.minPoints) nivel = n;
        else break;
    }
    return nivel;
};

/**
 * Puntos que gana una compra, con el multiplicador del nivel ya aplicado.
 *
 * Los dos redondeos hacia abajo son a propósito y en este orden: es el mismo
 * cálculo que muestra el carrito, y así lo que se promete y lo que se acredita
 * dan idéntico.
 *
 * @param {number} montoCRC - total del pedido
 * @param {object} [nivel] - nivel del cliente; sin él se asume Bronce (1x)
 * @returns {number}
 */
export const calcularPuntos = (montoCRC, nivel) => {
    const base = Math.floor((Number(montoCRC) || 0) * TASA_PUNTOS);
    if (base <= 0) return 0;
    const multiplicador = nivel?.multiplier || 1;
    return Math.floor(base * multiplicador);
};
