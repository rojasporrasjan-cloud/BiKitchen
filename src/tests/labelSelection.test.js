import { describe, it, expect } from 'vitest';
import {
    estaIncluido,
    contarIncluidos,
    estadoSeccion,
    alternarGrupo,
    alternarSeccion,
    fijarGrupos
} from '../utils/labels/labelSelection';

const IDS = ['Regular||pollo', 'Regular||res', 'Regular||cerdo'];

describe('selección de grupos', () => {
    it('todo entra por defecto: lo nuevo no se queda afuera sin avisar', () => {
        const vacio = new Set();
        IDS.forEach(id => expect(estaIncluido(vacio, id)).toBe(true));
        expect(estadoSeccion(vacio, IDS)).toBe('todos');
    });

    it('alternar un grupo lo saca y lo vuelve a meter', () => {
        let ex = new Set();
        ex = alternarGrupo(ex, 'Regular||res');
        expect(estaIncluido(ex, 'Regular||res')).toBe(false);
        expect(contarIncluidos(ex, IDS)).toBe(2);

        ex = alternarGrupo(ex, 'Regular||res');
        expect(estaIncluido(ex, 'Regular||res')).toBe(true);
        expect(contarIncluidos(ex, IDS)).toBe(3);
    });

    it('no muta el conjunto anterior: React necesita una referencia nueva', () => {
        const antes = new Set();
        const despues = alternarGrupo(antes, 'Regular||pollo');
        expect(antes.size).toBe(0);
        expect(despues).not.toBe(antes);
    });
});

describe('el botón de la sección', () => {
    it('con TODAS incluidas, las quita todas', () => {
        const ex = alternarSeccion(new Set(), IDS);
        expect(contarIncluidos(ex, IDS)).toBe(0);
        expect(estadoSeccion(ex, IDS)).toBe('ninguno');
    });

    it('con NINGUNA incluida, las incluye todas', () => {
        const ninguna = fijarGrupos(new Set(), IDS, false);
        const ex = alternarSeccion(ninguna, IDS);
        expect(contarIncluidos(ex, IDS)).toBe(3);
        expect(estadoSeccion(ex, IDS)).toBe('todos');
    });

    it('a medias incluye el resto, no borra lo ya marcado', () => {
        let ex = alternarGrupo(new Set(), 'Regular||res'); // queda 1 fuera
        expect(estadoSeccion(ex, IDS)).toBe('algunos');

        ex = alternarSeccion(ex, IDS);
        expect(contarIncluidos(ex, IDS)).toBe(3);
    });

    it('no toca los grupos de otra sección', () => {
        const otros = ['Keto||pollo', 'Keto||res'];
        let ex = new Set();
        ex = alternarSeccion(ex, IDS);            // quita las de Regular
        expect(contarIncluidos(ex, IDS)).toBe(0);
        expect(contarIncluidos(ex, otros)).toBe(2);
    });

    it('ida y vuelta deja todo como estaba', () => {
        const inicial = alternarGrupo(new Set(), 'Regular||cerdo');
        const quitadas = fijarGrupos(inicial, IDS, false);
        const devueltas = fijarGrupos(quitadas, IDS, true);
        expect(contarIncluidos(devueltas, IDS)).toBe(3);
    });

    it('una sección vacía no rompe nada', () => {
        expect(estadoSeccion(new Set(), [])).toBe('ninguno');
        expect(() => alternarSeccion(new Set(), [])).not.toThrow();
    });
});
