import { describe, it, expect } from 'vitest';
import { packSeParteEnAlmuerzoYCena } from '../utils/labels/labelDomain.js';
import { esPersonalizado, llevaFilaDeCarbo, mapPackNameToMenuKey, nombreDeHojaDeEmpaque } from '../utils/packClassification.js';

/**
 * A Fatima Arauz habia que reponerle las CENAS del menu del 25 al 31 de agosto,
 * la semana pasada. Los menus no guardan historial, asi que esos platos van
 * escritos en el propio pedido: es un PERSONALIZADO.
 *
 * El problema es que el nombre tiene que decir "Sin Carbos" para que la hoja
 * sepa que no lleva harina, y en cuanto lo dice, la hoja le busca el menu Sin
 * Carbos... de ESTA semana. Le habria puesto los platos equivocados.
 */
describe('un pack personalizado manda sobre el menu de la semana', () => {

    const nombreCenas = 'PERSONALIZADO — CENAS Sin Carbos Fátima Arauz (menú 25-31 ago) (120 g)';
    const nombreDesayunos = 'PERSONALIZADO — DESAYUNOS Fátima Arauz (menú 25-31 ago)';

    it('reconoce el pack personalizado por el nombre', () => {
        expect(esPersonalizado(nombreCenas)).toBe(true);
        expect(esPersonalizado(nombreDesayunos)).toBe(true);
        expect(esPersonalizado('  personalizado — sonia  ')).toBe(true);
    });

    it('no confunde un pack normal con uno personalizado', () => {
        expect(esPersonalizado('Pack Bajo Calorías')).toBe(false);
        expect(esPersonalizado('Pack de Desayunos')).toBe(false);
        expect(esPersonalizado('')).toBe(false);
    });

    it('el nombre igual clasifica el pack: sin carbos y desayunos', () => {
        // De esto depende que no le impriman harina y que los desayunos caigan
        // en la seccion de desayunos y no entre los individuales.
        expect(mapPackNameToMenuKey(nombreCenas)).toBe('sinCarbos');
        expect(mapPackNameToMenuKey(nombreDesayunos)).toBe('desayuno');
    });
});

describe('la fila de harina', () => {
    const conCarbo = [{ proteina: { nombre: 'Pollo' }, carbo: { nombre: 'Arroz blanco' } }];
    const sinCarbo = [
        { proteina: { nombre: 'Pollo al ajillo' }, carbo: { nombre: null } },
        { proteina: { nombre: 'Pollo al pesto' }, carbo: { nombre: '—' } }
    ];

    it('no se imprime en Keto ni en Sin Carbos', () => {
        expect(llevaFilaDeCarbo(conCarbo, 'keto')).toBe(false);
        expect(llevaFilaDeCarbo(conCarbo, 'sinCarbos')).toBe(false);
    });

    it('no se imprime si NINGUN plato trae harina', () => {
        expect(llevaFilaDeCarbo(sinCarbo, null)).toBe(false);
    });

    it('se imprime si al menos un plato la trae', () => {
        expect(llevaFilaDeCarbo([...sinCarbo, ...conCarbo], null)).toBe(true);
    });

    it('sin platos todavia, se asume que si — es lo de siempre', () => {
        expect(llevaFilaDeCarbo([], null)).toBe(true);
    });
});

describe('bajo que hoja se imprime cada pack', () => {

    it('un personalizado NO se junta con la hoja de su familia', () => {
        const nombre = 'PERSONALIZADO — CENAS Sin Carbos Fátima Arauz (menú 25-31 ago) (120 g)';
        expect(nombreDeHojaDeEmpaque(nombre, 'Pack Sin Carbos')).toBe(nombre);
    });

    it('los packs normales de una familia si se juntan', () => {
        expect(nombreDeHojaDeEmpaque('Pack 2 Semanas Bajo Calorías', 'Pack Bajo Calorías'))
            .toBe('Pack Bajo Calorías');
        expect(nombreDeHojaDeEmpaque('Pack Bajo Calorías Promo Almuerzo y Cena', 'Pack Bajo Calorías'))
            .toBe('Pack Bajo Calorías');
    });

    it('sin familia conocida, el pack se queda con su nombre', () => {
        expect(nombreDeHojaDeEmpaque('Pack Raro', null)).toBe('Pack Raro');
    });
});

describe('un personalizado no se parte en almuerzo y cena', () => {
    it('el pack de CENAS de Fátima no genera ademas una hoja de cenas', () => {
        // Sin esto salia DOS veces: una con sus cinco platos y otra con el menu
        // de cenas de ESTA semana. Diez cenas para quien lleva cinco.
        const nombre = 'PERSONALIZADO — CENAS Sin Carbos Fátima Arauz (menú 25-31 ago) (120 g)';
        expect(packSeParteEnAlmuerzoYCena(nombre, `${nombre} reposición cenas`)).toBe(false);
    });

    it('un pack normal que lleva cena si se parte', () => {
        expect(packSeParteEnAlmuerzoYCena(
            'Pack Bajo Calorías Promo Almuerzo y Cena',
            'pack bajo calorías promo almuerzo y cena'
        )).toBe(true);
    });

    it('un pack normal sin cena no se parte', () => {
        expect(packSeParteEnAlmuerzoYCena('Pack Bajo Calorías', 'pack bajo calorías')).toBe(false);
    });
});
