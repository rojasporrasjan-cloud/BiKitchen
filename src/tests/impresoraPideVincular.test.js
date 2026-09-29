import { describe, it, expect, vi } from 'vitest';
import { PhomemoM110Adapter, pideVincular, MENSAJE_VINCULAR } from '../services/printing/PhomemoM110Adapter';
import { PRINTER_STATUS } from '../services/printing/PrinterAdapter';

/**
 * "Pide conectarse de nuevo aun estando conectada y no manda nada a la
 * impresora" — Jan, 29 set 2026, probando con un Xiaomi.
 *
 * Esa impresora rechaza la escritura CON acuse si no está vinculada: Android
 * abre el aviso de "vincular" y Chrome recibe "GATT operation not authorized".
 * La app lo tomaba como bloque muy grande y reintentaba cuatro veces más —cuatro
 * avisos más— sin mandar un solo byte. Ahora cambia a escribir SIN acuse, que
 * no pasa por esa verificación, y la etiqueta sale.
 */

// jsdom no dibuja en canvas: la etiqueta se reemplaza por una imagen en blanco
// del tamaño real (35 × 25 mm a 8 puntos por mm).
vi.mock('../utils/labels/labelRenderer', async (original) => ({
    ...(await original()),
    renderLabel: () => {},
    canvasToMonochrome: () => ({ width: 280, height: 200, bits: new Uint8Array(280 * 200) })
}));

const NO_AUTORIZADO = "Failed to execute 'writeValue' on 'BluetoothRemoteGATTCharacteristic': GATT operation not authorized.";

const impresora = ({ sinAcuseDisponible = true } = {}) => {
    const conAcuse = vi.fn(async () => { throw new Error(NO_AUTORIZADO); });
    const recibido = [];
    const sinAcuse = vi.fn(async (b) => { recibido.push(b.length); });
    const caracteristica = {
        properties: { write: true, writeWithoutResponse: sinAcuseDisponible },
        writeValue: conAcuse,
        writeValueWithoutResponse: sinAcuseDisponible ? sinAcuse : undefined
    };
    const device = {
        name: 'M110-XIAOMI',
        gatt: { connected: true, connect: vi.fn(), disconnect: vi.fn() },
        addEventListener: vi.fn()
    };
    return { device, caracteristica, conAcuse, sinAcuse, recibido };
};

const armar = (falsa) => {
    const a = new PhomemoM110Adapter({ reliableWrite: true, interLabelDelayMs: 0 }, null);
    a.device = falsa.device;
    a.characteristic = falsa.caracteristica;
    a.status = PRINTER_STATUS.READY;
    return a;
};

describe('reconocer que el teléfono pide vincular', () => {
    it('los mensajes de Chrome por falta de vínculo', () => {
        expect(pideVincular(new Error(NO_AUTORIZADO))).toBe(true);
        expect(pideVincular(new Error('GATT Error: Not paired.'))).toBe(true);
        expect(pideVincular(new Error('Insufficient authentication'))).toBe(true);
    });

    it('un bloque grande o una caída no son falta de vínculo', () => {
        expect(pideVincular(new Error('GATT operation failed for unknown reason.'))).toBe(false);
        expect(pideVincular(new Error('GATT Server is disconnected.'))).toBe(false);
        expect(pideVincular(null)).toBe(false);
    });
});

describe('la etiqueta sale aunque el teléfono pida vincular', () => {
    it('cambia a escribir sin acuse y manda todo, sin insistir con el aviso', async () => {
        const falsa = impresora();
        const a = armar(falsa);
        a.tiempoDeImpresionMs = () => 0;

        await a.printLabel({ type: 'Bajo Calorías', protein: 'Pollo con peregil y ajo', expirationDate: '6 octubre' });

        // Un solo intento con acuse (el que abre el aviso), no cinco
        expect(falsa.conAcuse).toHaveBeenCalledTimes(1);
        expect(falsa.recibido.length).toBeGreaterThan(5);
        expect(a.sinAcuse).toBe(true);
        expect(a.getStatus()).toBe(PRINTER_STATUS.READY);
        expect(a.bitacora.some(l => /sin acuse/.test(l))).toBe(true);
    });

    it('si la impresora no acepta sin acuse, dice qué hacer en vez de repetir', async () => {
        const falsa = impresora({ sinAcuseDisponible: false });
        const a = armar(falsa);
        a.tiempoDeImpresionMs = () => 0;

        await expect(a.printLabel({ type: 'Regular', protein: 'Pollo', expirationDate: '6 octubre' }))
            .rejects.toThrow(MENSAJE_VINCULAR);
        expect(falsa.conAcuse).toHaveBeenCalledTimes(1);
    });
});
