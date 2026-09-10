import { describe, it, expect } from 'vitest';
import { pedidosDeLaTanda, acumularEnviados, claveDePedido, canceladosDespuesDeEnviar } from '../utils/tandasDeCocina.js';

/**
 * La semana del sabado 5 y el lunes 7 de setiembre, tal como quedo.
 *
 * Lo que se quiere probar es lo que Jan pregunto: si el jueves se manda el
 * adelanto, QUE va a quitar la hoja del viernes. La respuesta tiene que ser
 * "los que ya fueron", ni uno mas ni uno menos, y que la suma de las tres
 * tandas de exactamente el total de la semana.
 */
const calendario = (p) => p.fechas_entrega;

const recurrente = (n, nombre) => ({ numeroOrden: n, cliente: nombre,
    fechas_entrega: ['2026-08-31', '2026-09-07', '2026-09-14', '2026-09-21'] });
const suelto = (n, nombre) => ({ numeroOrden: n, cliente: nombre,
    fechas_entrega: ['2026-09-05'] });

// 6 recurrentes y 3 sueltos, la misma proporcion de la semana real
const SEMANA = [
    recurrente('#ORD-A1', 'Sonia Oreamuno'),
    recurrente('#ORD-A2', 'Diana Morera'),
    recurrente('#ORD-A3', 'Pilar Umaña'),
    recurrente('#ORD-A4', 'Giancarlo Longui'),
    recurrente('#ORD-A5', 'Guillermo Vargas'),
    recurrente('#ORD-A6', 'Yaffet Mendoza'),
    suelto('#ORD-B1', 'Shirley Jara'),
    suelto('#ORD-B2', 'Manuel Morales'),
    suelto('#ORD-B3', 'Josué Abarca')
];

describe('la semana completa, tanda por tanda', () => {
    it('el JUEVES van solo los recurrentes', () => {
        const { nuevos, repetidos } = pedidosDeLaTanda(SEMANA, [], { soloRecurrentes: true, calendario });
        expect(nuevos).toHaveLength(6);
        expect(repetidos).toHaveLength(0);
        expect(nuevos.every(p => p.fechas_entrega.length > 1)).toBe(true);
    });

    it('el VIERNES se descuentan los del jueves y van los que faltaban', () => {
        const jueves = pedidosDeLaTanda(SEMANA, [], { soloRecurrentes: true, calendario });
        const yaEnviados = jueves.nuevos.map(claveDePedido);

        const viernes = pedidosDeLaTanda(SEMANA, yaEnviados, { soloRecurrentes: false, calendario });
        expect(viernes.nuevos.map(p => p.cliente))
            .toEqual(['Shirley Jara', 'Manuel Morales', 'Josué Abarca']);
        // los 6 del jueves se reconocen y NO se vuelven a mandar
        expect(viernes.repetidos).toHaveLength(6);
    });

    it('un pedido que entra el VIERNES sale en esa hoja', () => {
        const jueves = pedidosDeLaTanda(SEMANA, [], { soloRecurrentes: true, calendario });
        const conNuevo = [...SEMANA, suelto('#ORD-NUEVO', 'Cliente del viernes')];

        const viernes = pedidosDeLaTanda(conNuevo, jueves.nuevos.map(claveDePedido),
            { soloRecurrentes: false, calendario });
        expect(viernes.nuevos.map(p => p.cliente)).toContain('Cliente del viernes');
    });

    it('el SABADO ya no queda nada por mandar si no entro nada', () => {
        const jueves = pedidosDeLaTanda(SEMANA, [], { soloRecurrentes: true, calendario });
        const viernes = pedidosDeLaTanda(SEMANA, jueves.nuevos.map(claveDePedido),
            { soloRecurrentes: false, calendario });
        const hastaAhora = [...jueves.nuevos, ...viernes.nuevos].map(claveDePedido);

        const sabado = pedidosDeLaTanda(SEMANA, hastaAhora, { soloRecurrentes: false, calendario });
        expect(sabado.nuevos).toHaveLength(0);
        expect(sabado.repetidos).toHaveLength(9);
    });

    it('las tres tandas suman EXACTO la semana: ni se repite ni se pierde nada', () => {
        const jueves = pedidosDeLaTanda(SEMANA, [], { soloRecurrentes: true, calendario });
        const viernes = pedidosDeLaTanda(SEMANA, jueves.nuevos.map(claveDePedido),
            { soloRecurrentes: false, calendario });
        const hastaAhora = [...jueves.nuevos, ...viernes.nuevos].map(claveDePedido);
        const sabado = pedidosDeLaTanda(SEMANA, hastaAhora, { soloRecurrentes: false, calendario });

        const cocinados = [...jueves.nuevos, ...viernes.nuevos, ...sabado.nuevos].map(claveDePedido);
        expect(cocinados).toHaveLength(SEMANA.length);
        expect(new Set(cocinados).size).toBe(SEMANA.length);   // ninguno dos veces
        expect(new Set(cocinados)).toEqual(new Set(SEMANA.map(claveDePedido)));
    });
});

describe('lo que pasa cuando algo se mueve entre tandas', () => {
    it('si alguien cancela DESPUES de que salio la hoja, se avisa aparte', () => {
        const jueves = pedidosDeLaTanda(SEMANA, [], { soloRecurrentes: true, calendario });
        const yaEnviados = jueves.nuevos.map(claveDePedido);
        // Yaffet se cae de la lista el viernes
        const sinYaffet = SEMANA.filter(p => p.numeroOrden !== '#ORD-A6');

        expect(canceladosDespuesDeEnviar(yaEnviados, sinYaffet)).toEqual(['#ORD-A6']);
    });

    it('acumular varias tandas no repite claves', () => {
        const tandas = [
            { pedidos: ['#ORD-A1', '#ORD-A2'] },
            { pedidos: ['#ORD-A2', '#ORD-B1'] }
        ];
        expect(acumularEnviados(tandas).sort()).toEqual(['#ORD-A1', '#ORD-A2', '#ORD-B1']);
    });

    it('sin tandas previas, la primera hoja lleva todo lo que le toca', () => {
        expect(pedidosDeLaTanda(SEMANA, [], { calendario }).nuevos).toHaveLength(9);
        expect(pedidosDeLaTanda(SEMANA, null, { calendario }).nuevos).toHaveLength(9);
    });
});
