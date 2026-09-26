import { describe, it, expect } from 'vitest';
import { proximoCiclo, pedidosParaElLink, respuestaDe, destinatarioKommo } from '../utils/envioDeCambios';

const MENUS = {
    bajoCalorias: [{ numero: 1, proteina: 'Filet de tilapia empanizado', vegetal: 'Relish de vegetales', carbo: 'Arroz con peregil' }],
    proteinasDisponibles: ['Pollo mostaza miel']
};
const SUST = { proteins: ['Estofado de res casero'], vegetables: [], carbos: [] };

const mensual = (extra = {}) => ({
    id: 'p1', cliente: 'Ana Mora', telefono: '8811-2233', plan: 'Pack Mensual Bajo en Calorías', status: 'confirmed',
    items: [{ nombre: 'Pack Mensual Bajo en Calorías', cantidad: 1 }],
    fechas_entrega: ['2026-09-05', '2026-09-12', '2026-09-19', '2026-09-26'], ...extra
});

describe('el ciclo del miércoles', () => {
    it('el miércoles 23 manda para el sábado 26 y el lunes 28', () => {
        expect(proximoCiclo(new Date(2026, 8, 23, 9))).toEqual({ sabado: '2026-09-26', lunes: '2026-09-28' });
    });
    it('el jueves ya se está cocinando ese ciclo: toma el siguiente', () => {
        expect(proximoCiclo(new Date(2026, 8, 24, 9))).toEqual({ sabado: '2026-10-03', lunes: '2026-10-05' });
    });
    it('el domingo toma el sábado que viene', () => {
        expect(proximoCiclo(new Date(2026, 8, 20, 9))).toEqual({ sabado: '2026-09-26', lunes: '2026-09-28' });
    });
});

describe('a quién le llega', () => {
    const fechas = ['2026-09-26', '2026-09-28'];

    it('un mensual con entrega esa semana, sí; y se sabe si es la última', () => {
        const r = pedidosParaElLink([mensual()], fechas, MENUS, SUST);
        expect(r).toHaveLength(1);
        expect(r[0].fecha).toBe('2026-09-26');
        expect(r[0].ultima).toBe(true);
    });

    it('cancelados, otras fechas y lo que no tiene menú quedan afuera', () => {
        const r = pedidosParaElLink([
            mensual({ id: 'c', status: 'cancelled' }),
            mensual({ id: 'o', fechas_entrega: ['2026-10-03'] }),
            mensual({ id: 'k', plan: 'Pack Keto', items: [{ nombre: 'Pack Keto' }] })
        ], fechas, MENUS, SUST);
        expect(r).toEqual([]);
    });

    it('el mismo pedido traído dos veces sale una sola', () => {
        expect(pedidosParaElLink([mensual(), mensual()], fechas, MENUS, SUST)).toHaveLength(1);
    });

    it('la respuesta se lee del detalle del link', () => {
        expect(respuestaDe(mensual({ cambiosDelLink: { '2026-09-26': { texto: 'x' } } }), '2026-09-26')).toEqual({ texto: 'x' });
        expect(respuestaDe(mensual({ cambiosPorEntrega: { '2026-09-26': 'de Gina' } }), '2026-09-26')).toBeNull();
    });
});

describe('para Kommo', () => {
    it('lleva el link, el avance y si es su última entrega', () => {
        const [item] = pedidosParaElLink([mensual()], ['2026-09-26'], MENUS, SUST);
        const d = destinatarioKommo(item, 'https://bikitchencr.com/cambios/abc');
        expect(d).toMatchObject({
            nombre: 'Ana Mora', telefono: '88112233', linkCambios: 'https://bikitchencr.com/cambios/abc',
            ultima: true, entregasRestantes: 0
        });
        expect(d.suscripcion.etiqueta).toBe('Semana 4 de 4');
    });
    it('sin teléfono no hay a quién mandarle', () => {
        const [item] = pedidosParaElLink([mensual({ telefono: '' })], ['2026-09-26'], MENUS, SUST);
        expect(destinatarioKommo(item, 'https://x')).toBeNull();
    });
});
