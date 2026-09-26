import { describe, it, expect } from 'vitest';
import {
    horaLimiteDe, estaCerrada, horaLimiteEnPalabras, entregaAbierta,
    familiaDelPedido, llevaCena, loQueSePuedeCambiar, validarPedidoDeCambios, cambioParaGuardar, textoParaLaHoja
} from '../utils/cambiosDeLaSemana';
import { leerCambioDePack } from '../utils/desayunosPersonalizados';

/**
 * Los cambios que el cliente pide desde el link de WhatsApp (25 set 2026).
 * Se cierra el miércoles 8 p. m., solo con la lista de Gina, máximo 2 por pack.
 */

const MENUS = {
    bajoCalorias: [
        { numero: 1, proteina: 'Filet de tilapia empanizado', vegetal: 'Relish de vegetales', carbo: 'Arroz con peregil' },
        { numero: 2, proteina: 'Cerdo mechado en salsa criolla natural', vegetal: 'Picadillo de repollo', carbo: 'Pure de papa' },
        { numero: 3, proteina: 'Pollo mostaza miel', vegetal: 'Guiso de ayote y maiz', carbo: 'Papitas salteadas' }
    ],
    cena: {
        bajoCalorias: [{ numero: 1, proteina: 'Trocitos de cerdo en salsa criolla', vegetal: 'Vegetales salteados', carbo: 'Arroz con peregil' }]
    },
    proteinasDisponibles: ['Pollo mostaza miel', 'Tilapia a la menieur', 'Fajitas de lomo chimichurri', 'Pollo mechado en salsa']
};
const SUSTITUCIONES = {
    proteins: ['Filet de pollo encebollado', 'Estofado de res casero'],
    vegetables: ['Vegetales mixtos', 'Picadillo mixto'],
    carbos: ['Arroz blanco', 'Gajos de camote']
};
const PACK = {
    plan: 'Pack Mensual Bajo en Calorías',
    items: [{ nombre: 'Pack Mensual Bajo en Calorías', cantidad: 1 }],
    fechas_entrega: ['2026-09-12', '2026-09-19', '2026-09-26', '2026-10-03']
};

describe('la hora límite', () => {
    it('sábado 26 y lunes 28 cierran el miércoles 23 a las 8 p. m. de Costa Rica', () => {
        expect(horaLimiteDe('2026-09-26').toISOString()).toBe('2026-09-24T02:00:00.000Z');
        expect(horaLimiteDe('2026-09-28').toISOString()).toBe('2026-09-24T02:00:00.000Z');
    });

    it('a las 7:59 p. m. todavía se puede; a las 8 ya no', () => {
        expect(estaCerrada('2026-09-26', new Date('2026-09-24T01:59:00Z'))).toBe(false);
        expect(estaCerrada('2026-09-26', new Date('2026-09-24T02:00:00Z'))).toBe(true);
    });

    it('se lo dice al cliente en palabras', () => {
        expect(horaLimiteEnPalabras('2026-09-26')).toMatch(/miércoles 23 de setiembre, 8 p\. m\./);
    });

    it('la entrega abierta es la primera que no cerró', () => {
        expect(entregaAbierta(PACK, new Date('2026-09-23T15:00:00Z'))).toBe('2026-09-26');
        expect(entregaAbierta(PACK, new Date('2026-09-25T15:00:00Z'))).toBe('2026-10-03');
    });
});

describe('qué menú le toca', () => {
    it('la familia sale del nombre del pack', () => {
        expect(familiaDelPedido(PACK)).toBe('bajoCalorias');
        expect(familiaDelPedido({ plan: 'Pack mensual Regular con desayunos' })).toBe('regular');
    });

    it('las cenas solo si las lleva, y "solo almuerzos" no', () => {
        expect(llevaCena({ plan: 'Pack Quincenal Bajo en Calorías Almuerzo y Cena' })).toBe(true);
        expect(llevaCena({ plan: 'Pack Quincenal Bajo en Calorías con cena — solo almuerzos' })).toBe(false);
        expect(llevaCena(PACK)).toBe(false);
    });

    it('arma el menú de su familia con las opciones de Gina', () => {
        const p = loQueSePuedeCambiar(PACK, MENUS, SUSTITUCIONES);
        expect(p.tipo).toBe('menu');
        expect(p.almuerzos).toHaveLength(3);
        expect(p.cenas).toEqual([]);
        expect(p.opciones.proteina).toEqual(['Filet de pollo encebollado', 'Estofado de res casero']);
        expect(p.maxCambios).toBe(2);
    });

    it('un pack de proteínas elige de la lista de la semana', () => {
        const p = loQueSePuedeCambiar({ plan: 'Pack 3 Proteínas (500g)', items: [{ nombre: 'Pack 3 Proteínas (500g)' }] }, MENUS, SUSTITUCIONES);
        expect(p.tipo).toBe('proteinas');
        expect(p.proteinas.cuantas).toBe(3);
        expect(p.proteinas.disponibles).toContain('Tilapia a la menieur');
    });

    it('sin menú de su familia no se ofrece el link', () => {
        expect(loQueSePuedeCambiar({ plan: 'Pack Keto' }, MENUS, SUSTITUCIONES)).toBeNull();
    });
});

