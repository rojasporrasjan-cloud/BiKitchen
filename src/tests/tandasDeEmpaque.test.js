import { describe, it, expect } from 'vitest';
import {
    familiasPorVolumen,
    tandaDeCadaPreparacion,
    tandaDeCadaBolsa,
    armarTandas,
    conCabecerasDeTanda,
    cargaPorTanda
} from '../utils/tandasDeEmpaque';

/**
 * El orden de cocina, para que el empaque no espere.
 *
 * Los de empaque llegan dos horas después que las cocineras. Si la cocina va en
 * orden alfabético, a esa hora hay un poco de todo y ninguna bolsa cerrable.
 */

const FAMILIAS = [
    { nombre: 'PACK BAJO EN CALORÍAS', packs: 30 },
    { nombre: 'CENAS - PACK BAJO EN CALORÍAS', packs: 9 },
    { nombre: 'PACK REGULAR', packs: 5 },
    { nombre: 'PACK SIN CARBOS', packs: 5 },
    { nombre: 'PACK CASADITOS', packs: 4 }
];

describe('familiasPorVolumen', () => {
    it('ordena de mayor a menor', () => {
        const orden = familiasPorVolumen(FAMILIAS).map(f => f.nombre);
        expect(orden[0]).toBe('PACK BAJO EN CALORÍAS');
    });

    it('las CENAS se suman a su familia, no compiten con ella', () => {
        const orden = familiasPorVolumen(FAMILIAS);
        expect(orden.map(f => f.nombre)).not.toContain('CENAS - PACK BAJO EN CALORÍAS');
        // 30 almuerzos + 9 cenas del mismo pack
        expect(orden.find(f => f.nombre === 'PACK BAJO EN CALORÍAS').packs).toBe(39);
    });

    it('sin familias no revienta', () => {
        expect(familiasPorVolumen([])).toEqual([]);
        expect(familiasPorVolumen(null)).toEqual([]);
    });
});

describe('la olla no se parte', () => {
    const orden = familiasPorVolumen(FAMILIAS);

    it('el arroz que comparten bajo calorías y casaditos se cocina con bajo calorías', () => {
        const preps = tandaDeCadaPreparacion([
            { name: 'Arroz blanco', familias: ['PACK CASADITOS', 'PACK BAJO EN CALORÍAS'] }
        ], orden);
        expect(preps[0].tanda).toBe(0);
        expect(preps[0].familiaQueManda).toBe('PACK BAJO EN CALORÍAS');
    });

    it('lo que solo ocupa una familia chica queda de último', () => {
        const preps = tandaDeCadaPreparacion([
            { name: 'Pollo al pesto', familias: ['PACK BAJO EN CALORÍAS'] },
            { name: 'Frijoles molidos', familias: ['PACK CASADITOS'] }
        ], orden);
        expect(preps[0].tanda).toBeLessThan(preps[1].tanda);
    });

    it('una preparación de las CENAS va con su familia, no aparte', () => {
        const preps = tandaDeCadaPreparacion([
            { name: 'Estofado de res', familias: ['CENAS - PACK BAJO EN CALORÍAS'] }
        ], orden);
        expect(preps[0].tanda).toBe(0);
    });
});

describe('la bolsa espera a lo último que le falte', () => {
    const orden = familiasPorVolumen(FAMILIAS);

    it('un cliente de una sola familia cierra en su tanda', () => {
        const b = tandaDeCadaBolsa([
            { nombre: 'Sofía Gutiérrez', familias: ['PACK BAJO EN CALORÍAS'] }
        ], orden);
        expect(b[0].tanda).toBe(0);
        expect(b[0].esperaPor).toBeNull();
    });

    it('un cliente con dos packs cierra en la tanda MÁS TARDÍA', () => {
        const b = tandaDeCadaBolsa([
            { nombre: 'Diana González', familias: ['PACK BAJO EN CALORÍAS', 'PACK CASADITOS'] }
        ], orden);
        const casaditos = orden.findIndex(f => f.nombre === 'PACK CASADITOS');
        expect(b[0].tanda).toBe(casaditos);
        expect(b[0].esperaPor).toBe('PACK CASADITOS');
    });

    it('llevar cena NO atrasa la bolsa: es la misma familia', () => {
        const b = tandaDeCadaBolsa([
            { nombre: 'Priscilla', familias: ['PACK BAJO EN CALORÍAS', 'CENAS - PACK BAJO EN CALORÍAS'] }
        ], orden);
        expect(b[0].tanda).toBe(0);
    });
});

