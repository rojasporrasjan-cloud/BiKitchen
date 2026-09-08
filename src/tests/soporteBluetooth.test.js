import { describe, it, expect } from 'vitest';
import { motivoSinBluetooth, esIOS, esAndroid } from '../services/printing/soporteBluetooth';

/**
 * Antes el panel decia siempre "abri el panel en Chrome o Edge".
 *
 * En el iPhone eso es un consejo FALSO: Apple obliga a todos los navegadores a
 * usar su motor y ninguno trae Web Bluetooth, asi que instalar Chrome ahi hace
 * perder la tarde sin arreglar nada.
 */

const UA = {
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    chromeEniPhone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1',
    ipadNuevo: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    androidChrome: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    androidFirefox: 'Mozilla/5.0 (Android 13; Mobile; rv:120.0) Gecko/120.0 Firefox/120.0',
    windowsChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    windowsFirefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
};

describe('reconocer el aparato', () => {
    it('el iPhone es iOS', () => {
        expect(esIOS(UA.iphone)).toBe(true);
        expect(esIOS(UA.chromeEniPhone)).toBe(true);
    });

    it('el iPad nuevo se hace pasar por Mac, pero tiene pantalla tactil', () => {
        expect(esIOS(UA.ipadNuevo, 5)).toBe(true);
        // La Mac de verdad, con el mismo texto pero sin tactil, NO es iOS
        expect(esIOS(UA.ipadNuevo, 0)).toBe(false);
    });

    it('Android es Android', () => {
        expect(esAndroid(UA.androidChrome)).toBe(true);
        expect(esAndroid(UA.windowsChrome)).toBe(false);
    });
});

describe('por que no se puede imprimir aca', () => {
    it('si el aparato SI puede, no dice nada', () => {
        expect(motivoSinBluetooth({ hayBluetooth: true, userAgent: UA.windowsChrome })).toBe(null);
        expect(motivoSinBluetooth({ hayBluetooth: true, userAgent: UA.iphone })).toBe(null);
    });

    it('en el iPhone NO manda a instalar Chrome, porque no sirve', () => {
        const m = motivoSinBluetooth({ hayBluetooth: false, userAgent: UA.iphone });
        expect(m.titulo).toMatch(/iPhone/i);
        expect(m.detalle).toMatch(/no cambia nada/i);
        expect(m.detalle).toMatch(/computadora|Android/i);
    });

    it('Chrome en iPhone tampoco puede, y lo dice igual', () => {
        const m = motivoSinBluetooth({ hayBluetooth: false, userAgent: UA.chromeEniPhone });
        expect(m.titulo).toMatch(/iPhone/i);
    });

    it('el iPad nuevo cae en el mismo mensaje, no en el de escritorio', () => {
        const m = motivoSinBluetooth({ hayBluetooth: false, userAgent: UA.ipadNuevo, puntosTactiles: 5 });
        expect(m.titulo).toMatch(/iPad/i);
    });

    it('en Android SI manda a Chrome, porque ahi si funciona', () => {
        const m = motivoSinBluetooth({ hayBluetooth: false, userAgent: UA.androidFirefox });
        expect(m.detalle).toMatch(/Chrome/);
        expect(m.detalle).toMatch(/s[ií] se puede/i);
    });

    it('Firefox de escritorio manda a Chrome o Edge', () => {
        const m = motivoSinBluetooth({ hayBluetooth: false, userAgent: UA.windowsFirefox });
        expect(m.titulo).toMatch(/Firefox/);
        expect(m.detalle).toMatch(/Chrome o Edge/);
    });

    it('Safari de Mac manda a Chrome o Edge', () => {
        const m = motivoSinBluetooth({ hayBluetooth: false, userAgent: UA.macSafari, puntosTactiles: 0 });
        expect(m.titulo).toMatch(/Safari/);
    });

    it('sin datos no revienta y da algo util', () => {
        const m = motivoSinBluetooth({ hayBluetooth: false });
        expect(m.puedeAqui).toBe(false);
        expect(m.detalle.length).toBeGreaterThan(10);
        expect(motivoSinBluetooth()).not.toBe(null);
    });
});
