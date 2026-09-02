/**
 * Quién cocina qué.
 *
 * Esto es lo que hace cada quien NORMALMENTE, no una regla fija: Gina reparte
 * distinto cuando falta alguien o cuando el día viene pesado. Por eso la
 * sugerencia siempre se puede cambiar a mano y nunca pisa lo que ya se asignó.
 *
 * Para editar: agregar o quitar palabras de las listas de abajo. No hace falta
 * saber de código — se escriben como se dicen, con o sin tildes.
 *
 * ⚠️ EL ORDEN IMPORTA. Gana la primera regla que calce, de arriba hacia abajo,
 * y está puesto así por dos razones:
 *
 *   1. Hay preparaciones que mandan sobre el ingrediente. El "Arroz con pollo"
 *      lleva pollo pero lo hace doña Carmen, y el "Picadillo de papa con atún"
 *      es un picadillo, no un plato de pescado ni una harina. Por eso van de
 *      primero.
 *   2. Después manda la proteína, no la guarnición. El "Estofado de pollo con
 *      papa y zanahoria" es de Rosa: si los vegetales fueran antes, se lo
 *      llevaría Carmen por la palabra "zanahoria".
 */

export const COCINERAS = [
    { id: 'rosa', nombre: 'ROSA', hace: 'Pollo' },
    { id: 'fernanda', nombre: 'FERNANDA', hace: 'Cerdo y res' },
    { id: 'carmen', nombre: 'DOÑA CARMEN', hace: 'Vegetales, sopas, arroz con pollo, picadillos' },
    { id: 'osmany', nombre: 'OSMANY', hace: 'Purés y guarniciones harinosas' }
];

/** Cuando nadie lo tiene de fijo, sale en blanco para que Gina diga. */
export const MOTIVO_SIN_DUENO = 'Nadie lo tiene fijo — preguntar a Gina';

/**
 * De arriba hacia abajo: la primera que calce se queda con el plato.
 *
 * `palabras` calza la palabra completa y su plural: "picadillo" agarra
 * "picadillos", pero "res" no agarra "fresas".
 *
 * Una regla con `cocinera: null` corta la búsqueda y deja el plato en blanco.
 * Sirve para lo que nadie tiene asignado y es mejor preguntar que adivinar.
 */
export const REGLAS_ASIGNACION = [
    // ── 1. Preparaciones de doña Carmen que mandan sobre el ingrediente ────
    // Van de primeras: el arroz con pollo lleva pollo, el picadillo de papa
    // lleva papa y la ensalada de caracolitos lleva atún, y aun así son de ella.
    {
        cocinera: 'DOÑA CARMEN',
        palabras: [
            'arroz con pollo', 'sopa', 'sopita', 'caldo', 'olla de carne',
            'picadillo', 'ensalada', 'coleslaw', 'escabeche'
        ],
        motivo: 'Arroces, sopas, picadillos y ensaladas'
    },

    // ── 2. Lo que nadie tiene de fijo ─────────────────────────────────────
    // Antes de las proteínas y los vegetales: un "Filet de tilapia en salsa de
    // espinaca" no es de Carmen por la espinaca, y tampoco le cae a Rosa por
    // descarte. Se pregunta.
    {
        cocinera: null,
        palabras: [
            'pescado', 'tilapia', 'salmon', 'atun', 'corvina',
            'camaron', 'camarones', 'marisco', 'mariscos'
        ],
        motivo: MOTIVO_SIN_DUENO
    },

    // ── 3. Pollo ──────────────────────────────────────────────────────────
    // La proteína va antes que la guarnición: "Estofado de pollo con papa y
    // zanahoria" es de Rosa, no de Carmen ni de Osmany.
    {
        cocinera: 'ROSA',
        palabras: ['pollo', 'pechuga', 'pavo', 'gallina', 'alitas'],
        motivo: 'Pollo'
    },

    // ── 4. Cerdo y res ────────────────────────────────────────────────────
    {
        cocinera: 'FERNANDA',
        palabras: [
            'cerdo', 'res', 'carne', 'lomo', 'lomito', 'bistec', 'bistek',
            'mechada', 'mechado', 'chicharron', 'chorizo', 'costilla', 'pibil',
            'fajitas', 'albondiga', 'albondigas', 'pork', 'molida', 'posta'
        ],
        motivo: 'Cerdo y res'
    },

    // ── 5. Vegetales ──────────────────────────────────────────────────────
    {
        cocinera: 'DOÑA CARMEN',
        palabras: [
            'vegetal', 'vegetales', 'verdura', 'verduras', 'brocoli', 'coliflor',
            'ayote', 'zuchinni', 'zucchini', 'zapallo', 'chayote', 'espinaca',
            'zanahoria', 'repollo', 'tomate', 'palmito', 'salteado', 'salteada'
        ],
        motivo: 'Vegetales'
    },

    // ── 6. Purés y guarniciones harinosas ─────────────────────────────────
    {
        cocinera: 'OSMANY',
        palabras: [
            'pure', 'papa', 'papita', 'camote', 'yuca', 'platano', 'maduro',
            'tiquisque', 'ñampi', 'name', 'pastel de yuca', 'tortilla',
            'arroz', 'pasta', 'spaguetti', 'espagueti', 'fideos', 'quinoa',
            'frijol', 'frijoles', 'cubaces', 'garbanzo', 'garbanzos',
            'lenteja', 'lentejas'
        ],
        motivo: 'Purés y harinas'
    }
];

/**
 * Cuando el nombre no dice nada, se cae al tipo de componente.
 * La proteína queda sin sugerir a propósito: sin la palabra no hay cómo saber
 * si es de Rosa o de Fernanda, y adivinar sale más caro que dejarlo en blanco.
 */
export const POR_TIPO_COMPONENTE = {
    Vegetal: { cocinera: 'DOÑA CARMEN', motivo: 'Es un vegetal' },
    Harina: { cocinera: 'OSMANY', motivo: 'Es una guarnición harinosa' }
};
