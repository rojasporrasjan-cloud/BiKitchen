import { describe, it, expect } from 'vitest';
import {
    nombreDePlato,
    platosQueMenciona,
    leerCambioDeDesayuno,
    platosDeDesayunoDelCliente,
    separarDesayunos
} from '../utils/desayunosPersonalizados.js';

/**
 * El menu de desayunos de la semana del 7 de setiembre. TRES de los cinco son
 * gallo pinto: por eso un cambio de "gallo pinto" nunca toca un solo plato.
 */
const MENU = [
    { proteina: { nombre: 'Gallo pinto con huevos revueltos' } },
    { proteina: { nombre: 'Burritos con queso, jamon y frijoles' } },
    { proteina: { nombre: 'Prensadas con queso' } },
    { proteina: { nombre: 'Gallo pinto con huevos con tomate' } },
    { proteina: { nombre: 'Gallo pinto con queso' } }
];

describe('leer el nombre del plato venga como venga', () => {
    it('lo saca del objeto', () => {
        expect(nombreDePlato(MENU[0])).toBe('Gallo pinto con huevos revueltos');
    });
    it('acepta texto suelto', () => {
        expect(nombreDePlato('Prensadas con queso')).toBe('Prensadas con queso');
    });
    it('acepta proteina como texto', () => {
        expect(nombreDePlato({ proteina: 'Tostadas' })).toBe('Tostadas');
    });
    it('no revienta con nada', () => {
        expect(nombreDePlato(null)).toBe('');
        expect(nombreDePlato({})).toBe('');
    });
});

describe('que platos nombra el cliente', () => {
    it('"gallo pinto" agarra los TRES, no uno', () => {
        expect(platosQueMenciona('gallo pinto', MENU)).toEqual([0, 3, 4]);
    });

    it('en plural tambien: Gina escribe "gallo pintos"', () => {
        expect(platosQueMenciona('gallo pintos', MENU)).toEqual([0, 3, 4]);
    });

    it('"burritos" agarra solo el suyo', () => {
        expect(platosQueMenciona('burritos', MENU)).toEqual([1]);
    });

    it('no inventa cuando el plato no esta en el menu', () => {
        expect(platosQueMenciona('tostadas francesas', MENU)).toEqual([]);
    });
});

describe('Allan Quesada — cambiar gallo pinto por burritos', () => {
    const obs = 'DESAYUNOS: cambiar gallo pinto por BURRITOS (chat 2 set)';

    it('entiende que le cambian tres platos', () => {
        const c = leerCambioDeDesayuno(obs, MENU);
        expect(c.tipo).toBe('cambio');
        expect(c.quita).toEqual([0, 3, 4]);
        expect(c.pone).toBe('BURRITOS');
    });

    it('su semana queda con burritos donde iba gallo pinto', () => {
        const platos = platosDeDesayunoDelCliente(MENU, leerCambioDeDesayuno(obs, MENU));
        expect(platos.map(p => p.nombre)).toEqual([
            'BURRITOS',
            'Burritos con queso, jamon y frijoles',
            'Prensadas con queso',
            'BURRITOS',
            'BURRITOS'
        ]);
        expect(platos.filter(p => p.estado === 'cambiado')).toHaveLength(3);
    });

    it('guarda cual era el original, para que la cocina lo vea', () => {
        const platos = platosDeDesayunoDelCliente(MENU, leerCambioDeDesayuno(obs, MENU));
        expect(platos[0].original).toBe('Gallo pinto con huevos revueltos');
    });
});

describe('Alexa Astua — solo gallo pinto', () => {
    const obs = 'NO CERDO · Desayunos gratis solo gallo pinto · Almuerzo menu Bajo Calorias';

    it('le quita los que NO son gallo pinto', () => {
        const c = leerCambioDeDesayuno(obs, MENU);
        expect(c.tipo).toBe('solo');
        expect(c.quita).toEqual([1, 2]);
    });

    it('se queda con sus tres y los otros dos salen marcados', () => {
        const platos = platosDeDesayunoDelCliente(MENU, leerCambioDeDesayuno(obs, MENU));
        expect(platos.filter(p => p.estado === 'igual').map(p => p.numero)).toEqual([1, 4, 5]);
        expect(platos.filter(p => p.estado === 'quitado').map(p => p.numero)).toEqual([2, 3]);
    });
});

