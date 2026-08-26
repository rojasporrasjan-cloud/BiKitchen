import { describe, it, expect } from 'vitest';
import { parseOrderBlock } from '../utils/parseOrderText';
import { buildPedidoFromImport, validatePedidoForFirestore } from '../utils/buildPedidoFromImport';

/**
 * Pedidos reales del grupo VENTAS MIERCOLES, copiados tal cual.
 *
 * Sirven para comprobar que el importador entiende el formato que Gina escribe a
 * mano, ANTES de pegarlos en producción. Si alguno deja de parsear, se descubre
 * acá y no con el pedido ya guardado a medias.
 *
 * La fecha se fija al 25/08/2026 (el día en que se revisó) porque el parser
 * deduce el año cuando el mensaje no lo trae.
 */
const HOY = new Date('2026-08-25T12:00:00');

describe('pedidos del miércoles 26 escritos a mano en WhatsApp', () => {
    it('Zulema Esquivel: pack mensual con sus 4 entregas', () => {
        const texto = `Cliente: Zulema Esquivel

Teléfono: 88641660

Lugar: San Pablo, Heredia

Pack mensual Sin Carbos
20 comidas
Precio: ¢73,500

Envío: ¢6000

Total: ¢79,500

Entrega:
Miércoles 26 agosto
Miércoles 2 septiembre
Miércoles 9 septiembre
Miércoles 16 septiembre`;

        const p = parseOrderBlock(texto, HOY);

        expect(p.cliente).toBe('Zulema Esquivel');
        expect(p.telefono).toBe('88641660');
        expect(p.zona).toBe('San Pablo, Heredia');
        expect(p.total).toBe(79500);
        expect(p.costoEnvio).toBe(6000);
        // Las 4 entregas del mensual: sin esto solo saldría en la hoja del 26
        expect(p.fechasEntrega).toEqual([
            '2026-08-26', '2026-09-02', '2026-09-09', '2026-09-16'
        ]);
        expect(p.items.length).toBeGreaterThan(0);
        expect(p.warnings).toEqual([]);

        const pedido = buildPedidoFromImport(p, { createdBy: 'test' });
        expect(validatePedidoForFirestore(pedido)).toEqual([]);
    });

    it('Yamileth Umaña: pack de 3 proteínas con la lista de platos', () => {
        const texto = `Cliente: Yamileth Umaña

Teléfono: 88736075

Lugar: Uruca

Pack de Proteínas 3 de 250g

-Albondigas de res artesanales
-Fillet de pollo encebollado
-Carne Mechada de res en salsa

Precio: ¢13,500

Envío: ¢3,000

Total: ¢16,500

Entrega:
Miércoles 26 agosto`;

        const p = parseOrderBlock(texto, HOY);

        expect(p.cliente).toBe('Yamileth Umaña');
        expect(p.telefono).toBe('88736075');
        expect(p.total).toBe(16500);
        expect(p.fechasEntrega).toEqual(['2026-08-26']);

        // Las 3 proteínas tienen que llegar a la cocina, no solo el nombre del pack
        const texto_items = JSON.stringify(p.items).toLowerCase();
        expect(texto_items).toContain('albondigas');
        expect(texto_items).toContain('pollo encebollado');
        expect(texto_items).toContain('mechada');
        expect(p.warnings).toEqual([]);
    });

    it('Paula Méndez: teléfono con guion y una sola entrega', () => {
        const texto = `Cliente: Paula Méndez Elizondo

Teléfono: 6213-8951

Lugar: Santo Domingo heredia

1 pack 5 proteína de 250 g

Filete de pollo encebollado
carne mechada en salsa
filet de tilapia
pollo mechado en salsa
Pollo teriyaki

Precio: ¢21,000

Envío: ¢3,000

Total: ¢24.000

Entrega:
Miércoles 26 agosto`;

        const p = parseOrderBlock(texto, HOY);

        expect(p.cliente).toBe('Paula Méndez Elizondo');
        expect(p.telefono).toBe('6213-8951');
        expect(p.total).toBe(24000);
        expect(p.fechasEntrega).toEqual(['2026-08-26']);
        expect(p.warnings).toEqual([]);
    });

    it('un pedido sin fecha de entrega avisa en vez de guardarse mal', () => {
        const texto = `Cliente: Prueba Sin Fecha
Teléfono: 88888888
Lugar: San José
1 pack sin carbos
Precio: 25000
Total: 25000`;

        const p = parseOrderBlock(texto, HOY);

        expect(p.fechasEntrega).toEqual([]);
        expect(p.warnings.join(' ')).toMatch(/fecha de entrega/i);
    });

    it('un pack que dice "5 proteínas" sin listarlas también avisa', () => {
        const texto = `Cliente: Prueba Sin Platos
Teléfono: 88888888
Lugar: San José
1 Pack 5 Proteínas (250g)
Precio: 21000
Total: 21000
Entrega:
Miércoles 26 agosto`;

        const p = parseOrderBlock(texto, HOY);

        expect(p.warnings.join(' ')).toMatch(/no dice cu[áa]les/i);
    });
});
