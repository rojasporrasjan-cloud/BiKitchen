# 📱 LISTA COMPLETA DE BOTONES DE WHATSAPP Y SUS MENSAJES

## 🎯 Para Configurar con el Bot de WhatsApp

---

## ✅ BOTONES ACTIVOS (Listos para configurar con el bot)

### 1. **Botón Flotante "Escríbenos"** 
📍 **Ubicación:** Todas las páginas (esquina inferior derecha)  
💬 **Mensaje actual:** `"Hola 👋 Me gustaría conocer los packs disponibles"`  
🤖 **Keyword del bot:** `hola` (activa menú de bienvenida)  
📄 **Archivo:** `src/components/WhatsAppButton.jsx`

**Profesional y contextual:** El cliente indica que quiere ver opciones.

---

### 2. **Botón en Landing Page (Página Principal)**
📍 **Ubicación:** Página principal - Hero section  
💬 **Mensaje actual:** `"Hola, quiero hacer un pedido 🛒"`  
🤖 **Keyword del bot:** `quiero pedir` (activa flujo de pedidos)  
📄 **Archivo:** `src/pages/LandingPage.jsx`

**Profesional:** Indica claramente la intención de hacer un pedido.

---

### 3. **Botón en "Cómo Funciona"**
📍 **Ubicación:** Página "Cómo funciona"  
💬 **Mensaje actual:** `"Hola, quiero hacer un pedido 🛒"`  
🤖 **Keyword del bot:** `quiero pedir`  
📄 **Archivo:** `src/pages/ComoFuncionaPage.jsx`

**Profesional:** Consistente con landing page.

---

### 4. **Botón en Promociones - Consultar Promo Específica**
📍 **Ubicación:** Página de promociones - Cada tarjeta de promoción  
💬 **Mensaje actual:** Variable según la promoción:
- `"Pack Semanal 📅"`
- `"Pack Quincenal 📦"`
- `"Pack Mensual 📅"`
- `"Promoción Mensual 🎁"`
- `"Pack Familiar 👨‍👩‍👧‍👦"`
- `"Pack Almuerzo y Cena 🍽️"`

🤖 **Keywords del bot:** Cada mensaje activa su flujo específico  
📄 **Archivo:** `src/pages/PromocionesPage.jsx`

**Sugerencia:** Cada promoción activa su flujo específico del bot.

---

### 5. **Botón en Promociones - CTA Final**
📍 **Ubicación:** Página de promociones - Botón final "Consultar por WhatsApp"  
💬 **Mensaje actual:** `"Hola 👋"`  
🤖 **Keyword del bot:** `hola`  
📄 **Archivo:** `src/pages/PromocionesPage.jsx`

**Sugerencia:** Podrías cambiar a `"Quiero pedir 🛒"` para ir directo al pedido.

---

### 6. **Botón en Temporada (Navidad)**
📍 **Ubicación:** Página de menú navideño  
💬 **Mensaje actual:** `"Pack Navideño 🎄"`  
🤖 **Keyword del bot:** `pack navideño` o `navidad`  
📄 **Archivo:** `src/pages/TemporadaPage.jsx`

**Sugerencia:** Perfecto para activar flujo navideño.

---

### 7. **Botón en Mis Pedidos - Consultar Pedido**
📍 **Ubicación:** Página de historial de pedidos  
💬 **Mensaje actual:** `"Hola, tengo una consulta sobre mi pedido {NÚMERO} 📦"`  
🤖 **Keyword del bot:** `hola` (va a atención humana)  
📄 **Archivo:** `src/pages/MisPedidosPage.jsx`

**Sugerencia:** Este debe ir a humano, está bien con "Hola".

---

### 8. **Botón en FAQ (Preguntas Frecuentes)**
📍 **Ubicación:** Página de preguntas frecuentes  
💬 **Mensaje actual:** `"Hola 👋"`  
🤖 **Keyword del bot:** `hola`  
📄 **Archivo:** `src/pages/FAQPage.jsx`

**Sugerencia:** Podrías cambiar a `"Hola, tengo una consulta 💬"` para ser más específico.

---

### 9. **Botón en Comparador de Packs**
📍 **Ubicación:** Página comparador de packs  
💬 **Mensaje actual:** `"Información General ℹ️"`  
🤖 **Keyword del bot:** `información general`  
📄 **Archivo:** `src/pages/ComparadorPage.jsx`

