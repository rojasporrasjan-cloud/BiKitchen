/**
 * Lo que sobró, pegado del mensaje de Gina.
 *
 * La noche antes de armar la hoja, Gina manda por WhatsApp qué comida quedó y
 * qué packs alcanzó a empacar. Hoy eso se lee a mano y se corrige la hoja con
 * lápiz a las cuatro de la mañana.
 *
 * COMIDA QUE SOBRÓ = COMIDA QUE YA ESTÁ HECHA. Va al mismo descuento que lo
 * cocinado: si quedaron 3 kg de carne mechada, el sábado hay que cocinar 3 kg
 * menos, igual que si se hubieran cocinado por adelantado.
 *
 * Gina escribe como habla, así que hay que aguantar las tres formas:
 *
 *     Carne mechada 3 kg
 *     3 kg de carne mechada
 *     Carne mechada: 3 kg
 *
 * Lo que NO se entienda no se descuenta y sale listado. Una línea mal leída que
 * descuenta de menos hace que falte comida el sábado, y eso no se ve hasta ese
 * día: es preferible que se vea en pantalla y se corrija a mano.
 */

import { leerCantidad } from './leerAdelantoDeGina';
import { claveDeProduccion } from './produccionAcumulada';
import { nucleoDelPlato } from './platosCompuestos';
import { esElMismoPlato } from './mismoPlato';

