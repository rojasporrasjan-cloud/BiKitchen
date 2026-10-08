import { describe, it, expect } from 'vitest';
import { resumenDelTablero, nombreDelEnvio } from '../utils/tableroKommo';

/** Jan, 8 oct 2026: ver en el panel qué está activo, cuánto se mandó y cuánto se gastó. */

const AHORA = new Date('2026-10-08T20:00:00Z'); // jueves 8 oct, 2 p. m. de Costa Rica

describe('el tablero de WhatsApp (Kommo)', () => {
    it('cuenta lo de hoy en hora de Costa Rica: a clientes y pruebas aparte', () => {
        const r = resumenDelTablero({
            registro: [
                { tipo: 'renovacion', modo: 'si', cuando: '2026-10-08T16:01:00Z', enviados: [{}, {}] },
                { tipo: 'cierre-pedidos', modo: 'prueba', cuando: '2026-10-08T15:00:00Z', enviados: [{}] },
                // 11:30 p. m. del miércoles en Costa Rica: es de ayer
                { tipo: 'renovacion', modo: 'si', cuando: '2026-10-08T05:30:00Z', enviados: [{}, {}, {}] }
            ]
        }, AHORA);
        expect(r.hoy.aClientes).toBe(2);
        expect(r.hoy.pruebas).toBe(1);
        expect(r.hoy.entradas).toHaveLength(2);
    });

    it('agrupa los envíos en prendidos, en prueba y apagados', () => {
        const r = resumenDelTablero({ modos: { renovacion: { modo: 'si' }, 'cierre-pedidos': { modo: 'prueba' } } }, AHORA);
        expect(r.estados.prendidos).toEqual(['Renovación del pack']);
        expect(r.estados.enPrueba).toEqual(['Cierre de pedidos']);
        expect(r.estados.apagados).toContain('Pago recibido');
    });

    it('el gasto del mes contra el tope de US$200', () => {
        const r = resumenDelTablero({ marketingDelMes: { mes: '2026-10', mensajes: 351 } }, AHORA);
        expect(r.gasto).toMatchObject({ mensajes: 351, gasto: 25.97, tope: 200, porcentaje: 13 });
    });

    it('suma lo que vendieron los envíos de los últimos 30 días', () => {
        const r = resumenDelTablero({ ventas: { dias: 30, porTipo: [
            { enviados: 10, compraron: 2, monto: 80000 }, { enviados: 5, compraron: 1, monto: 40000 }
        ] } }, AHORA);
        expect(r.ventas).toMatchObject({ enviados: 15, compraron: 3, monto: 120000 });
    });

    it('nombra cada envío como en el panel', () => {
        expect(nombreDelEnvio({ tipo: 'cierre-pedidos' })).toBe('Cierre de pedidos');
        expect(nombreDelEnvio({ tipo: 'difusion', nombre: 'Promo HOY5' })).toBe('Difusión a mano: Promo HOY5');
    });

    it('sin datos no se cae', () => {
        const r = resumenDelTablero(undefined, AHORA);
        expect(r.hoy.aClientes).toBe(0);
        expect(r.gasto.gasto).toBe(0);
        expect(r.conexion).toBeNull();
    });
});
