/**
 * Junta en una sola lista los descuentos que hoy viven en cinco lugares
 * distintos del panel.
 *
 * NO cambia como se calculan los precios: cada pantalla sigue siendo la dueña de
 * lo suyo. Esto solo LEE y normaliza, para poder contestar de un vistazo
 * "¿qué está rebajado ahora mismo?" sin abrir cinco pantallas.
 *
 * La función es pura a propósito (recibe los datos ya cargados) para poder
 * probarla sin Firestore.
 */

import { formatPrice } from './formatters';

export const ORIGENES = {
    pack: { etiqueta: 'Pack', ruta: '/admin/pack-discounts', pantalla: 'Descuentos Packs' },
    plato: { etiqueta: 'Plato', ruta: '/admin/individual-discounts', pantalla: 'Descuentos Platos' },
    cupon: { etiqueta: 'Cupón', ruta: '/admin/coupons', pantalla: 'Cupones' },
    envio: { etiqueta: 'Envío', ruta: '/admin/shipping-discount', pantalla: 'Descuento Envío' },
    promocion: { etiqueta: 'Promoción', ruta: '/admin/promotions', pantalla: 'Promociones' }
};

/** Acepta string, Date o Timestamp de Firestore. */
const aFecha = (valor) => {
    if (!valor) return null;
    try {
        const d = valor.toDate ? valor.toDate() : new Date(valor);
        return isNaN(d.getTime()) ? null : d;
    } catch {
        return null;
    }
};

/**
 * ¿Está dentro de su ventana de fechas?
 * Sin fechas configuradas se considera vigente: es un descuento permanente.
 */
const dentroDeVigencia = (desde, hasta, hoy) => {
    const inicio = aFecha(desde);
    const fin = aFecha(hasta);
    if (inicio && hoy < inicio) return false;
    if (fin && hoy > fin) return false;
    return true;
};

const formatearValor = (tipo, valor) => {
    const n = Number(valor) || 0;
    if (n <= 0) return '—';
    // formatPrice para que los montos se vean igual que en el resto del panel
    return tipo === 'fijo' ? formatPrice(n) : `${n}%`;
};

/**
 * @param {object} fuentes - datos ya cargados de cada pantalla
 * @param {Date} [hoy]
 * @returns {Array} lista normalizada, los vigentes primero
 */
export const recolectarDescuentos = (fuentes = {}, hoy = new Date()) => {
    const {
        packPrices = {},
        individualPrices = {},
        catalogoIndividuales = [],
        cupones = [],
        promociones = [],
        envio = null
    } = fuentes;

    const items = [];

    // --- Packs y platos: misma forma de configuración ---
    const agregarPorPrecio = (config, nombre, origen) => {
        if (!config?.descuentoActivo) return;
        items.push({
            clave: `${origen}:${nombre}`,
            origen,
            nombre,
            descuento: formatearValor(config.tipoDescuento, config.valorDescuento),
            desde: config.fechaInicio || null,
            hasta: config.fechaFin || null,
            vigente: dentroDeVigencia(config.fechaInicio, config.fechaFin, hoy),
            nota: Array.isArray(config.metodosPermitidos) && config.metodosPermitidos.length < 4
                ? `Solo con ${config.metodosPermitidos.join(', ')}`
                : null
        });
    };

    Object.entries(packPrices || {}).forEach(([nombre, config]) => {
        if (nombre === 'lastModifiedAt') return;
        agregarPorPrecio(config, nombre, 'pack');
    });

    Object.entries(individualPrices || {}).forEach(([id, config]) => {
        const producto = catalogoIndividuales.find(p => p.id === id);
        agregarPorPrecio(config, producto?.name || id, 'plato');
    });

    // --- Cupones ---
    cupones.forEach(c => {
        if (!c?.active) return;
        const agotado = c.maxUses && (c.usedCount || 0) >= c.maxUses;
        items.push({
            clave: `cupon:${c.id}`,
            origen: 'cupon',
            nombre: c.code || '(sin código)',
            descuento: formatearValor(c.discountType === 'fixed' ? 'fijo' : 'porcentaje', c.discountValue ?? c.discount),
            desde: c.startDate || null,
            hasta: c.expirationDate || null,
            vigente: !agotado && dentroDeVigencia(c.startDate, c.expirationDate, hoy),
            nota: c.maxUses ? `${c.usedCount || 0} de ${c.maxUses} usos` : null
        });
    });

    // --- Promociones ---
    promociones.forEach(p => {
        if (!p?.activa) return;
        items.push({
            clave: `promocion:${p.id}`,
            origen: 'promocion',
            nombre: p.titulo || '(sin título)',
            descuento: p.descuentoTexto || p.badge || 'Ver promoción',
            desde: p.fechaInicio || null,
            hasta: p.fechaFin || null,
            vigente: dentroDeVigencia(p.fechaInicio, p.fechaFin, hoy),
            nota: null
        });
    });

    // --- Envío ---
    if (envio?.enabled) {
        items.push({
            clave: 'envio:global',
            origen: 'envio',
            nombre: 'Descuento de envío (todos los pedidos)',
            descuento: formatearValor('porcentaje', envio.percentage),
            desde: null,
            hasta: null,
            vigente: true,
            nota: envio.message || null
        });
    }

    // Los que están corriendo ahora, primero
    return items.sort((a, b) => {
        if (a.vigente !== b.vigente) return a.vigente ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
    });
};

/** Resumen para el encabezado. */
export const resumirDescuentos = (items = []) => ({
    total: items.length,
    vigentes: items.filter(i => i.vigente).length,
    programados: items.filter(i => !i.vigente).length
});
