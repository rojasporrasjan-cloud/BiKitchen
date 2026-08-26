import { describe, it, expect } from 'vitest';
import {
    buildLabelBatch,
    resolveFinalDishName,
    resolveTipoEtiqueta,
    formatExpirationDate,
    expandGroupsToLabels,
    groupByTipo,
    familiaDeTipo,
    FAMILIA
} from '../utils/labels/labelDomain';

const FECHA = '2026-08-22';

/** Pedido crudo tal como sale de Firestore, con los platos escritos en el ítem. */
const pedido = ({
    id = 'p1',
    cliente = 'Cliente Uno',
    telefono = '',
    status = 'confirmed',
    plan = 'Pack Regular',
    proteinas = ['Fajitas de pollo'],
    cantidad = 1,
    customizations = null,
    fecha = FECHA,
    fechas = null,
    nombre = 'Pack Regular Semanal'
} = {}) => ({
    id,
    cliente,
    telefono,
    status,
    plan,
    fecha_entrega: fecha,
    ...(fechas ? { fechas_entrega: fechas } : {}),
    items: [{
        nombre,
        cantidad,
        proteinas,
        ...(customizations ? { customizations } : {})
    }]
});

describe('la regla del negocio: una etiqueta por plato, con su proteína', () => {
    it('un Pack Regular de 5 platos son 5 etiquetas, una por proteína', () => {
        const batch = buildLabelBatch([
            pedido({
                plan: 'Pack Regular',
                proteinas: [
                    'Fajitas de pollo',
                    'Pollo teriyaki',
                    'Carne mechada',
                    'Cerdo en salsa',
                    'Pescado empanizado'
                ]
            })
        ], FECHA);

        expect(batch.totalLabels).toBe(5);
        expect(batch.groups).toHaveLength(5);
        expect(batch.groups.map(g => g.dishName).sort()).toEqual([
            'Carne mechada', 'Cerdo en salsa', 'Fajitas de pollo',
            'Pescado empanizado', 'Pollo teriyaki'
        ]);
        // Cada etiqueta lleva el nombre de la proteína y el tipo de plan
        batch.groups.forEach(g => {
            expect(g.cantidad).toBe(1);
            expect(g.tipo).toBe('Regular');
        });
    });

    it('dos clientes con el mismo pack de 5 platos son 10 etiquetas', () => {
        const platos = ['Pollo', 'Res', 'Cerdo', 'Pescado', 'Pavo'];
        const batch = buildLabelBatch([
            pedido({ id: 'a', cliente: 'Ana Mora', proteinas: platos }),
            pedido({ id: 'b', cliente: 'Beto Ruiz', proteinas: platos })
        ], FECHA);

        expect(batch.totalLabels).toBe(10);
        expect(batch.groups).toHaveLength(5);
        batch.groups.forEach(g => expect(g.cantidad).toBe(2));
    });

    it('si un pack repite la misma proteína, cuenta una etiqueta por plato igual', () => {
        const batch = buildLabelBatch([
            pedido({ proteinas: ['Pollo teriyaki', 'Pollo teriyaki', 'Carne mechada'] })
        ], FECHA);

        // Se agrupan para mostrarlos juntos, pero siguen siendo 3 envases.
        expect(batch.totalLabels).toBe(3);
        expect(batch.groups.find(g => g.dishName === 'Pollo teriyaki').cantidad).toBe(2);
    });
});

