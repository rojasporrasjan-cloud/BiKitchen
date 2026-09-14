/**
 * Los platos que, como individual, van en molde desechable.
 *
 * "Cocina los empaca" es lo que decide que un plato sea individual: no baja a
 * Empaque a que le pesen la porción, sale de la cocina ya en su envase. Y para
 * estos cuatro el envase ES la medida: no se piden 250 g de lasaña, se pide
 * UNA lasaña en su molde.
 *
 * Sin esta lista el parser los adivinaba mal: "Lasagna de pollo" tiene la
 * palabra "pollo", así que caía en la regla de las proteínas y salía como
 * 250 g. Quien empaca leía 250 g de lasaña, que no significa nada.
 *
 * ⚠️ SOLO APLICA A INDIVIDUALES. Un "Pastel de yuca" dentro de un pack es la
 * harina del plato y se sirve por tazas — no es un molde. Por eso la regla vive
 * en el camino de los individuales y no en el de los packs.
 *
 * Para editar: agregar o quitar líneas. Basta con que la palabra aparezca en el
 * nombre del plato.
 */
export const PLATOS_EN_MOLDE = [
    'lasagna',
    'lasaña',
    'pastel',
    'flauta',
    'canelones',
    'canelón',
    'canelon'
];

/** Lo que se escribe en la hoja cuando el plato va en molde. */
export const MEDIDA_DE_MOLDE = 'molde';
