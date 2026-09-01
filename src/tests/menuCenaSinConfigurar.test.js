import { describe, it, expect } from 'vitest';
import { revisarHoja } from '../utils/revisarHoja';

/**
 * La hoja de produccion cae a DEFAULT_MENUS cuando el menu de cena de la semana
 * esta vacio, y imprime esos platos SIN avisar. Las etiquetas, en cambio, se
 * niegan a generarse. Resultado: se cocina una cena que despues no tiene
 * etiqueta, con platos que nadie configuro.
 *
 * Paso el 2 de setiembre de 2026: `cena.bajoCalorias` estaba vacio y a Angelo
 * Oviedo la hoja le mostro los 5 platos por defecto como si fueran del menu.
 */
const angelo = {
    cliente: 'Angelo Oviedo Montero',
    plan: '🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Bajo Calorías',
    platos: [], items: [], incluyeDesayuno: true
};

const menusConAlmuerzoPeroSinCena = {
    bajoCalorias: [{ numero: 1, proteina: 'Milanesa de pollo' }],
    cena: { bajoCalorias: [], keto: [{ numero: 1, proteina: 'Pollo' }] },
    desayuno: []
};

describe('avisos de menú sin configurar', () => {

    it('avisa que la cena sale de un menú por defecto', () => {
        const { problemas } = revisarHoja([angelo], menusConAlmuerzoPeroSinCena, '2026-09-02');
        const aviso = problemas.find(p => /cena/i.test(p.que) && /defecto|configurad/i.test(p.que));
        expect(aviso).toBeDefined();
        expect(aviso.cliente).toBe('Angelo Oviedo Montero');
        expect(aviso.gravedad).toBe('alta');
    });

    it('avisa que no hay Menú de Desayunos', () => {
        const { problemas } = revisarHoja([angelo], menusConAlmuerzoPeroSinCena, '2026-09-02');
        expect(problemas.some(p => /desayuno/i.test(p.que))).toBe(true);
    });

    it('no avisa cuando el menú de cena SÍ está configurado', () => {
        const conCena = {
            ...menusConAlmuerzoPeroSinCena,
            cena: { bajoCalorias: [{ numero: 1, proteina: 'Pollo mechado' }] }
        };
        const { problemas } = revisarHoja([angelo], conCena, '2026-09-02');
        expect(problemas.some(p => /cena/i.test(p.que) && /defecto/i.test(p.que))).toBe(false);
    });

    it('no molesta a un pack que no lleva cena', () => {
        const kendall = { cliente: 'Kendall Barboza', plan: 'Pack Regular', platos: [], items: [] };
        const { problemas } = revisarHoja([kendall], menusConAlmuerzoPeroSinCena, '2026-09-02');
        expect(problemas.some(p => /cena/i.test(p.que))).toBe(false);
    });
});
