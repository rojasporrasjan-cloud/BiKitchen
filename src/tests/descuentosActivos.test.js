import { describe, it, expect } from 'vitest';
import { recolectarDescuentos, resumirDescuentos } from '../utils/descuentosActivos';

/**
 * El tablero junta cinco fuentes distintas. Lo que importa es que no se le pase
 * ninguno activo y que distinga lo que corre HOY de lo que quedó programado
 * o ya venció: un descuento vencido que se muestre como vigente lleva a buscar
 * un problema de precios donde no lo hay.
 */

const HOY = new Date('2026-08-17T09:00:00');

describe('recolectarDescuentos', () => {
    it('lee un descuento de pack activo', () => {
        const items = recolectarDescuentos({
            packPrices: {
                'Pack Keto': { descuentoActivo: true, tipoDescuento: 'porcentaje', valorDescuento: 25 },
                'Pack Regular': { descuentoActivo: false, valorDescuento: 10 }
            }
        }, HOY);

        expect(items).toHaveLength(1);
        expect(items[0].nombre).toBe('Pack Keto');
        expect(items[0].descuento).toBe('25%');
        expect(items[0].origen).toBe('pack');
        expect(items[0].vigente).toBe(true);
    });

    it('ignora el campo de metadata lastModifiedAt', () => {
        const items = recolectarDescuentos({
            packPrices: { lastModifiedAt: '2026-08-01', 'Pack Keto': { descuentoActivo: true, valorDescuento: 10 } }
        }, HOY);
        expect(items).toHaveLength(1);
        expect(items[0].nombre).toBe('Pack Keto');
    });

    it('formatea el monto fijo con el mismo formateador del resto del panel', () => {
        const items = recolectarDescuentos({
            packPrices: { 'Full Pack': { descuentoActivo: true, tipoDescuento: 'fijo', valorDescuento: 5000 } }
        }, HOY);
        // El separador de miles depende del navegador, así que se comprueba el
        // símbolo y los dígitos, no el separador exacto.
        expect(items[0].descuento).toMatch(/^₡5.?000$/);
    });

    it('usa el nombre del producto para los platos, no su id', () => {
        const items = recolectarDescuentos({
            individualPrices: { 'pollo-teriyaki': { descuentoActivo: true, valorDescuento: 15 } },
            catalogoIndividuales: [{ id: 'pollo-teriyaki', name: 'Pollo Teriyaki' }]
        }, HOY);
        expect(items[0].nombre).toBe('Pollo Teriyaki');
        expect(items[0].origen).toBe('plato');
    });

    it('marca como NO vigente lo que ya venció', () => {
        const items = recolectarDescuentos({
            packPrices: {
                'Pack Vencido': {
                    descuentoActivo: true, valorDescuento: 20,
                    fechaInicio: '2026-07-01', fechaFin: '2026-07-31'
                }
            }
        }, HOY);
        expect(items[0].vigente).toBe(false);
    });

    it('marca como NO vigente lo que todavía no empieza', () => {
        const items = recolectarDescuentos({
            packPrices: {
                'Pack Futuro': {
                    descuentoActivo: true, valorDescuento: 20,
                    fechaInicio: '2026-09-01', fechaFin: '2026-09-30'
                }
            }
        }, HOY);
        expect(items[0].vigente).toBe(false);
    });

    it('sin fechas configuradas cuenta como permanente', () => {
        const items = recolectarDescuentos({
            packPrices: { 'Pack Siempre': { descuentoActivo: true, valorDescuento: 10 } }
        }, HOY);
        expect(items[0].vigente).toBe(true);
    });

    it('avisa cuando el descuento solo aplica con ciertos pagos', () => {
        const items = recolectarDescuentos({
            packPrices: {
                'Pack SINPE': {
                    descuentoActivo: true, valorDescuento: 10,
                    metodosPermitidos: ['sinpe', 'transfer']
                }
            }
        }, HOY);
        expect(items[0].nota).toMatch(/sinpe/i);
    });

    it('un cupón agotado no cuenta como vigente', () => {
        const items = recolectarDescuentos({
            cupones: [
                { id: 'c1', code: 'AGOTADO', active: true, discountValue: 10, maxUses: 5, usedCount: 5 },
                { id: 'c2', code: 'DISPONIBLE', active: true, discountValue: 10, maxUses: 5, usedCount: 2 }
            ]
        }, HOY);

        const agotado = items.find(i => i.nombre === 'AGOTADO');
        const disponible = items.find(i => i.nombre === 'DISPONIBLE');
        expect(agotado.vigente).toBe(false);
        expect(agotado.nota).toBe('5 de 5 usos');
        expect(disponible.vigente).toBe(true);
    });

    it('no lista cupones ni promociones desactivados', () => {
        const items = recolectarDescuentos({
            cupones: [{ id: 'c1', code: 'APAGADO', active: false, discountValue: 10 }],
            promociones: [{ id: 'p1', titulo: 'Vieja', activa: false }]
        }, HOY);
        expect(items).toEqual([]);
    });

    it('lee el descuento de envío global', () => {
        const items = recolectarDescuentos({
            envio: { enabled: true, percentage: 50, message: '50% en envío' }
        }, HOY);
        expect(items[0].origen).toBe('envio');
        expect(items[0].descuento).toBe('50%');
    });

    it('junta las cinco fuentes y pone los vigentes primero', () => {
        const items = recolectarDescuentos({
            packPrices: {
                'Pack Vencido': { descuentoActivo: true, valorDescuento: 20, fechaFin: '2026-07-31' },
                'Pack Keto': { descuentoActivo: true, valorDescuento: 25 }
            },
            individualPrices: { 'x': { descuentoActivo: true, valorDescuento: 15 } },
            catalogoIndividuales: [{ id: 'x', name: 'Lasaña' }],
            cupones: [{ id: 'c1', code: 'BIENVENIDO', active: true, discountValue: 10 }],
            promociones: [{ id: 'p1', titulo: 'Promo Agosto', activa: true }],
            envio: { enabled: true, percentage: 50 }
        }, HOY);

        expect(items).toHaveLength(6);
        // El vencido queda de último
        expect(items[items.length - 1].nombre).toBe('Pack Vencido');
        expect(new Set(items.map(i => i.origen)))
            .toEqual(new Set(['pack', 'plato', 'cupon', 'promocion', 'envio']));
    });

    it('convierte los Timestamp de Firestore a texto', () => {
        // Los cupones guardan las fechas como Timestamp ({seconds, nanoseconds}).
        // Devolver ese objeto hacía que React lo intentara pintar como hijo y
        // tumbaba la pantalla entera con el error #31. Pasó en producción.
        // Mediodía local: sin la hora, el navegador lo lee como UTC y en Costa
        // Rica (UTC-6) la fecha cae un día antes.
        const comoTimestamp = (iso) => ({
            seconds: Math.floor(new Date(`${iso}T12:00:00`).getTime() / 1000),
            nanoseconds: 0,
            toDate() { return new Date(this.seconds * 1000); }
        });

        const items = recolectarDescuentos({
            cupones: [{
                id: 'c1', code: 'CONFECHA', active: true, discountValue: 10,
                startDate: comoTimestamp('2026-08-01'),
                expirationDate: comoTimestamp('2026-08-31')
            }]
        }, HOY);

        expect(typeof items[0].desde).toBe('string');
        expect(typeof items[0].hasta).toBe('string');
        expect(items[0].desde).toBe('2026-08-01');
        expect(items[0].hasta).toBe('2026-08-31');
        expect(items[0].vigente).toBe(true);
    });

    it('NINGUNA fecha sale como objeto, venga como venga', () => {
        // Red de seguridad: si una fuente nueva trae otro formato de fecha, que
        // no se cuele un objeto hasta el JSX.
        const items = recolectarDescuentos({
            packPrices: { 'P': { descuentoActivo: true, valorDescuento: 5, fechaInicio: { raro: true } } },
            cupones: [{ id: 'c', code: 'X', active: true, discountValue: 5, startDate: { seconds: 1 } }],
            promociones: [{ id: 'p', titulo: 'T', activa: true, fechaFin: new Date('2026-12-01') }]
        }, HOY);

        items.forEach(i => {
            expect(['string', 'object']).toContain(typeof i.desde); // null es 'object'
            expect(i.desde === null || typeof i.desde === 'string').toBe(true);
            expect(i.hasta === null || typeof i.hasta === 'string').toBe(true);
        });
    });

    it('no revienta sin datos', () => {
        expect(recolectarDescuentos()).toEqual([]);
        expect(recolectarDescuentos({}, HOY)).toEqual([]);
    });
});

describe('resumirDescuentos', () => {
    it('cuenta vigentes y programados por separado', () => {
        const resumen = resumirDescuentos([
            { vigente: true }, { vigente: true }, { vigente: false }
        ]);
        expect(resumen).toEqual({ total: 3, vigentes: 2, programados: 1 });
    });
});
