import { describe, it, expect } from 'vitest';
import { cambioDeProteinas, estadoDeLaEntrega, proteinasConElCalendarioNuevo } from '../utils/proteinasPorEntrega';
import { loQueSePuedeCambiar, validarPedidoDeCambios, cambioParaGuardar, loGuardadoParaElLink } from '../utils/cambiosDeLaSemana';
import { respuestaDe } from '../utils/envioDeCambios';
import { mapPedidosFromLegacy } from '../utils/logisticsUtils';

/**
 * El selector de proteínas de los packs mensuales, de punta a punta: lo que se
 * elige en "Proteínas de la semana" y lo que el cliente elige por el link
 * tienen que ser LA MISMA lista, y es la que cocina la hoja de esa entrega.
 */

const MENUS = {
    proteinasDisponibles: ['Pollo caribeño', 'Tortas de carne en salsa', 'Tilapia empanizada', 'Fajitas de res', 'Pollo al curry', 'Cerdo agridulce']
};
const FECHAS = ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'];
const inicial = () => ({
    id: 'doc-xiomara',
    cliente: 'Xiomara Vilchez',
    plan: 'pack mensual proteínas 250 g',
    status: 'confirmed',
    fecha_entrega: FECHAS[0],
    fechas_entrega: FECHAS,
    items: [{ nombre: 'Pack 5 Proteínas (250g)', cantidad: 1, plan: 'monthly',
        proteinas: ['Pollo teriyaki', 'Carne mechada', 'Tilapia empanizada', 'Pollo a la naranja', 'Lomo encebollado'] }]
});
/** Lo que haría Firestore con un update(): pisar los campos que vienen. */
const guardar = (pedido, cambios) => ({ ...pedido, ...(cambios || {}) });
const cocina = (pedido, fecha) => mapPedidosFromLegacy([pedido], [fecha])[0].platos.map(p => p.proteina.nombre);

const DEL_21 = ['Pollo caribeño', 'Tortas de carne en salsa', 'Tilapia empanizada', 'Fajitas de res', 'Pollo al curry'];
const DEL_28 = ['Cerdo agridulce', 'Cerdo agridulce', 'Pollo al curry', 'Pollo caribeño', 'Fajitas de res'];

describe('lo elegido en el admin', () => {
    const p = guardar(inicial(), cambioDeProteinas(inicial(), '2026-09-21', DEL_21));

    it('lo cocina la hoja de ESA entrega y las otras no se tocan', () => {
        expect(cocina(p, '2026-09-21')).toEqual(DEL_21);
        expect(estadoDeLaEntrega(p, '2026-09-28').origen).toBe('falta');
    });

    it('el cliente lo ve ya marcado al abrir el link, aunque nunca haya respondido', () => {
        const permitido = loQueSePuedeCambiar(p, MENUS, {});
        expect(loGuardadoParaElLink(p, '2026-09-21', permitido).proteinas).toEqual(DEL_21);
        expect(loGuardadoParaElLink(p, '2026-09-28', permitido)).toBeNull();
    });
});

describe('lo elegido por el cliente en el link', () => {
    const antes = inicial();
    const permitido = loQueSePuedeCambiar(antes, MENUS, {});
    const { limpio } = validarPedidoDeCambios(permitido, { proteinas: DEL_28, notas: 'sin picante' });
    const p = guardar(antes, cambioParaGuardar(antes, '2026-09-28', limpio));

    it('lo cocina la hoja, con la proteína repetida dos veces', () => {
        expect(cocina(p, '2026-09-28')).toEqual(DEL_28);
    });

    it('la nota le llega a la hoja pero la lista no se repite como texto', () => {
        expect(p.cambiosPorEntrega['2026-09-28']).toBe('Nota del cliente: sin picante');
    });

    it('si después Gina la cambia en el admin, el link y el panel muestran lo de Gina', () => {
        const deGina = ['Pollo caribeño', 'Pollo caribeño', 'Pollo al curry', 'Fajitas de res', 'Tilapia empanizada'];
        const q = guardar(p, cambioDeProteinas(p, '2026-09-28', deGina));
        expect(cocina(q, '2026-09-28')).toEqual(deGina);
        expect(loGuardadoParaElLink(q, '2026-09-28', permitido).proteinas).toEqual(deGina);
        expect(respuestaDe(q, '2026-09-28').proteinas).toEqual(deGina);
        expect(loGuardadoParaElLink(q, '2026-09-28', permitido).notas).toBe('sin picante');
    });

    it('si Gina la quita, el link ya no la muestra marcada', () => {
        const q = guardar(p, cambioDeProteinas(p, '2026-09-28', []));
        expect(loGuardadoParaElLink(q, '2026-09-28', permitido).proteinas).toEqual([]);
        expect(respuestaDe(q, '2026-09-28').proteinas).toEqual([]);
    });
});

describe('escrita a mano en el admin', () => {
    it('en minúscula se marca igual; una que no está en la lista no se marca (no se podría quitar)', () => {
        const p = guardar(inicial(), cambioDeProteinas(inicial(), '2026-09-21', ['pollo caribeño', 'Pescado frito', 'Fajitas de res']));
        const permitido = loQueSePuedeCambiar(p, MENUS, {});
        expect(loGuardadoParaElLink(p, '2026-09-21', permitido).proteinas).toEqual(['Pollo caribeño', 'Fajitas de res']);
    });
});

describe('cambiar las fechas en Pedidos → Entregas programadas', () => {
    const p = guardar(inicial(), cambioDeProteinas(inicial(), '2026-09-21', DEL_21));

    it('la entrega que se movió se lleva sus proteínas', () => {
        const nuevas = ['2026-09-14', '2026-09-22', '2026-09-28', '2026-10-05'];
        const mapa = proteinasConElCalendarioNuevo(p.proteinasPorEntrega, FECHAS, nuevas);
        expect(mapa).toEqual({ '2026-09-22': DEL_21 });
        const q = guardar(p, { fechas_entrega: nuevas, fecha_entrega: nuevas[0], calendarioFijo: true, proteinasPorEntrega: mapa });
        expect(cocina(q, '2026-09-22')).toEqual(DEL_21);
    });

    it('si la entrega con proteínas no se tocó, no se escribe nada de más', () => {
        expect(proteinasConElCalendarioNuevo(p.proteinasPorEntrega, FECHAS, ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-06'])).toBeNull();
        expect(proteinasConElCalendarioNuevo(undefined, FECHAS, ['2026-09-15'])).toBeNull();
    });

    it('si se quita sin poner otra, no se pierde: queda guardada donde estaba', () => {
        expect(proteinasConElCalendarioNuevo(p.proteinasPorEntrega, FECHAS, ['2026-09-14', '2026-09-28', '2026-10-05'])).toBeNull();
    });
});
