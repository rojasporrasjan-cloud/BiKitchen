import { describe, it, expect } from 'vitest';
import {
    filasDeTablaDeEmpaque, clientesQueNoCaben, filasPorPlato,
    tituloDeTablaDeEmpaque, COLUMNAS_DE_EMPAQUE
} from '../utils/tablasDeEmpaque';

/**
 * El molde de estas pruebas se sacó de la hoja de verdad: la tabla
 * "TANDA 1 — PACK BAJO EN CALORÍAS — LUN 14 (43 en la familia · aquí van 14
 * packs)" del 10 de setiembre de 2026, leída de la pantalla con los rowSpan ya
 * resueltos. Si el Excel arma esto mismo, las dos hojas dicen lo mismo.
 */

const plato = (numero, prote, veg, carbo, total) => ({
    numero,
    total,
    partes: [
        { nombre: prote, cantidad: 120 },
        { nombre: veg, cantidad: 1 },
        { nombre: carbo, cantidad: 0.5 }
    ]
});

describe('la tabla de los que van tal cual', () => {
    // Los tres primeros platos y los tres primeros clientes de la hoja real.
    const platos = [
        plato(1, 'Pollo en crema ligera de hongos', 'Chayotes salteados al ajillo', 'Arroz blanco', 14),
        plato(2, 'Carne de res en salsa criolla', 'Picadillo de ayote', 'Pastel de maduro', 14)
    ];
    const celdasPorFila = [
        { especificaciones: '', cliente: 'Laura Fiorela Villalobos Calvo (1), Alajuela, La Ceiba · LUN 14' },
        { especificaciones: '', cliente: 'Lynn Castro Salas (1), Heredia · LUN 14' },
        { especificaciones: '** ENTREGAR DESPUES DE LAS 11 AM.', cliente: 'Jose Francisco Poveda (1), San Francisco de Heredia · LUN 14' },
        { especificaciones: '** PROTEÍNA DE 200 g, no los 120 g normales', cliente: 'Ricardo Perez (1), La Garita, Alajuela · LUN 14' }
    ];

    const filas = filasDeTablaDeEmpaque({ platos, celdasPorFila });

    it('saca tres filas por plato', () => {
        expect(filas).toHaveLength(6);
    });

    it('el número de plato y el total se unen a lo alto', () => {
        expect(filas[0].plato).toBe('Plato 1');
        expect(filas[0].alto).toBe(3);
        expect(filas[0].platos).toBe('14');
        // Las dos de abajo vienen de la de arriba
        expect(filas[1].plato).toBeNull();
        expect(filas[2].plato).toBeNull();
        expect(filas[1].platos).toBeNull();
        expect(filas[1].alto).toBe(0);
    });

    it('la proteína, el vegetal y el carbo van en su renglón', () => {
        expect(filas.map(f => f.descripcion).slice(0, 3)).toEqual([
            'Pollo en crema ligera de hongos', 'Chayotes salteados al ajillo', 'Arroz blanco'
        ]);
        expect(filas.map(f => f.cantidad).slice(0, 3)).toEqual(['120', '1', '0.5']);
    });

    /**
     * Esta es LA regla que más confusión ha causado.
     *
     * La columna del cliente no tiene nada que ver con el plato de su fila: el
     * cliente 4 cae en el renglón 4, que es la proteína del plato 2. Leerla como
     * si fuera "el cliente de ese plato" me hizo reportar duplicados y clientes
     * faltantes que no existían.
     */
    it('los clientes van de corrido, sin relación con el plato de al lado', () => {
        expect(filas[0].cliente).toMatch(/^Laura Fiorela/);
        expect(filas[1].cliente).toMatch(/^Lynn Castro/);
        expect(filas[2].cliente).toMatch(/^Jose Francisco/);
        // Cuarto cliente, primer renglón del SEGUNDO plato
        expect(filas[3].cliente).toMatch(/^Ricardo Perez/);
        expect(filas[3].descripcion).toBe('Carne de res en salsa criolla');
    });

    it('los renglones sin cliente quedan en blanco, no en null', () => {
        expect(filas[4].cliente).toBe('');
        expect(filas[5].especificaciones).toBe('');
    });
});

