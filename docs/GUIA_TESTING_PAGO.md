# 🧪 GUÍA DE TESTING: SISTEMA DE PAGO NMI

**Objetivo**: Validar que todos los 6 fixes funcionan correctamente antes de deploying a producción.  
**Tiempo estimado**: 20-30 minutos  
**Requisitos**: 
- Dev server corriendo: `npm run dev`
- Browser dev tools (F12)
- Acceso a Firebase Console (para verificar idempotencia)

---

## 📋 CHECKLIST DE TESTING

### **TEST 1: Validación Luhn (Tarjeta Inválida)**

**Objetivo**: Verificar que números de tarjeta fake son rechazados

**Pasos**:
```
1. Abre la aplicación en http://localhost:5173
2. Navega a Checkout
3. Selecciona "Tarjeta de Débito/Crédito"
4. Ingresa estos datos:
   - Número: 0000000000000000
   - Expiración: 12/26
   - CVV: 123
   - Nombre: John Doe
5. Click "PROCEDER AL PAGO"
```

**Resultado ESPERADO**: ❌
```
Modal muestra error:
"❌ Número de tarjeta inválido. Verifica los dígitos."

Console (F12):
[NMI] isValidCardNumber() retorna false
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 2: Validación Luhn (Tarjeta Válida)**

**Objetivo**: Verificar que números válidos pasan la validación

**Pasos**:
```
1. Mantén la modal abierta
2. Reemplaza número con: 4111111111111111
3. Mantén otros datos igual
4. Click "PROCEDER AL PAGO"
```

**Resultado ESPERADO**: ✅
```
Modal avanza a pantalla de 3DS
(No aparece error de Luhn)

Console:
[NMI] isValidCardNumber() retorna true
[NMI] 3DS module found: true
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 3: Validación Expiración (Vencida)**

**Objetivo**: Rechazar tarjetas expiradas

**Pasos**:
```
1. Click "REINTENTAR PAGO"
   (Si está en error) O cierra y abre modal de nuevo
2. Ingresa datos:
   - Número: 4111111111111111
   - Expiración: 01/24  (enero 2024 = vencida)
   - CVV: 123
   - Nombre: John Doe
3. Click "PROCEDER AL PAGO"
```

**Resultado ESPERADO**: ❌
```
Modal muestra error:
"❌ Fecha de expiración inválida o vencida. Verifica MM/YY."

Console:
[NMI] isValidExpiration() retorna false
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 4: Validación Expiración (Válida)**

**Objetivo**: Aceptar tarjetas con expiración futura

**Pasos**:
```
1. Click "REINTENTAR PAGO" nuevamente
2. Ingresa datos:
   - Número: 4111111111111111
   - Expiración: 12/26  (diciembre 2026 = válida)
   - CVV: 123
   - Nombre: John Doe
3. Click "PROCEDER AL PAGO"
```

**Resultado ESPERADO**: ✅
```
Modal avanza a pantalla de 3DS
(No aparece error de expiración)

Console:
[NMI] isValidExpiration() retorna true
[NMI] 3DS module found: true
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 5: Validación CVV (Inválido)**

**Objetivo**: Rechazar CVV cortos o inválidos

**Pasos**:
```
1. Click "REINTENTAR PAGO" nuevamente
2. Ingresa datos:
   - Número: 4111111111111111
   - Expiración: 12/26
   - CVV: 12  (solo 2 dígitos = inválido)
   - Nombre: John Doe
3. Click "PROCEDER AL PAGO"
```

**Resultado ESPERADO**: ❌
```
Modal muestra error:
"❌ CVV debe tener 3 o 4 dígitos."

Console:
[NMI] isValidCVV() retorna false
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 6: Validación CVV (Válido)**

**Objetivo**: Aceptar CVV con 3-4 dígitos

**Pasos**:
```
1. Click "REINTENTAR PAGO" nuevamente
2. Ingresa datos:
   - Número: 4111111111111111
   - Expiración: 12/26
   - CVV: 123  (3 dígitos = válido)
   - Nombre: John Doe
3. Click "PROCEDER AL PAGO"
```

**Resultado ESPERADO**: ✅
```
Modal avanza a pantalla de 3DS
(No aparece error de CVV)

Console:
[NMI] isValidCVV() retorna true
[NMI] 3DS module found: true
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 7: Button Disabled State**

**Objetivo**: Verificar que el botón se deshabilita durante procesamiento

