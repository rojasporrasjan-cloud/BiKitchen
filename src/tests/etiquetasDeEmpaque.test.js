import { describe, it, expect } from 'vitest';
import { etiquetasDeEmpaque, sinSustituciones } from '../utils/productionHelpers';

/**
 * Quien empaca necesita ver cinco cosas de cada cliente:
 *   1. si NO come algo
 *   2. si cambio un plato
 *   3. si es two pack
 *   4. si lleva cenas o desayunos
 *   5. si lleva otro pack ademas de este
 *
 * La pantalla y el Excel armaban esa lista por separado y decian cosas
 * distintas: en el Excel no aparecia que el cliente llevara desayunos, y en la
 * pantalla el cambio de plato salia DOS veces —como etiqueta y otra vez dentro
 * de la observacion—.
 */
const angelo = {
    nombre: 'Angelo Oviedo Montero',
    incluyeDesayuno: true,
    observaciones: 'Lleva cena',
    rawPedido: { items: [] }
};

const bryan = {
    nombre: 'Bryan Ocampo G',
    observaciones: 'Sin res ni cerdo · Plato 2 (Lomo fingido en salsa gravy) → Filet de pollo encebollado',
    rawPedido: {
        items: [{
            customizations: {
                proteinChanges: [
                    { dishNumber: 2, dishName: 'Lomo fingido en salsa gravy', newValue: 'Filet de pollo encebollado' }
                ]
            }
        }]
    }
};

describe('etiquetasDeEmpaque', () => {

    it('avisa que el cliente lleva desayunos', () => {
        expect(etiquetasDeEmpaque(angelo)).toContain('Lleva desayunos');
    });

    it('avisa que es two pack, de primero', () => {
        const t = etiquetasDeEmpaque(angelo, { esTwoPack: true });
        expect(t[0]).toMatch(/TWO PACK/);
    });

    it('avisa el cambio de plato', () => {
        expect(etiquetasDeEmpaque(bryan).join(' ')).toMatch(/CAMBIA.*Filet de pollo encebollado/);
    });

    it('incluye el otro pack que lleva', () => {
        expect(etiquetasDeEmpaque(angelo, { otrosPacks: 'Lleva también: Individuales' }))
            .toContain('Lleva también: Individuales');
    });

    it('un cliente sin nada especial no genera etiquetas', () => {
        expect(etiquetasDeEmpaque({ nombre: 'Zulema', rawPedido: { items: [] } })).toEqual([]);
        expect(etiquetasDeEmpaque(null)).toEqual([]);
    });
});

describe('sinSustituciones', () => {

    it('quita el cambio de plato de la nota: ya va en su etiqueta', () => {
        expect(sinSustituciones(bryan.observaciones)).toBe('Sin res ni cerdo');
    });

    it('quita varios cambios seguidos', () => {
        const obs = 'Sin res · Plato 2 (A) → B · Plato 3 (C) → D · Estilo tradicional';
        expect(sinSustituciones(obs)).toBe('Sin res · Estilo tradicional');
    });

    it('deja intacta una nota que no trae cambios', () => {
        expect(sinSustituciones('No aguacate ni remolacha Porfavor')).toBe('No aguacate ni remolacha Porfavor');
    });

    it('aguanta vacio o nulo', () => {
        expect(sinSustituciones('')).toBe('');
        expect(sinSustituciones(null)).toBe('');
    });
});

describe('la etiqueta de desayunos no se repite', () => {
    it('si la nota ya dice cuantos packs, no agrega el "Lleva desayunos" pelado', () => {
        const tags = etiquetasDeEmpaque({
            incluyeDesayuno: true,
            observaciones: 'Lleva 2 packs de desayunos'
        });
        expect(tags).toEqual([]);
    });

    it('sin nota, la etiqueta sigue saliendo', () => {
        const tags = etiquetasDeEmpaque({ incluyeDesayuno: true, observaciones: '' });
        expect(tags).toContain('Lleva desayunos');
    });
});

describe('no se dice dos veces que lleva desayunos', () => {
    it('quita "Desayunos" de "Lleva también" cuando ya se dijo arriba', () => {
        const tags = etiquetasDeEmpaque(
            { incluyeDesayuno: true, observaciones: '' },
            { otrosPacks: 'Lleva también: Desayunos' }
        );
        expect(tags).toEqual(['Lleva desayunos']);
    });

    it('deja los otros packs y saca solo el de desayunos', () => {
        const tags = etiquetasDeEmpaque(
            { incluyeDesayuno: true, observaciones: 'Lleva 2 packs de desayunos' },
            { otrosPacks: 'Lleva también: Desayunos, Individuales' }
        );
        expect(tags).toEqual(['Lleva también: Individuales']);
    });

    it('si no lleva desayunos, el tag pasa completo', () => {
        const tags = etiquetasDeEmpaque(
            { incluyeDesayuno: false, observaciones: '' },
            { otrosPacks: 'Lleva también: Desayunos, Individuales' }
        );
        expect(tags).toEqual(['Lleva también: Desayunos, Individuales']);
    });
});
