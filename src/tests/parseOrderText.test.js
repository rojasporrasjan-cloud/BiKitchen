import { describe, it, expect } from 'vitest';
import { extractOrderNumbers } from '../utils/parseOrderText';

// Bloque real generado por generateStyledSummary() (correo de aviso)
const CORREO = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 PEDIDO: #ORD-MLMPMVGE99
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Fecha del Pedido: 7/8/2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 INFORMACIÓN DEL CLIENTE
Nombre: Jairo Monge
Teléfono: 88670025
Email: jai.mv@hotmail.com

📦 ITEMS DEL PEDIDO
1× Pack de Proteínas - Pack 3 Proteínas (250g) (Semanal) - ₡13.500
└ Proteínas: Carne mechada en salsa, Pollo al pesto

💰 RESUMEN DE PAGO
TOTAL: ₡16.500`;

// Mensaje de WhatsApp construido en CheckoutSteps.jsx
const WHATSAPP = `🛒 *NUEVO PEDIDO #ORD-IXZYTDKV8K*

━━━━━━━━━━━━━━━━━━━━
📦 *ITEMS DEL PEDIDO*

• 1× Pack Bajo Calorías
   └ ₡122.390`;

describe('extractOrderNumbers', () => {
    it('extrae el número del formato del correo', () => {
        expect(extractOrderNumbers(CORREO)).toEqual(['#ORD-MLMPMVGE99']);
    });

    it('extrae el número del formato de WhatsApp', () => {
        expect(extractOrderNumbers(WHATSAPP)).toEqual(['#ORD-IXZYTDKV8K']);
    });

    it('extrae varios pedidos pegados juntos, en orden', () => {
        expect(extractOrderNumbers(`${CORREO}\n\n${WHATSAPP}`)).toEqual([
            '#ORD-MLMPMVGE99',
            '#ORD-IXZYTDKV8K'
        ]);
    });

    it('no repite el mismo pedido aunque aparezca varias veces', () => {
        const texto = 'Pedido #ORD-ABC123 confirmado. Recordá: #ORD-ABC123 va el lunes.';
        expect(extractOrderNumbers(texto)).toEqual(['#ORD-ABC123']);
    });

    it('normaliza a mayúsculas', () => {
        expect(extractOrderNumbers('pedido #ord-abc123xyz')).toEqual(['#ORD-ABC123XYZ']);
    });

    it('soporta el formato viejo de 4 dígitos del admin', () => {
        expect(extractOrderNumbers('Pedido manual #ORD-4821')).toEqual(['#ORD-4821']);
    });

    it('devuelve vacío cuando no hay número de pedido', () => {
        expect(extractOrderNumbers('Hola, quiero pedir un pack para el martes')).toEqual([]);
        expect(extractOrderNumbers('#ORD-')).toEqual([]);
        expect(extractOrderNumbers('ORD-ABC123')).toEqual([]);
    });

    it('devuelve vacío ante valores inválidos', () => {
        expect(extractOrderNumbers('')).toEqual([]);
        expect(extractOrderNumbers(null)).toEqual([]);
        expect(extractOrderNumbers(undefined)).toEqual([]);
        expect(extractOrderNumbers(12345)).toEqual([]);
    });
});
