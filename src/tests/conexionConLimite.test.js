import { describe, it, expect, vi, afterEach } from 'vitest';
import { PhomemoM110Adapter, conLimite, ESPERA_CONEXION_MS } from '../services/printing/PhomemoM110Adapter';
import { PRINTER_STATUS } from '../services/printing/PrinterAdapter';

/**
 * "Se queda mucho rato en conectando con la impresora" — Jan, 29 set 2026,
 * probando la pantalla de etiquetas en otro teléfono.
 *
 * `gatt.connect()` no tiene tiempo límite: si la impresora no contesta, la
 * pantalla dice "Conectando…" para siempre. Ahora se corta a los pocos
 * segundos, se suelta la sesión trabada y se prueba una vez más.
 */

/** Una impresora cuya primera conexión se queda colgada si así se pide. */
const impresora = ({ colgadas = 0 } = {}) => {
    let conectada = false;
    let intentos = 0;
    const caracteristica = { properties: { write: true }, writeValue: vi.fn(async () => {}), startNotifications: vi.fn(async () => {}), addEventListener: vi.fn() };
    const servicio = { getCharacteristic: vi.fn(async () => caracteristica) };
    const device = {
        name: 'M110-PRUEBA',
        gatt: {
            get connected() { return conectada; },
            connect: vi.fn(() => {
                intentos += 1;
                if (intentos <= colgadas) return new Promise(() => {}); // nunca contesta
                conectada = true;
                return Promise.resolve({ getPrimaryService: async () => servicio });
            }),
            disconnect: vi.fn(() => { conectada = false; })
        },
        addEventListener: vi.fn()
    };
    return { device, get intentos() { return intentos; } };
};

const armar = (falsa) => {
    const a = new PhomemoM110Adapter({}, null);
    a.device = falsa.device;
    return a;
};

afterEach(() => { vi.useRealTimers(); });

describe('conectar no se queda pegado', () => {
    it('si la primera conexión no contesta, la suelta y la segunda entra', async () => {
        vi.useFakeTimers();
        const falsa = impresora({ colgadas: 1 });
        const a = armar(falsa);

        const conexion = a.connect();
        await vi.advanceTimersByTimeAsync(ESPERA_CONEXION_MS + 2000);
        await conexion;

        expect(falsa.intentos).toBe(2);
        expect(falsa.device.gatt.disconnect).toHaveBeenCalled();
        expect(a.getStatus()).toBe(PRINTER_STATUS.READY);
    });

    it('si nunca contesta, avisa en segundos en vez de esperar para siempre', async () => {
        vi.useFakeTimers();
        const falsa = impresora({ colgadas: 99 });
        const a = armar(falsa);

        const conexion = a.connect();
        const resultado = expect(conexion).rejects.toThrow(/no contestó.*prendida/i);
        await vi.advanceTimersByTimeAsync(2 * ESPERA_CONEXION_MS + 2000);
        await resultado;

        expect(falsa.intentos).toBe(2);
        expect(a.getStatus()).toBe(PRINTER_STATUS.ERROR);
    });

    it('conectar e imprimir a la vez no abren dos conexiones', async () => {
        const falsa = impresora();
        const a = armar(falsa);
        await Promise.all([a.connect(), a.connect(), a.connect()]);
        expect(falsa.intentos).toBe(1);
    });
});

describe('conLimite', () => {
    it('deja pasar lo que contesta a tiempo', async () => {
        await expect(conLimite(Promise.resolve('ok'), 1000, 'x')).resolves.toBe('ok');
    });

    it('corta lo que no contesta', async () => {
        vi.useFakeTimers();
        const p = conLimite(new Promise(() => {}), 500, 'al conectar');
        const r = expect(p).rejects.toThrow(/al conectar/);
        await vi.advanceTimersByTimeAsync(600);
        await r;
    });
});
