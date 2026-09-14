/**
 * Los cambios escritos a mano tienen que llegar a la cocina.
 *
 * Todas las frases de acá salieron de la hoja real de Gina del lunes 14 de
 * setiembre de 2026.
 *
 * Sacar un cambio equivocado es PEOR que no sacarlo: al granel se le resta el
 * original y se le suma el sustituto, así que un error mueve comida de verdad.
 */

import { describe, it, expect } from 'vitest';
import { sustitucionesEscritas } from '../utils/sustitucionesEscritas';
import { listarSustituciones } from '../utils/productionHelpers';
import {
    sumarAGranel, aplicarSustitucionesAlGranel, limpiarGranelVacio,
    platoDelPackQueNombra
} from '../utils/granelKitchen';

const leer = (t) => sustitucionesEscritas(t).cambios;

describe('lo que SÍ se entiende', () => {

    it('el caso de José David: una pareja clara', () => {
        expect(leer('cambiar tilapia por pollo')).toEqual([
            { tipo: 'proteina', plato: null, de: 'tilapia', a: 'pollo', deTexto: true }
        ]);
    });

    it('las formas en que lo escribe Gina', () => {
        const frases = [
            'Cambiar la tilapia por fajitas de lomo de res en salsa',
            'cambiar los gallo pinto por omellete',
            'Cambiar chayotes salteados por vegetales mixtos',
            'Cambiar pollo salsa mostaza por pollo salsa criolla',
            'Cambiame la tilapia por favor, por fajitas de cerdo'
        ];
        frases.forEach(f => expect(leer(f).length).toBe(1));
    });

    it('quita el artículo del nombre', () => {
        expect(leer('Cambiar la tilapia por el pollo')[0])
            .toMatchObject({ de: 'tilapia', a: 'pollo' });
    });

    it('lee varios cambios separados por punto medio', () => {
        const c = leer('Cambiar tilapia por pollo · cambiar arroz por puré');
        expect(c).toHaveLength(2);
        expect(c[1]).toMatchObject({ de: 'arroz', a: 'puré' });
    });

    it('queda marcado como venido del texto', () => {
        // Quien lo aplique tiene que poder exigir que el original exista
        expect(leer('cambiar tilapia por pollo')[0].deTexto).toBe(true);
    });
});

describe('lo que NO se toca — es preferible no mover nada', () => {

    it('dos cosas por dos cosas: no hay forma de saber cuál va con cuál', () => {
        const r = sustitucionesEscritas(
            'Cambiar lentejas y pollo teriyaki por albondigas y el estofado');
        expect(r.cambios).toEqual([]);
        expect(r.ambiguos).toHaveLength(1);
    });

    it('una nota que no es un cambio', () => {
        ['No mariscos es alergica', 'sin cerdo', 'NO VAINICAS',
         'Entregar despues de las 11 am', 'Poner mitad de los carbohidratos'
        ].forEach(f => expect(leer(f)).toEqual([]));
    });

    it('un "cambiar" sin el "por" no alcanza', () => {
        expect(leer('Cambiar las albondigas')).toEqual([]);
    });

    it('texto vacío no rompe', () => {
        expect(leer('')).toEqual([]);
        expect(leer(null)).toEqual([]);
    });
});

describe('el cambio escrito LLEGA A LA OLLA', () => {

    // El menú del pack: uno de los platos es la tilapia
    const platos = [
        { proteina: { nombre: 'Filet de tilapia al ajillo' } },
        { proteina: { nombre: 'Carne mechada en salsa' } }
    ];

    const cocinar = (observaciones) => {
        const mapa = {};
        sumarAGranel(mapa, 'Filet de tilapia al ajillo', 1000, 'g');
        sumarAGranel(mapa, 'Carne mechada en salsa', 1000, 'g');
        aplicarSustitucionesAlGranel(mapa, {
            sustituciones: listarSustituciones({ observaciones, items: [{}] }),
            platos, porciones: 1, gramosPorPorcion: 200
        });
        limpiarGranelVacio(mapa);
        const salida = {};
        Object.values(mapa).forEach(r => { salida[r.name] = r.totalQty; });
        return salida;
    };

    it('el caso de José David: le resta a la tilapia y le suma al pollo', () => {
        const r = cocinar('Cambiar la tilapia por pollo al ajillo');
        expect(r['Filet de tilapia al ajillo']).toBe(800);
        expect(r['pollo al ajillo']).toBe(200);
    });

    it('"tilapia" se resuelve al nombre completo del menú', () => {
        // Gina escribe el nombre corto; restando el texto tal cual, la resta no
        // encontraría a quién restarle y quedaría solo la suma
        expect(platoDelPackQueNombra('tilapia', platos)).toBe('Filet de tilapia al ajillo');
    });

    it('una frase que no nombra ningún plato del pack NO mueve nada', () => {
        const r = cocinar('cambiar el postre por fruta');
        expect(r['Filet de tilapia al ajillo']).toBe(1000);
        expect(Object.keys(r)).toHaveLength(2);
    });

    it('una nota que no es un cambio no mueve nada', () => {
        const r = cocinar('No mariscos es alergica');
        expect(r['Filet de tilapia al ajillo']).toBe(1000);
    });

    it('si nombra VARIOS platos no se elige ninguno', () => {
        // En un pack con tres pollos, "cambiar el pollo" no dice cuál, y
        // restarle al que no es deja sin comida a quien sí lo pidió
        const tresPollos = [
            { proteina: { nombre: 'Pollo al ajillo' } },
            { proteina: { nombre: 'Pollo al pesto' } }
        ];
        expect(platoDelPackQueNombra('pollo', tresPollos)).toBeNull();
    });
});
