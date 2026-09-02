/**
 * Lo que se cocina junto tiene que salir en UN renglón, con el desglose de a
 * dónde va. Si el mismo pollo sale dos veces porque está en dos menús, la cocina
 * lo prepara dos veces y se pierde tiempo, gas y espacio en la estufa.
 */

import { describe, it, expect } from 'vitest';
import { consolidarCocina, porcionesDelPlato, formatearCantidad, TIPO_COMPONENTE } from '../utils/cocinaConsolidada';

const plato = (numero, proteina, vegetal, carbo, extra = {}) => ({
    numero,
    cantidad: 1,
    proteina: { nombre: proteina, gramosPorPorcion: 120 },
    vegetal: { nombre: vegetal, unidad: 'taza', cantidadPorPorcion: 1 },
    carbo: { nombre: carbo, unidad: 'taza', cantidadPorPorcion: 0.5 },
    ...extra
});

const pedido = (cliente, tipoMenu, platos, cantidadMenus = 1) => ({
    cliente, tipoMenu, cantidadMenus, platos
});

// Sin merma, para que los números del test sean los reales
const SIN_MERMA = { marginPercent: 0 };

describe('consolidarCocina', () => {

    it('junta el mismo plato aunque venga de menús distintos', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Ana', 'Bajo Calorías', [plato(3, 'Pollo caribeño', 'Vegetales salteados', 'Pastel de yuca')]),
            pedido('Beto', 'Regular', [plato(2, 'Pollo caribeño', 'Vegetales salteados', 'Arroz blanco')])
        ], SIN_MERMA);

        const pollo = preparaciones.filter(p => p.nombre === 'Pollo caribeño');
        expect(pollo).toHaveLength(1);
        expect(pollo[0].porciones).toBe(2);
        expect(pollo[0].total).toBe(240);
    });

    it('dice cómo repartirlo: de dónde viene cada porción', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Ana', 'Bajo Calorías', [plato(3, 'Pollo caribeño', 'Veg', 'Yuca')], 3),
            pedido('Beto', 'Regular', [plato(2, 'Pollo caribeño', 'Veg', 'Arroz')], 2)
        ], SIN_MERMA);

        const pollo = preparaciones.find(p => p.nombre === 'Pollo caribeño');
        expect(pollo.porciones).toBe(5);
        expect(pollo.hayQueRepartir).toBe(true);
        expect(pollo.desglose).toEqual([
            { origen: 'Bajo Calorías · Plato 3', familia: 'Bajo Calorías', plato: 3, porciones: 3 },
            { origen: 'Regular · Plato 2', familia: 'Regular', plato: 2, porciones: 2 }
        ]);
    });

    it('si viene de un solo lado, no hay nada que repartir', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Ana', 'Bajo Calorías', [plato(1, 'Garbanzos con pollo', 'Picadillo', 'Arroz')])
        ], SIN_MERMA);

        expect(preparaciones.find(p => p.nombre === 'Garbanzos con pollo').hayQueRepartir).toBe(false);
    });

    it('una sustitución NO se junta con el plato original', () => {
        // Juntarlas haría que alguien reciba lo que no pidió
        const { preparaciones } = consolidarCocina([
            pedido('Ana', 'Bajo Calorías', [plato(1, 'Pollo caribeño', 'Veg', 'Arroz')]),
            pedido('Beto', 'Bajo Calorías', [plato(1, 'Pollo caribeño → Carne mechada', 'Veg', 'Arroz')])
        ], SIN_MERMA);

        const nombres = preparaciones.filter(p => p.tipo === TIPO_COMPONENTE.PROTEINA).map(p => p.nombre);
        expect(nombres).toContain('Pollo caribeño');
        expect(nombres).toContain('Pollo caribeño → Carne mechada');
        expect(preparaciones.find(p => /→/.test(p.nombre)).esSustitucion).toBe(true);
    });

    it('proteína, vegetal y carbo van aparte aunque se llamen igual', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Ana', 'Bajo Calorías', [plato(1, 'Picadillo mixto', 'Picadillo mixto', 'Arroz')])
        ], SIN_MERMA);

        const picadillos = preparaciones.filter(p => p.nombre === 'Picadillo mixto');
        expect(picadillos).toHaveLength(2);
        expect(picadillos.map(p => p.tipo).sort()).toEqual([TIPO_COMPONENTE.PROTEINA, TIPO_COMPONENTE.VEGETAL]);
    });

    it('el mismo nombre en gramos y en tazas no se suma', () => {
        const enTazas = pedido('Ana', 'Regular', [plato(1, 'Prot', 'Arroz blanco', 'X')]);
        const enGramos = pedido('Beto', 'Regular', [{
            numero: 1, cantidad: 1,
            proteina: { nombre: 'Prot', gramosPorPorcion: 120 },
            vegetal: { nombre: 'Arroz blanco', unidad: 'g', cantidadPorPorcion: 200 },
            carbo: { nombre: 'X', unidad: 'taza', cantidadPorPorcion: 0.5 }
        }]);

        const { preparaciones } = consolidarCocina([enTazas, enGramos], SIN_MERMA);
        const arroz = preparaciones.filter(p => p.nombre === 'Arroz blanco');
        expect(arroz).toHaveLength(2);
        expect(arroz.map(p => p.unidad).sort()).toEqual(['g', 'taza']);
    });

    it('multiplica por los packs del cliente', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Two Pack', 'Bajo Calorías', [plato(1, 'Pollo', 'Veg', 'Arroz')], 2)
        ], SIN_MERMA);

        expect(preparaciones.find(p => p.nombre === 'Pollo').porciones).toBe(2);
    });

    it('cuenta las veces que un plato se repite DENTRO del pack', () => {
        // Un personalizado puede llevar 2 porciones de una receta y 1 de otra.
        // buildKitchenSheetData se saltaba este factor y lo cocinaba una sola vez.
        const { preparaciones } = consolidarCocina([
            pedido('Christopher', 'Personalizado', [
                plato(1, 'Albóndigas', 'Veg', 'Arroz', { vecesPorPack: 2 })
            ])
        ], SIN_MERMA);

        expect(preparaciones.find(p => p.nombre === 'Albóndigas').porciones).toBe(2);
    });

    it('aplica la merma de cocina sin tocar el neto', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Ana', 'Bajo Calorías', [plato(1, 'Pollo', 'Veg', 'Arroz')], 10)
        ], { marginPercent: 30 });

        const pollo = preparaciones.find(p => p.nombre === 'Pollo');
        expect(pollo.porciones).toBe(10);          // lo que se empaca
        expect(pollo.porcionesCocina).toBe(13);    // lo que se cocina
        expect(pollo.total).toBe(1200);
        expect(pollo.totalCocina).toBe(1560);
    });

    it('ignora los platos vacíos: un pack sin harina no genera renglón', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Ana', 'Sin Carbos', [{
                numero: 1, cantidad: 1,
                proteina: { nombre: 'Pollo', gramosPorPorcion: 120 },
                vegetal: { nombre: 'Vegetales', unidad: 'taza', cantidadPorPorcion: 2 },
                carbo: { nombre: '—', unidad: 'taza', cantidadPorPorcion: 0 }
            }])
        ], SIN_MERMA);

        expect(preparaciones.some(p => p.tipo === TIPO_COMPONENTE.CARBO)).toBe(false);
        expect(preparaciones).toHaveLength(2);
    });

    it('las proteínas van primero y de mayor a menor', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Ana', 'Bajo Calorías', [plato(1, 'Poco pedido', 'Veg', 'Arroz')]),
            pedido('Beto', 'Bajo Calorías', [plato(2, 'Muy pedido', 'Veg', 'Arroz')], 9)
        ], SIN_MERMA);

        expect(preparaciones[0].tipo).toBe(TIPO_COMPONENTE.PROTEINA);
        expect(preparaciones[0].nombre).toBe('Muy pedido');
    });

    it('un lote vacío no rompe nada', () => {
        expect(consolidarCocina([]).preparaciones).toEqual([]);
        expect(consolidarCocina(null).preparaciones).toEqual([]);
    });
});

