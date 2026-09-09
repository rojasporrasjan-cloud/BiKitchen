import { describe, it, expect } from 'vitest';
import {
    rutaDelMenu, platoLimpio, revisarMenuEditado, cambiosDelMenu, platosParaEditar, cambioDeUnPlato
} from '../utils/guardarMenuDeLaHoja';

/**
 * Los datos son los reales del 8 de setiembre de 2026: el Sin Carbos habia
 * quedado con las proteinas del pack vegetariano y las cenas con el menu de la
 * semana anterior.
 */

const MENUS = {
    sinCarbos: [
        { numero: 1, proteina: 'Carne de soya crema ligera de hongos', vegetal: 'Chayotes salteados al ajillo', carbo: 'Arroz blanco' },
        { numero: 2, proteina: 'Carne de soya en salsa criolla', vegetal: 'Picadillo de ayote', carbo: 'Pastel de maduro' }
    ],
    cena: {
        regular: [
            { numero: 1, proteina: 'Carne mechada en salsa criolla', vegetal: 'Picadillo mixto', carbo: 'Papas en gajos' }
        ]
    }
};

describe('donde vive cada menu', () => {
    it('el almuerzo va arriba', () => {
        expect(rutaDelMenu('sinCarbos')).toBe('sinCarbos');
    });

    it('la cena va anidada', () => {
        expect(rutaDelMenu('regular', true)).toBe('cena.regular');
    });

    it('sin familia no hay ruta', () => {
        expect(rutaDelMenu('')).toBe(null);
        expect(rutaDelMenu(null, true)).toBe(null);
    });
});

describe('un plato listo para guardar', () => {
    it('se limpia y conserva su numero', () => {
        expect(platoLimpio({ numero: 3, proteina: '  Pollo al pesto ', vegetal: 'Mix', carbo: ' Arroz ' }, 0))
            .toEqual({ numero: 3, proteina: 'Pollo al pesto', vegetal: 'Mix', carbo: 'Arroz' });
    });

    it('sin numero toma su posicion', () => {
        expect(platoLimpio({ proteina: 'X' }, 4).numero).toBe(5);
    });
});

describe('no dejar guardar un menu roto', () => {
    it('un plato sin proteina no es un plato, y dice cual', () => {
        const r = revisarMenuEditado([{ proteina: 'Pollo' }, { proteina: '' }, { proteina: '  ' }]);
        expect(r.sePuede).toBe(false);
        expect(r.problema).toMatch(/platos 2, 3/);
    });

    it('con uno solo lo dice en singular', () => {
        expect(revisarMenuEditado([{ proteina: '' }]).problema).toMatch(/^Al plato 1/);
    });

    it('completo se puede guardar', () => {
        expect(revisarMenuEditado([{ proteina: 'Pollo al pesto' }]))
            .toEqual({ sePuede: true, problema: null });
    });
});

describe('el cambio que se guarda', () => {
    it('arregla el Sin Carbos que tenia soya', () => {
        const c = cambiosDelMenu({
            familia: 'sinCarbos',
            platos: [
                { numero: 1, proteina: 'Pollo en crema ligera de hongos', vegetal: 'Chayotes salteados al ajillo', carbo: 'Arroz blanco' },
                { numero: 2, proteina: 'Carne de res en salsa criolla', vegetal: 'Picadillo de ayote', carbo: 'Pastel de maduro' }
            ],
            menus: MENUS
        });
        expect(c.sinCarbos[0].proteina).toBe('Pollo en crema ligera de hongos');
        expect(c.sinCarbos[1].proteina).toBe('Carne de res en salsa criolla');
    });

    it('la cena se guarda en su ruta anidada', () => {
        const c = cambiosDelMenu({
            familia: 'regular', esCena: true,
            platos: [{ numero: 1, proteina: 'Fajitas mixtas encebolladas', vegetal: 'Picadillo mixto', carbo: 'Arroz y frijoles' }],
            menus: MENUS
        });
        expect(c['cena.regular'][0].proteina).toBe('Fajitas mixtas encebolladas');
        expect(c.regular).toBeUndefined();
    });

    it('marca el menu como tocado, para que nadie sirva el viejo de cache', () => {
        const c = cambiosDelMenu({
            familia: 'sinCarbos',
            platos: [{ proteina: 'Otra cosa' }],
            menus: MENUS
        });
        expect(c['meta.invalidateCache']).toBe(true);
        expect(typeof c['meta.lastModifiedTimestamp']).toBe('number');
    });

    it('sin cambios devuelve null, para no gastar una escritura', () => {
        const c = cambiosDelMenu({
            familia: 'sinCarbos',
            platos: platosParaEditar(MENUS, 'sinCarbos'),
            menus: MENUS
        });
        expect(c).toBe(null);
    });
});

