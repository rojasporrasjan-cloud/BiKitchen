/**
 * Marianela Alfaro lleva un Two Pack Full Pack mensual, pero su envase NO se
 * arma como el de los demás: pidió 3 vegetales y 1 carbo, cuando el Full Pack
 * estándar es 3 carbos y 2 vegetales.
 *
 * Son cuatro sábados seguidos. Si esa línea no llega a la hoja de empaque, se
 * le arman 40 envases mal.
 */

import { describe, it, expect } from 'vitest';
import { notaParaEmpaque } from '../utils/productionHelpers';
import { mapPackNameToMenuKey, porcionesDelPack } from '../utils/packClassification';
import { detectIsTwoPack } from '../utils/logisticsUtils';

const PLAN = 'Two Pack Full Pack Mensual';
const OBS = 'ARMAR DISTINTO: 3 vegetales y 1 carbo por plato, en vez de los 3 carbos '
    + 'y 2 vegetales del Full Pack. Proteina 150 g.'
    + ' · TWO PACK = 2 packs del mismo menu.'
    + ' · INTERNO: menu personalizado, son los mismos platos del menu de la semana;'
    + ' lo que cambia es como se arma el envase. Cliente nueva, primera entrega 5 set.';

describe('El pedido de Marianela se clasifica bien', () => {
    it('es un Full Pack, no un "regular"', () => {
        // "full pack" gana sobre "two pack" en mapPackNameToMenuKey, y por eso
        // le tocan los platos del Full Pack de la semana.
        expect(mapPackNameToMenuKey(PLAN)).toBe('fullPack');
        expect(porcionesDelPack(PLAN).proteina).toBe(150);
    });

    it('cuenta como Two Pack, así que vale por 2 packs', () => {
        expect(detectIsTwoPack({ plan: PLAN })).toBe(true);
    });
});

describe('Lo que ve quien empaca', () => {
    const nota = notaParaEmpaque(OBS);

    it('le llega cómo armar el envase', () => {
        expect(nota).toMatch(/3 vegetales y 1 carbo/i);
        expect(nota).toMatch(/en vez de los 3 carbos y 2 vegetales/i);
    });

    it('le llega el gramaje de la proteína', () => {
        expect(nota).toMatch(/Proteina 150 g/i);
    });

    it('NO le llega lo que la hoja ya imprime en otro lado', () => {
        // La etiqueta "TWO PACK — empacar 2 packs iguales" ya lo dice.
        expect(nota).not.toMatch(/2 packs del mismo menu/i);
    });

    it('NO le llegan los apuntes de oficina', () => {
        expect(nota).not.toMatch(/cliente nueva/i);
        expect(nota).not.toMatch(/INTERNO/i);
    });
});

/**
 * Un pack con personalización tiene que salir en el bloque de PERSONALIZADOS,
 * no perdido en la tabla de todos. Hasta ahora eso solo pasaba con un cambio de
 * plato ("cambiar X por Y"); lo de Marianela es cómo se arma el envase.
 */
import {
    leerComposicion, composicionDelCatalogo,
    leerCambioDePack, separarPersonalizadosDePack
} from '../utils/desayunosPersonalizados';

const FULL_PACK = [
    { numero: 1, proteina: { nombre: 'Pollo a la toscana' }, vegetal: { nombre: 'Vegetales mixtos' }, carbo: { nombre: 'Arroz integral' } },
    { numero: 2, proteina: { nombre: 'Lomo en salsa gravy' }, vegetal: { nombre: 'Crema de vegetales' }, carbo: { nombre: 'Puré de papa' } },
    { numero: 3, proteina: { nombre: 'Filet de tilapia' }, vegetal: { nombre: 'Tomates asados' }, carbo: { nombre: 'Papitas a la parmesana' } },
    { numero: 4, proteina: { nombre: 'Albóndigas de res' }, vegetal: { nombre: 'Picadillo de chayote' }, carbo: { nombre: 'Arroz blanco' } },
    { numero: 5, proteina: { nombre: 'Fajitas de cerdo' }, vegetal: { nombre: 'Mix de vegetales' }, carbo: { nombre: 'Yuca al ajillo' } }
];

