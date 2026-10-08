/**
 * Registro de los WhatsApp automáticos: qué salió, cuándo y a quién.
 *
 * Cada función que manda por Kommo (cambios del miércoles, renovación, pago
 * recibido, recordatorio de pago) deja UNA entrada por vuelta en la colección
 * `envios_kommo`. La pantalla Listas de Difusión la lee por la función `kommo`
 * (solo el dueño, ~40 lecturas) para mostrar qué se mandó y qué falta.
 *
 * En modo prueba la entrada lleva `enviados` (la muestra que le llegó al número
 * de prueba) y `lesHabriaLlegado` (la lista real): así se revisa la lista antes
 * de prender el envío para clientes.
 *
 * Cada tipo trae además lo que muestra el cronograma del panel: `horario` (el
 * MISMO cron en UTC del `config` de su función; la prueba cronogramaDeEnvios
 * los compara), `plantilla` de Meta, `texto`, a quién (`a`) y si es Servicio o
 * Marketing (`clase`).
 */

export const COLECCION_ENVIOS = 'envios_kommo';

/** Los envíos automáticos, con su interruptor y su bot en Netlify. */
export const TIPOS_DE_ENVIO = [
    {
        id: 'cambios', label: 'Menú y cambios de la semana',
        cuando: 'Miércoles 8 a. m. — a los que reciben el sábado o el lunes',
        interruptor: 'CAMBIOS_ENVIO_AUTOMATICO', bot: 'KOMMO_BOT_CAMBIOS',
        funcion: 'cambios-miercoles',
        horario: '0 14 * * 3',
        clase: 'Servicio',
        plantilla: 'cambios_personal',
        a: 'Los que reciben el sábado o el lunes',
        texto: 'Hola [nombre] 👋 Ya está listo el menú de tu entrega del [fecha]: bikitchencr.com/menu. Si querés cambiar algo (hasta 2 cambios por pack), entrá a tu link personal: [link]. Podés hacerlo hasta el [cierre]. ¡Gracias por comer rico con nosotros!'
    },
    {
        id: 'renovacion', label: 'Renovación del pack',
        cuando: 'Lunes, miércoles y sábado 10 a. m. — el día de su última entrega',
        interruptor: 'RENOVACION_AUTOMATICA', bot: 'KOMMO_BOT_RENOVACION',
        funcion: 'renovacion-del-dia',
        horario: '0 16 * * 1,3,6',
        clase: 'Servicio',
        plantilla: 'renovacion_pack',
        a: 'Los que hoy reciben la ÚLTIMA entrega de su pack',
        texto: 'Hola [nombre] 👋 Esta semana te llega la última entrega de tu pack de BiKitchen. Para seguir recibiendo tu comida sin pausa, respondé este mensaje y te ayudamos a renovar. ¡Gracias por confiar en nosotros!'
    },
    {
        id: 'recordatorio-pago', label: 'Recordatorio de pago',
        cuando: 'Todos los días 10 a. m. — sin pagar y con entrega en los próximos 3 días',
        interruptor: 'RECORDATORIO_PAGO_AUTOMATICO', bot: 'KOMMO_BOT_RECORDATORIO_PAGO',
        funcion: 'recordatorio-pago',
        horario: '0 16 * * *',
        clase: 'Servicio',
        plantilla: 'recordatorio_pago',
        a: 'Sin pagar y con entrega en los próximos 3 días',
        texto: 'Hola [nombre] 👋 Tu pedido de BiKitchen todavía aparece pendiente de pago. Si ya pagaste, mandanos el comprobante por este chat y listo. Si necesitás los datos para pagar, respondé este mensaje. ¡Gracias!'
    },
    {
        id: 'pago-recibido', label: 'Pago recibido',
        cuando: 'Cada 10 minutos — apenas se confirma el pago en el panel o con tarjeta',
        interruptor: 'PAGO_RECIBIDO_AUTOMATICO', bot: 'KOMMO_BOT_PAGO_RECIBIDO',
        funcion: 'pago-recibido',
        horario: '*/10 * * * *',
        clase: 'Servicio',
        plantilla: 'pago_recibido',
        a: 'A quien le confirmaron el pago en la última media hora',
        texto: 'Hola [nombre], recibimos tu pago ✅ Tu pedido de BiKitchen quedó confirmado. Tu entrega es el [fecha], entre 9 a. m. y 2 p. m. Si tenés alguna duda, respondé este mensaje. ¡Gracias por elegirnos!'
    },
    // Los avisos alrededor de la entrega (avisosDeEntrega.js, 4 oct 2026)
    {
        id: 'hoy-te-llega', label: 'Hoy te llega',
        cuando: 'Lunes, miércoles y sábado 7 a. m. — a todos los que reciben ese día',
        interruptor: 'HOY_TE_LLEGA_AUTOMATICO', bot: 'KOMMO_BOT_HOY_TE_LLEGA',
        funcion: 'hoy-te-llega',
        horario: '0 13 * * 1,3,6',
        clase: 'Servicio',
        plantilla: 'hoy_te_llega',
        a: 'Todos los que reciben ese día',
        texto: 'Hola [nombre] 👋 Hoy te llega tu pedido de BiKitchen 🚚 El repartidor pasa entre 9 a. m. y 2 p. m. Si no vas a estar, respondé este mensaje y coordinamos. ¡Buen provecho!'
    },
    {
        id: 'guia-congelado', label: 'Guía de congelado',
        cuando: 'Lunes, miércoles y sábado 3 p. m. — la primera entrega de cada pedido',
        interruptor: 'GUIA_CONGELADO_AUTOMATICO', bot: 'KOMMO_BOT_GUIA_CONGELADO',
        funcion: 'guia-de-congelado',
        horario: '0 21 * * 1,3,6',
        clase: 'Servicio',
        plantilla: 'guia_de_congelado (con imagen)',
        a: 'Los que hoy recibieron su PRIMERA entrega',
        texto: 'Hola [nombre], ¿ya guardaste tu pack? 🧊 Platos 1 y 2: al refri. Platos 3, 4 y 5: al congelador hoy mismo. Para comerlos: pasalos al refri la noche anterior y calentalos bien.'
    },
    {
        id: 'que-tal', label: '¿Qué tal todo?',
        cuando: 'Domingo, martes y jueves 11 a. m. — clientes nuevos, el día después de su primera entrega',
        interruptor: 'QUE_TAL_AUTOMATICO', bot: 'KOMMO_BOT_QUE_TAL',
        funcion: 'que-tal-todo',
        horario: '0 17 * * 0,2,4',
        clase: 'Servicio',
        plantilla: 'que_tal_todo (botones "¡Todo excelente!" / "Tengo un comentario")',
        a: 'Clientes nuevos, el día después de su primera entrega',
        texto: 'Hola [nombre] 😊 Ayer recibiste tu primer pedido de BiKitchen y queremos saber: ¿qué tal todo? ¿Llegó bien y te gustó la comida? Si algo no te gustó, contanos con confianza para mejorarlo.'
    },
    {
        id: 'volver-a-invitar', label: 'Volver a invitar',
        cuando: 'Martes 10 a. m. — terminaron hace 2 a 3 semanas y no volvieron a pedir (Marketing)',
        interruptor: 'VOLVER_A_INVITAR_AUTOMATICO', bot: 'KOMMO_BOT_VOLVER_A_INVITAR',
        funcion: 'volver-a-invitar',
        horario: '0 16 * * 2',
        clase: 'Marketing',
        plantilla: 'volver_a_invitar (botones "¡Quiero pedir!" / "Ahora no")',
        a: 'Terminaron hace 2 a 3 semanas y no volvieron',
        texto: 'Hola [nombre] 👋 ¡Te extrañamos en BiKitchen! Ya está el menú nuevo de la semana. Tu próximo pack lleva 15% de descuento. Respondé este mensaje y te ayudamos a armar tu pedido 🍽️',
        pendiente: 'Jan pidió 10 % (8 oct): la plantilla nueva volver_a_invitar_10 está en revisión de Meta. Cuando la aprueben se cambia en el bot 117255; hasta entonces la aprobada dice 15 %.'
    },
    // Para vender más (Jan, 8 oct 2026: "si, deja todo listo"). Vienen APAGADOS.
    {
        id: 'seguimiento', label: 'Seguimiento a quien preguntó',
        cuando: 'Cada hora de 8 a. m. a 8 p. m. — escribió hace 18 a 24 h y nunca ha comprado',
        interruptor: 'SEGUIMIENTO_AUTOMATICO', bot: 'KOMMO_BOT_SEGUIMIENTO',
        funcion: 'seguimiento-consulta',
        horario: '15 * * * *',
        clase: 'Servicio',
        plantilla: 'Sin plantilla: mensaje libre del bot (dentro de las 24 h)',
        a: 'Escribió hace 18 a 24 h y nunca ha comprado (de 8 a. m. a 8 p. m., una vez cada 7 días)',
        texto: '¡Hola! 👋 ¿Pudiste ver los planes de BiKitchen? Si querés, te ayudo a escoger el pack que mejor te queda (bajo en calorías, keto, casaditos o familiar) y te digo qué días entregamos en tu zona. ¿Para cuántas personas sería? 🍽️',
    },
    {
        id: 'pasate-mensual', label: 'Pasate al mensual',
        cuando: 'Martes 11 a. m. — compran semanal y no tienen mensual (Marketing)',
        interruptor: 'PASATE_MENSUAL_AUTOMATICO', bot: 'KOMMO_BOT_PASATE_MENSUAL',
        funcion: 'pasate-al-mensual',
        horario: '0 17 * * 2',
        clase: 'Marketing',
        plantilla: 'pasate_al_mensual_desayunos (bot 117990)',
        a: 'Compran pack semanal (entrega en los últimos 7 días o por venir) y no tienen un mensual',
        texto: 'Oferta: pasarse al pack mensual con los desayunos de regalo el primer mes. El texto exacto está en Kommo → Plantillas.'
    },
    {
        id: 'menu-semana', label: 'Menú de la semana por tipo de pack',
        cuando: 'Lunes 4 p. m. — compraron ese tipo hace 3 a 8 semanas y no volvieron (Marketing)',
        interruptor: 'MENU_SEMANA_AUTOMATICO', bot: 'KOMMO_BOT_MENU_BAJO_CALORIAS',
        botsExtra: ['KOMMO_BOT_MENU_KETO', 'KOMMO_BOT_MENU_CASADITOS', 'KOMMO_BOT_MENU_FAMILIAR'],
        funcion: 'menu-de-la-semana',
        horario: '0 22 * * 1',
        clase: 'Marketing',
        plantilla: 'menu_semana_bajo_calorias (117998) · menu_semana_keto (117996) · menu_semana_casaditos (118000) · menu_semana_familiar (118002)',
        a: 'Compraron ese tipo de pack y su última entrega fue hace 3 a 8 semanas, sin nada después',
        texto: 'El menú de la semana de su tipo de pack. El texto exacto de cada uno está en Kommo → Plantillas. Si Gina no pasó el menú nuevo a tiempo, dejarlo apagado esa semana.'
    },
    // Fase 3 de docs/PLAN_DIFUSIONES_AUTOMATICAS.md (6 oct 2026). Un interruptor
    // para los tres cierres; cada día tiene su bot (KOMMO_BOT_CIERRE_SABADO y
    // KOMMO_BOT_CIERRE_LUNES además de este). Sin el bot de ese día, ese no sale.
    {
        id: 'cierre-pedidos', label: 'Cierre de pedidos',
        cuando: 'Lunes, jueves y viernes 9 a. m. — clientes de ese día de reparto sin entrega esta vez (Marketing)',
        interruptor: 'CIERRE_PEDIDOS_AUTOMATICO', bot: 'KOMMO_BOT_CIERRE_MIERCOLES',
        funcion: 'cierre-de-pedidos',
        horario: '0 15 * * 1,4,5',
        clase: 'Marketing',
        plantilla: 'cierre_pedidos_miercoles · cierre_pedidos_sabado · cierre_pedidos_lunes',
        a: 'Clientes de ese día de reparto que esta vez no tienen pedido',
        texto: 'Aviso de que HOY cierran los pedidos para esa entrega (lunes → miércoles, jueves → sábado, viernes → lunes; se cierra a las 8 p. m.). El texto exacto está en Kommo → Plantillas.',
        botsExtra: ['KOMMO_BOT_CIERRE_SABADO', 'KOMMO_BOT_CIERRE_LUNES']
    }
];