describe('promos de almuerzo y cena', () => {
    // El menú de cena es OTRO menú: mismos clientes, platos distintos.
    const MENU = {
        bajoCalorias: [
            { numero: 1, proteina: 'Albóndigas de res' },
            { numero: 2, proteina: 'Pollo teriyaki' },
            { numero: 3, proteina: 'Estofado de res' }
        ],
        cena: {
            bajoCalorias: [
                { numero: 1, proteina: 'Pollo al ajillo' },
                { numero: 2, proteina: 'Pollo al pesto' },
                { numero: 3, proteina: 'Filet de tilapia' }
            ]
        }
    };

    const promoCena = (plan) => ({
        id: 'c1', cliente: 'Cliente Cena', status: 'confirmed',
        plan, fecha_entrega: FECHA,
        items: [{ nombre: plan, cantidad: 1 }]
    });

    it('genera las etiquetas de cena, no solo las del almuerzo', () => {
        const batch = buildLabelBatch(
            [promoCena('Pack Bajo Calorías Promo Almuerzo y Cena')], FECHA, MENU
        );

        // 3 de almuerzo + 3 de cena. Antes salían solo 3 y nadie se enteraba.
        expect(batch.totalLabels).toBe(6);
        expect(batch.groups.map(g => g.dishName).sort()).toEqual([
            'Albóndigas de res', 'Estofado de res', 'Filet de tilapia',
            'Pollo al ajillo', 'Pollo al pesto', 'Pollo teriyaki'
        ]);
    });

    it('las cenas llevan su propio tipo y quedan separadas al empacar', () => {
        const batch = buildLabelBatch(
            [promoCena('Pack Bajo Calorías Promo Almuerzo y Cena')], FECHA, MENU
        );

        const cenas = batch.groups.filter(g => /cena/i.test(g.tipo));
        expect(cenas).toHaveLength(3);
        cenas.forEach(g => expect(familiaDeTipo(g.tipo)).toBe(FAMILIA.CENA));

        const almuerzos = batch.groups.filter(g => !/cena/i.test(g.tipo));
        almuerzos.forEach(g => expect(familiaDeTipo(g.tipo)).toBe(FAMILIA.PACK));
    });

    it('un pack normal NO genera cenas', () => {
        const batch = buildLabelBatch([promoCena('Pack Bajo Calorías')], FECHA, MENU);
        expect(batch.totalLabels).toBe(3);
        expect(batch.groups.some(g => /cena/i.test(g.tipo))).toBe(false);
    });

    it('"two pack" son dos packs del mismo menú, no una cena', () => {
        // Two Pack duplica la cantidad; no agrega platos de cena.
        const batch = buildLabelBatch([{
            id: 'tp', cliente: 'Dos Packs', status: 'confirmed',
            plan: 'Pack Bajo Calorías', categoria: 'two_pack',
            fecha_entrega: FECHA,
            items: [{ nombre: 'two pack bajo calorías', cantidad: 1 }]
        }], FECHA, MENU);

        expect(batch.groups.some(g => /cena/i.test(g.tipo))).toBe(false);
        expect(batch.groups).toHaveLength(3);
    });

    it('avisa cuando lleva cenas pero no hay menú de cena configurado', () => {
        const sinCena = { bajoCalorias: MENU.bajoCalorias };
        const batch = buildLabelBatch(
            [promoCena('Pack Bajo Calorías Promo Almuerzo y Cena')], FECHA, sinCena
        );

        expect(batch.totalLabels).toBe(3);
        expect(batch.warnings.some(w => w.tipo === 'cena-sin-menu')).toBe(true);
    });

    it('avisa siempre que haya cenas, para contrastar con la hoja de empaque', () => {
        const batch = buildLabelBatch(
            [promoCena('Pack Bajo Calorías Promo Almuerzo y Cena')], FECHA, MENU
        );
        expect(batch.warnings.some(w => w.tipo === 'verificar-cena')).toBe(true);
    });
});

