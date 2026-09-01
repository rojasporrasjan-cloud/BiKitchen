import { describe, it, expect } from 'vitest';
import {
    buildAdminTemplateParams,
    formatDeliveryDates,
    generateStyledSummary
} from '../utils/orderEmailFormat';

/**
 * Este módulo lo usan DOS runtimes: el navegador del cliente al terminar el
 * checkout, y la función programada de Netlify que recoge los avisos que nunca
 * salieron. Si el formato se parte entre los dos, Gina recibe correos distintos
 * según por dónde pasó el pedido — y peor, puede perder datos de cocina.
 */
describe('formato del correo de aviso', () => {
    const pedidoMensual = {
        orderNumber: '#ORD-TEST123',
        cliente: 'Nancy Jimenez',
        telefono: '87031707',
        correo: 'nancy@example.com',
        zona: 'Cartago',
        direccion: 'Cartago centro',
        total: 99890,
        subtotal: 87890,
        costoEnvio: 12000,
        descuento: 0,
        metodoPago: 'sinpe',
        fechasEntrega: ['2026-08-24', '2026-08-31'],
        items: [{ name: 'Pack Bajo Calorías', quantity: 1, price: 87890, planLabel: 'Quincenal' }],
        observaciones: 'Cambiar tilapia por pollo'
    };

    it('manda TODAS las fechas de un pack multi-entrega, no sólo la primera', () => {
        const params = buildAdminTemplateParams(pedidoMensual);
        expect(params.fechaEntrega).toContain('2026-08-24');
        expect(params.fechaEntrega).toContain('2026-08-31');
    });

    it('numera las entregas para que cocina sepa cuál semana es cuál', () => {
        expect(formatDeliveryDates(['2026-08-24', '2026-08-31']))
            .toBe('Entrega 1: 2026-08-24\nEntrega 2: 2026-08-31');
    });

    it('una sola fecha va sin numerar', () => {
        expect(formatDeliveryDates(['2026-08-24'])).toBe('2026-08-24');
    });

    it('sin fechas no revienta ni inventa una', () => {
        expect(formatDeliveryDates(null)).toBe('N/A');
        expect(formatDeliveryDates([])).toBe('N/A');
    });

    it('las observaciones llegan al correo — es lo que cocina lee', () => {
        const params = buildAdminTemplateParams(pedidoMensual);
        expect(params.observaciones).toBe('Cambiar tilapia por pollo');
        expect(params.message).toContain('Cambiar tilapia por pollo');
    });

    it('un pedido sin observaciones no manda "undefined"', () => {
        const params = buildAdminTemplateParams({ ...pedidoMensual, observaciones: '' });
        expect(params.observaciones).toBe('Sin observaciones');
    });

    it('el resumen lleva el número de pedido, el cliente y el total', () => {
        const resumen = generateStyledSummary(pedidoMensual);
        expect(resumen).toContain('#ORD-TEST123');
        expect(resumen).toContain('Nancy Jimenez');
        // es-CR separa los miles con espacio duro (U+00A0), no con uno normal:
        // comparar contra un literal escrito a mano falla por ese caracter.
        expect(resumen).toContain((99890).toLocaleString('es-CR'));
    });

    it('los cambios de plato salen en el detalle del ítem', () => {
        const params = buildAdminTemplateParams({
            ...pedidoMensual,
            items: [{
                name: 'Pack Bajo Calorías',
                quantity: 1,
                price: 25850,
                customizations: {
                    proteinChanges: [{ dishNumber: 1, dishName: 'Almuercitos', newValue: 'Pollo en salsa de hongos' }]
                }
            }]
        });
        expect(params.items).toContain('Plato 1');
        expect(params.items).toContain('Pollo en salsa de hongos');
    });

    it('un pedido sin items no rompe el correo', () => {
        const params = buildAdminTemplateParams({ ...pedidoMensual, items: null });
        expect(params.items).toBe('Sin items');
    });

    it('el envío por confirmar se avisa en vez de mostrar ₡0', () => {
        const params = buildAdminTemplateParams({
            ...pedidoMensual,
            envioPorConfirmar: true,
            costoEnvio: 0
        });
        expect(params.envio).toContain('Por confirmar');
    });
});
