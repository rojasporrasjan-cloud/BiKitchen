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

describe('una variedad no es una preparación', () => {
    /**
     * Los frijoles del casadito se estaban sumando al renglón de los frijoles
     * blancos, porque "Frijoles" cabe dentro de "Frijoles blancos guisados". La
     * hoja pedía 101 tazas donde hacían falta 33 — 68 tazas de frijol blanco de
     * más, todas las semanas.
     *
     * Gina lo tiene claro: en su lista manda "frijoles blancos 30 tazas" y
     * "frijoles arreglado 10 tazas", por separado.
     */
    it('los frijoles del casadito NO son los frijoles blancos', () => {
        expect(esElMismoPlato('Frijoles', 'Frijoles blancos guisados')).toBe(false);
        expect(esElMismoPlato('Frijoles arreglados', 'Frijoles blancos guisados')).toBe(false);
    });

    it('el arroz blanco no es cualquier arroz', () => {
        expect(esElMismoPlato('Arroz', 'Arroz blanco')).toBe(false);
    });

    it('el ayote tierno no es el ayote a secas', () => {
        expect(esElMismoPlato('Ayote', 'Ayote tierno')).toBe(false);
    });

    // Lo que SÍ se tiene que seguir juntando: la forma de cocinarlo no cambia el plato
    it('una preparación sí junta: es la misma carne', () => {
        expect(esElMismoPlato('Carne mechada', 'Carne mechada en salsa criolla')).toBe(true);
        expect(esElMismoPlato('Albóndigas', 'Albóndigas de res artesanales')).toBe(true);
        expect(esElMismoPlato('Pollo a la toscana', 'Pollo a la toscana')).toBe(true);
    });

    it('dos variedades distintas tampoco se juntan entre sí', () => {
        expect(esElMismoPlato('Frijoles blancos', 'Frijoles negros')).toBe(false);
    });

    it('si las dos lo dicen, siguen siendo el mismo', () => {
        expect(esElMismoPlato('Frijoles blancos', 'Frijoles blancos guisados')).toBe(true);
    });

    it('ante la duda, separa: un renglón de más se junta, un plato mal fusionado se lo come alguien', () => {
        // "con olores" es sazón, no otro ingrediente, así que en rigor son la
        // misma olla. Pero distinguir sazón de ingrediente pide un diccionario
        // que no tenemos, y equivocarse separando cuesta un renglón mientras
        // que equivocarse juntando le cambia el plato a un cliente.
        expect(esElMismoPlato('Frijoles blancos', 'Frijoles blancos guisados con olores')).toBe(false);
    });
});

describe('el arroz del casadito queda aparte, no se va al del perejil', () => {
    /**
     * "Arroz" sale de partir el carbo del casadito, "Arroz, frijoles y maduros".
     * Se parece a "Arroz blanco" Y a "Arroz al perejil": que sean dos es lo que
     * dice que no se sabe cuál es, y por eso queda aparte.
     *
     * Al separar las variedades, "Arroz blanco" dejó de calzar y quedaba uno
     * solo — las 69 tazas del casadito se iban al arroz al perejil. La
     * ambigüedad se mide ANTES de filtrar la variedad.
     */
    const mapa = () => ({
        'arroz blanco|taza(s)':    { name: 'Arroz blanco', unit: 'taza(s)' },
        'arroz al perejil|taza(s)': { name: 'Arroz al perejil', unit: 'taza(s)' }
    });

    it('no lo mete en ninguno de los dos', () => {
        const r = buscarRenglonDelMismoPlato(mapa(), 'Arroz', 'taza(s)');
        expect(r.clave).toBeNull();
        expect(r.ambiguo).toHaveLength(2);
    });

    it('y avisa con cuáles calzaba, para que lo decida una persona', () => {
        const r = buscarRenglonDelMismoPlato(mapa(), 'Arroz', 'taza(s)');
        expect(r.ambiguo).toContain('Arroz blanco');
        expect(r.ambiguo).toContain('Arroz al perejil');
    });

    it('con un solo arroz de variedad distinta, tampoco se junta', () => {
        const r = buscarRenglonDelMismoPlato(
            { 'arroz blanco|taza(s)': { name: 'Arroz blanco', unit: 'taza(s)' } }, 'Arroz', 'taza(s)');
        expect(r.clave).toBeNull();
        expect(r.ambiguo).toHaveLength(0);
    });

    it('pero una preparación sí se junta cuando es la única', () => {
        const r = buscarRenglonDelMismoPlato(
            { 'carne mechada en salsa criolla|g': { name: 'Carne mechada en salsa criolla', unit: 'g' } },
            'Carne mechada', 'g');
        expect(r.clave).toBe('carne mechada en salsa criolla|g');
    });

    it('los frijoles del casadito no entran a los blancos', () => {
        const r = buscarRenglonDelMismoPlato(
            { 'frijoles blancos guisados|taza(s)': { name: 'Frijoles blancos guisados', unit: 'taza(s)' } },
            'Frijoles', 'taza(s)');
        expect(r.clave).toBeNull();
    });
});

describe('el conector dice si es el mismo plato o le ponen algo encima', () => {
    /**
     * Las palabras que agrega el nombre largo pueden decir DE QUÉ es el plato o
     * QUE LE PONEN. El conector es lo único que lo distingue:
     *
     *   "de" / "en"  -> de qué es, cómo se cocina   -> el mismo plato
     *   "y" / "con"  -> además lleva algo           -> otro plato
     *
     * Al cliente keto que pidió picadillo de vainica sola le caía zanahoria, y a
     * los ocho packs de zuchinnis salteados les caían hongos y cebolla.
     */
    it('"de" y "en" no cambian el plato', () => {
        expect(esElMismoPlato('Albóndigas', 'Albóndigas de res artesanales')).toBe(true);
        expect(esElMismoPlato('Carne mechada', 'Carne mechada en salsa criolla')).toBe(true);
        expect(esElMismoPlato('Pollo', 'Pollo en salsa de culantro')).toBe(true);
    });

    it('"y" agrega un ingrediente: es otro plato', () => {
        expect(esElMismoPlato('Picadillo de vainica', 'Picadillo vainica y zanahoria')).toBe(false);
    });

    it('"con" también', () => {
        expect(esElMismoPlato('Zuchinnis salteados', 'Zuchinnis salteados con hongos y cebollas carmelizadas')).toBe(false);
        expect(esElMismoPlato('Arroz', 'Arroz con maiz dulce')).toBe(false);
        expect(esElMismoPlato('Tomates asados', 'Tomates asados con cebollas caramelizadas')).toBe(false);
    });

    it('si los dos lo llevan, siguen siendo el mismo', () => {
        expect(esElMismoPlato('Zuchinnis con hongos', 'Zuchinnis salteados con hongos')).toBe(true);
    });

    it('lo que ya funcionaba no se movió', () => {
        expect(esElMismoPlato('Pollo al ajillo', 'Pollo teriyaki')).toBe(false);
        expect(esElMismoPlato('Sopa de albóndigas', 'Albóndigas')).toBe(false);
        expect(esElMismoPlato('Frijoles', 'Frijoles blancos guisados')).toBe(false);
    });
});
