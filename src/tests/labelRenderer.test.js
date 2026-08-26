import { describe, it, expect } from 'vitest';
import { fitText, mmToPx, LABEL_WIDTH_PX, LABEL_HEIGHT_PX } from '../utils/labels/labelRenderer';
import { packRaster, HEAD_DOTS } from '../services/printing/phomemoProtocol';

/**
 * El dibujo de la etiqueta no se puede probar entero sin un canvas de verdad
 * (jsdom no lo trae), pero las dos partes que de verdad pueden arruinar una
 * etiqueta SÍ son puras y se prueban acá:
 *
 *   fitText()    → decide si un nombre cabe, se achica o se recorta
 *   packRaster() → convierte los puntos en los bytes que quema el cabezal
 *
 * Un error en cualquiera de las dos sale impreso en 150 etiquetas.
 */

/** Contexto de dibujo falso: cada carácter mide `size * 0.5` de ancho. */
const ctxFalso = () => ({
    font: '',
    measureText(t) {
        const size = parseInt(String(this.font).match(/(\d+)px/)?.[1] || '10', 10);
        return { width: t.length * size * 0.5 };
    }
});

describe('fitText — que el nombre del plato quepa', () => {
    const opts = { maxWidth: 224, maxLines: 2, maxSize: 28, minSize: 12 };

    it('un nombre corto se imprime lo más grande posible', () => {
        const r = fitText(ctxFalso(), 'Arroz', opts);
        expect(r.lines).toEqual(['Arroz']);
        expect(r.fontSize).toBe(28);
        expect(r.truncated).toBeFalsy();
    });

    it('prefiere partir en dos líneas antes que achicar la letra', () => {
        // Criterio del renderizador: el nombre del plato se lee de lejos, así
        // que gana el tamaño grande en dos renglones sobre una línea diminuta.
        const r = fitText(ctxFalso(), 'Pollo en salsa de cury y coco', opts);

        expect(r.lines).toHaveLength(2);
        expect(r.fontSize).toBe(28);
        expect(r.lines.join(' ')).toBe('Pollo en salsa de cury y coco');
    });

    it('solo achica cuando ni en dos líneas cabe', () => {
        const angosto = { ...opts, maxWidth: 90 };
        const r = fitText(ctxFalso(), 'Pollo en salsa de cury y coco', angosto);

        expect(r.fontSize).toBeLessThan(28);
        expect(r.fontSize).toBeGreaterThanOrEqual(12);
    });

    it('un nombre largo se parte en dos líneas sin perder palabras', () => {
        const nombre = 'Albóndigas de res artesanales en salsa de tomate rostizado';
        const r = fitText(ctxFalso(), nombre, opts);

        expect(r.lines.length).toBeLessThanOrEqual(2);
        // Nada se pierde por el camino
        expect(r.lines.join(' ')).toBe(nombre);
    });

    it('ninguna línea se pasa del ancho de la etiqueta', () => {
        const ctx = ctxFalso();
        const casos = [
            'Arroz',
            'Pollo en salsa de cury y coco',
            'Albóndigas de res artesanales en salsa de tomate rostizado',
            'Pechuga de pollo rellena de espinaca y queso con salsa de champiñones'
        ];

        casos.forEach(nombre => {
            const r = fitText(ctx, nombre, opts);
            ctx.font = `${r.fontSize}px Arial`;
            r.lines.forEach(linea => {
                expect(ctx.measureText(linea).width).toBeLessThanOrEqual(opts.maxWidth);
            });
        });
    });

    it('lo que no cabe ni al mínimo se recorta con puntos suspensivos', () => {
        const eterno = 'Pechuga de pollo rellena de espinaca y queso con salsa de champiñones al vino blanco y hierbas frescas del huerto';
        const r = fitText(ctxFalso(), eterno, opts);

        expect(r.lines.length).toBeLessThanOrEqual(2);
        expect(r.truncated).toBe(true);
        expect(r.lines[r.lines.length - 1]).toMatch(/…$/);
    });

    it('un texto vacío no rompe nada', () => {
        expect(fitText(ctxFalso(), '', opts).lines).toEqual([]);
        expect(fitText(ctxFalso(), null, opts).lines).toEqual([]);
    });

    it('nunca baja del tamaño mínimo legible', () => {
        const r = fitText(ctxFalso(), 'Palabraskilométricasimposibles'.repeat(4), opts);
        expect(r.fontSize).toBeGreaterThanOrEqual(opts.minSize);
    });
});

