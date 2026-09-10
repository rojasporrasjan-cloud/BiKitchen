import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    anotarLecturas, lecturasDeHoy, reiniciarContador, diaDeCuota,
    cuandoSeReinicia, faltaParaReiniciar, LIMITE_DIARIO
} from '../utils/contadorFirestore.js';

/**
 * El 3 de setiembre de 2026 se agotó la cuota diaria en plena preparación de la
 * hoja de cocina. Nadie lo vio venir porque no hay forma de saber cuánto queda:
 * Firebase no lo dice. Esto cuenta lo que gasta la app, que es de donde sale
 * casi todo — cada pantalla del panel se baja los 545 pedidos.
 */
beforeEach(() => {
    localStorage.clear();
});

describe('contar lo que se lee', () => {
    it('empieza en cero', () => {
        const r = lecturasDeHoy();
        expect(r.total).toBe(0);
        expect(r.restante).toBe(LIMITE_DIARIO);
        expect(r.nivel).toBe('bien');
    });

    it('suma cada lectura', () => {
        anotarLecturas(545, 'pedidos');
        anotarLecturas(545, 'pedidos');
        expect(lecturasDeHoy().total).toBe(1090);
    });

    it('dice de dónde salió el gasto, de más a menos', () => {
        anotarLecturas(545, 'Pedidos');
        anotarLecturas(1090, 'Clientes');
        anotarLecturas(60, 'Menús');
        const { porMotivo } = lecturasDeHoy();
        expect(porMotivo[0]).toEqual(['Clientes', 1090]);
        expect(porMotivo[1]).toEqual(['Pedidos', 545]);
    });

    it('lo que resta baja', () => {
        anotarLecturas(20000, 'pedidos');
        const r = lecturasDeHoy();
        expect(r.restante).toBe(30000);
        expect(r.fraccion).toBeCloseTo(0.4, 5);
    });

    it('avisa al 75% y alerta al 90%', () => {
        anotarLecturas(38000, 'x');           // 76%
        expect(lecturasDeHoy().nivel).toBe('aviso');
        anotarLecturas(7000, 'x');            // 90%
        expect(lecturasDeHoy().nivel).toBe('alerta');
    });

    it('pasado el límite no se pasa de 100% ni queda negativo', () => {
        anotarLecturas(80000, 'x');
        const r = lecturasDeHoy();
        expect(r.fraccion).toBe(1);
        expect(r.restante).toBe(0);
    });
});

describe('lo que no debe contar', () => {
    it('ignora ceros y basura', () => {
        anotarLecturas(0, 'x');
        anotarLecturas(-5, 'x');
        anotarLecturas('muchas', 'x');
        anotarLecturas(null, 'x');
        expect(lecturasDeHoy().total).toBe(0);
    });

    it('no revienta sin localStorage', () => {
        const real = globalThis.localStorage;
        Object.defineProperty(globalThis, 'localStorage', {
            value: { getItem() { throw new Error('modo privado'); },
                     setItem() { throw new Error('modo privado'); },
                     clear() {} },
            configurable: true
        });
        expect(() => anotarLecturas(100, 'x')).not.toThrow();
        expect(() => lecturasDeHoy()).not.toThrow();
        expect(lecturasDeHoy().total).toBe(0);
        Object.defineProperty(globalThis, 'localStorage', { value: real, configurable: true });
    });
});

describe('el día es el del PACÍFICO, no el nuestro', () => {
    /**
     * La cuota se reinicia a medianoche del Pacífico. Un martes a las 11 de la
     * noche en Costa Rica ya es miércoles allá — y esa es justo la hora en que
     * se prepara la hoja, así que contar por el día local daría el número
     * equivocado en el peor momento.
     */
    it('a las 11 de la noche de Costa Rica ya es el día siguiente allá', () => {
        // 3 set 23:00 en Costa Rica (UTC-6) = 4 set 05:00 UTC = 3 set 22:00 en Pacífico
        expect(diaDeCuota(new Date('2026-09-04T05:00:00Z'))).toBe('2026-09-03');
        // 4 set 08:00 UTC = 4 set 01:00 Pacífico -> ya es el día nuevo
        expect(diaDeCuota(new Date('2026-09-04T08:00:00Z'))).toBe('2026-09-04');
    });

    it('la cuenta del día anterior no se arrastra', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-09-04T05:00:00Z'));   // 3 set en Pacífico
        anotarLecturas(30000, 'ayer');
        expect(lecturasDeHoy().total).toBe(30000);

        vi.setSystemTime(new Date('2026-09-04T08:00:00Z'));   // 4 set en Pacífico
        expect(lecturasDeHoy().total).toBe(0);
        expect(lecturasDeHoy().restante).toBe(LIMITE_DIARIO);
        vi.useRealTimers();
    });
});

describe('cuándo se reinicia', () => {
    it('cae a medianoche del Pacífico', () => {
        const cuando = cuandoSeReinicia(new Date('2026-09-04T05:00:00Z'));
        expect(diaDeCuota(new Date(cuando.getTime() + 60000))).toBe('2026-09-04');
    });

    it('lo dice en horas y minutos', () => {
        // 05:00 UTC del 4 set; el reinicio es a las 07:00 UTC -> 2 horas
        expect(faltaParaReiniciar(new Date('2026-09-04T05:00:00Z'))).toMatch(/^en 1 h|^en 2 h/);
    });
});

describe('reiniciar a mano', () => {
    it('deja la cuenta en cero', () => {
        anotarLecturas(12345, 'x');
        reiniciarContador();
        expect(lecturasDeHoy().total).toBe(0);
    });
});
