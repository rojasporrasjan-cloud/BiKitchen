import { describe, it, expect } from 'vitest';
import { separarPersonalizadosDePack, agruparCambiosDePack } from '../utils/desayunosPersonalizados';

/**
 * La hoja de empaque en tres bloques, no en uno.
 *
 * "Poner todos los que no tienen ningun cambio en una hoja, los que tienen
 * cambios en otra, y los personalizados en otra" — Jan, 7 de setiembre de 2026,
 * despues de empacar 45 packs de un solo el viernes.
 *
 * El que empaca llena en linea: 30 envases iguales de corrido. Los que llevan
 * un cambio rompen la linea, pero si cinco pidieron el MISMO cambio son otra
 * linea de cinco, no cinco excepciones sueltas.
 */

const MENU = [
    { numero: 1, proteina: { nombre: 'Pollo al pesto' }, vegetal: { nombre: 'Vegetales mixtos' }, carbo: { nombre: 'Arroz blanco' } },
    { numero: 2, proteina: { nombre: 'Carne mechada en salsa' }, vegetal: { nombre: 'Chayote salteado' }, carbo: { nombre: 'Pure de papa' } },
    { numero: 3, proteina: { nombre: 'Tilapia al ajillo' }, vegetal: { nombre: 'Zuchinni salteado' }, carbo: { nombre: 'Papas salteadas' } }
];

const cliente = (nombre, observaciones, cantidad = 1) => ({ nombre, observaciones, cantidad });

describe('empaque partido por tipo de cambio', () => {
    it('los que no cambian nada quedan en el bloque de la linea de montaje', () => {
        const { estandar, packsEstandar } = separarPersonalizadosDePack(
            [cliente('Ana', ''), cliente('Beto', ''), cliente('Cata', 'Entregar antes de las 9')],
            MENU, 'Pack Bajo Calorías'
        );
        expect(estandar.map(c => c.nombre)).toEqual(['Ana', 'Beto', 'Cata']);
        expect(packsEstandar).toBe(3);
    });

    it('los que pidieron el MISMO cambio van en un solo grupo', () => {
        const { personalizados } = separarPersonalizadosDePack([
            cliente('Ana', 'Cambiar arroz blanco por pure de papa'),
            cliente('Beto', 'Cambiar arroz blanco por pure de papa'),
            cliente('Cata', 'Cambiar arroz blanco por pure de papa')
        ], MENU, 'Pack Bajo Calorías');

        const { grupos, propios } = agruparCambiosDePack(personalizados);
        expect(propios).toHaveLength(0);
        expect(grupos).toHaveLength(1);
        expect(grupos[0].clientes.map(c => c.nombre)).toEqual(['Ana', 'Beto', 'Cata']);
        expect(grupos[0].total).toBe(3);
    });

    it('cambios distintos no se mezclan', () => {
        const { personalizados } = separarPersonalizadosDePack([
            cliente('Ana', 'Cambiar arroz blanco por pure de papa'),
            cliente('Beto', 'Cambiar tilapia al ajillo por milanesa de pollo'),
            cliente('Cata', 'Cambiar arroz blanco por pure de papa')
        ], MENU, 'Pack Bajo Calorías');

        const { grupos } = agruparCambiosDePack(personalizados);
        expect(grupos).toHaveLength(2);
        // El grupo mas grande va primero
        expect(grupos[0].clientes.map(c => c.nombre)).toEqual(['Ana', 'Cata']);
        expect(grupos[1].clientes.map(c => c.nombre)).toEqual(['Beto']);
    });

    it('el grupo trae UN solo cuadro de platos, porque a todos les queda igual', () => {
        const { personalizados } = separarPersonalizadosDePack([
            cliente('Ana', 'Cambiar arroz blanco por pure de papa'),
            cliente('Beto', 'Cambiar arroz blanco por pure de papa')
        ], MENU, 'Pack Bajo Calorías');

        const { grupos } = agruparCambiosDePack(personalizados);
        const plato1 = grupos[0].platos.find(p => p.numero === 1);
        expect(plato1.carbo).toMatch(/pure de papa/i);
        expect(plato1.original).toMatch(/arroz blanco/i);
    });

    it('la cantidad del grupo suma los packs, no las personas', () => {
        const { personalizados } = separarPersonalizadosDePack([
            cliente('Ana', 'Cambiar arroz blanco por pure de papa', 2),
            cliente('Beto', 'Cambiar arroz blanco por pure de papa', 1)
        ], MENU, 'Pack Bajo Calorías');

        expect(agruparCambiosDePack(personalizados).grupos[0].total).toBe(3);
    });

    it('un cambio de COMPOSICION no se agrupa con nadie: el envase se arma distinto', () => {
        const { personalizados } = separarPersonalizadosDePack(
            [cliente('Marianela', '150 g de proteina, 3 vegetales y 1 carbo')],
            MENU, 'Full Pack'
        );
        const { grupos, propios } = agruparCambiosDePack(personalizados);
        expect(grupos).toHaveLength(0);
        expect(propios.map(c => c.nombre)).toEqual(['Marianela']);
    });

    it('sin personalizados no revienta', () => {
        expect(agruparCambiosDePack([])).toEqual({ grupos: [], propios: [] });
        expect(agruparCambiosDePack(null)).toEqual({ grupos: [], propios: [] });
    });
});
