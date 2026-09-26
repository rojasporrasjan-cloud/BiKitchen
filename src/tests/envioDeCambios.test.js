import { describe, it, expect } from 'vitest';
import {
    proximoCiclo, pedidosParaElLink, respuestaDe, destinatarioKommo, indiceDeTelefonos, nombreCalza, buscarEnIndice, cicloEnCostaRica
} from '../utils/envioDeCambios';

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

describe('el link fijo /cambios', () => {
    it('reconoce el nombre sin tildes ni mayúsculas, con solo el primero', () => {
        expect(nombreCalza('ana', 'Ana Mora Solís')).toBe(true);
        expect(nombreCalza('  María José ', 'MARIA JOSE CORELLA')).toBe(true);
        expect(nombreCalza('Pedro', 'Ana Mora')).toBe(false);
        expect(nombreCalza('', 'Ana Mora')).toBe(false);
    });

    it('arma el índice por los últimos 8 dígitos y busca con teléfono Y nombre', () => {
        const indice = indiceDeTelefonos([
            { pedido: { id: 'a1', cliente: 'Ana Mora', telefono: '+506 8811-2233', plan: 'Pack Keto' }, fecha: '2026-10-03' },
            { pedido: { id: 'a2', cliente: 'Ana Mora', telefono: '88112233', plan: 'Pack Vegetariano' }, fecha: '2026-10-05' },
            { pedido: { id: 'x', cliente: 'Sin teléfono', telefono: '' }, fecha: '2026-10-03' }
        ]);
        expect(Object.keys(indice)).toEqual(['88112233']);
        expect(buscarEnIndice(indice, '8811 2233', 'ana').map(x => x.pack)).toEqual(['Pack Keto', 'Pack Vegetariano']);
        expect(buscarEnIndice(indice, '88112233', 'Beto')).toEqual([]);
    });

    it('el ciclo se calcula con la hora de Costa Rica aunque el servidor esté en UTC', () => {
        // Miércoles 30 set, 7 p. m. en CR = jueves 1 oct 01:00 UTC: sigue siendo el ciclo del sábado 3
        expect(cicloEnCostaRica(new Date('2026-10-01T01:00:00Z')).sabado).toBe('2026-10-03');
    });
});