const persona = (d = {}) => ({
    nombre: String(d.nombre || ''),
    telefono: String(d.telefono || ''),
    fecha: String(d.suscripcion?.proxima || d.fecha || ''),
    muestra: !!d.muestra
});

/** La entrada que se guarda. Sin `undefined`: Firestore los rechaza. */
export const entradaDeRegistro = ({ tipo, modo, estado, ahora = new Date(), enviados = [], lesHabriaLlegado = [], nombre = '' }) => ({
    tipo: String(tipo || ''),
    // Las difusiones a mano (tipo 'difusion') guardan qué fue: "Promo HOY5", el bot…
    nombre: String(nombre || ''),
    modo: String(modo || ''),
    estado: String(estado || ''),
    cuando: ahora.toISOString(),
    enviados: (enviados || []).map(persona),
    lesHabriaLlegado: (lesHabriaLlegado || []).map(persona)
});

/** Guarda la entrada. Si falla, el envío ya salió: se avisa en el log y sigue. */
export const anotarEnvio = async (db, entrada) => {
    try {
        await db.collection(COLECCION_ENVIOS).add(entrada);
    } catch (err) {
        console.error('[RegistroDeEnvios] No se pudo anotar:', err.message);
    }
};

/**
 * Qué pasó con este cliente en este envío, según el registro.
 * @returns {{ estado: 'enviado'|'prueba', cuando: string } | null}
 */