describe('la tabla de un cambio compartido', () => {
    const platos = [
        { numero: 1, total: 4, partes: [{ nombre: 'Milanesa de pollo', cantidad: 120, resaltada: true }, { nombre: 'Mix', cantidad: 1 }] },
        { numero: 2, total: 4, partes: [{ nombre: 'Carne mechada', cantidad: 120 }, { nombre: 'Ensalada', cantidad: 1 }] }
    ];
    const celdasPorPlato = [
        { especificaciones: '** MILANESA DE POLLO en vez de Fajitas de cerdo', cliente: 'Ana (1)\nBeto (2)\nCarla (1)' },
        { especificaciones: '', cliente: '' }
    ];

    const filas = filasDeTablaDeEmpaque({ platos, celdasPorPlato });

    it('el cliente y la especificación se unen a lo alto del plato', () => {
        expect(filas[0].cliente).toBe('Ana (1)\nBeto (2)\nCarla (1)');
        expect(filas[1].cliente).toBeNull();   // unida a la de arriba
    });

    it('marca la parte que cambió, para poder resaltarla', () => {
        expect(filas[0].resaltada).toBe(true);
        expect(filas[1].resaltada).toBe(false);
    });
});

describe('clientes que no caben', () => {
    const clientes = Array.from({ length: 14 }, (_, i) => `cliente ${i + 1}`);

    it('con 5 platos de 3 filas caben 15: no sobra nadie', () => {
        expect(clientesQueNoCaben(clientes, 5, 3)).toEqual([]);
    });

    /**
     * Un cliente que no aparece en la hoja es una bolsa que no se arma. Con 4
     * platos de 3 filas caben 12 y estos 14 dejaban 2 afuera, sin aviso.
     */
    it('con 4 platos de 3 filas sobran los dos últimos', () => {
        expect(clientesQueNoCaben(clientes, 4, 3)).toEqual(['cliente 13', 'cliente 14']);
    });

    it('los sobrantes salen al final con guion', () => {
        const filas = filasDeTablaDeEmpaque({
            platos: [{ numero: 1, total: 1, partes: [{ nombre: 'Pollo', cantidad: 120 }] }],
            celdasPorFila: [{ cliente: 'Ana' }],
            sobrantes: [{ cliente: 'Zoila', especificaciones: '** llega tarde' }]
        });
        expect(filas).toHaveLength(2);
        expect(filas[1].descripcion).toBe('—');
        expect(filas[1].cliente).toBe('Zoila');
        expect(filas[1].especificaciones).toBe('** llega tarde');
    });
});

describe('filasPorPlato', () => {
    it('siempre la proteína', () => {
        expect(filasPorPlato(false, false)).toBe(1);
    });
    it('el deluxe no lleva vegetales; el sin carbos no lleva harina', () => {
        expect(filasPorPlato(false, true)).toBe(2);
        expect(filasPorPlato(true, false)).toBe(2);
        expect(filasPorPlato(true, true)).toBe(3);
    });
});

describe('el título de la barra amarilla', () => {
    it('dice lo mismo que la pantalla', () => {
        expect(tituloDeTablaDeEmpaque({
            tanda: 1, familia: 'Pack Bajo en Calorías', dia: 'LUN 14',
            packs: 14, enLaFamilia: 43
        })).toBe('TANDA 1  —  PACK BAJO EN CALORÍAS  —  LUN 14 (43 EN LA FAMILIA · AQUÍ VAN 14 PACKS)');
    });

    it('cuando la tabla es toda la familia, no repite el número', () => {
        expect(tituloDeTablaDeEmpaque({
            tanda: 2, familia: 'Pack Sin Carbos', dia: 'LUN 14', packs: 4, enLaFamilia: 4
        })).toBe('TANDA 2  —  PACK SIN CARBOS  —  LUN 14 (4 PACKS)');
    });

    it('un solo pack va en singular', () => {
        expect(tituloDeTablaDeEmpaque({ tanda: 5, familia: 'Full Pack', packs: 1 }))
            .toContain('(1 PACK)');
    });

    it('la variante va entre la familia y el día', () => {
        expect(tituloDeTablaDeEmpaque({
            tanda: 1, familia: 'Pack Bajo en Calorías', variante: 'CON CAMBIO',
            dia: 'LUN 14', packs: 8, enLaFamilia: 43
        })).toBe('TANDA 1  —  PACK BAJO EN CALORÍAS  —  CON CAMBIO  —  LUN 14 (43 EN LA FAMILIA · AQUÍ VAN 8 PACKS)');
    });
});

describe('las columnas', () => {
    it('son las mismas seis de la pantalla, en orden', () => {
        expect(COLUMNAS_DE_EMPAQUE).toEqual([
            '# de Plato', 'Descripcion', 'Cantidad', 'Platos', 'Especificaciones', 'Cliente'
        ]);
    });
});
