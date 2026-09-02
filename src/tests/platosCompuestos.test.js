/**
 * Los dos arreglos que pidió Gina sobre la hoja del 29 de agosto:
 *
 *   · Toda la carne mechada es la misma olla, escrita de tres formas.
 *   · "Arroz, frijoles y maduros" son tres ollas en un renglón. Van 4 tazas de
 *     cada cosa, no 4 repartidas.
 */

import { describe, it, expect } from 'vitest';
import { nucleoDelPlato, separarComponentes, nombreParaAcumular } from '../utils/platosCompuestos';
import { destinosDeUnion } from '../utils/unionesDePlatos';

describe('nucleoDelPlato', () => {

    it('toda la carne mechada cae en el mismo nombre', () => {
        const mechadas = [
            'Carne mechada de res en salsa',
            'Carne mechada en salsa',
            'Carne mechada en salsa criolla',
            'Carne mechada'
        ];
        mechadas.forEach(n => expect(nucleoDelPlato(n)).toBe('Carne mechada'));
    });

    it('las tildes y las mayúsculas dan igual', () => {
        expect(nucleoDelPlato('CARNE MECHADA DE RES')).toBe('Carne mechada');
    });

    it('no agarra un plato que solo se parece', () => {
        expect(nucleoDelPlato('Carne molida arreglada en salsa')).toBeNull();
        expect(nucleoDelPlato('Estofado de carne de res')).toBeNull();
        expect(nucleoDelPlato('Pollo al ajillo')).toBeNull();
    });

    it('tiene que empezar con el núcleo, no contenerlo', () => {
        expect(nucleoDelPlato('Sopa de carne mechada')).toBeNull();
    });

    it('un nombre vacío no calza', () => {
        expect(nucleoDelPlato('')).toBeNull();
        expect(nucleoDelPlato(null)).toBeNull();
    });
});

describe('separarComponentes', () => {

    it('parte la lista en sus preparaciones', () => {
        expect(separarComponentes('Arroz, frijoles y maduros'))
            .toEqual(['Arroz', 'Frijoles', 'Maduros']);
    });

    it('NO parte una descripción que lleva "y" sin coma', () => {
        // Es un plato solo: partirlo lo destruye
        expect(separarComponentes('Canelones rellenos con queso y envueltos en huevo'))
            .toEqual(['Canelones rellenos con queso y envueltos en huevo']);
        expect(separarComponentes('Zuchinnis salteados con hongos y cebollas caramelizadas'))
            .toEqual(['Zuchinnis salteados con hongos y cebollas caramelizadas']);
    });

    it('NO parte cuando alguna parte es larga', () => {
        // Con coma, pero no es una lista de ingredientes
        const nombre = 'Albóndigas de res artesanales, en salsa de tomate rostizado';
        expect(separarComponentes(nombre)).toEqual([nombre]);
    });

    it('un plato normal se queda como está', () => {
        expect(separarComponentes('Arroz blanco')).toEqual(['Arroz blanco']);
        expect(separarComponentes('Pollo al ajillo')).toEqual(['Pollo al ajillo']);
    });

    it('un nombre vacío no rompe nada', () => {
        expect(separarComponentes('')).toEqual(['']);
    });
});

describe('nombreParaAcumular', () => {

    it('el núcleo junta las carnes mechadas', () => {
        expect(nombreParaAcumular('Carne mechada en salsa criolla')).toBe('Carne mechada');
    });

    it('lo que marcó una persona manda sobre el núcleo', () => {
        // Si Gina decidió otra cosa, esa gana
        const destinos = destinosDeUnion([['Carne mechada especial', 'Carne mechada en salsa']]);
        expect(nombreParaAcumular('Carne mechada en salsa', destinos)).toBe('Carne mechada especial');
    });

    it('un plato sin núcleo ni unión se queda con su nombre', () => {
        expect(nombreParaAcumular('Arroz blanco')).toBe('Arroz blanco');
    });
});
