import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 7 oct 2026: cuando el 3DS falla, el motivo que da Gateway.js (o el banco) tiene
 * que viajar en el error para poder reportarlo; antes solo iba a la consola del
 * cliente. Y ya no se reintenta en USD con el monto en colones.
 */

const { authenticate3DS, preInit3DS, reportarPagoFallido } = await import('../utils/nmiClient');

const datos = {
    amount: '181780.00', currency: 'CRC', cardNumber: '4111111111111111', cardExpMonth: '12', cardExpYear: '2030',
    firstName: 'Ana', lastName: 'Rojas', email: 'a@b.cr', address1: 'San José', city: 'San José', state: 'SJ', country: 'CR', postalCode: '10101'
};

const gatewayFalso = ({ createUI }) => {
    const oyentes = {};
    const tds = {
        on: (ev, fn) => { oyentes[ev] = fn; },
        createUI: (opts) => createUI(opts, oyentes)
    };
    return { get3DSecure: () => tds, tds };
};

describe('el 3DS deja el motivo de la falla', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="three-ds-container"></div>';
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('si Gateway.js rechaza las opciones, el error lleva el motivo y NUNCA se pide en USD', async () => {
        const monedas = [];
        const gw = gatewayFalso({
            createUI: (opts, oyentes) => {
                monedas.push(opts.currency);
                oyentes.error?.({ error: new Error('The following options must be provided: lastName') });
                return null;
            }
        });
        preInit3DS(gw);
        const err = await authenticate3DS(gw, datos).catch(e => e);
        expect(err).toBeInstanceOf(Error);
        expect(err.detalle).toMatch(/must be provided: lastName/);
        expect(monedas).not.toContain('USD');
    });

    it('si el banco rechaza la autenticación, el error lleva lo que respondió', async () => {
        const gw = gatewayFalso({
            createUI: () => {
                const ev = {};
                return {
                    on: (n, fn) => { ev[n] = fn; },
                    start: () => setTimeout(() => ev.failure({ transStatus: 'N', reason: 'Autenticación fallida' }), 0),
                    unmount: () => {}
                };
            }
        });
        preInit3DS(gw);
        const err = await authenticate3DS(gw, datos).catch(e => e);
        expect(err.message).toMatch(/rechazada o cancelada/);
        expect(err.detalle).toMatch(/transStatus/);
    });

    it('el reporte va a pago-fallido sin el número de tarjeta', () => {
        const llamadas = [];
        globalThis.fetch = vi.fn((url, opts) => { llamadas.push({ url, body: JSON.parse(opts.body) }); return Promise.resolve({ ok: true }); });
        reportarPagoFallido({ numeroOrden: 'ORD-1', etapa: '3ds', mensaje: 'x', detalle: '{"transStatus":"N"}' });
        expect(llamadas[0].url).toBe('/.netlify/functions/pago-fallido');
        expect(llamadas[0].body).toMatchObject({ numeroOrden: 'ORD-1', etapa: '3ds' });
        expect(JSON.stringify(llamadas[0].body)).not.toMatch(/4111/);
    });
});
