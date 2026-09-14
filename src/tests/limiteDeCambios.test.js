import { describe, it, expect } from 'vitest';
import {
    contarCambios, cambiosEscritos, cambiosElegidosEnLaWeb, avisoDeCambiosDeMas,
    avisosDeCambiosEnLaHoja, MAX_CAMBIOS_POR_PACK
} from '../utils/limiteDeCambios';

/**
 * Los textos son los de verdad, del sábado 12 y el lunes 14 de setiembre de 2026.
 */

describe('contar cambios escritos', () => {
    it('Christian Vargas: 4 cambios', () => {
        const t = 'Cambiar torta de yuca por PURE DE PAPA · Cambiar albondigas de res por POLLO EN SALSA TERIYAKI · Cambiar yuca frita por PURE DE PAPA · Cambiar filet de tilapia por CARNE MECHADA';
        expect(cambiosEscritos(t)).toHaveLength(4);
    });

    it('Karla Juárez: "cochinita y almuercitos por…" son 2 en una frase', () => {
        expect(cambiosEscritos('Cambiar cochinita y almuercitos por fajitas de lomo encebolladas y otro plato de pollo napolitano')).toHaveLength(2);
    });

    it('Alexandra: un "cambiar … por" y dos flechas del panel son 3', () => {
        const t = 'Cambiar fajitas de cerdo por MILANESA DE POLLO (chat 2 set) · Plato 2 (Cochinita pibil) → Fajitas de pollo en salsa de hongos · Plato 4 (Fajitas de lomo con chimi) → Pollo teriyaki';
        expect(cambiosEscritos(t)).toHaveLength(3);
    });

    it('un solo cambio', () => {
        expect(cambiosEscritos('Cambiar chayote salteado por Zucchinis salteados')).toHaveLength(1);
        expect(cambiosEscritos('cambiar gallo pintos por omelette')).toHaveLength(1);
    });

    it('"en vez de" también es un cambio', () => {
        expect(cambiosEscritos('Omelette en vez de pancakes')).toHaveLength(1);
    });

    /** Lo que decidió Jan: las restricciones se aceptan siempre, aparte. */
    it('las restricciones NO cuentan', () => {
        expect(cambiosEscritos('NO MARISCOS · No lacteos · sin cebolla · NO CONSUMIMOS PESCADO NI MARISCOS.')).toHaveLength(0);
    });

    it('una restricción y un cambio: 1', () => {
        expect(cambiosEscritos('No lacteos, cambiar pancakes por omelette')).toHaveLength(1);
    });

    it('no parte un plato largo que tiene "y" en el nombre', () => {
        expect(cambiosEscritos('Cambiar el arroz por pollo en salsa de hongos y champiñones con papas')).toHaveLength(1);
    });

    /** Marianela Alfaro: una flecha en una nota interna no es un cambio de comida. */
    it('una flecha suelta en una nota interna no cuenta', () => {
        const t = 'Cliente nueva, primera entrega 5 set. Lugar escrito → Gina como "Alajuela Tejar" - confirmar la zona exacta';
        expect(cambiosEscritos(t)).toHaveLength(0);
    });

    it('notas sin cambios', () => {
        expect(cambiosEscritos('ENTREGAR DESPUES DE LAS 11 AM. · Poner los packs en bolsa.')).toHaveLength(0);
        expect(cambiosEscritos('')).toHaveLength(0);
    });
});

describe('cambios elegidos en la web', () => {
    it('suma proteína, vegetal y harina de todos los ítems', () => {
        const pedido = {
            items: [
                { customizations: { proteinChanges: [{ dishNumber: 1, newValue: 'Tilapia' }], vegeChanges: [{ dishNumber: 2, newValue: 'Brócoli' }], carboChanges: [] } },
                { customizations: { carboChanges: [{ dishNumber: 3, newValue: 'Puré' }] } }
            ]
        };
        expect(cambiosElegidosEnLaWeb(pedido)).toBe(3);
    });

    it('sin customizations: 0', () => {
        expect(cambiosElegidosEnLaWeb({ items: [{ nombre: 'Pack' }] })).toBe(0);
    });
});

describe('el total del pedido', () => {
    it('suma web + escritos', () => {
        const pedido = {
            items: [{ customizations: { proteinChanges: [{ dishNumber: 1, newValue: 'Tilapia' }] } }],
            observaciones: 'Cambiar torta de yuca por PURE DE PAPA · Cambiar yuca frita por arroz'
        };
        const c = contarCambios(pedido);
        expect([c.total, c.web, c.escritos.length, c.seExcede]).toEqual([3, 1, 2, true]);
    });

    it('exactamente 2 no se pasa', () => {
        expect(contarCambios({ observaciones: 'Cambiar A por B · Cambiar C por D' }).seExcede).toBe(false);
        expect(MAX_CAMBIOS_POR_PACK).toBe(2);
    });
});

describe('avisos', () => {
    it('al importar: avisa con cuántos trae', () => {
        expect(avisoDeCambiosDeMas({ observaciones: 'Cambiar A por B · Cambiar C por D · Cambiar E por F' })).toMatch(/3 cambios/);
        expect(avisoDeCambiosDeMas({ observaciones: 'Cambiar A por B' })).toBeNull();
    });

    it('en la hoja: amarillo, y no avisa de cancelados', () => {
        const avisos = avisosDeCambiosEnLaHoja([
            { id: 'c', cliente: 'Christian Vargas', status: 'confirmed', observaciones: 'Cambiar A por B · Cambiar C por D · Cambiar E por F' },
            { id: 'x', cliente: 'Cancelado', status: 'cancelled', observaciones: 'Cambiar A por B · Cambiar C por D · Cambiar E por F' },
            { id: 'k', cliente: 'Karla', status: 'confirmed', observaciones: 'Cambiar A por B' }
        ]);
        expect(avisos).toHaveLength(1);
        expect(avisos[0]).toMatchObject({ pedidoId: 'c', cliente: 'Christian Vargas', gravedad: 'media' });
    });
});

describe('conectado a Importar WhatsApp', async () => {
    const { buildPedidoFromImport, avisosDelPedido } = await import('../utils/buildPedidoFromImport');
    const { parseOrderBlock } = await import('../utils/parseOrderText');

    it('un pedido pegado con 3 cambios sale con el aviso', () => {
        const texto = `Cliente: Ana Prueba
Teléfono: 88887777
Lugar: Moravia

1 Pack Bajo Calorías - ₡25000

Notas: Cambiar arroz por puré · Cambiar chayote por brócoli · Cambiar tilapia por pollo

Entrega:
Sábado 19 setiembre`;
        const pedido = buildPedidoFromImport(parseOrderBlock(texto, new Date('2026-09-14T12:00:00-06:00')), {});
        expect(avisosDelPedido(pedido).join(' ')).toMatch(/3 cambios de ingredientes/);
    });
});
