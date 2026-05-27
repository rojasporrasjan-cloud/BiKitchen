# 📱 Cambio de Número de WhatsApp a Producción

## ✅ Cambios Realizados

El número de WhatsApp ha sido actualizado de **6081-3117** (pruebas) a **8733-3231** (producción).

---

## 🔧 Archivos Modificados

### 1. `src/context/ContactConfigContext.jsx`
- ✅ Número por defecto: `50687333231`
- ✅ Fallback actualizado
- ✅ Inicialización con número de producción

### 2. `src/config/whatsappMessages.js`
- ✅ Constante `WHATSAPP_PHONE`: `50687333231`
- ✅ Comentarios actualizados

### 3. `src/utils/updateWhatsAppNumber.js` (NUEVO)
- ✅ Script para actualizar Firebase
- ✅ Disponible en consola del navegador

---

## 🚀 Cómo Aplicar el Cambio

### Opción 1: Script Automático (Recomendado)

1. **Abre tu aplicación en el navegador**
   ```
   http://localhost:5173
   ```

2. **Abre la consola del navegador**
   - Windows: `F12` o `Ctrl + Shift + J`
   - Mac: `Cmd + Option + J`

3. **Ejecuta el comando:**
   ```javascript
   await window.updateWhatsAppToProduction()
   ```

4. **Confirma el mensaje**
   - Aparecerá un alert confirmando el cambio
   - La página se recargará automáticamente

5. **¡Listo!** ✅
   - Todos los botones de WhatsApp usarán el nuevo número

---

### Opción 2: Manual en Firebase Console

1. **Ve a Firebase Console:**
   ```
   https://console.firebase.google.com
   ```

2. **Selecciona tu proyecto BiKitchen**

3. **Ve a Firestore Database**

4. **Navega a:**
   ```
   config → contact
   ```

5. **Edita el campo `whatsappPhone`:**
   ```
   Valor anterior: 50660813117
   Valor nuevo: 50687333231
   ```

6. **Guarda los cambios**

7. **Recarga tu aplicación**

---

## 📊 Dónde se Aplica el Cambio

El nuevo número **8733-3231** se usará en:

### ✅ Componentes:
- Botón flotante de WhatsApp
- Footer (contacto)
- Navbar (contacto)

### ✅ Páginas:
- Landing Page (CTAs)
- Packs Page (botones de contacto)
- Catálogo (botones de consulta)
- Promociones (botones de WhatsApp)
- Checkout (instrucciones de pago)
- Mis Pedidos (seguimiento)
- FAQ (contacto)

### ✅ Funcionalidades:
- Mensajes prellenados
- Links de contacto
- Botones de consulta
- Seguimiento de pedidos

---

## 🔍 Verificación

Para confirmar que el cambio funcionó:

### 1. Inspeccionar en Consola:
```javascript
// Ver número actual
console.log(window.updateWhatsAppToProduction);
```

### 2. Verificar en Firebase:
- Firestore → `config/contact` → `whatsappPhone`
- Debe mostrar: `50687333231`

### 3. Probar Botones:
- Click en cualquier botón de WhatsApp
- Debe abrir WhatsApp con el número: **8733-3231**

---

## 📱 Formato del Número

### Número Completo:
```
+506 8733-3231
```

### En Firebase:
```
50687333231
```

### En WhatsApp URL:
```
https://wa.me/50687333231?text=...
```

---

## 🔄 Sistema de Configuración

### Cómo Funciona:

1. **Firebase como fuente de verdad:**
   - El número se guarda en `config/contact`
   - Cambios en Firebase se reflejan en tiempo real

2. **Context Provider:**
   - `ContactConfigContext` escucha cambios
   - Actualiza todos los componentes automáticamente

3. **Hook personalizado:**
   - `useWhatsApp()` obtiene el número actual
   - Genera URLs de WhatsApp con mensajes

4. **Fallback:**
   - Si Firebase falla, usa número por defecto
   - Número por defecto ahora es `50687333231`

---

## 🎯 Ventajas del Sistema

### ✅ Centralizado:
- Un solo lugar para cambiar el número
- No hay que modificar código

### ✅ Tiempo Real:
- Cambios se aplican inmediatamente
- No requiere redeploy

### ✅ Flexible:
- Fácil cambiar entre números
- Soporta múltiples números (principal y alternativo)

### ✅ Seguro:
- Fallback si Firebase falla
- No rompe la aplicación

---

## 📝 Historial de Números

### Números Anteriores:
```
6081-3117 (50660813117) - Pruebas
8506-7200 (50685067200) - Producción antigua
```

### Número Actual:
```
8733-3231 (50687333231) - Producción ✅
```

### Número Alternativo:
```
8831-1500 (50688311500) - Alternativo
```

---

## 🚨 Importante

### ⚠️ Después del Cambio:

1. **Verifica todos los botones de WhatsApp**
2. **Prueba el flujo completo de pedido**
3. **Confirma que los mensajes lleguen al número correcto**
4. **Actualiza cualquier material de marketing con el nuevo número**

### ⚠️ Si Algo Sale Mal:

Para revertir al número anterior:
```javascript
// En consola del navegador
const { doc, setDoc } = await import('firebase/firestore');
const { db } = await import('./firebase/config');

await setDoc(doc(db, 'config', 'contact'), {
    whatsappPhone: '50660813117', // Número anterior
    whatsappPhoneAlt: '50688311500',
    updatedAt: new Date().toISOString()
});

window.location.reload();
```

---

## 📞 Contacto de Soporte

Si tienes problemas con el cambio:
- Revisa la consola del navegador para errores
- Verifica que Firebase esté conectado
- Confirma que tienes permisos en Firestore

---

**Última actualización:** 19 de diciembre, 2024  
**Estado:** ✅ Actualizado a producción  
**Número actual:** 8733-3231 (50687333231)
