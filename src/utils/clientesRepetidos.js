/**
 * Cuando el MISMO cliente sale mas de una vez en la misma tabla.
 *
 * Christian Vargas compro dos packs a proposito: uno de almuerzo y cena, y
 * otro regular de 20 comidas solo almuerzos. Los dos son "Regular", asi que
 * caen en la misma tabla y salian con el nombre identico, repetido:
 *
 *     Christian Vargas (1), Belen - LUN 14
 *     Christian Vargas (1), Belen - LUN 14
 *
 * Desde la hoja eso se lee como un duplicado. Gina reporto exactamente eso en
 * setiembre y hubo que ir a Firestore a comprobar que NO lo era. La hoja tiene
 * que decirlo sola: si el nombre se repite, cada linea dice cual de sus
 * pedidos es. Si no se repite, no se agrega nada y la hoja se ve igual que
 * siempre.
 *
 * Devuelve una lista paralela a la de entrada: la marca de cada cliente en su
 * mismo indice, o cadena vacia. Paralela y no un Map porque el que llama
 * dibuja por indice de fila.
 */

const norm = (s) => String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

export const marcasDePedidoRepetido = (clientes = [], leerNombre = (c) => c?.nombre) => {
    const lista = Array.isArray(clientes) ? clientes : [];

    const cuantos = new Map();
    for (const c of lista) {
        const n = norm(leerNombre(c));
        if (!n) continue;
        cuantos.set(n, (cuantos.get(n) || 0) + 1);
    }

    const vistos = new Map();
    return lista.map((c) => {
        const n = norm(leerNombre(c));
        const total = cuantos.get(n) || 0;
        if (!n || total < 2) return '';
        const cual = (vistos.get(n) || 0) + 1;
        vistos.set(n, cual);
        return ` \u2014 pedido ${cual} de ${total}`;
    });
};

/**
 * Una llave unica para dibujar listas de clientes.
 *
 * `key={c.nombre}` chocaba con los dos pedidos de Christian y React tiraba
 * "Encountered two children with the same key". No es solo ruido en la
 * consola: React avisa que con llaves repetidas puede DUPLICAR U OMITIR
 * elementos. Un cliente desapareciendo de la hoja de empaque sin aviso es
 * comida que no se empaca.
 */
export const llaveDeCliente = (cliente, indice = 0) => {
    const id = cliente?.rawPedido?.id || cliente?.rawPedido?.numeroOrden || cliente?.id;
    return id ? `${id}-${indice}` : `${norm(cliente?.nombre) || 'sin-nombre'}-${indice}`;
};
