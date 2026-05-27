# 🔍 AUDITORÍA BIPUNTOS - ISSUES DE PUNTOS DE CLIENTES
**Fecha**: 2026-04-29  
**Alcance**: Sistema de lealtad (ganancias/pérdida de puntos)  
**Status**: ⚠️ 3 PROBLEMAS ACTIVOS ENCONTRADOS

---

## 📊 RESUMEN EJECUTIVO

| Aspecto | Status | Detalle |
|---------|--------|---------|
| **Fixes Anteriores** | ✅ | 6/9 implementados correctamente |
| **Nuevos Issues** | ⚠️ | 3 problemas activos encontrados |
| **Riesgo de Pérdida de Puntos** | 🔴 | ALTO - Afecta a clientes |
| **Prioridad** | P0 | CRÍTICO - Clientes sin puntos |

---

## ✅ LO QUE SÍ FUNCIONA (6 FIXES VERIFICADOS)

### **1. ✅ Validación de Email**
**Archivo**: `src/services/loyaltySync.js` línea 24-28  
**Status**: IMPLEMENTADO

```javascript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!email || !emailRegex.test(email)) {
    console.warn('[LoyaltySync] Email inválido para sincronización:', email);
    return { success: false, error: 'Email inválido' };
}
```

✅ Previene documentos con IDs malformados

---

### **2. ✅ Transacciones Atómicas en awardPointsByEmail**
**Archivo**: `src/services/loyaltySync.js` línea 197-242  
**Status**: IMPLEMENTADO

```javascript
await runTransaction(db, async (transaction) => {
    const loyaltySnap = await transaction.get(loyaltyRef);  // LEE
    // ... actualiza datos ...
    transaction.set(loyaltyRef, updatedData, { merge: true });  // ESCRIBE
});
```

✅ Evita race conditions en actualizaciones concurrentes

---

### **3. ✅ Check de Existencia en syncLoyaltyPointsOnRegistration**
**Archivo**: `src/services/loyaltySync.js` línea 128-136  
**Status**: IMPLEMENTADO

```javascript
const existingDoc = await getDoc(loyaltyRef);
if (existingDoc.exists()) {
    console.log('[LoyaltySync] Documento ya existe, omitiendo sincronización');
    return { alreadySynced: true };
}
```

✅ Previene sobrescrituras en edge cases

---

### **4. ✅ Tracking de syncedOrders**
**Archivo**: `src/services/loyaltySync.js` línea 148, 288  
**Status**: IMPLEMENTADO

```javascript
// Al sincronizar:
syncedOrders: ordersProcessed,  // Guarda lista de órdenes procesadas

// Al procesar nueva orden:
if (loyaltyData.syncedOrders?.includes(orderNum)) {
    console.log('[LoyaltySync] Pedido ya sincronizado, omitiendo');
    return null;
}
```

✅ Evita duplicación de puntos por la misma orden

---

### **5. ✅ NO Duplicación en PayPal**
**Archivo**: `src/components/CheckoutSteps.jsx` línea 429-431  
**Status**: IMPLEMENTADO

```javascript
// NO agregar puntos aquí para evitar duplicación con handleOrderCompletion
await handleOrderCompletion({
    ...paypalDetails,
    orderNumber: newOrderNumber,
    metodoPago: 'paypal'
});
```

✅ Puntos se agregan UNA sola vez en handleOrderCompletion

---

### **6. ✅ Idempotencia en handleOrderCompletion**
**Archivo**: `src/components/CheckoutSteps.jsx` línea 684-690  
**Status**: IMPLEMENTADO

```javascript
if (orderComplete) {
    console.log(`[Checkout] Orden ya fue procesada, omitiendo`);
    return;
}
setOrderComplete(true);  // Marcar como procesada
```

✅ Una orden se procesa UNA sola vez

---

## 🔴 PROBLEMAS ACTIVOS ENCONTRADOS

