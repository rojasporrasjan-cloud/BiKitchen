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
const NMI_PRIVATE_KEY = process.env.VITE_NMI_PRIVATE_KEY;
const NMI_PROCESSOR_ID = process.env.VITE_NMI_PROCESSOR_ID;
const FN_VERSION = 'v4-with3ds-20260328'; // Ensure version matches deployed state

// Netlify's default timeout is 10s. We set an internal timeout of 8.5s 
// to ensure we can return a controlled JSON response before being killed.
const INTERNAL_TIMEOUT = 8500; 

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

        // Billing
        billing_firstname: firstName || 'Cliente',
        billing_lastname: lastName || 'BiKitchen',
        billing_email: email || '',
        billing_address1: address1 || 'San Jose',
        billing_city: city || 'San Jose',
        billing_state: state || 'SJ',
        billing_zip: zip || '10101',
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
