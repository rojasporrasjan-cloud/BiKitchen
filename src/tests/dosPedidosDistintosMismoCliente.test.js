import { describe, it, expect } from 'vitest';
import { deduplicateOrdersByClient } from '../utils/productionHelpers.js';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils.js';

/**
 * Un cliente puede tener DOS pedidos distintos el mismo dia.
 *
 * La fusion existe para que un pedido importado dos veces no se cocine dos
 * veces, y del segundo solo rescataba las observaciones: los platos se perdian
 * en silencio. El contenido no sirve para distinguir un caso del otro —el mismo
 * pedido importado dos veces suele traer el plan escrito distinto— asi que el
 * agregado se marca a mano con noFusionar.
 *
 * Diana Gonzalez lleva su Pack Mensual Bajo Calorias y aparte 3 milanesas de
 * pollo de 250 g. Las milanesas desaparecian de la hoja y en su lugar quedaba
 * pegado un "sin cargo" en la fila del pack. Nadie las hubiera empacado.
 */
describe('dos pedidos distintos del mismo cliente', () => {

    const pack = {
        id: 'a', numeroOrden: '#ORD-PACK', cliente: 'Diana Gonzalez', telefono: '88199901',
        plan: 'PACK MENSUAL BAJO CALORIAS', observaciones: 'Sin vainicas',
        zona_envio: 'Alajuela - San Isidro / San Rafael',
        items: [{ nombre: 'PACK MENSUAL BAJO CALORIAS', cantidad: 1 }]
    };
    const proteinas = {
        id: 'b', numeroOrden: '#ORD-PROT', cliente: 'Diana Gonzalez', telefono: '88199901',
        noFusionar: true,
        plan: 'Pack de 3 proteínas de 250 g', observaciones: 'sin cargo',
        zona_envio: 'Alajuela - San Isidro / San Rafael',
        items: [{ nombre: 'Pack de 3 proteínas de 250 g', cantidad: 1,
                  proteinas: ['Milanesa de pollo', 'Milanesa de pollo', 'Milanesa de pollo'] }]
    };

    it('conserva LOS DOS: el pack y las proteinas', () => {
        const { pedidos } = deduplicateOrdersByClient([pack, proteinas]);
        expect(pedidos).toHaveLength(2);
        expect(pedidos.map(p => p.numeroOrden)).toEqual(['#ORD-PACK', '#ORD-PROT']);
    });

    it('no los reporta como fusionados: no se fusiono nada', () => {
        const { fusionados } = deduplicateOrdersByClient([pack, proteinas]);
        expect(fusionados).toEqual([]);
    });

    it('no le pega el "sin cargo" a las observaciones del pack', () => {
        const { pedidos } = deduplicateOrdersByClient([pack, proteinas]);
        expect(pedidos[0].observaciones).toBe('Sin vainicas');
    });

    it('sin la marca, dos pedidos del mismo cliente se siguen fusionando', () => {
        const sinMarca = { ...proteinas, noFusionar: false };
        const { pedidos } = deduplicateOrdersByClient([pack, sinMarca]);
        expect(pedidos).toHaveLength(1);
    });

    it('el MISMO pedido importado dos veces se sigue fusionando', () => {
        const copia = { ...pack, id: 'a2', numeroOrden: '#ORD-PACK-COPIA' };
        const { pedidos, fusionados } = deduplicateOrdersByClient([pack, copia]);
        expect(pedidos).toHaveLength(1);
        expect(fusionados).toHaveLength(1);
        expect(fusionados[0].absorbido).toBe('#ORD-PACK-COPIA');
    });

    it('al fusionar un duplicado sigue rescatando la observacion que traiga', () => {
        const copia = { ...pack, id: 'a2', numeroOrden: '#ORD-PACK-COPIA', observaciones: 'Tocar el timbre' };
        const { pedidos } = deduplicateOrdersByClient([pack, copia]);
        expect(pedidos[0].observaciones).toBe('Sin vainicas · Tocar el timbre');
    });

    it('el pedido suelto hereda la zona si le falta', () => {
        const sinZona = { ...proteinas, zona_envio: '' };
        const { pedidos } = deduplicateOrdersByClient([pack, sinZona]);
        expect(pedidos[1].zona_envio).toBe('Alajuela - San Isidro / San Rafael');
    });

    it('la marca sobrevive el paso por mapPedidosFromLegacy', () => {
        // mapPedidosFromLegacy rearma el pedido campo por campo: lo que no se
        // copia ahi se pierde en silencio, y la hoja vuelve a fusionar.
        const mapeados = mapPedidosFromLegacy([
            { ...pack, estado: 'confirmed', fechasEntrega: ['2026-09-02'] },
            { ...proteinas, estado: 'confirmed', fechasEntrega: ['2026-09-02'] }
        ]);
        expect(mapeados[1].noFusionar).toBe(true);
        expect(mapeados[0].noFusionar).toBe(false);

        const { pedidos } = deduplicateOrdersByClient(mapeados);
        expect(pedidos).toHaveLength(2);
        expect(pedidos[1].platos[0].proteina.nombre).toBe('Milanesa de pollo');
    });
});
