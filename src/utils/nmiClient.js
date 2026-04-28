/**
 * NMI Payment Client for BAC Credomatic Integration
 * Handles 3DS authentication and transaction processing.
 */

// Solo la llave pública es necesaria en el cliente para inicializar Gateway.js
// La llave privada y el Processor ID viven únicamente en la Netlify Function (servidor).
const NMI_PUBLIC_KEY = import.meta.env.VITE_NMI_PUBLIC_KEY;

/**
 * Sanitizes a string for EMVCo 3DS2 compliance.
 * The 3DS spec only allows: a-z A-Z 0-9 space . , - /
 * Costa Rican addresses/names often contain tildes (á,é,ñ) and
 * descriptive text (parentheses, #, etc.) that WILL cause:
 *   "Format of one or more elements is invalid according to the specification"
 *
 * @param {string} value - Raw input
 * @param {number} maxLen - Max allowed length per EMVCo spec (default 50)
 * @param {string} defaultVal - Fallback if result is empty
 * @returns {string} Sanitized, spec-compliant string
 */
function sanitize3DS(value, maxLen = 50, defaultVal = 'N/A') {
    if (!value || typeof value !== 'string') return defaultVal;

    // 1. Normalize accents: NFD decomposes, then strip combining diacritical marks
    let clean = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 2. Handle ñ/Ñ explicitly (some environments don't decompose ñ via NFD)
    clean = clean.replace(/ñ/g, 'n').replace(/Ñ/g, 'N');

    // 3. Keep ONLY allowed chars: alphanumeric, space, period, comma, dash, slash
    clean = clean.replace(/[^a-zA-Z0-9 .,\-\/]/g, '');

    // 4. Collapse multiple spaces and trim
    clean = clean.replace(/\s+/g, ' ').trim();

    // 5. Truncate to max allowed length
    clean = clean.slice(0, maxLen);

    return clean || defaultVal;
}

// Module-level ref to the active ThreeDSecureUI instance.
// CRITICAL: Must be unmounted before starting a new one (Gateway.js requirement).
let _activeThreeDSInterface = null;

/**
 * Unmount the active 3DS UI if one exists.
 * Call this before retrying a payment or closing the modal.
 */
export function unmount3DS() {
    if (_activeThreeDSInterface) {
        try {
            _activeThreeDSInterface.unmount();
            console.log('[NMI] Prev 3DS UI unmounted successfully.');
        } catch (e) {
            console.warn('[NMI] Could not unmount prev 3DS UI:', e.message);
        }
        _activeThreeDSInterface = null;
    }
}
/**
 * Initializes Gateway.js
 * @returns {Promise<any>}
 */
export async function initGateway() {
    if (typeof window.Gateway === 'undefined') {
        throw new Error('Gateway.js not loaded. Check index.html');
    }
    
    const keyLen = NMI_PUBLIC_KEY?.length || 0;
    const maskedKey = NMI_PUBLIC_KEY ? 
        `${NMI_PUBLIC_KEY.substring(0, 6)}...${NMI_PUBLIC_KEY.substring(NMI_PUBLIC_KEY.length - 4)}` : 
        'MISSING';
    
    console.log(`[NMI] Initializing Gateway with Key: ${maskedKey} (Length: ${keyLen})`);
    
    // IMPORTANT: checkout_public_ keys are for "Collect Checkout" (hosted forms), 
    // NOT for Gateway.create() which needs a Public Tokenization Key.
    if (NMI_PUBLIC_KEY?.startsWith('checkout_public_')) {
        console.error('[NMI] CRITICAL ERROR: La llave "checkout_public_" es para "Collect Checkout" (formularios alojados de NMI), NO para Gateway.js/3DS.');
        console.error('[NMI] Necesitas una "Public Tokenization Key" de Settings -> Security Keys -> Add New Public Key (Permisos: Tokenization).');
    }
    
    if (!NMI_PUBLIC_KEY || keyLen < 10) {
        console.error('[NMI] CRITICAL ERROR: VITE_NMI_PUBLIC_KEY no está configurada o es demasiado corta.');
    }

    const gateway = window.Gateway.create(NMI_PUBLIC_KEY);
    console.log('[NMI] Gateway initialized:', !!gateway);
    return gateway;
}

/**
 * Starts 3DS Authentication process
 * @param {Object} gateway - Initialized gateway instance
 * @param {Object} paymentInfo - Card and transaction details
 * @returns {Promise<Object>} - 3DS authentication data
 */
export function authenticate3DS(gateway, paymentInfo) {
    return new Promise((resolve, reject) => {
        if (!gateway) {
            reject(new Error('Gateway no está inicializado.'));
            return;
        }

        let threeDS;
        try {
            threeDS = gateway.get3DSecure();
            console.log('[NMI] 3DS module found:', !!threeDS);
        } catch (e) {
            console.error('[NMI] Error getting 3DS module:', e);
            if (e.message.includes('inactive')) {
                reject(new Error('El servicio 3D Secure no está activo en tu cuenta de BAC/NMI. Por favor, solicita a soporte de BAC que active "3D Secure" para tu comercio.'));
                return;
            }
            reject(new Error(`Error al cargar módulo 3DS: ${e.message}`));
            return;
        }

        if (!threeDS) {
            reject(new Error('El módulo 3D Secure no está disponible o no está configurado en tu cuenta de BAC.'));
            return;
        }

        // Wait for the mount point to be available (max 2 seconds)
        const waitForElement = async () => {
            for (let i = 0; i < 20; i++) {
                if (document.getElementById('three-ds-container')) return true;
                await new Promise(r => setTimeout(r, 100));
            }
            return false;
        };

        waitForElement().then(exists => {
            if (!exists) {
                const diag = `Mount point not found. DOM: ${!!document.getElementById('three-ds-container')}`;
                reject(new Error(`Error de Inicialización: ${diag}`));
                return;
            }

            const maskedInfo = { ...paymentInfo, cardNumber: `XXXX-XXXX-XXXX-${paymentInfo.cardNumber?.slice(-4)}` };
            console.log('[NMI] Attempting createUI with masked Info:', maskedInfo);
            
            try {
                // THE FIX: always unmount any previous 3DS UI before starting a new one.
                unmount3DS();

                // Use ONLY the fields documented by NMI for createUI
                // Extra fields (device data, size) may cause createUI to return null
                // Sanitize ALL string fields for EMVCo 3DS2 compliance
                // This prevents "billAddrLine1 format invalid" errors from
                // Costa Rican addresses with tildes, ñ, or >50 chars
                const options = {
                    amount: paymentInfo.amount,
                    currency: paymentInfo.currency,
                    cardNumber: paymentInfo.cardNumber,
                    cardExpMonth: paymentInfo.cardExpMonth,
                    cardExpYear: paymentInfo.cardExpYear,
                    firstName: sanitize3DS(paymentInfo.firstName, 50, 'Cliente'),
                    lastName: sanitize3DS(paymentInfo.lastName, 50, 'BiKitchen'),
                    email: paymentInfo.email,
                    address1: sanitize3DS(paymentInfo.address1, 50, 'San Jose'),
                    city: sanitize3DS(paymentInfo.city, 50, 'San Jose'),
                    state: sanitize3DS(paymentInfo.state, 3, 'SJ'),
                    country: paymentInfo.country,
                    postalCode: sanitize3DS(paymentInfo.postalCode, 16, '10101')
                };
                
                console.log('[NMI] createUI options (minimal):', { ...options, cardNumber: 'XXXX' });

                // The documentation uses createUI(options) and then .start()
                let threeDSInterface = threeDS.createUI(options);
                
                // If fails, retry without currency (CRC may not be supported for 3DS)
                if (!threeDSInterface) {
                    console.warn('[NMI] createUI returned null with CRC. Retrying without currency...');
                    delete options.currency;
                    threeDSInterface = threeDS.createUI(options);
                }
                
                // If still null, try with USD
                if (!threeDSInterface) {
                    console.warn('[NMI] createUI still null. Retrying with USD...');
                    options.currency = 'USD';
                    threeDSInterface = threeDS.createUI(options);
                }

                // Last resort: try with absolute minimum (just card + amount)
                if (!threeDSInterface) {
                    console.warn('[NMI] createUI still null. Trying absolute minimum options...');
                    threeDSInterface = threeDS.createUI({
                        amount: paymentInfo.amount,
                        cardNumber: paymentInfo.cardNumber,
                        cardExpMonth: paymentInfo.cardExpMonth,
                        cardExpYear: paymentInfo.cardExpYear
                    });
                }

                if (!threeDSInterface) {
                    // 3DS UI not available — this likely means Payer Authentication
                    // isn't enabled on the BAC/NMI account. Fall back to payment
                    // without 3DS instead of blocking the customer.
                    const keyLen = NMI_PUBLIC_KEY?.length || 0;
                    console.warn(`[NMI] createUI returned null (Key Length: ${keyLen}). 3DS no disponible — procesando pago sin autenticación 3DS.`);
                    resolve({
                        cavv: '',
                        xid: '',
                        eci: '07', // ECI 07 = non-3DS ecommerce
                        threeDsVersion: '',
                        cardHolderAuth: '',
                        directoryServerId: '',
                        _fallback: true // internal flag
                    });
                    return;
                }

                // Store ref so we can unmount later
                _activeThreeDSInterface = threeDSInterface;

                // Safety: 3-minute overall timeout for the bank popup.
                // If the bank never fires 'complete' or 'failure', we don't hang forever.
                const THREE_DS_TIMEOUT = 3 * 60 * 1000;
                const timeoutHandle = setTimeout(() => {
                    console.error('[NMI] 3DS timed out after 3 minutes.');
                    reject(new Error('La verificación 3D Secure tardó demasiado. Por favor intenta de nuevo.'));
                }, THREE_DS_TIMEOUT);

                // Event listeners
                threeDSInterface.on('complete', (data) => {
                    clearTimeout(timeoutHandle);
                    try { threeDSInterface.unmount(); } catch (e) { } // Ensure UI is destroyed
                    _activeThreeDSInterface = null; // Clear ref — no longer needed
                    console.log('[NMI] 3DS Complete:', data);
                    resolve(data);
                });

                threeDSInterface.on('failure', (error) => {
                    clearTimeout(timeoutHandle);
                    try { threeDSInterface.unmount(); } catch (e) { }
                    _activeThreeDSInterface = null;
                    console.error('[NMI] 3DS Failure:', error);
                    reject(new Error('La autenticación 3D Secure fue rechazada o cancelada.'));
                });

                threeDSInterface.on('error', (error) => {
                    clearTimeout(timeoutHandle);
                    try { threeDSInterface.unmount(); } catch (e) { }
                    _activeThreeDSInterface = null;
                    console.error('[NMI] 3DS Error:', error);
                    reject(new Error(`Error técnico en 3DS: ${error?.message || 'Error desconocido'}`));
                });

                // Start the process (mount to our container)
                console.log('[NMI] Starting 3DS UI on #three-ds-container');
                threeDSInterface.start('#three-ds-container');

            } catch (err) {
                console.error('[NMI] 3DS Exception:', err);
                reject(new Error(`Excepción en 3DS: ${err.message}`));
            }
        });
    });
}

/**
 * Process the final transaction via the Netlify serverless proxy.
 * This avoids CORS issues by routing the NMI API call through our own server.
 * The private API key lives only in environment variables, never in the browser.
 * @param {Object} transactionData - Summary of transaction including 3DS info
 * @returns {Promise<Object>} - Payment result
 */
export async function processTransaction(transactionData) {
    const payload = {
        amount: transactionData.amount,
        currency: 'CRC',

        // Card Info (sensitive - only sent server-side from here)
        ccnumber: transactionData.ccnumber,
        ccexp: transactionData.ccexp,
        cvv: transactionData.cvv,

        // 3DS Data from Gateway.js
        cavv: transactionData.cavv || '',
        xid: transactionData.xid || '',
        eci: transactionData.eci || '',
        threeDsVersion: transactionData.threeDsVersion || transactionData.three_ds_version || '2.2.0',
        cardHolderAuth: transactionData.cardHolderAuth || '',
        directory_server_id: transactionData.directoryServerId || transactionData.directory_server_id || transactionData.dsTransactionId || transactionData.ds_transaction_id || '',

        // Billing — sanitized for EMVCo 3DS2 compliance
        firstName: sanitize3DS(transactionData.first_name || transactionData.firstName, 50, 'Cliente'),
        lastName: sanitize3DS(transactionData.last_name || transactionData.lastName, 50, 'BiKitchen'),
        email: transactionData.email || '',
        address1: sanitize3DS(transactionData.address1, 50, 'San Jose'),
        city: sanitize3DS(transactionData.city, 50, 'San Jose'),
        state: sanitize3DS(transactionData.state, 3, 'SJ'),
        zip: sanitize3DS(transactionData.zip, 16, '10101'),

        // Order
        orderid: transactionData.orderid || '',
    };

    console.log('[NMI] Enviando cargo a través del proxy serverless...', {
        amount: payload.amount,
        eci: payload.eci,
        orderid: payload.orderid,
    });

    const response = await fetch('/.netlify/functions/nmi-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        console.error('[NMI] Error del proxy:', response.status, errBody);
        // Include status code in the message so NMIPaymentModal can detect 502/504
        throw new Error(`Error del servidor al procesar el pago (${response.status})`);
    }

    const result = await response.json();
    console.log('[NMI] Resultado del cargo:', result);
    return result;
}

export default {
    initGateway,
    authenticate3DS,
    unmount3DS,
    processTransaction
};

// BUILD: 20260328-203933
