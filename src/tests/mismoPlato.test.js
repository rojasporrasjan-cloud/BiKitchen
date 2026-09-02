/**
 * El mismo plato escrito distinto tiene que cocinarse UNA vez.
 *
 * Caso real: "Albóndigas de res" venía del menú del pack y "Albóndigas de res
 * artesanales" de un individual. Como el acumulador se indexa por nombre exacto,
 * salían en dos renglones y la cocina las hacía dos veces.
 *
 * Pero juntar de más es peor que juntar de menos: si "Sopa de albóndigas" se
 * fusiona con "Albóndigas", alguien recibe sopa en vez de su plato.
 */

import { describe, it, expect } from 'vitest';
import {
    sumarAGranel,
    claveGranel,
    limpiarGranelVacio,
    aplicarSustitucionesAlGranel
} from '../utils/granelKitchen';
import {
    esElMismoPlato,
    palabrasClave,
    palabraPrincipal,
    buscarRenglonDelMismoPlato,
    nombreMasCompleto
} from '../utils/mismoPlato';

describe('esElMismoPlato', () => {

    it('junta el nombre corto con el largo', () => {
        expect(esElMismoPlato('Albóndigas de res', 'Albóndigas de res artesanales')).toBe(true);
        expect(esElMismoPlato('Albóndigas', 'Albóndigas de res artesanales')).toBe(true);
    });

    it('las tildes y las mayúsculas dan igual', () => {
        expect(esElMismoPlato('Albondigas de res', 'Albóndigas de res')).toBe(true);
        expect(esElMismoPlato('ALBÓNDIGAS DE RES', 'albondigas de res')).toBe(true);
    });

    it('las palabras de relleno no cuentan', () => {
        expect(esElMismoPlato('Albóndigas de res', 'Albóndigas res')).toBe(true);
        expect(palabrasClave('Albóndigas de res en salsa')).toEqual(['albondigas', 'res', 'salsa']);
    });

    it('NO junta dos platos distintos de la misma proteína', () => {
        // Ninguno contiene al otro
        expect(esElMismoPlato('Pollo al ajillo', 'Pollo teriyaki')).toBe(false);
        expect(esElMismoPlato('Filet de tilapia al ajillo', 'Filet de tilapia empanizado')).toBe(false);
        expect(esElMismoPlato('Cerdo en salsa de mostaza', 'Cerdo en salsa de curry')).toBe(false);
    });

    it('NO junta una sopa con el plato del mismo nombre', () => {
        // La palabra principal dice qué es: sopa no es albóndigas
        expect(esElMismoPlato('Sopa albóndigas', 'Albóndigas de res')).toBe(false);
        expect(esElMismoPlato('Crema de ayote', 'Ayote salteado')).toBe(false);
        expect(palabraPrincipal('Sopa albóndigas')).toBe('sopa');
    });

    it('un nombre vacío no calza con nada', () => {
        expect(esElMismoPlato('', 'Albóndigas')).toBe(false);
        expect(esElMismoPlato(null, undefined)).toBe(false);
    });
});

