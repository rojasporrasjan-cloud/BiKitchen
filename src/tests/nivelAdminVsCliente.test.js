import { describe, it, expect } from 'vitest';
import { nivelPorPuntos, NIVELES, calcularPuntos } from '../config/loyalty';

/**
 * Caso real: Alexandra Mora (mtabm20@gmail.com), pedido #ORD-5131.
 *
 * El admin le mostraba a Gina "2289 pts · Nivel Oro" mientras la clienta veía
 * "0 puntos · Nivel Bronce" en su cuenta. Los dos números venían de fuentes
 * distintas y ninguna de las dos era la misma tabla de niveles.
 */

describe('Los umbrales que usaba el admin estaban inventados', () => {
    it('2289 puntos es PLATA, no Oro', () => {
        expect(nivelPorPuntos(2289).name).toBe('Plata');
        // El admin decía Oro con más de 1000
        expect(2289 > 1000).toBe(true);
    });

    it('Oro arranca en 5000, no en 1000', () => {
        const oro = NIVELES.find(n => n.name === 'Oro');
        expect(oro.minPoints).toBe(5000);
        expect(nivelPorPuntos(4999).name).not.toBe('Oro');
        expect(nivelPorPuntos(5000).name).toBe('Oro');
    });

    it('existe Platino, que el admin ni contemplaba', () => {
        expect(nivelPorPuntos(15000).name).toBe('Platino');
    });

    it('sin puntos es Bronce', () => {
        expect(nivelPorPuntos(0).name).toBe('Bronce');
    });
});

describe('De dónde salía el 2289', () => {
    it('son los puntos de UN pedido de ₡114.480, no un saldo', () => {
        expect(calcularPuntos(114480)).toBe(2289);
    });
});

describe('El campo del saldo real', () => {
    /** Réplica de la lectura de ClientProfileModal después del arreglo. */
    const leerSaldo = (clientPoints, clienteDb) =>
        clientPoints?.points ?? clientPoints?.puntos_actuales ?? clienteDb?.totalPuntos ?? 0;

    it('manda `points`, que es el campo que guarda loyalty', () => {
        expect(leerSaldo({ points: 0, totalEarned: 0 }, { totalPuntos: 2289 })).toBe(0);
    });

    it('cero es un saldo válido: no cae al respaldo desincronizado', () => {
        // Este era el bug: 0 || 2289 → 2289. Con ?? se respeta el 0.
        expect(leerSaldo({ points: 0 }, { totalPuntos: 2289 })).not.toBe(2289);
    });

    it('si no hay documento de loyalty, usa lo que haya en clientes', () => {
        expect(leerSaldo(null, { totalPuntos: 500 })).toBe(500);
    });

    it('sin nada, cero', () => {
        expect(leerSaldo(null, null)).toBe(0);
    });
});
