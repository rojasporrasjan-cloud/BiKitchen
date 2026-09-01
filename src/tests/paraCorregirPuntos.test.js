import { describe, it, expect } from 'vitest';
import { paraCorregir } from '../utils/auditarPuntos';

/**
 * A quien se le corrige el saldo.
 *
 * Por defecto quedan fuera los correos inventados (@sin-correo.bikitchen.cr):
 * el cliente no puede entrar con ese correo, asi que arreglarle el saldo ahi no
 * le sirve. Pero el dato SI vale para saber cuanto migrarle cuando de su correo
 * real, y por eso se puede pedir a proposito.
 *
 * A nadie se le quita: los que tienen de mas nunca entran.
 */
const inf = [
    { correo: 'gennie@gmail.com', faltante: 10046, correoInventado: false },
    { correo: '88492466@sin-correo.bikitchen.cr', faltante: 1336, correoInventado: true },
    { correo: '70744052@sin-correo.bikitchen.cr', faltante: 7270, correoInventado: true },
    { correo: 'rebeca@hotmail.com', faltante: -3560, correoInventado: false },
    { correo: 'aldia@gmail.com', faltante: 0, correoInventado: false }
];

describe('paraCorregir', () => {

    it('por defecto solo toma los de correo real con faltante', () => {
        const r = paraCorregir(inf);
        expect(r.map(c => c.correo)).toEqual(['gennie@gmail.com']);
    });

    it('con incluirInventados toma tambien los @sin-correo', () => {
        const r = paraCorregir(inf, { incluirInventados: true });
        expect(r).toHaveLength(3);
        expect(r.map(c => c.correo)).toContain('70744052@sin-correo.bikitchen.cr');
    });

    it('NUNCA toca a quien tiene de mas', () => {
        expect(paraCorregir(inf, { incluirInventados: true }).some(c => c.faltante < 0)).toBe(false);
    });

    it('ignora a quien ya esta al dia', () => {
        expect(paraCorregir(inf, { incluirInventados: true }).some(c => c.faltante === 0)).toBe(false);
    });

    it('aguanta un informe vacio o nulo', () => {
        expect(paraCorregir([])).toEqual([]);
        expect(paraCorregir(null)).toEqual([]);
        expect(paraCorregir(undefined, { incluirInventados: true })).toEqual([]);
    });

    it('ordena de mayor a menor faltante para revisar primero lo grande', () => {
        const r = paraCorregir(inf, { incluirInventados: true });
        expect(r.map(c => c.faltante)).toEqual([10046, 7270, 1336]);
    });
});
