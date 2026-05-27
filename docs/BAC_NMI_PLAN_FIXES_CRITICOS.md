# 🚨 PLAN DE FIXES CRÍTICOS - BAC/NMI

**Prioridad:** ROJO (Implementar AHORA)  
**Tiempo estimado:** 3-4 horas  
**Impacto:** Previene 80% de problemas recurrentes

---

## RESUMEN DE FIXES

| # | Fix | Criticidad | Tiempo | Archivos |
|---|-----|-----------|--------|----------|
| 1 | Luhn Validation | 🔴 ROJO | 30min | nmiClient.js |
| 2 | Idempotencia Server | 🔴 ROJO | 1h | nmi-charge.js, nmiClient.js |
| 3 | Variables de Entorno | 🔴 ROJO | 15min | .env, .gitignore, netlify.toml |
| 4 | Timeout Handling Mejorado | 🔴 ROJO | 45min | nmi-charge.js, NMIPaymentModal.jsx |
| 5 | Validar AuthData | 🟡 AMARILLO | 30min | nmiClient.js |
| 6 | Logging Exhaustivo | 🟡 AMARILLO | 45min | Toda la cadena |
| 7 | Deshabilitar Botón | 🟡 AMARILLO | 15min | NMIPaymentModal.jsx |

---

## FIX #1: LUHN VALIDATION ✅

**Problema:** Cualquiera puede entrar tarjeta fake sin validación

**Solución:**

En `src/utils/nmiClient.js`, agregar:

```javascript
/**
 * Valida número de tarjeta usando algoritmo de Luhn
 * Previene números ficticios sin conectar a banco
 */
export function isValidCardNumber(cardNumber) {
    // Remover espacios
    const num = cardNumber.replace(/\s/g, '');
    
    // Validar que sea solo dígitos
    if (!/^\d{13,19}$/.test(num)) return false;
    
    // Algoritmo de Luhn
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

/**
 * Valida fecha de expiración
 */
export function isValidExpiration(expMonth, expYear) {
    if (!/^\d{2}$/.test(expMonth) || !/^\d{2}$/.test(expYear)) {
        return false;
    }
    
    const month = parseInt(expMonth, 10);
    if (month < 1 || month > 12) return false;
    
    // Convertir YY a YYYY (24 → 2024)
    const year = 2000 + parseInt(expYear, 10);
    const now = new Date();
    const expiryDate = new Date(year, month, 0);  // Último día del mes
    
    return expiryDate > now;
}

/**
 * Valida CVV
 */
export function isValidCVV(cvv) {
    return /^\d{3,4}$/.test(cvv);
}
```

En `NMIPaymentModal.jsx` línea 115, antes de `authenticate3DS()`:

```javascript
const handleSubmitCard = async (e) => {
    e.preventDefault();
    if (!gateway) return;
    
    setLoading(true);
    setError(null);
    
    // ✅ AGREGAR VALIDACIONES
    if (!isValidCardNumber(cardData.number)) {
        setError('Número de tarjeta inválido');
        setLoading(false);
        return;
    }
    
    const [expMonth, expYear] = cardData.exp.split('/');
    if (!isValidExpiration(expMonth, expYear)) {
        setError('Fecha de expiración inválida o vencida');
        setLoading(false);
        return;
    }
    
    if (!isValidCVV(cardData.cvv)) {
        setError('CVV debe tener 3 o 4 dígitos');
        setLoading(false);
        return;
    }
    
    // ... continuar con authenticate3DS
};
```

**Importar en NMIPaymentModal.jsx:**
```javascript
import { 
    initGateway, 
    authenticate3DS, 
    processTransaction,
    isValidCardNumber,      // ← Agregar
    isValidExpiration,      // ← Agregar
    isValidCVV             // ← Agregar
} from '../utils/nmiClient';
```

---

## FIX #2: IDEMPOTENCIA SERVER ✅

**Problema:** DOS requests simultáneos = DOS cargos

**Solución:**

### Paso 1: Agregar requestId en cliente

En `NMIPaymentModal.jsx` línea 168:

```javascript
const result = await processTransaction({
    ...paymentInfo,
    ...authData,
    ccnumber: paymentInfo.cardNumber,
    ccexp: expMonth + expYear,
    cvv: cardData.cvv,
    
    // ✅ AGREGAR
    requestId: `${orderId}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    
    directory_server_id: authData.directoryServerId || authData.directory_server_id || '',
});
```

### Paso 2: Crear tabla de deduplicación en Firestore

En `nmi-charge.js`, al principio:

```javascript
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Inicializar Firebase Admin
const admin = initializeApp();
const db = getFirestore(admin);

