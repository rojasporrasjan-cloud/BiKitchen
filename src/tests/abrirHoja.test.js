import { describe, it, expect, vi } from 'vitest';
import { nombreDeVentana, abrirHoja } from '../utils/abrirHoja.js';

/**
 * Sacar la hoja cuatro veces en una manana dejaba cuatro pestanas iguales
 * abiertas, porque `window.open(url, '_blank')` abre una nueva cada vez. Con
 * nombre de ventana el navegador reusa la que ya esta.
 */
describe('que ventana le toca a cada hoja', () => {
    it('empaque tiene la suya', () => {
        expect(nombreDeVentana('/admin/print-production?date=2026-09-05&view=empaque'))
            .toBe('bikitchen-empaque');
    });

    it('cocina tiene la suya', () => {
        expect(nombreDeVentana('/admin/print-production?date=2026-09-05&view=cocina'))
            .toBe('bikitchen-cocina');
    });

    it('las tandas comparten la de cocina: son la misma hoja', () => {
        expect(nombreDeVentana('/admin/print-production?date=2026-09-05,2026-09-07&tanda=adelanto'))
            .toBe('bikitchen-cocina');
        expect(nombreDeVentana('/admin/print-production?date=2026-09-05,2026-09-07'))
            .toBe('bikitchen-cocina');
    });

    it('nunca devuelve vacio, que abriria una pestana suelta', () => {
        expect(nombreDeVentana('')).toBeTruthy();
        expect(nombreDeVentana(null)).toBeTruthy();
        expect(nombreDeVentana(undefined)).toBeTruthy();
    });
});

describe('abrir la hoja', () => {
    const ventanaFalsa = () => {
        const abierta = { focus: vi.fn() };
        return { open: vi.fn(() => abierta), _abierta: abierta };
    };

    it('nunca usa _blank', () => {
        const w = ventanaFalsa();
        abrirHoja('/admin/print-production?view=cocina', w);
        expect(w.open).toHaveBeenCalledWith('/admin/print-production?view=cocina', 'bikitchen-cocina');
        expect(w.open.mock.calls[0][1]).not.toBe('_blank');
    });

    it('dos clics seguidos van a la MISMA ventana', () => {
        const w = ventanaFalsa();
        abrirHoja('/admin/print-production?view=cocina', w);
        abrirHoja('/admin/print-production?view=cocina&otra=cosa', w);
        const nombres = w.open.mock.calls.map(c => c[1]);
        expect(nombres[0]).toBe(nombres[1]);
    });

    it('cocina y empaque van a ventanas distintas, para poder ver las dos', () => {
        const w = ventanaFalsa();
        abrirHoja('/admin/print-production?view=cocina', w);
        abrirHoja('/admin/print-production?view=empaque', w);
        const nombres = w.open.mock.calls.map(c => c[1]);
        expect(nombres[0]).not.toBe(nombres[1]);
    });

    it('la enfoca, porque si ya estaba atras el cambio no se ve', () => {
        const w = ventanaFalsa();
        abrirHoja('/admin/print-production?view=cocina', w);
        expect(w._abierta.focus).toHaveBeenCalled();
    });

    it('no revienta si el navegador la bloquea', () => {
        const w = { open: vi.fn(() => null) };
        expect(() => abrirHoja('/x', w)).not.toThrow();
        expect(abrirHoja('/x', w)).toBeNull();
    });

    it('sin url no abre nada', () => {
        const w = ventanaFalsa();
        expect(abrirHoja('', w)).toBeNull();
        expect(w.open).not.toHaveBeenCalled();
    });
});
