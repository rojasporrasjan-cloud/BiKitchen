import { describe, it, expect } from 'vitest';
import { esCaida } from '../services/printing/PhomemoM110Adapter';

/**
 * Qué cuenta como "se cayó el Bluetooth".
 *
 * El reintento miraba solo el texto en INGLÉS de Chrome. Pero el caso más común
 * —la sesión ya muerta antes del primer byte— lo tira el propio adaptador en
 * español, "La impresora se desconectó", y ese no calzaba: se iba derecho al
 * error con 0 de 7680 bytes, sin reconectar ni reintentar (Jan, 25 set 2026,
 * con Windows emparejando la impresora por su cuenta).
 */
describe('reconocer que se cayó el Bluetooth', () => {
    it('el mensaje del propio adaptador, en español', () => {
        expect(esCaida(new Error('La impresora se desconectó'))).toBe(true);
    });

    it('los mensajes de Chrome, en inglés', () => {
        expect(esCaida(new Error("Failed to execute 'writeValue': GATT Server is disconnected."))).toBe(true);
        expect(esCaida(new Error('GATT Server is disconnected.'))).toBe(true);
        expect(esCaida(new Error('Device disconnected'))).toBe(true);
    });

    it('sin tilde también, que no siempre se escribe igual', () => {
        expect(esCaida(new Error('la impresora se desconecto'))).toBe(true);
        expect(esCaida(new Error('Se desconectó a media etiqueta'))).toBe(true);
    });

    it('un bloque rechazado por tamaño NO es una caída', () => {
        // Este sí se arregla mandando menos de golpe; reconectar no sirve.
        expect(esCaida(new Error('GATT operation failed for unknown reason.'))).toBe(false);
        expect(esCaida(new Error('La impresora no está lista'))).toBe(false);
        expect(esCaida(new Error('Todavía no elegiste la impresora.'))).toBe(false);
    });

    it('no revienta con cualquier cosa', () => {
        expect(esCaida(null)).toBe(false);
        expect(esCaida(undefined)).toBe(false);
        expect(esCaida({})).toBe(false);
        expect(esCaida('texto suelto')).toBe(false);
    });
});
