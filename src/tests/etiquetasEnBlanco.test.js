import { describe, it, expect } from 'vitest';
import { PhomemoM110Adapter } from '../services/printing/PhomemoM110Adapter';
import { tiempoQueTardaLaEtiquetaMs } from '../services/printing/tiempoDeEtiqueta';

/**
 * "Saca 3 etiquetas nada más y 2 blancas: 1 con algo, 1 blanca, 1 con algo,
 * 1 blanca y una con algo" — Jan, 29 set 2026.
 *
 * Una en blanco entre medio es la impresora recibiendo la siguiente etiqueta
 * mientras todavía saca la anterior: pierde el dibujo pero avanza el papel.
 * La pausa se calculaba con el alto del rollo (25 mm) y lo que sale del cabezal
 * es más largo: el corrimiento de 3 mm hacia abajo son líneas que también se
 * imprimen.
 */

const conAjustes = (s) => new PhomemoM110Adapter({ heightMm: 25, offsetYmm: 3, interLabelDelayMs: 0, ...s }, null);

describe('la pausa entre etiquetas cubre todo lo que sale del cabezal', () => {
    it('cuenta el corrimiento vertical, no solo el alto del rollo', () => {
        const a = conAjustes();
        expect(a.tiempoDeImpresionMs()).toBe(tiempoQueTardaLaEtiquetaMs({ heightMm: 28 }));
        expect(a.tiempoDeImpresionMs()).toBeGreaterThan(tiempoQueTardaLaEtiquetaMs({ heightMm: 25 }));
    });

    it('sin corrimiento queda como antes', () => {
        expect(conAjustes({ offsetYmm: 0 }).tiempoDeImpresionMs()).toBe(tiempoQueTardaLaEtiquetaMs({ heightMm: 25 }));
    });

    it('"Imprimir más lento" espera el doble', () => {
        const normal = conAjustes().tiempoDeImpresionMs();
        expect(conAjustes({ impresoraLenta: true }).tiempoDeImpresionMs()).toBe(normal * 2);
    });

    it('una pausa puesta a mano más larga se respeta', () => {
        expect(conAjustes({ interLabelDelayMs: 5000 }).tiempoDeImpresionMs()).toBe(5000);
    });
});
