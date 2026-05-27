# 📱 Lista Completa de Botones y Mensajes de WhatsApp

## 📋 Índice por Componente

### ✅ Componentes YA Actualizados (Usan sistema dinámico)

1. **WhatsAppButton** (Botón flotante)
2. **MisPedidosPage** (Consultas de pedidos)
3. **PromocionesPage** (Promociones)
4. **TemporadaPage** (Pack Navideño)

### ⚠️ Componentes PENDIENTES (Aún usan número hardcodeado)

---

## 📍 Detalle de Cada Botón

### 1. **WhatsAppButton.jsx** ✅
**Ubicación**: Botón flotante en todas las páginas (esquina inferior derecha)
- **Mensaje**: `"Hola 👋"`
- **Keyword del bot**: `hola` (activa menú de bienvenida)
- **Estado**: ✅ Ya usa `useWhatsApp()`

---

### 2. **MisPedidosPage.jsx** ✅
**Ubicación**: Página de historial de pedidos
- **Mensaje**: `"Hola, tengo una consulta sobre mi pedido {orderNumber} 📦"`
- **Keyword del bot**: `hola` (va a humano)
- **Estado**: ✅ Ya usa `getOrderInquiryUrl()`

---

### 3. **PromocionesPage.jsx** ✅
**Ubicación**: Página de promociones

#### Botón 1: Consultar Promoción Específica
- **Mensaje**: Variable según la promoción (ej: `"Pack Semanal 📅"`, `"Promoción Mensual 🎁"`)
- **Keyword del bot**: Según el mensaje
- **Estado**: ✅ Ya usa `getWhatsAppUrl()`

#### Botón 2: CTA Final
- **Mensaje**: `"Hola 👋"`
- **Keyword del bot**: `hola`
- **Estado**: ✅ Ya usa `getWhatsAppUrl()`

---

### 4. **TemporadaPage.jsx** ✅
**Ubicación**: Página de menú navideño
- **Mensaje**: `"Pack Navideño 🎄"`
- **Keyword del bot**: `pack navideño` o `navidad`
- **Estado**: ✅ Ya usa `getWhatsAppUrl()`

---

### 5. **LandingPage.jsx** ⚠️
**Ubicación**: Página principal (home)
- **Mensaje**: `"Quiero pedir 🛒"`
- **Keyword del bot**: `quiero pedir` (activa flujo de pedidos)
- **Estado**: ⚠️ Usa `WHATSAPP_PHONE` hardcodeado
- **Línea**: 42

**Cómo actualizar**:
```javascript
// Antes
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_PHONE}?text=Quiero%20pedir%20%F0%9F%9B%92`;