describe('medidas de la etiqueta', () => {
    it('30 × 20 mm a 203 dpi son 240 × 160 puntos', () => {
        expect(LABEL_WIDTH_PX).toBe(240);
        expect(LABEL_HEIGHT_PX).toBe(160);
        expect(mmToPx(30)).toBe(240);
        expect(mmToPx(40)).toBe(320);
    });
});

describe('packRaster — los bytes que van al cabezal', () => {
    /** Mapa de bits de prueba: `width` × `height`, con `fn(x,y)` decidiendo la tinta. */
    const mono = (width, height, fn) => ({
        width, height,
        bits: Uint8Array.from({ length: width * height }, (_, i) =>
            fn(i % width, Math.floor(i / width)) ? 1 : 0)
    });

    it('devuelve exactamente ancho × alto bytes', () => {
        const r = packRaster(mono(240, 160, () => 0), 0, 30);
        expect(r.data.length).toBe(30 * 160);
        expect(r.widthBytes).toBe(30);
        expect(r.lines).toBe(160);
    });

    it('un mapa en blanco no quema ni un punto', () => {
        const r = packRaster(mono(240, 160, () => 0), 0, 30);
        expect(r.data.every(b => b === 0)).toBe(true);
    });

    it('un mapa lleno quema todos los puntos', () => {
        const r = packRaster(mono(240, 160, () => 1), 0, 30);
        expect(r.data.every(b => b === 0xff)).toBe(true);
    });

    it('el primer punto de la línea es el bit más significativo', () => {
        // Solo el punto x=0: tiene que salir como 0b10000000
        const r = packRaster(mono(8, 1, (x) => x === 0), 0, 1);
        expect(r.data[0]).toBe(0x80);

        // Solo el punto x=7: el menos significativo
        const r2 = packRaster(mono(8, 1, (x) => x === 7), 0, 1);
        expect(r2.data[0]).toBe(0x01);
    });

    it('el desplazamiento corre la imagen sin deformarla', () => {
        const sin = packRaster(mono(8, 1, (x) => x === 0), 0, 2);
        expect(sin.data[0]).toBe(0x80);
        expect(sin.data[1]).toBe(0x00);

        // Corrido 8 puntos: el mismo dibujo, un byte más a la derecha
        const con = packRaster(mono(8, 1, (x) => x === 0), 8, 2);
        expect(con.data[0]).toBe(0x00);
        expect(con.data[1]).toBe(0x80);
    });

    it('centrar la etiqueta en el cabezal de 384 puntos no la recorta', () => {
        const centrado = Math.round((HEAD_DOTS - 240) / 2);
        const r = packRaster(mono(240, 160, () => 1), centrado, HEAD_DOTS / 8);

        expect(r.data.length).toBe(48 * 160);
        // Los 240 puntos de la etiqueta siguen ahí
        const encendidos = [...r.data].reduce(
            (acc, b) => acc + (b.toString(2).match(/1/g) || []).length, 0
        );
        expect(encendidos).toBe(240 * 160);
    });

    it('lo que queda fuera del ancho no se dibuja', () => {
        // Imagen de 240 puntos empujada casi fuera: no debe desbordar el búfer
        const r = packRaster(mono(240, 2, () => 1), 380, HEAD_DOTS / 8);
        expect(r.data.length).toBe(48 * 2);
    });
});
