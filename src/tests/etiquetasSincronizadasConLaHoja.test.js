import { describe, it, expect } from 'vitest';
import { buildLabelBatch, esPackDeSoloDesayunos } from '../utils/labels/labelDomain.js';

/**
 * Las etiquetas y la hoja de produccion tienen que decir lo mismo: si la hoja
 * manda a cocinar 20 platos y salen 8 etiquetas, alguien empaca a ciegas.
 *
 * Estos son los tres desfases encontrados el 1 de setiembre de 2026, revisando
 * las etiquetas del miercoles 2 contra la hoja ya corregida.
 */
const MENUS = {
    desayuno: { platos: [
        { proteina: 'Gallo pinto con huevos resueltos' },
        { proteina: 'Burritos con queso, jamon y frijoles' },
        { proteina: 'Prensadas con queso' },
        { proteina: 'Gallo pinto con huevos con tomate' },
        { proteina: 'Gallo pinto con queso' }
    ] },
    cena: { sinCarbos: { platos: [
        { proteina: 'Carne mechada en salsa criolla' },
        { proteina: 'Pollo achiotado' }
    ] } }
};

const pedido = (extra) => ({
    id: 'x', estado: 'confirmed', fechas_entrega: ['2026-09-02'], fecha_entrega: '2026-09-02',
    cliente: 'Cliente', telefono: '80000001', ...extra
});

const etiquetasDe = (o) => {
    const b = buildLabelBatch([o], '2026-09-02', MENUS);
    return b.totalLabels;
};

describe('un plato que se repite dentro del pack', () => {
    it('saca tantas etiquetas como veces se hace', () => {
        // Christopher Ulloa: 8 recetas, 20 platos (2 de casi todas, 4 de dos).
        // Salian 8 etiquetas, una por receta.
        const o = pedido({
            cliente: 'Christopher Ulloa',
            plan: 'PERSONALIZADO — Christopher Ulloa (120 g)',
            cantidadMenus: 1,
            items: [{
                nombre: 'PERSONALIZADO — Christopher Ulloa (120 g)', cantidad: 1,
                proteinas: ['Albóndigas', 'Pollo teriyaki', 'Fajitas de lomo', 'Filet de tilapia'],
                cantidades: [2, 2, 4, 4]
            }]
        });
        expect(etiquetasDe(o)).toBe(12);
    });
});

describe('los packs de desayuno se cuentan aparte', () => {
    it('dos packs de desayunos dan el doble de etiquetas', () => {
        // Christopher lleva UN pack de almuerzo y DOS de desayunos.
        const o = pedido({
            cliente: 'Christopher Ulloa',
            plan: 'PERSONALIZADO — Christopher Ulloa (120 g)',
            cantidadMenus: 1, incluyeDesayuno: true, packsDesayuno: 2,
            items: [{
                nombre: 'PERSONALIZADO — Christopher Ulloa (120 g)', cantidad: 1,
                proteinas: ['Albóndigas'], cantidades: [1]
            }]
        });
        // 1 almuerzo + 5 desayunos x 2 packs
        expect(etiquetasDe(o)).toBe(11);
    });
});

describe('un personalizado no se parte en almuerzo y cena', () => {
    it('no le agrega las cenas del menu de esta semana', () => {
        // A Fatima Arauz se le repusieron CINCO cenas del menu del 25 al 31 de
        // agosto. Como el nombre dice "cenas", las etiquetas le sumaban ademas
        // las cinco del menu de cenas ACTIVO: diez etiquetas para cinco envases.
        const o = pedido({
            cliente: 'Fátima Arauz Reyes',
            plan: 'PERSONALIZADO — CENAS Sin Carbos Fátima Arauz (menú 25-31 ago) (120 g)',
            cantidadMenus: 1,
            items: [{
                nombre: 'PERSONALIZADO — CENAS Sin Carbos Fátima Arauz (menú 25-31 ago) (120 g)',
                cantidad: 1,
                proteinas: ['Pollo al ajillo', 'Pollo al pesto']
            }]
        });
        expect(etiquetasDe(o)).toBe(2);
    });
});

describe('un pedido que YA es de desayunos', () => {
    it('no recibe ademas los desayunos de regalia', () => {
        // Angie Navarro lleva "Paquete mensual desayunos (6 por semana)": sus
        // platos YA son los desayunos. Se le sumaban 5 mas del menu de la
        // semana, que ella no pidio.
        const o = pedido({
            cliente: 'Angie Navarro', plan: 'Individuales', cantidadMenus: 1,
            items: [{
                nombre: 'Paquete mensual desayunos ( 6 por semana)', cantidad: 1,
                proteinas: Array.from({ length: 6 }, () => 'Gallo pinto con huevo')
            }]
        });
        expect(etiquetasDe(o)).toBe(6);
    });

    it('un pack de ALMUERZOS con desayunos de regalia si los recibe', () => {
        // "Pack Regular con desayunos" es un pack de almuerzos que REGALA
        // desayunos: sus platos son almuerzos y los desayunos van aparte.
        expect(esPackDeSoloDesayunos('🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Regular')).toBe(false);
        expect(esPackDeSoloDesayunos('Almuerzo y Cena - Pack Regular Semanal con Desayunos')).toBe(false);
        expect(esPackDeSoloDesayunos('Pack mensual Regular con desayunos')).toBe(false);
    });

    it('reconoce el pack que es SOLO de desayunos', () => {
        expect(esPackDeSoloDesayunos('Paquete mensual desayunos ( 6 por semana)')).toBe(true);
        expect(esPackDeSoloDesayunos('Desayunos de la Semana')).toBe(true);
        expect(esPackDeSoloDesayunos('Pack Bajo Calorías')).toBe(false);
    });
});

describe('el filtro de desayunos no se pasa de listo', () => {
    it('un pack de almuerzos cuyo texto menciona desayunos SI los recibe', () => {
        // "20 COMIDAS Y 10 DESAYUNOS" dentro de un Pack Bajo Calorias son
        // almuerzos con regalia, no un pedido de puros desayunos.
        const o = pedido({
            plan: 'Pack Bajo Calorías', cantidadMenus: 1,
            items: [{ nombre: '20 COMIDAS Y 10 DESAYUNOS', cantidad: 1,
                      proteinas: ['Milanesa de pollo'] }]
        });
        const b = buildLabelBatch([o], '2026-09-02', MENUS);
        expect(b.groups.some(g => g.tipo === 'Desayuno')).toBe(true);
    });
});
