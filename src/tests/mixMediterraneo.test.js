import { describe, it, expect } from 'vitest';
import { esElMismoPlato, buscarRenglonDelMismoPlato, nombreMasCompleto } from '../utils/mismoPlato';

/**
 * "No tenemos mix de vegetales mediterraneos" — Gina, 10 de setiembre de 2026.
 *
 * La hoja le pedia 58 porciones de un plato que no estaba en el menu de la
 * semana. Lo que paso: "Mix de vegetales estilo Mediterraneo" solo existe en el
 * menu de CENA VEGETARIANA, y se fusiono con el "Mix de vegetales" del bajo
 * calorias. Como en la fusion gana el nombre mas largo, el renglon entero —58
 * porciones de bajo calorias mas UNA de cena vegetariana— salio con el nombre
 * que la cocina no reconoce.
 *
 * Un nombre que la cocina no reconoce es peor que dos renglones separados: se
 * para a preguntar, o cocina otra cosa.
 */
describe('mix de vegetales vs estilo Mediterraneo', () => {
    it('NO son el mismo plato: "estilo" cambia la preparacion', () => {
        expect(esElMismoPlato('Mix de vegetales', 'Mix de vegetales estilo Mediterráneo')).toBe(false);
    });

    it('no se suman en el mismo renglon del granel', () => {
        const acc = { 'Mix de vegetales|taza(s)': { name: 'Mix de vegetales', unit: 'taza(s)' } };
        const r = buscarRenglonDelMismoPlato(acc, 'Mix de vegetales estilo Mediterráneo', 'taza(s)');
        expect(r.clave).toBeNull();
    });

    it('el bajo calorias conserva SU nombre, el del menu de la semana', () => {
        const acc = { 'Mix de vegetales|taza(s)': { name: 'Mix de vegetales', unit: 'taza(s)' } };
        const r = buscarRenglonDelMismoPlato(acc, 'Mix de vegetales', 'taza(s)');
        expect(r.clave).toBe('Mix de vegetales|taza(s)');
    });

    it('lo que ya funcionaba sigue igual: el mismo plato escrito mas largo SI se junta', () => {
        expect(esElMismoPlato('Albóndigas de res', 'Albóndigas de res artesanales')).toBe(true);
        expect(esElMismoPlato('Carne mechada', 'Carne mechada en salsa criolla')).toBe(true);
    });

    it('y lo que ya se separaba sigue separado', () => {
        expect(esElMismoPlato('Picadillo de vainica', 'Picadillo de vainica y zanahoria')).toBe(false);
        expect(esElMismoPlato('Zuchinnis salteados', 'Zuchinnis salteados con hongos')).toBe(false);
        expect(esElMismoPlato('Pollo al ajillo', 'Pollo teriyaki')).toBe(false);
    });

    it('nombreMasCompleto solo manda cuando de verdad son el mismo', () => {
        expect(nombreMasCompleto('Albóndigas', 'Albóndigas de res')).toBe('Albóndigas de res');
    });
});
