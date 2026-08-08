/**
 * Netlify Serverless Function: nmi-charge
 *
 * Acts as a secure server-side proxy for NMI's Direct Post API.
 * This is necessary because:
 *  1. Calling NMI's API directly from the browser is blocked by CORS.
 *  2. This keeps the private API key secure (not exposed to the browser).
 *
 * Endpoint: POST /.netlify/functions/nmi-charge
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let db;
try {
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp() : getApp();
    db = getFirestore(app);
} catch (err) {
    console.warn('[NMI] Firebase init:', err.message);
}

const NMI_API_URL = 'https://secure.networkmerchants.com/api/transact.php';
// SECURITY: These use non-VITE_ prefix so they are NEVER bundled into client code.
// The VITE_ prefix would expose them in the browser bundle.
// These must be set in Netlify environment: NMI_PRIVATE_KEY, NMI_PROCESSOR_ID
// NO fallbacks to VITE_ to prevent accidental exposure to client bundle
const NMI_PRIVATE_KEY = process.env.NMI_PRIVATE_KEY;
const NMI_PROCESSOR_ID = process.env.NMI_PROCESSOR_ID;

// Validar que las llaves están configuradas
if (!NMI_PRIVATE_KEY || !NMI_PROCESSOR_ID) {
    console.error('[NMI] CRITICAL: NMI_PRIVATE_KEY or NMI_PROCESSOR_ID not set in Netlify environment variables');
}
const FN_VERSION = 'v5-idempotent-20260429';

/**
 * FIX #2: Verifica si ya procesamos este requestId
 */
async function checkIdempotency(requestId) {
    try {
        if (!db) {
            console.warn('[NMI] Idempotency: Firebase not initialized');
            return null;
        }

        const doc = await db.collection('nmi_requests').doc(requestId).get();
        if (doc.exists) {
            const prevResult = doc.data();
            console.log(`[NMI] Retornando resultado anterior para ${requestId}:`, prevResult.result);
            return prevResult.result;
        }
    } catch (err) {
        console.warn('[NMI] Error verificando idempotencia:', err);
    }
    return null;
}

/**
 * FIX #2: Guarda resultado de transacción para deduplicación
 */
async function saveIdempotencyRecord(requestId, result, orderid) {
    try {
        if (!db) {
            console.warn('[NMI] Idempotency save: Firebase not initialized');
            return;
        }

        await db.collection('nmi_requests').doc(requestId).set({
            requestId,
            orderid,
            result,
            timestamp: new Date().toISOString(),
            ttl: Date.now() + (24 * 60 * 60 * 1000)
        });
    } catch (err) {
        console.warn('[NMI] Error guardando idempotencia:', err);
    }
}

/**
 * Server-side EMVCo 3DS2 sanitization (second line of defense).
 * Strips accents, removes illegal chars, truncates to max length.
 */
function sanitize3DS(value, maxLen = 50, defaultVal = 'N/A') {
    if (!value || typeof value !== 'string') return defaultVal;
    let clean = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    clean = clean.replace(/ñ/g, 'n').replace(/Ñ/g, 'N');
    clean = clean.replace(/[^a-zA-Z0-9 .,\-\/]/g, '');
    clean = clean.replace(/\s+/g, ' ').trim();
    clean = clean.slice(0, maxLen);
    return clean || defaultVal;
}

// Netlify's default timeout is 10s, but we extended it to 26s in netlify.toml.
// We set an internal timeout of 24s to ensure we return a controlled JSON response.
const INTERNAL_TIMEOUT = 24000; 

