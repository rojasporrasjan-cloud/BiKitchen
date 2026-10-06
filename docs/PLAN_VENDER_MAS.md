# Plan para vender más — BiKitchen

> Pedido de Jan (6 oct 2026): "armame el plan de implementación con lo mejor que
> podemos hacer" para vender más (listas de difusión y lo que haga falta).
> Se apoya en lo que ya está construido: `docs/KOMMO_TRASPASO.md` (estado de Kommo
> y de cada envío automático) y `docs/PLAN_DIFUSIONES_AUTOMATICAS.md` (reglas de
> marketing). Leer los dos antes de tocar algo.

## La idea en una frase

Primero **no perder** a los que ya escriben o ya compran (contestar rápido,
renovar a los mensuales), después **traer de vuelta** a los que se fueron y por
último **traer gente nueva** con los clientes contentos. Cada paso se mide antes
de gastar más.

## Dónde se está perdiendo plata hoy (6 oct 2026)

| Fuga | Lo que se vio |
|---|---|
| Chats sin contestar | Kommo tenía **338 chats sin leer**. Quien pregunta precio y no recibe respuesta en el día, compra en otro lado. |
| Mensuales que no renuevan | La renovación automática está construida pero en **prueba**: hoy depende de que Jan se acuerde. Un mensual que se va son ~₡77.500 al mes. |
| Difusiones sin medir | La de HOY5 y la del Two Pack salieron el 6 oct, pero no hay forma automática de saber cuántos compraron. |
| Un mismo mensaje para todos | La promo le llegó igual a keto, bajo en calorías, familiares… |
| Clientes que se fueron | Nadie les escribe de forma ordenada ni se les pregunta por qué se fueron. |

## Las reglas que NO cambian

- Máximo **2 mensajes de marketing por persona por semana**, nada a `no-molestar`
  (30 días), nunca dos el mismo día. Los avisos de servicio (pago recibido, hoy
  te llega, renovación) **no** cuentan como marketing.
- Presupuesto de marketing **US$80 al mes** (~1.080 mensajes a US$0,074). Si una
  campaña demuestra que vende, Jan decide si sube.
- Todo arranca en **prueba** (solo le llega a Jan) y se prende con su sí.
- Bots de Kommo **sin disparador** (ver la trampa en KOMMO_TRASPASO §7).
- Publicar solo con el sí de Jan, nunca viernes ni sábado.

**Cuidado con la calidad del número:** si mucha gente bloquea o reporta, Meta
baja la calidad del WhatsApp y limita los envíos. Por eso los topes y por eso es
mejor un mensaje que le sirva a cada tipo de cliente que una promo para todos.

**Los 2 mensajes de la semana se reparten así:**
1. **Cierre de pedidos** (a clientes sin entrega en el próximo reparto).
2. **Uno "de valor"** según la semana: menú por tipo de pack, recuperar inactivos,
   referidos u oferta al mensual. Nunca dos campañas en la misma semana a la misma persona.

---

## Etapa 1 — No perder ventas (semana del 6 al 11 oct)

### 1.1 Publicar el arreglo de la franja de promoción
- **Qué:** commit `c164ca8`. Sin esto, marcar un cupón "en banner" tumba el sitio.
- **Quién:** Claude, con el sí de Jan. **Costo:** nada.

### 1.2 Medir lo del 6 oct (miércoles 7)
- **Qué:** cuántos pedidos usaron HOY5 (colección `coupons`/pedidos del 6 oct) y
  cuántos de los 5 del Two Pack renovaron o contestaron.
- **Quién:** Claude (leyendo la pantalla de pedidos, regla 17). Resultado a la Bitácora.
- **Sirve para:** saber si un 5 % mueve algo o hace falta otra oferta.

### 1.3 Respuesta automática a quien escribe por primera vez
- **Qué:** cuando alguien nuevo escribe, que en segundos reciba: saludo, link a
  los planes, precios principales, días de entrega y zonas, y "¿qué estás
  buscando? keto, bajar de peso, familia…". Ya existen bots de bienvenida en
  Kommo (`Bot de bienvenida` 56202, `Bot- Bievenida` 50218): revisar cuál está
  activo y qué dice, y dejar uno solo y bueno.
- **Quién:** Claude arma el texto, Gina lo aprueba, Claude lo configura.
- **Costo:** gratis (es respuesta dentro de las 24 h, no es plantilla).

