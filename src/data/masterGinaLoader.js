/**
 * Limpieza de los pedidos que entraron desde el Excel de Gina.
 *
 * Este archivo tenía además un cargador con 17 pedidos del miércoles 19 de
 * agosto de 2026 escritos a mano, y un botón "Cargar 17 Pedidos del Miércoles"
 * que los metía como pendientes. Esa carga ya se hizo y las fechas quedaron
 * congeladas: apretarlo en septiembre inyectaba diecisiete pedidos de agosto en
 * la lista de pendientes. Se quitó — está en el historial de git si hace falta.
 */

import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { getScheduleFromOrder } from '../utils/orderDates';

const aISO = (fecha) => {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
};

/**
 * ¿A este pedido todavía le queda una entrega?
 *
 * Mira el calendario COMPLETO, no solo la primera fecha: un pack mensual que
 * empezó el 10 de agosto sigue vivo si su cuarta entrega es en setiembre.
 */
export const tieneEntregaPendiente = (pedido, hoy = new Date()) => {
    if (!pedido) return false;
    const hoyISO = aISO(hoy);
    let fechas = [];
    try {
        fechas = getScheduleFromOrder(pedido) || [];
    } catch {
        fechas = [];
    }
    return fechas.some((f) => String(f) >= hoyISO);
};

/**
 * Borra los pedidos cargados desde el Excel de Gina que YA se entregaron.
 *
 * Nunca toca uno con entrega de hoy en adelante. El 31 de agosto de 2026 esta
 * función, sin ese filtro, se habría llevado el pedido de Sonia Oreamuno con
 * entrega el miércoles 2: habría desaparecido de la hoja de producción sin
 * ningún aviso, y en cocina se habrían enterado cuando faltara la comida.
 *
 * @returns {{eliminados: number, conservados: Array<{id: string, cliente: string}>}}
 */
export async function eliminarPedidosDeGina(dbInstance, hoy = new Date()) {
    const q = query(collection(dbInstance, 'pedidos'), where('source', '==', 'excel-master-gina'));
    const snap = await getDocs(q);

    let eliminados = 0;
    const conservados = [];

    for (const d of snap.docs) {
        const pedido = { id: d.id, ...d.data() };
        if (tieneEntregaPendiente(pedido, hoy)) {
            conservados.push({ id: pedido.numeroOrden || d.id, cliente: pedido.cliente || 'Sin nombre' });
            continue;
        }
        await deleteDoc(doc(dbInstance, 'pedidos', d.id));
        eliminados++;
    }

    return { eliminados, conservados };
}