describe('no confundir el almuerzo con el desayuno', () => {
    it('un cambio de almuerzo NO toca los desayunos', () => {
        // Tatiana Soto: le cambian el almuerzo y lleva desayunos de regalia.
        const obs = 'Regalia desayunos · Cambiar fajitas de cerdo por LASAGNA DE POLLO (chat 2 set)';
        expect(leerCambioDeDesayuno(obs, MENU)).toBeNull();
    });

    it('"regalia desayunos" a secas no es un cambio', () => {
        expect(leerCambioDeDesayuno('Regalia desayunos', MENU)).toBeNull();
    });

    it('Pilar: cambio de almuerzo mas regalia de desayunos, y el desayuno queda igual', () => {
        const obs = 'CAMBIAR TILAPIA POR LOMO FINGIDO. No mandar tanto brocoli. Regalia pack de desayunos.';
        expect(leerCambioDeDesayuno(obs, MENU)).toBeNull();
    });

    it('sin observaciones no hay cambio', () => {
        expect(leerCambioDeDesayuno('', MENU)).toBeNull();
        expect(leerCambioDeDesayuno(null, MENU)).toBeNull();
    });

    it('menciona desayuno pero nombra un plato que no existe: se deja quieto', () => {
        expect(leerCambioDeDesayuno('Desayunos: cambiar waffles por crepas', MENU)).toBeNull();
    });
});

describe('la nota de empaque se come el cambio — hay que leer la original', () => {
    /**
     * Caso real de Allan Quesada. `notaParaEmpaque` parte la nota en las rayas y
     * bota las frases que parecen apuntes internos, asi que de
     * "cambiar gallo pinto por BURRITOS (chat 2 set — reemplaza...)"
     * a esta tabla solo le llegaba el pedazo de despues de la raya.
     */
    const recortada = 'reemplaza el cambio anterior a flautas)';
    const original = 'DESAYUNOS: cambiar gallo pinto por BURRITOS (chat 2 set — reemplaza el cambio anterior a flautas)';

    it('con la nota recortada no se entiende nada', () => {
        expect(leerCambioDeDesayuno(recortada, MENU)).toBeNull();
    });

    it('pero con la original del pedido si', () => {
        const clientes = [{ nombre: 'Allan Quesada', cantidad: 1,
            observaciones: recortada, observacionesOriginales: original }];
        const { personalizados, estandar } = separarDesayunos(clientes, MENU);
        expect(personalizados).toHaveLength(1);
        expect(estandar).toHaveLength(0);
        expect(personalizados[0].cambio.quita).toEqual([0, 3, 4]);
    });

    it('la busca tambien dentro de rawPedido, que es donde la deja la hoja', () => {
        const clientes = [{ nombre: 'Allan Quesada', cantidad: 1,
            observaciones: recortada, rawPedido: { observacionesOriginales: original } }];
        expect(separarDesayunos(clientes, MENU).personalizados).toHaveLength(1);
    });

    it('si no hay pedido original, se conforma con la nota que haya', () => {
        const clientes = [{ nombre: 'Alexa Astua', cantidad: 1,
            observaciones: 'Desayunos gratis solo gallo pinto' }];
        expect(separarDesayunos(clientes, MENU).personalizados).toHaveLength(1);
    });
});

describe('separar la tabla en dos', () => {
    const clientes = [
        { nombre: 'Allan Quesada', cantidad: 1, observaciones: 'DESAYUNOS: cambiar gallo pinto por BURRITOS' },
        { nombre: 'Alexa Astua', cantidad: 1, observaciones: 'Desayunos gratis solo gallo pinto' },
        { nombre: 'Pamela Sarmiento', cantidad: 1, observaciones: 'Regalia desayunos' },
        { nombre: 'Marlon Camacho', cantidad: 2, observaciones: '' }
    ];

    it('los dos personalizados salen de la tabla normal', () => {
        const { estandar, personalizados } = separarDesayunos(clientes, MENU);
        expect(personalizados.map(c => c.nombre)).toEqual(['Allan Quesada', 'Alexa Astua']);
        expect(estandar.map(c => c.nombre)).toEqual(['Pamela Sarmiento', 'Marlon Camacho']);
    });

    it('el total de la tabla normal baja: ya no comen de esa olla', () => {
        // 1+1+1+2 = 5 en total; sin Allan ni Alexa quedan 3.
        const { packsEstandar } = separarDesayunos(clientes, MENU);
        expect(packsEstandar).toBe(3);
    });

    it('cada personalizado se lleva sus propios platos', () => {
        const { personalizados } = separarDesayunos(clientes, MENU);
        expect(personalizados[0].platos).toHaveLength(5);
        expect(personalizados[1].platos.filter(p => p.estado === 'quitado')).toHaveLength(2);
    });

    it('sin menu cargado no separa a nadie — mejor la tabla vieja que una vacia', () => {
        const { estandar, personalizados } = separarDesayunos(clientes, []);
        expect(personalizados).toHaveLength(0);
        expect(estandar).toHaveLength(4);
    });

    it('sin clientes no revienta', () => {
        expect(separarDesayunos(null, MENU)).toEqual({ estandar: [], personalizados: [], packsEstandar: 0 });
    });

    it('si nadie cambio nada, el total no se mueve', () => {
        const normales = [{ nombre: 'A', cantidad: 2 }, { nombre: 'B', cantidad: 1 }];
        const { personalizados, packsEstandar } = separarDesayunos(normales, MENU);
        expect(personalizados).toHaveLength(0);
        expect(packsEstandar).toBe(3);
    });
});
