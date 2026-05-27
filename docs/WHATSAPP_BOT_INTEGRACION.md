# 🤖 Integración WhatsApp Bot - BiKitchen

## Resumen
Los mensajes de WhatsApp de la página web han sido optimizados para activar automáticamente los flujos del bot.

## Número de WhatsApp
- **Principal:** `50685067200`
- **Alternativo:** `50688311500`

---

## 📋 Mapeo de Botones → Flujos del Bot

> **⚠️ IMPORTANTE:** Cada flujo del bot tiene keywords ÚNICAS. NO mezclar keywords.
> - Si usas "Hola" → activa flujo de BIENVENIDA
> - Si usas "Pack Semanal" → activa flujo de PACK SEMANAL
> - NO combinar ambas en el mismo mensaje

### Botones que activan flujos del bot

| Ubicación | Mensaje Enviado | Flujo del Bot |
|-----------|-----------------|---------------|
| Botón flotante WhatsApp | `Hola 👋` | 🌿 Bienvenida |
| Footer (teléfono) | `Hola 👋` | 🌿 Bienvenida |
| LandingPage (CTA) | `Quiero pedir 🛒` | 📝 Quiero Pedir |
| ComoFuncionaPage | `Quiero pedir 🛒` | 📝 Quiero Pedir |
| FAQPage (contacto) | `Hola 👋` | 🌿 Bienvenida |
| ComparadorPage | `Información General ℹ️` | ℹ️ Información General |

### Promociones (activan flujos específicos)

| Promoción | Mensaje Enviado | Flujo del Bot |
|-----------|-----------------|---------------|
| Mensual con Desayunos | `Promoción Mensual 🎁` | 🎁 Promoción Mensual |
| Pack Quincenal | `Pack Quincenal 📦` | 📦 Pack Quincenal |
| Pack Familiar | `Pack Familiar 👨‍👩‍👧‍👦` | 👨‍👩‍👧‍👦 Pack Familiar |
| Pack Almuerzo + Cena | `Pack Almuerzo y Cena 🍽️` | 🍽️ Pack Almuerzo y Cena |
| Two Pack | `Two Pack 💑` | 💑 Two Pack |
| Ayuda promociones | `Hola 👋` | 🌿 Bienvenida |

### Temporada (Navidad)

| Ubicación | Mensaje Enviado | Flujo del Bot |
|-----------|-----------------|---------------|
| Modal menú navideño | `Pack Navideño 🎄` | 🎄 Pack Navideño |

### Mensajes que van a HUMANOS (no activan bot)

Estos mensajes incluyen "Hola," seguido de contexto específico para que el equipo entienda la consulta:

| Ubicación | Mensaje Enviado | Destino |
|-----------|-----------------|---------|
| LoginPage (ayuda) | `Hola, necesito ayuda con mi cuenta 🔐` | Humano |
| TerminosPage | `Hola, tengo una consulta 💬` | Humano |
| MisPedidosPage | `Hola, tengo una consulta sobre mi pedido #ORD-XXXX 📦` | Humano |
| OrderTracking | `Hola, tengo una consulta sobre mi pedido 📦` | Humano |
| TestimonialsSection | `Hola, quiero compartir mi experiencia ⭐` | Humano |
| Checkout SINPE | `Hola, acabo de hacer el SINPE para mi pedido #ORD-XXXX ✅` | Humano |
| Checkout Transfer | `Hola, acabo de hacer la transferencia para mi pedido #ORD-XXXX ✅` | Humano |
| Checkout WhatsApp | `Hola, quiero coordinar el pago de mi pedido #ORD-XXXX 💳` | Humano |

> **Nota:** Los mensajes para humanos usan "Hola," (con coma) seguido de contexto. El bot responderá con bienvenida pero el equipo verá el contexto completo.

---

## 🔑 Keywords del Bot (Referencia Rápida)

### Menú Principal
- `hola`, `menu`, `volver`, `inicio` → Bienvenida

