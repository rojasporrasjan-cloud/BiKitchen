# 🔒 Desplegar Reglas de Seguridad de Firebase

## ⚠️ CRÍTICO - Hacer ANTES de lanzar publicidad

Las reglas de seguridad de Firebase protegen tu base de datos de accesos no autorizados. **Sin estas reglas, cualquiera puede leer/modificar/eliminar tus datos.**

---

## 📋 Pasos para Desplegar

### **Opción 1: Desde Firebase Console (Recomendado para primera vez)**

1. **Ir a Firebase Console**
   - Abre: https://console.firebase.google.com
   - Selecciona tu proyecto: `bikitchen-app`

2. **Navegar a Firestore Database**
   - En el menú lateral: `Firestore Database`
   - Click en la pestaña `Rules` (Reglas)

3. **Copiar las reglas**
   - Abre el archivo `firestore.rules` en tu proyecto
   - Copia TODO el contenido

4. **Pegar y publicar**
   - Pega el contenido en el editor de Firebase Console
   - Click en `Publish` (Publicar)
   - Confirma la publicación

5. **Verificar**
   - Las reglas deberían estar activas en menos de 1 minuto
   - Prueba que la app sigue funcionando correctamente

---

### **Opción 2: Desde Firebase CLI (Para desarrolladores)**

```bash
# 1. Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# 2. Login a Firebase
firebase login

# 3. Inicializar proyecto (si no está inicializado)
firebase init firestore

# 4. Desplegar solo las reglas
firebase deploy --only firestore:rules

# 5. Verificar
firebase firestore:rules:list
```

---

## ✅ Verificación Post-Despliegue

### **Pruebas Básicas:**

1. **Como usuario no autenticado:**
   - ✅ Puedes ver productos (packs, menús)
   - ✅ Puedes crear un pedido
   - ❌ NO puedes ver pedidos de otros
   - ❌ NO puedes modificar inventario

2. **Como usuario autenticado:**
   - ✅ Puedes ver TUS pedidos
   - ✅ Puedes crear pedidos
   - ❌ NO puedes ver pedidos de otros usuarios

3. **Como admin:**
   - ✅ Puedes ver TODOS los pedidos
   - ✅ Puedes modificar inventario
   - ✅ Puedes gestionar cupones
   - ✅ Puedes actualizar configuración

---

## 🔍 Cómo Verificar que las Reglas Funcionan

### **Test 1: Intentar acceder a pedidos sin autenticación**

Abre la consola del navegador y ejecuta:

```javascript
// Esto debería FALLAR (permission denied)
const pedidos = await firebase.firestore().collection('pedidos').get();
```

Si ves un error de "permission denied" = ✅ Las reglas funcionan

### **Test 2: Crear un pedido (debería funcionar)**

```javascript
// Esto debería FUNCIONAR
await firebase.firestore().collection('pedidos').add({
  cliente: 'Test',
  total: 10000,
  status: 'pending_payment'
});
```

Si se crea correctamente = ✅ Las reglas permiten crear pedidos

---

## 🚨 Problemas Comunes

### **Error: "Missing or insufficient permissions"**

**Causa:** Las reglas están muy restrictivas o hay un error de sintaxis.

**Solución:**
1. Revisa que el archivo `firestore.rules` no tenga errores de sintaxis
2. Verifica que la función `isAdmin()` esté correctamente definida
3. Asegúrate de que los usuarios admin tengan `role: 'admin'` en su documento

### **Error: "Rules are not deployed"**

**Causa:** Las reglas no se han publicado.

**Solución:**
1. Ve a Firebase Console → Firestore → Rules
2. Verifica que las reglas estén publicadas
3. Espera 1-2 minutos para que se propaguen

### **La app dejó de funcionar después de desplegar**

**Causa:** Reglas demasiado restrictivas.

**Solución temporal:**
1. Ve a Firebase Console → Firestore → Rules
2. Cambia temporalmente a modo test:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 1, 1);
    }
  }
}
```
3. Investiga qué operación está fallando
4. Ajusta las reglas específicas
5. Re-despliega las reglas correctas

---

## 📊 Monitoreo de Reglas

### **Ver intentos de acceso denegados:**

1. Firebase Console → Firestore → Usage
2. Busca "Permission denied" en los logs
3. Identifica patrones de acceso no autorizado

### **Alertas recomendadas:**

- Más de 100 "permission denied" por hora
- Intentos de acceso a colecciones sensibles
- Modificaciones masivas de datos

---

## 🎯 Reglas Implementadas

### **Colecciones Públicas (lectura):**
- ✅ `inventory` - Para mostrar disponibilidad
- ✅ `coupons` - Para validar cupones
- ✅ `promotions` - Para mostrar promociones
- ✅ `config` - Para números de WhatsApp, etc.
- ✅ `menus` - Para mostrar menús
- ✅ `packImages` - Para imágenes de productos

### **Colecciones Protegidas (solo admin):**
- 🔒 `clients` - Base de datos de clientes
- 🔒 `notifications` - Sistema de notificaciones
- 🔒 Escritura en `inventory`, `coupons`, `promotions`

### **Colecciones por Usuario:**
- 👤 `pedidos` - Cada usuario ve solo sus pedidos
- 👤 `users` - Cada usuario ve solo su perfil
- 👤 `savedAddresses` - Direcciones guardadas del usuario
- 👤 `orderHistory` - Historial del usuario
- 👤 `loyaltyPoints` - Puntos del usuario

---

## 🔐 Configurar Usuarios Admin

Para que un usuario tenga permisos de admin:

1. **Ir a Firestore Database**
2. **Navegar a colección `users`**
3. **Encontrar el documento del usuario** (por UID)
4. **Agregar campo:**
   - Campo: `role`
   - Valor: `admin`
   - Tipo: `string`

O desde código (una sola vez):

```javascript
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase/config';

// Hacer admin a un usuario
await setDoc(doc(db, 'users', 'USER_UID_AQUI'), {
  role: 'admin',
  email: 'admin@bikitchen.com',
  name: 'Admin BiKitchen'
}, { merge: true });
```

---

## 📝 Mantenimiento

### **Actualizar reglas:**

1. Modifica `firestore.rules`
2. Despliega con `firebase deploy --only firestore:rules`
3. Prueba que todo funcione
4. Documenta los cambios

### **Backup de reglas:**

Las reglas están en Git, pero también:
- Firebase Console guarda historial de versiones
- Puedes revertir a versiones anteriores

---

## ✅ Checklist Final

Antes de lanzar publicidad, verifica:

- [ ] Reglas desplegadas en Firebase
- [ ] Pedidos se crean correctamente
- [ ] Usuarios no pueden ver pedidos de otros
- [ ] Admin puede ver todos los pedidos
- [ ] Inventario es de solo lectura para público
- [ ] Cupones se validan correctamente
- [ ] No hay errores en la consola del navegador

---

## 🆘 Soporte

Si tienes problemas:
1. Revisa los logs en Firebase Console
2. Verifica la sintaxis de las reglas
3. Prueba en modo test temporalmente
4. Contacta al equipo de desarrollo

**Recuerda:** Es mejor tener reglas muy restrictivas y aflojarlas gradualmente que tener la base de datos abierta.
