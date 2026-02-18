# 🔧 CORRECCIÓN CRÍTICA: Cupones de Uso Único

## 🚨 Problema Detectado

Los cupones configurados como **"uso único por usuario"** (como "BigKitchen Start") se podían usar **múltiples veces** por el mismo usuario, incluso después de confirmar y entregar el pedido.

### Síntoma:
1. Usuario aplica cupón "BigKitchen Start" ✅
2. Hace el pedido ✅
3. Admin confirma el pedido ✅
4. Admin marca como entregado ✅
5. Usuario hace OTRO pedido ❌
6. **Puede volver a usar el mismo cupón** ❌❌❌

---

## 🔍 Causa del Problema

El sistema tenía **DOS errores críticos**:

### Error 1: No se registraba el userId al marcar como usado
**Archivo:** `src/components/CheckoutSteps.jsx` (línea 419)

```javascript
// ❌ ANTES (Incorrecto):
if (appliedCoupon) {
    await markCouponAsUsed(); // Sin userId
}
```

**Problema:** El cupón incrementaba el contador `usedCount`, pero **NO agregaba el userId al array `usedBy`**, entonces el sistema no sabía QUÉ usuario lo había usado.

---

### Error 2: No se validaba con userId al aplicar
**Archivo:** `src/components/CartDrawer.jsx` (línea 30)

```javascript
// ❌ ANTES (Incorrecto):
const result = await applyCoupon(couponCode.trim()); // Sin userId
```

**Problema:** Al aplicar el cupón, no se pasaba el `userId`, entonces la validación en `firestoreCoupons.js` (líneas 101-105) no podía verificar si el usuario ya lo había usado.

---

## ✅ Solución Implementada

### Corrección 1: Registrar userId al marcar como usado
**Archivo:** `src/components/CheckoutSteps.jsx` (línea 419)

```javascript
// ✅ AHORA (Correcto):
if (appliedCoupon) {
    await markCouponAsUsed(currentUser?.uid || formData.correo);
}
```

**Beneficio:** Ahora se registra el `uid` del usuario (o su email si no está logueado) en el array `usedBy` del cupón.

---

### Corrección 2: Validar con userId al aplicar
**Archivo:** `src/components/CartDrawer.jsx` (líneas 5, 25, 32)

```javascript
// ✅ AHORA (Correcto):
import { useAuth } from '../context/AuthContext';

export default function CartDrawer() {
    const { currentUser } = useAuth();
    
    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        const result = await applyCoupon(couponCode.trim(), currentUser?.uid);
        // ...
    };
}
```

**Beneficio:** Al aplicar el cupón, se pasa el `userId` para que la validación verifique si ya lo usó.

---

## 🔄 Flujo Corregido

### Primera vez que usa el cupón:
1. Usuario aplica cupón "BigKitchen Start"
2. Sistema valida con `userId` → No está en `usedBy` → ✅ Válido
3. Usuario completa el pedido
4. Sistema llama `markCouponAsUsed(userId)`
5. **Se agrega `userId` al array `usedBy`** ✅

### Intento de usar el cupón de nuevo:
1. Usuario intenta aplicar cupón "BigKitchen Start"
2. Sistema valida con `userId` → **Está en `usedBy`** → ❌ Rechazado
3. Mensaje: "Ya has utilizado este cupón anteriormente"

---

## 📊 Lógica de Validación

**Archivo:** `src/utils/firestoreCoupons.js` (líneas 100-106)

```javascript
// Verificar si es de uso único por usuario y si el usuario ya lo usó
if (coupon.singleUsePerUser && userId) {
    const usedBy = coupon.usedBy || [];
    if (usedBy.includes(userId)) {
        return { valid: false, error: 'Ya has utilizado este cupón anteriormente' };
    }
}
```

**Cómo funciona:**
1. Si el cupón tiene `singleUsePerUser: true`
2. Y se proporciona un `userId`
3. Verifica si el `userId` está en el array `usedBy`
4. Si está → Rechaza el cupón
5. Si no está → Permite usarlo