/** Nombre limpio, para comparar sin que estorben espacios ni mayúsculas. */
const nombreLimpio = (n) => String(n || '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Relleno que Gina pone antes de la cantidad: "arroz con perejil UNAS 15 tazas".
 * Se quita del nombre, o "arroz con perejil unas" no calza con ningún renglón.
 */
const RELLENO_AL_FINAL = /\s+(unas?|unos?|como|mas o menos|más o menos|aprox\.?|aproximadamente)$/i;

/**
 * "no quedó", "no sobró": es CERO.
 *
 * No hay nada que descontar y tampoco nada que revisar. Mandarlo al aviso de
 * "no se entendió" sería ruido: Gina lo escribió bien y dice justo lo que pasa.
 */
const DICE_QUE_NO_QUEDO = /\bno\s+(qued|sobr|hay)/i;

/** Encabezados y saludos que no son comida. */
const NO_ES_COMIDA = /^(sobr[oó]|sobrante|sobrantes|qued[oó]|quedaron|hola|buenas|gracias|listo|ok)[\s:]*$/i;

/** Las unidades que la hoja sabe manejar, para reconocer dónde termina el número. */
const UNIDADES = 'kg|kilos?|g|gramos?|tazas?|porciones?|platos?|unidades?';

/**
 * Parte una línea en nombre y cantidad.
 *
 * @returns {{nombre: string, cantidadTexto: string}|null}
 */
export const partirLinea = (linea) => {
    const t = String(linea || '').trim().replace(/^[-*•·]\s*/, '');
    if (!t || NO_ES_COMIDA.test(t)) return null;

    // "3 kg de carne mechada" — la cantidad al inicio
    const alInicio = t.match(new RegExp(`^(\\d+(?:[.,]\\d+)?\\s*(?:${UNIDADES})?)\\s*(?:de\\s+)?(.+)$`, 'i'));
    if (alInicio && alInicio[2] && /[a-záéíóúñ]/i.test(alInicio[2])) {
        return { nombre: alInicio[2].trim(), cantidadTexto: alInicio[1].trim() };
    }

    // "Carne mechada 3 kg" / "Carne mechada: 3 kg" — la cantidad al final
    const alFinal = t.match(new RegExp(`^(.+?)[\\s:=]+(\\d+(?:[.,]\\d+)?\\s*(?:${UNIDADES})?)\\s*$`, 'i'));
    if (alFinal && /[a-záéíóúñ]/i.test(alFinal[1])) {
        const nombre = alFinal[1]
            .replace(/[:\-–]\s*$/, '')
            .replace(RELLENO_AL_FINAL, '')
            .trim();
        return { nombre, cantidadTexto: alFinal[2].trim() };
    }

    return { nombre: t, cantidadTexto: '' };
};

/**
 * @param {string} texto  el mensaje tal cual, pegado
 * @returns {{
 *   cocinado: object,
 *   reconocidos: Array<{nombre:string, cantidad:number, unidad:string}>,
 *   sinEntender: Array<string>
 * }}
 */
export const leerSobrantes = (texto) => {
    const cocinado = {};
    const reconocidos = [];
    const sinEntender = [];

    String(texto || '').split('\n').forEach(linea => {
        const partido = partirLinea(linea);
        if (!partido) return;

        // "Pollo al pesto no quedó" es CERO: no hay nada que descontar y
        // tampoco nada que revisar. Avisarlo sería ruido.
        if (DICE_QUE_NO_QUEDO.test(linea)) return;

        const leida = leerCantidad(partido.cantidadTexto);
        if (!leida) {
            // Sin cantidad usable no se descuenta: descontar de menos hace que
            // falte comida, y descontar una unidad que la hoja no maneja
            // —"media olla"— es inventar un número.
            if (partido.nombre) sinEntender.push(String(linea).trim());
            return;
        }

        // El mismo nombre que usa la hoja: toda la "carne mechada" es una olla
        const nombre = nucleoDelPlato(partido.nombre) || partido.nombre;
        const clave = claveDeProduccion(nombre, leida.unidad);

        cocinado[clave] = (cocinado[clave] || 0) + leida.cantidad;
        reconocidos.push({ nombre, cantidad: leida.cantidad, unidad: leida.unidad });
    });

    return { cocinado, reconocidos, sinEntender };
};

/**
 * Hace calzar lo que sobró con los renglones de la hoja.
 *
 * El descuento se busca por nombre exacto, y Gina no escribe como la hoja: ella
 * pone "Pollo en salsa hongos" y el menú dice "Pollo en salsa de hongos";
 * "Cerdo BBQ" contra "Cerdo en salsa BBQ". Sin esto, esos kilos NO se descuentan
 * y se vuelven a cocinar — 4 kg de cerdo y 7 kg de pollo de más, sin que nadie
 * se entere hasta que sobra otra vez.
 *
 * Se usa el MISMO emparejador que junta las carnes mechadas: misma unidad, misma
 * palabra principal, y un nombre contenido en el otro. Si calza con varios no se
 * elige ninguno: se avisa, porque descontar del renglón equivocado hace faltar
 * comida del otro.
 *
 * @param {Array} reconocidos  lo que devolvió `leerSobrantes`
 * @param {Array} renglones    los de la hoja, { name, unit }
 */
export const conciliarConLaHoja = (reconocidos, renglones) => {
    const cocinado = {};
    const calzados = [];
    const sinCalzar = [];
    const ambiguos = [];

    (reconocidos || []).forEach(s => {
        const candidatos = (renglones || [])
            .filter(r => r.unit === s.unidad && esElMismoPlato(r.name, s.nombre));

        // Un calce exacto manda sobre el parecido
        const exacto = candidatos.find(r => nombreLimpio(r.name) === nombreLimpio(s.nombre));
        const elegido = exacto || (candidatos.length === 1 ? candidatos[0] : null);

        if (!elegido) {
            if (candidatos.length > 1) {
                ambiguos.push({ ...s, calzaCon: candidatos.map(r => r.name) });
            } else {
                sinCalzar.push(s);
            }
            return;
        }

        const k = claveDeProduccion(elegido.name, elegido.unidad || elegido.unit);
        cocinado[k] = (cocinado[k] || 0) + s.cantidad;
        calzados.push({ ...s, renglon: elegido.name });
    });

    return { cocinado, calzados, sinCalzar, ambiguos };
};

/**
 * Cuánto sobró de ESTE renglón de la hoja.
 *
 * Se pregunta desde el renglón, no al revés, porque Gina no escribe como la
 * hoja: ella pone "Pollo en salsa hongos" y el menú dice "Pollo en salsa de
 * hongos"; "Cerdo BBQ" contra "Cerdo en salsa BBQ". Buscando por nombre exacto
 * esos kilos no se descontaban y se volvían a cocinar — 4 kg de cerdo y 7 de
 * pollo de más, sin que nadie se enterara hasta que sobraba otra vez.
 *
 * Usa el MISMO emparejador que junta las carnes mechadas: misma unidad, misma
 * palabra principal, y un nombre contenido en el otro.
 *
 * Si una línea calza con VARIOS renglones no se descuenta de ninguno: restarle
 * al que no es hace faltar comida del otro, y eso no se ve hasta el sábado.
 *
 * @param {{name:string, unit:string}} renglon
 * @param {Array} reconocidos  lo que devolvió `leerSobrantes`
 */
export const sobranteDelRenglon = (renglon, reconocidos) => {
    if (!renglon?.name) return 0;

    const mismos = (reconocidos || []).filter(s =>
        s.unidad === renglon.unit && esElMismoPlato(renglon.name, s.nombre));
    if (mismos.length === 0) return 0;

    // Un calce exacto manda sobre el parecido
    const exactos = mismos.filter(s => nombreLimpio(s.nombre) === nombreLimpio(renglon.name));
    const usar = exactos.length > 0 ? exactos : mismos;

    return usar.reduce((total, s) => total + (Number(s.cantidad) || 0), 0);
};