describe('porcionesDelPlato', () => {
    it('en un pack toma la MAYOR de las dos cantidades, no las multiplica', () => {
        // cantidadMenus y la cantidad del ítem son dos formas de escribir el
        // mismo dato: uno entra por la web y el otro por WhatsApp. Multiplicarlas
        // le cocinaba 9 packs a quien lleva 3. Después sí se multiplica por las
        // veces que la receta se repite dentro del pack, que es otro dato.
        const pack = (n) => ({ plan: 'Pack Bajo Calorias', cantidadMenus: n });
        expect(porcionesDelPlato(pack(2), { cantidad: 3, vecesPorPack: 2 })).toBe(6);
        expect(porcionesDelPlato(pack(3), { cantidad: 3 })).toBe(3);
        expect(porcionesDelPlato(pack(3), { cantidad: 1 })).toBe(3);

        // Un PERSONALIZADO tambien es pack, aunque no mapee a ningun menu
        expect(porcionesDelPlato({ plan: 'PERSONALIZADO - Chris', cantidadMenus: 2 }, { cantidad: 1 })).toBe(2);
    });

    it('en un suelto manda la cantidad del plato', () => {
        // "1× salsa y 5× pollo" no lleva 5 de cada cosa
        const suelto = { plan: 'Individuales', cantidadMenus: 1 };
        expect(porcionesDelPlato(suelto, { cantidad: 5 })).toBe(5);
        expect(porcionesDelPlato(suelto, { cantidad: 1 })).toBe(1);
    });

    it('sin datos, una porción', () => {
        expect(porcionesDelPlato({}, {})).toBe(1);
    });
});