**Pasos**:
```
1. Verifica que botón está HABILITADO (naranja brillante)
   - Texto: "✅ PROCEDER AL PAGO"
   
2. Click en el botón
   - Botón cambia a GRIS
   - Texto: "⏳ VERIFICANDO..." O "⏳ PROCESANDO..."
   - Botón NO responde a clicks
   
3. Espera a que se complete 3DS o error
   - Botón vuelve a naranja si error
   - Modal cierra si éxito
```

**Resultado ESPERADO**: ✅
```
Estados observados:
1. Inicial: naranja, clickeable, "PROCEDER AL PAGO"
2. Click: gris, no-clickeable, "VERIFICANDO..."
3. Error: naranja, clickeable, "PROCEDER AL PAGO" nuevamente
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 8: Audit Logging**

**Objetivo**: Verificar que se generan logs estructurados

**Pasos**:
```
1. Abre Browser Developer Tools: F12
2. Ir a pestana "Console"
3. Filtra por "[NMI Audit]"
4. Inicia un pago:
   - Ingresa tarjeta válida
   - Click "PROCEDER AL PAGO"
```

**Resultado ESPERADO**: ✅
```
Logs aparecen en orden:
[NMI Audit] {"timestamp":"...","step":"transaction_start","data":{...}}
[NMI Audit] {"timestamp":"...","step":"3ds_complete","data":{...}}
[NMI Audit] {"timestamp":"...","step":"transaction_response","data":{...}}

Busca por cada uno:
✅ transaction_start    (inicia)
✅ 3ds_complete        (3DS completado)
✅ transaction_response (respuesta NMI)

O si error:
✅ transaction_error   (error details)
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 9: 3DS Field Normalization**

**Objetivo**: Verificar que cardholder_auth se mapea correctamente

**Pasos**:
```
1. Abre Console (F12)
2. Inicia un pago completo
3. Busca por "[NMI] 3DS Complete (normalized):"
```

**Resultado ESPERADO**: ✅
```
Console muestra:
[NMI] 3DS Complete (normalized): {
    cardHolderAuth: "verified" (O vacío)
    threeDsVersion: "2.2.0" (O similar)
    directoryServerId: "..." (O vacío)
    ... otras propiedades
}

Verificar que cardHolderAuth tiene un valor
(NO debe estar "MISSING" o undefined)
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 10: Gateway Retry Reset**

**Objetivo**: Verificar que el gateway se reinicializa en retry

**Pasos**:
```
1. Inicia un pago incompleto que falle
   (Ej: rechazado por banco)
2. Modal muestra error
3. Click "REINTENTAR PAGO"
```

**Resultado ESPERADO**: ✅
```
Console muestra:
[NMI] Prev 3DS UI unmounted successfully.
[NMI] Initializing Gateway with Key: ...
[NMI] Gateway initialized: true

Indicadores:
✅ Nueva inicialización
✅ Gateway nuevo (no corrupto)
✅ Sin errores "Gateway already initialized"
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 11: Idempotencia (Firebase)**

**Objetivo**: Verificar que segundo click con mismo requestId retorna resultado cacheado

**NOTA**: Este test requiere Firebase Console acceso

**Pasos**:
```
1. Abre Firebase Console
2. Ve a Firestore → nmi_requests
3. Inicia un pago exitoso
4. Busca documento por requestId en Firebase
```

**Resultado ESPERADO**: ✅
```
Firestore nmi_requests collection debe tener:
{
    requestId: "ORD-12345-1714406400000-a7x9km2"
    orderid: "ORD-12345"
    result: { response: "1", authcode: "...", ... }
    timestamp: "2026-04-29T17:45:32.123Z"
    ttl: 1714492800000  (24h desde ahora)
}
```

**Simulación de reintento**:
```
En Browser Console:
fetch('/.netlify/functions/nmi-charge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: '15000.00',
    ccnumber: '4111111111111111',
    ccexp: '1226',
    cvv: '123',
    orderid: 'ORD-12345',
    requestId: 'ORD-12345-1714406400000-a7x9km2'  // ← MISMO requestId
  })
}).then(r => r.json()).then(d => console.log(d))

Respuesta esperada:
{
    response: "1",
    authcode: "...",
    _cached: true,  // ← Cacheado!
    _fn_version: "v5-idempotent-20260429"
}
```

**Si funciona**: ✅ TEST PASSED

---

### **TEST 12: Polling (Simulación Timeout)**

**Objetivo**: Verificar que polling funciona después de timeout

