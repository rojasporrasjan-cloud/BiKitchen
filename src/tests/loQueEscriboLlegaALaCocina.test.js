/**
 * Todo lo que se puede escribir en el editor TIENE que llegar a la cocina.
 *
 * De nada sirve poder corregir un pedido si la corrección no baja a la olla. Es
 * el error más caro de esta hoja: quien edita cree que quedó arreglado, la
 * cocina sigue con el dato viejo, y no se ve hasta que el cliente abre la bolsa.
 *
 * Acá se recorre el camino completo de cada campo:
 *
 *     lo que escribo  ->  cambiosDelPedido  ->  el pedido guardado
 *                     ->  mapPedidosFromLegacy  ->  lo que se cocina
 */

import { describe, it, expect } from 'vitest';
import { cambiosDelPedido } from '../utils/guardarPedidoDeLaHoja';
import { mapPedidosFromLegacy, buildKitchenSheetData } from '../utils/logisticsUtils';
import { getDefaultGrams, mapPackNameToMenuKey, esPersonalizado } from '../utils/packClassification';
import { textoLlevaCena, packSeParteEnAlmuerzoYCena } from '../utils/labels/labelDomain';
import { listarSustituciones } from '../utils/productionHelpers';

/** Aplica al pedido lo que devolvió el editor, como hace Firestore. */
const guardar = (crudo, edicion) => ({ ...crudo, ...(cambiosDelPedido(crudo, edicion) || {}) });

/** Los gramos de proteína que la cocina va a preparar, por plato. */
const gramosEnCocina = (crudo) => {
    const [pedido] = mapPedidosFromLegacy([crudo]);
    const hoja = buildKitchenSheetData([pedido], {}, { marginPercent: 0 });
    const salida = {};
    Object.values(hoja.porMenu || {}).forEach(menu => {
        Object.values(menu.platos || {}).forEach(p => {
            if (p.proteina?.nombre) salida[p.proteina.nombre] = p.proteina.totalGramos;
        });
    });
    return salida;
};

const PEDIDO = {
    id: 'ORD-1',
    cliente: 'Patrick Santamaría',
    plan: 'Pack 5 Proteínas (250g)',
    observaciones: '',
    estado: 'confirmed',
    fecha_entrega: '2026-09-14',
    fechas_entrega: ['2026-09-14', '2026-09-21'],
    items: [{
        nombre: 'Pack 5 Proteínas (250g)',
        cantidad: 1,
        proteinas: ['Pollo al pesto', 'Carne mechada']
    }]
};

describe('el NOMBRE DEL PACK llega a la cocina', () => {

    it('cambiar los gramos cambia lo que se cocina', () => {
        // El caso de Patrick: su pack decía 250 y él es de 500
        const antes = guardar(PEDIDO, { observaciones: '', plan: 'Pack 5 Proteínas (250g)' });
        const despues = guardar(PEDIDO, { observaciones: '', plan: 'Pack 5 Proteínas (500g)' });

        expect(getDefaultGrams(antes.plan)).toBe(250);
        expect(getDefaultGrams(despues.plan)).toBe(500);
        expect(despues.plan).toBe('Pack 5 Proteínas (500g)');
    });

    it('cambiar la familia cambia el menú que se le cocina', () => {
        const aSinCarbos = guardar(PEDIDO, { observaciones: '', plan: 'Pack Sin Carbos' });
        expect(mapPackNameToMenuKey(aSinCarbos.plan)).toBe('sinCarbos');

        const aKeto = guardar(PEDIDO, { observaciones: '', plan: 'Pack Keto' });
        expect(mapPackNameToMenuKey(aKeto.plan)).toBe('keto');
    });

    it('escribir PERSONALIZADO lo manda a su propia hoja', () => {
        const p = guardar(PEDIDO, { observaciones: '', plan: 'PERSONALIZADO — Mayela (Sin Carbos, 90 g)' });

        expect(esPersonalizado(p.plan)).toBe(true);
        // Y sigue sabiendo su familia y su gramaje
        expect(mapPackNameToMenuKey(p.plan)).toBe('sinCarbos');
        expect(getDefaultGrams(p.plan)).toBe(90);
    });
});

