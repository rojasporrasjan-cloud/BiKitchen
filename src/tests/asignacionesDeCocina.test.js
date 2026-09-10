import { describe, it, expect, beforeEach } from 'vitest';
import {
    leerAsignaciones, guardarAsignaciones, asignacionesVigentes,
    cuantasFaltan, olvidarAsignaciones
} from '../utils/asignacionesDeCocina';

/**
 * El reparto de estaciones vivia solo en memoria: se repartia, se cerraba la
 * pagina y se perdia. Volver el sabado a la hoja del lunes era repartir de cero
 * cuarenta platillos, o imprimir con "SIN ASIGNAR" en media hoja.
 */

beforeEach(() => localStorage.clear());

describe('guardar el reparto por fecha', () => {
    it('lo guardado se vuelve a leer', () => {
        guardarAsignaciones('2026-09-09', { 'Pollo al pesto': 'ROSA', 'Pure de papa': 'OSMANY' });
        expect(leerAsignaciones('2026-09-09')).toEqual({
            'Pollo al pesto': 'ROSA', 'Pure de papa': 'OSMANY'
        });
    });

    it('cada fecha lleva el suyo: el miercoles no pisa al sabado', () => {
        guardarAsignaciones('2026-09-09', { 'Pollo al pesto': 'ROSA' });
        guardarAsignaciones('2026-09-12', { 'Arroz blanco': 'OSMANY' });
        expect(leerAsignaciones('2026-09-09')).toEqual({ 'Pollo al pesto': 'ROSA' });
        expect(leerAsignaciones('2026-09-12')).toEqual({ 'Arroz blanco': 'OSMANY' });
    });

    it('el nombre se guarda en mayusculas y sin espacios de mas', () => {
        guardarAsignaciones('2026-09-09', { 'Pollo al pesto': '  rosa  ' });
        expect(leerAsignaciones('2026-09-09')).toEqual({ 'Pollo al pesto': 'ROSA' });
    });

    it('los platillos sin cocinera no se guardan', () => {
        guardarAsignaciones('2026-09-09', { 'Pollo al pesto': 'ROSA', 'Arroz blanco': '', 'Frijoles': '   ' });
        expect(leerAsignaciones('2026-09-09')).toEqual({ 'Pollo al pesto': 'ROSA' });
    });

    it('sin fecha no guarda ni revienta', () => {
        expect(guardarAsignaciones(null, { x: 'ROSA' })).toEqual({});
        expect(leerAsignaciones(null)).toEqual({});
        expect(leerAsignaciones('2026-01-01')).toEqual({});
    });
});

describe('solo lo que sigue en la hoja', () => {
    it('un platillo que ya no esta no arrastra su cocinera', () => {
        guardarAsignaciones('2026-09-09', { 'Pollo al pesto': 'ROSA', 'Plato que se fue': 'FERNANDA' });
        const hoy = [{ name: 'Pollo al pesto' }, { name: 'Arroz blanco' }];
        expect(asignacionesVigentes('2026-09-09', hoy)).toEqual({ 'Pollo al pesto': 'ROSA' });
    });

    it('sin platillos no devuelve nada', () => {
        guardarAsignaciones('2026-09-09', { 'Pollo al pesto': 'ROSA' });
        expect(asignacionesVigentes('2026-09-09', [])).toEqual({});
    });
});

describe('cuantas faltan por repartir', () => {
    it('cuenta las puestas y las que faltan', () => {
        const platillos = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
        expect(cuantasFaltan(platillos, { A: 'ROSA' })).toEqual({ total: 3, puestas: 1, faltan: 2 });
    });

    it('con todo repartido no falta ninguna', () => {
        const platillos = [{ name: 'A' }, { name: 'B' }];
        expect(cuantasFaltan(platillos, { A: 'ROSA', B: 'OSMANY' }))
            .toEqual({ total: 2, puestas: 2, faltan: 0 });
    });

    it('sin datos no revienta', () => {
        expect(cuantasFaltan()).toEqual({ total: 0, puestas: 0, faltan: 0 });
    });
});

describe('empezar de cero', () => {
    it('olvidar una fecha no toca las otras', () => {
        guardarAsignaciones('2026-09-09', { A: 'ROSA' });
        guardarAsignaciones('2026-09-12', { B: 'OSMANY' });
        olvidarAsignaciones('2026-09-09');
        expect(leerAsignaciones('2026-09-09')).toEqual({});
        expect(leerAsignaciones('2026-09-12')).toEqual({ B: 'OSMANY' });
    });
});