describe('leer los platos para el editor', () => {
    it('los trae como texto plano', () => {
        expect(platosParaEditar(MENUS, 'sinCarbos')[0]).toEqual({
            numero: 1,
            proteina: 'Carne de soya crema ligera de hongos',
            vegetal: 'Chayotes salteados al ajillo',
            carbo: 'Arroz blanco'
        });
    });

    it('tambien si vienen como objeto con nombre', () => {
        const conObjeto = { regular: [{ numero: 1, proteina: { nombre: 'Pollo' }, vegetal: { nombre: 'Mix' }, carbo: { nombre: 'Arroz' } }] };
        expect(platosParaEditar(conObjeto, 'regular')[0].proteina).toBe('Pollo');
    });

    it('una familia que no existe da lista vacia', () => {
        expect(platosParaEditar(MENUS, 'noExiste')).toEqual([]);
        expect(platosParaEditar(null, 'sinCarbos')).toEqual([]);
    });
});

describe('editar UNA celda de la tabla', () => {
    it('cambia solo esa proteina y deja las otras', () => {
        const c = cambioDeUnPlato({
            familia: 'sinCarbos', numeroPlato: 1, campo: 'proteina',
            valor: 'Pollo en crema ligera de hongos', menus: MENUS
        });
        expect(c.sinCarbos[0].proteina).toBe('Pollo en crema ligera de hongos');
        expect(c.sinCarbos[0].vegetal).toBe('Chayotes salteados al ajillo');
        expect(c.sinCarbos[1].proteina).toBe('Carne de soya en salsa criolla');
    });

    it('tambien sirve para el vegetal y el carbo', () => {
        const v = cambioDeUnPlato({ familia: 'sinCarbos', numeroPlato: 2, campo: 'vegetal', valor: 'Brocoli', menus: MENUS });
        expect(v.sinCarbos[1].vegetal).toBe('Brocoli');
        const k = cambioDeUnPlato({ familia: 'sinCarbos', numeroPlato: 2, campo: 'carbo', valor: '', menus: MENUS });
        expect(k.sinCarbos[1].carbo).toBe('');
    });

    it('en la cena escribe en la ruta anidada', () => {
        const c = cambioDeUnPlato({
            familia: 'regular', esCena: true, numeroPlato: 1, campo: 'proteina',
            valor: 'Fajitas mixtas encebolladas', menus: MENUS
        });
        expect(c['cena.regular'][0].proteina).toBe('Fajitas mixtas encebolladas');
    });

    it('un plato o un campo que no existe no devuelve cambio', () => {
        expect(cambioDeUnPlato({ familia: 'sinCarbos', numeroPlato: 99, campo: 'proteina', valor: 'x', menus: MENUS })).toBe(null);
        expect(cambioDeUnPlato({ familia: 'sinCarbos', numeroPlato: 1, campo: 'precio', valor: 'x', menus: MENUS })).toBe(null);
        expect(cambioDeUnPlato({ familia: 'noExiste', numeroPlato: 1, campo: 'proteina', valor: 'x', menus: MENUS })).toBe(null);
    });

    it('escribir lo mismo no gasta una escritura', () => {
        expect(cambioDeUnPlato({
            familia: 'sinCarbos', numeroPlato: 1, campo: 'proteina',
            valor: 'Carne de soya crema ligera de hongos', menus: MENUS
        })).toBe(null);
    });
});
