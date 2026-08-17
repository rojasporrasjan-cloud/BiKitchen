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
 */
export const indicePorTelefono = (contactos = []) => {
    const indice = new Map();
    contactos.forEach((c) => {
        telefonosDeContacto(c).forEach((tel) => {
            if (!indice.has(tel)) indice.set(tel, c.id);
        });
    });
    return indice;
};

/** Nombre de la etiqueta con la que Gina filtra la difusión en Kommo. */
export const etiquetaDeSegmento = (segmentoId) => `bk-${segmentoId}`;

/**
 * Arma el contacto para Kommo.
 *
 * `camposIds` mapea nuestro dato → id del campo personalizado en la cuenta de
 * Gina. Se descubren con la acción `diagnostico`; los que no estén configurados
 * simplemente no se mandan.
 */
export const payloadContacto = (cliente, { camposIds = {}, segmentoId } = {}) => {
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

    const payload = {
        name: cliente.nombre || 'Sin nombre',
        custom_fields_values: custom
    };
    if (segmentoId) payload._embedded = { tags: [{ name: etiquetaDeSegmento(segmentoId) }] };
    return payload;
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