describe('Leer cómo se arma un envase', () => {
    it('saca las cifras de la descripción del catálogo', () => {
        expect(composicionDelCatalogo('Two Pack Full Pack Mensual'))
            .toEqual({ proteina: 150, vegetal: 2, carbo: 3 });
    });

    it('saca las cifras de lo que pidió el cliente', () => {
        expect(leerComposicion('3 vegetales y 1 carbo')).toEqual({ vegetal: 3, carbo: 1 });
        expect(leerComposicion('150 g de proteina, 3 vegetales, 1 carbo'))
            .toEqual({ proteina: 150, vegetal: 3, carbo: 1 });
    });

    it('una cifra suelta no describe un envase', () => {
        // "2 vegetales" en medio de una nota puede ser cualquier apunte.
        expect(leerComposicion('agregarle 2 vegetales extra')).toBeNull();
        expect(leerComposicion('')).toBeNull();
    });
});

describe('Marianela sale como personalizada', () => {
    it('la detecta aunque no cambie ningún plato', () => {
        const cambio = leerCambioDePack(OBS, FULL_PACK, PLAN);
        expect(cambio).not.toBeNull();
        expect(cambio.toca).toEqual([]);          // sus platos son los del menú
        expect(cambio.composicion).toEqual({ vegetal: 3, carbo: 1 });
    });

    it('la frase dice qué cambia y contra qué', () => {
        const { texto } = leerCambioDePack(OBS, FULL_PACK, PLAN);
        expect(texto).toBe('3 vegetales, 1 carbo por plato, en vez de 2 vegetales, 3 carbos');
        // La proteína no cambió: nombrarla la haría parecer parte del cambio.
        expect(texto).not.toMatch(/proteina/i);
    });

    it('queda en el bloque de personalizados, no en la tabla de todos', () => {
        const { estandar, personalizados } = separarPersonalizadosDePack(
            [{ nombre: 'Marianela Alfaro Morea', observaciones: OBS, cantidad: 1 },
             { nombre: 'Otro Cliente', observaciones: '', cantidad: 1 }],
            FULL_PACK, PLAN);

        expect(personalizados).toHaveLength(1);
        expect(personalizados[0].nombre).toBe('Marianela Alfaro Morea');
        expect(personalizados[0].platos).toHaveLength(5);
        expect(estandar.map(c => c.nombre)).toEqual(['Otro Cliente']);
    });
});

describe('Lo que NO debe salir como personalizado', () => {
    it('repetir la composición del pack no es personalizar', () => {
        // Es la descripción del Full Pack escrita de nuevo, no un cambio.
        const cambio = leerCambioDePack(
            '150g proteína + 3 carbos + 2 vegetales', FULL_PACK, PLAN);
        expect(cambio).toBeNull();
    });

    it('sin nombre de pack no se inventa una comparación', () => {
        expect(leerCambioDePack('3 vegetales y 1 carbo', FULL_PACK, '')).toBeNull();
    });

    it('una nota corriente sigue siendo estándar', () => {
        expect(leerCambioDePack('NO CERDO. Sin chile dulce.', FULL_PACK, PLAN)).toBeNull();
    });
});

describe('La etiqueta "menú personalizado" ya no se traga la instrucción', () => {
    it('bota la etiqueta sola, que el nombre del pack ya dice', () => {
        expect(notaParaEmpaque('MENÚ PERSONALIZADO')).toBe('');
    });

    it('pero deja pasar lo que viene adentro', () => {
        expect(notaParaEmpaque('MENU PERSONALIZADO: no chile dulce'))
            .toMatch(/no chile dulce/i);
    });
});

