/**
 * Repartir la cocina por especialidad.
 *
 * El caso que más importa es el "Arroz con pollo": lleva pollo en el nombre pero
 * lo hace doña Carmen. Si se reparte por la primera palabra que calce, se lo
 * lleva Rosa y el día de cocina arranca mal.
 */

import { describe, it, expect } from 'vitest';
import { sugerirCocinera, repartirPlatillos, loQueSeCocina } from '../utils/asignacionCocineras';

const quien = (nombre, tipo) => sugerirCocinera(nombre, tipo).cocinera;

describe('sugerirCocinera', () => {

    it('el pollo es de Rosa', () => {
        expect(quien('Pollo caribeño')).toBe('ROSA');
        expect(quien('Pechuga a la plancha')).toBe('ROSA');
    });

    it('el cerdo y la res son de Fernanda', () => {
        expect(quien('Carne mechada criolla')).toBe('FERNANDA');
        expect(quien('Chicharrón de cerdo')).toBe('FERNANDA');
        expect(quien('Bistec encebollado')).toBe('FERNANDA');
        expect(quien('Albóndigas en salsa')).toBe('FERNANDA');
    });

    it('el arroz con pollo es de doña Carmen, no de Rosa', () => {
        // Lleva "pollo", pero es de ella. Esta es la regla que se rompe sola
        // si alguien reordena la lista.
        expect(quien('Arroz con pollo')).toBe('DOÑA CARMEN');
    });

    it('las sopas son de doña Carmen aunque lleven carne', () => {
        expect(quien('Sopa de pollo')).toBe('DOÑA CARMEN');
        expect(quien('Olla de carne')).toBe('DOÑA CARMEN');
    });

    it('el picadillo de papa es de doña Carmen, no de Osmany', () => {
        // "papa" es harina (Osmany), pero el picadillo lo hace ella
        expect(quien('Picadillo de papa')).toBe('DOÑA CARMEN');
        expect(quien('Picadillo de arracache')).toBe('DOÑA CARMEN');
    });

    it('un picadillo con atún sigue siendo picadillo', () => {
        // El pescado no tiene dueño fijo, pero la preparación manda: esto es un
        // picadillo, no un plato de pescado.
        expect(quien('Picadillo papa con atún')).toBe('DOÑA CARMEN');
    });

    it('un pescado con vegetales en el nombre sigue siendo pescado', () => {
        // "espinaca" es de Carmen, pero lo que se cocina es el filet
        expect(quien('Filet de tilapia en salsa espinaca')).toBeNull();
    });

    it('los vegetales son de doña Carmen', () => {
        expect(quien('Vegetales salteados')).toBe('DOÑA CARMEN');
        expect(quien('Ensalada fresca')).toBe('DOÑA CARMEN');
        expect(quien('Brócoli al vapor')).toBe('DOÑA CARMEN');
    });

    it('los purés y las harinas son de Osmany', () => {
        expect(quien('Puré de papa')).toBe('OSMANY');
        expect(quien('Pastel de yuca')).toBe('OSMANY');
        expect(quien('Arroz blanco')).toBe('OSMANY');
        expect(quien('Plátano maduro')).toBe('OSMANY');
        expect(quien('Frijoles molidos')).toBe('OSMANY');
    });

    it('manda la proteína, no la guarnición', () => {
        // Si los vegetales fueran antes, "zanahoria" se lo llevaría a Carmen
        expect(quien('Estofado de pollo con papa y zanahoria')).toBe('ROSA');
        expect(quien('Estofado de carne res con papa y zanahoria')).toBe('FERNANDA');
        expect(quien('Chorizo con papas')).toBe('FERNANDA');
    });

    it('un desayuno con jamón no es un plato de cerdo', () => {
        // El jamón es acompañamiento; no manda a la estación de Fernanda
        expect(quien('Omelet con queso y jamón')).not.toBe('FERNANDA');
        expect(quien('Huevos con jamón')).not.toBe('FERNANDA');
    });

    it('calza la palabra completa: "res" no agarra "fresas"', () => {
        expect(quien('Fresas con crema')).not.toBe('FERNANDA');
    });

    it('agarra el plural', () => {
        expect(quien('Picadillos varios')).toBe('DOÑA CARMEN');
        expect(quien('Purés surtidos')).toBe('OSMANY');
    });

    it('las tildes dan igual', () => {
        expect(quien('Brocoli al vapor')).toBe(quien('Brócoli al vapor'));
        expect(quien('Pure de papa')).toBe(quien('Puré de papa'));
    });

    it('en una sustitución manda lo que se va a cocinar', () => {
        // Lo que entra a la olla es la carne, no el pollo
        expect(quien('Pollo caribeño → Carne mechada')).toBe('FERNANDA');
        expect(loQueSeCocina('Pollo caribeño → Carne mechada')).toBe('Carne mechada');
    });

    it('el pescado se pregunta, no se adivina', () => {
        // Nadie lo tiene fijo: mejor en blanco que asignado al que no es
        const r = sugerirCocinera('Filete de tilapia');
        expect(r.cocinera).toBeNull();
        expect(r.motivo).toMatch(/Gina/);
    });

    it('si el nombre no dice nada, se cae al tipo de componente', () => {
        expect(quien('Guarnición del día', 'Vegetal')).toBe('DOÑA CARMEN');
        expect(quien('Guarnición del día', 'Harina')).toBe('OSMANY');
        // Una proteína sin nombre conocido no se adivina: puede ser de
        // cualquiera de las dos
        expect(quien('Especial del chef', 'Proteína')).toBeNull();
    });

    it('lo que calza por tipo queda marcado como inseguro', () => {
        expect(sugerirCocinera('Pollo caribeño').seguro).toBe(true);
        expect(sugerirCocinera('Guarnición del día', 'Vegetal').seguro).toBe(false);
    });

    it('un nombre vacío no rompe nada', () => {
        expect(sugerirCocinera('').cocinera).toBeNull();
        expect(sugerirCocinera(null).cocinera).toBeNull();
    });
});

