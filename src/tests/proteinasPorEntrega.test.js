import { describe, it, expect } from 'vitest';
import {
    esPackDeProteinas, cuantasProteinas, gramosDelPack, listaDeLaCompra,
    estadoDeLaEntrega, conProteinasDeLaEntrega, leerListaDeProteinas,
    cambioDeProteinas, proteinasSinElegir, entregasDelPedido,
    avisosDeProteinasSinElegir, moverProteinasConLaFecha,
    entregasParaElegir, sugerenciasDeProteinas
} from '../utils/proteinasPorEntrega';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils';

/**
 * Un pack mensual de 5 proteínas de 250 g, como el de Xiomara Vilchez: lunes
 * 14, 21, 28 de setiembre y 5 de octubre. Al comprar eligió cinco; la semana
 * del 21 pide otras.
 */
const mensual = (extra = {}) => ({
    id: 'doc-xiomara',
    cliente: 'Xiomara Vilchez',
    plan: 'pack mensual proteínas 250 g',
    status: 'confirmed',
    fecha_entrega: '2026-09-14',
    fechas_entrega: ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'],
    items: [{
        nombre: 'Pack 5 Proteínas (250g)',
        cantidad: 1,
        plan: 'monthly',
        proteinas: ['Pollo teriyaki', 'Carne mechada', 'Tilapia empanizada', 'Pollo a la naranja', 'Lomo encebollado']
    }],
    ...extra
});

const DEL_21 = ['Pollo caribeño', 'Tortas de carne en salsa', 'Tilapia empanizada', 'Fajitas de res', 'Pollo al curry'];

describe('qué es un pack de proteínas', () => {
    it('reconoce los nombres que se usan de verdad', () => {
        for (const plan of ['pack mensual proteínas 250 g', 'Pack 5 Proteínas (250g)',
            'Pack de 3 proteínas de 500 gramos', 'Pack Proteínas 3 de 250g', 'Pack de 5 proteínas:']) {
            expect(esPackDeProteinas({ plan })).toBe(true);
        }
    });

    /** Un bajo en calorías con porción grande NO es un pack de proteínas sueltas. */
    it('"(200 g de proteína)" en un bajo en calorías no cuenta', () => {
        expect(esPackDeProteinas({ plan: 'Pack Mensual Bajo en Calorías (200 g de proteína)' })).toBe(false);
        expect(esPackDeProteinas({ plan: 'Pack Regular Mensual' })).toBe(false);
    });

    it('lo reconoce aunque el plan diga otra cosa y el ítem sí lo diga', () => {
        expect(esPackDeProteinas({ plan: 'Personalizado', items: [{ nombre: 'Pack 5 Proteínas (250g)' }] })).toBe(true);
    });
});

describe('cuántas y de cuánto', () => {
    it('saca el número del nombre', () => {
        expect(cuantasProteinas({ plan: 'Pack 5 Proteínas (250g)' })).toBe(5);
        expect(cuantasProteinas({ plan: 'Pack Proteínas 3 de 250g' })).toBe(3);
        expect(cuantasProteinas({ plan: 'Pack de 3 proteínas de 500 gramos' })).toBe(3);
    });

    /** El de Alejandra Calderón: el 5 solo está en la nota. */
    it('si el nombre no lo dice, lo busca en la nota', () => {
        expect(cuantasProteinas({ plan: 'Pack Mensual Proteínas 250 g', observaciones: 'Pack mensual de 5 proteinas de 250 g.' })).toBe(5);
    });

    it('los gramos salen del nombre', () => {
        expect(gramosDelPack({ plan: 'Pack de 3 proteínas de 500 gramos' })).toBe('500 g');
        expect(gramosDelPack({ plan: 'Pack 5 Proteínas (250g)' })).toBe('250 g');
    });
});