**ADVANCED TEST** - Requiere network throttling

**Pasos**:
```
1. Abre Browser DevTools (F12)
2. Ir a "Network" tab
3. Click "Throttling" selector
4. Seleccionar "Slow 3G"
5. Inicia un pago:
   - Ingresa tarjeta válida
   - Click "PROCEDER AL PAGO"
6. Espera ~35 segundos
```

**Resultado ESPERADO**: ✅
```
Observaciones:
- 35s: Cliente timeout (AbortError)
- 35s+: Console muestra:
  [NMI] Cliente timeout (35s). Iniciando polling...
  [NMI Audit] {"step":"client_timeout",...}

- 37s+: Comienzan intentos de polling:
  [NMI] Iniciando polling para orden ORD-12345...
  [NMI] Intento 1 (2s)
  [NMI] Intento 2 (2s)
  [NMI] Intento 3 (2s) ← Encuentra resultado
  
- 41s: Modal muestra success (vía polling)
  [NMI] Polling exitoso en intento 3: APROBADO
  [NMI Audit] {"step":"polling_success","data":{"attempt":3}}

Dinero NO perdido ✅
```

**Si funciona**: ✅ TEST PASSED

---

## ✅ RESULTADO FINAL

```
┌─────────────────────────────────────┐
│   TESTING SUMMARY                   │
├─────────────────────────────────────┤
│ ✅ TEST 1:  Luhn inválido          │
│ ✅ TEST 2:  Luhn válido            │
│ ✅ TEST 3:  Expiración vencida     │
│ ✅ TEST 4:  Expiración válida      │
│ ✅ TEST 5:  CVV inválido           │
│ ✅ TEST 6:  CVV válido             │
│ ✅ TEST 7:  Button disabled state  │
│ ✅ TEST 8:  Audit logging          │
│ ✅ TEST 9:  3DS normalization      │
│ ✅ TEST 10: Gateway retry reset    │
│ ✅ TEST 11: Idempotencia Firebase  │
│ ✅ TEST 12: Polling simulación     │
├─────────────────────────────────────┤
│ TODOS LOS TESTS PASADOS: 12/12 ✅  │
│ SISTEMA LISTO PARA PRODUCCIÓN      │
└─────────────────────────────────────┘
```

---

## 🚀 PRÓXIMO PASO

Si todos los tests pasan:
```bash
npm run build
```

Si build es exitoso → Sistema listo para deploy a producción

---

## 🆘 TROUBLESHOOTING

### **Si TEST 1 falla (Luhn no rechaza 0000000000000000)**
```
Problema: isValidCardNumber() no funciona
Solución: Verificar nmiClient.js línea 12-28
         Asegurar que la lógica Luhn está implementada
Comando:  npm run build  (para recompilar)
```

### **Si TEST 7 falla (Botón no se deshabilita)**
```
Problema: Button sigue clickeable durante loading
Solución: Verificar NMIPaymentModal.jsx línea 430+
         Asegurar que disabled={loading || !gateway || step !== 'card'}
Comando:  npm run build  (para recompilar)
```

### **Si TEST 8 falla (No hay logs [NMI Audit])**
```
Problema: Audit logging no funciona
Solución: Verificar que auditLog() es llamada en nmiClient.js
         Buscar en console.log por [NMI Audit] exactamente
Comando:  npm run dev  (restart dev server)
```

### **Si TEST 11 falla (Firebase nmi_requests no tiene datos)**
```
Problema: Idempotencia no funciona
Solución: Verificar que Firebase está inicializado
         Verificar que saveIdempotencyRecord() se ejecuta
         Verificar que colección existe en Firestore
Comando:  Revisar Firebase Console → Firestore → nmi_requests
```

### **Si TEST 12 falla (Polling no se ejecuta)**
```
Problema: Timeout no activa polling
Solución: Verificar que processTransaction() captura AbortError
         Verificar que nmi-status endpoint es accesible
         Revisar CORS headers en nmi-status.js
Comando:  npm run dev  (restart dev server)
```

---

## 📝 NOTAS

- **Tarjeta de test**: `4111111111111111` (siempre funciona en ambiente de test)
- **Expiración de test**: `12/26` o superior
- **CVV de test**: Cualquier 3-4 dígitos
- **No usar datos reales de tarjeta** durante testing

---

**Testing Guide v1.0**  
**Creado**: 2026-04-29  
**Para**: Sistema de Pago NMI  
**Status**: COMPLETO ✅