describe('repartirPlatillos', () => {

    it('reparte los que están en blanco', () => {
        const { asignaciones, nuevas } = repartirPlatillos([
            { name: 'Pollo caribeño' },
            { name: 'Carne mechada' },
            { name: 'Puré de papa' }
        ]);

        expect(nuevas).toBe(3);
        expect(asignaciones).toEqual({
            'Pollo caribeño': 'ROSA',
            'Carne mechada': 'FERNANDA',
            'Puré de papa': 'OSMANY'
        });
    });

    it('NO pisa lo que ya se asignó a mano', () => {
        // Alguien lo decidió en la cocina; la máquina no lo corrige
        const { asignaciones, nuevas } = repartirPlatillos(
            [{ name: 'Pollo caribeño' }, { name: 'Carne mechada' }],
            { 'Pollo caribeño': 'FERNANDA' }
        );

        expect(asignaciones['Pollo caribeño']).toBeUndefined();
        expect(nuevas).toBe(1);
    });

    it('un espacio en blanco no cuenta como asignado', () => {
        const { nuevas } = repartirPlatillos([{ name: 'Pollo caribeño' }], { 'Pollo caribeño': '   ' });
        expect(nuevas).toBe(1);
    });

    it('reporta los que quedaron sin dueño', () => {
        const { sinAsignar } = repartirPlatillos([
            { name: 'Pollo caribeño' },
            { name: 'Filete de tilapia' }
        ]);

        expect(sinAsignar).toHaveLength(1);
        expect(sinAsignar[0].nombre).toBe('Filete de tilapia');
    });

    it('una lista vacía no rompe nada', () => {
        expect(repartirPlatillos([]).nuevas).toBe(0);
        expect(repartirPlatillos(null).nuevas).toBe(0);
    });
});