describe('qué lista le toca a cada entrega', () => {
    it('la primera entrega usa la de la compra, y está bien', () => {
        expect(estadoDeLaEntrega(mensual(), '2026-09-14').origen).toBe('compra');
    });

    /** El problema de siempre: la semana 2 repetía la lista de la compra en silencio. */
    it('de la segunda en adelante sin elegir: FALTA', () => {
        const e = estadoDeLaEntrega(mensual(), '2026-09-21');
        expect(e.origen).toBe('falta');
        expect(e.lista).toEqual(listaDeLaCompra(mensual()));
    });

    it('con la lista elegida, manda la elegida', () => {
        const p = mensual({ proteinasPorEntrega: { '2026-09-21': DEL_21 } });
        expect(estadoDeLaEntrega(p, '2026-09-21')).toEqual({ lista: DEL_21, origen: 'elegida' });
    });
});

describe('la hoja lee la lista de la entrega', () => {
    const p = mensual({ proteinasPorEntrega: { '2026-09-21': DEL_21 } });

    it('la hoja del 21 cocina las del 21', () => {
        const [n] = mapPedidosFromLegacy([p], ['2026-09-21']);
        expect(n.platos.map(x => x.proteina.nombre)).toEqual(DEL_21);
    });

    it('la hoja del 14 sigue cocinando las de la compra', () => {
        const [n] = mapPedidosFromLegacy([p], ['2026-09-14']);
        expect(n.platos[0].proteina.nombre).toBe('Pollo teriyaki');
    });

    it('sin fecha, mapPedidosFromLegacy hace lo de siempre', () => {
        const [n] = mapPedidosFromLegacy([p]);
        expect(n.platos[0].proteina.nombre).toBe('Pollo teriyaki');
    });

    it('conserva los gramos del pack: 250 g por porción', () => {
        const [n] = mapPedidosFromLegacy([p], ['2026-09-21']);
        expect(n.platos[0].proteina.gramosPorPorcion).toBe(250);
    });

    it('la etiqueta y el empaque ven la misma lista (rawPedido)', () => {
        const [n] = mapPedidosFromLegacy([p], ['2026-09-21']);
        expect(n.rawPedido.items[0].proteinas).toEqual(DEL_21);
        expect(n.rawPedido.proteinasDeEstaEntrega).toBe('2026-09-21');
    });

    it('en la hoja de sábado + lunes toma la fecha que le toca', () => {
        const [n] = mapPedidosFromLegacy([p], ['2026-09-19', '2026-09-21']);
        expect(n.platos[0].proteina.nombre).toBe('Pollo caribeño');
    });

    it('nunca modifica el pedido original', () => {
        conProteinasDeLaEntrega(p, ['2026-09-21']);
        expect(p.items[0].proteinas[0]).toBe('Pollo teriyaki');
    });

    /** "Tilapia → Pollo" encima de la lista nueva no tiene sentido. */
    it('quita los cambios por plato y las cantidades corridas de la lista vieja', () => {
        const conCambios = mensual({
            proteinasPorEntrega: { '2026-09-21': ['A', 'B', 'C'] },
            items: [{ ...mensual().items[0], cantidades: [1, 1, 1, 1, 2], customizations: { proteinChanges: [{ dishNumber: 1, newValue: 'X' }], nota: 'ok' } }]
        });
        const c = conProteinasDeLaEntrega(conCambios, '2026-09-21');
        expect(c.items[0].cantidades).toBeUndefined();
        expect(c.items[0].customizations).toEqual({ nota: 'ok' });
    });

    /** Los pedidos viejos guardan los platos en `menu`: si se escribe en `items` la hoja no lo ve. */
    it('en un pedido viejo, pone la lista en `menu`', () => {
        const viejo = { ...mensual({ proteinasPorEntrega: { '2026-09-21': DEL_21 } }), menu: mensual().items, items: [{ nombre: 'resumen' }] };
        const c = conProteinasDeLaEntrega(viejo, '2026-09-21');
        expect(c.menu[0].proteinas).toEqual(DEL_21);
    });

    it('un pack de otra familia no se toca aunque tenga el campo', () => {
        const bajo = { plan: 'Pack Bajo Calorías', proteinasPorEntrega: { '2026-09-21': ['X'] }, items: [] };
        expect(conProteinasDeLaEntrega(bajo, '2026-09-21')).toBe(bajo);
    });
});