describe('desayunos de promoción', () => {
    // 47 pedidos de la base llevan desayunos metidos en el nombre del pack.
    const MENU = {
        bajoCalorias: [
            { numero: 1, proteina: 'Albóndigas de res' },
            { numero: 2, proteina: 'Pollo teriyaki' }
        ],
        desayuno: [
            { numero: 1, proteina: 'Flautas con queso en salsa roja' },
            { numero: 2, proteina: 'Gallo pinto con huevos con jamon' },
            { numero: 3, proteina: 'Tostadas francesas con miel de maple' }
        ]
    };

    const conDesayuno = (plan) => ({
        id: 'd1', cliente: 'Cliente Desayuno', status: 'confirmed',
        plan, fecha_entrega: FECHA,
        items: [{ nombre: plan, cantidad: 1 }]
    });

    it.each([
        '🎉 PACK DOS SEMANAS CON DESAYUNOS GRATIS - Pack Bajo Calorías',
        'pack bajo en calorias con desayunos',
        'Pack mensual bajo en calorias - REGALÍA DESAYUNOS',
        'pack bajo calorias mensual con regalia desayuno'
    ])('genera las etiquetas de desayuno de "%s"', (plan) => {
        const batch = buildLabelBatch([conDesayuno(plan)], FECHA, MENU);

        const desayunos = batch.groups.filter(g => g.tipo === 'Desayuno');
        expect(desayunos).toHaveLength(3);
        desayunos.forEach(g => expect(familiaDeTipo(g.tipo)).toBe(FAMILIA.DESAYUNO));
    });

    it('el desayuno lleva su propio tipo, no el del pack', () => {
        const batch = buildLabelBatch(
            [conDesayuno('Pack Bajo Calorías con desayunos')], FECHA, MENU
        );

        const flautas = batch.groups.find(g => /Flautas/.test(g.dishName));
        expect(flautas.tipo).toBe('Desayuno');
        // Y los del almuerzo siguen con el suyo
        const albondigas = batch.groups.find(g => /Albóndigas/.test(g.dishName));
        expect(albondigas.tipo).toBe('Bajo Calorías');
    });

    it('un pack sin desayunos no genera ninguno', () => {
        const batch = buildLabelBatch([conDesayuno('Pack Bajo Calorías')], FECHA, MENU);
        expect(batch.groups.some(g => g.tipo === 'Desayuno')).toBe(false);
        expect(batch.totalLabels).toBe(2);
    });

    it('avisa si lleva desayunos pero no hay menú de desayunos configurado', () => {
        const sinDes = { bajoCalorias: MENU.bajoCalorias };
        const batch = buildLabelBatch(
            [conDesayuno('Pack Bajo Calorías con desayunos')], FECHA, sinDes
        );

        expect(batch.groups.some(g => g.tipo === 'Desayuno')).toBe(false);
        expect(batch.warnings.some(w => w.tipo === 'desayuno-sin-menu')).toBe(true);
    });

    it('avisa cuando el pedido pide más desayunos que los del menú', () => {
        const batch = buildLabelBatch([{
            id: 'x', cliente: 'Christopher Ulloa', status: 'confirmed',
            plan: 'Pack Bajo Calorías', fecha_entrega: FECHA,
            items: [{ nombre: '20 COMIDAS Y 10 DESAYUNOS', cantidad: 1 }]
        }], FECHA, MENU);

        const aviso = batch.warnings.find(w => w.tipo === 'desayuno-cantidad');
        expect(aviso).toBeDefined();
        expect(aviso.detalle).toMatch(/10 desayunos/i);
    });

    it('un pack de solo desayunos no se duplica a sí mismo', () => {
        const soloDesayunos = {
            id: 'sd', cliente: 'Angie Navarro', status: 'confirmed',
            plan: 'Pack de Desayunos', fecha_entrega: FECHA,
            items: [{ nombre: 'Pack de Desayunos', cantidad: 1 }]
        };

        const batch = buildLabelBatch([soloDesayunos], FECHA, MENU);
        expect(batch.totalLabels).toBe(3);
        batch.groups.forEach(g => expect(g.tipo).toBe('Desayuno'));
    });
});

