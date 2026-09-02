/**
 * Qué se cocina junto, y cómo repartirlo después.
 *
 * `buildKitchenSheetData` agrupa por familia de pack y por número de plato. Eso
 * sirve para armar la hoja de empaque, pero para COCINAR está mal: si el mismo
 * pollo caribeño es el plato 3 de Bajo Calorías y el plato 2 de Regular, salen
 * dos renglones y la cocina lo prepara dos veces, en dos ollas, con dos pesadas.
 *
 * Acá se da vuelta el agrupamiento: primero el ingrediente, después de dónde
 * viene. Una preparación = un renglón, con el total de una vez y el desglose de
 * a cuántos platos de cada menú va, que es lo que hace falta para repartirlo
 * cuando sale de la olla.
 *
 * Lo que NO se junta:
 *
 *   - Una sustitución. `mapPedidosFromLegacy` deja el nombre como
 *     "Pollo → Cerdo", así que nunca cae en el mismo renglón que "Pollo": son
 *     preparaciones distintas y juntarlas haría que alguien reciba lo que no
 *     pidió.
 *   - Proteína, vegetal y carbo. Van aparte aunque se llamen igual, porque se
 *     preparan aparte.
 *   - Gramos y tazas del mismo nombre. Mezclarlos daría un total sin sentido.
 */

/** Nombre limpio, para que "Arroz blanco" y "arroz  blanco" sean lo mismo. */
import { porcionesDelPlato } from './porcionesDelPedido';
import { esIndividualEnLaHoja } from './packClassification';

const clave = (nombre) => String(nombre || '').trim().replace(/\s+/g, ' ').toLowerCase();

/** Un plato vacío o un guion no es un ingrediente. */
const esIngrediente = (nombre) => {
    const n = String(nombre || '').trim();
    return n.length > 0 && n !== '—' && n !== '-' && n.toLowerCase() !== 'n/a';
};

export const TIPO_COMPONENTE = {
    PROTEINA: 'Proteína',
    VEGETAL: 'Vegetal',
    CARBO: 'Harina'
};

// La cuenta de porciones es la misma para las etiquetas, el empaque y la
// cocina, así que vive en un solo archivo. Acá se reexporta por comodidad de
// quien ya la importaba desde este módulo.
export { porcionesDelPlato };

/**
 * @param {Array}  pedidos - pedidos ya normalizados (mapPedidosFromLegacy)
 * @param {object} [opciones]
 * @param {number} [opciones.marginPercent=30] - merma de cocina de Gina
 * @returns {{ preparaciones: Array, totalPorciones: number, marginPercent: number }}
 */
export const consolidarCocina = (pedidos, opciones = {}) => {
    const marginPercent = Number.isFinite(opciones.marginPercent) ? opciones.marginPercent : 30;
    const factorMargen = 1 + marginPercent / 100;

    const mapa = new Map();

    (pedidos || []).forEach(pedido => {
        const familia = pedido.tipoMenu || pedido.plan || 'Sin familia';
        // A los individuales no se les suma merma: "si son 250 poner 250, si son
        // 500 poner 500, porque las cocineras ya saben como cocinar eso" (Gina).
        // La merma es para las ollas de los packs, donde se reparte a ojo.
        const esIndividual = esIndividualEnLaHoja(pedido.plan || pedido.tipoMenu || '');

        (pedido.platos || []).forEach(plato => {
            const porciones = porcionesDelPlato(pedido, plato);
            if (porciones <= 0) return;

            const componentes = [
                [TIPO_COMPONENTE.PROTEINA, plato.proteina?.nombre,
                 plato.proteina?.gramosPorPorcion, 'g'],
                [TIPO_COMPONENTE.VEGETAL, plato.vegetal?.nombre,
                 plato.vegetal?.cantidadPorPorcion, plato.vegetal?.unidad || 'taza'],
                [TIPO_COMPONENTE.CARBO, plato.carbo?.nombre,
                 plato.carbo?.cantidadPorPorcion, plato.carbo?.unidad || 'taza']
            ];

            componentes.forEach(([tipo, nombre, porPorcion, unidad]) => {
                if (!esIngrediente(nombre)) return;

                // La unidad entra en la clave: 250 g y 1 taza del mismo nombre no
                // se pueden sumar en un solo número.
                const k = `${tipo}|${clave(nombre)}|${unidad}`;

                if (!mapa.has(k)) {
                    mapa.set(k, {
                        tipo,
                        nombre: String(nombre).trim(),
                        unidad,
                        porPorcion: Number(porPorcion) || 0,
                        porciones: 0,
                        total: 0,
                        porcionesSinMerma: 0,
                        totalSinMerma: 0,
                        esSustitucion: /→|->/.test(String(nombre)),
                        desglose: new Map()
                    });
                }

                const prep = mapa.get(k);
                prep.porciones += porciones;
                prep.total += (Number(porPorcion) || 0) * porciones;
                if (esIndividual) {
                    prep.porcionesSinMerma += porciones;
                    prep.totalSinMerma += (Number(porPorcion) || 0) * porciones;
                }

                // De dónde viene, para poder repartirlo al salir de la olla
                const origen = `${familia} · Plato ${plato.numero ?? '?'}`;
                const previo = prep.desglose.get(origen) || { origen, familia, plato: plato.numero, porciones: 0 };
                previo.porciones += porciones;
                prep.desglose.set(origen, previo);
            });
        });
    });

    const preparaciones = [...mapa.values()].map(p => ({
        ...p,
        // Con merma: lo que de verdad se pone a cocinar
        porcionesCocina: Math.ceil((p.porciones - p.porcionesSinMerma) * factorMargen + p.porcionesSinMerma),
        // "Redondear pesos a mas siempre": quedarse corto deja a alguien sin comida.
        totalCocina: p.unidad === 'g'
            ? Math.ceil((p.total - p.totalSinMerma) * factorMargen + p.totalSinMerma)
            : Math.round(((p.total - p.totalSinMerma) * factorMargen + p.totalSinMerma) * 100) / 100,
        desglose: [...p.desglose.values()].sort((a, b) => b.porciones - a.porciones),
        // Solo hay algo que repartir si viene de más de un lado
        hayQueRepartir: p.desglose.size > 1
    }));

    // Primero proteínas (lo que más tarda), y dentro, lo más pesado primero
    const orden = [TIPO_COMPONENTE.PROTEINA, TIPO_COMPONENTE.VEGETAL, TIPO_COMPONENTE.CARBO];
    preparaciones.sort((a, b) => {
        const d = orden.indexOf(a.tipo) - orden.indexOf(b.tipo);
        if (d !== 0) return d;
        if (b.porciones !== a.porciones) return b.porciones - a.porciones;
        return a.nombre.localeCompare(b.nombre);
    });

    return {
        preparaciones,
        totalPorciones: preparaciones
            .filter(p => p.tipo === TIPO_COMPONENTE.PROTEINA)
            .reduce((acc, p) => acc + p.porciones, 0),
        marginPercent
    };
};

/** Cantidad legible: "3,24 kg", "540 g", "12,5 tazas". */
export const formatearCantidad = (cantidad, unidad) => {
    const n = Number(cantidad) || 0;
    if (unidad === 'g') {
        if (n >= 1000) return `${(Math.round(n / 10) / 100).toLocaleString('es-CR')} kg`;
        return `${Math.round(n)} g`;
    }
    const redondeado = Math.round(n * 10) / 10;
    return `${redondeado.toLocaleString('es-CR')} ${redondeado === 1 ? 'taza' : 'tazas'}`;
};
