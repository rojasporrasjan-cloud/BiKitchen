import { describe, it, expect, vi } from 'vitest';
import { confirmarPagoConRespaldo } from '../utils/confirmarPedido.js';

const cuotaAgotada = () => Object.assign(new Error('Quota exceeded.'), { code: 'resource-exhausted' });

describe('confirmar el pago cuando Firestore rechaza las transacciones', () => {

    it('por lo normal usa la transaccion y no toca el respaldo', async () => {
        const escribirDirecto = vi.fn();
        const otorga = await confirmarPagoConRespaldo({
            conTransaccion: async () => true,
            releerPedido: async () => ({ pointsAwarded: false }),
            escribirDirecto
        });
        expect(otorga).toBe(true);
        expect(escribirDirecto).not.toHaveBeenCalled();
    });

    it('si la transaccion cae por cuota, confirma igual', async () => {
        const escribirDirecto = vi.fn();
        const otorga = await confirmarPagoConRespaldo({
            conTransaccion: async () => { throw cuotaAgotada(); },
            releerPedido: async () => ({ pointsAwarded: false }),
            escribirDirecto
        });
        expect(otorga).toBe(true);
        expect(escribirDirecto).toHaveBeenCalledOnce();
    });

    it('no da los puntos dos veces si otro ya confirmo', async () => {
        const escribirDirecto = vi.fn();
        const otorga = await confirmarPagoConRespaldo({
            conTransaccion: async () => { throw cuotaAgotada(); },
            releerPedido: async () => ({ pointsAwarded: true }),
            escribirDirecto
        });
        expect(otorga).toBe(false);
        expect(escribirDirecto).not.toHaveBeenCalled();
    });

    it('si el pedido ya no existe, no escribe nada', async () => {
        const escribirDirecto = vi.fn();
        const otorga = await confirmarPagoConRespaldo({
            conTransaccion: async () => { throw cuotaAgotada(); },
            releerPedido: async () => null,
            escribirDirecto
        });
        expect(otorga).toBe(false);
        expect(escribirDirecto).not.toHaveBeenCalled();
    });

    it('un error que NO es de cuota se propaga: no se tapa un problema real', async () => {
        const escribirDirecto = vi.fn();
        const permiso = Object.assign(new Error('Missing permissions'), { code: 'permission-denied' });
        await expect(confirmarPagoConRespaldo({
            conTransaccion: async () => { throw permiso; },
            releerPedido: async () => ({ pointsAwarded: false }),
            escribirDirecto
        })).rejects.toThrow('Missing permissions');
        expect(escribirDirecto).not.toHaveBeenCalled();
    });
});
