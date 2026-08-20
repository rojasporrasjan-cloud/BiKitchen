import { describe, it, expect } from 'vitest';
import { calcularPuntos } from '../config/loyalty';

/**
 * Caso real: Alexandra Mora (mtabm20@gmail.com), 3 pedidos de ₡114.480.
 *
 * Los 3 pedidos decian "Puntos otorgados: +2289 pts" y ella veia 0 puntos,
 * Nivel Bronce. Los puntos SI se escribieron: en el campo `points`, que no lo
 * lee nadie. El saldo que ve el cliente es `currentPoints`.
 *
 * Tres nombres distintos convivian para lo mismo:
 *   currentPoints  → useLoyaltyPoints, loyaltySync, clientService  (el bueno)
 *   points         → OrdersContext y nmi-charge al otorgar          (invisible)
 *   puntos_actuales→ ClientProfileModal al leer                     (no existia)
 */

/** Lo que escribe el otorgamiento despues del arreglo. */
const otorgar = (docActual, puntos) => ({
    ...docActual,
    currentPoints: (docActual?.currentPoints || 0) + puntos,
    points: (docActual?.points || 0) + puntos,
    totalEarned: (docActual?.totalEarned || 0) + puntos
});

/** Lo que lee el cliente en su cuenta. */
const saldoDelCliente = (doc) => doc?.currentPoints ?? 0;

describe('Los 3 pedidos de Alexandra', () => {
    const PEDIDO = 114480;

    it('cada pedido da 2289 puntos', () => {
        expect(calcularPuntos(PEDIDO)).toBe(2289);
    });

    it('despues de los 3, el cliente ve 6867 y no cero', () => {
        let doc = null;
        for (let i = 0; i < 3; i++) doc = otorgar(doc, calcularPuntos(PEDIDO));
        expect(saldoDelCliente(doc)).toBe(6867);
    });

    it('el bug: escribir solo `points` deja al cliente en cero', () => {
        const soloPoints = { points: 6867, totalEarned: 6867 };
        expect(saldoDelCliente(soloPoints)).toBe(0);
    });
});

describe('Los dos campos quedan alineados', () => {
    it('currentPoints y points valen lo mismo al otorgar', () => {
        const doc = otorgar({ currentPoints: 500, points: 500, totalEarned: 500 }, 2289);
        expect(doc.currentPoints).toBe(doc.points);
        expect(doc.currentPoints).toBe(2789);
    });

    it('sobre un documento que solo tenia el bono de bienvenida', () => {
        // loyaltySync crea el doc con currentPoints y sin `points`
        const doc = otorgar({ currentPoints: 500, totalEarned: 500 }, 2289);
        expect(doc.currentPoints).toBe(2789);
        expect(saldoDelCliente(doc)).toBe(2789);
    });

    it('totalEarned acumula para el nivel', () => {
        const doc = otorgar({ currentPoints: 0, points: 0, totalEarned: 0 }, 2289);
        expect(doc.totalEarned).toBe(2289);
    });
});

describe('Lo que lee el admin', () => {
    const leerAdmin = (cp, cdb) => cp?.currentPoints ?? cp?.points ?? cdb?.totalPuntos ?? 0;

    it('coincide con lo que ve el cliente', () => {
        const doc = { currentPoints: 6867, points: 6867, totalEarned: 6867 };
        expect(leerAdmin(doc, { totalPuntos: 2289 })).toBe(saldoDelCliente(doc));
    });

    it('un saldo de cero NO cae al respaldo desincronizado', () => {
        expect(leerAdmin({ currentPoints: 0 }, { totalPuntos: 2289 })).toBe(0);
    });
});