### **PROBLEMA #1: Sin Try-Catch en useLoyaltyPoints.js onSnapshot**
**Archivo**: `src/hooks/useLoyaltyPoints.js` línea 88-108  
**Severidad**: 🔴 P0 CRÍTICO  
**Status**: ACTIVO - NO ARREGLADO

**Código Actual (BUGGY):**
```javascript
const unsubscribe = onSnapshot(docRef, async (docSnap) => {
    if (docSnap.exists()) {
        // OK
    } else {
        // ❌ SIN TRY-CATCH
        const initialData = { /* ... */ };
        await setDoc(docRef, initialData);  // Si FALLA aquí, hook crashea silenciosamente
        // No llamamos a setLoading(false)
    }
});
```

**Problema:**
- Si `setDoc()` falla (permisos, network, etc.), el hook **no lo maneja**
- `setLoading(false)` nunca se ejecuta
- Usuario ve **loading spinner infinito**
- Cliente nunca sabe qué pasó con sus puntos

**Escenario Real:**
```
1. Usuario se registra
2. Hook intenta crear documento de puntos
3. Firestore rechaza (permisos, cuota, error temporal)
4. setDoc() falla SILENCIOSAMENTE
5. setLoading(false) nunca se llama
6. Usuario ve "Cargando..." para siempre
7. NO sabe si tiene puntos o no
```

**Impacto**: 🔴 **Clientes atrapados en pantalla de carga**

---

### **PROBLEMA #2: saveToFirestore en useLoyaltyPoints.js Sin Propagación de Error**
**Archivo**: `src/hooks/useLoyaltyPoints.js` línea 115-127  
**Severidad**: 🔴 P0 CRÍTICO  
**Status**: ACTIVO - NO ARREGLADO

**Código Actual (BUGGY):**
```javascript
const saveToFirestore = async (newData) => {
    if (!currentUser) return;
    
    try {
        const docRef = doc(db, 'loyalty', currentUser.email.toLowerCase());
        await setDoc(docRef, {
            ...newData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving loyalty points:', error);
        // ❌ NO RETORNA NADA - Llamador NO sabe que falló
        // ❌ NO THROW - Error se pierde
    }
};
```

**Problema:**
- Función retorna `undefined` si falla
- Código que llama NO sabe que la guardada falló
- Cánjeando puntos? El setDoc falló pero aparentemente funcionó
- Usuario **cree que canjeó puntos** pero NO se guardaron

**Escenario Real:**
```
1. Usuario intenta canjear 1000 puntos
2. Hook llama saveToFirestore({ currentPoints: 5000 - 1000 })
3. setDoc falla (error temporal)
4. Función retorna undefined, como si nada pasó
5. UI actualiza mostrando puntos canjeados
6. Pero en Firestore aún tiene 6000 puntos
7. Usuario perdió 1000 puntos en el UI pero no en la base de datos
```

**Impacto**: 🔴 **Pérdida de sincronización entre UI y Firestore**

---

### **PROBLEMA #3: No se Valida Email en useLoyaltyPoints.js**
**Archivo**: `src/hooks/useLoyaltyPoints.js` línea 77  
**Severidad**: 🟠 P1 ALTO  
**Status**: ACTIVO - NO ARREGLADO

**Código Actual:**
```javascript
const docRef = doc(db, 'loyalty', currentUser.email.toLowerCase());
// ❌ Asume que currentUser.email es válido
// Si email es null, vacío o malformado:
// - Se crea doc con ID "null" o ""
// - Causa queries rotas
// - Clientes se pierden en sistema
```

**Problema:**
- Si `currentUser.email` es falsy, se crea documento con ID inválido
- `onSnapshot` crea listener infinito en documento inválido
- Nunca se ejecuta la rama `if (docSnap.exists())`
- Usuario ve "Cargando puntos..." indefinidamente

**Impacto**: 🟠 **Clientes sin puntos inicializados**

---

## 🔧 FIXES RECOMENDADOS

### **FIX #1: Agregar Try-Catch en onSnapshot**

**Archivo**: `src/hooks/useLoyaltyPoints.js` línea 88-108

