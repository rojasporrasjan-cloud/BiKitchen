import { describe, it, expect } from 'vitest';
import { conCabecerasDeTanda } from '../utils/tandasDeEmpaque';

/**
 * El hueco en la numeracion de las tandas se explica solo.
 *
 * La hoja de cocina salta de la TANDA 3 a la 5 cuando una familia no tiene ni
 * una olla propia: el Full Pack del miercoles 9 de setiembre se cocina entero
 * con el Regular y el Sin Carbos, asi que no genera cabecera. El numero NO se
 * corre —tiene que calzar con la hoja de empaque, donde el Full Pack si es la
 * TANDA 4— pero quien cocina se queda buscando una pagina que no existe.
 */
const ORDEN = [
    { nombre: 'Pack Regular', packs: 5 },
    { nombre: 'Pack Sin Carbos', packs: 5 },
    { nombre: 'Pack Bajo en Calorias', packs: 4 },
    { nombre: 'Full Pack', packs: 2 },
    { nombre: 'Pack Casaditos', packs: 1 }
];

const fila = (tanda) => ({ tipo: 'suelto', item: { name: 'x', tanda } });
const cabeceras = (filas) => conCabecerasDeTanda(filas, ORDEN).filter(f => f.tipo === 'tanda');

describe('el hueco entre tandas', () => {
    it('avisa cual familia se salto y por que', () => {
        const cabs = cabeceras([fila(2), fila(4)]);
        expect(cabs.map(c => c.numero)).toEqual([3, 5]);
        expect(cabs[1].saltadas).toEqual([{ numero: 4, nombre: 'Full Pack' }]);
    });

    it('sin hueco no avisa nada', () => {
        const cabs = cabeceras([fila(0), fila(1)]);
        expect(cabs.map(c => c.numero)).toEqual([1, 2]);
        cabs.forEach(c => expect(c.saltadas).toEqual([]));
    });

    it('la primera tanda no inventa un hueco antes de ella', () => {
        const cabs = cabeceras([fila(0)]);
        expect(cabs[0].saltadas).toEqual([]);
    });

    it('arranca en la 3 y avisa de las dos que no tienen olla propia', () => {
        const cabs = cabeceras([fila(2)]);
        expect(cabs[0].numero).toBe(3);
        expect(cabs[0].saltadas.map(x => x.nombre))
            .toEqual(['Pack Regular', 'Pack Sin Carbos']);
    });

    it('las cenas de la misma familia no cuentan como hueco', () => {
        const conCena = [
            { tipo: 'suelto', item: { name: 'a', tanda: 0 } },
            { tipo: 'suelto', item: { name: 'b', tanda: 0, soloCena: true } },
            { tipo: 'suelto', item: { name: 'c', tanda: 1 } }
        ];
        const cabs = conCabecerasDeTanda(conCena, ORDEN).filter(f => f.tipo === 'tanda');
        expect(cabs.map(c => `${c.numero}${c.paso}`)).toEqual(['1a', '1b', '2a']);
        cabs.forEach(c => expect(c.saltadas).toEqual([]));
    });
});
