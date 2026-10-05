/**
 * Armado de los datos que se le mandan a Kommo.
 *
 * Vive aparte de la Netlify Function para poder probarlo sin credenciales ni red.
 * La Function solo agrega el token y hace el fetch.
 *
 * CÓMO SE MANDA UN MENSAJE (importante, porque no es obvio):
 *
 *   1. Se busca/crea el contacto en Kommo, identificado por TELÉFONO.
 *   2. Se le escriben los datos que Kommo no puede saber — en qué semana va el
 *      pack, cuándo es su próxima entrega — como campos personalizados.
 *   3. Se le pone la etiqueta del segmento.
 *   4. Se lanza el Salesbot: POST /api/v4/bots/run
 *
 * El texto del mensaje NO viaja en la llamada. Lo arma el Salesbot leyendo la
 * ficha del contacto, por eso el paso 2 es el que hace que el mensaje diga algo
 * personalizado. Y por eso la plantilla del bot tiene que ser una ya aprobada
 * por Meta: fuera de la ventana de 24 h no pasa ninguna otra.
 */

/** Kommo pide lotes: 50 contactos por request, 100 bots por request. */
export const LOTE_CONTACTOS = 50;
export const LOTE_BOTS = 100;

/** Parte un arreglo en pedazos de `tam`. */
export const enLotes = (arr = [], tam = 50) => {
    const lotes = [];
    for (let i = 0; i < arr.length; i += tam) lotes.push(arr.slice(i, i + tam));
    return lotes;
};

/** Solo dígitos, últimos 8. Igual que en segmentacionClientes, para que crucen. */
export const soloDigitos = (telefono) => {
    const d = String(telefono || '').replace(/\D/g, '');
    return d.length > 8 ? d.slice(-8) : d;
};

/**
 * Saca el teléfono de un contacto de Kommo.
 *
 * En Kommo el teléfono no es un campo suelto: viene adentro de
 * `custom_fields_values`, en el campo cuyo `field_code` es "PHONE", y puede
 * tener varios valores (casa, trabajo). Se devuelven todos normalizados.
 */
export const telefonosDeContacto = (contacto) => {
    const campos = contacto?.custom_fields_values || [];
    const campoTel = campos.find((c) => c?.field_code === 'PHONE');
    return (campoTel?.values || [])
        .map((v) => soloDigitos(v?.value))
        .filter(Boolean);
};

/**
 * Índice teléfono → id de contacto de Kommo.
 *
 * Se arma una sola vez con la lista completa y después se consulta en memoria,
 * en vez de preguntarle a Kommo por cada cliente. Con 300 clientes eso es la
 * diferencia entre 2 llamadas y 300.
 *
 * Si el número está en varios contactos gana el MÁS NUEVO (elMasNuevo).
 */
export const indicePorTelefono = (contactos = []) => {
    const porTel = new Map();
    contactos.forEach((c) => {
        telefonosDeContacto(c).forEach((tel) => {
            porTel.set(tel, elMasNuevo([porTel.get(tel), c]));
        });
    });
    return new Map([...porTel].map(([tel, c]) => [tel, c.id]));
};

/**
 * De varios contactos con el mismo teléfono, el más nuevo (fecha de creación;
 * si no viene, el id más alto).
 *
 * Por qué (4 oct 2026): muchos clientes tienen DOS contactos en Kommo. El viejo
 * (de mayo) quedó con su chat en el número de WhatsApp anterior, que ya no está
 * conectado: lo que se le manda falla con el error 3137 y no llega. El nuevo se
 * creó cuando el cliente escribió al 8506-7200. Ganaba el primero que
 * devolvía Kommo, que podía ser el viejo: así se perdían los mensajes.
 */
export const elMasNuevo = (contactos = []) => (contactos || []).filter(Boolean)
    .reduce((mejor, c) => {
        if (!mejor) return c;
        const a = Number(c.created_at) || 0;
        const b = Number(mejor.created_at) || 0;
        if (a !== b) return a > b ? c : mejor;
        return Number(c.id) > Number(mejor.id) ? c : mejor;
    }, null);

/** Nombre de la etiqueta con la que Gina filtra la difusión en Kommo. */
export const etiquetaDeSegmento = (segmentoId) => `bk-${segmentoId}`;

/**
 * Arma el contacto para Kommo.
 *
 * `camposIds` mapea nuestro dato → id del campo personalizado en la cuenta de
 * Gina. Se descubren con la acción `diagnostico`; los que no estén configurados
 * simplemente no se mandan.
 */
