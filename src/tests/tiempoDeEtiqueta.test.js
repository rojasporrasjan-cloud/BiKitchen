import { describe, it, expect } from 'vitest';
import {
    tiempoQueTardaLaEtiquetaMs,
    pausaEntreEtiquetasMs,
    pausaDemasiadoCorta
} from '../services/printing/tiempoDeEtiqueta';

/**
 * "Por alguna razón me saca 3 en lugar de 5" (Jan, 26 set 2026).
 *
 * La M110 saca papel a 18 mm/s. Una etiqueta de 25 mm tarda 1.389 ms en salir, y
 * la calibración compartida tenía la pausa en **250 ms**: se le mandaba la
 * siguiente cuando la anterior todavía estaba imprimiendo y se perdían.
 *
 * Y no fue un descuido raro: el control del calibrador va de 0 a 4000 de 250 en
 * 250, así que el primer paso después de "automática" es justo 250. Ahora una
 * pausa escrita a mano **no puede bajar** de lo que tarda el papel.
 */

const rollo = (heightMm, interLabelDelayMs) => ({ heightMm, interLabelDelayMs });

describe('lo que tarda una etiqueta en salir', () => {
    it('el rollo de BiKitchen, de 25 mm: 1.839 ms', () => {
        // 25 / 18 = 1,389 s de papel + 450 ms de margen del motor
        expect(tiempoQueTardaLaEtiquetaMs({ heightMm: 25 })).toBe(1839);
    });

    it('una de 20 mm tarda menos', () => {
        expect(tiempoQueTardaLaEtiquetaMs({ heightMm: 20 })).toBe(1561);
    });

    it('una más alta tarda más', () => {
        expect(tiempoQueTardaLaEtiquetaMs({ heightMm: 40 })).toBeGreaterThan(
            tiempoQueTardaLaEtiquetaMs({ heightMm: 25 })
        );
    });

    it('sin alto guardado asume 20 mm, no 0', () => {
        expect(tiempoQueTardaLaEtiquetaMs({})).toBe(1561);
        expect(tiempoQueTardaLaEtiquetaMs(null)).toBe(1561);
        expect(tiempoQueTardaLaEtiquetaMs({ heightMm: 0 })).toBe(1561);
    });
});

describe('la pausa que de verdad se usa', () => {
    it('los 250 ms que perdían etiquetas ya no se obedecen', () => {
        expect(pausaEntreEtiquetasMs(rollo(25, 250))).toBe(1839);
    });

    it('en automática (0) se calcula por el alto', () => {
        expect(pausaEntreEtiquetasMs(rollo(25, 0))).toBe(1839);
    });

    it('una pausa MÁS LARGA sí se respeta: es lo que hay que subir si falta alguna', () => {
        expect(pausaEntreEtiquetasMs(rollo(25, 3000))).toBe(3000);
    });

    it('nunca baja del piso, con cualquier número', () => {
        [1, 250, 500, 1000, 1838].forEach(v => {
            expect(pausaEntreEtiquetasMs(rollo(25, v))).toBe(1839);
        });
    });

    it('un valor sin sentido no rompe nada', () => {
        expect(pausaEntreEtiquetasMs(rollo(25, -500))).toBe(1839);
        expect(pausaEntreEtiquetasMs(rollo(25, 'rápido'))).toBe(1839);
        expect(pausaEntreEtiquetasMs({})).toBe(1561);
    });
});

describe('el aviso para quien está calibrando', () => {
    it('avisa cuando el número se queda corto, con los dos tiempos', () => {
        expect(pausaDemasiadoCorta(rollo(25, 250))).toEqual({ fijada: 250, necesaria: 1839 });
    });

    it('"automática" no es quedarse corto', () => {
        expect(pausaDemasiadoCorta(rollo(25, 0))).toBeNull();
    });

    it('una pausa larga tampoco', () => {
        expect(pausaDemasiadoCorta(rollo(25, 3000))).toBeNull();
    });

    it('justo en el límite no avisa', () => {
        expect(pausaDemasiadoCorta(rollo(25, 1839))).toBeNull();
        expect(pausaDemasiadoCorta(rollo(25, 1838))).toBeTruthy();
    });
});