describe('pegar la lista de WhatsApp', () => {
    it('una por renglón, sin viñetas ni números', () => {
        expect(leerListaDeProteinas('1. Tilapia empanizada\n- Pollo caribeño\n• Tortas de carne en salsa'))
            .toEqual(['Tilapia empanizada', 'Pollo caribeño', 'Tortas de carne en salsa']);
    });

    /** Milton lleva "Pollo en salsa mediterránea x2": son dos porciones. */
    it('"x2", "(2)" y "2 x" repiten la proteína', () => {
        expect(leerListaDeProteinas('Pollo mediterráneo x2\nTilapia (2)\n2 x Lomo')).toEqual([
            'Pollo mediterráneo', 'Pollo mediterráneo', 'Tilapia', 'Tilapia', 'Lomo', 'Lomo'
        ]);
    });

    it('no confunde "(250g)" con una cantidad', () => {
        expect(leerListaDeProteinas('Pollo teriyaki (250g)')).toEqual(['Pollo teriyaki (250g)']);
    });

    it('ignora los datos del cliente pegados arriba', () => {
        expect(leerListaDeProteinas('Cliente: Ana\nTeléfono: 8888\nProteínas:\nPollo al curry')).toEqual(['Pollo al curry']);
    });
});

describe('guardar', () => {
    it('manda el mapa completo con la fecha nueva', () => {
        const p = mensual({ proteinasPorEntrega: { '2026-09-21': DEL_21 } });
        expect(cambioDeProteinas(p, '2026-09-28', ['A', 'B'])).toEqual({
            proteinasPorEntrega: { '2026-09-21': DEL_21, '2026-09-28': ['A', 'B'] }
        });
    });

    it('si es igual no manda nada (no gasta una escritura)', () => {
        const p = mensual({ proteinasPorEntrega: { '2026-09-21': DEL_21 } });
        expect(cambioDeProteinas(p, '2026-09-21', [...DEL_21])).toBeNull();
    });

    it('vaciar la lista borra la elección y vuelve a la de la compra', () => {
        const p = mensual({ proteinasPorEntrega: { '2026-09-21': DEL_21 } });
        expect(cambioDeProteinas(p, '2026-09-21', [])).toEqual({ proteinasPorEntrega: {} });
    });

    it('limpia espacios y renglones vacíos', () => {
        expect(cambioDeProteinas(mensual(), '2026-09-21', ['  Pollo ', '', ' '])).toEqual({
            proteinasPorEntrega: { '2026-09-21': ['Pollo'] }
        });
    });
});

describe('aviso en la hoja', () => {
    const otros = [
        { id: 'b', cliente: 'Bajo', plan: 'Pack Bajo Calorías', status: 'confirmed', fechas_entrega: ['2026-09-14', '2026-09-21'], items: [] },
        { id: 'semanal', cliente: 'Brandy', plan: 'Pack 5 Proteínas (250g)', fecha_entrega: '2026-09-21', fechas_entrega: ['2026-09-21'], items: [{ proteinas: ['a'] }] }
    ];

    it('avisa del mensual sin elegir en la semana 2, y de nadie más', () => {
        expect(proteinasSinElegir([mensual(), ...otros], ['2026-09-21'])).toEqual([
            { id: 'doc-xiomara', cliente: 'Xiomara Vilchez', fecha: '2026-09-21', plan: 'pack mensual proteínas 250 g' }
        ]);
    });

    it('con la lista elegida ya no avisa', () => {
        expect(proteinasSinElegir([mensual({ proteinasPorEntrega: { '2026-09-21': DEL_21 } })], ['2026-09-21'])).toEqual([]);
    });

    it('la primera entrega no avisa', () => {
        expect(proteinasSinElegir([mensual()], ['2026-09-14'])).toEqual([]);
    });

    it('las entregas salen ordenadas y sin repetir', () => {
        expect(entregasDelPedido(mensual())).toEqual(['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05']);
    });
});

