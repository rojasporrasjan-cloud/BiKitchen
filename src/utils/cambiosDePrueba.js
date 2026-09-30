/**
 * El link de cambios en MODO PRUEBA: /cambios/prueba
 *
 * "Quiero ver pruebas, ver como si yo fuera un cliente: si abro el link, cómo
 *  cambio los platos" — Jan, 29 set 2026.
 *
 * Muestra la misma página que ve el cliente, con el menú y la lista de cambios
 * REALES de esta semana, pero sobre un pedido de mentira y SIN GUARDAR NADA:
 * al enviar, en vez de escribir en un pedido, enseña el texto exacto que le
 * llegaría a la hoja de cocina. Para probar no hace falta inventar pedidos que
 * después la cocina termine cocinando.
 *
 * Usa las mismas reglas que el servidor (`cambiosDeLaSemana.js`): lo que acá
 * pasa o no pasa es lo mismo que le pasaría a un cliente.
 *
 * Lecturas: el menú (con la caché de getOfficialMenus) y las sustituciones.
 * Los dos documentos son de lectura pública en las reglas de Firestore.
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getOfficialMenus } from './firestoreMenus';
import { loQueSePuedeCambiar, validarPedidoDeCambios, textoParaLaHoja, horaLimiteEnPalabras } from './cambiosDeLaSemana';

export const CODIGO_DE_PRUEBA = 'prueba';

/** Los packs que se pueden probar. `nombre` es como lo escribe un pedido. */
export const PACKS_DE_PRUEBA = [
    { id: 'bajoCalorias', nombre: 'Pack Bajo Calorías' },
    { id: 'regular', nombre: 'Pack Regular' },
    { id: 'sinCarbos', nombre: 'Pack Sin Carbos' },
    { id: 'keto', nombre: 'Pack Keto' },
    { id: 'casaditos', nombre: 'Pack Casaditos' },
    { id: 'vegetariano', nombre: 'Pack Vegetariano' },
    { id: 'regularConCena', nombre: 'Pack Regular Almuerzo y Cena' }
];

/** El próximo sábado, en AAAA-MM-DD: la entrega que se cambia el miércoles. */
export const proximoSabado = (hoy = new Date()) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Un pedido de mentira del pack elegido (nunca se guarda). */
export const pedidoDePrueba = (packId) => {
    const pack = PACKS_DE_PRUEBA.find(p => p.id === packId) || PACKS_DE_PRUEBA[0];
    return { plan: pack.nombre, items: [{ nombre: pack.nombre, cantidad: 1 }] };
};

/**
 * Lo mismo que devuelve el servidor al abrir un link, armado en el navegador.
 * En la prueba nunca se cierra, para poder probar cualquier día de la semana.
 */
export const armarPrueba = async (packId, { menus, sustituciones } = {}) => {
    const [m, s] = await Promise.all([
        menus || getOfficialMenus(),
        sustituciones || getDoc(doc(db, 'config', 'substitutions')).then(snap => (snap.exists() ? snap.data() : {}))
    ]);
    const pedido = pedidoDePrueba(packId);
    const permitido = loQueSePuedeCambiar(pedido, m, s);
    if (!permitido) throw new Error('Ese pack no tiene menú cargado esta semana.');
    const fecha = proximoSabado();
    return {
        prueba: true,
        nombre: 'Jan',
        pack: pedido.plan,
        fecha,
        cerrada: false,
        cierreEnPalabras: horaLimiteEnPalabras(fecha),
        permitido,
        guardado: null
    };
};

/**
 * Lo que haría el servidor con lo que se mandó, sin guardarlo: los mismos
 * errores y el mismo texto que recibiría la hoja de cocina.
 */
export const enviarPrueba = (permitido, entrada) => {
    const { errores, limpio } = validarPedidoDeCambios(permitido, entrada);
    if (errores.length) throw new Error(errores.join(' '));
    return textoParaLaHoja(limpio);
};