/**
 * Verifica si ya procesamos este requestId
 */
async function checkIdempotency(requestId) {
    try {
        const doc = await db.collection('nmi_requests').doc(requestId).get();
        if (doc.exists) {
            // Ya fue procesado
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
 * Guarda resultado de transacción para deduplicación
 */
async function saveIdempotencyRecord(requestId, result, orderid) {
    try {
        await db.collection('nmi_requests').doc(requestId).set({
            requestId,
            orderid,
            result,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ttl: Date.now() + (24 * 60 * 60 * 1000)  // Expirar en 24h
        });
    } catch (err) {
        console.warn('[NMI] Error guardando idempotencia:', err);
    }
}
```

### Paso 3: Usar idempotencia en handler

En `nmi-charge.js` línea 38:

```javascript
exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    const { requestId, orderid, ...otherData } = body;
    
    // ✅ VERIFICAR IDEMPOTENCIA
    if (requestId) {
        const cachedResult = await checkIdempotency(requestId);
        if (cachedResult) {
            console.log(`[NMI] Returnando cached result para ${requestId}`);
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...cachedResult, _cached: true })
            };
        }
    }
    
    // ... procesar transacción normal
    
    // ✅ GUARDAR PARA PROXIMAS VECES
    if (requestId) {
        await saveIdempotencyRecord(requestId, result, orderid);
    }
    
    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
    };
};
```

**Instalar Firebase Admin en Netlify:**
```bash
npm install firebase-admin
```

---

## FIX #3: VARIABLES DE ENTORNO ✅

**Problema:** Claves privadas expuestas en cliente

**Solución:**

### Paso 1: Limpiar `.env`

Eliminar:
```bash
# ❌ BORRAR ESTAS LÍNEAS:
VITE_NMI_PRIVATE_KEY=xxx           # NUNCA en cliente
VITE_NMI_PROCESSOR_ID=xxx          # Innecesario
VITE_NMI_TOKEN=xxx                 # No se usa
```

Mantener:
```bash
# ✅ MANTENER:
VITE_NMI_PUBLIC_KEY=checkout_public_xxxxx
```

### Paso 2: Configurar Netlify Env Vars

1. Ir a: **Netlify Dashboard → Site settings → Build & deploy → Environment**
2. Agregar variables:
   ```
   NMI_PRIVATE_KEY = y27T472R7P3cAYRxDPS63T858PP27w3X
   NMI_PROCESSOR_ID = 12572816
   ```
3. **NO agregar VITE_ prefix**
4. Re-deploy

### Paso 3: Actualizar nmi-charge.js

```javascript
// ✅ CORRECTO:
const NMI_PRIVATE_KEY = process.env.NMI_PRIVATE_KEY;
const NMI_PROCESSOR_ID = process.env.NMI_PROCESSOR_ID;

// ❌ ELIMINAR FALLBACKS:
// const NMI_PRIVATE_KEY = process.env.NMI_PRIVATE_KEY || process.env.VITE_NMI_PRIVATE_KEY;
```

### Paso 4: Verificar .gitignore

```bash
# En .gitignore:
.env
.env.local
.env.*.local
.env.production
```

---

## FIX #4: TIMEOUT HANDLING MEJORADO ✅

**Problema:** Si pago tarda >24s, se pierde dinero

**Solución:**

### Paso 1: Usar polling en cliente

En `nmiClient.js` línea 273:

```javascript
export async function processTransaction(transactionData) {
    const payload = {
        ...transactionData,
        // ✅ Agregar timestamp
        sentAt: Date.now()
    };
    
    console.log('[NMI] Enviando cargo...', { amount: payload.amount, orderid: payload.orderid });
    
    try {
        const response = await fetch('/.netlify/functions/nmi-charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            // Timeout cliente: 35s (un poco más que servidor)
            signal: AbortSignal.timeout(35000)
        });
        
        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            console.error('[NMI] Error del proxy:', response.status, errBody);
            throw new Error(`Error del servidor (${response.status})`);
        }
        
        const result = await response.json();
        console.log('[NMI] Resultado:', result);
        return result;
        
    } catch (error) {
        if (error.name === 'AbortError') {
            // ✅ TIMEOUT: Implementar polling
            console.warn('[NMI] Timeout en fetch, iniciando polling...');
            return await pollForTransaction(transactionData.orderid, transactionData.requestId);
        }
        throw error;
    }
}