describe('la etiqueta lleva la proteína, nunca el nombre del pack', () => {
    /** Pedido de pack SIN proteínas plato por plato: el ítem solo trae su nombre. */
    const packSinProteinas = (nombre) => ({
        id: 'p1', cliente: 'Ana Mora', status: 'confirmed',
        plan: nombre, fecha_entrega: FECHA,
        items: [{ nombre, cantidad: 1 }]
    });

    const MENU = {
        regular: [
            { numero: 1, proteina: 'Fajitas de pollo' },
            { numero: 2, proteina: 'Pollo teriyaki' },
            { numero: 3, proteina: 'Carne mechada' },
            { numero: 4, proteina: 'Cerdo en salsa' },
            { numero: 5, proteina: 'Pescado empanizado' }
        ]
    };

    it('un pack sin proteínas escritas saca las 5 del menú, NO "Pack Regular"', () => {
        const batch = buildLabelBatch([packSinProteinas('Pack Regular')], FECHA, MENU);

        expect(batch.groups.map(g => g.dishName)).not.toContain('Pack Regular');
        expect(batch.totalLabels).toBe(5);
        expect(batch.groups.map(g => g.dishName).sort()).toEqual([
            'Carne mechada', 'Cerdo en salsa', 'Fajitas de pollo',
            'Pescado empanizado', 'Pollo teriyaki'
        ]);
    });

    it.each([
        'Pack mensual regular',
        'pack quincenal regular',
        'Pack Regular Semanal'
    ])('tampoco deja pasar "%s" como si fuera una proteína', (nombre) => {
        const batch = buildLabelBatch([packSinProteinas(nombre)], FECHA, MENU);

        expect(batch.groups.map(g => g.dishName)).not.toContain(nombre);
        expect(batch.totalLabels).toBe(5);
    });

    it('en un individual el nombre del producto SÍ es lo que va en la etiqueta', () => {
        // "Tilapia a la meunier" es lo que come el cliente: no se toca.
        const individual = {
            id: 'i1', cliente: 'Beto Ruiz', status: 'confirmed',
            plan: 'Pack 5 Proteínas', fecha_entrega: FECHA,
            items: [{ nombre: 'Tilapia a la meunier', cantidad: 2 }]
        };

        const batch = buildLabelBatch([individual], FECHA, MENU);

        expect(batch.groups).toHaveLength(1);
        expect(batch.groups[0].dishName).toBe('Tilapia a la meunier');
        expect(batch.groups[0].tipo).toBe('Individual');
        expect(batch.totalLabels).toBe(2);
    });

    it('avisa en vez de callarse si el pack no tiene menú configurado', () => {
        const batch = buildLabelBatch([packSinProteinas('Pack Regular')], FECHA, { regular: [] });

        expect(batch.totalLabels).toBe(0);
        expect(batch.warnings.some(w => w.tipo === 'sin-platos')).toBe(true);
    });

    it('las proteínas escritas en el pedido le ganan al menú oficial', () => {
        const conProteinas = pedido({ proteinas: ['Pollo al curry', 'Res encebollada'] });
        const batch = buildLabelBatch([conProteinas], FECHA, MENU);

        expect(batch.totalLabels).toBe(2);
        expect(batch.groups.map(g => g.dishName).sort()).toEqual(['Pollo al curry', 'Res encebollada']);
    });
});

