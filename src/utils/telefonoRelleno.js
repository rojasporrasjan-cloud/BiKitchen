/**
 * ¿Este teléfono identifica a alguien, o es relleno?
 *
 * Vive solo, sin importar nada, porque lo usan dos partes que no se conocen
 * entre sí: la hoja de producción (para no fusionar pedidos de gente distinta)
 * y las listas de difusión (para no escribirle a un número inventado).
 *
 * Antes cada una tenía su propia versión con el mismo nombre y reglas
 * distintas, y cada una era ciega a los casos de la otra:
 *
 *   - La de producción no conocía el bloque 8000-XXXX, así que dos pedidos con
 *     8000-0007 se fusionaban y uno de los dos no se cocinaba.
 *   - La de difusión no conocía el 8888-8888, así que Monserrat Gutiérrez,
 *     Josef Diermissen, Paulo Gomes, Luis López, Lizbeth Zeledón y Luis Carlos
 *     Monge salían como UN solo cliente, con la plata de los seis sumada.
 *
 * El 29 y el 31 de agosto de 2026 esto costó dos entregas de verdad. Una sola
 * regla, en un solo archivo, para que no vuelva a pasar.
 */

/** Los últimos 8 dígitos: así +506 8506 7200 y 8506-7200 son el mismo número. */
export const normalizarTelefono = (telefono) => {
    const digitos = String(telefono || '').replace(/\D/g, '');
    return digitos.length > 8 ? digitos.slice(-8) : digitos;
};

/**
 * Números que se anotan cuando el pedido llega por WhatsApp sin teléfono.
 *
 * En Costa Rica los celulares arrancan en 6, 7 u 8 y el bloque 8000-XXXX no
 * está asignado, así que descartarlo es seguro.
 */
export const esTelefonoDeRelleno = (telefono) => {
    const d = normalizarTelefono(telefono);
    if (d.length < 8) return true;               // vacío o incompleto
    if (/^(\d)\1+$/.test(d)) return true;        // 88888888, 00000000
    if (/^0?12345678/.test(d)) return true;      // 12345678
    if (/^8000\d{4}$/.test(d)) return true;      // el relleno del Excel de Gina
    return false;
};