export const estadoEnRegistro = (registro = [], tipo, telefono, fecha = '') => {
    const calza = (p) => p.telefono === telefono && (!fecha || !p.fecha || p.fecha === fecha);
    const deEseTipo = (registro || []).filter(e => e.tipo === tipo);
    const enviado = deEseTipo.find(e => e.modo === 'si' && (e.enviados || []).some(calza));
    if (enviado) return { estado: 'enviado', cuando: enviado.cuando };
    const prueba = deEseTipo.find(e => e.modo === 'prueba' && (e.lesHabriaLlegado || []).some(calza));
    if (prueba) return { estado: 'prueba', cuando: prueba.cuando };
    return null;
};

/** Los modos tal como están en Netlify, para la pantalla (sin secretos). */
export const modosDeEnvio = (env = {}) => {
    const prueba = String(env.CAMBIOS_TELEFONO_PRUEBA || '').replace(/\D/g, '');
    return Object.fromEntries(TIPOS_DE_ENVIO.map(t => [t.id, {
        modo: ['si', 'prueba'].includes(env[t.interruptor]) ? env[t.interruptor] : 'no',
        botListo: !!env[t.bot],
        // Los ids de los bots no son secretos: el panel los muestra para buscarlos en Kommo
        bots: [t.bot, ...(t.botsExtra || [])].map(v => String(env[v] || '')).filter(Boolean),
        numeroDePrueba: prueba ? `…${prueba.slice(-4)}` : ''
    }]));
};