export const payloadContacto = (cliente, { camposIds = {}, segmentoId, conNombre = true } = {}) => {
    const custom = [];

    const agregar = (id, valor) => {
        if (!id || valor === '' || valor === null || valor === undefined) return;
        custom.push({ field_id: Number(id), values: [{ value: String(valor) }] });
    };

    // El teléfono va con field_code, que no cambia entre cuentas
    if (cliente.telefonoOriginal || cliente.telefono) {
        custom.push({
            field_code: 'PHONE',
            values: [{ value: cliente.telefonoOriginal || cliente.telefono }]
        });
    }
    if (cliente.correo) {
        custom.push({ field_code: 'EMAIL', values: [{ value: cliente.correo }] });
    }

    agregar(camposIds.avance, cliente.suscripcion?.total > 1 ? cliente.suscripcion.etiqueta : '');
    agregar(camposIds.proximaEntrega, cliente.suscripcion?.proxima || '');
    agregar(camposIds.entregasRestantes, cliente.entregasRestantes);
    agregar(camposIds.pack, cliente.planes?.[0] || '');
    agregar(camposIds.zona, cliente.zona || '');
    // El link personal para elegir los cambios de la semana (envioDeCambios.js).
    // Solo lo traen los clientes de la pantalla "Cambios de la semana".
    agregar(camposIds.linkCambios, cliente.linkCambios || '');
    // Para las variables de la plantilla `cambios_personal`: "sábado 3 de octubre"
    // y "jueves 1 de octubre, 7 p. m.". En palabras, porque van tal cual al mensaje.
    agregar(camposIds.entrega, cliente.entregaEnPalabras || '');
    agregar(camposIds.cierreCambios, cliente.cierreCambios || '');
    // El saludo de TODAS las plantillas ("Hola María"), no el nombre del
    // contacto. La muestra de prueba no lo toca: el contacto de Jan ya dice el suyo.
    if (!cliente.muestra) agregar(camposIds.primerNombre, primerNombreParaSaludo(cliente.nombre));

    // Al actualizar (conNombre: false) no se pisa el nombre que Gina le puso al
    // contacto en Kommo ("Adriana Cubillo Montes pavas"): solo al crearlo.
    const payload = { custom_fields_values: custom };
    if (conNombre) payload.name = cliente.nombre || 'Sin nombre';
    if (segmentoId) payload._embedded = { tags: [{ name: etiquetaDeSegmento(segmentoId) }] };
    return payload;
};

const TITULOS = new Set(['don', 'dona', 'doña', 'sr', 'sra', 'srta', 'senor', 'señor', 'senora', 'señora', 'dr', 'dra', 'lic', 'licda']);
const PARENTESCOS = new Set(['esposa', 'esposo', 'hijo', 'hija', 'mama', 'mamá', 'papa', 'papá', 'hermano', 'hermana', 'novio', 'novia', 'suegra', 'suegro']);
const conMayuscula = (p) => p.charAt(0).toLocaleUpperCase('es') + p.slice(1).toLocaleLowerCase('es');

/**
 * El primer nombre para el "Hola …" de las plantillas (4 oct 2026).
 *
 * Los pedidos traen el nombre como venga: "karolina soto carballo", "Paula
 * (nutricionista)", "Doña Carmen". Al cliente se le saluda "Hola Karolina",
 * "Hola Paula", "Hola Carmen". Si el pedido no es de la persona sino de
 * alguien de su casa ("Esposa de Rainiero Dinarte"), se deja el nombre entero:
 * mejor largo que "Hola Esposa".
 */
export const primerNombreParaSaludo = (nombre) => {
    const limpio = String(nombre || '').replace(/\(.*?\)/g, ' ').replace(/[^\p{L}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim();
    const palabras = limpio.split(' ').filter(Boolean);
    while (palabras.length > 1 && TITULOS.has(palabras[0].toLocaleLowerCase('es').replace(/\.$/, ''))) palabras.shift();
    if (!palabras.length) return '';
    if (PARENTESCOS.has(palabras[0].toLocaleLowerCase('es'))) return limpio;
    return conMayuscula(palabras[0]);
};

/** Los que ya existen llevan `id`; los nuevos no. Kommo usa PATCH vs POST. */
export const separarNuevosYExistentes = (clientes = [], indice = new Map()) => {
    const nuevos = [];
    const existentes = [];

    clientes.forEach((c) => {
        const id = indice.get(soloDigitos(c.telefonoOriginal || c.telefono));
        if (id) existentes.push({ cliente: c, id });
        else nuevos.push(c);
    });

    return { nuevos, existentes };
};

/** Cuerpo de POST /api/v4/bots/run — máximo 100 por llamada. */
export const payloadEjecutarBot = (botId, contactIds = []) =>
    contactIds.map((id) => ({
        bot_id: Number(botId),
        entity_id: Number(id),
        entity_type: 'contacts'
    }));

/**
 * Cuántas llamadas va a hacer la sincronización completa.
 * Se le muestra al usuario antes de arrancar, para que sepa qué va a pasar.
 */
export const estimarLlamadas = ({ nuevos = 0, existentes = 0, aEnviar = 0 } = {}) =>
    Math.ceil(nuevos / LOTE_CONTACTOS)
    + Math.ceil(existentes / LOTE_CONTACTOS)
    + Math.ceil(aEnviar / LOTE_BOTS);
