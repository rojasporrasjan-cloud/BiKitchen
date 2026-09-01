import { describe, it, expect } from 'vitest';
import { cuantoCocinar, parteDeIndividuales } from '../utils/cuantoCocinar.js';

/**
 * "Quitarle la merma a los individuales: si son 250 poner 250, si son 500 poner
 *  500, si es kilo poner kilo, porque las cocineras ya saben como cocinar eso.
 *  Tambien redondear pesos a mas siempre." — Gina, via Jan.
 */
const individual = (qty, unit = 'g') => ({ qty, unit });

describe('los individuales van sin merma', () => {

    it('un plato que SOLO va a individuales sale tal cual', () => {
        const item = { name: 'Pollo a la toscana', unit: 'g', totalQty: 250,
                       individualEntries: [individual(250)] };
        expect(cuantoCocinar(item)).toBe(250);
    });

    it('500 g se cocinan 500, no 650', () => {
        const item = { name: 'Tilapia empanizada', unit: 'g', totalQty: 500,
                       individualEntries: [individual(500)] };
        expect(cuantoCocinar(item)).toBe(500);
    });

    it('tres porciones de 250 son 750, no 975', () => {
        const item = { name: 'Carne mechada de res en salsa', unit: 'g', totalQty: 750,
                       individualEntries: [individual(250), individual(250), individual(250)] };
        expect(cuantoCocinar(item)).toBe(750);
    });

    it('un plato que va SOLO a las ollas conserva su merma', () => {
        const item = { name: 'Lentejas con trocitos de cerdo', unit: 'g', totalQty: 240 };
        expect(cuantoCocinar(item)).toBe(312);   // 240 x 1,30
    });

    it('un plato que va a las DOS cosas: merma solo sobre la parte de las ollas', () => {
        // Pollo al pesto: 360 g en packs + 250 g de individual.
        // Antes: (360 + 250) x 1,30 = 793. Ahora: 360 x 1,30 + 250 = 718.
        const item = { name: 'Pollo al pesto', unit: 'g', totalQty: 610,
                       individualEntries: [individual(250)] };
        expect(cuantoCocinar(item)).toBe(718);
    });

    it('no resta individuales que se miden distinto', () => {
        // 1 taza de un individual no se puede restar de un total en gramos.
        const item = { name: 'Arroz', unit: 'g', totalQty: 400,
                       individualEntries: [individual(2, 'taza(s)')] };
        expect(cuantoCocinar(item)).toBe(520);   // 400 x 1,30
    });

    it('los individuales no pueden pasarse del total', () => {
        const item = { name: 'Raro', unit: 'g', totalQty: 100,
                       individualEntries: [individual(500)] };
        expect(cuantoCocinar(item)).toBe(100);
    });
});

describe('los pesos se redondean hacia arriba', () => {

    it('312,0001 se cocina 313, no 312', () => {
        expect(cuantoCocinar({ unit: 'g', totalQty: 240.001 })).toBe(313);
    });

    it('un valor que antes se redondeaba hacia abajo ahora sube', () => {
        // 120 x 1,30 = 156 exacto; 125 x 1,30 = 162,5 -> antes 162, ahora 163
        expect(cuantoCocinar({ unit: 'g', totalQty: 125 })).toBe(163);
    });

    it('las tazas no se redondean a entero: media taza es media taza', () => {
        expect(cuantoCocinar({ unit: 'taza(s)', totalQty: 1 })).toBe(1.3);
    });

    it('las unidades se cuentan de a una, sin merma', () => {
        expect(cuantoCocinar({ unit: 'unidades', totalQty: 10 })).toBe(10);
    });
});

describe('la parte que va a individuales', () => {
    it('suma solo lo que se mide igual', () => {
        expect(parteDeIndividuales({ unit: 'g', individualEntries: [
            individual(250), individual(500), individual(3, 'taza(s)')
        ] })).toBe(750);
    });
    it('sin individuales es cero', () => {
        expect(parteDeIndividuales({ unit: 'g' })).toBe(0);
    });
});
