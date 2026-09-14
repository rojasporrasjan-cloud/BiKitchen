import { describe, it, expect } from 'vitest';
import { parseOrderBlock, normalizarReposicion, esTextoDeReposicion } from '../utils/parseOrderText';
import { buildPedidoFromImport, avisosDelPedido, validatePedidoForFirestore } from '../utils/buildPedidoFromImport';

/**
 * Los dos pedidos que Jan no pudo cargar el 10 de setiembre de 2026, tal cual
 * los pegó.
 */
const ANGIE = `Cliente: Angie Navarro
Teléfono: 88492466
Zona de entrega: Moravia

reponer 3 platos de
Gallo pinto con huevo revuelto


Entrega:
Sabado 12 setiembre`;

const TIMOTY = `Cliente: Timoty Gutiérrez
Teléfono: 8705-8453
Lugar: Heredia

Lasagna de pollo


Entrega:
Sábado 12 setiembre`;

const HOY = new Date('2026-09-10T15:00:00-06:00');
const importar = (texto) => buildPedidoFromImport(parseOrderBlock(texto, HOY), {});

describe('una reposición', () => {
    const pedido = importar(ANGIE);

    it('lee el plato y la cantidad, no "reponer 3 platos de"', () => {
        expect(pedido.items).toHaveLength(1);
        expect(pedido.items[0].nombre).toBe('Gallo pinto con huevo revuelto');
        expect(pedido.items[0].cantidad).toBe(3);
    });

    /**
     * Antes: ₡9.850 por plato —el precio de la olla de 6 tazas de gallo pinto
     * de ARROCES— más el envío de Moravia. ₡32.550 por algo que no se cobra.
     */
    it('va en ₡0: ni platos ni envío', () => {
        expect(pedido.items[0].precio).toBe(0);
        expect(pedido.total).toBe(0);
        expect(pedido.costo_envio).toBe(0);
    });

    it('no da puntos de lealtad', () => {
        expect(pedido.pointsToAward).toBe(0);
    });

    it('queda escrito que es reposición, para quien empaca y quien cobra', () => {
        expect(pedido.esReposicion).toBe(true);
        expect(pedido.observaciones).toMatch(/REPOSICIÓN — sin cargo/);
    });

    it('se puede crear y avisa que es reposición', () => {
        expect(validatePedidoForFirestore(pedido)).toEqual([]);
        expect(avisosDelPedido(pedido).join(' ')).toMatch(/REPOSICIÓN/);
    });

    it('conserva la fecha y los datos del cliente', () => {
        expect(pedido.fechas_entrega).toEqual(['2026-09-12']);
        expect(pedido.zona_envio).toBe('Moravia');
        expect(pedido.telefono).toBe('88492466');
    });
});

describe('normalizarReposicion', () => {
    it('el plato en el renglón de abajo', () => {
        expect(normalizarReposicion('reponer 3 platos de\nGallo pinto')).toBe('3 Gallo pinto');
    });
    it('el plato en el mismo renglón', () => {
        expect(normalizarReposicion('Reponer 2 Pollo teriyaki')).toBe('2 Pollo teriyaki');
        expect(normalizarReposicion('reposición de 1 plato de Tilapia')).toBe('1 Tilapia');
    });
    it('no toca lo que no es reposición', () => {
        expect(normalizarReposicion('1 Pack Regular\nNo lácteos')).toBe('1 Pack Regular\nNo lácteos');
    });
    it('reconoce reponer y reposición', () => {
        expect(esTextoDeReposicion('reponer 3 platos')).toBe(true);
        expect(esTextoDeReposicion('Reposición de la cena')).toBe(true);
        expect(esTextoDeReposicion('1 Pack Regular')).toBe(false);
    });

    /**
     * "two pack mensual con REGALÍA desayunos" es un pack PAGADO: los desayunos
     * son el regalo, no el pedido. La primera versión de esta regla lo dejaba
     * en ₡0 — un mensual entero sin cobrar. Lo atraparon las pruebas viejas.
     */
    it('regalía y sin cargo NO vuelven gratis el pedido entero', () => {
        expect(esTextoDeReposicion('two pack bajo calorias Mensual - REGALIA DESAYUNOS')).toBe(false);
        expect(esTextoDeReposicion('Envío sin cargo')).toBe(false);
        const p = importar('Cliente: Ana\nTeléfono: 88887777\n\n1 two pack mensual casaditos con regalía desayunos - ₡98000\n\nEntrega:\nSábado 12 setiembre');
        expect(p.total).toBeGreaterThan(0);
        expect(p.esReposicion).toBe(false);
    });
});

describe('un plato del catálogo escrito sin número', () => {
    const pedido = importar(TIMOTY);

    /** Antes: "No pude leer ningún ítem" y el pedido no se podía crear. */
    it('se toma como un ítem de 1', () => {
        expect(pedido.items).toHaveLength(1);
        expect(pedido.items[0].nombre).toBe('Lasagna de pollo');
        expect(pedido.items[0].cantidad).toBe(1);
        expect(validatePedidoForFirestore(pedido)).toEqual([]);
    });

    it('ya no queda también como nota', () => {
        expect(pedido.observaciones).toBe('');
    });

    /**
     * Hay dos lasagnas de pollo en el catálogo y dos tamaños. El precio que
     * se adivina tiene que verse antes de crear el pedido.
     */
    it('el precio sacado del catálogo sale como aviso para revisarlo', () => {
        const avisos = avisosDelPedido(pedido).join(' ');
        expect(avisos).toMatch(/lo puse yo del catálogo/);
        expect(avisos).toMatch(/salsa roja/);
        expect(avisos).toMatch(/8 porciones/);
    });

    it('una nota suelta NO se vuelve un plato', () => {
        const p = importar('Cliente: Ana\nTeléfono: 88887777\n\nNo lácteos\n\nEntrega:\nSábado 12 setiembre');
        expect(p.items).toHaveLength(0);
    });

    it('si ya hay ítems con número, no se agrega nada más', () => {
        const p = importar('Cliente: Ana\nTeléfono: 88887777\n\n1 Pack Regular - ₡25000\nLasagna de pollo\n\nEntrega:\nSábado 12 setiembre');
        expect(p.items.map(i => i.nombre)).not.toContain('Lasagna de pollo');
    });
});

describe('un desayuno no se cobra con un precio del catálogo de individuales', () => {
    it('"Gallo pinto con huevo" no toma el precio de la olla de gallo pinto', () => {
        const p = importar('Cliente: Ana\nTeléfono: 88887777\n\n2 Gallo pinto con huevos revueltos (Desayuno)\n\nEntrega:\nSábado 12 setiembre');
        expect(p.items[0].precio).toBe(0);
        expect(p.items[0].precioDelCatalogo).toBeNull();
    });
});
