/**
 * NMI Payment Client for BAC Credomatic Integration
 * Handles 3DS authentication and transaction processing.
 */

// Solo la llave pública es necesaria en el cliente para inicializar Gateway.js
// La llave privada y el Processor ID viven únicamente en la Netlify Function (servidor).
const NMI_PUBLIC_KEY = import.meta.env.VITE_NMI_PUBLIC_KEY;

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
                // Add Device Data for better reliability (as per NMI docs)
                let javaEnabled = "false";
                try { javaEnabled = String(window.navigator.javaEnabled()); } catch (e) { }

                const deviceData = {
                    browserUserAgent: window.navigator.userAgent,
                    browserAcceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    browserJavaEnabled: javaEnabled,
                    browserJavascriptEnabled: "true",
                    browserLanguage: window.navigator.language,
                    browserColorDepth: String(window.screen.colorDepth),
                    browserScreenHeight: String(window.screen.height),
                    browserScreenWidth: String(window.screen.width),
                    browserTimeZone: String(new Date().getTimezoneOffset()),
                    deviceChannel: "Browser"
                };

                const options = {
                    ...paymentInfo,
                    ...deviceData,
                    size: '390x400' // Better fit for mobile devices (~375-414px)
                };

                // THE FIX: always unmount any previous 3DS UI before starting a new one.
                unmount3DS();

                // The documentation uses createUI(options) and then .start()
                const threeDSInterface = threeDS.createUI(options);

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

        // Billing
        firstName: transactionData.first_name || transactionData.firstName || 'Cliente',
        lastName: transactionData.last_name || transactionData.lastName || 'BiKitchen',
        email: transactionData.email || '',
        address1: transactionData.address1 || 'San Jose',
        city: transactionData.city || 'San Jose',
        state: transactionData.state || 'SJ',
        zip: transactionData.zip || '10101',

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
