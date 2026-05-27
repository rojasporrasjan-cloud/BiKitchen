/**
 * Utilidades de validación para BiKitchen
 */

// Validar email (with normalization)
export function isValidEmail(email) {
    if (!email) return false;
    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(normalized);
}

// Validar teléfono de Costa Rica (8 dígitos)
export function isValidPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 8 && /^[2-8]/.test(cleaned);
}

// Formatear teléfono
export function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 8) {
        return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    return phone;
}

// Validar nombre (mínimo 2 palabras)
export function isValidFullName(name) {
    const trimmed = name.trim();
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    return words.length >= 2 && trimmed.length >= 5;
}

// Validar dirección (mínimo 10 caracteres)
export function isValidAddress(address) {
    return address.trim().length >= 10;
}

// Validar cédula de Costa Rica
export function isValidCedula(cedula) {
    const cleaned = cedula.replace(/\D/g, '');
    // Cédula física: 9 dígitos
    // Cédula jurídica: 10 dígitos
    // DIMEX: 11-12 dígitos
    return cleaned.length >= 9 && cleaned.length <= 12;
}

// Validar monto
export function isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0;
}

// Validar código de cupón
export function isValidCouponCode(code) {
    return /^[A-Z0-9]{4,20}$/i.test(code.trim());
}

// Validar fecha futura
export function isFutureDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

// Validar fecha de entrega (no domingo, no hoy)
export function isValidDeliveryDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // No puede ser hoy ni en el pasado
    if (date <= today) return false;
    
    // No puede ser domingo (0)
    if (date.getDay() === 0) return false;
    
    return true;
}

// Sanitizar texto (prevenir XSS básico)
export function sanitizeText(text) {
    return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

// Validar formulario de checkout
export function validateCheckoutForm(formData, step) {
    const errors = {};

    if (step >= 1) {
        // Paso 1: Datos personales
        if (!formData.nombre || !isValidFullName(formData.nombre)) {
            errors.nombre = 'Ingresa tu nombre completo';
        }
        if (!formData.telefono || !isValidPhone(formData.telefono)) {
            errors.telefono = 'Ingresa un teléfono válido de 8 dígitos';
        }
        if (!formData.correo || !isValidEmail(formData.correo)) {
            errors.correo = 'Ingresa un correo electrónico válido';
        }
    }

    if (step >= 2) {
        // Paso 2: Entrega
        if (!formData.direccion || !isValidAddress(formData.direccion)) {
            errors.direccion = 'Ingresa una dirección completa (mín. 10 caracteres)';
        }
        if (!formData.fechaEntrega) {
            errors.fechaEntrega = 'Selecciona una fecha de entrega';
        } else if (!isValidDeliveryDate(formData.fechaEntrega)) {
            errors.fechaEntrega = 'La fecha debe ser futura y no puede ser domingo';
        }
    }

    if (step >= 3) {
        // Paso 3: Pago
        if (!formData.metodoPago) {
            errors.metodoPago = 'Selecciona un método de pago';
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

// Validar item del carrito
export function validateCartItem(item) {
    const errors = [];
    
    if (!item.id) errors.push('ID de producto faltante');
    if (!item.name) errors.push('Nombre de producto faltante');
    if (!item.price || item.price <= 0) errors.push('Precio inválido');
    if (!item.quantity || item.quantity < 1) errors.push('Cantidad inválida');
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

// Calcular total con validación
export function calculateTotal(cart, discount = 0) {
    if (!Array.isArray(cart)) return 0;
    
    const subtotal = cart.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 0;
        return sum + (price * quantity);
    }, 0);
    
    const discountAmount = Math.min(discount, subtotal);
    return Math.max(0, subtotal - discountAmount);
}

export default {
    isValidEmail,
    isValidPhone,
    formatPhone,
    isValidFullName,
    isValidAddress,
    isValidCedula,
    isValidAmount,
    isValidCouponCode,
    isFutureDate,
    isValidDeliveryDate,
    sanitizeText,
    validateCheckoutForm,
    validateCartItem,
    calculateTotal
};