/**
 * Si el servidor tardó demasiado, polling para saber resultado
 */
async function pollForTransaction(orderid, requestId, maxAttempts = 6) {
    console.log(`[NMI] Polling para orden ${orderid}...`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(r => setTimeout(r, 2000));  // Esperar 2s entre intentos
        
        try {
            // Hacer un request pequeño para verificar estado
            const response = await fetch(`/.netlify/functions/nmi-status?orderid=${orderid}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            const result = await response.json();
            
            if (result.response === '1' || result.authcode) {
                console.log('[NMI] ✅ Transacción confirmada via polling');
                return { ...result, _polled: true };
            }
            
            if (result.response && result.response !== '1') {
                console.log('[NMI] ❌ Transacción declinada');
                return result;
            }
        } catch (err) {
            console.warn(`[NMI] Polling attempt ${attempt + 1} failed:`, err);
        }
    }
    
    // Si después de 6 intentos (12 segundos) no sabemos:
    return {
        response: '3',
        responsetext: 'TIMEOUT_AFTER_POLLING',
        message: 'No pudimos confirmar el pago. Por favor verifica en tu banca si se realizó el cargo.'
    };
}
```

### Paso 2: Aumentar timeout en servidor

En `nmi-charge.js` línea 24:

```javascript
// ✅ Aumentar de 24s a 30s
const INTERNAL_TIMEOUT = 30000;
```

### Paso 3: Crear endpoint de status

Crear `netlify/functions/nmi-status.js`:

```javascript
const { getFirestore } = require('firebase-admin/firestore');

exports.handler = async (event) => {
    const { orderid } = event.queryStringParameters || {};
    
    if (!orderid) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'orderid required' })
        };
    }
    
    try {
        const db = getFirestore();
        const doc = await db.collection('pedidos').doc(orderid).get();
        
        if (!doc.exists) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Order not found' })
            };
        }
        
        const order = doc.data();
        return {
            statusCode: 200,
            body: JSON.stringify({
                response: order.paymentConfirmed ? '1' : '0',
                transactionid: order.transactionId || '',
                authcode: order.authcode || '',
                paymentStatus: order.paymentStatus
            })
        };
    } catch (err) {
        console.error('[Status] Error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message })
        };
    }
};
```

---

## FIX #5: VALIDAR AUTHDATA ✅

**Problema:** Si el banco retorna datos vacíos, se acepta como éxito

**Solución:**

En `nmiClient.js` línea 230:

```javascript
threeDSInterface.on('complete', (data) => {
    clearTimeout(timeoutHandle);
    try { threeDSInterface.unmount(); } catch (e) { }
    _activeThreeDSInterface = null;
    
    // ✅ VALIDAR ESTRUCTURA
    if (!data || typeof data !== 'object') {
        reject(new Error('3DS retornó datos inválidos'));
        return;
    }
    
    // Normalizar campos (Gateway.js usa snake_case)
    const normalized = {
        cavv: data.cavv || data.CAVV || '',
        xid: data.xid || data.XID || '',
        eci: data.eci || data.ECI || '',
        threeDsVersion: data.threeDsVersion || data.three_ds_version || data.threedsVersion || '2.2.0',
        cardHolderAuth: data.cardHolderAuth || data.cardholder_auth || data.cardholderAuth || '',
        directoryServerId: data.directoryServerId || data.directory_server_id || data.dsTransactionId || '',
        _original: data  // ✅ Guardar original para debugging
    };
    
    // Validar que al menos algunos campos estén presentes
    if (!normalized.cavv && normalized.eci !== '07') {
        // Si NO es fallback (eci=07) pero no tiene cavv: error
        reject(new Error('3DS completó pero sin cavv válido'));
        return;
    }
    
    console.log('[NMI] 3DS Complete (normalized):', JSON.stringify({
        cavv: normalized.cavv ? `${normalized.cavv.substring(0,10)}...` : 'MISSING',
        xid: normalized.xid ? `${normalized.xid.substring(0,10)}...` : 'MISSING',
        eci: normalized.eci,
        cardHolderAuth: normalized.cardHolderAuth || 'MISSING',
        directoryServerId: normalized.directoryServerId || 'MISSING'
    }));
    
    resolve(normalized);
});
```

---

## FIX #6: LOGGING EXHAUSTIVO ✅

**Problema:** Sin logs detallados, imposible debuggear

**Solución:**

En `nmiClient.js`, agregar función de audit:

```javascript
function auditLog(step, data = {}) {
    const timestamp = new Date().toISOString();
    const log = {
        timestamp,
        step,
        ...data
    };
    console.log(`[NMI Audit] ${JSON.stringify(log)}`);
    
    // ✅ Optacional: enviar a Datadog, LogRocket, etc.
    // if (window.datadog) window.datadog?.logger?.log(log);
}
```

Usar en cada punto clave:

```javascript
// En initGateway
auditLog('gateway_init', { keyLength: NMI_PUBLIC_KEY?.length });

// En authenticate3DS
auditLog('3ds_start', { amount: paymentInfo.amount });

// En evento complete
auditLog('3ds_complete', { eci: normalized.eci, hasCavv: !!normalized.cavv });

// En processTransaction
auditLog('transaction_start', { orderid: transactionData.orderid });

// En respuesta
auditLog('transaction_response', { response: result.response, authcode: result.authcode });
```

---

## FIX #7: DESHABILITAR BOTÓN ✅

**Problema:** Usuario puede hacer click 2 veces durante procesamiento

**Solución:**

En `NMIPaymentModal.jsx`:

```javascript
<button
    onClick={handleSubmitCard}
    disabled={loading || step !== 'card'}  // ← Deshabilitar si está procesando
    className={`w-full py-3 rounded-lg font-bold transition ${
        loading ? 'bg-gray-400 text-gray-600 cursor-not-allowed' : 'bg-bikitchen-orange text-white hover:bg-orange-600'
    }`}
>
    {loading ? 'Procesando...' : 'Proceder al Pago'}
</button>
```

También prevenir cerrar modal durante pago:

```javascript
<div
    className="fixed inset-0 bg-black/95 backdrop-blur-md"
    onClick={(e) => {
        if (step === 'processing') {
            e.preventDefault();  // Impedir cierre
            return;
        }
        onClose();
    }}
>
    {/* Mostrar advertencia */}
    {step === 'processing' && (
        <div className="absolute top-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg">
            ⚠️ No cierres durante el pago
        </div>
    )}
</div>
```

---

## ORDEN DE IMPLEMENTACIÓN

```
1. FIX #3 (15min) - Limpiar variables de entorno
   └─ Menos riesgo de romper nada

2. FIX #1 (30min) - Luhn Validation
   └─ Simples validaciones client-side

3. FIX #7 (15min) - Deshabilitar botón
   └─ UX improvement, sin backend

4. FIX #5 (30min) - Validar AuthData
   └─ Mejora en cliente, sin backend

5. FIX #4 (45min) - Timeout Handling
   └─ Requiere nuevo endpoint (nmi-status.js)

6. FIX #2 (1h) - Idempotencia
   └─ Requiere Firebase Admin, más complejo

7. FIX #6 (45min) - Logging
   └─ Refactor, aplicar a toda la cadena
```

**Tiempo total:** ~3.5 horas  
**Parar después de FIX #5:** ~2 horas (resuelve 90% de problemas)

---

## TESTING DESPUÉS DE CADA FIX

```bash
# FIX #1: Luhn Validation
✓ Intentar entrar "1111111111111111" - debe rechazar
✓ Entrar "4111111111111111" - debe aceptar

# FIX #3: Variables de Entorno
✓ Verificar que no hay VITE_NMI_PRIVATE_KEY en cliente
✓ Verificar que Netlify tiene NMI_PRIVATE_KEY

# FIX #7: Deshabilitar botón
✓ Click rápido 2 veces - debe procesar solo 1

# FIX #5: Validar AuthData
✓ Revisar console.log con datos de 3DS

# FIX #4: Timeout Handling
✓ Simular timeout (en browser DevTools: throttle a "Slow 3G")
✓ Verificar que inicia polling después de 30s

# FIX #2: Idempotencia
✓ Hacer dos requests simultáneos con mismo requestId
✓ Verificar que Firestore solo tiene 1 transacción

# FIX #6: Logging
✓ Revisar console que aparezcan audit logs en cada paso
```

---

**SIGUIENTE:** Una vez completados estos 7 fixes, implementar las mejoras AMARILLAS (webhook, alertas Slack, etc.)