### 1.4 Seguimiento al interesado que no compró (dentro de las 24 h)
- **Qué:** a quien escribió hace ~20 h, no compró y nadie le contestó después,
  un mensaje: "¿te ayudo a escoger tu pack? Esta semana el menú trae…".
  Dentro de las 24 h WhatsApp lo deja mandar **gratis** y sin plantilla.
- **Cómo:** función nueva `seguimiento-interesados` (cada hora): usa
  `kommo_contactos` (`ultimoEntrante`, `ultimoSaliente`) + pedidos por teléfono;
  corre un Salesbot de texto (sin plantilla) con `/api/v2/salesbot/run`. Tope por
  vuelta, constancia en `envios_del_dia`, en prueba primero.
- **Quién:** Claude. **Costo:** gratis.
- **Meta:** que ningún interesado se quede sin una segunda respuesta.

### 1.5 Prender la renovación automática
- **Qué:** `RENOVACION_AUTOMATICA` de `prueba` a `si` (L/M/S 10 a. m., el día de
  la última entrega del mensual). Antes, revisar con Jan una semana de muestras.
- **Quién:** Jan dice sí, Claude lo cambia en Netlify + redeploy.
- **Costo:** mensaje de servicio, sin tope de marketing.

### 1.6 Jan y Gina: contestar los chats
- **Qué:** dos ratos fijos al día (por ejemplo 9 a. m. y 4 p. m.) para limpiar la
  bandeja de Kommo. Lo que el bot de 1.3 no resuelve, lo resuelve una persona el mismo día.
- **Quién:** Jan / Gina. **Meta:** bandeja en cero al final del día.

---

## Etapa 2 — Medir y ordenar los cierres (semana del 12 al 18 oct)

### 2.1 "¿Cuánto vendió cada mensaje?" en el panel
- **Qué:** en Listas de Difusión, al lado de cada envío: a cuántos llegó y
  **cuántos compraron en las 72 h siguientes** (cruzar `envios_kommo` con
  pedidos nuevos por teléfono, sin bajar `pedidos` entero).
- **Quién:** Claude. **Por qué primero:** sin esto no se sabe qué campaña repetir.

### 2.2 Cierres de pedidos: de prueba a prendidos
- **Qué:** lunes 12 (miércoles), jueves 15 (sábado) y viernes 16 (lunes) salen
  en prueba. Jan revisa la lista real en Listas de Difusión; si está bien →
  `CIERRE_PEDIDOS_AUTOMATICO=si`.
- **Costo:** ~US$45–65 al mes con el tope de 2 por semana. Es lo que más se
  come del presupuesto: medir con 2.1 si se paga solo.

### 2.3 Prender "¿qué tal todo?" y "hoy te llega"
- **Qué:** son mensajes de servicio que hacen sentir bien atendido al cliente y
  abren la conversación (y la ventana gratis de 24 h). Prender de a uno.

---

## Etapa 3 — Vender más a los que ya compran (19 oct al 1 nov)

### 3.1 Menú de la semana por tipo de pack
- **Qué:** el jueves o viernes, a cada cliente según su último pack: "el menú
  keto de la semana que viene" con foto. Keto, Bajo en Calorías, Casaditos,
  Familiares, Vegetariano.
- **Cómo:** una plantilla de marketing por tipo (o una con variable de nombre
  de pack y link), bot por plantilla, público armado por el último pack de cada
  cliente. Usa el segundo espacio de la semana.
- **Quién:** Claude; Gina pasa el menú y las fotos a tiempo.

### 3.2 Pasar a los semanales al mensual
- **Qué:** a quien compró semanal 3 veces o más en los últimos 2 meses:
  "con el mensual ahorrás ₡X y no tenés que pedir cada semana".
- **Decide Jan:** la oferta (el ahorro real del mensual frente al semanal, o un
  regalo como los desayunos del Two Pack).
- **Por qué:** el mensual es plata segura y menos trabajo de pedidos.

### 3.3 Sumar a la pareja y a la familia
- **Qué:** a quien compra 1 pack individual: "¿y tu pareja? el Two Pack sale a…".
  Usar lo que se aprenda de la regalía de desayunos del 6 oct (1.2).

---

## Etapa 4 — Recuperar y traer gente nueva (noviembre)

