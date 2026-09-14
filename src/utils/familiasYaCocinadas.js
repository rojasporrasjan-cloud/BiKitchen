/**
 * Familias de pack que la cocina ya dejó hechas ENTERAS.
 *
 * "Hicieron todo el pack bajo calorías y el pack bajo calorías cena, o sea 1er
 * y 2do menú" (Jan, 11 de setiembre de 2026). Eso no es un sobrante suelto de
 * un plato: es una familia completa que no hay que volver a cocinar.
 *
 * SOLO SALE DE LA COCINA, NO DEL EMPAQUE. La comida existe, pero no está en las
 * bolsas: esos packs igual hay que armarlos el sábado. Sacarlos también del
 * empaque dejaría a esos clientes sin pedido, que es el error más caro que
 * puede cometer esta hoja.
 *
 * Se guarda en el navegador de quien arma la hoja: es un apunte de esta
 * hornada, no un dato del negocio, y así no gasta cuota de escritura.
 */

const LLAVE = 'bikitchen.familiasYaCocinadas';

/** Los nombres como se leen en la hoja, por clave de menú. */
export const NOMBRE_DE_FAMILIA = {
    regular: 'Pack Regular',
    fullPack: 'Full Pack',
    bajoCalorias: 'Pack Bajo en Calorías',
    sinCarbos: 'Pack Sin Carbos',
    keto: 'Pack Keto',
    vegetariano: 'Pack Vegetariano',
    casaditos: 'Pack Casaditos',
    desayuno: 'Desayunos',
    familiarDeluxe: 'Paquete Deluxe',
    familiarPremium: 'Paquete Premium'
};

/** Marca o desmarca una familia. */
export const alternarFamilia = (familias, clave) => {
    const limpia = String(clave || '').trim();
    if (!limpia) return familias || [];
    const lista = familias || [];
    return lista.includes(limpia)
        ? lista.filter(x => x !== limpia)
        : [...lista, limpia];
};

/** Lee lo guardado. Si está corrupto se arranca de cero sin tumbar la hoja. */
export const leerFamiliasCocinadas = () => {
    try {
        const crudo = window.localStorage.getItem(LLAVE);
        if (!crudo) return [];
        const datos = JSON.parse(crudo);
        return Array.isArray(datos) ? datos.filter(x => typeof x === 'string' && x.trim()) : [];
    } catch {
        return [];
    }
};

/** Guarda. Si el navegador no deja, la hoja sigue funcionando. */
export const guardarFamiliasCocinadas = (familias) => {
    try {
        window.localStorage.setItem(LLAVE, JSON.stringify(familias || []));
    } catch {
        // Sin guardar: vale para esta sesión y ya
    }
};
