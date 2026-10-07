// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 7 oct 2026: dos clientes no pudieron pagar con tarjeta ("error de 3DS") y no quedó
 * rastro de qué les pasó: el cliente no puede escribir `pedidos` y el error del 3DS
 * no llega a nmi-charge. pago-fallido lo deja en el registro y en el pedido.
 */

const estado = vi.hoisted(() => ({ pedidos: [], actualizados: [] }));
vi.mock('firebase-admin/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}), cert: () => ({}) }));
vi.mock('firebase-admin/firestore', () => ({
    FieldValue: { serverTimestamp: () => 'AHORA' },
    getFirestore: () => ({})
}));
vi.mock('../utils/firebaseAdminApp.js', () => ({ appDeAdmin: () => ({}) }));

const { registrar } = await import('../../netlify/functions/pago-fallido.js');

const base = {
    collection: () => ({
        where: (_campo, _op, valor) => ({
            limit: () => ({
                get: async () => {
                    const p = estado.pedidos.find(x => x.numeroOrden === valor);
                    return p
                        ? { empty: false, docs: [{ data: () => p, ref: { update: async (d) => estado.actualizados.push({ numeroOrden: valor, ...d }) } }] }
                        : { empty: true, docs: [] };
                }
            })
        })
    })
};

describe('constancia de un pago con tarjeta que falló', () => {
    beforeEach(() => {
        estado.pedidos = [
            { numeroOrden: 'ORD-SINPAGAR', status: 'pending_payment' },
            { numeroOrden: 'ORD-PAGADO', status: 'confirmed' }
        ];
        estado.actualizados = [];
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    it('guarda el error del 3DS en el pedido que sigue sin pagar', async () => {
        const r = await registrar({ numeroOrden: 'ORD-SINPAGAR', etapa: '3ds', mensaje: 'La autenticación 3D Secure fue rechazada o cancelada.', detalle: '{"transStatus":"N"}' }, base);
        expect(r.guardado).toBe(true);
        expect(estado.actualizados[0]).toMatchObject({ status: 'payment_failed', paymentErrorEtapa: '3ds', paymentErrorDetalle: '{"transStatus":"N"}' });
    });

    it('nunca toca un pedido ya pagado', async () => {
        const r = await registrar({ numeroOrden: 'ORD-PAGADO', etapa: '3ds', mensaje: 'x' }, base);
        expect(r).toEqual({ guardado: false, motivo: 'ya-no-esta-sin-pagar' });
        expect(estado.actualizados).toEqual([]);
    });

    it('si por error viene un número de tarjeta, no se guarda ni se escribe en el registro', async () => {
        await registrar({ numeroOrden: 'ORD-SINPAGAR', etapa: '3ds', mensaje: 'falló 4111111111111111', detalle: 'pan 5555555555554444' }, base);
        expect(estado.actualizados[0].paymentError).not.toMatch(/\d{12,}/);
        expect(estado.actualizados[0].paymentErrorDetalle).not.toMatch(/\d{12,}/);
        expect(JSON.stringify(console.warn.mock.calls)).not.toMatch(/\d{12,}/);
    });
});