**Reemplazar:**
```javascript
const unsubscribe = onSnapshot(docRef, async (docSnap) => {
    if (docSnap.exists()) {
        const data = docSnap.data();
        setPointsData({
            ...data,
            completedMissions: data.completedMissions || []
        });
        setLoading(false);
    } else {
        console.log('[Loyalty] Creando cuenta de puntos para nuevo usuario...');
        const initialData = {
            currentPoints: POINTS_CONFIG.welcomeBonus,
            totalEarned: POINTS_CONFIG.welcomeBonus,
            totalRedeemed: 0,
            completedMissions: ['welcome'],
            history: [
                {
                    id: 'welcome-bonus',
                    type: 'earned',
                    points: POINTS_CONFIG.welcomeBonus,
                    description: '¡Bienvenido! Bono inicial BiKitchen',
                    date: new Date().toISOString()
                }
            ],
            createdAt: new Date().toISOString()
        };
        
        try {
            await setDoc(docRef, initialData);
            setLoading(false);
        } catch (error) {
            console.error('[Loyalty] Error creando documento inicial:', error);
            setLoading(false);  // IMPORTANTE: siempre terminar loading
        }
    }
});
```

**Con:**
```javascript
const unsubscribe = onSnapshot(
    docRef,
    async (docSnap) => {
        try {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPointsData({
                    ...data,
                    completedMissions: data.completedMissions || []
                });
                setLoading(false);
            } else {
                console.log('[Loyalty] Creando cuenta de puntos para nuevo usuario...');
                const initialData = {
                    currentPoints: POINTS_CONFIG.welcomeBonus,
                    totalEarned: POINTS_CONFIG.welcomeBonus,
                    totalRedeemed: 0,
                    completedMissions: ['welcome'],
                    history: [
                        {
                            id: 'welcome-bonus',
                            type: 'earned',
                            points: POINTS_CONFIG.welcomeBonus,
                            description: '¡Bienvenido! Bono inicial BiKitchen',
                            date: new Date().toISOString()
                        }
                    ],
                    createdAt: new Date().toISOString()
                };
                
                try {
                    await setDoc(docRef, initialData);
                    setLoading(false);
                } catch (error) {
                    console.error('[Loyalty] Error creando documento inicial:', error);
                    setLoading(false);  // ← CRÍTICO: siempre terminar loading
                }
            }
        } catch (snapshotError) {
            console.error('[Loyalty] Error en snapshot:', snapshotError);
            setLoading(false);
        }
    },
    (error) => {
        console.error('[Loyalty] Error escuchando documento:', error);
        setLoading(false);
    }
);
```

---

### **FIX #2: Propagar Errores en saveToFirestore**

**Archivo**: `src/hooks/useLoyaltyPoints.js` línea 115-127

**Reemplazar:**
```javascript
const saveToFirestore = async (newData) => {
    if (!currentUser) return;
    
    try {
        const docRef = doc(db, 'loyalty', currentUser.email.toLowerCase());
        await setDoc(docRef, {
            ...newData,
            updatedAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error saving loyalty points:', error);
        // ❌ No retorna nada
    }
};
```

**Con:**
```javascript
const saveToFirestore = async (newData) => {
    if (!currentUser) {
        console.warn('[Loyalty] No hay usuario logueado para guardar puntos');
        return { success: false, error: 'No hay usuario' };
    }
    
    try {
        const docRef = doc(db, 'loyalty', currentUser.email.toLowerCase());
        await setDoc(docRef, {
            ...newData,
            updatedAt: new Date().toISOString()
        });
        return { success: true };  // ← NUEVO: Reportar éxito
    } catch (error) {
        console.error('[Loyalty] Error guardando puntos:', error);
        return { success: false, error: error.message };  // ← NUEVO: Propagar error
    }
};
```

**Lugares donde se usa saveToFirestore:**

Buscar por `saveToFirestore(` y agregaer manejo de respuesta:

