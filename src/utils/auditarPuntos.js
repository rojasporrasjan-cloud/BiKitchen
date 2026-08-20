/**
 * Auditoría de BiPuntos: cuánto TIENE cada cliente contra cuánto DEBERÍA tener.
 *
 * Existe por un bug de campo: durante mucho tiempo los pedidos otorgaron puntos
 * escribiendo `points`, mientras la cuenta del cliente lee `currentPoints`. Los
 * puntos se guardaron, pero en un renglón que nadie mira, así que los clientes
 * vieron cero. Ver campoSaldoPuntos.test.js.
 *
 * Antes de corregir saldos hay que descontar los PEDIDOS DUPLICADOS: si el mismo
 * pedido se metió dos veces y los dos otorgaron puntos, acreditar el total le
 * regala puntos al cliente. Por eso acá se detectan y se cuentan una sola vez.
 *
 * Todo es función pura: entran pedidos y documentos de loyalty, sale el informe.
 * No escribe nada.
 */

/** Un pedido solo cuenta para puntos si el sistema los dio por otorgados. */
const otorgo = (pedido) => pedido?.pointsAwarded === true;

const correoDe = (pedido) =>
    String(pedido?.correoPuntos || pedido?.correo || '').toLowerCase().trim();

const puntosDe = (pedido) => Number(pedido?.pointsToAward) || 0;

/**
 * Huella de un pedido, para reconocer al mismo metido dos veces.
 *
 * Se usa el correo, el monto, el plan y las fechas de entrega. Dos pedidos con
 * todo eso igual son, en la práctica, el mismo: nadie compra el mismo pack, por
 * el mismo monto, para las mismas fechas exactas, dos veces.
 *
 * La fecha de creación NO entra: el duplicado suele meterse minutos u horas
 * después, o incluso al día siguiente.
 */
export const huellaPedido = (pedido) => [
    correoDe(pedido),
    Number(pedido?.total) || 0,
    String(pedido?.plan || '').toLowerCase().trim(),
    (Array.isArray(pedido?.fechas_entrega) ? [...pedido.fechas_entrega].sort() : [pedido?.fecha_entrega])
        .filter(Boolean).join(',')
].join('|');

/**
 * Agrupa los pedidos que son el mismo repetido.
 *
 * @returns {{ huella, pedidos: object[], repetidos: number, puntosDeMas: number }[]}
 */
export const detectarDuplicados = (pedidos = []) => {
    const porHuella = new Map();

    pedidos.filter(otorgo).forEach((p) => {
        const h = huellaPedido(p);
        if (!porHuella.has(h)) porHuella.set(h, []);
        porHuella.get(h).push(p);
    });

    return [...porHuella.entries()]
        .filter(([, lista]) => lista.length > 1)
        .map(([huella, lista]) => ({
            huella,
            correo: correoDe(lista[0]),
            cliente: lista[0]?.cliente || '',
            pedidos: lista,
            repetidos: lista.length - 1,
            // El primero se acredita; los repetidos son puntos de más
            puntosDeMas: lista.slice(1).reduce((s, p) => s + puntosDe(p), 0)
        }));
};

/**
 * Cuánto debería tener cada cliente, contando los duplicados UNA sola vez.
 *
 * @param {object[]} pedidos - colección `pedidos`
 * @param {Object<string, object>} loyaltyPorCorreo - documentos de `loyalty` por id
 * @param {number} [bonoBienvenida] - se respeta lo que ya tenga el documento
 */
export const auditarPuntos = (pedidos = [], loyaltyPorCorreo = {}) => {
    const vistos = new Set();
    const porCliente = new Map();

    pedidos.filter(otorgo).forEach((p) => {
        const correo = correoDe(p);
        if (!correo) return;

        const h = huellaPedido(p);
        const esDuplicado = vistos.has(h);
        vistos.add(h);

        if (!porCliente.has(correo)) {
            porCliente.set(correo, {
                correo,
                cliente: p.cliente || '',
                pedidosContados: 0,
                duplicadosIgnorados: 0,
                puntosPorPedidos: 0,
                puntosIgnorados: 0
            });
        }
        const c = porCliente.get(correo);

        if (esDuplicado) {
            c.duplicadosIgnorados += 1;
            c.puntosIgnorados += puntosDe(p);
        } else {
            c.pedidosContados += 1;
            c.puntosPorPedidos += puntosDe(p);
        }
    });

    return [...porCliente.values()].map((c) => {
        const doc = loyaltyPorCorreo[c.correo] || null;

        // Lo ganado que NO viene de pedidos (bono de bienvenida, referidos,
        // ajustes manuales) se conserva: es la diferencia entre totalEarned y
        // lo que suman los pedidos.
        const totalEarned = Number(doc?.totalEarned) || 0;
        const otrosPuntos = Math.max(totalEarned - c.puntosPorPedidos, 0);
        const canjeado = Number(doc?.totalRedeemed) || 0;

        const saldoActual = Number(doc?.currentPoints) || 0;
        const saldoCorrecto = Math.max(c.puntosPorPedidos + otrosPuntos - canjeado, 0);

        return {
            ...c,
            tieneDocumento: !!doc,
            saldoActual,
            saldoCorrecto,
            faltante: saldoCorrecto - saldoActual,
            otrosPuntos,
            canjeado
        };
    }).sort((a, b) => b.faltante - a.faltante);
};

/** Solo los que hay que corregir. */
export const soloDescuadrados = (informe = []) => informe.filter((c) => c.faltante !== 0);

/** Resumen para mostrar antes de decidir. */
export const resumenAuditoria = (informe = [], duplicados = []) => ({
    clientes: informe.length,
    conFaltante: informe.filter((c) => c.faltante > 0).length,
    conSobrante: informe.filter((c) => c.faltante < 0).length,
    puntosADevolver: informe.reduce((s, c) => s + Math.max(c.faltante, 0), 0),
    gruposDuplicados: duplicados.length,
    pedidosDuplicados: duplicados.reduce((s, d) => s + d.repetidos, 0),
    puntosEvitadosPorDuplicados: duplicados.reduce((s, d) => s + d.puntosDeMas, 0)
});
