# 📱 Sistema de WhatsApp Dinámico

> ## 📌 NÚMERO OFICIAL
>
> **`8506-7200` (`50685067200`)** — es el único número válido de BiKitchen.
>
> Fuente de verdad:
> - **Runtime (manda este):** Firebase `config/contact`, editable en `/admin/whatsapp-config`
> - **Fallback en código:** `WHATSAPP_PHONE` en `src/config/whatsappMessages.js`
> - **JSON-LD estático:** `index.html`
>
> Si el número cambia, hay que actualizar los tres.

## ✅ Qué hace el sistema

Los números de WhatsApp se gestionan desde Firebase en tiempo real: se pueden
cambiar sin volver a desplegar la aplicación. Si Firebase falla, se usa el
valor por defecto del código.

## 📂 Piezas del sistema

### 1. Context de configuración
- **Archivo**: `src/context/ContactConfigContext.jsx`
- Carga la configuración desde Firebase y escucha cambios en tiempo real (`onSnapshot`)
- Crea el documento con valores por defecto si no existe
- Expone `updateWhatsAppPhone()` para cambiar el número

### 2. Hook personalizado
- **Archivo**: `src/hooks/useWhatsApp.js`
- `whatsappPhone` — número principal actual
- `whatsappPhoneAlt` — número alternativo
- `getWhatsAppUrl(mensaje)` — genera la URL con mensaje prellenado
- `getOrderInquiryUrl(numeroOrden)` — URL para consultas de pedidos
- `urls` — URLs pre-construidas de uso común

### 3. Formato del número visible
- **Archivo**: `src/config/whatsappMessages.js`
- `WHATSAPP_PHONE_DISPLAY` y `formatWhatsAppDisplay()` — para textos estáticos
  (SEO, páginas legales) que no pueden leer Firebase

### 4. Documentación
- `docs/WHATSAPP_CONFIG.md` — guía de uso y configuración

## 🔥 Estructura en Firestore

```
📁 config (colección)
  └── 📄 contact (documento)
      ├── whatsappPhone: "50685067200"
      ├── whatsappPhoneAlt: "50688311500"
      └── updatedAt: "2026-08-04T00:00:00.000Z"
```

## 🚀 Cómo cambiar el número

### Opción 1 — Panel de admin (recomendado)
`/admin/whatsapp-config`. Los cambios se reflejan al instante para todos.

### Opción 2 — Firebase Console
`config` → `contact` → editar `whatsappPhone`.

> ⚠️ Cambiar el número en Firebase **no** actualiza los textos estáticos.
> Si el cambio es permanente, actualizar también `WHATSAPP_PHONE` en
> `src/config/whatsappMessages.js` y el JSON-LD de `index.html`.

## 📊 Números

| Propósito | Número | Con código de país |
|-----------|--------|--------------------|
| **Oficial** | 8506-7200 | 50685067200 |
| Alternativo | 8831-1500 | 50688311500 |

> Los números que aparecen en el checkout para **SINPE Móvil**
> (8831-7663 de Gina Marozzi Li y 8831-1500 de Gabriela Li Carmona) son cuentas
> para **recibir el pago**, no líneas de atención. No unificarlos con el oficial.

## 🧪 Verificar

Página de comprobación (solo admin): `/admin/test-whatsapp`.
Muestra el número activo y las URLs generadas. Es de solo lectura.

## 🔒 Seguridad

Las reglas de Firestore deben proteger `config/contact` para que solo un admin
pueda escribirlo. El número de WhatsApp del negocio no debe poder cambiarse
desde el navegador de un visitante.