describe('lo que se guarda', () => {
    const permitido = loQueSePuedeCambiar(PACK, MENUS, SUSTITUCIONES);

    it('un cambio de la lista de Gina pasa, con el plato de antes', () => {
        const { errores, limpio } = validarPedidoDeCambios(permitido, {
            cambios: [{ comida: 'almuerzo', plato: 1, parte: 'proteina', a: 'Filet de pollo encebollado' }],
            notas: 'sin cebolla'
        });
        expect(errores).toEqual([]);
        expect(limpio.cambios).toEqual([{ comida: 'almuerzo', parte: 'proteina', de: 'Filet de tilapia empanizado', a: 'Filet de pollo encebollado', platos: [1] }]);
    });

    it('algo que no está en la lista NO pasa, aunque la página lo mande', () => {
        const { errores } = validarPedidoDeCambios(permitido, {
            cambios: [{ plato: 1, parte: 'proteina', a: 'Langosta' }]
        });
        expect(errores.join(' ')).toMatch(/no está en las opciones/);
    });

    it('más de 2 cambios en un pack no pasa; en un two pack sí caben 4', () => {
        const tres = [1, 2, 3].map(n => ({ plato: n, parte: 'vegetal', a: 'Vegetales mixtos' }));
        expect(validarPedidoDeCambios(permitido, { cambios: tres }).errores.join(' ')).toMatch(/hasta 2 cambios/);
        const dos = loQueSePuedeCambiar({ ...PACK, items: [{ nombre: PACK.plan, cantidad: 2 }] }, MENUS, SUSTITUCIONES);
        expect(validarPedidoDeCambios(dos, { cambios: tres }).errores).toEqual([]);
    });

    it('sin ningún cambio ni nota no hay nada que guardar', () => {
        expect(validarPedidoDeCambios(permitido, {}).errores.join(' ')).toMatch(/No elegiste/);
    });

    it('el pack de proteínas tiene que elegir justo las que le tocan', () => {
        const prot = loQueSePuedeCambiar({ plan: 'Pack 3 Proteínas (500g)' }, MENUS, SUSTITUCIONES);
        expect(validarPedidoDeCambios(prot, { proteinas: ['Pollo mostaza miel'] }).errores.join(' ')).toMatch(/elegir 3/);
        const bien = validarPedidoDeCambios(prot, { proteinas: ['Pollo mostaza miel', 'Tilapia a la menieur', 'Pollo mostaza miel'] });
        expect(bien.errores).toEqual([]);
    });

    it('se guarda por FECHA, sin tocar las otras semanas', () => {
        const pedido = { ...PACK, cambiosPorEntrega: { '2026-09-19': 'Cambiar chayote por papitas salteadas' } };
        const { limpio } = validarPedidoDeCambios(permitido, { cambios: [{ plato: 2, parte: 'carbo', a: 'Arroz blanco' }] });
        const cambio = cambioParaGuardar(pedido, '2026-09-26', limpio, { ahora: new Date('2026-09-23T15:00:00Z') });
        expect(cambio.cambiosPorEntrega).toEqual({
            '2026-09-19': 'Cambiar chayote por papitas salteadas',
            '2026-09-26': 'Cambiar Pure de papa por Arroz blanco'
        });
        expect(cambio.cambiosDelLink['2026-09-26'].origen).toBe('link-del-cliente');
        expect(cambio.proteinasPorEntrega).toBeUndefined();
    });

    it('en la hoja es TEXTO, nunca un objeto: la hoja lo imprime tal cual', () => {
        const { limpio } = validarPedidoDeCambios(permitido, { cambios: [{ plato: 1, parte: 'proteina', a: 'Estofado de res casero' }] });
        const cambio = cambioParaGuardar(PACK, '2026-09-26', limpio);
        expect(typeof cambio.cambiosPorEntrega['2026-09-26']).toBe('string');
        expect(cambio.cambiosPorEntrega['2026-09-26']).toBe('Cambiar Filet de tilapia empanizado por Estofado de res casero');
    });

    it('lo que Gina ya escribió para esa fecha se respeta; lo del cliente se reemplaza si vuelve a mandar', () => {
        const deGina = { ...PACK, cambiosPorEntrega: { '2026-09-26': 'Sin cebolla (Gina)' } };
        const primero = validarPedidoDeCambios(permitido, { cambios: [{ plato: 1, parte: 'proteina', a: 'Estofado de res casero' }] }).limpio;
        const c1 = cambioParaGuardar(deGina, '2026-09-26', primero);
        expect(c1.cambiosPorEntrega['2026-09-26']).toBe('Sin cebolla (Gina) · Cambiar Filet de tilapia empanizado por Estofado de res casero');

        const segundo = validarPedidoDeCambios(permitido, { cambios: [{ plato: 3, parte: 'vegetal', a: 'Vegetales mixtos' }] }).limpio;
        const c2 = cambioParaGuardar({ ...deGina, ...c1 }, '2026-09-26', segundo);
        expect(c2.cambiosPorEntrega['2026-09-26']).toBe('Sin cebolla (Gina) · Cambiar Guiso de ayote y maiz por Vegetales mixtos');
    });

    it('la hoja de cocina reconoce el cambio con SU PROPIO lector', () => {
        const { limpio } = validarPedidoDeCambios(permitido, { cambios: [
            { plato: 1, parte: 'proteina', a: 'Filet de pollo encebollado' },
            { plato: 2, parte: 'vegetal', a: 'Vegetales mixtos' }
        ] });
        // Sirve para las dos versiones de la hoja: la publicada al 25 set 2026
        // aplica solo el PRIMER cambio del texto; la nueva los aplica todos.
        const cambio = leerCambioDePack(textoParaLaHoja(limpio), MENUS.bajoCalorias, 'Pack Mensual Bajo en Calorías');
        expect(cambio).not.toBeNull();
        expect(JSON.stringify(cambio)).toMatch(/Filet de pollo encebollado/);
    });

    it('la nota del cliente NO dispara cambios en la cocina', () => {
        const { limpio } = validarPedidoDeCambios(permitido, { notas: 'Cambiar el Arroz con peregil por pizza por favor' });
        const texto = textoParaLaHoja(limpio);
        expect(texto).toMatch(/^Nota del cliente: /);
        expect(leerCambioDePack(texto, MENUS.bajoCalorias, 'Pack Mensual Bajo en Calorías')).toBeNull();
    });

    it('el mismo ingrediente en dos platos es UN cambio, y dice en cuáles', () => {
        const conDosPures = loQueSePuedeCambiar(PACK, { ...MENUS, bajoCalorias: [
            ...MENUS.bajoCalorias,
            { numero: 4, proteina: 'Pollo a la naranja', vegetal: 'Chayote con zanahoria salteado', carbo: 'Pure de papa' }
        ] }, SUSTITUCIONES);
        const { errores, limpio } = validarPedidoDeCambios(conDosPures, { cambios: [
            { plato: 2, parte: 'carbo', a: 'Arroz blanco' },
            { plato: 4, parte: 'carbo', a: 'Arroz blanco' }
        ] });
        expect(errores).toEqual([]);
        expect(limpio.cambios).toEqual([{ comida: 'almuerzo', parte: 'carbo', de: 'Pure de papa', a: 'Arroz blanco', platos: [2, 4] }]);
    });

    it('el pack de proteínas también queda donde la hoja ya lo lee', () => {
        const prot = loQueSePuedeCambiar({ plan: 'Pack 3 Proteínas (500g)' }, MENUS, SUSTITUCIONES);
        const { limpio } = validarPedidoDeCambios(prot, { proteinas: ['Pollo mostaza miel', 'Tilapia a la menieur', 'Pollo mechado en salsa'] });
        const cambio = cambioParaGuardar({}, '2026-09-26', limpio);
        expect(cambio.proteinasPorEntrega['2026-09-26']).toHaveLength(3);
    });
});