describe('La etiqueta con el nombre de la familia sí sigue siendo basura', () => {
    it('bota la familia que el nombre del pack ya dice', () => {
        expect(notaParaEmpaque('NO CHILE DULCE · Menú personalizado, sin carbohidratos'))
            .toBe('NO CHILE DULCE');
        expect(notaParaEmpaque('Menu personalizado bajo en calorias')).toBe('');
        expect(notaParaEmpaque('Menú personalizado: keto')).toBe('');
    });

    it('pero una instrucción de verdad detrás de la etiqueta pasa', () => {
        expect(notaParaEmpaque('Menú personalizado, sin cebolla')).toMatch(/sin cebolla/i);
        expect(notaParaEmpaque('MENU PERSONALIZADO: cambiar el arroz por yuca'))
            .toMatch(/cambiar el arroz por yuca/i);
    });
});

/**
 * Jason Barrantes lleva 100 g de proteína y 1 vegetal —igual que el Pack
 * Regular— y lo único distinto es que pidió 1 carbo en vez de 2. Si la frase
 * nombra las tres partes, quien empaca tiene que comparar dos listas casi
 * iguales para dar con la única que importa.
 */
describe('la frase nombra solo lo que cambia', () => {
    const PLAN_JASON = 'Personalizado Pack Regular — Jason Barrantes';
    const OBS_JASON = 'PORCIONES PERSONALIZADAS: 100 g de proteina, 1 taza de carbos, 1 vegetal.';

    it('el Pack Regular del catálogo son 100 g, 1 vegetal y 2 carbos', () => {
        expect(composicionDelCatalogo(PLAN_JASON))
            .toEqual({ proteina: 100, vegetal: 1, carbo: 2 });
    });

    it('solo sale el carbo, que es lo único distinto', () => {
        const { texto } = leerCambioDePack(OBS_JASON, FULL_PACK, PLAN_JASON);
        expect(texto).toBe('1 carbo por plato, en vez de 2 carbos');
        expect(texto).not.toMatch(/proteina|vegetal/i);
    });

    it('cuando cambian dos partes, salen las dos', () => {
        const { texto } = leerCambioDePack(OBS, FULL_PACK, PLAN);
        expect(texto).toBe('3 vegetales, 1 carbo por plato, en vez de 2 vegetales, 3 carbos');
    });
});

/**
 * La hoja titula el grupo "PACK BAJO EN CALORÍAS" y el catálogo lo llama
 * "Pack Bajo Calorías". Esa palabra de más rompía la comparación por nombre, y
 * Jason Barrantes salía como si comiera la porción estándar: sus 100 g quedaban
 * escondidos en una nota al lado de la fila, en vez de en su propio bloque.
 */
describe('el nombre del grupo no tiene que calzar letra por letra', () => {
    it('reconoce la familia aunque el título diga "BAJO EN CALORÍAS"', () => {
        expect(composicionDelCatalogo('PACK BAJO EN CALORÍAS'))
            .toEqual({ proteina: 120, vegetal: 2, carbo: 1 });
        expect(composicionDelCatalogo('Pack Bajo Calorías Almuerzo y Cena'))
            .toEqual({ proteina: 120, vegetal: 2, carbo: 1 });
    });

    it('Jason sale separado, con lo suyo', () => {
        const OBS_J = 'PORCIONES PERSONALIZADAS: 100 g de proteina, 1 taza de carbos, 1 vegetal.';
        const { texto } = leerCambioDePack(OBS_J, FULL_PACK, 'PACK BAJO EN CALORÍAS');
        expect(texto).toBe('100 g de proteina, 1 vegetal por plato, en vez de 120 g de proteina, 2 vegetales');
    });

    it('las otras familias siguen calzando', () => {
        expect(composicionDelCatalogo('FULL PACK')).toEqual({ proteina: 150, vegetal: 2, carbo: 3 });
        expect(composicionDelCatalogo('Two Pack Full Pack Mensual')).toEqual({ proteina: 150, vegetal: 2, carbo: 3 });
        expect(composicionDelCatalogo('PACK KETO')).toEqual({ proteina: 200, vegetal: 3 });
    });
});
