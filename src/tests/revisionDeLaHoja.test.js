import { describe, it, expect } from 'vitest';
import {
    revisarLaHoja, distanciaConVolteos, ollasPartidas, cenasQueNoSalen,
    packsQueNadieCocina, pedidosRepetidos, seLesAcaban, datosQueFaltan
} from '../utils/revisionDeLaHoja';

/**
 * Los casos son los errores DE VERDAD de la semana del 7 de setiembre de 2026.
 *
 * Si alguno de estos tests se pone en rojo, es que volvimos a dejar pasar algo
 * que ya nos costo plata una vez.
 */

describe('distinguir un dedazo de un plato distinto', () => {
    it('la letra volteada cuenta como un solo error', () => {
        expect(distanciaConVolteos('saletados', 'salteados')).toBe(1);
    });

    it('la letra que falta tambien', () => {
        expect(distanciaConVolteos('fajtas', 'fajitas')).toBe(1);
    });

    it('dos platos distintos quedan lejos', () => {
        expect(distanciaConVolteos('picadillo de ayote', 'picadillo de chayote'))
            .toBeGreaterThan(1);
        expect(distanciaConVolteos('pollo al pesto', 'pollo al ajillo'))
            .toBeGreaterThan(1);
    });
});

describe('1. dos ollas del mismo plato', () => {
    it('encuentra el dedazo que parte la olla', () => {
        const avisos = ollasPartidas([
            { name: 'Fajitas de cerdo en salsa criolla' },
            { name: 'Fajtas de cerdo en salsa criolla' },
            { name: 'Arroz blanco' }
        ]);
        expect(avisos).toHaveLength(1);
        expect(avisos[0].nivel).toBe('alto');
        expect(avisos[0].detalle).toMatch(/casi igual/i);
    });

    it('NO se queja de platos parecidos pero distintos', () => {
        expect(ollasPartidas([
            { name: 'Picadillo de ayote' },
            { name: 'Picadillo de chayote' },
            { name: 'Pollo al pesto' },
            { name: 'Pollo al ajillo' },
            { name: 'Carne de soya al pesto' }
        ])).toEqual([]);
    });

    it('una hoja limpia no dice nada', () => {
        expect(ollasPartidas([{ name: 'Arroz blanco' }, { name: 'Pure de papa' }]))
            .toEqual([]);
    });
});

describe('2. paga cena y no le sale ninguna', () => {
    const diego = {
        cliente: 'Diego Andres Flores Fernandez',
        plan: 'Full Pack Almuerzo y Cena',
        familias: ['FULL PACK']
    };

    it('agarra el caso de Diego: 223.960 y cero cenas', () => {
        const avisos = cenasQueNoSalen([diego]);
        expect(avisos).toHaveLength(1);
        expect(avisos[0].quienes).toContain('Diego Andres Flores Fernandez');
    });

    it('si la cena si sale, no se queja', () => {
        expect(cenasQueNoSalen([{ ...diego, familias: ['FULL PACK', 'CENAS - FULL PACK'] }]))
            .toEqual([]);
    });

    it('quien no pago cena no aparece', () => {
        expect(cenasQueNoSalen([
            { cliente: 'Kendall Barboza', plan: 'Pack Regular', familias: ['PACK REGULAR'] }
        ])).toEqual([]);
    });

    it('tambien lo lee del categoryLabel, no solo del plan', () => {
        expect(cenasQueNoSalen([
            { cliente: 'X', plan: 'Full Pack', categoryLabel: 'Almuerzo y Cena', familias: ['FULL PACK'] }
        ])).toHaveLength(1);
    });
});

describe('3. un pack que no se va a cocinar', () => {
    it('agarra el Pack Regular de Catherine, que quedo sin familia', () => {
        const avisos = packsQueNadieCocina([
            { cliente: 'Catherine Ordonez', plan: 'Pack Regular', esPack: true, familias: [] }
        ]);
        expect(avisos).toHaveLength(1);
        expect(avisos[0].detalle).toMatch(/no genero ollas/i);
    });

    it('un pack de DESAYUNOS sin familia es normal (caso Angie Navarro)', () => {
        // Paso de verdad en la hoja del miercoles 9: los desayunos se producen
        // por otro camino y nunca calzan con una familia de almuerzo.
        expect(packsQueNadieCocina([{
            cliente: 'Angie Navarro',
            plan: 'Pack Mensual de Desayunos (6 por semana)',
            esPack: true, esDesayuno: true, familias: []
        }])).toEqual([]);
    });

    it('un individual sin familia es normal, no se avisa', () => {
        expect(packsQueNadieCocina([
            { cliente: 'Sergio Serrano', plan: 'Pollo a la toscana', esPack: false, familias: [] }
        ])).toEqual([]);
    });
});