describe('buscarRenglonDelMismoPlato', () => {

    const mapa = () => ({
        'albóndigas de res|g': { name: 'Albóndigas de res', unit: 'g', totalQty: 1000 },
        'pollo al ajillo|g': { name: 'Pollo al ajillo', unit: 'g', totalQty: 500 },
        'pollo teriyaki|g': { name: 'Pollo teriyaki', unit: 'g', totalQty: 500 },
        'vegetales salteados|taza(s)': { name: 'Vegetales salteados', unit: 'taza(s)', totalQty: 12 }
    });

    it('encuentra el renglón que ya existe', () => {
        const { clave } = buscarRenglonDelMismoPlato(mapa(), 'Albóndigas de res artesanales', 'g');
        expect(clave).toBe('albóndigas de res|g');
    });

    it('no cruza unidades: gramos y tazas van aparte', () => {
        const { clave } = buscarRenglonDelMismoPlato(mapa(), 'Vegetales salteados', 'g');
        expect(clave).toBeNull();
    });

    it('si calza con varios NO adivina, avisa', () => {
        // "Pollo" cabe igual en "Pollo al ajillo" que en "Pollo teriyaki"
        const { clave, ambiguo } = buscarRenglonDelMismoPlato(mapa(), 'Pollo', 'g');
        expect(clave).toBeNull();
        expect(ambiguo.sort()).toEqual(['Pollo al ajillo', 'Pollo teriyaki']);
    });

    it('si no hay nada parecido, devuelve vacío sin avisar', () => {
        const { clave, ambiguo } = buscarRenglonDelMismoPlato(mapa(), 'Cerdo en salsa', 'g');
        expect(clave).toBeNull();
        expect(ambiguo).toEqual([]);
    });

    it('un acumulador vacío no rompe nada', () => {
        expect(buscarRenglonDelMismoPlato({}, 'Albóndigas', 'g').clave).toBeNull();
        expect(buscarRenglonDelMismoPlato(null, 'Albóndigas', 'g').clave).toBeNull();
    });
});

describe('nombreMasCompleto', () => {
    it('gana el que dice más de qué es el plato', () => {
        expect(nombreMasCompleto('Albóndigas', 'Albóndigas de res artesanales'))
            .toBe('Albóndigas de res artesanales');
        expect(nombreMasCompleto('Albóndigas de res artesanales', 'Albóndigas'))
            .toBe('Albóndigas de res artesanales');
    });
});

describe('el caso real: albóndigas cocinadas dos veces', () => {

    /**
     * Reproduce lo que hace la hoja: primero entra el plato del menú del pack,
     * después el del individual. Antes salían en dos renglones porque el
     * acumulador se indexa por nombre exacto.
     */
    const acumular = (mapa, nombre, cantidad, unidad) => {
        const { clave } = buscarRenglonDelMismoPlato(mapa, nombre, unidad);
        if (clave) {
            mapa[clave].totalQty += cantidad;
            mapa[clave].name = nombreMasCompleto(mapa[clave].name, nombre);
            return mapa;
        }
        return sumarAGranel(mapa, nombre, cantidad, unidad);
    };

    it('el pack y el individual salen en UN solo renglón', () => {
        const mapa = {};
        acumular(mapa, 'Albóndigas de res', 3000, 'g');          // del menú del pack
        acumular(mapa, 'Albóndigas de res artesanales', 500, 'g'); // del individual

        const renglones = Object.values(mapa);
        expect(renglones).toHaveLength(1);
        expect(renglones[0].totalQty).toBe(3500);
    });

    it('el renglón se queda con el nombre que más dice', () => {
        const mapa = {};
        acumular(mapa, 'Albóndigas', 3000, 'g');
        acumular(mapa, 'Albóndigas de res artesanales', 500, 'g');

        expect(Object.values(mapa)[0].name).toBe('Albóndigas de res artesanales');
    });

    it('no se lleva por delante un plato distinto de la misma proteína', () => {
        const mapa = {};
        acumular(mapa, 'Pollo al ajillo', 1000, 'g');
        acumular(mapa, 'Pollo teriyaki', 500, 'g');

        expect(Object.values(mapa)).toHaveLength(2);
    });

    it('la sopa de albóndigas sigue siendo otra cosa', () => {
        const mapa = {};
        acumular(mapa, 'Albóndigas de res', 3000, 'g');
        acumular(mapa, 'Sopa albóndigas', 2000, 'g');

        expect(Object.values(mapa)).toHaveLength(2);
    });

    it('gramos y tazas del mismo plato no se suman', () => {
        const mapa = {};
        acumular(mapa, 'Picadillo de papa', 195, 'g');
        acumular(mapa, 'Picadillo de papa', 12, 'taza(s)');

        expect(Object.values(mapa)).toHaveLength(2);
        expect(mapa[claveGranel('Picadillo de papa', 'g')].totalQty).toBe(195);
        expect(mapa[claveGranel('Picadillo de papa', 'taza(s)')].totalQty).toBe(12);
    });
});

