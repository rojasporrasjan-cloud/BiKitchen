import { describe, it, expect } from 'vitest';
import {
    problemasDelMenu, packsConProteinaEquivocada, menuSinActualizar,
    esProteinaVegetariana, proteinasDe
} from '../utils/revisionDeMenus';

/**
 * Los datos son los DE VERDAD del 8 de setiembre de 2026, el dia que Gina tuvo
 * que rehacer la hoja a mano con su prima.
 *
 * La hoja tenia los pedidos perfectos y el menu equivocado, y nadie lo vio
 * hasta que la comida ya se estaba cocinando.
 */

const plato = (proteina, vegetal, carbo) => ({
    proteina: { nombre: proteina },
    vegetal: { nombre: vegetal },
    carbo: { nombre: carbo }
});

// Tal cual estaba guardado ese dia
const REGULAR = [
    plato('Pollo en crema ligera de hongos', 'Chayotes salteados al ajillo', 'Arroz blanco'),
    plato('Carne de res en salsa criolla', 'Picadillo de ayote', 'Pastel de maduro'),
    plato('Pollo al pesto', 'Zuchinnis salteados', 'Papitas salteadas'),
    plato('Trocitos de cerdo en salsa BBQ', 'Ensalada coleslaw', 'Pure de papa'),
    plato('Pollo en salsa mediterranea', 'Mix de vegetales', 'Arroz al cilantro')
];

const VEGETARIANO = [
    plato('Carne de soya crema ligera de hongos', 'Chayotes salteados al ajillo', 'Arroz blanco'),
    plato('Carne de soya en salsa criolla', 'Picadillo de ayote', 'Pastel de maduro'),
    plato('Carne de soya  al pesto', 'Zuchinnis salteados', 'Papitas salteadas'),
    plato('Carne de soya  en salsa BBQ', 'Ensalada coleslaw', 'Pure de papa'),
    plato('Carne de soya en salsa mediterranea', 'Mix de vegetales', 'Arroz al cilantro')
];

describe('reconocer una proteina vegetariana', () => {
    it('la soya lo es, escrita como sea', () => {
        expect(esProteinaVegetariana('Carne de soya al pesto')).toBe(true);
        expect(esProteinaVegetariana('Carne de soya  en salsa BBQ')).toBe(true);
        expect(esProteinaVegetariana('Tofu salteado')).toBe(true);
    });

    it('el pollo y la res no', () => {
        expect(esProteinaVegetariana('Pollo al pesto')).toBe(false);
        expect(esProteinaVegetariana('Carne de res en salsa criolla')).toBe(false);
        expect(esProteinaVegetariana('Trocitos de cerdo en salsa BBQ')).toBe(false);
    });

    it('saca las proteinas en orden', () => {
        expect(proteinasDe(REGULAR)[0]).toBe('Pollo en crema ligera de hongos');
        expect(proteinasDe([])).toEqual([]);
    });
});

describe('el pack que salio con el menu del vegetariano', () => {
    it('agarra el Sin Carbos del 8 de setiembre', () => {
        const avisos = packsConProteinaEquivocada({
            regular: REGULAR,
            sinCarbos: VEGETARIANO,   // <- el error de ese dia
            vegetariano: VEGETARIANO
        });
        expect(avisos).toHaveLength(1);
        expect(avisos[0].cliente).toMatch(/sinCarbos/);
        expect(avisos[0].gravedad).toBe('alta');
        expect(avisos[0].que).toMatch(/no es vegetariano/i);
    });

    it('el pack vegetariano de verdad NO se avisa', () => {
        expect(packsConProteinaEquivocada({
            regular: REGULAR,
            vegetariano: VEGETARIANO
        })).toEqual([]);
    });

    it('con los menus bien no dice nada', () => {
        expect(packsConProteinaEquivocada({
            regular: REGULAR, fullPack: REGULAR, bajoCalorias: REGULAR,
            vegetariano: VEGETARIANO
        })).toEqual([]);
    });

    it('un pack a medio llenar no cuenta como error', () => {
        expect(packsConProteinaEquivocada({ regular: [], keto: null })).toEqual([]);
    });

    it('con UNA proteina de carne ya no es el menu vegetariano copiado', () => {
        const mezcla = [...VEGETARIANO.slice(0, 4), plato('Pollo al pesto', 'Mix', 'Arroz')];
        expect(packsConProteinaEquivocada({ sinCarbos: mezcla })).toEqual([]);
    });
});

describe('el menu que quedo de la semana pasada', () => {
    const haceDosSemanas = new Date('2026-08-25T12:00:00').getTime();
    const anteayer = new Date('2026-09-06T12:00:00').getTime();

    it('avisa si no se toca desde hace mas de una semana', () => {
        const a = menuSinActualizar({ lastModifiedTimestamp: haceDosSemanas }, '2026-09-09');
        expect(a).toHaveLength(1);
        expect(a[0].que).toMatch(/semana pasada/i);
        expect(a[0].gravedad).toBe('alta');
    });

    it('un menu cargado esta semana no se avisa', () => {
        expect(menuSinActualizar({ lastModifiedTimestamp: anteayer }, '2026-09-09')).toEqual([]);
    });

    it('tambien lee la fecha en el formato de Firestore', () => {
        const a = menuSinActualizar(
            { lastModifiedAt: { seconds: Math.floor(haceDosSemanas / 1000) } },
            '2026-09-09'
        );
        expect(a).toHaveLength(1);
    });

    it('sin fecha de modificacion no inventa un aviso', () => {
        expect(menuSinActualizar({}, '2026-09-09')).toEqual([]);
        expect(menuSinActualizar(null, '2026-09-09')).toEqual([]);
        expect(menuSinActualizar({ lastModifiedTimestamp: haceDosSemanas }, null)).toEqual([]);
    });
});

describe('la revision completa del menu', () => {
    it('junta las dos cosas que fallaron ese dia', () => {
        const avisos = problemasDelMenu({
            fecha: '2026-09-09',
            menus: {
                regular: REGULAR,
                sinCarbos: VEGETARIANO,
                vegetariano: VEGETARIANO,
                meta: { lastModifiedTimestamp: new Date('2026-08-25T12:00:00').getTime() }
            }
        });
        expect(avisos).toHaveLength(2);
        expect(avisos.map(a => a.tipo).sort())
            .toEqual(['menu-viejo', 'proteina-vegetariana']);
    });

    it('sin menus cargados no revienta', () => {
        expect(problemasDelMenu()).toEqual([]);
        expect(problemasDelMenu({ menus: null, fecha: '2026-09-09' })).toEqual([]);
    });
});