describe('armarTandas', () => {
    const datos = {
        familias: FAMILIAS,
        preparaciones: [
            { name: 'Arroz blanco', familias: ['PACK BAJO EN CALORÍAS', 'PACK CASADITOS'] },
            { name: 'Pollo al pesto', familias: ['PACK BAJO EN CALORÍAS'] },
            { name: 'Frijoles molidos', familias: ['PACK CASADITOS'] }
        ],
        clientes: [
            { nombre: 'Sofía', zona: 'Moravia', dia: 'LUN 14', familias: ['PACK BAJO EN CALORÍAS'] },
            { nombre: 'Diana', zona: 'Alajuela', dia: 'SÁB 12', familias: ['PACK BAJO EN CALORÍAS', 'PACK CASADITOS'] }
        ]
    };

    it('la primera tanda es la familia más grande y trae el arroz completo', () => {
        const t = armarTandas(datos);
        expect(t[0].familia).toBe('PACK BAJO EN CALORÍAS');
        expect(t[0].preparaciones.map(p => p.name)).toEqual(['Arroz blanco', 'Pollo al pesto']);
    });

    it('en la primera tanda cierra Sofía, y Diana queda esperando', () => {
        const t = armarTandas(datos);
        expect(t[0].bolsas.map(b => b.nombre)).toEqual(['Sofía']);
        expect(t[0].esperan.map(b => b.nombre)).toEqual(['Diana']);
    });

    it('Diana cierra cuando sale su casadito', () => {
        const t = armarTandas(datos);
        const casaditos = t.find(x => x.familia === 'PACK CASADITOS');
        expect(casaditos.bolsas.map(b => b.nombre)).toEqual(['Diana']);
    });

    it('una tanda sin nada que cocinar ni que cerrar no se muestra', () => {
        const t = armarTandas({ ...datos, familias: [...FAMILIAS, { nombre: 'PACK KETO', packs: 0 }] });
        expect(t.map(x => x.familia)).not.toContain('PACK KETO');
    });

    it('sin datos devuelve una lista vacía', () => {
        expect(armarTandas({})).toEqual([]);
        expect(armarTandas()).toEqual([]);
    });
});

describe('conCabecerasDeTanda', () => {
    const orden = familiasPorVolumen(FAMILIAS);

    it('mete una cabecera cada vez que cambia la tanda', () => {
        const filas = [
            { tipo: 'suelto', item: { name: 'Pollo al pesto', tanda: 0 } },
            { tipo: 'suelto', item: { name: 'Arroz', tanda: 0 } },
            { tipo: 'suelto', item: { name: 'Frijoles', tanda: 2 } }
        ];
        const conCab = conCabecerasDeTanda(filas, orden);
        expect(conCab.filter(f => f.tipo === 'tanda')).toHaveLength(2);
        expect(conCab[0].tipo).toBe('tanda');
        expect(conCab[0].esLaPrimera).toBe(true);
    });

    it('el número es el PUESTO de la familia, para que calce con la hoja de empaque', () => {
        // La familia 2 no genera cabecera —sus ollas ya salieron antes—, así que
        // la numeración salta. El hueco es correcto: dice que esa familia no
        // necesita cocinar nada nuevo. Si se numerara corrido, la cocina diría
        // "TANDA 2" para lo que el empaque llama "TANDA 4".
        const filas = [
            { tipo: 'suelto', item: { name: 'A', tanda: 0 } },
            { tipo: 'suelto', item: { name: 'B', tanda: 3 } }
        ];
        const nums = conCabecerasDeTanda(filas, orden)
            .filter(f => f.tipo === 'tanda').map(f => f.numero);
        expect(nums).toEqual([1, 4]);
    });

    it('las filas de grupo del arroz no rompen la cuenta', () => {
        const filas = [
            { tipo: 'grupo', nombre: 'ARROZ', total: 137 },
            { tipo: 'hijo', item: { name: 'Arroz blanco', tanda: 0 } }
        ];
        const conCab = conCabecerasDeTanda(filas, orden);
        // la cabecera va DESPUES del grupo, porque el grupo no trae item
        expect(conCab.map(f => f.tipo)).toEqual(['grupo', 'tanda', 'hijo']);
    });

    it('sin filas devuelve vacío', () => {
        expect(conCabecerasDeTanda([], orden)).toEqual([]);
        expect(conCabecerasDeTanda(null, orden)).toEqual([]);
    });
});

/**
 * "Cocinar primero todo el primer menú, que ya lo tengan a las ocho y media,
 * para que cuando Paula llegue empiece a empacar; y el segundo menú que sigan.
 * Las guarniciones casi son las mismas del primer menú... para que se cocine
 * todo junto" — Gina, 7 de setiembre de 2026.
 */
