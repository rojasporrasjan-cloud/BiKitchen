# 🤖 LÓGICA DE MENSAJES DEL BOT DE WHATSAPP

## ⚠️ REGLA CRÍTICA

**Si un mensaje empieza con "Hola", el bot SIEMPRE responde con el mensaje de bienvenida completo.**

No importa qué más diga después de "Hola", el bot mostrará:

```
🌿✨ ¡Hola! Bienvenido/a a Bikitchen Food 💚

Somos una empresa de Alajuela que elabora comida casera lista para calentar 🍲
Te simplificamos el día a día con platillos deliciosos y saludables.

📦 ¿Qué te gustaría conocer?

* Pack Semanal
* Pack Quincenal (2 sem)
* Pack Mensual
* Pack Navideño 🎄
* Pack Familiar 👨‍👩‍👧‍👦
* Pack Almuerzo y Cena
* Two Pack (Parejas) 💑
* Pack de Proteínas 🍗
* Días de Entrega 🚚
* Zonas de Cobertura 📍
* Información General ℹ️

🎁 ¡NUEVO! Promoción Mensual

¡Estamos para servirte! 🤗
```

---

## ✅ MENSAJES CORRECTOS

### 🟢 CON "Hola" (Solo para ver el menú completo)

**Usar SOLO en:**
1. **Botón Flotante "Escríbenos"** → `"Hola 👋"`
2. **Footer** → `"Hola 👋"`
3. **FAQ** → `"Hola 👋"`
4. **Soporte a Humano:**
   - `"Hola, necesito ayuda con mi cuenta 🔐"`
   - `"Hola, tengo una consulta 💬"`
   - `"Hola, tengo una consulta sobre mi pedido {#} 📦"`

**Resultado:** Bot muestra el mensaje de bienvenida completo.

---

### 🔵 SIN "Hola" (Para flujos específicos)

**Usar en TODO lo demás:**

#### Packs Específicos:
- ❌ ~~"Hola, me interesa el Pack Semanal"~~
- ✅ `"Me interesa el Pack Semanal 📅"`

- ❌ ~~"Hola, quiero información del Pack Quincenal"~~
- ✅ `"Quiero información del Pack Quincenal 📦"`

- ❌ ~~"Hola, me gustaría saber sobre el Pack Mensual"~~
- ✅ `"Me gustaría saber sobre el Pack Mensual 📅"`

- ✅ `"Quiero información del Pack Navideño 🎄"`
- ✅ `"Me interesa el Pack Familiar 👨‍👩‍👧‍👦"`
- ✅ `"Quiero información del Pack Almuerzo y Cena 🍽️"`
- ✅ `"Me interesa el Two Pack 💑"`
- ✅ `"Quiero información del Pack de Proteínas 🍗"`

**Resultado:** Bot va DIRECTO al flujo de ese pack específico.

---

#### Información Específica:
- ✅ `"Quisiera saber los días de entrega 🚚"`
- ✅ `"Quiero saber si llegan a mi zona 📍"`
- ✅ `"Necesito información general sobre BiKitchen ℹ️"`
- ✅ `"Me gustaría recibir recomendaciones 📌"`

**Resultado:** Bot da la información específica solicitada.

---

#### Promociones:
- ✅ `"Quiero información de la Promoción Mensual 🎁"`

**Resultado:** Bot muestra info de la promo actual.

---

#### Pedidos:
- ❌ ~~"Hola, quiero hacer un pedido"~~
- ✅ `"Quiero hacer un pedido 🛒"`

**Resultado:** Bot inicia el flujo de pedido directo.

---

## 📊 TABLA RESUMEN

| Mensaje | ¿Usa "Hola"? | Respuesta del Bot |
|---------|--------------|-------------------|
| `"Hola 👋"` | ✅ SÍ | Mensaje de bienvenida completo |
| `"Me interesa el Pack Semanal"` | ❌ NO | Flujo directo del Pack Semanal |
| `"Quiero hacer un pedido"` | ❌ NO | Flujo directo de pedido |
| `"Quisiera saber los días de entrega"` | ❌ NO | Info de días de entrega |
| `"Hola, necesito ayuda con mi cuenta"` | ✅ SÍ | Mensaje de bienvenida + derivar a humano |

---

## 🎯 CONFIGURACIÓN DEL BOT

### El bot debe reconocer:

1. **"Hola" al inicio** → Muestra mensaje de bienvenida
2. **Keywords SIN "Hola":**
   - `"me interesa"`, `"quiero información"` + nombre de pack → Flujo de ese pack
   - `"quiero hacer un pedido"` → Flujo de pedido
   - `"días de entrega"` → Info de entregas
   - `"llegan a mi zona"` → Info de zonas
   - `"información general"` → Info general
   - `"promoción mensual"` → Info de promo

---

## ✅ LISTA COMPLETA DE MENSAJES CONFIGURADOS

### CON "Hola" (Solo 2 casos):
1. `"Hola 👋"` - Bienvenida general
2. `"Hola"` - Menú

### SIN "Hola" (Todos los demás):
1. `"Me interesa el Pack Semanal 📅"`
2. `"Quiero información del Pack Quincenal 📦"`
3. `"Me gustaría saber sobre el Pack Mensual 📅"`
4. `"Quiero información del Pack Navideño 🎄"`
5. `"Me interesa el Pack Familiar 👨‍👩‍👧‍👦"`
6. `"Quiero información del Pack Almuerzo y Cena 🍽️"`
7. `"Me interesa el Two Pack 💑"`
8. `"Quiero información del Pack de Proteínas 🍗"`
9. `"Quisiera saber los días de entrega 🚚"`
10. `"Quiero saber si llegan a mi zona 📍"`
11. `"Necesito información general sobre BiKitchen ℹ️"`
12. `"Me gustaría recibir recomendaciones 📌"`
13. `"Quiero información de la Promoción Mensual 🎁"`
14. `"Quiero hacer un pedido 🛒"`

### CON "Hola" + Contexto (Soporte a humano):
1. `"Hola, necesito ayuda con mi cuenta 🔐"`
2. `"Hola, tengo una consulta 💬"`
3. `"Hola, tengo una consulta sobre mi pedido {#} 📦"`

---

## 🔧 KEYWORDS PARA CONFIGURAR EN EL BOT

El bot debe detectar estas keywords (SIN "Hola" al inicio):

| Keyword | Acción |
|---------|--------|
| `me interesa el pack semanal` | Info Pack Semanal |
| `pack quincenal` | Info Pack Quincenal |
| `pack mensual` | Info Pack Mensual |
| `pack navideño` | Info Pack Navideño |
| `pack familiar` | Info Pack Familiar |
| `pack almuerzo y cena` | Info Pack Almuerzo+Cena |
| `two pack` | Info Two Pack |
| `pack de proteínas` | Info Pack Proteínas |
| `días de entrega` | Calendario de entregas |
| `llegan a mi zona` | Zonas de cobertura |
| `información general` | Info general BiKitchen |
| `recomendaciones` | Sugerencias personalizadas |
| `promoción mensual` | Promo actual |
| `quiero hacer un pedido` | Iniciar flujo de pedido |

---

## ⚠️ IMPORTANTE

**NUNCA uses "Hola" al inicio de un mensaje si quieres que el bot vaya directo a un flujo específico.**

El bot está programado para que "Hola" = Mensaje de bienvenida completo.

---

**Última actualización:** 18 de diciembre, 2024  
**Archivo de configuración:** `src/config/whatsappMessages.js`
