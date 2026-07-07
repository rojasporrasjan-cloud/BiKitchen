/**
 * NMI Payment Client for BAC Credomatic Integration
 * Handles 3DS authentication and transaction processing.
 */

// Solo la llave pública es necesaria en el cliente para inicializar Gateway.js
// La llave privada y el Processor ID viven únicamente en la Netlify Function (servidor).
const NMI_PUBLIC_KEY = import.meta.env.VITE_NMI_PUBLIC_KEY;

// ========== FIX #1: Validaciones Luhn, Expiración, CVV ==========

export function isValidCardNumber(cardNumber) {
    const num = cardNumber.replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(num)) return false;

    let sum = 0;
    let isEven = false;
    for (let i = num.length - 1; i >= 0; i--) {
        let digit = parseInt(num[i], 10);
        if (isEven) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
    }
    return sum % 10 === 0;
}

export function isValidExpiration(expMonth, expYear) {
    if (!expMonth || !expYear) return false;
    const month = parseInt(expMonth, 10);
    const year = parseInt(expYear, 10);

    if (month < 1 || month > 12) return false;

    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;

    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    const currentFullYear = now.getFullYear();

    if (fullYear < currentFullYear) return false;
    if (fullYear === currentFullYear && month < currentMonth) return false;

    return true;
}

export function isValidCVV(cvv) {
    return /^\d{3,4}$/.test(cvv.replace(/\s/g, ''));
}

// ========== FIX #3 & #6: Audit Logging ==========

function auditLog(step, data) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        step,
        data: data || {}
    };
    console.log('[NMI Audit]', JSON.stringify(logEntry));
}

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

// Module-level ref to the pre-initialized 3DS instance
let _preInitializedThreeDS = null;

/**
 * Pre-initializes 3D Secure to give Cardinal Commerce enough time (3-4s)
 * to perform "device profiling" in the background before the user pays.
 * @param {Object} gateway - Initialized gateway instance
 */
export function preInit3DS(gateway) {
    if (!gateway) return;
    try {
        _preInitializedThreeDS = gateway.get3DSecure();
        console.log('[NMI] 3DS pre-initialized successfully.');
    } catch (e) {
        console.warn('[NMI] 3DS pre-initialization failed:', e.message);
        _preInitializedThreeDS = null;
    }
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
            threeDS = _preInitializedThreeDS || gateway.get3DSecure();
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
                    // FIX #2: Si el usuario tiene AdBlock, Gateway.js no lanza error pero createUI puede retornar null
                    // o fallar silenciosamente. Verificamos si _preInitializedThreeDS existe pero createUI falló.
                    if (_preInitializedThreeDS) {
                         reject(new Error('⚠️ Error de Seguridad del Banco\n\nTu navegador bloqueó la ventana de verificación de tu tarjeta. Esto suele pasar por:\n\n1. Tienes un AdBlocker encendido (apágalo para esta página).\n2. Estás usando el navegador Brave (apaga los escudos).\n3. Estás usando Safari en iPhone (intenta con Chrome u otro navegador).\n\n👉 Soluciónalo recargando la página sin bloqueadores, o elige "Transferencia / SINPE" como método de pago.'));
                         return;
                    }
                    
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
                    unmount3DS();
                    reject(new Error('La verificación 3D Secure tardó demasiado. Por favor intenta de nuevo.'));
                }, THREE_DS_TIMEOUT);

                // Event listeners
                threeDSInterface.on('complete', (data) => {
                    clearTimeout(timeoutHandle);
                    try { threeDSInterface.unmount(); } catch (e) { } // Ensure UI is destroyed
                    _activeThreeDSInterface = null; // Clear ref — no longer needed
                    console.log('[NMI] 3DS Complete:', data);
                    // FIX #1: Normalize field names (Gateway.js may return snake_case or camelCase)
                    const normalized = {
                        ...data,
                        cardHolderAuth: data.cardHolderAuth || data.cardholder_auth || '',
                        threeDsVersion: data.threeDsVersion || data.three_ds_version || '',
                        directoryServerId: data.directoryServerId || data.directory_server_id || data.dsTransactionId || '',
                    };
                    console.log('[NMI] 3DS Complete (normalized):', normalized);
                    resolve(normalized);
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
    const orderId = transactionData.orderid || 'unknown';

    // FIX #2: Generar requestId único para idempotencia
    const requestId = transactionData.requestId || `${orderId}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

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
        orderid: orderId,

        // FIX #2: Para idempotencia
        requestId,
    };

    auditLog('transaction_start', {
        orderId,
        amount: payload.amount,
        requestId: requestId.substring(0, 16) + '...'
    });

    // FIX #4: Timeout de 35 segundos con AbortSignal
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
        console.log('[NMI] Enviando cargo a través del proxy serverless...', {
            amount: payload.amount,
            eci: payload.eci,
            orderid: payload.orderid,
        });

        const response = await fetch('/.netlify/functions/nmi-charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            console.error('[NMI] Error del proxy:', response.status, errBody);
            throw new Error(`Error del servidor al procesar el pago (${response.status})`);
        }

        const result = await response.json();

        auditLog('transaction_response', {
            orderId,
            response: result.response,
            authcode: !!result.authcode,
            cached: result._cached
        });

        console.log('[NMI] Resultado del cargo:', result);
        return result;
    } catch (error) {
        clearTimeout(timeoutId);

        // FIX #4: Si timeout, intentar polling
        if (error.name === 'AbortError') {
            console.warn('[NMI] Cliente timeout (35s). Iniciando polling...');
            auditLog('client_timeout', { orderId });

            const pollResult = await pollForTransaction(orderId);
            auditLog('polling_completed', {
                orderId,
                response: pollResult.response,
                polled: true
            });
            return pollResult;
        }

        auditLog('transaction_error', {
            orderId,
            error: error.message
        });
        throw error;
    }
}

// ========== FIX #4: Polling para confirmar estado en timeout ==========

export async function pollForTransaction(orderId, maxAttempts = 6, interval = 2000) {
    console.log(`[NMI] Iniciando polling para orden ${orderId}...`);
    auditLog('polling_start', { orderId, maxAttempts });

    for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, interval));

        try {
            const response = await fetch('/.netlify/functions/nmi-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const result = await response.json();

            if (result.response === '1') {
                auditLog('polling_success', {
                    orderId,
                    attempt: i + 1,
                    status: 'APPROVED'
                });
                console.log(`[NMI] Polling exitoso en intento ${i + 1}: APROBADO`);
                return {
                    response: '1',
                    responsetext: 'APPROVED',
                    authcode: result.authcode || 'POLLED',
                    _polled: true,
                    _polled_attempt: i + 1
                };
            } else if (result.response === '2') {
                auditLog('polling_declined', {
                    orderId,
                    attempt: i + 1
                });
                console.log(`[NMI] Polling exitoso en intento ${i + 1}: RECHAZADO`);
                return result;
            }
        } catch (error) {
            auditLog('polling_error', {
                orderId,
                attempt: i + 1,
                error: error.message
            });
            console.warn(`[NMI] Intento de polling ${i + 1} falló:`, error.message);
        }
    }

    auditLog('polling_timeout', { orderId, maxAttempts });
    return {
        response: '3',
        responsetext: 'TIMEOUT_AFTER_POLLING',
        error_type: 'polling_timeout',
        _polled: true,
        _polled_maxed: true
    };
}

export default {
    initGateway,
    authenticate3DS,
    unmount3DS,
    processTransaction,
    pollForTransaction,
    isValidCardNumber,
    isValidExpiration,
    isValidCVV,
    auditLog
};

// BUILD: 20260328-203933
