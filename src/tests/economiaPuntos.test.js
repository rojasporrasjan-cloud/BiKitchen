import { describe, it, expect } from 'vitest';
import { TASA_PUNTOS, VALOR_PUNTO_CRC, NIVELES, calcularPuntos, nivelPorPuntos } from '../config/loyalty';

/**
 * La economia del programa de BiPuntos, fijada por pruebas.
 *
 * Un cambio de una sola constante mueve cuanta plata devuelve el negocio en cada
 * compra, y eso no se nota mirando el codigo. Acá queda expresado en porcentaje,
 * que es como se decide.
 */

/** Cuanto recibe de vuelta el cliente, en % de lo que gasta. */
const retornoPct = (multiplier) => TASA_PUNTOS * multiplier * VALOR_PUNTO_CRC * 100;

describe('Cuanto devuelve el programa', () => {
    it('la tasa base es 2 puntos por cada ₡100', () => {
        expect(calcularPuntos(100)).toBe(2);
        expect(calcularPuntos(100000)).toBe(2000);
    });

    it('cada punto vale ₡2 al canjearlo', () => {
        expect(VALOR_PUNTO_CRC).toBe(2);
    });

    it('el retorno base es 4%', () => {
        expect(retornoPct(1)).toBe(4);
    });

    it('ningun nivel pasa del 6%', () => {
        // Arriba de 6% el programa deja de ser sostenible en comida
        NIVELES.forEach(n => expect(retornoPct(n.multiplier)).toBeLessThanOrEqual(6));
    });

    it('el retorno por nivel es el acordado', () => {
        const porNivel = Object.fromEntries(NIVELES.map(n => [n.name, retornoPct(n.multiplier)]));
        expect(porNivel).toEqual({ Bronce: 4, Plata: 4.8, Oro: 5.2, Platino: 6 });
    });

    it('cada nivel da mas que el anterior', () => {
        for (let i = 1; i < NIVELES.length; i++) {
            expect(NIVELES[i].multiplier).toBeGreaterThan(NIVELES[i - 1].multiplier);
            expect(NIVELES[i].minPoints).toBeGreaterThan(NIVELES[i - 1].minPoints);
        }
    });
});

describe('Precio de los premios', () => {
    // Espejo del catalogo de RewardStore. Si alla cambia, acá tiene que cambiar.
    const PREMIOS = [
        { id: 'coupon_2000', puntos: 1000, valorCRC: 2000 },
        { id: 'free_shipping', puntos: 3500, valorCRC: 7000 },   // el envio mas caro
        { id: 'coupon_5000', puntos: 2500, valorCRC: 5000 },
        { id: 'free_pack_week', puntos: 15000, valorCRC: 30000 } // el pack mas caro
    ];

    it('ninguno se canjea por debajo de ₡2 el punto', () => {
        PREMIOS.forEach(p => {
            expect(p.valorCRC / p.puntos).toBeLessThanOrEqual(VALOR_PUNTO_CRC);
        });
    });

    it('los cupones valen exacto ₡2 el punto', () => {
        PREMIOS.filter(p => p.id.startsWith('coupon')).forEach(p => {
            expect(p.valorCRC / p.puntos).toBe(VALOR_PUNTO_CRC);
        });
    });

    it('cuanto hay que gastar para cada premio, en Bronce', () => {
        const gastoPara = (puntos) => puntos / TASA_PUNTOS;
        expect(gastoPara(1000)).toBe(50000);    // cupón ₡2.000
        expect(gastoPara(2500)).toBe(125000);   // cupón ₡5.000
        expect(gastoPara(3500)).toBe(175000);   // envío gratis
        expect(gastoPara(15000)).toBe(750000);  // pack semanal
    });

    it('el envio gratis ya no se regala en la zona cara', () => {
        // Antes costaba 1.500 puntos: un envío de ₡7.000 salía a ₡4,67 el punto
        const antes = 7000 / 1500;
        const ahora = 7000 / 3500;
        expect(antes).toBeGreaterThan(VALOR_PUNTO_CRC);
        expect(ahora).toBe(VALOR_PUNTO_CRC);
    });
});

describe('Los niveles siguen calculando bien', () => {
    it('cada umbral cae donde debe', () => {
        expect(nivelPorPuntos(0).name).toBe('Bronce');
        expect(nivelPorPuntos(1499).name).toBe('Bronce');
        expect(nivelPorPuntos(1500).name).toBe('Plata');
        expect(nivelPorPuntos(4999).name).toBe('Plata');
        expect(nivelPorPuntos(5000).name).toBe('Oro');
        expect(nivelPorPuntos(15000).name).toBe('Platino');
    });

    it('el multiplicador se aplica de verdad al otorgar', () => {
        expect(calcularPuntos(100000, nivelPorPuntos(0))).toBe(2000);      // Bronce
        expect(calcularPuntos(100000, nivelPorPuntos(5000))).toBe(2600);   // Oro 1.3x
        expect(calcularPuntos(100000, nivelPorPuntos(15000))).toBe(3000);  // Platino 1.5x
    });
});
