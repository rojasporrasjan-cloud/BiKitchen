import { describe, it, expect } from 'vitest';
import { isSuperAdminEmail } from '../config/admins';

/**
 * El super admin decide qué herramientas internas se ven en el panel.
 * Un falso positivo se las mostraría a Gina; un falso negativo se las
 * escondería al dueño. Por eso se prueba el borde en ambas direcciones.
 */
describe('isSuperAdminEmail', () => {
    it('reconoce al dueño', () => {
        expect(isSuperAdminEmail('rojasporrasjan@gmail.com')).toBe(true);
    });

    it('ignora mayúsculas y espacios sobrantes', () => {
        expect(isSuperAdminEmail('  RojasPorrasJan@Gmail.com  ')).toBe(true);
    });

    it('NO reconoce a un admin normal', () => {
        expect(isSuperAdminEmail('ginamaroli@gmail.com')).toBe(false);
        expect(isSuperAdminEmail('bikitchenfood@gmail.com')).toBe(false);
    });

    it('NO se deja engañar por correos parecidos', () => {
        expect(isSuperAdminEmail('rojasporrasjan@gmail.com.attacker.net')).toBe(false);
        expect(isSuperAdminEmail('xrojasporrasjan@gmail.com')).toBe(false);
        expect(isSuperAdminEmail('rojasporrasjan@hotmail.com')).toBe(false);
    });

    it('devuelve false ante valores vacíos o inválidos', () => {
        expect(isSuperAdminEmail('')).toBe(false);
        expect(isSuperAdminEmail(null)).toBe(false);
        expect(isSuperAdminEmail(undefined)).toBe(false);
        expect(isSuperAdminEmail(12345)).toBe(false);
        expect(isSuperAdminEmail({})).toBe(false);
    });
});
