import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport, validatePedidoForFirestore } from '../utils/buildPedidoFromImport';

/**
 * Escrito a mano, el teléfono casi nunca lleva los dos puntos.
 *
 * Este pedido real no se pudo crear: el parser exigía "Teléfono:" y el texto
 * decía "Teléfono 8800-8668". Sin teléfono no hay correo (se deriva de él), así
 * que salían los dos errores juntos y el pedido quedaba bloqueado.
 */

const HOY = new Date('2026-08-14T12:00:00');

const PEDIDO_EDUARDO = `Cliente: Eduardo Villalobos
Lugar:  Alajuela
Teléfono 8800-8668

□ two pack casaditos
Precio 55.700

Envíos 3000

TOTAL: 58.700

Entregas
Lunes 17 agosto`;

describe('Teléfono escrito sin dos puntos', () => {
    const p = parseOrderBlock(PEDIDO_EDUARDO, HOY);

    it('lee el teléfono igual', () => {
        expect(p.telefono).toBe('8800-8668');
    });

    it('ya no reclama que falta', () => {
        expect(p.warnings.join(' ')).not.toMatch(/tel[ée]fono/i);
    });

    it('el pedido se puede crear (antes lo bloqueaba el correo)', () => {
        const pedido = buildPedidoFromImport(p);
        expect(validatePedidoForFirestore(pedido)).toEqual([]);
        expect(pedido.correo).toBe('88008668@sin-correo.bikitchen.cr');
    });

    it('lee el resto del pedido', () => {
        expect(p.cliente).toBe('Eduardo Villalobos');
        expect(p.zona).toBe('Alajuela');
        expect(p.total).toBe(58700);
        expect(p.costoEnvio).toBe(3000);
        expect(p.fechasEntrega).toEqual(['2026-08-17']);
        expect(p.items[0].nombre).toMatch(/two pack casaditos/i);
        expect(p.items[0].precio).toBe(55700);
    });
});

describe('Las otras formas de escribirlo siguen sirviendo', () => {
    const tel = (texto) => parseOrderBlock(`Cliente: X\n${texto}\nPrecio 1.000`, HOY).telefono;

    it('con dos puntos', () => {
        expect(tel('Teléfono: 8721-6592')).toBe('8721-6592');
        expect(tel('Tel: 87216592')).toBe('87216592');
    });

    it('formato WhatsApp con negritas', () => {
        expect(tel('📱 *Teléfono*: 8721-6592')).toBe('8721-6592');
    });

    it('sin tilde', () => {
        expect(tel('Telefono 8721-6592')).toBe('8721-6592');
    });

    it('con código de país', () => {
        expect(tel('Teléfono +506 8721 6592')).toBe('+506 8721 6592');
    });

    it('dos números separados por barra', () => {
        expect(tel('Teléfono 8721-6592 / 8800-1111')).toBe('8721-6592 / 8800-1111');
    });
});

describe('Sin dos puntos no agarra texto que no es un número', () => {
    const tel = (texto) => parseOrderBlock(`Cliente: X\n${texto}\nPrecio 1.000`, HOY).telefono;

    it('no devuelve el resto de la etiqueta', () => {
        // El riesgo de aceptar el espacio como separador
        expect(tel('Teléfono de contacto: 8800-8668')).toBe('8800-8668');
    });

    it('ignora una nota en vez del número', () => {
        expect(tel('Teléfono pendiente')).toBeNull();
    });

    it('ignora un número demasiado corto para ser un teléfono', () => {
        expect(tel('Tel 123')).toBeNull();
    });
});