describe('el menú 1 va antes que el menú 2', () => {
    const orden = familiasPorVolumen(FAMILIAS);

    it('una preparación que solo ocupa la cena queda marcada como menú 2', () => {
        const preps = tandaDeCadaPreparacion([
            { name: 'Estofado de res', familias: ['CENAS - PACK BAJO EN CALORÍAS'] }
        ], orden);
        expect(preps[0].soloCena).toBe(true);
    });

    it('una guarnición que comparten los dos menús cae en el menú 1', () => {
        // El picadillo mixto se repite entre almuerzo y cena: se cocina una vez
        const preps = tandaDeCadaPreparacion([
            { name: 'Picadillo mixto', familias: ['PACK BAJO EN CALORÍAS', 'CENAS - PACK BAJO EN CALORÍAS'] }
        ], orden);
        expect(preps[0].soloCena).toBe(false);
        expect(preps[0].tanda).toBe(0);
    });

    it('la cabecera separa 1a de 1b sin cambiar el número de tanda', () => {
        const filas = [
            { tipo: 'suelto', item: { name: 'Pollo al pesto', tanda: 0, soloCena: false } },
            { tipo: 'suelto', item: { name: 'Estofado de res', tanda: 0, soloCena: true } }
        ];
        const cabeceras = conCabecerasDeTanda(filas, orden).filter(f => f.tipo === 'tanda');
        expect(cabeceras.map(c => `${c.numero}${c.paso}`)).toEqual(['1a', '1b']);
        expect(cabeceras.map(c => c.menu)).toEqual([1, 2]);
        // Solo la del menú 1 le avisa a empaque
        expect(cabeceras[0].esLaPrimera).toBe(true);
        expect(cabeceras[1].esLaPrimera).toBe(false);
    });

    it('la familia siguiente sí sube el número', () => {
        const filas = [
            { tipo: 'suelto', item: { name: 'A', tanda: 0, soloCena: false } },
            { tipo: 'suelto', item: { name: 'B', tanda: 0, soloCena: true } },
            { tipo: 'suelto', item: { name: 'C', tanda: 1, soloCena: false } }
        ];
        const cabeceras = conCabecerasDeTanda(filas, orden).filter(f => f.tipo === 'tanda');
        expect(cabeceras.map(c => `${c.numero}${c.paso}`)).toEqual(['1a', '1b', '2a']);
    });

    it('el número no depende de cuántas cabeceras hubo antes', () => {
        const filas = [{ tipo: 'suelto', item: { name: 'Z', tanda: 4 } }];
        const cab = conCabecerasDeTanda(filas, orden).filter(f => f.tipo === 'tanda');
        expect(cab[0].numero).toBe(5);
    });
});

/**
 * "Algunos cocinan pollo, carne, lo que sea, entonces que vayan cocinando en su
 * orden específico" — Jan, 7 de setiembre de 2026.
 *
 * Las cocineras van en paralelo, pero la tanda es un punto de encuentro: Paula
 * no puede empacar bajo calorías si falta el puré de Osmany.
 */
describe('cargaPorTanda', () => {
    const preps = [
        { name: 'Pollo al pesto', tanda: 0, soloCena: false },
        { name: 'Pollo en crema', tanda: 0, soloCena: false },
        { name: 'Pollo mediterráneo', tanda: 0, soloCena: false },
        { name: 'Carne de res en salsa', tanda: 0, soloCena: false },
        { name: 'Puré de papa', tanda: 0, soloCena: false },
        { name: 'Estofado de res', tanda: 0, soloCena: true },
        { name: 'Frijoles molidos', tanda: 1, soloCena: false }
    ];
    const quien = (p) => {
        if (/pollo/i.test(p.name)) return 'ROSA';
        if (/res|carne/i.test(p.name)) return 'FERNANDA';
        return 'OSMANY';
    };

    it('separa el menú 1 del menú 2 dentro de la misma tanda', () => {
        const carga = cargaPorTanda(preps, quien);
        expect(carga.map(c => `${c.tanda}-${c.menu}`)).toEqual(['0-1', '0-2', '1-1']);
    });

    it('cuenta cuántas preparaciones lleva cada cocinera', () => {
        const primera = cargaPorTanda(preps, quien)[0];
        expect(primera.porCocinera).toEqual({ ROSA: 3, FERNANDA: 1, OSMANY: 1 });
        expect(primera.total).toBe(5);
    });

    it('dice quién es el cuello de botella de la tanda', () => {
        const primera = cargaPorTanda(preps, quien)[0];
        expect(primera.cuelloDeBotella).toEqual({ cocinera: 'ROSA', cuantas: 3 });
    });

    it('lo que nadie tiene asignado cae en SIN ASIGNAR', () => {
        const carga = cargaPorTanda([{ name: 'X', tanda: 0, soloCena: false }], () => '');
        expect(carga[0].porCocinera['SIN ASIGNAR']).toBe(1);
    });

    it('sin preparaciones devuelve vacío', () => {
        expect(cargaPorTanda([], quien)).toEqual([]);
        expect(cargaPorTanda(null, quien)).toEqual([]);
    });
});