// Después
import { useWhatsApp } from '../hooks/useWhatsApp';
// Dentro del componente:
const { getWhatsAppUrl } = useWhatsApp();
const WHATSAPP_LINK = getWhatsAppUrl('Quiero pedir 🛒');
```

---

### 6. **ComoFuncionaPage.jsx** ⚠️
**Ubicación**: Página "Cómo funciona"
- **Mensaje**: `"Quiero pedir 🛒"`
- **Keyword del bot**: `quiero pedir`
- **Estado**: ⚠️ Usa `WHATSAPP_PHONE` hardcodeado
- **Línea**: 29

**Cómo actualizar**: Igual que LandingPage

---

### 7. **FAQPage.jsx** ⚠️
**Ubicación**: Página de preguntas frecuentes
- **Mensaje**: `"Hola 👋"`
- **Keyword del bot**: `hola`
- **Estado**: ⚠️ Usa `WHATSAPP_PHONE` hardcodeado
- **Línea**: 457

**Cómo actualizar**:
```javascript
import { useWhatsApp } from '../hooks/useWhatsApp';
// Dentro del componente:
const { getWhatsAppUrl } = useWhatsApp();
// En el href:
href={getWhatsAppUrl('Hola 👋')}
```

---

### 8. **ComparadorPage.jsx** ⚠️
**Ubicación**: Página comparador de packs
- **Mensaje**: `"Información General ℹ️"`
- **Keyword del bot**: `información general`
- **Estado**: ⚠️ Usa `WHATSAPP_PHONE` hardcodeado
- **Línea**: 615

---

### 9. **TerminosPage.jsx** ⚠️
**Ubicación**: Página de términos y condiciones
- **Mensaje**: `"Hola, tengo una consulta 💬"`
- **Keyword del bot**: `hola`
- **Estado**: ⚠️ Usa `WHATSAPP_PHONE` hardcodeado
- **Línea**: 168

---

### 10. **LoginPage.jsx** ⚠️
**Ubicación**: Página de login (enlace de ayuda)
- **Mensaje**: `"Hola, necesito ayuda con mi cuenta 🔐"`
- **Keyword del bot**: `hola`
- **Estado**: ⚠️ Usa `WHATSAPP_PHONE` hardcodeado
- **Línea**: 259

---

### 11. **Footer.jsx** ⚠️
**Ubicación**: Footer en todas las páginas
- **Mensaje**: `"Hola 👋"` (probablemente)
- **Keyword del bot**: `hola`
- **Estado**: ⚠️ Usa `WHATSAPP_PHONE` hardcodeado
- **Línea**: ~118

---

### 12. **GiftCardsPage.jsx** ⚠️
**Ubicación**: Página de tarjetas de regalo
- **Tipo**: Compartir (sin número específico)
- **Mensaje**: Dinámico con información de la tarjeta
- **Estado**: ⚠️ Usa `wa.me/?text=` (compartir)
- **Línea**: 59
- **Nota**: Este NO necesita actualización porque es para compartir, no para contactar

---

### 13. **ReferidosPage.jsx** ⚠️
**Ubicación**: Página de referidos
- **Tipo**: Compartir (sin número específico)
- **Mensaje**: Código de referido
- **Estado**: ⚠️ Usa `wa.me/?text=` (compartir)
- **Línea**: 45
- **Nota**: Este NO necesita actualización porque es para compartir

---

### 14. **Admin - OrdersView.jsx** ⚠️
**Ubicación**: Panel de administración - Vista de pedidos
- **Mensaje**: Dinámico según el pedido
- **Estado**: ⚠️ Usa número del cliente, no de BiKitchen
- **Líneas**: 992, 1219
- **Nota**: Estos son para contactar CLIENTES, no necesitan actualización

---

### 15. **Admin - DeliveryView.jsx** ⚠️
**Ubicación**: Panel de administración - Vista de entregas
- **Mensaje**: Para contactar repartidores
- **Estado**: ⚠️ Usa número del repartidor
- **Línea**: 255
- **Nota**: Este es para contactar REPARTIDORES, no necesita actualización

---

## 📊 Resumen de Estado

| Componente | Estado | Prioridad | Mensaje |
|------------|--------|-----------|---------|
| WhatsAppButton | ✅ Actualizado | - | "Hola 👋" |
| MisPedidosPage | ✅ Actualizado | - | "Consulta pedido {#}" |
| PromocionesPage | ✅ Actualizado | - | Variable |
| TemporadaPage | ✅ Actualizado | - | "Pack Navideño 🎄" |
| **LandingPage** | ⚠️ Pendiente | 🔴 Alta | "Quiero pedir 🛒" |
| **ComoFuncionaPage** | ⚠️ Pendiente | 🔴 Alta | "Quiero pedir 🛒" |
| **FAQPage** | ⚠️ Pendiente | 🟡 Media | "Hola 👋" |
| **ComparadorPage** | ⚠️ Pendiente | 🟡 Media | "Información General ℹ️" |
| **TerminosPage** | ⚠️ Pendiente | 🟢 Baja | "Hola, tengo una consulta 💬" |
| **LoginPage** | ⚠️ Pendiente | 🟢 Baja | "Hola, necesito ayuda 🔐" |
| **Footer** | ⚠️ Pendiente | 🟡 Media | "Hola 👋" |
| GiftCardsPage | ✅ OK | - | Compartir (no necesita cambio) |
| ReferidosPage | ✅ OK | - | Compartir (no necesita cambio) |
| Admin Views | ✅ OK | - | Contacto clientes/repartidores |

---

## 🎯 Prioridades de Actualización

### 🔴 ALTA PRIORIDAD (Páginas principales)
1. **LandingPage.jsx** - Página principal
2. **ComoFuncionaPage.jsx** - Página importante de conversión

### 🟡 MEDIA PRIORIDAD (Páginas de soporte)
3. **Footer.jsx** - Aparece en todas las páginas
4. **FAQPage.jsx** - Página de ayuda
5. **ComparadorPage.jsx** - Herramienta de comparación

### 🟢 BAJA PRIORIDAD (Páginas secundarias)
6. **TerminosPage.jsx** - Página legal
7. **LoginPage.jsx** - Solo enlace de ayuda

---

## 📝 Mensajes Configurados en `whatsappMessages.js`

Todos estos mensajes están optimizados para activar flujos específicos del bot:

```javascript
BIENVENIDA: 'Hola 👋'                    // Menú principal
PACK_SEMANAL: 'Pack Semanal 📅'          // Flujo pack semanal
PACK_QUINCENAL: 'Pack Quincenal 📦'      // Flujo pack quincenal
PACK_MENSUAL: 'Pack Mensual 📅'          // Flujo pack mensual
PACK_NAVIDENO: 'Pack Navideño 🎄'        // Flujo navideño
PACK_FAMILIAR: 'Pack Familiar 👨‍👩‍👧‍👦'     // Flujo familiar
PACK_ALMUERZO_CENA: 'Pack Almuerzo y Cena 🍽️'
TWO_PACK: 'Two Pack 💑'                  // Flujo parejas
PACK_PROTEINAS: 'Pack de Proteínas 🍗'   // Flujo proteínas
DIAS_ENTREGA: 'Días de Entrega 🚚'       // Info entregas
ZONAS_COBERTURA: 'Zonas de Cobertura 📍' // Info zonas
INFORMACION: 'Información General ℹ️'    // Info general
PROMOCION_MENSUAL: 'Promoción Mensual 🎁' // Promo del mes
QUIERO_PEDIR: 'Quiero pedir 🛒'          // Flujo de pedido
AYUDA_GENERAL: 'Hola, tengo una consulta 💬'
AYUDA_CUENTA: 'Hola, necesito ayuda con mi cuenta 🔐'
```

---

## 🔧 Cómo Editar los Mensajes

### Para componentes YA actualizados:
Edita el archivo `src/config/whatsappMessages.js`:

```javascript
export const WHATSAPP_MESSAGES = {
    BIENVENIDA: 'Hola 👋',  // Cambia aquí
    PACK_SEMANAL: 'Pack Semanal 📅',  // O aquí
    // etc...
};
```

### Para componentes PENDIENTES:
Primero actualízalos para usar `useWhatsApp()`, luego edita `whatsappMessages.js`.

---

## 📞 Contacto

Si necesitas ayuda para actualizar algún componente, consulta:
- `docs/WHATSAPP_CONFIG.md` - Guía completa
- `src/hooks/useWhatsApp.js` - Código del hook
- `src/context/ContactConfigContext.jsx` - Context de configuración
