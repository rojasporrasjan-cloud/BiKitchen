import { describe, it, expect } from 'vitest';
import {
    leerMenuPegado, menuComoTexto, menuDelPedido, listaDelMenu,
    listaConMenu, cambiosDelMenuDelPedido, cambiosDelPedido
} from '../utils/guardarPedidoDeLaHoja';

/**
 * El mensaje tal cual lo mandó Jan el 10 de setiembre de 2026 para el menú de
 * Dalia Parrales: los datos del cliente arriba, una línea suelta de cuántos
 * menús, los cinco platos, y una línea de cierre.
 */
const MENSAJE_DE_DALIA = `Cliente: Dalia Parales
Lugar curri
Teléfono 88505919


3 menus bajos en calorias

Fajitas de pollo al limon y hierbas
Chayotes salteados al ajillo
Arroz blanco

Carne de res en salsa criolla
Picadillo de ayote
Pastel de maduro

Pollo al pesto
Zuchinnis salteados
Papitas salteadas

Filet de tilapia en mantequilla
Ensalada coleslaw
Pure de papa

Pollo en salsa mediterranea
Mix vegetales
Arroz al cilantro

asi queda el menu de dalia esta entrega`;

describe('leer el menú pegado de WhatsApp', () => {
    const { platos, ignorados } = leerMenuPegado(MENSAJE_DE_DALIA);

    it('saca los cinco platos, ni uno más', () => {
        expect(platos).toHaveLength(5);
    });

    /**
     * "Cliente / Lugar / Teléfono" son tres renglones seguidos, igual que un
     * plato. Sin el filtro salían como el Plato 1 y todo quedaba corrido.
     */
    it('los datos del cliente no se vuelven un plato', () => {
        expect(platos[0].proteina).toBe('Fajitas de pollo al limon y hierbas');
        expect(platos.some(p => /cliente|curri|8850/i.test(JSON.stringify(p)))).toBe(false);
    });

    it('cada bloque es proteína, vegetal y carbo, en ese orden', () => {
        expect(platos[3]).toEqual({
            proteina: 'Filet de tilapia en mantequilla',
            vegetal: 'Ensalada coleslaw',
            carbo: 'Pure de papa'
        });
        expect(platos[4]).toEqual({
            proteina: 'Pollo en salsa mediterranea',
            vegetal: 'Mix vegetales',
            carbo: 'Arroz al cilantro'
        });
    });

    it('ni "3 menus" ni "asi queda" se toman por platos', () => {
        expect(ignorados.join(' ')).not.toMatch(/Fajitas|Tilapia/);
    });

    it('un bloque de dos renglones es un plato sin harina', () => {
        const r = leerMenuPegado('Pollo al curry\nBrocoli al vapor');
        expect(r.platos).toEqual([{ proteina: 'Pollo al curry', vegetal: 'Brocoli al vapor', carbo: '' }]);
    });

    /**
     * Un bloque de cuatro renglones es casi siempre que faltó el renglón en
     * blanco entre dos platos. Adivinar cómo partirlo es inventar un plato:
     * se muestra para que la persona lo arregle.
     */
    it('un bloque raro no se adivina: se avisa', () => {
        const r = leerMenuPegado('A\nB\nC\nD');
        expect(r.platos).toHaveLength(0);
        expect(r.ignorados).toEqual(['A / B / C / D']);
    });

    it('aguanta viñetas y espacios de más', () => {
        const r = leerMenuPegado('◽ Pollo al pesto  \n - Zuchinnis salteados\n• Papitas');
        expect(r.platos[0]).toEqual({ proteina: 'Pollo al pesto', vegetal: 'Zuchinnis salteados', carbo: 'Papitas' });
    });

    it('menuComoTexto es la vuelta de leerMenuPegado', () => {
        expect(leerMenuPegado(menuComoTexto(platos)).platos).toEqual(platos);
    });
});

