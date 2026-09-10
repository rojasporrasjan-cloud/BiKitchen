import { describe, it, expect, beforeEach } from 'vitest';
import {
    laCuotaSeAcabo, anotarCuotaAgotada, olvidarCuotaAgotada,
    errorDeCuota, esErrorDeCuota, DESCANSO_MS
} from './cuotaDeFirebase';

describe('cuotaDeFirebase', () => {
    beforeEach(() => olvidarCuotaAgotada());

    it('arranca sin cuota agotada', () => {
        expect(laCuotaSeAcabo()).toBe(false);
    });

    it('al anotarla, deja de intentar durante el descanso', () => {
        const t = 1_000_000;
        anotarCuotaAgotada(t);
        expect(laCuotaSeAcabo(t)).toBe(true);
        expect(laCuotaSeAcabo(t + DESCANSO_MS - 1)).toBe(true);
    });

    it('pasado el descanso vuelve a dejar intentar solo', () => {
        const t = 1_000_000;
        anotarCuotaAgotada(t);
        expect(laCuotaSeAcabo(t + DESCANSO_MS)).toBe(false);
        expect(laCuotaSeAcabo(t + DESCANSO_MS + 5000)).toBe(false);
    });

    it('se puede olvidar a mano', () => {
        anotarCuotaAgotada(1_000_000);
        olvidarCuotaAgotada();
        expect(laCuotaSeAcabo(1_000_000)).toBe(false);
    });

    it('el error lleva el codigo de Firestore y un mensaje para leer', () => {
        const e = errorDeCuota();
        expect(e.code).toBe('resource-exhausted');
        expect(e.cuotaDelDia).toBe(true);
        expect(e.message).toMatch(/1:00 a\.m\./);
        expect(e.message).toMatch(/NO se perdió/);
    });

    it('reconoce el error de cuota, venga de Firestore o nuestro', () => {
        expect(esErrorDeCuota({ code: 'resource-exhausted' })).toBe(true);
        expect(esErrorDeCuota(errorDeCuota())).toBe(true);
    });

    it('no confunde otros errores con falta de cuota', () => {
        expect(esErrorDeCuota({ code: 'permission-denied' })).toBe(false);
        expect(esErrorDeCuota({ code: 'unavailable' })).toBe(false);
        expect(esErrorDeCuota(new Error('cualquier cosa'))).toBe(false);
        expect(esErrorDeCuota(null)).toBe(false);
        expect(esErrorDeCuota(undefined)).toBe(false);
    });
});
