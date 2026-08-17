import { describe, it, expect } from 'vitest';
import {
    construirClientes,
    aplicarSegmento,
    normalizarTelefono,
    SEGMENTOS
} from '../utils/segmentacionClientes';

const HOY = new Date('2026-08-16T12:00:00');

const pedido = (over = {}) => ({
    id: Math.random().toString(36).slice(2),
    cliente: 'Andrés Víquez',
    telefono: '8721-6592',
    correo: 'andres@gmail.com',
    zona_envio: 'Guácima',
    plan: 'Pack Keto',
    status: 'confirmed',
    totalValue: 25000,
    createdAt: '2026-08-10T10:00:00',
    fecha_entrega: '2026-08-17',
    fechas_entrega: ['2026-08-17'],
    items: [{ nombre: 'Pack Keto', plan: null }],
    ...over
});

describe('Identificar al cliente por teléfono', () => {
    it('el mismo número escrito distinto es una sola persona', () => {
        expect(normalizarTelefono('8721-6592')).toBe('87216592');
        expect(normalizarTelefono('+506 8721 6592')).toBe('87216592');
        expect(normalizarTelefono('(506) 8721-6592')).toBe('87216592');
    });

    it('junta los pedidos de un mismo cliente aunque escriba el número distinto', () => {
        const clientes = construirClientes([
            pedido({ telefono: '8721-6592' }),
            pedido({ telefono: '+506 8721 6592' }),
            pedido({ telefono: '87216592' })
        ], HOY);

        expect(clientes).toHaveLength(1);
        expect(clientes[0].totalPedidos).toBe(3);
        expect(clientes[0].totalGastado).toBe(75000);
    });

    it('sin teléfono no entra: no habría a quién escribirle', () => {
        expect(construirClientes([pedido({ telefono: '' })], HOY)).toEqual([]);
    });

    it('descarta los cancelados y los que no se pagaron', () => {
        const clientes = construirClientes([
            pedido({ status: 'cancelled' }),
            pedido({ status: 'pending_payment', telefono: '8888-1111' })
        ], HOY);
        expect(clientes).toEqual([]);
    });

    it('ignora el correo inventado a partir del teléfono', () => {
        const [c] = construirClientes([
            pedido({ correo: '87216592@sin-correo.bikitchen.cr' })
        ], HOY);
        expect(c.correo).toBe('');
    });

    it('el nombre y la zona salen del pedido más nuevo', () => {
        const [c] = construirClientes([
            pedido({ cliente: 'Andres V', zona_envio: 'Alajuela', createdAt: '2026-07-01T10:00:00' }),
            pedido({ cliente: 'Andrés Víquez Viquez', zona_envio: 'Guácima', createdAt: '2026-08-10T10:00:00' })
        ], HOY);
        expect(c.nombre).toBe('Andrés Víquez Viquez');
        expect(c.zona).toBe('Guácima');
    });
});

describe('Segmento: se les acaba el pack', () => {
    it('toma al que su última entrega cae dentro del aviso', () => {
        // Entrega el 17, hoy es 16 → falta 1 día
        const clientes = construirClientes([pedido()], HOY);
        expect(aplicarSegmento(clientes, 'renovacion', { dias: 7 }, HOY)).toHaveLength(1);
    });

    it('un pack mensual cuenta por su ÚLTIMA entrega, no la primera', () => {
        const mensual = pedido({
            fecha_entrega: '2026-08-17',
            fechas_entrega: ['2026-08-17', '2026-08-24', '2026-08-31', '2026-09-07'],
            items: [{ nombre: 'Pack Keto Mensual', plan: 'monthly' }]
        });
        const clientes = construirClientes([mensual], HOY);

        // Le faltan 22 días para terminar: todavía no hay que ofrecerle renovar
        expect(aplicarSegmento(clientes, 'renovacion', { dias: 7 }, HOY)).toEqual([]);
        expect(aplicarSegmento(clientes, 'renovacion', { dias: 30 }, HOY)).toHaveLength(1);
    });

    it('no toma al que ya se le pasó la entrega', () => {
        const clientes = construirClientes([
            pedido({ fecha_entrega: '2026-08-01', fechas_entrega: ['2026-08-01'] })
        ], HOY);
        expect(aplicarSegmento(clientes, 'renovacion', { dias: 7 }, HOY)).toEqual([]);
    });
});

describe('Segmento: hace rato no piden', () => {
    it('toma al que su última entrega pasó hace más de X días', () => {
        const clientes = construirClientes([
            pedido({ fecha_entrega: '2026-06-01', fechas_entrega: ['2026-06-01'] })
        ], HOY);
        expect(aplicarSegmento(clientes, 'dormidos', { dias: 30 }, HOY)).toHaveLength(1);
    });

    it('no toma a un cliente activo', () => {
        const clientes = construirClientes([pedido()], HOY);
        expect(aplicarSegmento(clientes, 'dormidos', { dias: 30 }, HOY)).toEqual([]);
    });
});

describe('Segmentos por zona y por pack', () => {
    const clientes = construirClientes([
        pedido({ telefono: '8111-1111', zona_envio: 'Escazú', plan: 'Pack Keto' }),
        pedido({ telefono: '8222-2222', zona_envio: 'Heredia', plan: 'Pack Bajo Calorías' })
    ], HOY);

    it('la zona no distingue mayúsculas ni pide el nombre exacto', () => {
        expect(aplicarSegmento(clientes, 'zona', { texto: 'escaz' }, HOY)).toHaveLength(1);
    });

    it('el pack busca dentro de todos los que ha pedido', () => {
        expect(aplicarSegmento(clientes, 'pack', { texto: 'keto' }, HOY)).toHaveLength(1);
    });

    it('sin texto no devuelve a todo el mundo por accidente', () => {
        expect(aplicarSegmento(clientes, 'zona', { texto: '' }, HOY)).toEqual([]);
        expect(aplicarSegmento(clientes, 'pack', { texto: '  ' }, HOY)).toEqual([]);
    });
});

describe('Quien dijo que no quiere promociones NUNCA entra', () => {
    const clientes = construirClientes([
        pedido({ telefono: '8111-1111', aceptaPromos: false }),
        pedido({ telefono: '8222-2222' })
    ], HOY);

    it('queda fuera de todos los segmentos, incluso de "todos"', () => {
        SEGMENTOS.forEach((s) => {
            const opciones = s.id === 'zona' ? { texto: 'guá' }
                : s.id === 'pack' ? { texto: 'keto' }
                    : { dias: 3650 };
            const resultado = aplicarSegmento(clientes, s.id, opciones, HOY);
            expect(resultado.some((c) => c.telefono === '81111111')).toBe(false);
        });
    });

    it('un solo pedido con la baja alcanza para excluirlo', () => {
        const mixto = construirClientes([
            pedido({ telefono: '8333-3333', aceptaPromos: true }),
            pedido({ telefono: '8333-3333', aceptaPromos: false })
        ], HOY);
        expect(mixto[0].aceptaPromos).toBe(false);
        expect(aplicarSegmento(mixto, 'todos', {}, HOY)).toEqual([]);
    });
});

describe('Segmento desconocido', () => {
    it('devuelve vacío en vez de reventar', () => {
        expect(aplicarSegmento([], 'no-existe', {}, HOY)).toEqual([]);
    });
});