describe('escribir CENAS le arma la hoja de cenas', () => {

    it('poner "almuerzo y cena" en el nombre parte el pack en dos', () => {
        const conCena = guardar(PEDIDO, {
            observaciones: '',
            plan: 'Pack Bajo Calorías Almuerzo y Cena'
        });

        expect(textoLlevaCena(conCena.plan)).toBe(true);
        expect(packSeParteEnAlmuerzoYCena(conCena.plan, conCena.plan)).toBe(true);
    });

    it('escribirlo en las NOTAS también cuenta', () => {
        // Gina lo anota en la especificación, no siempre en el nombre
        expect(textoLlevaCena('lleva almuerzo y cena')).toBe(true);
        expect(textoLlevaCena('pack quincenal con regalía de desayunos')).toBe(true);
    });

    it('y escribir que NO lleva cena la quita', () => {
        // El caso de Marlon
        const sinCena = guardar(PEDIDO, {
            observaciones: 'no lleva cena',
            plan: 'Pack Sin Carbos'
        });
        expect(textoLlevaCena(sinCena.observaciones)).toBe(false);
    });
});

describe('las PROTEÍNAS que escribo se cocinan', () => {

    it('lo que escribo es lo que baja a la olla', () => {
        const p = guardar(PEDIDO, {
            observaciones: '',
            proteinas: ['Albóndigas de res', 'Pollo al ajillo', 'Cerdo en salsa']
        });

        const enCocina = gramosEnCocina(p);
        expect(Object.keys(enCocina)).toContain('Albóndigas de res');
        expect(Object.keys(enCocina)).toContain('Pollo al ajillo');
        // Y las viejas ya no están
        expect(Object.keys(enCocina)).not.toContain('Carne mechada');
    });

    it('se escriben DENTRO del item, que es donde la hoja las lee', () => {
        const p = guardar(PEDIDO, { observaciones: '', proteinas: ['Pollo al ajillo'] });
        // Escribirlas en la raíz no rompe nada visible pero no llega a cocina
        expect(p.items[0].proteinas).toEqual(['Pollo al ajillo']);
    });
});

describe('los CAMBIOS escritos en las notas llegan al granel', () => {

    it('un "cambiar X por Y" se lee como sustitución', () => {
        const p = guardar(PEDIDO, {
            observaciones: 'Cambiar pollo al pesto por carne mechada',
            plan: 'Pack Bajo Calorías'
        });

        const subs = listarSustituciones(p);
        expect(subs.length).toBeGreaterThan(0);
        expect(subs.some(s => /carne mechada/i.test(s.a || ''))).toBe(true);
    });

    it('la nota queda guardada tal cual se escribió', () => {
        const p = guardar(PEDIDO, { observaciones: 'NO VAINICAS · sin cerdo' });
        expect(p.observaciones).toBe('NO VAINICAS · sin cerdo');
    });
});

describe('la FECHA que escribo mueve el pedido de día', () => {

    it('mover solo esta entrega deja las otras quietas', () => {
        const p = guardar(PEDIDO, {
            observaciones: '',
            fechas: { fechaActual: '2026-09-14', fechaNueva: '2026-09-16' }
        });

        expect(p.fechas_entrega).toEqual(['2026-09-16', '2026-09-21']);
        // La consulta de la hoja filtra por este campo: si no se actualiza, el
        // pedido se cae de la búsqueda y desaparece de todas las hojas
        expect(p.fecha_entrega).toBe('2026-09-16');
    });

    it('mover todas corre el calendario entero', () => {
        const p = guardar(PEDIDO, {
            observaciones: '',
            fechas: { fechaActual: '2026-09-14', fechaNueva: '2026-09-16', todas: true }
        });
        expect(p.fechas_entrega).toEqual(['2026-09-16', '2026-09-23']);
    });
});

describe('lo que NO se tocó no se escribe', () => {
    it('un PATCH vacío gasta cuota y ensucia la fecha de modificación', () => {
        expect(cambiosDelPedido(PEDIDO, {
            observaciones: '',
            plan: 'Pack 5 Proteínas (250g)',
            proteinas: ['Pollo al pesto', 'Carne mechada']
        })).toBeNull();
    });
});