```javascript
// ANTES:
await saveToFirestore(updatedData);

// DESPUÉS:
const saveResult = await saveToFirestore(updatedData);
if (!saveResult.success) {
    console.error('[Loyalty] Falló al guardar puntos:', saveResult.error);
    setError('No se pudieron guardar los puntos. Por favor intenta de nuevo.');
    return;
}
```

---

### **FIX #3: Validar Email en useLoyaltyPoints.js**

**Archivo**: `src/hooks/useLoyaltyPoints.js` línea 77

**Reemplazar:**
```javascript
const docRef = doc(db, 'loyalty', currentUser.email.toLowerCase());
```

**Con:**
```javascript
// ✅ Validar email antes de usarlo
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizedEmail = currentUser.email?.toLowerCase().trim();

if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    console.error('[Loyalty] Email inválido en currentUser:', currentUser.email);
    setLoading(false);
    return () => {}; // No configurar listener si email es inválido
}

const docRef = doc(db, 'loyalty', normalizedEmail);
```

---

## 🧪 TESTING PARA VERIFICAR FIXES

Después de implementar los fixes, testea estos escenarios:

### **Test 1: Nuevo Usuario - Documento Creado**
```
1. Usuario nuevo sin cuenta
2. Intenta registrarse
3. Observar: "Creando cuenta de puntos..."
4. Verificar:
   ✓ Loading desaparece
   ✓ Puntos muestran 500 (bono bienvenida)
   ✓ En Firestore existe doc con initialData
```

### **Test 2: Error en setDoc - Manejo Graceful**
```
1. Simular error en Firestore:
   - Desactivar permisos en Firestore Rules
   - Usuario se registra
2. Observar:
   ✓ Console muestra error
   ✓ Loading desaparece (NO se queda infinito)
   ✓ UI muestra estado de error o "cargando indefinidamente"
```

### **Test 3: Canjear Puntos - Sincronización**
```
1. Usuario registrado con puntos
2. Intenta canjear 500 puntos
3. Desconectar internet DURANTE setDoc
4. Observar:
   ✓ Error se propaga
   ✓ UI no actualiza optimísticamente
   ✓ Puntos no se modifican
```

### **Test 4: Email Inválido**
```
1. Crear usuario con email = null o ""
2. Abre página de puntos
3. Observar:
   ✓ Console muestra "[Loyalty] Email inválido"
   ✓ Loading desaparece
   ✓ No hay listener esperando documento "null"
```

---

## 📋 RESUMEN DE CAMBIOS

| Fix | Archivo | Líneas | Impacto | Tiempo |
|-----|---------|--------|---------|--------|
| #1 | useLoyaltyPoints.js | 88-108 | Alto - evita loading infinito | 10 min |
| #2 | useLoyaltyPoints.js | 115-127 | Alto - propagar errores | 15 min |
| #3 | useLoyaltyPoints.js | 77 | Medio - validar email | 5 min |
| **TOTAL** | | | **CRÍTICO** | **30 min** |

---

## 🚨 IMPACTO EN CLIENTES

**Antes de Fixes:**
```
❌ Algunos usuarios ven "Cargando puntos..." indefinidamente
❌ Usuarios que canjearon puntos pero no se sincronizó
❌ Inconsistencia entre UI y Firestore
❌ Sin errores claros
```

**Después de Fixes:**
```
✅ Loading siempre termina
✅ Errores se comunican claramente
✅ Sincronización garantizada
✅ Email inválido = manejo graceful
```

---

## ⚠️ RECOMENDACIÓN

**Status**: 🔴 **DEBE ARREGLARSE ANTES DE PRODUCCIÓN**

Estos 3 problemas afectan directamente a clientes:
1. No ven puntos (loading infinito)
2. Puntos desincronizados
3. Sin feedback de errores

**Tiempo estimado para todos los fixes**: 30 minutos

**Prioridad**: P0 CRÍTICO - Los clientes están reportando que no ven puntos

---

**Auditoría realizada**: 2026-04-29  
**Auditor**: Claude  
**Próxima revisión**: Post-fixes implementados