### 4.1 Recuperar a los que se fueron
- **Qué:** tres grupos según cuándo fue su último pedido: **1, 2 y 3 meses**.
  Al de 1 mes, "volver a invitar" (15 %, ya existe). Al de 2–3 meses, otra cosa
  y una pregunta: "¿qué no te gustó?". Lo que contesten va a Gina: sirve para mejorar el menú.

### 4.2 Que los clientes traigan clientes
- **Qué:** la página `/referidos` ya existe. Ofrecerla a los clientes contentos
  (los que contestaron bien al "¿qué tal todo?"): "traé a alguien y los dos reciben…".
- **Decide Jan:** el premio (descuento, BiPuntos, un plato).

### 4.3 Reseñas de Google y fotos reales
- **Qué:** pedir la reseña a los clientes contentos (en el mismo flujo de 4.2)
  y poner fotos reales de los platos en la web (pendiente D1–D4 de Jan).
- **Por qué:** quien busca "comida saludable Costa Rica" decide por reseñas y fotos.

### 4.4 Oficinas y empresas
- **Qué:** un pack para equipos (5–10 personas, una sola dirección, mismo día de
  reparto). Empezar preguntando a clientes que trabajan en empresas (por
  ejemplo, Michelle Conejo es supervisora) si en su trabajo les interesaría.
- **Por qué:** un pedido grande en una sola parada de la ruta.
- **Decide Jan con Gina:** precio por volumen y mínimo de personas.

---

## Calendario de una semana normal (cuando todo esté prendido)

| Día | Qué sale solo | Tipo |
|---|---|---|
| Todos los días | Respuesta al que escribe por primera vez · seguimiento a las ~20 h | Gratis (24 h) |
| Lunes 2 p. m. | Cierre del miércoles | Marketing (espacio 1) |
| Martes 10 a. m. | Volver a invitar (inactivos de 1 mes) | Marketing (espacio 2) |
| Miércoles 8 a. m. | Menú y cambios (link personal) | Servicio |
| Jueves 2 p. m. | Cierre del sábado | Marketing (espacio 1) |
| Viernes 10 a. m. | Menú por tipo de pack | Marketing (espacio 2) |
| Viernes 2 p. m. | Cierre del lunes | Marketing (espacio 1) |
| L/M/S | Hoy te llega · guía de congelado · renovación el día de la última entrega | Servicio |
| D/M/J | ¿Qué tal todo? | Servicio |

Las reglas de marketing (2 por semana, no el mismo día, no-molestar) deciden
quién recibe qué: nadie recibe todo.

## Cómo se sabe si funciona

| Número | Dónde se ve | Meta para fin de noviembre |
|---|---|---|
| Chats sin contestar al final del día | Kommo | 0 |
| Compras en 72 h por cada envío | Panel → Listas de Difusión (2.1) | Que cada campaña pague varias veces lo que cuesta |
| Mensuales que renuevan | Panel → Packs mensuales | Más que en setiembre |
| Gasto de marketing del mes | Panel → Listas de Difusión | ≤ US$80 (o lo que Jan suba) |
| Bloqueos / calidad del número | Kommo / Meta | Calidad "alta" siempre |

Referencia: un solo mensual de ~₡77.500 paga más de mil mensajes de marketing.

## Lo que tienen que decidir Jan y Gina

1. Texto del mensaje de bienvenida (1.3) y del seguimiento (1.4).
2. Los ratos fijos para contestar chats (1.6).
3. La oferta para pasar al mensual (3.2) y el premio de referidos (4.2).
4. Precio y mínimo del pack para empresas (4.4).
5. Fotos de los platos: quién las toma y cuándo (3.1, 4.3).

## Notas para quien lo programe

- Reusar: `avisoDelDia.js` (prueba/tope/constancia), `cierresDePedidos.js`
  (`conReglasDeMarketing`, `presupuestoDelMes`), `cierre-de-pedidos.js`
  (`leerFichas`, `anotarMarketing`), `registroDeEnvios.js`, `EnviosAutomaticos.jsx`.
- Regla 17: nunca bajar `pedidos` ni `kommo_contactos` enteros; consultas con `where`.
- Las difusiones mandadas a mano desde Kommo NO pasan por `anotarMarketing`:
  si se hacen, anotarlas (KOMMO_TRASPASO, "Difusiones a mano").
- Cada pieza nueva: pruebas + build, en prueba una semana, publicar aparte.
