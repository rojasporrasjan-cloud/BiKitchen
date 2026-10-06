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
 */

export const COLECCION_ENVIOS = 'envios_kommo';

/** Los envíos automáticos, con su interruptor y su bot en Netlify. */
export const TIPOS_DE_ENVIO = [
    {
        id: 'cambios', label: 'Menú y cambios de la semana',
        cuando: 'Miércoles 8 a. m. — a los que reciben el sábado o el lunes',
        interruptor: 'CAMBIOS_ENVIO_AUTOMATICO', bot: 'KOMMO_BOT_CAMBIOS'
    },
    {
        id: 'renovacion', label: 'Renovación del pack',
        cuando: 'Lunes, miércoles y sábado 10 a. m. — el día de su última entrega',
        interruptor: 'RENOVACION_AUTOMATICA', bot: 'KOMMO_BOT_RENOVACION'
    },
    {
        id: 'recordatorio-pago', label: 'Recordatorio de pago',
        cuando: 'Todos los días 10 a. m. — sin pagar y con entrega en los próximos 3 días',
        interruptor: 'RECORDATORIO_PAGO_AUTOMATICO', bot: 'KOMMO_BOT_RECORDATORIO_PAGO'
    },
    {
        id: 'pago-recibido', label: 'Pago recibido',
        cuando: 'Cada 10 minutos — apenas se confirma el pago en el panel o con tarjeta',
        interruptor: 'PAGO_RECIBIDO_AUTOMATICO', bot: 'KOMMO_BOT_PAGO_RECIBIDO'
    },
    // Los avisos alrededor de la entrega (avisosDeEntrega.js, 4 oct 2026)
    {
        id: 'hoy-te-llega', label: 'Hoy te llega',
        cuando: 'Lunes, miércoles y sábado 7 a. m. — a todos los que reciben ese día',
        interruptor: 'HOY_TE_LLEGA_AUTOMATICO', bot: 'KOMMO_BOT_HOY_TE_LLEGA'
    },
    {
        id: 'guia-congelado', label: 'Guía de congelado',
        cuando: 'Lunes, miércoles y sábado 3 p. m. — la primera entrega de cada pedido',
        interruptor: 'GUIA_CONGELADO_AUTOMATICO', bot: 'KOMMO_BOT_GUIA_CONGELADO'
    },
    {
        id: 'que-tal', label: '¿Qué tal todo?',
        cuando: 'Domingo, martes y jueves 11 a. m. — clientes nuevos, el día después de su primera entrega',
        interruptor: 'QUE_TAL_AUTOMATICO', bot: 'KOMMO_BOT_QUE_TAL'
    },
    {
        id: 'volver-a-invitar', label: 'Volver a invitar',
        cuando: 'Martes 10 a. m. — terminaron hace 2 a 3 semanas y no volvieron a pedir (Marketing)',
        interruptor: 'VOLVER_A_INVITAR_AUTOMATICO', bot: 'KOMMO_BOT_VOLVER_A_INVITAR'
    },
    // Fase 3 de docs/PLAN_DIFUSIONES_AUTOMATICAS.md (6 oct 2026). Un interruptor
    // para los tres cierres; cada día tiene su bot (KOMMO_BOT_CIERRE_SABADO y
    // KOMMO_BOT_CIERRE_LUNES además de este). Sin el bot de ese día, ese no sale.
    {
        id: 'cierre-pedidos', label: 'Cierre de pedidos',
        cuando: 'Lunes, jueves y viernes 2 p. m. — clientes de ese día de reparto sin entrega esta vez (Marketing)',
        interruptor: 'CIERRE_PEDIDOS_AUTOMATICO', bot: 'KOMMO_BOT_CIERRE_MIERCOLES'
    }
];

const persona = (d = {}) => ({
    nombre: String(d.nombre || ''),
    telefono: String(d.telefono || ''),
    fecha: String(d.suscripcion?.proxima || d.fecha || ''),
    muestra: !!d.muestra
});

/** La entrada que se guarda. Sin `undefined`: Firestore los rechaza. */
export const entradaDeRegistro = ({ tipo, modo, estado, ahora = new Date(), enviados = [], lesHabriaLlegado = [] }) => ({
    tipo: String(tipo || ''),
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
        numeroDePrueba: prueba ? `…${prueba.slice(-4)}` : ''
    }]));
};
