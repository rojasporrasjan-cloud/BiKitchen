/**
 * Plantillas de los mensajes de difusión.
 *
 * El texto lleva variables entre llaves dobles — {{primerNombre}} — que se
 * reemplazan con los datos de cada cliente. Se resuelve acá, del lado nuestro,
 * y no en Kommo, porque Kommo no sabe en qué semana va el pack de nadie.
 *
 * OJO para cuando se conecte la API: con WhatsApp Cloud API, fuera de la ventana
 * de 24 horas solo pasan plantillas aprobadas por Meta. Por eso cada plantilla
 * guarda `nombreMeta`: el nombre de la plantilla equivalente ya aprobada. En la
 * Fase 1 no se usa (el texto se copia y pega), pero el campo ya existe para no
 * tener que migrar las plantillas después.
 */

import { formatFechaLarga } from './dateDisplay';

/** Variables que se pueden usar en el texto. Es lo que se le muestra al usuario. */
export const VARIABLES = [
    { clave: 'primerNombre', descripcion: 'Solo el primer nombre (Andrés)' },
    { clave: 'nombre', descripcion: 'Nombre completo (Andrés Víquez)' },
    { clave: 'pack', descripcion: 'El último pack que pidió' },
    { clave: 'zona', descripcion: 'Su zona de entrega' },
    { clave: 'ultimaEntrega', descripcion: 'Fecha de su última entrega' },
    { clave: 'diasRestantes', descripcion: 'Días que le faltan para esa entrega' },
    // Vienen del mismo cálculo que muestra el módulo de Packs Mensuales
    { clave: 'semana', descripcion: 'En qué semana del pack va (2)' },
    { clave: 'totalSemanas', descripcion: 'De cuántas semanas es el pack (4)' },
    { clave: 'avance', descripcion: 'Semana 2 de 4' },
    { clave: 'entregasRestantes', descripcion: 'Cuántas entregas le quedan' },
    { clave: 'proximaEntrega', descripcion: 'Fecha de su próxima entrega' }
];

const primerNombre = (nombre) => String(nombre || '').trim().split(/\s+/)[0] || '';

/** Los valores de cada variable para un cliente. */
export const valoresDe = (cliente = {}) => ({
    primerNombre: primerNombre(cliente.nombre),
    nombre: cliente.nombre || '',
    pack: (cliente.planes && cliente.planes[0]) || '',
    zona: cliente.zona || '',
    ultimaEntrega: cliente.ultimaEntrega ? formatFechaLarga(cliente.ultimaEntrega) : '',
    diasRestantes: cliente.diasParaUltimaEntrega === null || cliente.diasParaUltimaEntrega === undefined
        ? ''
        : String(cliente.diasParaUltimaEntrega),
    // Un pack de una sola entrega no tiene "semana 1 de 1" que valga la pena
    // decir, así que esas variables quedan vacías y el aviso de huecos lo marca.
    semana: cliente.suscripcion?.total > 1 ? String(cliente.suscripcion.semanaActual) : '',
    totalSemanas: cliente.suscripcion?.total > 1 ? String(cliente.suscripcion.total) : '',
    avance: cliente.suscripcion?.total > 1 ? cliente.suscripcion.etiqueta : '',
    entregasRestantes: cliente.entregasRestantes === undefined || cliente.entregasRestantes === null
        ? ''
        : String(cliente.entregasRestantes),
    proximaEntrega: cliente.suscripcion?.proxima ? formatFechaLarga(cliente.suscripcion.proxima) : ''
});

/**
 * Reemplaza las variables del texto con los datos del cliente.
 *
 * Una variable que no existe se deja tal cual, a propósito: así el usuario ve
 * "{{nombrre}}" en la vista previa y se da cuenta del error, en vez de mandar
 * un mensaje con un hueco en blanco.
 */
export const renderPlantilla = (texto, cliente) => {
    if (!texto) return '';
    const valores = valoresDe(cliente);
    return String(texto).replace(/\{\{\s*(\w+)\s*\}\}/g, (original, clave) => (
        Object.prototype.hasOwnProperty.call(valores, clave) ? valores[clave] : original
    ));
};

/** Variables usadas en un texto que no existen. Se avisan antes de mandar. */
export const variablesDesconocidas = (texto) => {
    const validas = VARIABLES.map((v) => v.clave);
    const usadas = [...String(texto || '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
    return [...new Set(usadas.filter((u) => !validas.includes(u)))];
};

/**
 * Clientes a los que les quedaría un hueco en el mensaje.
 *
 * Sirve para no mandar "Hola , tu pack vence el " a media lista sin enterarse.
 */
export const clientesConHuecos = (texto, clientes = []) => {
    const usadas = [...new Set([...String(texto || '').matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
    if (usadas.length === 0) return [];

    return clientes.filter((c) => {
        const valores = valoresDe(c);
        return usadas.some((u) => Object.prototype.hasOwnProperty.call(valores, u) && !valores[u]);
    });
};

/** Plantillas de arranque. El usuario las edita y guarda las suyas. */
export const PLANTILLAS_BASE = [
    {
        id: 'renovacion',
        nombre: 'Recordatorio de renovación',
        nombreMeta: '',
        texto: '¡Hola {{primerNombre}}! 👋 Tu {{pack}} llega a su última entrega el {{ultimaEntrega}}.\n\n'
            + '¿Te lo dejamos listo para la próxima semana? Avisanos y lo coordinamos. 🍽️'
    },
    {
        id: 'menu',
        nombre: 'Menú de la semana',
        nombreMeta: '',
        texto: '¡Hola {{primerNombre}}! 🍳 Ya está listo el menú de esta semana.\n\n'
            + '(pegá acá el menú)\n\nHacé tu pedido antes del jueves para asegurar tu entrega. 😊'
    },
    {
        id: 'recuperacion',
        nombre: 'Hace rato no pedís',
        nombreMeta: '',
        texto: '¡Hola {{primerNombre}}! 💚 Hace un tiempo no te vemos por BiKitchen.\n\n'
            + 'Volvimos con menú nuevo. ¿Te preparamos algo esta semana?'
    }
];
