# Bot de bienvenida — propuesta para que Gina apruebe (8 oct 2026)

Es el primer mensaje que recibe quien escribe por primera vez al WhatsApp.
Hoy lo manda el bot de Kommo **"Bot- Bievenida" (50218)**. La idea es que, en
segundos, la persona tenga **precios, link, días y zonas**, y una pregunta que la
haga responder.

> ⚠ **Gina: revisá los precios marcados con (✔?)**. Salen de pedidos reales de
> esta semana, pero confirmá que son los de lista.

---

## Mensaje 1 (apenas escribe)

¡Hola! 👋 Gracias por escribirle a **BiKitchen** 🧡
Cocinamos comida casera y saludable, lista para calentar, y te la llevamos a la casa o a la oficina.

📦 **Planes más pedidos**
• Pack mensual Bajo en Calorías: 20 almuerzos por **₡77.500** (✔?)
• Promo 2 semanas, almuerzo y cena **con desayunos de regalo**: **₡87.890** (✔?)
• 5 proteínas de 500 g para armar tus platos: **₡39.950** (✔?)
También hay Keto, Sin Carbos, Casaditos, Vegetariano y packs familiares.

👉 Todos los planes y precios: **bikitchencr.com/packs**

🚚 Entregamos **lunes, miércoles y sábado** en el GAM, de 9 a. m. a 2 p. m.

¿Qué estás buscando? Respondé con un número:
1️⃣ Bajar de peso / comer más sano
2️⃣ Keto o sin carbos
3️⃣ Comida para la familia
4️⃣ Otra cosa

## Mensaje 2 (según lo que responda)

- **1** → "¡Buenísimo! El más pedido para eso es el **Bajo en Calorías**: 120 g de proteína, vegetales y un carbo medido. ¿Para cuántas personas sería y qué días te sirve más?"
- **2** → "Tenemos **Keto** (200 g de proteína, vegetales, cero carbo) y **Sin Carbos**. ¿Para cuántas personas sería?"
- **3** → "Los **packs familiares** traen platos de 4 porciones. Los ves en bikitchencr.com/packs. ¿Cuántos son en la casa?"
- **4** → "¡Contame! Una persona del equipo te responde en un ratito 🙌"

## Si escribe fuera de horario

El bot de bienvenida ya avisa el horario de atención (lunes a viernes de 8 a. m. a 7 p. m.).
Se mantiene igual.

---

### Qué falta para prenderlo
1. Gina aprueba el texto y confirma los precios.
2. Claude lo carga en el bot 50218 de Kommo, que ya está activo con su disparador: se edita el texto, no se crea otro bot.
3. Al día siguiente sale el **seguimiento a las 20 h** (`seguimiento-consulta`) a quien preguntó y no compró.