describe('mover una entrega', () => {
    const mapa = { '2026-09-21': ['A'], '2026-09-28': ['B'] };

    it('mover solo el 21 al 22 lleva su lista', () => {
        expect(moverProteinasConLaFecha(mapa, { fechaActual: '2026-09-21', fechaNueva: '2026-09-22' }))
            .toEqual({ '2026-09-22': ['A'], '2026-09-28': ['B'] });
    });

    it('mover todas corre todas las listas los mismos días', () => {
        expect(moverProteinasConLaFecha(mapa, { fechaActual: '2026-09-21', fechaNueva: '2026-09-23', todas: true }))
            .toEqual({ '2026-09-23': ['A'], '2026-09-30': ['B'] });
    });

    it('sin cambio de fecha queda igual', () => {
        expect(moverProteinasConLaFecha(mapa, { fechaActual: '2026-09-21', fechaNueva: '2026-09-21' })).toBe(mapa);
    });
});

describe('el aviso para el recuadro de la hoja', () => {
    it('tiene la forma de los demás avisos y el id para "Arreglar"', () => {
        const [a] = avisosDeProteinasSinElegir([mensual()], ['2026-09-21']);
        expect(a.pedidoId).toBe('doc-xiomara');
        expect(a.cliente).toBe('Xiomara Vilchez');
        expect(a.gravedad).toBe('alta');
        expect(a.que).toMatch(/21/);
    });
});

describe('la pantalla: entregas por día', () => {
    const cancelado = mensual({ id: 'c', cliente: 'Cancelado', status: 'cancelled' });
    const bajo = { id: 'b', cliente: 'Bajo', plan: 'Pack Bajo Calorías', status: 'confirmed', fechas_entrega: ['2026-09-21'], items: [] };
    const ana = mensual({ id: 'ana', cliente: 'Ana', proteinasPorEntrega: { '2026-09-21': DEL_21 } });

    it('agrupa por fecha y solo trae packs de proteínas activos', () => {
        const g = entregasParaElegir([mensual(), ana, cancelado, bajo], { desde: '2026-09-15', hasta: '2026-09-22' });
        expect(g.map(x => x.fecha)).toEqual(['2026-09-21']);
        expect(g[0].filas.map(f => f.pedido.cliente)).toEqual(['Xiomara Vilchez', 'Ana']);
    });

    it('los que faltan van primero', () => {
        const [grupo] = entregasParaElegir([ana, mensual()], { desde: '2026-09-21', hasta: '2026-09-21' });
        expect(grupo.filas[0].origen).toBe('falta');
        expect(grupo.filas[1].origen).toBe('elegida');
    });

    it('cada fila dice qué entrega es, cuántas lleva y lo de la semana anterior', () => {
        const [grupo] = entregasParaElegir([mensual()], { desde: '2026-09-28', hasta: '2026-09-28' });
        const f = grupo.filas[0];
        expect([f.numero, f.total, f.cuantas, f.gramos]).toEqual([3, 4, 5, '250 g']);
        expect(f.anterior).toEqual(listaDeLaCompra(mensual()));
    });

    it('sugiere proteínas del catálogo y de otros packs, sin repetir', () => {
        const s = sugerenciasDeProteinas([ana], [
            { nombre: 'Pollo al curry', categoria: 'Pollo' },
            { nombre: 'Arroz blanco', categoria: 'Arroces' }
        ]);
        expect(s).toContain('Pollo al curry');
        expect(s).toContain('Pollo caribeño');
        expect(s).not.toContain('Arroz blanco');
        expect(new Set(s.map(x => x.toLowerCase())).size).toBe(s.length);
    });
});