describe('4. el mismo pedido dos veces', () => {
    it('agarra a Edwin, cobrado y cocinado doble', () => {
        const avisos = pedidosRepetidos([
            { cliente: 'edwin perez alvarado', plan: 'Pack Sin Carbos', numeroOrden: '#A' },
            { cliente: 'Edwin Perez Alvarado', plan: 'Pack Sin Carbos', numeroOrden: '#B' }
        ]);
        expect(avisos).toHaveLength(1);
        expect(avisos[0].quienes).toEqual(['#A', '#B']);
    });

    it('Hazel con DOS packs distintos no es un duplicado', () => {
        expect(pedidosRepetidos([
            { cliente: 'Hazel Jimenez', plan: 'Pack Regular Almuerzo y Cena Mensual' },
            { cliente: 'Hazel Jimenez', plan: 'Pack Sin Carbos Almuerzo y Cena Mensual' }
        ])).toEqual([]);
    });

    it('Diana con un pack y unos individuales tampoco', () => {
        expect(pedidosRepetidos([
            { cliente: 'Diana Gonzalez', plan: 'PACK MENSUAL BAJO CALORIAS' },
            { cliente: 'Diana Gonzalez', plan: 'Pack de 3 proteinas de 250 g' }
        ])).toEqual([]);
    });
});

describe('5. se le acaban las entregas', () => {
    it('avisa del que termina esta semana', () => {
        const avisos = seLesAcaban(
            [{ cliente: 'Ana Solis', fechas: ['2026-09-02', '2026-09-09'] }],
            '2026-09-09'
        );
        expect(avisos).toHaveLength(1);
        expect(avisos[0].nivel).toBe('medio');
        expect(avisos[0].detalle).toMatch(/2026-09-09/);
    });

    it('no avisa del que tiene cuerda hasta fin de mes', () => {
        expect(seLesAcaban(
            [{ cliente: 'Hazel Jimenez', fechas: ['2026-09-09', '2026-09-16', '2026-09-23', '2026-09-30'] }],
            '2026-09-09'
        )).toEqual([]);
    });

    it('un pedido de una sola entrega no es un pack recurrente', () => {
        expect(seLesAcaban([{ cliente: 'Suelto', fechas: ['2026-09-09'] }], '2026-09-09'))
            .toEqual([]);
    });
});

describe('6. datos que faltan', () => {
    it('junta todo en un solo aviso, y de nivel bajo', () => {
        const avisos = datosQueFaltan([
            { cliente: 'Hazel Jimenez', telefono: null, zona: 'Curridabat' },
            { cliente: 'German', telefono: '73009400', zona: 'Heredia' },
            { cliente: 'Melany Escalante', telefono: '72833894', zona: 'Belen' }
        ]);
        expect(avisos).toHaveLength(1);
        expect(avisos[0].nivel).toBe('bajo');
        expect(avisos[0].titulo).toMatch(/2/);
        expect(avisos[0].detalle).toMatch(/Hazel Jimenez \(telefono\)/);
        expect(avisos[0].detalle).toMatch(/German \(apellido\)/);
    });

    it('con todo completo no dice nada', () => {
        expect(datosQueFaltan([
            { cliente: 'Melany Escalante', telefono: '72833894', zona: 'Belen' }
        ])).toEqual([]);
    });
});

describe('la revision completa', () => {
    it('pone lo grave primero y lo menor al final', () => {
        const avisos = revisarLaHoja({
            fecha: '2026-09-09',
            preparaciones: [{ name: 'Fajitas de cerdo' }, { name: 'Fajtas de cerdo' }],
            pedidos: [
                { cliente: 'German', telefono: '7300', zona: 'Heredia' },
                { cliente: 'Ana Solis', fechas: ['2026-09-02', '2026-09-09'], telefono: '1', zona: 'z' }
            ]
        });
        expect(avisos.map(a => a.nivel)).toEqual(['alto', 'medio', 'bajo']);
    });

    it('una hoja sana no devuelve NADA', () => {
        expect(revisarLaHoja({
            fecha: '2026-09-09',
            preparaciones: [{ name: 'Arroz blanco' }, { name: 'Pure de papa' }],
            pedidos: [{
                cliente: 'Melany Escalante', plan: 'Pack Bajo Calorias', esPack: true,
                familias: ['PACK BAJO EN CALORIAS'], telefono: '72833894', zona: 'Belen',
                fechas: ['2026-09-09']
            }]
        })).toEqual([]);
    });

    it('sin datos no revienta', () => {
        expect(revisarLaHoja()).toEqual([]);
        expect(revisarLaHoja({ pedidos: null, preparaciones: null })).toEqual([]);
    });
});
