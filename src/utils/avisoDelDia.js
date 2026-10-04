/**
 * El recorrido común de los avisos programados alrededor de la entrega
 * (hoy-te-llega, guia-de-congelado, que-tal-todo, volver-a-invitar). Cada
 * función solo dice A QUIÉN (su lista) y con qué bot; acá vive lo que no se
 * negocia, igual que en renovacion-del-dia.js:
 *
 *   - APAGADO si el interruptor no dice "si" o "prueba".
 *   - "prueba": UNA muestra al CAMBIOS_TELEFONO_PRUEBA; la lista real queda en
 *     `envios_kommo` para revisarla antes de prender.
 *   - Nunca dos veces lo mismo: constancia en `envios_del_dia/{tipo}_{clave}`.
 *   - Nunca a teléfonos de relleno, uno por persona, y con más de `tope` no
 *     manda NADA (un filtro roto no puede escribirle a toda la base).
 *
 * Las dependencias de Firebase y Kommo entran por parámetro: así se prueba sin
 * red y este archivo no arrastra firebase-admin a la página.
 */

import { destinatarioDeRenovacion, destinatariosUnicos } from './envioDeCambios';
import { entradaDeRegistro, anotarEnvio } from './registroDeEnvios';

export const COLECCION_CONSTANCIAS = 'envios_del_dia';

/**
 * @param {object} o
 * @param {string} o.tipo         id del envío (TIPOS_DE_ENVIO)
 * @param {string} o.clave        fecha (o semana) de la constancia
 * @param {string} o.modo         valor del interruptor
 * @param {string} o.bot          id del Salesbot
 * @param {number} o.tope
 * @param {Function} o.lista      async () => [{ pedido, fecha, ultima }]
 * @param {object} o.db           Firestore de administrador
 * @param {Function} o.enviarPorKommo
 * @param {Function} o.soloAlNumeroDePrueba
 * @param {object} o.env          process.env
 * @param {Date} o.ahora
 */
export const correrAviso = async ({ tipo, clave, modo, bot, tope, lista, db, enviarPorKommo, soloAlNumeroDePrueba, env = {}, ahora = new Date(), variableBot }) => {
    if (modo !== 'si' && modo !== 'prueba') return { estado: 'apagado' };
    const faltan = ['KOMMO_SUBDOMINIO', 'KOMMO_TOKEN'].filter(v => !env[v]);
    if (!bot) faltan.push(variableBot || 'bot');
    if (modo === 'prueba' && !env.CAMBIOS_TELEFONO_PRUEBA) faltan.push('CAMBIOS_TELEFONO_PRUEBA');
    if (faltan.length) return { estado: 'sin-configurar', detalle: { faltan } };
    if (!db) return { estado: 'sin-firestore' };

    const constancia = db.collection(COLECCION_CONSTANCIAS).doc(`${tipo}_${clave}`);
    const previa = await constancia.get();
    if (previa.exists && previa.data()?.estado === 'enviado' && modo === 'si') {
        return { estado: 'ya-enviado', detalle: { clave } };
    }

    const items = await lista();
    const todos = destinatariosUnicos(items.map(destinatarioDeRenovacion));
    if (todos.length === 0) {
        await constancia.set({ estado: 'nadie', revisadoEn: ahora.toISOString() }, { merge: true });
        return { estado: 'nadie', detalle: { clave } };
    }
    if (todos.length > tope) {
        await constancia.set({ estado: 'frenado-por-tope', cuantos: todos.length, revisadoEn: ahora.toISOString() }, { merge: true });
        await anotarEnvio(db, entradaDeRegistro({ tipo, modo, estado: 'frenado-por-tope', ahora, lesHabriaLlegado: todos }));
        return { estado: 'frenado-por-tope', detalle: { cuantos: todos.length } };
    }

    const destinatarios = modo === 'prueba' ? soloAlNumeroDePrueba(todos, '', clave) : todos;
    const { conId } = await enviarPorKommo(destinatarios, {
        bot,
        camposIds: { entrega: env.KOMMO_CAMPO_ENTREGA, pack: env.KOMMO_CAMPO_PACK },
        segmentoId: tipo
    });

    const estado = modo === 'si' ? 'enviado' : 'prueba';
    await constancia.set({ estado, enviadoEn: ahora.toISOString(), enviados: conId.length, cuantos: todos.length }, { merge: true });
    await anotarEnvio(db, entradaDeRegistro({
        tipo, modo, estado, ahora,
        enviados: conId.map(c => c.d), lesHabriaLlegado: modo === 'prueba' ? todos : []
    }));
    return { estado, detalle: { enviados: conId.length, clientes: todos.map(d => d.nombre) } };
};

/** Respuesta estándar de la función programada. */
export const responder = async (nombre, correr) => {
    try {
        const r = await correr();
        console.log(`[${nombre}]`, JSON.stringify(r));
        return new Response(JSON.stringify(r), { status: 200 });
    } catch (err) {
        console.error(`[${nombre}] Error:`, err);
        return new Response(err.message, { status: 500 });
    }
};
