import { describe, it, expect } from 'vitest';
import {
    TASA_PUNTOS, PUNTOS_REFERIDO, BONO_BIENVENIDA,
    NIVELES, nivelPorPuntos, calcularPuntos
} from '../config/loyalty';

/**
 * Los BiPuntos son plata. Lo que el carrito le promete al cliente y lo que se le
 * acredita después tiene que dar EXACTAMENTE lo mismo: si no, el cliente ve que
 * le ofrecieron 3 puntos por cada ₡100 y le entraron 2.
 */

describe('nivelPorPuntos', () => {
    it('arranca en Bronce', () => {
        expect(nivelPorPuntos(0).name).toBe('Bronce');
        expect(nivelPorPuntos(1499).name).toBe('Bronce');
    });

    it('sube de nivel justo al llegar al mínimo', () => {
        expect(nivelPorPuntos(1500).name).toBe('Plata');
        expect(nivelPorPuntos(5000).name).toBe('Oro');
        expect(nivelPorPuntos(15000).name).toBe('Platino');
    });

    it('se queda en Platino por más puntos que tenga', () => {
        expect(nivelPorPuntos(999999).name).toBe('Platino');
    });

    it('no revienta sin dato', () => {
        expect(nivelPorPuntos().name).toBe('Bronce');
        expect(nivelPorPuntos(null).name).toBe('Bronce');
    });
});

describe('calcularPuntos', () => {
    it('da 2 puntos por cada ₡100 en Bronce', () => {
        expect(calcularPuntos(100)).toBe(2);
        expect(calcularPuntos(25000)).toBe(500);
        expect(calcularPuntos(50000)).toBe(1000);
    });

    it('aplica DE VERDAD el multiplicador de cada nivel', () => {
        const monto = 50000; // 1000 puntos base
        expect(calcularPuntos(monto, nivelPorPuntos(0))).toBe(1000);      // Bronce 1x
        expect(calcularPuntos(monto, nivelPorPuntos(1500))).toBe(1200);   // Plata 1.2x
        expect(calcularPuntos(monto, nivelPorPuntos(5000))).toBe(1500);   // Oro 1.5x
        expect(calcularPuntos(monto, nivelPorPuntos(15000))).toBe(2000);  // Platino 2x
    });

    it('sin nivel asume Bronce', () => {
        expect(calcularPuntos(50000)).toBe(calcularPuntos(50000, NIVELES[0]));
    });

    it('redondea hacia abajo, nunca regala de más', () => {
        expect(calcularPuntos(149)).toBe(2);   // 2.98 -> 2
        expect(calcularPuntos(99)).toBe(1);    // 1.98 -> 1
        expect(calcularPuntos(49)).toBe(0);    // 0.98 -> 0
    });

    it('un pedido sin monto no da puntos', () => {
        expect(calcularPuntos(0)).toBe(0);
        expect(calcularPuntos(null)).toBe(0);
        expect(calcularPuntos(undefined)).toBe(0);
        expect(calcularPuntos(-5000)).toBe(0);
    });

    it('el orden de los redondeos es el mismo que muestra el carrito', () => {
        // El carrito hace: floor(monto * 0.02) y después * multiplicador.
        // Si se invirtiera, un cliente Plata con ₡1.049 vería un número y
        // recibiría otro.
        const monto = 1049;
        const nivelPlata = nivelPorPuntos(1500);
        const comoLoMuestraElCarrito = Math.floor(Math.floor(monto * TASA_PUNTOS) * nivelPlata.multiplier);
        expect(calcularPuntos(monto, nivelPlata)).toBe(comoLoMuestraElCarrito);
    });
});

describe('Constantes del programa', () => {
    it('el referido son 1000 puntos, no 200', () => {
        // Había dos valores en el código; el que se otorgaba de verdad era 1000
        expect(PUNTOS_REFERIDO).toBe(1000);
    });

    it('el bono de bienvenida son 500', () => {
        expect(BONO_BIENVENIDA).toBe(500);
    });

    it('los niveles van de menor a mayor y sin multiplicadores repetidos', () => {
        const minimos = NIVELES.map(n => n.minPoints);
        expect(minimos).toEqual([...minimos].sort((a, b) => a - b));

        const multiplicadores = NIVELES.map(n => n.multiplier);
        expect(new Set(multiplicadores).size).toBe(multiplicadores.length);
        expect(multiplicadores[0]).toBe(1);
    });
});