describe('las sustituciones sobre un renglón fusionado', () => {

    /**
     * El mismo acumulador que usa la hoja: junta el plato con el renglón que ya
     * lo tiene, en vez de indexar por nombre exacto.
     */
    const hacerAcumulador = (mapa, avisos) => (nombre, cantidad, unidad) => {
        const encontrado = buscarRenglonDelMismoPlato(mapa, nombre, unidad);
        if (encontrado.ambiguo.length > 0) avisos.push(nombre);
        if (encontrado.clave) {
            mapa[encontrado.clave].totalQty += cantidad;
            mapa[encontrado.clave].name = nombreMasCompleto(mapa[encontrado.clave].name, nombre);
            return encontrado.clave;
        }
        sumarAGranel(mapa, nombre, cantidad, unidad);
        return claveGranel(nombre, unidad);
    };

    it('la resta cae en el renglón fusionado, no en uno fantasma', () => {
        // Sin pasar el acumulador, la resta buscaría "Milanesa de pollo
        // empanizada" por nombre exacto, no lo encontraría, crearía un renglón
        // en negativo y limpiarGranelVacio lo borraría: la resta se perdería y
        // el plato original quedaría con la porción de quien lo cambió.
        const mapa = {};
        const avisos = [];
        const acumular = hacerAcumulador(mapa, avisos);

        acumular('Milanesa de pollo', 1200, 'g');
        acumular('Milanesa de pollo empanizada', 600, 'g');
        expect(Object.values(mapa)).toHaveLength(1);
        expect(Object.values(mapa)[0].totalQty).toBe(1800);

        // Un cliente cambia su milanesa por carne mechada
        aplicarSustitucionesAlGranel(mapa, {
            sustituciones: [{ tipo: 'proteina', plato: 1, de: 'Milanesa de pollo', a: 'Carne mechada' }],
            platos: [{ proteina: { nombre: 'Milanesa de pollo empanizada' } }],
            porciones: 1,
            gramosPorPorcion: 150,
            acumular
        });
        limpiarGranelVacio(mapa);

        const milanesa = Object.values(mapa).find(i => /Milanesa/.test(i.name));
        const mechada = Object.values(mapa).find(i => /mechada/i.test(i.name));

        expect(milanesa.totalQty).toBe(1650);
        expect(mechada.totalQty).toBe(150);
        expect(Object.values(mapa)).toHaveLength(2);
    });

    it('sin acumulador propio se comporta como siempre', () => {
        // Los llamados que ya existían no cambian
        const mapa = {};
        sumarAGranel(mapa, 'Pollo al ajillo', 1000, 'g');

        aplicarSustitucionesAlGranel(mapa, {
            sustituciones: [{ tipo: 'proteina', plato: 1, de: 'Pollo al ajillo', a: 'Cerdo en salsa' }],
            platos: [{ proteina: { nombre: 'Pollo al ajillo' } }],
            porciones: 2,
            gramosPorPorcion: 100
        });

        expect(mapa[claveGranel('Pollo al ajillo', 'g')].totalQty).toBe(800);
        expect(mapa[claveGranel('Cerdo en salsa', 'g')].totalQty).toBe(200);
    });
});

describe('el mismo plato en dos menús distintos', () => {

    it('se suma en un renglón en vez de partirse', () => {
        // Lo que hacía que la milanesa saliera con una fracción del total
        const mapa = {};
        const acumular = (nombre, cantidad, unidad) => {
            const { clave } = buscarRenglonDelMismoPlato(mapa, nombre, unidad);
            if (clave) {
                mapa[clave].totalQty += cantidad;
                mapa[clave].name = nombreMasCompleto(mapa[clave].name, nombre);
                return;
            }
            sumarAGranel(mapa, nombre, cantidad, unidad);
        };

        acumular('Milanesa de pollo', 196, 'g');            // menú Regular
        acumular('Milanesa de pollo empanizada', 1400, 'g'); // menú Full Pack

        expect(Object.values(mapa)).toHaveLength(1);
        expect(Object.values(mapa)[0].totalQty).toBe(1596);
    });
});