export const handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' })
        };
    }

    const {
        amount, currency = 'CRC',
        ccnumber, ccexp, cvv,
        // 3DS - accept both naming conventions
        cavv, xid, eci, threeDsVersion, cardHolderAuth,
        directory_server_id,      // snake_case (explicit override)
        directoryServerId,        // camelCase (from Gateway.js spread)
        // Billing
        firstName, lastName, email, address1, city, state, zip,
        // Order
        orderid,
        // FIX #2: requestId para idempotencia
        requestId
    } = body;

    // Resolve directory_server_id from either naming convention
    const resolvedDirectoryServerId = directoryServerId || directory_server_id || '';

    if (!amount || !ccnumber || !ccexp || !cvv) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required payment fields' })
        };
    }

    // Validar rango de amount en CRC (colones costarricenses)
    // Mínimo: ₡500 | Máximo: ₡2,000,000 (aprox $4,000 USD — cubre cualquier pedido real)
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 500 || parsedAmount > 2000000) {
        console.warn(`[NMI] Amount fuera de rango CRC: ${amount}`);
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid amount (must be between ₡500 and ₡2,000,000 CRC)' })
        };
    }
    // Asegurar máximo 2 decimales
    const safeAmount = Math.round(parsedAmount * 100) / 100;

    // FIX #2: Verificar idempotencia antes de procesar
    if (requestId) {
        const cachedResult = await checkIdempotency(requestId);
        if (cachedResult) {
            console.log(`[NMI] Retornando resultado cacheado para ${requestId}`);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...cachedResult, _cached: true, _fn_version: FN_VERSION })
            };
        }
    }

    // FIX #4: Validar que el amount coincide con el total del pedido en Firestore
    if (db && orderid) {
        try {
            const orderSnap = await db.collection('pedidos').where('numeroOrden', '==', orderid).limit(1).get();
            if (!orderSnap.empty) {
                const storedTotal = parseFloat(orderSnap.docs[0].data().total || 0);
                if (Math.abs(safeAmount - storedTotal) > 1) {
                    console.error(`[NMI] Amount mismatch: sent=${safeAmount}, stored=${storedTotal}, orderid=${orderid}`);
                    return {
                        statusCode: 400,
                        body: JSON.stringify({ error: 'Amount does not match order total' })
                    };
                }
            }
            // Si el pedido no se encuentra aún, se permite continuar (edge case de timing)
        } catch (err) {
            console.warn('[NMI] Error validando amount contra Firestore:', err.message);
            // Permitir continuar en error de DB para no bloquear pagos legítimos
        }
    }

    // Log exactly what 3DS data we received (no card data)
    console.log('[NMI Function] 3DS data received:', JSON.stringify({
        cavv: cavv ? `${cavv.substring(0, 6)}...` : 'MISSING',
        xid: xid || 'null',
        eci: eci || 'MISSING',
        threeDsVersion: threeDsVersion || 'MISSING',
        cardHolderAuth: cardHolderAuth || 'MISSING',
        directoryServerId: resolvedDirectoryServerId || 'MISSING',
    }));

    const params = new URLSearchParams({
        security_key: NMI_PRIVATE_KEY,
        type: 'sale',
        amount: safeAmount, // FIX 6: usar safeAmount validado
        currency: currency,
        processor_id: NMI_PROCESSOR_ID,

        // Card Info
        ccnumber: ccnumber,
        ccexp: ccexp,
        cvv: cvv,

        // 3DS validation requires these params to pass gateway rules.
        // Even if the processor fails CAVV validation afterwards (returning response=2),
        // the bank still charges the card, and NMIPaymentModal.jsx correctly detects
        // the presence of 'authcode' to treat it as a success.
        cardholder_auth: cardHolderAuth || (cavv ? 'verified' : ''),
        cavv: cavv || '',
        xid: xid || '',
        eci: eci || '',
        three_ds_version: threeDsVersion || '2.2.0',
        directory_server_id: resolvedDirectoryServerId,

        // Billing — sanitized for EMVCo 3DS2 (server-side defense)
        billing_firstname: sanitize3DS(firstName, 50, 'Cliente'),
        billing_lastname: sanitize3DS(lastName, 50, 'BiKitchen'),
        billing_email: email || '',
        billing_address1: sanitize3DS(address1, 50, 'San Jose'),
        billing_city: sanitize3DS(city, 50, 'San Jose'),
        billing_state: sanitize3DS(state, 3, 'SJ'),
        billing_zip: sanitize3DS(zip, 16, '10101'),
        billing_country: 'CR',

        // Order
        orderid: orderid || '',
        order_description: 'BiKitchen Food - Pedido ' + (orderid || ''),
    });

    // Log key presence to help debug credential issues
    console.log(`[NMI Function] ${FN_VERSION} | Order: ${orderid} | Amount: ${amount} | Key present: ${!!NMI_PRIVATE_KEY} (len:${NMI_PRIVATE_KEY?.length||0}) | ProcID present: ${!!NMI_PROCESSOR_ID}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), INTERNAL_TIMEOUT);

    try {
        const nmiResponse = await fetch(NMI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const responseText = await nmiResponse.text();
        console.log(`[NMI Function] Raw response for Order ${orderid}:`, responseText);

        // Parse the response (key=value&key=value format)
        const result = Object.fromEntries(new URLSearchParams(responseText));
        
        // Log summarized result for better traceability
        console.log(`[NMI Function] Result for Order ${orderid}: Status=${result.response}, Text=${result.responsetext}, TxID=${result.transactionid || 'N/A'}`);

        // FIX #2: Guardar para próximas veces (idempotencia)
        if (requestId) {
            await saveIdempotencyRecord(requestId, result, orderid);
        }

        // Actualizar estado del pedido en Firestore con Admin SDK (sin restricciones de permisos)
        if (db && orderid) {
            try {
                const snapshot = await db.collection('pedidos').where('numeroOrden', '==', orderid).limit(1).get();
                if (!snapshot.empty) {
                    const orderRef = snapshot.docs[0].ref;
                    const orderData = snapshot.docs[0].data();
                    const now = new Date();

                    // --- Ground truth: authcode ---
                    // BAC/NMI puede devolver response=2 "Authentication Failed" en la validación
                    // 3DS DESPUÉS de que el banco ya autorizó y cobró la tarjeta. Si viene
                    // authcode, el cargo se hizo. Es la misma regla que aplica NMIPaymentModal.jsx:
                    // sin esto el servidor marca como fallido un pedido que SÍ se cobró, y solo se
                    // corrige si el navegador del cliente sigue abierto para arreglarlo.
                    const bankApprovedByAuthcode = !!(result.authcode && String(result.authcode).trim());
                    const isApproved = result.response === '1' || bankApprovedByAuthcode;

                    if (isApproved) {
                        // Pago aprobado
                        const pointsToAward = orderData.pointsToAward || Math.floor((orderData.total || 0) * 0.02);
                        await orderRef.update({
                            status: 'confirmed',
                            paymentStatus: 'paid',
                            paymentConfirmed: true,
                            paymentProvider: 'Tarjeta',
                            transactionId: result.transactionid || 'NMI',
                            pointsAwarded: true,
                            pointsAwardedAt: now.toISOString(),
                            paidAt: now,
                            updatedAt: now
                        });

                        // Otorgar puntos de fidelidad (nunca dos veces por el mismo pedido)
                        if (orderData.correo && pointsToAward > 0 && !orderData.pointsAwarded) {
                            try {
                                const loyaltyRef = db.collection('loyalty').doc(orderData.correo.toLowerCase());
                                const loyaltySnap = await loyaltyRef.get();
                                if (loyaltySnap.exists) {
                                    await loyaltyRef.update({
                                        points: FieldValue.increment(pointsToAward),
                                        totalEarned: FieldValue.increment(pointsToAward),
                                        lastUpdated: now.toISOString()
                                    });
                                } else {
                                    await loyaltyRef.set({
                                        email: orderData.correo.toLowerCase(),
                                        points: pointsToAward,
                                        totalEarned: pointsToAward,
                                        totalRedeemed: 0,
                                        createdAt: now.toISOString(),
                                        lastUpdated: now.toISOString()
                                    });
                                }
                                console.log(`[NMI Function] 🎁 ${pointsToAward} puntos otorgados a ${orderData.correo}`);
                            } catch (loyaltyError) {
                                console.error(`[NMI Function] Error otorgando puntos:`, loyaltyError.message);
                            }
                        }
                        console.log(`[NMI Function] ✅ Orden ${orderid} confirmada en Firestore${result.response !== '1' ? ` (aprobada por authcode, response=${result.response})` : ''}`);
                    } else if (result.response === '2' || result.response === '3') {
                        // Pago rechazado/fallido — solo actualizar si no está ya confirmado
                        if (orderData.status !== 'confirmed') {
                            await orderRef.update({
                                status: 'payment_failed',
                                paymentStatus: 'failed',
                                isPaymentError: true,
                                paymentError: result.responsetext || 'Pago rechazado',
                                paymentErrorAt: now,
                                updatedAt: now
                            });
                            console.log(`[NMI Function] ❌ Orden ${orderid} marcada como payment_failed en Firestore`);
                        }
                    }
                } else {
                    console.warn(`[NMI Function] Orden ${orderid} no encontrada en Firestore`);
                }
            } catch (firestoreError) {
                console.error(`[NMI Function] Error actualizando estado en Firestore:`, firestoreError.message);
                // No interrumpir la respuesta de pago por error de Firestore
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...result, _fn_version: FN_VERSION, _key_present: !!NMI_PRIVATE_KEY }),
        };
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            console.error(`[NMI Function] TIMEOUT reached for Order ${orderid} after ${INTERNAL_TIMEOUT}ms`);
            return {
                statusCode: 200, // Return 200 with error property so frontend catches JSON
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response: '3',
                    responsetext: 'TIMEOUT_LIMIT_REACHED',
                    error_type: 'gateway_timeout',
                    message: 'La conexión con el banco tardó demasiado. Por favor verifica si el cargo se realizó antes de reintentar.'
                })
            };
        }

        console.error(`[NMI Function] Network Error for Order ${orderid}:`, error);
        return {
            statusCode: 502,
            body: JSON.stringify({ 
                error: 'Failed to connect to payment gateway',
                details: error.message
            })
        };
    }
};