**Sugerencia:** Activa flujo de información general del bot.

---

### 10. **Botón en Términos y Condiciones**
📍 **Ubicación:** Página de términos y condiciones  
💬 **Mensaje actual:** `"Hola, tengo una consulta 💬"`  
🤖 **Keyword del bot:** `hola`  
📄 **Archivo:** `src/pages/TerminosPage.jsx`

**Sugerencia:** Va a atención humana, está bien.

---

### 11. **Botón en Login - Ayuda con Cuenta**
📍 **Ubicación:** Página de login (enlace de ayuda)  
💬 **Mensaje actual:** `"Hola, necesito ayuda con mi cuenta 🔐"`  
🤖 **Keyword del bot:** `hola`  
📄 **Archivo:** `src/pages/LoginPage.jsx`

**Sugerencia:** Va a atención humana, está bien.

---

### 12. **Botón en Footer**
📍 **Ubicación:** Footer en todas las páginas  
💬 **Mensaje actual:** `"Hola 👋"` (probablemente)  
🤖 **Keyword del bot:** `hola`  
📄 **Archivo:** `src/components/Footer.jsx`

**Sugerencia:** Menú principal del bot, está bien.

---

## 📊 RESUMEN POR TIPO DE MENSAJE

### Mensajes que activan MENÚ PRINCIPAL del bot:
- ✅ Botón flotante: `"Hola 👋"`
- ✅ FAQ: `"Hola 👋"`
- ✅ Promociones CTA: `"Hola 👋"`
- ✅ Footer: `"Hola 👋"`

### Mensajes que activan FLUJO DE PEDIDO:
- ✅ Landing Page: `"Quiero pedir 🛒"`
- ✅ Cómo Funciona: `"Quiero pedir 🛒"`

### Mensajes que activan FLUJOS ESPECÍFICOS:
- ✅ Promociones: Variable según pack
- ✅ Temporada: `"Pack Navideño 🎄"`
- ✅ Comparador: `"Información General ℹ️"`

### Mensajes para ATENCIÓN HUMANA:
- ✅ Mis Pedidos: `"Hola, tengo una consulta sobre mi pedido {#} 📦"`
- ✅ Login: `"Hola, necesito ayuda con mi cuenta 🔐"`
- ✅ Términos: `"Hola, tengo una consulta 💬"`

---

## 🎯 MENSAJES DISPONIBLES PARA USAR

Estos son TODOS los mensajes configurados que puedes usar:

```javascript
// MENÚ PRINCIPAL
"Hola 👋"                              // Activa menú de bienvenida
"Menu"                                 // Muestra menú principal

// PACKS
"Pack Semanal 📅"                      // Flujo pack semanal
"Pack Quincenal 📦"                    // Flujo pack quincenal
"Pack Mensual 📅"                      // Flujo pack mensual
"Pack Navideño 🎄"                     // Flujo navideño
"Pack Familiar 👨‍👩‍👧‍👦"                 // Flujo familiar
"Pack Almuerzo y Cena 🍽️"             // Flujo almuerzo+cena
"Two Pack 💑"                          // Flujo parejas
"Pack de Proteínas 🍗"                 // Flujo proteínas

// INFORMACIÓN
"Días de Entrega 🚚"                   // Info de entregas
"Zonas de Cobertura 📍"                // Info de zonas
"Información General ℹ️"               // Info general
"Recomendaciones 📌"                   // Recomendaciones

// PROMOCIONES
"Promoción Mensual 🎁"                 // Promo del mes

// PEDIDOS
"Quiero pedir 🛒"                      // Iniciar pedido

// SOPORTE (van a humano)
"Hola, necesito ayuda con mi cuenta 🔐"
"Hola, tengo una consulta 💬"
"Hola, tengo una consulta sobre mi pedido {#} 📦"
```

---

## 🔧 CÓMO CAMBIAR LOS MENSAJES

### Opción 1: Editar el archivo de configuración
Archivo: `src/config/whatsappMessages.js`

```javascript
export const WHATSAPP_MESSAGES = {
    BIENVENIDA: 'Hola 👋',              // Cambia aquí
    PACK_SEMANAL: 'Pack Semanal 📅',    // O aquí
    QUIERO_PEDIR: 'Quiero pedir 🛒',    // O aquí
    // etc...
};
```

