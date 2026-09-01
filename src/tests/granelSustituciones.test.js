import { describe, it, expect } from 'vitest';
import { sumarAGranel, aplicarSustitucionesAlGranel, limpiarGranelVacio } from '../utils/granelKitchen';

/**
 * La hoja arma el granel con el menu OFICIAL del pack. Si un cliente cambio un
 * plato, se cocina el ORIGINAL y del sustituto no sale nada: al empacar falta
 * justo la proteina que el cliente pidio.
 *
 * Caso real: Bryan Ocampo, pack Casaditos a 100 g, "sin res ni cerdo".
 */
const platosCasaditos = [
    { proteina: { nombre: 'Milanesa de pollo' } },
    { proteina: { nombre: 'Lomo fingido en salsa gravy' } },
    { proteina: { nombre: 'Fajitas de cerdo en salsa strogonoff' } },
    { proteina: { nombre: 'Lasagna de pollo' } },
    { proteina: { nombre: 'Pollo a la toscana' } }
];

const subsBryan = [
    { tipo: 'proteina', plato: 2, de: 'Lomo fingido en salsa gravy', a: 'Filet de pollo encebollado' },
    { tipo: 'proteina', plato: 3, de: 'Fajitas de cerdo en salsa strogonoff', a: 'Pollo al ajillo' }
];

/** Granel de 4 packs de casaditos a 100 g, antes de sustituciones. */
const granelBase = () => {
    const m = {};
    platosCasaditos.forEach(p => sumarAGranel(m, p.proteina.nombre, 400, 'g'));
    return m;
};
const gramos = (m, nombre) => m[`${nombre.toLowerCase()}|g`]?.totalQty;

describe('aplicarSustitucionesAlGranel', () => {

    it('mueve la porcion del plato original al sustituto', () => {
        const m = granelBase();
        aplicarSustitucionesAlGranel(m, {
            sustituciones: subsBryan, platos: platosCasaditos,
            porciones: 1, gramosPorPorcion: 100
        });
        expect(gramos(m, 'Lomo fingido en salsa gravy')).toBe(300);
        expect(gramos(m, 'Filet de pollo encebollado')).toBe(100);
        expect(gramos(m, 'Fajitas de cerdo en salsa strogonoff')).toBe(300);
        expect(gramos(m, 'Pollo al ajillo')).toBe(100);
    });

    it('no toca los platos que el cliente no cambio', () => {
        const m = granelBase();
        aplicarSustitucionesAlGranel(m, {
            sustituciones: subsBryan, platos: platosCasaditos,
            porciones: 1, gramosPorPorcion: 100
        });
        expect(gramos(m, 'Milanesa de pollo')).toBe(400);
        expect(gramos(m, 'Pollo a la toscana')).toBe(400);
    });

    it('multiplica por la cantidad de packs del cliente', () => {
        const m = granelBase();
        aplicarSustitucionesAlGranel(m, {
            sustituciones: [subsBryan[0]], platos: platosCasaditos,
            porciones: 2, gramosPorPorcion: 100
        });
        expect(gramos(m, 'Lomo fingido en salsa gravy')).toBe(200);
        expect(gramos(m, 'Filet de pollo encebollado')).toBe(200);
    });

    it('ignora cambios de vegetal y carbo: van en tazas y se anotan, no se calculan', () => {
        const m = granelBase();
        aplicarSustitucionesAlGranel(m, {
            sustituciones: [{ tipo: 'vegetal', plato: 1, de: 'Ensalada', a: 'Brocoli' }],
            platos: platosCasaditos, porciones: 1, gramosPorPorcion: 100
        });
        expect(gramos(m, 'Milanesa de pollo')).toBe(400);
        expect(gramos(m, 'Brocoli')).toBeUndefined();
    });

    it('un pedido sin sustituciones deja el granel igual', () => {
        const m = granelBase();
        const antes = JSON.stringify(m);
        aplicarSustitucionesAlGranel(m, { sustituciones: [], platos: platosCasaditos, porciones: 1, gramosPorPorcion: 100 });
        expect(JSON.stringify(m)).toBe(antes);
    });

    it('limpiarGranelVacio borra lo que quedo en cero', () => {
        const m = {};
        sumarAGranel(m, 'Lomo fingido en salsa gravy', 100, 'g');
        aplicarSustitucionesAlGranel(m, {
            sustituciones: [subsBryan[0]], platos: platosCasaditos,
            porciones: 1, gramosPorPorcion: 100
        });
        limpiarGranelVacio(m);
        expect(gramos(m, 'Lomo fingido en salsa gravy')).toBeUndefined();
        expect(gramos(m, 'Filet de pollo encebollado')).toBe(100);
    });
});