### Packs por Duración
- `semanal`, `pack semanal` → Pack Semanal
- `quincenal`, `pack quincenal` → Pack Quincenal
- `mensual`, `pack mensual` → Pack Mensual

### Packs Especiales
- `navidad`, `navideño`, `pack navideño` → Pack Navideño
- `familiar`, `pack familiar` → Pack Familiar
- `almuerzo`, `almuerzo y cena` → Pack Almuerzo y Cena
- `parejas`, `two pack`, `para dos` → Two Pack
- `proteinas`, `proteínas` → Pack de Proteínas

### Tipos de Menú
- `sin carbos` → Sin Carbos
- `bajo calorias`, `light` → Bajo en Calorías
- `regular`, `normal` → Regular
- `casaditos`, `casado` → Casaditos
- `full pack`, `completo` → Full Pack
- `vegetariano`, `veggie` → Vegetariano
- `keto`, `cetogenico` → Keto

### Información
- `entrega`, `dias de entrega` → Días de Entrega
- `zonas`, `cobertura` → Zonas de Cobertura
- `info`, `informacion` → Información General
- `recomendaciones`, `conservar` → Recomendaciones

### Pedidos
- `quiero pedir`, `ordenar`, `comprar` → Quiero Pedir
- `sí`, `confirmo`, `acepto` → Solicitar Datos

### Promociones
- `promo`, `promocion`, `desayunos gratis` → Promoción Mensual

---

## 📁 Archivos Modificados

1. `src/components/WhatsAppButton.jsx` - Botón flotante → `Hola`
2. `src/components/Footer.jsx` - Footer contacto → `Hola`
3. `src/components/OrderTracking.jsx` - Tracking de pedidos → `Hola`
4. `src/components/TestimonialsSection.jsx` - Sección testimonios → `Hola`
5. `src/components/CheckoutSteps.jsx` - Checkout (SINPE, Transferencia, WhatsApp) → `Hola, ...`
6. `src/pages/LandingPage.jsx` - CTA principal → `Quiero pedir`
7. `src/pages/ComoFuncionaPage.jsx` - CTA → `Quiero pedir`
8. `src/pages/FAQPage.jsx` - Contacto → `Hola`
9. `src/pages/LoginPage.jsx` - Ayuda → `Hola`
10. `src/pages/TerminosPage.jsx` - Contacto → `Hola`
11. `src/pages/ComparadorPage.jsx` - Ayuda → `Información General`
12. `src/pages/PromocionesPage.jsx` - Promociones → Keywords específicas por pack
13. `src/pages/TemporadaPage.jsx` - Menús navideños → `Pack Navideño`
14. `src/pages/MisPedidosPage.jsx` - Mis pedidos → `Hola`

## 📁 Archivos Nuevos

1. `src/config/whatsappMessages.js` - Configuración centralizada de mensajes

---

## ⚠️ Notas Importantes

1. **Consultas de pedidos:** El mensaje incluye el número de orden, por lo que requiere atención humana.

2. **Gift Cards y Referidos:** Estos usan `wa.me/?text=...` (sin número destino) para compartir, no para contactar al bot.

3. **Admin Views:** Los mensajes del panel admin son para atención interna, no pasan por el bot.

4. **Checkout (WhatsApp):** Cuando el usuario elige "WhatsApp" como método de pago, el mensaje incluye detalles del pedido completo para atención humana.

---

## 🔄 Cómo Agregar Nuevos Botones

1. Identificar el flujo del bot que debe activarse
2. Usar la keyword exacta del flujo (ver `docs/FLUJOS_USUARIO.md`)
3. Usar la función `getWhatsAppUrl()` de `src/config/whatsappMessages.js`:

```javascript
import { getWhatsAppUrl, WHATSAPP_MESSAGES } from '../config/whatsappMessages';

// Ejemplo
const url = getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_SEMANAL);
// Resultado: https://wa.me/50685067200?text=Pack%20Semanal
```
