/**
 * Las cuentas de los gastos: validar lo que escribe Gina y sumar por categoría.
 * Las usan la función `gastos` (servidor) y las pantallas (link de Gina y panel),
 * así los dos lados dicen lo mismo.
 */
import { CATEGORIAS_GASTO, FORMAS_DE_PAGO, MONTO_MAXIMO } from '../data/gastos';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const corto = (t, max) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Un id por gasto, inventado una vez en el celular: si se manda dos veces (mala señal), es el mismo gasto. */
export const nuevoIdGasto = () => globalThis.crypto?.randomUUID?.()
    || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

/** "45.000", "₡45 000", "45000" → 45000. */
export const leerMonto = (texto) => Number(String(texto ?? '').replace(/[^\d]/g, '')) || 0;

/**
 * Revisa un gasto. Devuelve { gasto } limpio o { error } con lo que hay que
 * arreglar, dicho como se lo diría una persona.
 */
export const validarGasto = (entrada = {}) => {
    const monto = Math.round(Number(entrada.monto));
    if (!Number.isFinite(monto) || monto <= 0) return { error: 'Falta el monto.' };
    if (monto > MONTO_MAXIMO) return { error: 'Ese monto es muy grande. ¿No le sobra un cero?' };
    if (!CATEGORIAS_GASTO.some(c => c.id === entrada.categoria)) return { error: 'Escogé la categoría.' };
    if (!FECHA.test(String(entrada.fecha))) return { error: 'Falta la fecha.' };
    const que = corto(entrada.que, 140);
    if (entrada.categoria === 'otros' && !que) return { error: 'En «Otros» hay que escribir qué fue.' };
    const pago = FORMAS_DE_PAGO.includes(entrada.pago) ? entrada.pago : '';
    return {
        gasto: { fecha: entrada.fecha, categoria: entrada.categoria, monto, que, proveedor: corto(entrada.proveedor, 80), pago }
    };
};

/** Totales por categoría (de mayor a menor) y el total general. */
export const totalesDeGastos = (gastos = []) => {
    const porCategoria = CATEGORIAS_GASTO
        .map(c => ({ ...c, total: gastos.filter(g => g.categoria === c.id).reduce((s, g) => s + (Number(g.monto) || 0), 0) }))
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total);
    return { porCategoria, total: porCategoria.reduce((s, c) => s + c.total, 0) };
};

/** Los gastos agrupados por día, del más nuevo al más viejo. */
export const gastosPorDia = (gastos = []) => {
    const dias = new Map();
    [...gastos]
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || String(b.creado || '').localeCompare(String(a.creado || '')))
        .forEach((g) => {
            if (!dias.has(g.fecha)) dias.set(g.fecha, []);
            dias.get(g.fecha).push(g);
        });
    return [...dias.entries()].map(([fecha, lista]) => ({ fecha, lista, total: lista.reduce((s, g) => s + g.monto, 0) }));
};

/** Proveedores ya usados, para sugerirlos (los más usados primero). */
export const proveedoresUsados = (gastos = []) => {
    const cuenta = new Map();
    gastos.forEach((g) => { if (g.proveedor) cuenta.set(g.proveedor, (cuenta.get(g.proveedor) || 0) + 1); });
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p).slice(0, 20);
};
