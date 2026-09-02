/**
 * Platos que son el mismo aunque se escriban distinto, y platos que en realidad
 * son varios.
 *
 * Para editar: agregar o quitar líneas de las listas. No hace falta saber de
 * código.
 */

/**
 * NÚCLEOS — todo lo que empiece así es la misma olla.
 *
 * "Carne mechada de res en salsa", "Carne mechada en salsa" y "Carne mechada en
 * salsa criolla" son la misma carne. El emparejador automático no lo podía
 * deducir: "Carne mechada en salsa" calza igual con las otras dos, y elegir mal
 * es peor que dejarlas separadas. Así que se dice acá, explícito.
 *
 * ⚠️ CUIDADO AL AGREGAR. Poner un núcleo junta TODO lo que empiece con esas
 * palabras. "carne mechada" es seguro porque es un plato. "pollo" NO lo sería:
 * juntaría el pollo al ajillo con el pollo teriyaki, que son ollas distintas.
 * La regla práctica: si al leerlo en voz alta suena a un plato, sirve; si suena
 * solo a un ingrediente, no.
 */
export const NUCLEOS_MISMO_PLATO = [
    'carne mechada'
];

/**
 * COMPUESTOS — un renglón que en realidad son varias preparaciones.
 *
 * "Arroz, frijoles y maduros" se cocina en tres ollas distintas, así que en la
 * hoja tiene que salir en tres renglones. Cada uno lleva la MISMA cantidad que
 * traía el renglón original: si decía 4 tazas, son 4 de arroz, 4 de frijoles y
 * 4 de maduros, no 4 repartidas entre los tres.
 *
 * Solo se parte cuando el nombre viene en forma de lista —con coma— y cada
 * parte es corta. Un "Canelones rellenos con queso y envueltos en huevo" lleva
 * "y" pero no tiene coma, así que no se toca: es un plato solo.
 */
export const MAXIMO_PALABRAS_POR_COMPONENTE = 2;
