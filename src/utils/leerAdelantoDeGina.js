/**
 * Lee el Excel del adelanto: lo que Gina ya cocinó el jueves.
 *
 * La pestaña "DESGLOSE COCINA JUEVES" es una lista escrita a mano, agrupada por
 * cocinera, con las cantidades como salieron de la cabeza de Gina:
 *
 *     FERNANDA
 *     Milanesa de pollo                        6000
 *     Lomo fingido en salsa gravy              8 kg
 *     Dejar salsa agridulce                    para 3 kg de cerdo agridulce
 *     Dejar carne cocinada para el sabado solo lomo fingido...
 *     ROSA
 *     Lasagna de pollo                         40 porciones
 *     Crema de vegetales                       60 tazas
 *
 * O sea que hay tres cosas mezcladas y cada una se trata distinto:
 *
 *   1. Cantidades que la hoja entiende (kg, gramos, tazas) -> se descuentan.
 *   2. Cantidades en unidades que la hoja NO maneja (porciones, platos) -> NO
 *      se descuentan y salen aparte, porque para pasar "40 porciones" a gramos
 *      habría que inventar cuánto pesa una porción.
 *   3. Notas ("dejar salsa lista", "hay jamón en el congelador") -> se muestran,
 *      porque son instrucciones reales para la cocina, pero no son cantidades.
 *
 * Lo que no se puede convertir NO se descuenta en silencio: si se descontara mal
 * se cocinaría de menos, y eso no se ve hasta que falta comida el sábado.
 */

import { claveDeProduccion } from './produccionAcumulada';
import { nucleoDelPlato } from './platosCompuestos';

/** Los renglones que solo dicen de quién es la lista. */
const ES_NOMBRE_DE_COCINERA = /^(fernanda|rosa|carmen|do[ñn]a carmen|osmany)$/i;

/**
 * Lee una cantidad escrita a mano.
 *
 * @returns {{cantidad:number, unidad:string}|null} null si no es una cantidad
 *          que la hoja pueda usar
 */
export const leerCantidad = (texto) => {
    if (typeof texto === 'number' && Number.isFinite(texto) && texto > 0) {
        // Un número pelado son gramos: así se anotan las proteínas ("6000")
        return { cantidad: texto, unidad: 'g' };
    }

    const t = String(texto || '').trim().toLowerCase().replace(',', '.');
    if (!t) return null;

    // Tiene que EMPEZAR con el número. "para 3 kg de cerdo" es una nota, no una
    // cantidad: descontar esos 3 kg sería cocinar de menos.
    const m = t.match(/^(\d+(?:\.\d+)?)\s*(kg|kilos?|g|gramos?|tazas?|porciones?|platos?|unidades?)?$/);
    if (!m) return null;

    const cantidad = parseFloat(m[1]);
    if (!Number.isFinite(cantidad) || cantidad <= 0) return null;
    const unidad = m[2] || 'g';

    if (/^(kg|kilos?)$/.test(unidad)) return { cantidad: cantidad * 1000, unidad: 'g' };
    if (/^(g|gramos?)$/.test(unidad)) return { cantidad, unidad: 'g' };
    if (/^tazas?$/.test(unidad)) return { cantidad, unidad: 'taza(s)' };

    // porciones / platos / unidades: la hoja las lleva en gramos o tazas, y
    // pasar "40 porciones" a gramos pide un dato que no está escrito
    return null;
};

/**
 * @param {Array<Array>} filas  pares [nombre, cantidad] de la pestaña
 * @returns {{
 *   cocinado: object,
 *   descontados: Array<{nombre:string, cantidad:number, unidad:string}>,
 *   sinConvertir: Array<{nombre:string, texto:string}>,
 *   notas: Array<string>
 * }}
 */
export const leerAdelanto = (filas) => {
    const cocinado = {};
    const descontados = [];
    const sinConvertir = [];
    const notas = [];

    (filas || []).forEach(fila => {
        const nombreCrudo = String(fila?.[0] ?? '').trim();
        const cantidadCruda = fila?.[1];

        if (!nombreCrudo) return;
        if (ES_NOMBRE_DE_COCINERA.test(nombreCrudo)) return;

        const leida = leerCantidad(cantidadCruda);

        if (!leida) {
            const texto = String(cantidadCruda ?? '').trim();
            // Sin cantidad de ningún tipo es una instrucción suelta
            if (!texto) notas.push(nombreCrudo);
            else if (/^\d/.test(texto)) sinConvertir.push({ nombre: nombreCrudo, texto });
            else notas.push(`${nombreCrudo} — ${texto}`);
            return;
        }

        // El mismo nombre que usa la hoja: toda la "carne mechada" es una olla
        const nombre = nucleoDelPlato(nombreCrudo) || nombreCrudo;
        const clave = claveDeProduccion(nombre, leida.unidad);

        cocinado[clave] = (cocinado[clave] || 0) + leida.cantidad;
        descontados.push({ nombre, cantidad: leida.cantidad, unidad: leida.unidad });
    });

    return { cocinado, descontados, sinConvertir, notas };
};