describe('buildLabelBatch — cantidades de etiquetas', () => {
    it('un pedido normal genera una etiqueta por plato', () => {
        const batch = buildLabelBatch([
            pedido({ proteinas: ['Fajitas de pollo', 'Pollo teriyaki', 'Carne mechada'] })
        ], FECHA);

        expect(batch.totalLabels).toBe(3);
        expect(batch.totalOrders).toBe(1);
        expect(batch.groups.map(g => g.dishName).sort()).toEqual([
            'Carne mechada', 'Fajitas de pollo', 'Pollo teriyaki'
        ]);
        batch.groups.forEach(g => expect(g.cantidad).toBe(1));
    });

    it('suma el mismo plato entre varios pedidos distintos', () => {
        const batch = buildLabelBatch([
            pedido({ id: 'a', cliente: 'Ana Mora', proteinas: ['Fajitas de pollo'] }),
            pedido({ id: 'b', cliente: 'Beto Ruiz', proteinas: ['Fajitas de pollo'] }),
            pedido({ id: 'c', cliente: 'Carla Sáenz', proteinas: ['Fajitas de pollo', 'Pollo teriyaki'] })
        ], FECHA);

        const fajitas = batch.groups.find(g => g.dishName === 'Fajitas de pollo');
        expect(fajitas.cantidad).toBe(3);
        expect(batch.totalLabels).toBe(4);
        expect(batch.totalOrders).toBe(3);
    });

    it('NO cuenta pedidos cancelados', () => {
        const batch = buildLabelBatch([
            pedido({ id: 'a', cliente: 'Ana Mora', proteinas: ['Fajitas de pollo'] }),
            pedido({ id: 'b', cliente: 'Beto Ruiz', status: 'cancelled', proteinas: ['Fajitas de pollo'] })
        ], FECHA);

        expect(batch.totalLabels).toBe(1);
        expect(batch.totalOrders).toBe(1);
    });

    it('NO cuenta pedidos sin confirmar', () => {
        const batch = buildLabelBatch([
            pedido({ id: 'a', cliente: 'Ana Mora', status: 'pending', proteinas: ['Fajitas de pollo'] }),
            pedido({ id: 'b', cliente: 'Beto Ruiz', status: 'pending_payment', proteinas: ['Pollo teriyaki'] })
        ], FECHA);

        expect(batch.totalLabels).toBe(0);
    });

    it('cuenta una sola vez los pedidos duplicados del mismo cliente', () => {
        // Misma fusión que aplica la hoja de producción: el segundo pedido se
        // absorbe y sus platos se descartan.
        const batch = buildLabelBatch([
            pedido({ id: 'a', cliente: 'María Fernanda Solano', proteinas: ['Fajitas de pollo'] }),
            pedido({ id: 'b', cliente: 'Maria Fernanda Solano', proteinas: ['Pollo teriyaki'] })
        ], FECHA);

        expect(batch.totalOrders).toBe(1);
        expect(batch.totalLabels).toBe(1);
        expect(batch.fusionados).toHaveLength(1);
    });

    it('solo cuenta la fecha pedida cuando el pack tiene varias entregas', () => {
        const dosSemanas = pedido({
            cliente: 'Luis Diaz',
            nombre: 'PACK DOS SEMANAS CON DESAYUNOS',
            proteinas: ['Fajitas de pollo', 'Pollo teriyaki'],
            fechas: ['2026-08-22', '2026-08-29']
        });

        const semana1 = buildLabelBatch([dosSemanas], '2026-08-22');
        const semana2 = buildLabelBatch([dosSemanas], '2026-08-29');
        const otraFecha = buildLabelBatch([dosSemanas], '2026-09-05');

        expect(semana1.totalLabels).toBe(2);
        expect(semana2.totalLabels).toBe(2);
        expect(otraFecha.totalLabels).toBe(0);
    });

    it('la etiqueta dice lo que el cliente REALMENTE recibe tras una sustitución', () => {
        const batch = buildLabelBatch([
            pedido({
                proteinas: ['Pollo'],
                customizations: { proteinChanges: [{ dishNumber: 1, newValue: 'Cerdo' }] }
            })
        ], FECHA);

        expect(batch.groups).toHaveLength(1);
        expect(batch.groups[0].dishName).toBe('Cerdo');
        expect(batch.groups[0].esSustitucion).toBe(true);
    });

    it('una sustitución no se mezcla con el plato original de otro cliente', () => {
        const batch = buildLabelBatch([
            pedido({ id: 'a', cliente: 'Ana Mora', proteinas: ['Pollo'] }),
            pedido({
                id: 'b', cliente: 'Beto Ruiz', proteinas: ['Pollo'],
                customizations: { proteinChanges: [{ dishNumber: 1, newValue: 'Cerdo' }] }
            })
        ], FECHA);

        const pollo = batch.groups.find(g => g.dishName === 'Pollo');
        const cerdo = batch.groups.find(g => g.dishName === 'Cerdo');
        expect(pollo.cantidad).toBe(1);
        expect(cerdo.cantidad).toBe(1);
        expect(batch.totalLabels).toBe(2);
    });

    it('separa las etiquetas por tipo de plan', () => {
        const batch = buildLabelBatch([
            pedido({ id: 'a', cliente: 'Ana Mora', plan: 'Pack Regular', proteinas: ['Fajitas de pollo'] }),
            pedido({ id: 'b', cliente: 'Beto Ruiz', plan: 'Pack Keto', proteinas: ['Fajitas de pollo'] })
        ], FECHA);

        expect(batch.groups).toHaveLength(2);
        expect(batch.groups.map(g => g.tipo).sort()).toEqual(['Keto', 'Regular']);
        batch.groups.forEach(g => expect(g.cantidad).toBe(1));

        const porTipo = groupByTipo(batch.groups);
        expect(porTipo).toHaveLength(2);
    });

    it('multiplica por la cantidad del ítem', () => {
        const batch = buildLabelBatch([
            pedido({ cantidad: 3, proteinas: ['Pollo teriyaki'] })
        ], FECHA);

        expect(batch.groups[0].cantidad).toBe(3);
        expect(batch.totalLabels).toBe(3);
    });

    it('NO aplica el +30% de merma de cocina', () => {
        // 18 envases reales. Con merma darían 24 (18 × 1.30 = 23.4 → 24).
        const pedidos = Array.from({ length: 18 }, (_, i) =>
            pedido({ id: `p${i}`, cliente: `Cliente ${i}`, proteinas: ['Fajitas de pollo'] })
        );

        const batch = buildLabelBatch(pedidos, FECHA);

        expect(batch.totalLabels).toBe(18);
        expect(batch.totalLabels).not.toBe(24);
        expect(batch.groups[0].cantidad).toBe(18);
    });

    it('el total de etiquetas es la suma exacta de los grupos', () => {
        const batch = buildLabelBatch([
            pedido({ id: 'a', cliente: 'Ana Mora', proteinas: ['Fajitas de pollo', 'Pollo teriyaki'] }),
            pedido({ id: 'b', cliente: 'Beto Ruiz', proteinas: ['Carne mechada'], cantidad: 2 })
        ], FECHA);

        const suma = batch.groups.reduce((acc, g) => acc + g.cantidad, 0);
        expect(batch.totalLabels).toBe(suma);
        expect(batch.totalLabels).toBe(4);
    });

    it('avisa en vez de callarse cuando no puede determinar los platos', () => {
        const sinPlatos = {
            id: 'x', cliente: 'Sin Platos', status: 'confirmed',
            plan: 'Algo Desconocido', fecha_entrega: FECHA, items: []
        };

        const batch = buildLabelBatch([sinPlatos], FECHA);

        expect(batch.totalLabels).toBe(0);
        expect(batch.warnings.some(w => w.tipo === 'sin-platos')).toBe(true);
    });

    it('un lote vacío no rompe nada', () => {
        const batch = buildLabelBatch([], FECHA);
        expect(batch.totalLabels).toBe(0);
        expect(batch.groups).toEqual([]);
    });
});

