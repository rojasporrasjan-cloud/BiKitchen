import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

/**
 * El hook que carga solo los pedidos de unas fechas. Lo importante: que junte
 * las dos consultas sin repetir, y que NO diga "listo" con lo que viene del
 * caché, que puede ser una parte.
 */

const oyentes = [];
vi.mock('../firebase/config', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
    collection: () => ({}),
    where: (campo, op, valor) => ({ campo, op, valor }),
    query: (_c, ...filtros) => ({ filtros }),
    onSnapshot: (q, _opciones, alLlegar) => {
        oyentes.push({ q, alLlegar });
        return () => {};
    }
}));

const { default: usePedidosDeFechas } = await import('../hooks/usePedidosDeFechas');

const snap = (docs, fromCache) => ({
    docs: docs.map(d => ({ id: d.id, data: () => d })),
    docChanges: () => docs,
    metadata: { fromCache }
});

beforeEach(() => { oyentes.length = 0; });

describe('usePedidosDeFechas', () => {
    it('hace una consulta por fechas guardadas y otra por rango', () => {
        renderHook(() => usePedidosDeFechas(['2026-09-21', '2026-09-19']));
        expect(oyentes).toHaveLength(2);
        expect(oyentes[0].q.filtros[0]).toEqual({ campo: 'fechas_entrega', op: 'array-contains-any', valor: ['2026-09-19', '2026-09-21'] });
        expect(oyentes[1].q.filtros.map(f => f.op)).toEqual(['>=', '<=']);
    });

    it('junta las dos sin repetir el mismo pedido', () => {
        const { result } = renderHook(() => usePedidosDeFechas(['2026-09-19']));
        act(() => {
            oyentes[0].alLlegar(snap([{ id: 'a' }, { id: 'b' }], false));
            oyentes[1].alLlegar(snap([{ id: 'b' }, { id: 'c' }], false));
        });
        expect(result.current.pedidos.map(p => p.id).sort()).toEqual(['a', 'b', 'c']);
        expect(result.current.cargando).toBe(false);
    });

    /** Con lo del caché solo, la hoja podría imprimirse sin algunos clientes. */
    it('con lo del caché sigue "cargando" hasta que contesta el servidor', () => {
        const { result } = renderHook(() => usePedidosDeFechas(['2026-09-19']));
        act(() => {
            oyentes[0].alLlegar(snap([{ id: 'a' }], true));
            oyentes[1].alLlegar(snap([{ id: 'c' }], false));
        });
        expect(result.current.cargando).toBe(true);
        act(() => { oyentes[0].alLlegar(snap([{ id: 'a' }, { id: 'b' }], false)); });
        expect(result.current.cargando).toBe(false);
        expect(result.current.pedidos).toHaveLength(3);
    });

    it('sin internet: después de esperar muestra lo que hay y avisa', () => {
        vi.useFakeTimers();
        const { result } = renderHook(() => usePedidosDeFechas(['2026-09-19']));
        act(() => { oyentes[0].alLlegar(snap([{ id: 'a' }], true)); });
        act(() => { vi.advanceTimersByTime(9000); });
        expect(result.current.cargando).toBe(false);
        expect(result.current.sinServidor).toBe(true);
        vi.useRealTimers();
    });

    it('sin fechas no consulta nada', () => {
        const { result } = renderHook(() => usePedidosDeFechas([]));
        expect(oyentes).toHaveLength(0);
        expect(result.current.cargando).toBe(false);
    });
});
