import { describe, it, expect, vi } from 'vitest';
import { PhomemoM110Adapter } from '../services/printing/PhomemoM110Adapter';
import { PRINTER_STATUS } from '../services/printing/PrinterAdapter';

/**
 * La impresora se duerme mientras uno revisa la hoja.
 *
 * Entre conectar y darle imprimir pasan minutos —elegir el vencimiento, mirar
 * la lista, confirmar el lote— y la M110 suelta el Bluetooth sola. La primera
 * escritura moria con "GATT Server is disconnected" y salian 0 bytes de 7680.
 *
 * Reconectar no necesita un clic (eso solo lo pide `requestDevice`), asi que la
 * impresora se levanta sola antes de escribir.
 */

/** Una M110 de mentira: se puede dormir y se anota lo que recibe. */
const impresoraFalsa = ({ dormidaAlPrincipio = false } = {}) => {
    const escrito = [];
    let conectada = !dormidaAlPrincipio;
    let conexiones = 0;

    const caracteristica = {
        properties: { write: true, writeWithoutResponse: true },
        writeValue: vi.fn(async (bytes) => {
            if (!conectada) {
                throw new Error("Failed to execute 'writeValue': GATT Server is disconnected.");
            }
            escrito.push(bytes.length);
        })
    };

    const servicio = {
        getCharacteristic: vi.fn(async () => caracteristica)
    };

    const device = {
        name: 'M110-PRUEBA',
        gatt: {
            get connected() { return conectada; },
            connect: vi.fn(async () => {
                conectada = true;
                conexiones += 1;
                return { getPrimaryService: async () => servicio };
            }),
            disconnect: vi.fn(() => { conectada = false; })
        },
        addEventListener: vi.fn()
    };

    return {
        device,
        escrito,
        dormir: () => { conectada = false; },
        get conexiones() { return conexiones; }
    };
};

const armar = (falsa) => {
    const a = new PhomemoM110Adapter({ reliableWrite: true }, null);
    a.device = falsa.device;
    a.characteristic = null;
    a.status = PRINTER_STATUS.READY;
    return a;
};

describe('la impresora dormida se levanta sola', () => {
    it('reconecta antes de escribir en vez de morir con 0 bytes', async () => {
        const falsa = impresoraFalsa({ dormidaAlPrincipio: true });
        const a = armar(falsa);

        expect(falsa.device.gatt.connected).toBe(false);

        // `connect()` es publico y es lo que usa la reconexion por dentro
        await a.connect();

        expect(falsa.device.gatt.connected).toBe(true);
        expect(falsa.conexiones).toBe(1);
        expect(a.getStatus()).toBe(PRINTER_STATUS.READY);
    });

    it('una segunda conexion no se pide si sigue viva', async () => {
        const falsa = impresoraFalsa();
        const a = armar(falsa);
        await a.connect();
        await a.connect();
        expect(falsa.conexiones).toBe(1);
    });

    it('si se durmio en el camino, vuelve a conectar', async () => {
        const falsa = impresoraFalsa();
        const a = armar(falsa);
        await a.connect();
        expect(falsa.conexiones).toBe(1);

        falsa.dormir();
        a.characteristic = null;

        await a.connect();
        expect(falsa.conexiones).toBe(2);
        expect(falsa.device.gatt.connected).toBe(true);
    });
});

describe('no se agarra la impresora equivocada', () => {
    it('con varias autorizadas y ninguna guardada, pide elegir', async () => {
        const a = new PhomemoM110Adapter({}, null);
        const dos = [{ id: 'vieja', name: 'M110-VIEJA' }, { id: 'nueva', name: 'M110-NUEVA' }];
        globalThis.navigator = globalThis.navigator || {};
        const previo = globalThis.navigator.bluetooth;
        Object.defineProperty(globalThis.navigator, 'bluetooth', {
            value: { getDevices: async () => dos },
            configurable: true
        });
        localStorage.removeItem('bikitchen_printer_device_id');

        // Antes devolvia conocidos[0] —la vieja, apagada— y todo fallaba despues
        expect(await a.restoreDevice()).toBe(null);

        Object.defineProperty(globalThis.navigator, 'bluetooth', {
            value: previo, configurable: true
        });
    });
});
