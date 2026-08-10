import { describe, it, expect } from 'vitest';
import {
    isValidEmail,
    isValidPhone,
    formatPhone,
    isValidFullName,
    isValidAddress,
    isValidCouponCode,
    isValidDeliveryDate,
    sanitizeText,
    validateCheckoutForm,
    calculateTotal
} from '../utils/validations';

describe('Validaciones de Email', () => {
    it('acepta emails válidos', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.cr')).toBe(true);
    });

    it('rechaza emails inválidos', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('test@')).toBe(false);
        expect(isValidEmail('@domain.com')).toBe(false);
        expect(isValidEmail('')).toBe(false);
    });
});

describe('Validaciones de Teléfono Costa Rica', () => {
    it('acepta teléfonos válidos de 8 dígitos', () => {
        expect(isValidPhone('88887777')).toBe(true);
        expect(isValidPhone('2222-3333')).toBe(true);
        expect(isValidPhone('8506 7200')).toBe(true);
    });

    it('rechaza teléfonos inválidos', () => {
        expect(isValidPhone('1234567')).toBe(false); // 7 dígitos
        expect(isValidPhone('123456789')).toBe(false); // 9 dígitos
        expect(isValidPhone('12345678')).toBe(false); // empieza con 1
    });

    it('formatea teléfonos correctamente', () => {
        expect(formatPhone('88887777')).toBe('8888-7777');
        expect(formatPhone('22223333')).toBe('2222-3333');
    });
});

describe('Validaciones de Nombre', () => {
    it('acepta nombres completos', () => {
        expect(isValidFullName('Juan Pérez')).toBe(true);
        expect(isValidFullName('María José García López')).toBe(true);
    });

    it('rechaza nombres incompletos', () => {
        expect(isValidFullName('Juan')).toBe(false);
        expect(isValidFullName('')).toBe(false);
        expect(isValidFullName('   ')).toBe(false);
    });
});

describe('Validaciones de Dirección', () => {
    it('acepta direcciones válidas', () => {
        expect(isValidAddress('Alajuela, Costa Rica, 200m norte del parque')).toBe(true);
    });

    it('rechaza direcciones muy cortas', () => {
        expect(isValidAddress('Casa 1')).toBe(false);
        expect(isValidAddress('')).toBe(false);
    });
});

describe('Validaciones de Cupón', () => {
    it('acepta códigos válidos', () => {
        expect(isValidCouponCode('NAVIDAD15')).toBe(true);
        expect(isValidCouponCode('DESC20')).toBe(true);
        expect(isValidCouponCode('PROMO2024')).toBe(true);
    });

    it('rechaza códigos inválidos', () => {
        expect(isValidCouponCode('AB')).toBe(false); // muy corto
        expect(isValidCouponCode('código-especial')).toBe(false); // caracteres especiales
    });
});

describe('Sanitización de Texto', () => {
    it('escapa caracteres peligrosos', () => {
        expect(sanitizeText('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('elimina espacios al inicio y final', () => {
        expect(sanitizeText('  texto  ')).toBe('texto');
    });
});

describe('Validación de Formulario Checkout', () => {
    // El campo se llama `correo`, no `email`: es el nombre que usa el formulario
    // de checkout y el que espera validateCheckoutForm().
    it('valida paso 1 correctamente', () => {
        const validData = {
            nombre: 'Juan Pérez',
            telefono: '88887777',
            correo: 'juan@test.com'
        };
        const result = validateCheckoutForm(validData, 1);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
    });

    it('detecta errores en paso 1', () => {
        const invalidData = {
            nombre: 'Juan',
            telefono: '123',
            correo: 'invalid'
        };
        const result = validateCheckoutForm(invalidData, 1);
        expect(result.isValid).toBe(false);
        expect(result.errors.nombre).toBeDefined();
        expect(result.errors.telefono).toBeDefined();
        expect(result.errors.correo).toBeDefined();
    });

    it('exige el correo: sin él no se puede pasar del paso 1', () => {
        const sinCorreo = { nombre: 'Juan Pérez', telefono: '88887777' };
        const result = validateCheckoutForm(sinCorreo, 1);
        expect(result.isValid).toBe(false);
        expect(result.errors.correo).toBeDefined();
    });
});

describe('Cálculo de Total', () => {
    it('calcula total correctamente', () => {
        const cart = [
            { price: 5000, quantity: 2 },
            { price: 3000, quantity: 1 }
        ];
        expect(calculateTotal(cart)).toBe(13000);
    });

    it('aplica descuento correctamente', () => {
        const cart = [
            { price: 10000, quantity: 1 }
        ];
        expect(calculateTotal(cart, 2000)).toBe(8000);
    });

    it('no permite total negativo', () => {
        const cart = [
            { price: 1000, quantity: 1 }
        ];
        expect(calculateTotal(cart, 5000)).toBe(0);
    });

    it('maneja carrito vacío', () => {
        expect(calculateTotal([])).toBe(0);
        expect(calculateTotal(null)).toBe(0);
    });
});
