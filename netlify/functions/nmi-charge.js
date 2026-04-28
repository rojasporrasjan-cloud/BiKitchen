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

const NMI_API_URL = 'https://secure.networkmerchants.com/api/transact.php';
// SECURITY: These use non-VITE_ prefix so they are NEVER bundled into client code.
// The VITE_ prefix would expose them in the browser bundle.
// Make sure Netlify dashboard env vars match: NMI_PRIVATE_KEY, NMI_PROCESSOR_ID
const NMI_PRIVATE_KEY = process.env.NMI_PRIVATE_KEY || process.env.VITE_NMI_PRIVATE_KEY;
const NMI_PROCESSOR_ID = process.env.NMI_PROCESSOR_ID || process.env.VITE_NMI_PROCESSOR_ID;
const FN_VERSION = 'v5-sanitized-20260427';

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

exports.handler = async (event) => {
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
        orderid
    } = body;

    // Resolve directory_server_id from either naming convention
    const resolvedDirectoryServerId = directoryServerId || directory_server_id || '';

    if (!amount || !ccnumber || !ccexp || !cvv) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required payment fields' })
        };
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
        amount: amount,
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
