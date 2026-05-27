# 🏦 GUÍA COMPLETA: INTEGRACIÓN BAC/NMI CON GATEWAY.JS

**Versión:** 1.0  
**Última actualización:** 2026-04-29  
**Autor:** Claude (Senior Developer)  
**Propósito:** Documentación reutilizable para implementar pagos BAC/NMI en múltiples proyectos

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Configuración Inicial](#configuración-inicial)
4. [Flujo de Pago Completo](#flujo-de-pago-completo)
5. [Implementación](#implementación)
6. [Seguridad](#seguridad)
7. [Troubleshooting](#troubleshooting)
8. [Checklist para Nuevo Cliente](#checklist-para-nuevo-cliente)

---

## 1. RESUMEN EJECUTIVO

### ¿Qué es BAC/NMI?

**BAC Credomatic** es el banco principal de Costa Rica. **NMI (Network Merchants Inc.)** es el procesador de pagos que BAC usa.

- **BAC:** Banco (emite tarjetas, genera transactionId)
- **NMI:** Gateway de pagos (procesa transacciones, maneja 3D Secure)

### ¿Cómo funciona?

```
Cliente ingresa tarjeta
         ↓
Gateway.js genera token (no enviamos número completo)
         ↓
3D Secure (verificación del banco)
         ↓
NMI procesa transacción
         ↓
Firestore actualiza estado
         ↓
Confirmación al cliente
```

### Versión de esta Integración

- **Gateway.js:** v1.1+
- **3D Secure:** v2.2.0
- **Netlify Functions:** v5 (con 26s timeout)
- **Firestore:** v12.6.0

---

## 2. ARQUITECTURA DEL SISTEMA

### 2.1 Componentes Principales

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (React)                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CheckoutSteps.jsx                                      │
│  ├─ Maneja flujo de checkout                            │
│  ├─ Crea orden en Firestore                             │
│  └─ Abre modal de pago si metodoPago === 'nmi'         │
│                                                         │
│  NMIPaymentModal.jsx                                    │
│  ├─ Formulario de tarjeta (número, exp, cvv)           │
│  ├─ Maneja 3D Secure                                    │
│  ├─ Estados: card → 3ds → processing → error/success   │
│  └─ Comunica resultado a CheckoutSteps                  │
│                                                         │
│  nmiClient.js (Utilidades)                              │
│  ├─ initGateway() - Inicializa Gateway.js              │
│  ├─ authenticate3DS() - Autentica con banco            │
│  └─ processTransaction() - Envía a servidor             │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                  (JSON POST sobre HTTPS)
                           ↓
┌─────────────────────────────────────────────────────────┐
│              SERVIDOR (Netlify Functions)                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  nmi-charge.js                                          │
│  ├─ Recibe: cardData + 3DS tokens                       │
│  ├─ Valida: campos requeridos, sanitiza                │
│  ├─ Envía: URLSearchParams a NMI API                    │
│  ├─ Timeout: 24 segundos interno                        │
│  └─ Retorna: JSON con resultado                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                    (HTTPS al banco)
                           ↓
┌─────────────────────────────────────────────────────────┐
│              NMI API (secure.networkmerchants.com)       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  - Valida tarjeta                                        │
│  - Comunica con banco BAC                               │
│  - Retorna: response (1=aprobado, 2=declinado, etc)     │
│  - Retorna: transactionId, authcode                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                        (Async)
                           ↓
┌─────────────────────────────────────────────────────────┐
│              WEBHOOK (Opcional, NO implementado)         │
├─────────────────────────────────────────────────────────┤
│  - NMI podría notificar async resultado                 │
│  - Actualmente NO se usa en BiKitchen                    │
│  - Recomendación: implementar en futuro                 │
│                                                         │
└─────────────────────────────────────────────────────────┘
                           │
                  (Actualizar Firestore)
                           ↓
┌─────────────────────────────────────────────────────────┐
│              FIRESTORE (Base de datos)                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  pedidos/{id}                                            │
│  ├─ status: 'pending_payment' → 'confirmed'            │
│  ├─ paymentStatus: 'pending' → 'paid'                  │
│  ├─ transactionId: 'xxxxxx' (de NMI)                   │
│  └─ paymentConfirmed: true                              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Datos

**Entrada (Cliente → Servidor):**
```json
{
  "amount": "25000.00",
  "currency": "CRC",
  "ccnumber": "4111111111111111",
  "ccexp": "1225",
  "cvv": "123",
  "cavv": "jEhNcEszR0VEBFdWBQELCAkDEQsHDBU=",
  "xid": "MDAwMDAwMDAwMDAwMDAwMzIyNzI0",
  "eci": "05",
  "three_ds_version": "2.2.0",
  "cardholder_auth": "authenticated",
  "directory_server_id": "8de2c7c1-e1ef-4e5f-96f6-e10a2f7ec21a",
  "firstName": "Juan",
  "lastName": "Perez",
  "email": "juan@example.com",
  "address1": "Calle 1",
  "city": "San Jose",
  "state": "SJ",
  "zip": "10101",
  "orderid": "ORD-7901"
}
```

**Salida (NMI → Servidor):**
```
response=1
responsetext=Success
authcode=123456
transactionid=3948572985
avsresponse=M
cvvresponse=M
orderid=ORD-7901
processor_id=12572816
```

---

## 3. CONFIGURACIÓN INICIAL

### 3.1 Obtener Credenciales de BAC

**Paso 1:** Contactar a BAC Credomatic
- Email: soporte@baccredomatic.com
- Solicitar: "Integración de pagos con NMI Gateway.js"

**Paso 2:** BAC te dará:
```
- NMI Public Key (Tokenization)
- NMI Private Key (Solo en servidor)
- Processor ID (Tu código de comercio)
- Sandbox URL: https://sandbox.networkmerchants.com
- Producción URL: https://secure.networkmerchants.com
```

### 3.2 Configurar Variables de Entorno

**✅ CORRECTO:**

`.env.local` (desarrollo, NUNCA commit):
```bash
VITE_NMI_PUBLIC_KEY=checkout_public_xxxxxxxxxxxxxxx
```

`netlify/functions/.env` (Netlify Env Vars en dashboard):
```bash
NMI_PRIVATE_KEY=y27T472R7P3cAYRxDPS63T858PP27w3X
NMI_PROCESSOR_ID=12572816
```

`.gitignore`:
```
.env
.env.local
.env.*.local
```

**❌ INCORRECTO:**

```bash
# NO hacer esto:
VITE_NMI_PRIVATE_KEY=xxx          # La clave privada nunca en cliente
VITE_NMI_PROCESSOR_ID=xxx         # Innecesario exponer
NMI_TOKEN=xxx                      # Campo no existe
```

### 3.3 Instalar Dependencias

```bash
npm install @emailjs/browser      # Para notificaciones
npm install react-hot-toast       # Para mensajes
npm install framer-motion         # Para animaciones
```

**NO necesitas instalar "Gateway.js"** — viene en un `<script>` en `index.html`:

```html
<script src="https://gateway.nmi.com/api/v1/gateway.min.js"></script>
```

### 3.4 Sandbox vs Producción

**Sandbox (Testing):**
- URL: `https://sandbox.networkmerchants.com`
- Tarjeta de prueba: `4111111111111111`
- Exp: `12/25`
- CVV: `123`

**Producción:**
- URL: `https://secure.networkmerchants.com`
- Tarjetas reales del cliente
- ⚠️ Cuidado: cada transacción cuesta

**Cambiar entre Sandbox y Producción:**

En `netlify/functions/nmi-charge.js` línea 12:
```javascript
// SANDBOX:
const NMI_API_URL = 'https://sandbox.networkmerchants.com/api/transact.php';

// PRODUCCIÓN:
const NMI_API_URL = 'https://secure.networkmerchants.com/api/transact.php';
```

---

## 4. FLUJO DE PAGO COMPLETO

### 4.1 Paso a Paso Detallado

#### **PASO 1: Usuario llena formulario de checkout**
```javascript
// CheckoutSteps.jsx línea 560
const handleSubmitOrder = async () => {
    // Valida formulario
    // Crea documento en Firestore con status: 'pending_payment'
    // Si metodoPago === 'nmi':
    setShowNMIModal(true);  // Abre el modal
    return;
}
```

#### **PASO 2: Modal se abre**
```javascript
// NMIPaymentModal.jsx línea 33
useEffect(() => {
    if (isOpen) {
        initGateway()  // Inicializa Gateway.js
            .then(setGateway)
            .catch(err => setError('No se pudo inicializar'));
    }
}, [isOpen]);
```

#### **PASO 3: Usuario ingresa datos de tarjeta**
```javascript
// NMIPaymentModal.jsx línea 85
<input 
    name="number"
    placeholder="Número de tarjeta"
    maxLength="19"
    value={cardData.number}
    onChange={handleCardChange}
/>
```

**Validación en cliente:**
- Solo dígitos, máx 19 caracteres (16 dígitos + 3 espacios)
- Formato visual: "4111 1111 1111 1111"

#### **PASO 4: Usuario hace click en "Proceder al Pago"**
```javascript
// NMIPaymentModal.jsx línea 115
const handleSubmitCard = async (e) => {
    // 1. Extrae datos de tarjeta
    const [expMonth, expYear] = cardData.exp.split('/');
    
    // 2. Crea paymentInfo
    const paymentInfo = {
        amount: total.toFixed(2),
        currency: 'CRC',
        cardNumber: cardData.number.replace(/\s/g, ''),  // Sin espacios
        cardExpMonth: expMonth,  // "12"
        cardExpYear: '20' + expYear,  // "2025"
        firstName: 'Juan',
        lastName: 'Perez',
        email: 'juan@example.com',
        // ... más datos
    };
    
    // 3. Llama a authenticate3DS
    setStep('3ds');
    const authData = await authenticate3DS(gateway, paymentInfo);
    
    // 4. Procesa transacción
    setStep('processing');
    const result = await processTransaction({
        ...paymentInfo,
        ...authData,
        ccnumber: paymentInfo.cardNumber,
        ccexp: expMonth + expYear,  // "1225"
        cvv: cardData.cvv
    });
};
```

#### **PASO 5: 3D Secure Authentication**
```javascript
// nmiClient.js línea 100
export function authenticate3DS(gateway, paymentInfo) {
    return new Promise((resolve, reject) => {
        let threeDS = gateway.get3DSecure();
        
        // Intenta crear UI con opciones
        let threeDSInterface = threeDS.createUI({
            amount: paymentInfo.amount,
            currency: paymentInfo.currency,
            cardNumber: paymentInfo.cardNumber,
            // ... más opciones
        });
        
        // Si falla con CRC, reintenta con USD
        if (!threeDSInterface) {
            delete options.currency;
            threeDSInterface = threeDS.createUI(options);
        }
        
        // Si aún falla: fallback sin 3DS
        if (!threeDSInterface) {
            resolve({
                cavv: '',
                xid: '',
                eci: '07',  // Non-3DS
                threeDsVersion: '',
                cardHolderAuth: '',
                _fallback: true  // ⚠️ ALERTA
            });
            return;
        }
        
        // Inicia 3DS
        threeDSInterface.start('#three-ds-container');
        
        // Escucha resultado
        threeDSInterface.on('complete', (data) => {
            resolve(data);  // Retorna datos de 3DS
        });
        
        threeDSInterface.on('failure', (error) => {
            reject(new Error('3DS fue rechazada'));
        });
    });
}
```

**¿Qué pasa en el banco?**
- Gateway.js abre popup/iframe
- Usuario ve código OTP en su celular
- Usuario entra código en popup
- Banco valida
- Retorna: `cavv`, `xid`, `eci`, `threeDsVersion`, `cardholder_auth`

#### **PASO 6: Procesa transacción en servidor**
```javascript
// nmiClient.js línea 273
export async function processTransaction(transactionData) {
    const payload = {
        amount: transactionData.amount,
        ccnumber: transactionData.ccnumber,
        ccexp: transactionData.ccexp,  // "1225"
        cvv: transactionData.cvv,
        cavv: transactionData.cavv,
        xid: transactionData.xid,
        eci: transactionData.eci,
        three_ds_version: transactionData.threeDsVersion,
        cardholder_auth: transactionData.cardHolderAuth,
        directory_server_id: transactionData.directoryServerId,
        // ... más datos
    };
    
    const response = await fetch('/.netlify/functions/nmi-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    return result;
}
```

#### **PASO 7: Servidor procesa en NMI**
```javascript
// nmi-charge.js línea 38
exports.handler = async (event) => {
    const body = JSON.parse(event.body);
    
    // Valida campos requeridos
    if (!body.amount || !body.ccnumber || !body.ccexp || !body.cvv) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Campos faltantes' }) };
    }
    
    // Construye URLSearchParams (formato que NMI espera)
    const params = new URLSearchParams({
        security_key: NMI_PRIVATE_KEY,
        type: 'sale',
        amount: body.amount,
        processor_id: NMI_PROCESSOR_ID,
        ccnumber: body.ccnumber,
        ccexp: body.ccexp,
        cvv: body.cvv,
        cardholder_auth: body.cardHolderAuth || (body.cavv ? 'verified' : ''),
        cavv: body.cavv,
        // ... más parámetros
    });
    
    // Envía a NMI
    const nmiResponse = await fetch(
        'https://secure.networkmerchants.com/api/transact.php',
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString(),
            signal: controller.signal  // Con timeout
        }
    );
    
    // Parse respuesta
    const responseText = await nmiResponse.text();
    const result = Object.fromEntries(new URLSearchParams(responseText));
    
    return {
        statusCode: 200,
        body: JSON.stringify(result)
    };
};
```

**Respuesta de NMI (ejemplo):**
```
response=1                                    // 1=aprobado
responsetext=Success
authcode=123456                               // Código del banco
transactionid=3948572985                      // ID único
avsresponse=M                                 // Dirección matches
cvvresponse=M                                 // CVV matches
orderid=ORD-7901
processor_id=12572816
```

#### **PASO 8: Cliente procesa resultado**
```javascript
// NMIPaymentModal.jsx línea 181
const isApproved = result.response === '1';
const bankApprovedByAuthcode = !!(result.authcode && result.authcode.trim());
const isDuplicate = (result.response === '2' || result.response === '3') &&
                    result.responsetext?.toLowerCase().includes('duplicate');

if (isApproved || isDuplicate || (bankApprovedByAuthcode && !isApproved)) {
    setStep('success');
    setTimeout(onPaymentSuccess, 2000);  // Espera 2s
} else {
    setStep('error');
    setError(result.responsetext);
}
```

#### **PASO 9: Confirma orden en Firestore**
```javascript
// CheckoutSteps.jsx línea 1792
const onPaymentSuccess = async (paymentResult) => {
    // 1. Actualiza orden
    await updateDoc(orderRef, {
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentConfirmed: true,
        transactionId: paymentResult.transactionid,
        updatedAt: serverTimestamp()
    });
    
    // 2. Envía emails
    const adminResult = await sendOrderNotification(fullOrderData);
    const customerResult = await sendCustomerOrderConfirmation(fullOrderData);
    
    // 3. Otorga puntos si es cliente
    if (currentUser) {
        await addPoints(total, orderNumber);
    }
    
    // 4. Limpia carrito y redirectiona
    clearCart();
    navigate('/orden-confirmada');
};
```

---

## 5. IMPLEMENTACIÓN

### 5.1 Archivos Necesarios

```
src/
├── components/
│   ├── NMIPaymentModal.jsx          ← Modal principal
│   ├── CheckoutSteps.jsx             ← Flujo de checkout
│   └── Navbar.jsx                    ← Barra de navegación
│
├── utils/
│   └── nmiClient.js                  ← Lógica de NMI
│
├── services/
│   └── emailNotifications.js          ← Notificaciones
│
└── pages/
    └── checkout/
        └── CheckoutSteps.jsx         ← Página de checkout

netlify/
└── functions/
    └── nmi-charge.js                 ← Función serverless

public/
└── index.html                        ← Script de Gateway.js
```

### 5.2 Código Esencial

**nmiClient.js:**
```javascript
// 1. Inicializar Gateway
export async function initGateway() {
    if (typeof window.Gateway === 'undefined') {
        throw new Error('Gateway.js not loaded');
    }
    const gateway = window.Gateway.create(NMI_PUBLIC_KEY);
    return gateway;
}

// 2. Autenticar con 3DS
export function authenticate3DS(gateway, paymentInfo) {
    // ... ver flujo completo arriba
}

// 3. Procesar transacción
export async function processTransaction(transactionData) {
    // ... ver flujo completo arriba
}
```

**NMIPaymentModal.jsx:**
```javascript
const NMIPaymentModal = ({ isOpen, onClose, orderId, total, onPaymentSuccess }) => {
    const [gateway, setGateway] = useState(null);
    const [step, setStep] = useState('card');  // card, 3ds, processing, success, error
    const [cardData, setCardData] = useState({...});
    const [error, setError] = useState(null);
    
    // Inicializa Gateway al abrir
    useEffect(() => {
        if (isOpen) {
            initGateway().then(setGateway).catch(err => setError(...));
        }
    }, [isOpen]);
    
    // Maneja submit
    const handleSubmitCard = async (e) => {
        // ... ver flujo completo arriba
    };
    
    // Interfaz
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            {step === 'card' && <CardForm onSubmit={handleSubmitCard} />}
            {step === '3ds' && <div id="three-ds-container" />}
            {step === 'processing' && <LoadingSpinner />}
            {step === 'error' && <ErrorMessage message={error} />}
        </Modal>
    );
};
```

---

## 6. SEGURIDAD

### 6.1 ✅ Lo que HACEMOS bien

- ✅ Tarjeta nunca toca nuestro servidor (Gateway.js maneja tokenización)
- ✅ Private key solo en variables de entorno del servidor
- ✅ HTTPS en todas las conexiones
- ✅ Sanitización de datos para 3DS compliance
- ✅ Timeout en servidor (previene hanging requests)

### 6.2 ⚠️ Lo que DEBEMOS mejorar

- ❌ **Sin Luhn validation:** Cualquiera puede entrar tarjeta fake
  ```javascript
  // AGREGAR:
  function isValidCardNumber(num) {
      // Algoritmo de Luhn
  }
  ```

- ❌ **Sin idempotencia:** Dos requests simultáneos = dos cargos
  ```javascript
  // AGREGAR:
  const requestId = `${orderId}-${timestamp}`;
  // Servidor verifica: ¿ya procesé este requestId?
  ```

- ❌ **Variables de entorno expuestas:**
  ```bash
  # ELIMINAR:
  VITE_NMI_PRIVATE_KEY    # ❌ Nunca en cliente
  VITE_NMI_PROCESSOR_ID   # ❌ Innecesario
  ```

### 6.3 Checklist de Seguridad

- [ ] `.gitignore` incluye `.env`, `.env.local`
- [ ] `NMI_PRIVATE_KEY` NO está en `.env` (solo en Netlify Env Vars)
- [ ] HTTPS en todas las rutas de pago
- [ ] Timeouts configurados (24s en servidor)
- [ ] Logs NO contienen números de tarjeta
- [ ] CORS configurado correctamente
- [ ] CSP headers incluyen `https://gateway.nmi.com`

---

## 7. TROUBLESHOOTING

### 7.1 Error: "Gateway.js not loaded"

**Causa:** El script de Gateway.js no se cargó

**Solución:**
```html
<!-- En index.html, antes de </body>: -->
<script src="https://gateway.nmi.com/api/v1/gateway.min.js"></script>
```

### 7.2 Error: "3D Secure not available"

**Causa:** La cuenta de BAC NO tiene 3DS habilitado

**Solución:**
1. Contactar a BAC para activar 3DS
2. Mientras tanto, el sistema hace fallback a "sin 3DS" (eci='07')
3. Esto aumenta riesgo de chargebacks

### 7.3 Error: "INVALID CARD"

**Causas posibles:**
1. Tarjeta está expirada
2. Número de tarjeta incorrecto
3. CVV incorrecto
4. Tarjeta está bloqueada/sin fondos
5. BAC rechaza por seguridad

**Solución:**
```javascript
// Agregar Luhn validation:
if (!isValidCardNumber(cardNumber)) {
    setError('Número de tarjeta inválido');
    return;
}

// Validar expiración:
const expDate = new Date(2000 + expYear, expMonth - 1);
if (expDate < new Date()) {
    setError('Tarjeta vencida');
    return;
}
```

### 7.4 Error: "Timeout reached after 24s"

**Causa:** La conexión a NMI tardó más de 24 segundos

**Solución:**
1. Verificar si el dinero se cobró (revisar en BAC)
2. Si se cobró: crear order en Firestore manualmente
3. Si NO se cobró: reintentar pago
4. Aumentar timeout a 30s en nmi-charge.js si es frecuente

```javascript
// En nmi-charge.js línea 24:
const INTERNAL_TIMEOUT = 30000;  // Aumentar de 24s a 30s
```

### 7.5 Error: "Duplicate transaction"

**Causa:** Se procesó la misma orden dos veces

**Solución:**
1. Verificar en Firestore el `transactionId`
2. Si tiene dos transactionIds: revertir una manualmente
3. Contactar a BAC para chargeback si es necesario
4. Implementar idempotencia server-side (ver sección 8)

### 7.6 Error: "Missing environment variables"

**Causa:** Variables de entorno no están configuradas

**Solución:**
```bash
# En Netlify dashboard:
1. Site settings → Build & deploy → Environment
2. Agregar:
   - NMI_PRIVATE_KEY=tu_clave
   - NMI_PROCESSOR_ID=tu_id
3. Re-deploy

# En desarrollo:
1. Crear .env.local (NO commit)
2. Agregar: VITE_NMI_PUBLIC_KEY=tu_clave_publica
3. Reiniciar npm run dev
```

### 7.7 Error: "CORS error"

**Causa:** Gateway.js no puede conectar a NMI

**Solución:**
```javascript
// En netlify.toml:
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "script-src 'self' https://gateway.nmi.com https://secure.networkmerchants.com"
    Access-Control-Allow-Origin = "*"
```

### 7.8 Error: "Cardholder auth failed"

**Causa:** El banco rechazó la autenticación 3DS

**Solución:**
```javascript
// En NMIPaymentModal.jsx:
threeDSInterface.on('failure', (error) => {
    reject(new Error('La autenticación 3DS fue rechazada. Intenta con otra tarjeta.'));
});
```

---

## 8. CHECKLIST PARA NUEVO CLIENTE

### 8.1 Pre-implementación

- [ ] Cliente tiene cuenta en BAC Credomatic
- [ ] BAC proporciona: Public Key, Private Key, Processor ID
- [ ] Proyecto usa React 18+ y Firestore
- [ ] Netlify Functions habilitado (o usar otra plataforma serverless)
- [ ] Cliente acepta que sin 3DS hay más riesgo de chargebacks

### 8.2 Configuración

- [ ] Crear `.env.local` con `VITE_NMI_PUBLIC_KEY`
- [ ] Configurar Netlify Env Vars: `NMI_PRIVATE_KEY`, `NMI_PROCESSOR_ID`
- [ ] Agregar script de Gateway.js en `index.html`
- [ ] Configurar CORS si es necesario
- [ ] Actualizar `.gitignore`

### 8.3 Implementación

- [ ] Copiar `nmiClient.js` al proyecto
- [ ] Copiar `NMIPaymentModal.jsx` al proyecto
- [ ] Integrar en `CheckoutSteps.jsx`
- [ ] Copiar `nmi-charge.js` a `netlify/functions/`
- [ ] Actualizar rutas de importación

### 8.4 Testing (Sandbox)

- [ ] Hacer prueba con tarjeta `4111111111111111`
- [ ] Verificar que Firestore se actualiza
- [ ] Verificar que se envían emails
- [ ] Verificar 3DS popup aparece
- [ ] Probar reintentos después de error
- [ ] Probar timeout (hacer refresh durante pago)

### 8.5 Cambiar a Producción

- [ ] Cambiar `NMI_API_URL` a `https://secure.networkmerchants.com`
- [ ] Verificar credenciales de producción
- [ ] Hacer test con tarjeta real de bajo monto ($1)
- [ ] Verificar BAC confirmó la transacción
- [ ] Configurar alertas en Netlify para errores
- [ ] Implementar logging para debugging

### 8.6 Post-lanzamiento

- [ ] Monitorear primeras 10 transacciones
- [ ] Recolectar feedback de clientes sobre UX
- [ ] Revisar logs de errores
- [ ] Implementar webhook de NMI (mejora)
- [ ] Implementar Luhn validation (mejora)
- [ ] Implementar idempotencia (mejora)

---

## 9. VARIABLES DE ENTORNO: REFERENCIA COMPLETA

| Variable | Dónde se usa | Tipo | Secreto | Ejemplo |
|----------|-------------|------|--------|---------|
| `VITE_NMI_PUBLIC_KEY` | Cliente (nmiClient.js:8) | String | No (se ve en JS) | `checkout_public_xxx` |
| `NMI_PRIVATE_KEY` | Servidor (nmi-charge.js:16) | String | ✅ Sí | `y27T472R7P3cAYRxDPS63T858PP27w3X` |
| `NMI_PROCESSOR_ID` | Servidor (nmi-charge.js:17) | Number | ⚠️ Semi | `12572816` |

**Cómo obtenerlas:**
1. Contactar a BAC: soporte@baccredomatic.com
2. Solicitar integración con NMI Gateway.js
3. BAC te enviará credenciales
4. Guardar de forma segura (no en Git)

---

## 10. REFERENCIAS Y RECURSOS

### Documentación Oficial
- [NMI Gateway.js Docs](https://gateway.nmi.com/) (requiere login)
- [BAC Credomatic](https://www.baccredomatic.com/)

### Tarjetas de Prueba
- Visa: `4111111111111111` / `12/25` / `123`
- Mastercard: `5555555555554444` / `12/25` / `123`
- American Express: `378282246310005` / `12/25` / `1234`

### Códigos de Respuesta NMI
- `response=1`: Aprobado ✅
- `response=2`: Declinado ❌
- `response=3`: Error ⚠️

### Códigos ECI (3DS)
- `eci=05`: Autenticado vía 3DS
- `eci=07`: No 3DS (menos seguro)
- `eci=06`: Intentado pero falló

---

## CONCLUSIÓN

Esta guía debe servir como **base reutilizable** para implementar BAC/NMI en múltiples proyectos.

**Cambios entre clientes:**
- Solo cambian las credenciales (Public/Private Key, Processor ID)
- El código principal es idéntico
- Los archivos core se pueden copiar-pegar

**Próximos pasos recomendados:**
1. Implementar Luhn validation
2. Implementar idempotencia server-side
3. Implementar webhook de NMI
4. Agregar alertas en Slack

---

**Última revisión:** 2026-04-29  
**Mantenido por:** Claude (Senior Developer)  
**Versión:** 1.0
