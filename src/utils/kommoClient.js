/**
 * Habla con la Netlify Function de Kommo desde el panel.
 *
 * El ciclo lo maneja acá el navegador y no el servidor: cada llamada hace un
 * solo paso, así ninguna se acerca al límite de tiempo de Netlify y se puede
 * mostrar el avance mientras corre.
 */

import { auth } from '../firebase/config';
import {
    enLotes,
    indicePorTelefono,
    payloadContacto,
    separarNuevosYExistentes,
    payloadEjecutarBot,
    soloDigitos,
    LOTE_CONTACTOS,
    LOTE_BOTS
} from './kommoPayload';

const ENDPOINT = '/.netlify/functions/kommo';

/** Kommo aguanta 7 por segundo. Se va bien por debajo para no rozar el límite. */
const ESPERA_MS = 250;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

const llamar = async (accion, datos = {}) => {
    const usuario = auth.currentUser;
    if (!usuario) throw new Error('Tu sesión venció. Volvé a entrar al panel.');

    const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${await usuario.getIdToken()}`
        },
        body: JSON.stringify({ accion, ...datos })
    });

    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(cuerpo.error || `Error ${res.status}`);
    return cuerpo;
};

/** Qué hay en la cuenta de Kommo: bots y campos personalizados disponibles. */
export const diagnosticarKommo = () => llamar('diagnostico');

/** Trae todos los contactos de Kommo para poder cruzarlos por teléfono. */
const traerTodosLosContactos = async (avisar) => {
    const todos = [];
    let pagina = 1;

    // Tope de seguridad: 40 páginas × 250 = 10.000 contactos
    while (pagina <= 40) {
        const { contactos, hayMas } = await llamar('contactos', { pagina });
        todos.push(...contactos);
        avisar?.(`Leyendo contactos de Kommo… ${todos.length}`);
        if (!hayMas) break;
        pagina += 1;
        await dormir(ESPERA_MS);
    }
    return todos;
};

/**
 * Sincroniza los clientes con Kommo y devuelve sus ids allá.
 *
 * Crea los que no existen y actualiza los que sí, escribiéndoles el avance del
 * pack y la etiqueta del segmento. Sin este paso el mensaje del bot saldría sin
 * los datos personalizados, porque el bot los lee de la ficha del contacto.
 *
 * @returns {Promise<{ids: number[], creados: number, actualizados: number}>}
 */
export const sincronizarConKommo = async (clientes, { segmentoId, camposIds, avisar } = {}) => {
    const contactosKommo = await traerTodosLosContactos(avisar);
    const indice = indicePorTelefono(contactosKommo);
    const { nuevos, existentes } = separarNuevosYExistentes(clientes, indice);

    const ids = [];

    // --- Los que ya existen: se actualizan en lotes de 50 ---
    const lotesExistentes = enLotes(existentes, LOTE_CONTACTOS);
    for (let i = 0; i < lotesExistentes.length; i++) {
        const lote = lotesExistentes[i];
        avisar?.(`Actualizando contactos… lote ${i + 1} de ${lotesExistentes.length}`);
        await llamar('actualizar', {
            contactos: lote.map(({ cliente, id }) => ({
                id,
                ...payloadContacto(cliente, { camposIds, segmentoId })
            }))
        });
        lote.forEach(({ id }) => ids.push(id));
        await dormir(ESPERA_MS);
    }

    // --- Los nuevos: se crean en lotes de 50 ---
    const lotesNuevos = enLotes(nuevos, LOTE_CONTACTOS);
    for (let i = 0; i < lotesNuevos.length; i++) {
        const lote = lotesNuevos[i];
        avisar?.(`Creando contactos nuevos… lote ${i + 1} de ${lotesNuevos.length}`);
        const { ids: nuevosIds } = await llamar('crear', {
            contactos: lote.map((cliente) => payloadContacto(cliente, { camposIds, segmentoId }))
        });
        ids.push(...nuevosIds);
        await dormir(ESPERA_MS);
    }

    return { ids, creados: nuevos.length, actualizados: existentes.length };
};

/**
 * Lanza el Salesbot. ESTE es el paso que manda los WhatsApp de verdad.
 *
 * Va en lotes de 100 porque es el máximo que acepta /api/v4/bots/run.
 */
export const enviarPorKommo = async (botId, contactIds, { avisar } = {}) => {
    const lotes = enLotes(contactIds, LOTE_BOTS);
    let enviados = 0;

    for (let i = 0; i < lotes.length; i++) {
        avisar?.(`Enviando… lote ${i + 1} de ${lotes.length}`);
        const res = await llamar('enviar', { ejecuciones: payloadEjecutarBot(botId, lotes[i]) });
        enviados += res.enviados || lotes[i].length;
        await dormir(ESPERA_MS);
    }

    return { enviados };
};

/**
 * Prueba con UN solo número antes de mandarle a toda la lista.
 *
 * Es el paso que evita descubrir que la plantilla estaba mal después de
 * mandársela a 300 clientes.
 */
export const probarConUnNumero = async (telefono, clientes, opciones = {}) => {
    const objetivo = soloDigitos(telefono);
    const cliente = clientes.find((c) => soloDigitos(c.telefonoOriginal || c.telefono) === objetivo);
    if (!cliente) {
        throw new Error(`El número ${telefono} no está en la lista del segmento actual.`);
    }

    const { ids } = await sincronizarConKommo([cliente], opciones);
    if (ids.length === 0) throw new Error('No se pudo sincronizar ese contacto con Kommo.');
    return enviarPorKommo(opciones.botId, ids, opciones);
};
