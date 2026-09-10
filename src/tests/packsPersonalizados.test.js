import { describe, it, expect } from 'vitest';
import {
    partesDelPlato,
    platosDePackQueMenciona,
    leerCambioDePack,
    platosDePackDelCliente,
    separarPersonalizadosDePack,
    platosQueMenciona
} from '../utils/desayunosPersonalizados.js';

/** El menu de casaditos de la semana del 7 de setiembre. */
const CASADITOS = [
    { numero: 1, proteina: { nombre: 'Filet de tilapia con perejil y ajo' }, vegetal: { nombre: 'Tomates asados con cebollas caramelizadas' }, carbo: { nombre: 'Arroz, frijoles y maduros' } },
    { numero: 2, proteina: { nombre: 'Lomo fingido en salsa gravy' }, vegetal: { nombre: 'Picadillo de chayote con maiz dulce' }, carbo: { nombre: 'Arroz, frijoles y maduros' } },
    { numero: 3, proteina: { nombre: 'Fajitas de cerdo en salsa strogonoff' }, vegetal: { nombre: 'Mix de vegetales estilo Mediterraneo' }, carbo: { nombre: 'Arroz, frijoles y maduros' } },
    { numero: 4, proteina: { nombre: 'Lasagna de pollo' }, vegetal: { nombre: 'Crema de vegetales' }, carbo: { nombre: '' } },
    { numero: 5, proteina: { nombre: 'Pollo a la toscana' }, vegetal: { nombre: 'Vegetales mixtos' }, carbo: { nombre: 'Papitas a la parmesana' } }
];

describe('leer las tres partes del plato', () => {
    it('saca proteina, vegetal y carbo', () => {
        expect(partesDelPlato(CASADITOS[0])).toEqual({
            proteina: 'Filet de tilapia con perejil y ajo',
            vegetal: 'Tomates asados con cebollas caramelizadas',
            carbo: 'Arroz, frijoles y maduros'
        });
    });
    it('no revienta con un plato incompleto', () => {
        expect(partesDelPlato({}).proteina).toBe('');
        expect(partesDelPlato(null).carbo).toBe('');
    });
});

describe('en que plato y en que parte cae el cambio', () => {
    it('la tilapia esta en la proteina del plato 1', () => {
        expect(platosDePackQueMenciona('tilapia', CASADITOS))
            .toEqual([{ indice: 0, parte: 'proteina', nombre: 'Filet de tilapia con perejil y ajo' }]);
    });
    it('el picadillo de chayote esta en el vegetal del plato 2', () => {
        const r = platosDePackQueMenciona('picadillo con chayote', CASADITOS);
        expect(r).toHaveLength(1);
        expect(r[0]).toMatchObject({ indice: 1, parte: 'vegetal' });
    });
    it('un plato que no esta en el menu no inventa nada', () => {
        expect(platosDePackQueMenciona('cochinita pibil', CASADITOS)).toEqual([]);
    });
});

describe('Guillermo Vargas — cambiar la tilapia por carne mechada', () => {
    const obs = 'NO MARISCOS · Casaditos: cambiar la TILAPIA del primer plato por CARNE MECHADA EN SALSA';

    it('entiende que le toca la proteina del plato 1', () => {
        const c = leerCambioDePack(obs, CASADITOS);
        expect(c.toca).toEqual([{ indice: 0, parte: 'proteina', nombre: 'Filet de tilapia con perejil y ajo' }]);
        expect(c.pone).toBe('CARNE MECHADA EN SALSA');
    });

    it('su pack queda con la carne mechada en el plato 1 y el resto igual', () => {
        const platos = platosDePackDelCliente(CASADITOS, leerCambioDePack(obs, CASADITOS));
        expect(platos[0].proteina).toBe('CARNE MECHADA EN SALSA');
        expect(platos[0].original).toBe('Filet de tilapia con perejil y ajo');
        expect(platos[0].cambiada).toBe('proteina');
        // lo demas del plato 1 no se toca
        expect(platos[0].carbo).toBe('Arroz, frijoles y maduros');
        // y los otros cuatro platos quedan intactos
        expect(platos.slice(1).every(p => !p.original)).toBe(true);
        expect(platos[4].proteina).toBe('Pollo a la toscana');
    });
});

describe('Pablo Leiva — cambiar el picadillo por papitas', () => {
    it('le cambia el vegetal, no la proteina', () => {
        const c = leerCambioDePack('DEBE · Cambiar picadillo con chayote por PAPITAS SALTEADAS', CASADITOS);
        expect(c.toca[0]).toMatchObject({ indice: 1, parte: 'vegetal' });
        const platos = platosDePackDelCliente(CASADITOS, c);
        expect(platos[1].vegetal).toBe('PAPITAS SALTEADAS');
        expect(platos[1].proteina).toBe('Lomo fingido en salsa gravy');
    });
});

describe('los desayunos no se cuelan en la tabla del pack', () => {
    it('un cambio de desayuno NO toca el pack', () => {
        expect(leerCambioDePack('DESAYUNOS: cambiar gallo pinto por BURRITOS', CASADITOS)).toBeNull();
    });
    it('una restriccion sin cambio no es un personalizado', () => {
        expect(leerCambioDePack('NO MARISCOS', CASADITOS)).toBeNull();
        expect(leerCambioDePack('NO CERDO. Poner los packs en bolsa.', CASADITOS)).toBeNull();
    });
    it('un cambio de un plato que no esta en ESTE menu se deja quieto', () => {
        expect(leerCambioDePack('Cambiar camotes en gajos por papas en gajos', CASADITOS)).toBeNull();
    });
});

