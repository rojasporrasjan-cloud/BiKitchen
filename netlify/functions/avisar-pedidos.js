/**
 * Red de seguridad del aviso de pedido a Gina.
 *
 * El checkout manda el correo desde el navegador del cliente. Cuando eso
 * funciona, Gina se entera al instante y esta función no hace nada.
 *
 * El problema es cuando NO funciona: con tarjeta el pago pasa por 3DS, y si el
 * cliente cierra la pestaña o el redirect pierde el contexto, el navegador nunca
 * llega a mandar el correo. El pedido igual queda cobrado —el servidor de NMI lo
 * confirma— pero nadie avisa. Así se perdieron avisos de pedidos ya pagados.
 *
 * Esta función corre cada 3 minutos y recoge lo que se quedó atrás: cualquier
 * pedido reciente sin `emailAdminStatus`, venga de la web, del panel o del
 * importador de WhatsApp. Marca el campo al terminar, así que nunca manda dos
 * veces el mismo aviso.
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { buildAdminTemplateParams } from '../../src/utils/orderEmailFormat.js';

let db;
try {
    const apps = getApps();
    db = getFirestore(apps.length === 0 ? initializeApp() : getApp());
} catch (err) {
    console.error('[AvisarPedidos] No se pudo inicializar Firebase Admin:', err.message);
}

const EMAILJS_API_URL = 'https://api.emailjs.com/api/v1.0/email/send';

// La private key es lo que permite mandar desde un servidor: EmailJS bloquea por
// defecto todo lo que no venga de un navegador.
const EMAILJS_SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = process.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY;
const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;

const DEFAULT_NOTIFICATION_EMAIL = 'ginamaroli@gmail.com';

/** Cuánto hacia atrás mirar. Más de esto ya no es un aviso, es arqueología. */
const VENTANA_HORAS = 24;

/** Tope por corrida, para no vaciar la cuota de EmailJS de un solo golpe. */
const MAX_POR_CORRIDA = 20;

const getRecipients = async () => {
    try {
        const snap = await db.collection('config').doc('notifications').get();
        const email = snap.exists ? snap.data().email : null;
        return (email || DEFAULT_NOTIFICATION_EMAIL)
            .split(',').map(e => e.trim()).filter(Boolean);
    } catch (err) {
        console.warn('[AvisarPedidos] No se pudo leer el destinatario, usando el de siempre:', err.message);
        return [DEFAULT_NOTIFICATION_EMAIL];
    }
};

/**
 * Los pedidos guardan los campos con los nombres de Firestore (zona_envio,
 * costo_envio, fechas_entrega); el armador del correo los espera en camelCase.
 */
/** createdAt puede venir como Timestamp de Firestore o como texto ISO. */
const aFecha = (valor) => {
    if (!valor) return null;
    if (typeof valor.toDate === 'function') return valor.toDate();
    const d = new Date(valor);
    return isNaN(d.getTime()) ? null : d;
};

const aDatosDeCorreo = (id, d) => ({
    orderNumber: d.numeroOrden || id,
    orderDate: aFecha(d.createdAt)?.toLocaleDateString('es-CR'),
    cliente: d.cliente,
    telefono: d.telefono,
    correo: d.correo,
    cedula: d.cedula,
    items: d.items || [],
    subtotal: d.subtotal,
    descuento: d.descuento,
    cupon: d.cupon,
    costoEnvio: d.costo_envio,
    envioPorConfirmar: d.envioPorConfirmar,
    total: d.total,
    zona: d.zona_envio,
    direccion: d.direccion,
    referencias: d.referencias,
    ubicacionFueraCobertura: d.ubicacionFueraCobertura,
    fechasEntrega: d.fechas_entrega,
    metodoPago: d.metodo_pago,
    transactionId: d.transactionId,
    observaciones: d.observaciones
});

const enviarCorreo = async (templateParams) => {
    const res = await fetch(EMAILJS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            service_id: EMAILJS_SERVICE_ID,
            template_id: EMAILJS_TEMPLATE_ID,
            user_id: EMAILJS_PUBLIC_KEY,
            accessToken: EMAILJS_PRIVATE_KEY,
            template_params: templateParams
        })
    });
    if (!res.ok) {
        throw new Error(`EmailJS respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
};

export default async () => {
    if (!db) {
        console.error('[AvisarPedidos] Sin conexión a Firestore, no se puede revisar nada.');
        return new Response('Firestore no disponible', { status: 500 });
    }
    if (!EMAILJS_PRIVATE_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        console.error('[AvisarPedidos] Faltan variables de EmailJS en el entorno.');
        return new Response('EmailJS sin configurar', { status: 500 });
    }

    const desdeDate = new Date(Date.now() - VENTANA_HORAS * 60 * 60 * 1000);

    // `createdAt` no tiene un solo tipo: el checkout de la web lo guarda con
    // serverTimestamp() (Timestamp) y el importador con toISOString() (string).
    // Firestore ordena por tipo, así que un solo rango NUNCA devuelve ambos: si
    // se consultara sólo con string, se perderían justo los pedidos de la web,
    // que son los que esta función existe para rescatar. Por eso van dos
    // consultas y se unen.
    const [porTimestamp, porTexto] = await Promise.all([
        db.collection('pedidos').where('createdAt', '>=', Timestamp.fromDate(desdeDate)).get(),
        db.collection('pedidos').where('createdAt', '>=', desdeDate.toISOString()).get()
    ]);

    const porId = new Map();
    for (const doc of [...porTimestamp.docs, ...porTexto.docs]) porId.set(doc.id, doc);

    // Firestore no sabe consultar "campo que no existe", así que el filtro va acá.
    // Se reintenta también lo que quedó en 'failed': puede haber sido un corte de
    // EmailJS y no un problema del pedido.
    const pendientes = [...porId.values()]
        .filter(doc => {
            const estado = doc.data().emailAdminStatus;
            return !estado || estado === 'failed';
        })
        .slice(0, MAX_POR_CORRIDA);

    if (pendientes.length === 0) {
        return new Response('Sin pedidos pendientes de aviso', { status: 200 });
    }

    const recipients = await getRecipients();
    let enviados = 0;
    let fallidos = 0;

    for (const doc of pendientes) {
        const datos = aDatosDeCorreo(doc.id, doc.data());
        const params = buildAdminTemplateParams(datos);

        try {
            for (const to_email of recipients) {
                await enviarCorreo({ ...params, to_email });
            }
            await doc.ref.update({
                emailAdminStatus: 'sent',
                emailAdminError: null,
                emailAdminVia: 'netlify-scheduled',
                emailCheckedAt: new Date().toISOString()
            });
            enviados++;
        } catch (err) {
            console.error(`[AvisarPedidos] Falló el aviso de ${datos.orderNumber}:`, err.message);
            // Queda en 'failed' a propósito: la próxima corrida lo reintenta.
            await doc.ref.update({
                emailAdminStatus: 'failed',
                emailAdminError: err.message,
                emailCheckedAt: new Date().toISOString()
            }).catch(() => { });
            fallidos++;
        }
    }

    const resumen = `Avisos enviados: ${enviados}, fallidos: ${fallidos}`;
    console.log(`[AvisarPedidos] ${resumen}`);
    return new Response(resumen, { status: 200 });
};

export const config = {
    schedule: '*/3 * * * *'
};