describe('reimpresión', () => {
    it('reimprimir no altera las cantidades del lote original', () => {
        const pedidos = [pedido({ proteinas: ['Fajitas de pollo'], cantidad: 18 })];
        const batch = buildLabelBatch(pedidos, FECHA);
        const original = batch.groups[0].cantidad;

        // Una reimpresión es una expansión aparte, con su propia cantidad.
        const reimpresion = expandGroupsToLabels(
            [{ ...batch.groups[0], cantidad: 1 }],
            '2026-08-28'
        );

        expect(reimpresion).toHaveLength(1);
        expect(batch.groups[0].cantidad).toBe(original);
        expect(buildLabelBatch(pedidos, FECHA).totalLabels).toBe(18);
    });
});

describe('helpers de etiqueta', () => {
    it('resolveFinalDishName se queda con lo que recibe el cliente', () => {
        expect(resolveFinalDishName('Pollo → Cerdo')).toBe('Cerdo');
        expect(resolveFinalDishName('Pollo -> Cerdo')).toBe('Cerdo');
        expect(resolveFinalDishName('Fajitas de pollo')).toBe('Fajitas de pollo');
        expect(resolveFinalDishName('')).toBe('');
    });

    it('resolveTipoEtiqueta usa nombres cortos que caben en 30 mm', () => {
        expect(resolveTipoEtiqueta('Pack Regular')).toBe('Regular');
        expect(resolveTipoEtiqueta('Pack Bajo en Calorías Promo')).toBe('Bajo Calorías');
        expect(resolveTipoEtiqueta('Pack 5 Proteínas')).toBe('Individual');
    });

    it('formatExpirationDate escribe la fecha como se lee en la etiqueta', () => {
        expect(formatExpirationDate('2026-08-28')).toBe('28 agosto');
        expect(formatExpirationDate('2026-01-23')).toBe('23 enero');
        expect(formatExpirationDate('')).toBe('');
    });

    it('expandGroupsToLabels produce una etiqueta por envase', () => {
        const labels = expandGroupsToLabels(
            [{ id: 'g1', tipo: 'Regular', dishName: 'Fajitas de pollo', cantidad: 3 }],
            '2026-08-28'
        );

        expect(labels).toHaveLength(3);
        expect(labels[0]).toEqual({
            groupId: 'g1',
            type: 'Regular',
            protein: 'Fajitas de pollo',
            expirationDate: '28 agosto'
        });
    });

    it('maneja un nombre de plato muy largo sin perderlo', () => {
        const largo = 'Pechuga de pollo rellena de espinaca y queso con salsa de champiñones';
        const batch = buildLabelBatch([pedido({ proteinas: [largo] })], FECHA);

        expect(batch.groups[0].dishName).toBe(largo);
        expect(batch.totalLabels).toBe(1);
    });
});
