/**
 * La conexión con Kommo: lo que pasa en Kommo, resumido en una ficha por
 * cliente (`kommo_contactos/{8 dígitos}`). La usa la función programada
 * `kommo-sync` (cada 10 min) y, después, el panel de Difusiones.
 * Plan completo: docs/PLAN_DIFUSIONES_AUTOMATICAS.md.
 *
 * De dónde sale cada dato (todo de la API de eventos de Kommo):
 *   - incoming_chat_message → el cliente escribió (abre la ventana de 24 h)
 *   - outgoing_chat_message → le escribimos (bot o persona: Kommo no distingue)
 *   - lead_status_changed   → cambió de etapa en el embudo
 *   - entity_tag_added / entity_tag_deleted → la etiqueta `no-molestar`
 *
 * Lo que NO hace falta preguntar: si el chat es del WhatsApp viejo. Al número
 * viejo ya no le entra ni le sale nada (los envíos fallan con el error 3137 y no
 * dejan evento), así que todo mensaje que aparece acá es del canal bueno.
 *
 * Todo puro: sin red ni Firestore, para probarlo.
 */

export const TIPOS_DE_EVENTO = [
    'incoming_chat_message',
    'outgoing_chat_message',
    'lead_status_changed',
    'entity_tag_added',
    'entity_tag_deleted'
];

/** La etiqueta de Kommo que frena el marketing (la pone el bot en "Ahora no", o Gina a mano). */
export const ETIQUETA_NO_MOLESTAR = 'no-molestar';
export const DIAS_SIN_MARKETING = 30;

const iso = (segundos) => new Date(Number(segundos) * 1000).toISOString();

/** Últimos 8 dígitos; '' si no sirve (vacío o relleno tipo 8888-8888). */
export const telefono8 = (valor) => {
    const d = String(valor || '').replace(/\D/g, '');
    const t = d.length > 8 ? d.slice(-8) : d;
    if (t.length !== 8 || /^(\d)\1+$/.test(t) || /^8000\d{4}$/.test(t)) return '';
    return t;
};

/** El primer teléfono que sirve de un contacto de Kommo. */
export const telefonoDelContacto = (contacto) => {
    const campo = (contacto?.custom_fields_values || []).find(c => c?.field_code === 'PHONE');
    for (const v of campo?.values || []) {
        const t = telefono8(v?.value);
        if (t) return t;
    }
    return '';
};

/** El contacto de un evento de chat (va colgado del lead). */
export const contactoDelEvento = (e) => {
    if (e?.entity_type === 'contact') return Number(e.entity_id) || null;
    return Number(e?._embedded?.entity?.linked_talk_contact_id) || null;
};

const nombreDeEtiqueta = (valor) => String(valor?.[0]?.tag?.name || valor?.[0]?.name || '').trim().toLowerCase();

/**
 * Lo que cambió en una tanda de eventos, agrupado.
 *
 * @returns {{
 *   porContacto: Map<id, {ultimoEntrante?, ultimoSaliente?, noMolestar?: {puesta, cuando}}>,
 *   porLead: Map<id, {estado, pipeline, cuando}>,
 *   etiquetasDeLead: Map<id, {puesta, cuando}>,
 *   ultimo: number   // el created_at más alto (para seguir desde ahí)
 * }}
 */
export const resumirEventos = (eventos = []) => {
    const porContacto = new Map();
    const porLead = new Map();
    const etiquetasDeLead = new Map();
    let ultimo = 0;
    const de = (id) => {
        if (!porContacto.has(id)) porContacto.set(id, {});
        return porContacto.get(id);
    };
    [...(eventos || [])].sort((a, b) => a.created_at - b.created_at).forEach((e) => {
        ultimo = Math.max(ultimo, Number(e.created_at) || 0);
        const cuando = iso(e.created_at);
        if (e.type === 'incoming_chat_message' || e.type === 'outgoing_chat_message') {
            const id = contactoDelEvento(e);
            if (!id) return;
            de(id)[e.type === 'incoming_chat_message' ? 'ultimoEntrante' : 'ultimoSaliente'] = cuando;
        } else if (e.type === 'lead_status_changed') {
            const s = e.value_after?.[0]?.lead_status;
            if (s?.id) porLead.set(Number(e.entity_id), { estado: s.id, pipeline: s.pipeline_id, cuando });
        } else if (e.type === 'entity_tag_added' || e.type === 'entity_tag_deleted') {
            const etiqueta = nombreDeEtiqueta(e.type === 'entity_tag_added' ? e.value_after : e.value_before);
            if (etiqueta !== ETIQUETA_NO_MOLESTAR) return;
            const marca = { puesta: e.type === 'entity_tag_added', cuando };
            if (e.entity_type === 'contact') de(Number(e.entity_id)).noMolestar = marca;
            else if (e.entity_type === 'lead') etiquetasDeLead.set(Number(e.entity_id), marca);
        }
    });
    return { porContacto, porLead, etiquetasDeLead, ultimo };
};

/**
 * Lo que se escribe en la ficha de un teléfono (merge). Los eventos vienen en
 * orden y desde la última vuelta, así que lo nuevo siempre pisa a lo viejo: no
 * hace falta leer la ficha antes de escribirla (regla 17: cero lecturas).
 *
 * El contacto bueno es el del ÚLTIMO mensaje: es el que tiene el chat vivo.
 */
export const cambiosDeFicha = (tel, contactoId, cambio = {}, ahora = new Date()) => {
    const salida = { tel, actualizado: ahora.toISOString() };
    if (cambio.ultimoEntrante) salida.ultimoEntrante = cambio.ultimoEntrante;
    if (cambio.ultimoSaliente) salida.ultimoSaliente = cambio.ultimoSaliente;
    if (cambio.ultimoEntrante || cambio.ultimoSaliente) {
        salida.contactoBueno = contactoId;
        salida.chatVivo = true;           // le entró o le salió algo: está en el WhatsApp que funciona
        salida.whatsappViejo = false;
    }
    if (cambio.etapa) salida.etapa = cambio.etapa;
    if (cambio.noMolestar) {
        salida.noMolestarDesde = cambio.noMolestar.puesta ? cambio.noMolestar.cuando : null;
    }
    return salida;
};

/** ¿Se le puede mandar marketing hoy? (lo usa el envío: fase 3) */
export const noMolestarVigente = (ficha, ahora = new Date()) => {
    if (!ficha?.noMolestarDesde) return false;
    const hasta = new Date(ficha.noMolestarDesde);
    hasta.setDate(hasta.getDate() + DIAS_SIN_MARKETING);
    return ahora < hasta;
};

/** ¿Tiene la ventana de 24 h abierta? (texto libre sin plantilla) */
export const ventanaAbierta = (ficha, ahora = new Date()) =>
    !!ficha?.ultimoEntrante && (ahora - new Date(ficha.ultimoEntrante)) < 24 * 3600 * 1000;