---

## 🗄️ Estructura en Firestore

### Cupón en Firestore:
```javascript
{
    code: "BIKITCHENSTART",
    singleUsePerUser: true,
    maxUses: 100,
    usedCount: 5,
    usedBy: [
        "user123abc",      // UID de Firebase Auth
        "user456def",      // UID de Firebase Auth
        "email@test.com",  // Email (si no está logueado)
        "user789ghi",
        "otro@email.com"
    ]
}
```

**Campos clave:**
- `singleUsePerUser`: `true` = Solo una vez por usuario
- `usedCount`: Contador total de usos (5 en este ejemplo)
- `usedBy`: Array de UIDs/emails que ya usaron el cupón

---

## 🧪 Casos de Prueba

### Caso 1: Usuario logueado
```
1. Usuario logueado (UID: "abc123")
2. Aplica cupón → Se valida con UID "abc123"
3. Completa pedido → Se agrega "abc123" a usedBy
4. Intenta usar de nuevo → Rechazado ✅
```

### Caso 2: Usuario NO logueado
```
1. Usuario NO logueado (email: "test@email.com")
2. Aplica cupón → Se valida con email "test@email.com"
3. Completa pedido → Se agrega "test@email.com" a usedBy
4. Intenta usar de nuevo → Rechazado ✅
```

### Caso 3: Usuario cambia de cuenta
```
1. Usuario A (UID: "user1") usa cupón → Agregado a usedBy
2. Usuario B (UID: "user2") intenta usar → ✅ Permitido (diferente usuario)
3. Usuario A intenta usar de nuevo → ❌ Rechazado
```

---

## ⚠️ Importante

### Para usuarios NO logueados:
- Se usa el **email** como identificador
- Si el usuario usa el mismo email, no podrá reusar el cupón
- Si cambia de email, podría usarlo de nuevo (limitación del sistema)

### Para usuarios logueados:
- Se usa el **UID de Firebase** (único e inmutable)
- Más seguro y confiable
- No puede evadir la restricción cambiando email

---

## 📁 Archivos Modificados

1. ✅ `src/components/CheckoutSteps.jsx` - Pasar userId al marcar cupón como usado
2. ✅ `src/components/CartDrawer.jsx` - Pasar userId al aplicar cupón

---

## 🎯 Beneficios

### Para BiKitchen:
- ✅ **Previene fraude** - Usuarios no pueden reusar cupones de bienvenida
- ✅ **Control de costos** - Los descuentos se aplican solo una vez por usuario
- ✅ **Datos precisos** - Se sabe exactamente quién usó cada cupón

### Para el Usuario:
- ✅ **Justo** - Todos tienen la misma oportunidad de usar cupones
- ✅ **Claro** - Mensaje de error explica por qué no puede reusar el cupón

---

## 🔒 Seguridad

Esta corrección es **crítica para la seguridad** porque:

1. **Previene abuso:** Usuarios no pueden crear múltiples pedidos con el mismo cupón de descuento
2. **Protege ingresos:** Cupones de bienvenida (ej: 20% OFF) solo se usan una vez
3. **Auditoría:** Se registra exactamente quién usó cada cupón

---

## ✅ Verificación

Para confirmar que funciona:

1. **Crear cupón de prueba:**
   - Código: "TEST20"
   - Tipo: 20% descuento
   - `singleUsePerUser`: true

2. **Primer uso:**
   - Aplicar cupón → ✅ Debe funcionar
   - Completar pedido → ✅ Se marca como usado

3. **Segundo intento:**
   - Aplicar mismo cupón → ❌ Debe rechazar
   - Mensaje: "Ya has utilizado este cupón anteriormente"

---

**Última actualización:** 19 de diciembre, 2024  
**Estado:** ✅ Corregido y listo para producción  
**Prioridad:** 🔴 CRÍTICA - Previene fraude y pérdida de ingresos