describe('guardar el menú en el pedido', () => {
    // El pedido de Dalia con el menú de la semana pasada.
    const pedido = {
        id: 'abc',
        items: [{
            nombre: 'Personalizado Bajo Calorías',
            cantidad: 3,
            proteinas: ['Pollo teriyaki', 'Carne mechada', 'Pollo al curry', 'Tilapia al ajillo', 'Albondigas'],
            vegetales: ['V1', 'V2', 'V3', 'V4', 'V5'],
            carbos: ['C1', 'C2', 'C3', 'C4', 'C5'],
            cantidades: [1, 1, 1, 1, 1],
            customizations: { proteinChanges: [{ dishNumber: 1, newValue: 'Tilapia' }], notas: 'sin cerdo' }
        }]
    };
    const nuevos = leerMenuPegado(MENSAJE_DE_DALIA).platos;

    it('escribe las tres listas en el item del pack', () => {
        const [it0] = listaConMenu(pedido.items, nuevos);
        expect(it0.proteinas[0]).toBe('Fajitas de pollo al limon y hierbas');
        expect(it0.vegetales[1]).toBe('Picadillo de ayote');
        expect(it0.carbos[4]).toBe('Arroz al cilantro');
    });

    it('conserva lo demás del item: nombre, cantidad, notas', () => {
        const [it0] = listaConMenu(pedido.items, nuevos);
        expect(it0.nombre).toBe('Personalizado Bajo Calorías');
        expect(it0.cantidad).toBe(3);
        expect(it0.customizations.notas).toBe('sin cerdo');
    });

    /**
     * Los cambios por plato eran sobre el menú viejo. Encima del nuevo, la hoja
     * habría impreso "Fajitas de pollo → Tilapia" en el Plato 1 de Dalia.
     */
    it('quita los cambios por plato del menú anterior', () => {
        const [it0] = listaConMenu(pedido.items, nuevos);
        expect(it0.customizations.proteinChanges).toBeUndefined();
    });

    it('mismo número de platos: conserva las cantidades', () => {
        expect(listaConMenu(pedido.items, nuevos)[0].cantidades).toEqual([1, 1, 1, 1, 1]);
    });

    it('otro número de platos: quita cantidades para que no queden corridas', () => {
        const [it0] = listaConMenu(pedido.items, nuevos.slice(0, 3));
        expect(it0.cantidades).toBeUndefined();
    });

    it('no toca los otros items del pedido', () => {
        const conOtro = [...pedido.items, { nombre: 'Tortas de maduro', cantidad: 2 }];
        expect(listaConMenu(conOtro, nuevos)[1]).toEqual({ nombre: 'Tortas de maduro', cantidad: 2 });
    });

    /**
     * La trampa de Xiomara Vilchez: si el pedido guarda los platos en `menu`,
     * escribirlos en `items` sale sin error y la hoja sigue leyendo `menu`.
     */
    it('escribe donde la hoja lee: `menu` si ahí están los platos', () => {
        const viejo = { menu: pedido.items, items: [{ nombre: 'resumen' }] };
        expect(listaDelMenu(viejo)).toBe('menu');
        const cambios = cambiosDelMenuDelPedido(viejo, nuevos);
        expect(Object.keys(cambios)).toEqual(['menu']);
    });

    it('si el menú es el mismo no manda nada', () => {
        expect(cambiosDelMenuDelPedido(pedido, menuDelPedido(pedido))).toBeNull();
    });

    it('cambiosDelPedido junta notas y menú en un solo guardado', () => {
        const c = cambiosDelPedido(pedido, { observaciones: 'Curri', proteinas: null, menu: nuevos });
        expect(c.observaciones).toBe('Curri');
        expect(c.items[0].proteinas).toHaveLength(5);
    });

    it('sin menú, cambiosDelPedido sigue igual que antes', () => {
        expect(cambiosDelPedido(pedido, { observaciones: '', proteinas: null })).toBeNull();
    });
});
