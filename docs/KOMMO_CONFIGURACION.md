# Kommo: configurar el mensaje del miércoles (menú + cambios)

> Guía para quien configure Kommo: Jan, Gina o **Claude en Chrome**.
> Se puede pegar entera en Claude en Chrome: está escrita como instrucciones.
> El detalle técnico está en `docs/AUTOMATIZACION.md`.

## Estado (26 de setiembre de 2026)

| Pieza | Estado |
|---|---|
| Plantilla WhatsApp `menu_y_cambios` (id **84238**, Utilidad, variable "Nombre del contacto") | En revisión de Meta |
| Salesbot "Menú y cambios" (id **115866**) | Guardado VACÍO y sin disparador. Falta el paso Mensaje cuando Meta apruebe |
| Netlify `KOMMO_BOT_CAMBIOS` | Va `115866` |
| Página (`/cambios`, `/menu`) | Lista en `bk-solo-automatizacion`, falta publicar |

Ojo al editar el bot: al guardar, Kommo ofrece agregar un disparador ("Cuando se
inicia un chat por mensaje entrante…"). **Cancelarlo siempre**: si el bot tiene
disparador, le escribiría a gente que no tiene entrega.

La cuenta no tenía plantillas aprobadas por Meta (29 plantillas "General", que
solo sirven dentro de las 24 h después de que el cliente escribe). Los bots
activos "Bot- Bievenida" y "Seguimiento" y las reglas de "Clientes Frecuentes"
son del embudo de ventas: no se tocan. La Difusión a "Clientes Frecuentes" se
descartó porque incluye packs vencidos (les llegaría "tu próxima entrega").

## Qué se quiere lograr

Cada miércoles, cada cliente con entrega el sábado o el lunes recibe por
WhatsApp el menú de la semana y un link para pedir sus cambios (máximo 2 por
pack, hasta el miércoles a las 8 p. m.). Lo que elige queda guardado solo en su
pedido y le llega a la hoja de cocina.

## Los links (ya existen en la página, no hay que crear nada)

| Link | Para qué |
|---|---|
| `https://bikitchencr.com/menu` | El menú de la semana |
| `https://bikitchencr.com/cambios` | El cliente escribe su WhatsApp y su nombre y entra a SUS cambios |

Son **iguales para todos los clientes**: se pegan tal cual en el mensaje, sin
variables ni campos. También están en el panel: Admin → Cambios de la semana →
"Links fijos para Kommo".

## Reglas para quien configura (no se negocian)

1. **No mandar ningún mensaje a clientes** mientras se configura.
2. **No activar** ninguna automatización ni Salesbot sin que Jan lo confirme.
3. **No borrar ni cambiar** automatizaciones o bots que ya existen: solo mirarlos
   y anotarlos.
4. Antes de tocar "Enviar para aprobación", "Guardar" o "Activar", mostrarle a
   Jan exactamente qué se va a guardar y esperar su "sí".

## Paso 1 · Inventario de lo que ya hay (solo mirar)

En el menú de la izquierda de Kommo:

- **Automatizaciones** (abrir la flechita) → anotar cada una.
- **Chats → engranaje → Herramientas de comunicación → Plantillas → Bots → Salesbots** → anotar cada bot.
- **Automatiza → Plantillas → Plantillas de respuesta** → anotar las plantillas de WhatsApp y su estado (aprobada, rechazada, en revisión).

Por cada una: nombre, si está **activa o apagada**, **qué la dispara** (etapa del
embudo, mensaje entrante, hora…) y **qué mensaje manda**. Entregarle la lista a
Jan antes de seguir. Si alguna apagada manda el menú o pide cambios, puede
servir: solo hay que cambiarle el texto por el de abajo.

## Paso 2 · La plantilla de WhatsApp

**Automatiza → Plantillas → Plantillas de respuesta → + Nueva plantilla →
Plantilla de WhatsApp**

- Categoría: **Utilidad** → Siguiente
- Nombre: `menu_y_cambios`
- Idioma: **Español**
- Encabezado, pie de página y botones: **vacíos**
- Cuerpo (tal cual):

```
Hola {{1}} 👋 Ya está listo el menú de tu próxima entrega de BiKitchen. Miralo aquí: https://bikitchencr.com/menu
Si querés cambiar algo (hasta 2 cambios por pack), entrá a https://bikitchencr.com/cambios antes del miércoles a las 8 p. m.
¡Gracias por comer rico con nosotros!
```

- Variable **{{1}}** = nombre del contacto. Valor de ejemplo: `María`
- Mostrársela a Jan → con su "sí", **Enviar para aprobación**.

Meta tarda entre 1 minuto y 48 horas. Si la rechaza, anotar el motivo exacto.
Motivos comunes: que empiece o termine con una variable (esta no lo hace) o
que Meta la considere publicidad (entonces reintentar como **Marketing**).

## Paso 3 · Cómo sale cada miércoles (elegir UNA)

**A. Difusión de Kommo (la más simple).** El miércoles en la mañana, una
difusión con la plantilla `menu_y_cambios` a la lista de clientes activos. Es
un solo envío, no uno por uno. No necesita nada más del sistema.

**B. Salesbot lanzado por el sistema (automático).** Crear un Salesbot en blanco
con un solo paso **Mensaje** → canal WhatsApp → plantilla `menu_y_cambios`,
llamado "Menú y cambios", **SIN disparador** ("Cuando esto suceda": vacío). El
sistema de BiKitchen lo lanza solo el miércoles a las 8 a. m. a los clientes
con entrega esa semana. Para eso Jan pone en Netlify el número del bot
(`KOMMO_BOT_CAMBIOS`), que aparece en Admin → Listas de Difusión → Enviar por
Kommo → "Revisar mi cuenta".

## Paso 4 · Probar antes de mandar a todos

- Opción A: mandar la difusión primero a una lista con **solo el número de Jan**.
- Opción B: en Netlify `CAMBIOS_ENVIO_AUTOMATICO=prueba` y
  `CAMBIOS_TELEFONO_PRUEBA=<número de Jan>`.

Revisar en el teléfono: que llegue el mensaje, que `bikitchencr.com/menu` abra
el menú y que en `bikitchencr.com/cambios`, con el WhatsApp y el nombre de Jan,
aparezca su pedido (si tiene entrega esa semana).

## Lo que tiene que estar listo en la página primero

- Publicado el trabajo de la carpeta `bk-solo-automatizacion`
  (`git push origin HEAD:main`).
- En Netlify: `CAMBIOS_SECRETO` puesto (una frase larga inventada, **que no se
  cambia nunca**) y "Trigger deploy". Sin eso, ningún link de cambios abre.

## Si algo no funciona

| Qué pasa | Qué es |
|---|---|
| `/cambios` dice "No encontramos un pedido…" | El número o el nombre no calzan con el pedido, o no tiene entrega el sábado/lunes de esa semana. Si el pedido es nuevo, a los 20 minutos ya aparece |
| El link abre pero dice "Se cerró" | Ya pasó el miércoles 8 p. m. |
| "El servicio de cambios no está disponible" | Falta `CAMBIOS_SECRETO` en Netlify |
| Meta rechaza la plantilla | Anotar el motivo y avisarle a Jan |