### Opción 2: Cambiar mensaje en componente específico
Ejemplo en `WhatsAppButton.jsx`:

```javascript
// Cambiar de:
const whatsappUrl = getWhatsAppUrl(WHATSAPP_MESSAGES.BIENVENIDA);

// A:
const whatsappUrl = getWhatsAppUrl(WHATSAPP_MESSAGES.QUIERO_PEDIR);
// O cualquier otro mensaje
```

---

## 💡 RECOMENDACIONES PARA CONFIGURAR EL BOT

### 1. **Botón Flotante** (El más importante)
**Actual:** `"Hola 👋"`  
**Recomendación:** Déjalo así, activa el menú principal del bot.

### 2. **Landing Page y Cómo Funciona**
**Actual:** `"Quiero pedir 🛒"`  
**Recomendación:** Perfecto, va directo al flujo de pedido.

### 3. **Promociones CTA Final**
**Actual:** `"Hola 👋"`  
**Recomendación:** Cámbialo a `"Quiero pedir 🛒"` para conversión directa.

### 4. **FAQ**
**Actual:** `"Hola 👋"`  
**Recomendación:** Cámbialo a `"Hola, tengo una consulta 💬"` para ser más específico.

---

## 📋 CHECKLIST DE CONFIGURACIÓN DEL BOT

Para cada mensaje, configura en tu bot de WhatsApp:

- [ ] `"Hola"` → Menú principal con opciones
- [ ] `"Quiero pedir"` → Flujo de pedido (preguntar pack, plan, zona)
- [ ] `"Pack Semanal"` → Info y precio de pack semanal
- [ ] `"Pack Quincenal"` → Info y precio de pack quincenal
- [ ] `"Pack Mensual"` → Info y precio de pack mensual
- [ ] `"Pack Navideño"` → Info de menú navideño
- [ ] `"Pack Familiar"` → Info de packs familiares
- [ ] `"Pack Almuerzo y Cena"` → Info de pack doble
- [ ] `"Two Pack"` → Info de pack para parejas
- [ ] `"Pack de Proteínas"` → Info de proteínas solas
- [ ] `"Días de Entrega"` → Calendario de entregas
- [ ] `"Zonas de Cobertura"` → Zonas disponibles
- [ ] `"Información General"` → Info general de BiKitchen
- [ ] `"Promoción Mensual"` → Promo actual
- [ ] Mensajes con "consulta sobre mi pedido" → Derivar a humano
- [ ] Mensajes con "ayuda con mi cuenta" → Derivar a humano

---

## 🎯 KEYWORDS QUE EL BOT DEBE RECONOCER

Configura estas keywords en tu bot para que active los flujos correctos:

| Keyword | Flujo que Activa |
|---------|------------------|
| `hola`, `menu`, `inicio` | Menú principal |
| `quiero pedir`, `ordenar`, `hacer pedido` | Flujo de pedido |
| `pack semanal`, `semanal` | Info pack semanal |
| `pack quincenal`, `quincenal` | Info pack quincenal |
| `pack mensual`, `mensual` | Info pack mensual |
| `pack navideño`, `navidad` | Info menú navideño |
| `pack familiar`, `familiar` | Info pack familiar |
| `almuerzo y cena` | Info pack doble |
| `two pack`, `parejas` | Info pack parejas |
| `proteinas`, `pack de proteínas` | Info proteínas |
| `días de entrega`, `entregas` | Calendario entregas |
| `zonas`, `cobertura` | Zonas disponibles |
| `información general`, `info` | Info general |
| `promoción`, `promo` | Promo actual |
| `consulta sobre mi pedido` | Derivar a humano |
| `ayuda con mi cuenta` | Derivar a humano |

---

## 📞 NOTAS IMPORTANTES

1. **Todos los mensajes con "Hola" al inicio** van al menú principal o a humano
2. **Mensajes específicos de packs** activan flujos automáticos del bot
3. **"Quiero pedir"** debe iniciar el flujo completo de pedido
4. **Consultas de pedidos y cuenta** deben ir a atención humana
5. **Los emojis son importantes** - ayudan a identificar el tipo de mensaje

---

**Última actualización:** 18 de diciembre, 2024  
**Archivo de configuración:** `src/config/whatsappMessages.js`  
**Documentación completa:** `docs/WHATSAPP_CONFIG.md`
