import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport, validatePedidoForFirestore } from '../utils/buildPedidoFromImport';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils';

/**
 * Pack de proteínas escrito a mano, con la LISTA de proteínas debajo del nombre.
 *
 * Este pedido real entró mal: el parser tenía un tope de 2 líneas de descripción,
 * así que se saltó el nombre del pack, perdió las 5 proteínas y terminó armando
 * un ítem con dos platos pegados ("fajitas ... - fajitas ..."). La hoja de cocina
 * no encontró menú para ese nombre inventado y salió el aviso rojo.
 */

const HOY = new Date('2026-08-13T12:00:00');

const PEDIDO_REAL = `Cliente: Andres Viquez Viquez
Teléfono: 8721-6592
Lugar: guacima

Pack 5 proteinas de 500 g
 pollo al pesto
tilapia al ajillo
 pollo en salsa mediterránea
fajitas de cerdo a la naranja
fajitas de cerdo en salsa teriyaki

Precio 39.950

Envío: 3000

Total: 42.950

Entrega:
Lunes 17 agosto`;

describe('Pack de proteínas con la lista debajo', () => {
    const p = parseOrderBlock(PEDIDO_REAL, HOY);

    it('lo lee como UN pack, no como platos sueltos pegados', () => {
        expect(p.items).toHaveLength(1);
        expect(p.items[0].nombre).toBe('Pack 5 proteinas de 500 g');
        // El bug juntaba dos platos en el nombre
        expect(p.items[0].nombre).not.toContain(' - fajitas');
    });

    it('toma las 5 líneas de abajo como las proteínas', () => {
        expect(p.items[0].proteinas).toEqual([
            'pollo al pesto',
            'tilapia al ajillo',
            'pollo en salsa mediterránea',
            'fajitas de cerdo a la naranja',
            'fajitas de cerdo en salsa teriyaki'
        ]);
    });

    it('lee el resto del pedido', () => {
        expect(p.cliente).toBe('Andres Viquez Viquez');
        expect(p.telefono).toBe('8721-6592');
        expect(p.zona).toBe('guacima');
        expect(p.total).toBe(42950);
        expect(p.costoEnvio).toBe(3000);
        expect(p.fechasEntrega).toEqual(['2026-08-17']);
        expect(p.items[0].precio).toBe(39950);
    });

    it('no reclama las proteínas: ya vienen listadas', () => {
        expect(p.warnings).toEqual([]);
    });

    it('llega a la cocina con los 5 platos y su gramaje', () => {
        const pedido = buildPedidoFromImport({ ...p, correo: null });
        expect(validatePedidoForFirestore(pedido)).toEqual([]);

        const [hoja] = mapPedidosFromLegacy([{ id: 'x', ...pedido }]);
        expect(hoja.platos).toHaveLength(5);
        expect(hoja.platos.map(pl => pl.proteina.nombre)).toEqual([
            'pollo al pesto',
            'tilapia al ajillo',
            'pollo en salsa mediterránea',
            'fajitas de cerdo a la naranja',
            'fajitas de cerdo en salsa teriyaki'
        ]);
        // El "de 500 g" del nombre —con espacio— es de donde sale la porción
        hoja.platos.forEach(pl => expect(pl.proteina.gramosPorPorcion).toBe(500));
    });
});

describe('No se rompe lo que ya funcionaba', () => {
    it('una descripción suelta sigue sumándose al nombre', () => {
        // "REGALIA DESAYUNOS" no es una proteína: el pack no anuncia proteínas
        const p = parseOrderBlock(`two pack bajo calorias Mensual
REGALIA DESAYUNOS
Precio 155.000`, HOY);

        expect(p.items).toHaveLength(1);
        expect(p.items[0].nombre).toContain('REGALIA DESAYUNOS');
        expect(p.items[0].proteinas).toEqual([]);
    });

    it('un pack que anuncia proteínas pero no las lista sigue avisando', () => {
        const p = parseOrderBlock(`□ 1 pack 3 proteínas de 500g
Precio 25.850`, HOY);
        expect(p.items[0].proteinas).toEqual([]);
        expect(p.warnings.join(' ')).toMatch(/dice 3 prote[íi]nas pero no dice cu[áa]les/i);
    });
});