describe('formatearCantidad', () => {
    it('pasa a kilos cuando se pasa de mil gramos', () => {
        expect(formatearCantidad(3240, 'g')).toBe('3,24 kg');
        expect(formatearCantidad(540, 'g')).toBe('540 g');
    });

    it('las tazas se redondean a un decimal', () => {
        expect(formatearCantidad(12.53, 'taza')).toBe('12,5 tazas');
        expect(formatearCantidad(1, 'taza')).toBe('1 taza');
    });
});

describe('los individuales no llevan merma', () => {
    const pedido = (plan, plato) => ({
        cliente: 'X', plan, tipoMenu: plan, cantidadMenus: 1,
        platos: [plato]
    });
    const plato = (nombre, gramos) => ({
        numero: 1, proteina: { nombre, gramosPorPorcion: gramos }, cantidad: 1
    });

    it('un individual se cocina tal cual: 250 son 250', () => {
        const { preparaciones } = consolidarCocina(
            [pedido('Individuales', plato('Pollo a la toscana', 250))],
            { marginPercent: 30 }
        );
        expect(preparaciones[0].totalCocina).toBe(250);
    });

    it('un pack sigue llevando su merma', () => {
        const { preparaciones } = consolidarCocina(
            [pedido('Pack Bajo Calorías', plato('Pollo al ajillo', 120))],
            { marginPercent: 30 }
        );
        expect(preparaciones[0].totalCocina).toBe(156);   // 120 x 1,30
    });

    it('el mismo plato en un pack y en un individual: merma solo sobre el pack', () => {
        const { preparaciones } = consolidarCocina([
            pedido('Pack Bajo Calorías', plato('Pollo al pesto', 120)),
            pedido('Individuales', plato('Pollo al pesto', 250))
        ], { marginPercent: 30 });
        // 120 x 1,30 + 250 = 406
        expect(preparaciones[0].totalCocina).toBe(406);
    });

    it('los gramos se redondean hacia arriba', () => {
        const { preparaciones } = consolidarCocina(
            [pedido('Pack Bajo Calorías', plato('Pollo al ajillo', 125))],
            { marginPercent: 30 }
        );
        expect(preparaciones[0].totalCocina).toBe(163);   // 162,5 -> 163
    });
});