describe('separar la tabla del pack', () => {
    const clientes = [
        { nombre: 'Laura Cano', cantidad: 1 },
        { nombre: 'Francisco Gonzalez', cantidad: 2, observaciones: 'NO LACTEOS. NO lleva cena.' },
        { nombre: 'Guillermo Vargas', cantidad: 1, observaciones: 'NO MARISCOS · Casaditos: cambiar la TILAPIA del primer plato por CARNE MECHADA EN SALSA' }
    ];

    it('solo sale el que cambio algo', () => {
        const { estandar, personalizados } = separarPersonalizadosDePack(clientes, CASADITOS);
        expect(personalizados.map(c => c.nombre)).toEqual(['Guillermo Vargas']);
        expect(estandar.map(c => c.nombre)).toEqual(['Laura Cano', 'Francisco Gonzalez']);
    });

    it('el conteo del menu baja: ya no cuenta el que no come tilapia', () => {
        // 1 + 2 + 1 = 4 packs; sin Guillermo quedan 3.
        expect(separarPersonalizadosDePack(clientes, CASADITOS).packsEstandar).toBe(3);
    });

    it('sin menu cargado no separa a nadie', () => {
        const { personalizados, estandar } = separarPersonalizadosDePack(clientes, []);
        expect(personalizados).toHaveLength(0);
        expect(estandar).toHaveLength(3);
    });

    it('sin clientes no revienta', () => {
        expect(separarPersonalizadosDePack(null, CASADITOS))
            .toEqual({ estandar: [], personalizados: [], packsEstandar: 0 });
    });

    it('si nadie cambio nada, el total no se mueve', () => {
        const normales = [{ nombre: 'A', cantidad: 2 }, { nombre: 'B', cantidad: 1 }];
        const r = separarPersonalizadosDePack(normales, CASADITOS);
        expect(r.personalizados).toHaveLength(0);
        expect(r.packsEstandar).toBe(3);
    });
});

describe('una palabra generica no se lleva medio menu', () => {
    /**
     * Luis Ricardo Diaz pidio cambiar "Relish de vegetales y Mix de vainica,
     * zanahoria y ayote". Como "vegetales" sale en tres platos del menu, se le
     * cambiaban tambien la crema de vegetales y los vegetales mixtos, que el
     * no pidio. Gana el que comparte MAS palabras, no cualquiera que comparta
     * una.
     */
    const BAJO_CALORIAS = [
        { numero: 1, proteina: { nombre: 'Milanesa de pollo' }, vegetal: { nombre: 'Tomates asados con cebollas caramelizadas' }, carbo: { nombre: 'Pure de papa' } },
        { numero: 2, proteina: { nombre: 'Lomo fingido en salsa gravy' }, vegetal: { nombre: 'Picadillo de chayote con maiz dulce' }, carbo: { nombre: 'Frijoles blancos guisados' } },
        { numero: 3, proteina: { nombre: 'Fajitas de cerdo en salsa strogonoff' }, vegetal: { nombre: 'Mix de vegetales estilo Mediterraneo' }, carbo: { nombre: 'Arros con maiz dulce' } },
        { numero: 4, proteina: { nombre: 'Lasagna de pollo' }, vegetal: { nombre: 'Crema de vegetales' }, carbo: { nombre: '' } },
        { numero: 5, proteina: { nombre: 'Pollo a la toscana' }, vegetal: { nombre: 'Vegetales mixtos' }, carbo: { nombre: 'Papitas a la parmesana' } }
    ];

    it('solo le cambia el Mix de vegetales, no los otros dos', () => {
        const c = leerCambioDePack(
            'Cambiar Relish de vegetales y Mix de vainica, zanahoria y ayote por VEGETALES SALTEADOS.',
            BAJO_CALORIAS);
        expect(c.toca).toHaveLength(1);
        expect(c.toca[0]).toMatchObject({ indice: 2, parte: 'vegetal' });
    });

    it('la crema de vegetales y los vegetales mixtos quedan intactos', () => {
        const platos = platosDePackDelCliente(BAJO_CALORIAS,
            leerCambioDePack('Cambiar Relish de vegetales y Mix de vainica por VEGETALES SALTEADOS.', BAJO_CALORIAS));
        expect(platos[3].vegetal).toBe('Crema de vegetales');
        expect(platos[4].vegetal).toBe('Vegetales mixtos');
        expect(platos[2].vegetal).toBe('VEGETALES SALTEADOS');
    });

    it('pero cuando de verdad son varios, los agarra todos', () => {
        // "gallo pinto" comparte DOS palabras con los tres gallo pintos.
        const DESAYUNOS = [
            { proteina: { nombre: 'Gallo pinto con huevos revueltos' } },
            { proteina: { nombre: 'Burritos con queso, jamon y frijoles' } },
            { proteina: { nombre: 'Prensadas con queso' } },
            { proteina: { nombre: 'Gallo pinto con huevos con tomate' } },
            { proteina: { nombre: 'Gallo pinto con queso' } }
        ];
        expect(platosQueMenciona('gallo pinto', DESAYUNOS)).toEqual([0, 3, 4]);
    });
});
