# Automatización de los cambios de la semana

> Para las DOS cuentas de Claude que trabajan en este repo, y para Jan.
> Última revisión: 25 de setiembre de 2026.

## Qué hace

Cada miércoles, cada cliente con entrega el sábado o el lunes recibe por
WhatsApp un **link personal** (`bikitchencr.com/cambios/<código>`). Ahí ve el
menú de la semana de su pack y elige cambios **de la lista de Gina**, sin
escribir nada. Lo que elige queda guardado en su pedido y **la hoja de
producción lo aplica sola**. A quien le toca su última entrega le llega además
el aviso de renovación.

```
miércoles 8 a. m.          miércoles hasta 8 p. m.         jueves / viernes
┌────────────────────┐     ┌──────────────────────────┐     ┌─────────────────────┐
│ cambios-miercoles  │ ──▶ │ cliente abre su link     │ ──▶ │ hoja de producción  │
│ (o el botón en el  │     │ /cambios/:codigo         │     │ lee la nota de la   │
│  panel) → Kommo    │     │ elige de la lista de Gina│     │ entrega y cocina el │
│  → WhatsApp        │     │ → cambios-semana guarda  │     │ cambio              │
└────────────────────┘     └──────────────────────────┘     └─────────────────────┘
```

Decidido con Jan (25 set 2026):
- Cierra el **miércoles 8 p. m.** antes del sábado y el lunes. Entregas de
  miércoles a viernes cierran 2 días antes a las 8 p. m. (supuesto: confirmar
  cuándo se cocinan).
- Solo se elige de `config/substitutions` (pantalla **Sustituciones**).
- Máximo 2 cambios por pack (`MAX_CAMBIOS_POR_PACK`), 4 en un two pack.
- El envío existe de las dos formas: **botón** en el panel y **automático** el miércoles.

## Los archivos

| Archivo | Qué hace | Riesgo |
|---|---|---|
| `src/utils/cambiosDeLaSemana.js` | LA REGLA: hora límite, qué se puede cambiar, validación, qué se guarda. La usan la página y el servidor | 🟡 |
| `src/utils/envioDeCambios.js` | A quién le llega (ciclo sábado+lunes, última entrega) y el cliente armado para Kommo | 🟢 |
| `netlify/functions/cambios-semana.js` | Abre el link (firma HMAC), guarda los cambios en el pedido, genera links (solo dueño) | 🟡 |
| `netlify/functions/cambios-miercoles.js` | Envío automático programado (miércoles 14:00 UTC). **Viene apagado** | 🔴 manda WhatsApp reales |
| `src/pages/CambiosSemanaPage.jsx` + `src/components/cambios/*` | La página del cliente | 🟢 |
| `src/pages/admin/CambiosSemanaView.jsx` | Panel → Solo Dueño → **Cambios de la semana** | 🟢 |
| `src/utils/kommoPayload.js`, `src/components/admin/EnvioKommo.jsx` | Se les agregó el dato `linkCambios` (una línea cada uno) | 🟢 |

**La hoja de producción no se modificó.** Los cambios le llegan por un campo que
ya leía (ver abajo).

## Los datos — CONTRATOS QUE NO SE CAMBIAN

Estos formatos los leen la hoja, las etiquetas y el despacho. Cambiarlos rompe
la cocina en silencio.

### `pedido.cambiosPorEntrega` → `{ 'AAAA-MM-DD': 'texto' }` — SIEMPRE TEXTO
- Lo lee `notasDeLaEntrega()` en `logisticsUtils.js` y lo pega a la nota de ESA
  entrega; también `labels/labelDomain.js`.
- La hoja reconoce los cambios con `leerCambioDePack()`
  (`desayunosPersonalizados.js`): `Cambiar <como está en el menú> por <nuevo>`,
  separados por ` · `.
- Lo pueden escribir Gina, la otra cuenta o el link. **El link solo AGREGA su
  parte** y, si el cliente vuelve a mandar, reemplaza solo lo suyo
  (`cambioParaGuardar`).
- Si se guarda un objeto acá, la hoja imprime `[object Object]`. Hay un test
  que lo impide (`cambiosDeLaSemana.test.js`).

### `pedido.cambiosDelLink` → `{ 'AAAA-MM-DD': { cambios, proteinas, notas, texto, guardadoEn, origen } }`
- El detalle de lo que eligió el cliente. Lo lee el panel. **La hoja no.**
- `texto` es exactamente lo que se agregó a `cambiosPorEntrega` (para poder
  reemplazarlo si vuelve a mandar).

### `pedido.proteinasPorEntrega` → `{ 'AAAA-MM-DD': [proteínas] }`
- Ya existía (`proteinasPorEntrega.js`). Los packs de proteínas guardan ahí.
- **Es LA lista de esa entrega**, la elija el cliente por el link o Jan/Gina en
  "Proteínas de la semana". El link muestra esta (`loGuardadoParaElLink`), y el
  panel también (`respuestaDe`); `cambiosDelLink[fecha].proteinas` es solo la
  constancia de lo que mandó el cliente. Lo último que se guarda es lo que va.
- Al reescribir las fechas en Pedidos → "Entregas programadas", la lista se
  va con su entrega (`proteinasConElCalendarioNuevo`).
  Test de punta a punta: `sincroniaDeProteinas.test.js`.

### `envios_cambios/{sábado}` (colección nueva)
- Constancia del envío automático: `estado` = `enviado` | `prueba` |
  `frenado-por-tope`. Con `enviado` no vuelve a mandar esa semana.

### `links_cambios/{sábado}` (colección nueva, solo el servidor)
- El índice del **link fijo** `bikitchencr.com/cambios`: `porTelefono` (últimos
  8 dígitos) → `[{ id, fecha, nombre, pack }]`, y `armadoEn`.
- Se arma solo la primera vez que alguien busca en la semana (las consultas del
  ciclo) y después cada búsqueda cuesta **1 lectura**. Si un número no aparece
  y el índice tiene más de 20 minutos, se rearma (pedidos nuevos).
- Las reglas de Firestore no dejan leerlo desde el navegador (regla por defecto).

## Los links fijos (para Kommo, sin variables)

| Link | Qué hace |
|---|---|
| `bikitchencr.com/cambios` | El cliente escribe su WhatsApp y su **primer nombre** y llega a SU link firmado (`/cambios/<código>`). Mismas reglas: cierre igual al de pedidos (lunes, jueves o viernes 7 p. m.), máximo 2 cambios por pack |
| `bikitchencr.com/menu` | El menú de la semana (ya existía: `CatalogPage`) |

Están en Panel → Cambios de la semana → *Links fijos para Kommo*, con botón de
copiar. Sirven en cualquier mensaje o automatización de Kommo **sin** campos ni
variables. El link personal (con la casilla "Link cambios") sigue funcionando y
es más cómodo para el cliente: entra directo sin escribir nada.

Pedir el nombre además del teléfono es a propósito: con el número solo,
cualquiera que sepa el WhatsApp de otro vería y cambiaría su pedido. Si no
calza, el mensaje es el mismo para "número equivocado" y "nombre equivocado".

## La renovación: el día de la última entrega (29 set 2026)

Decisión de Jan: el mensaje de renovación le llega al cliente **el mismo día
que recibe su último pack**. El del miércoles (menú y cambios) le llega a
**todos**, también al que está en su última semana, para que pueda pedir los
cambios de esa entrega.

- `netlify/functions/renovacion-del-dia.js`: lunes, miércoles y sábado a las
  10 a. m. de Costa Rica. A quién: `renovacionesDelDia` (envioDeCambios.js):
  pack de varias entregas, **hoy es la última**, no cancelado y **que no haya
  renovado ya** (el mismo teléfono con otro pedido que sigue). Sin rellenos,
  uno por persona, tope 40, una vez por día (`envios_renovacion/{fecha}`).
- Viene **apagado**: `RENOVACION_AUTOMATICA` = `no` · `prueba` · `si`. En
  `prueba` manda UNA muestra a `CAMBIOS_TELEFONO_PRUEBA` y guarda a quiénes les
  habría llegado.
- Bot: `KOMMO_BOT_RENOVACION` = `115998` ("Renovación de pack", plantilla
  `renovacion_pack`), cuando la plantilla esté aprobada y el bot tenga su paso.

## Los avisos de pago y el registro de envíos (2 oct 2026)

Panel → **Listas de Difusión** → "WhatsApp automáticos": una tarjeta por envío
con su estado en Netlify (apagado / prueba / prendido, y si falta el bot), la
lista exacta de a quién le toca, qué ya salió y los últimos envíos. Las listas
salen de los pedidos ya cargados con las MISMAS funciones que usan los envíos;
el estado y el historial, de la función `kommo` (acción `envios`, ~40 lecturas).

| Envío | Función | Cuándo | Interruptor | Bot |
|---|---|---|---|---|
| Menú y cambios | `cambios-miercoles.js` | miércoles 8 a. m. | `CAMBIOS_ENVIO_AUTOMATICO` | `KOMMO_BOT_CAMBIOS` |
| Renovación | `renovacion-del-dia.js` | L/M/S 10 a. m. | `RENOVACION_AUTOMATICA` | `KOMMO_BOT_RENOVACION` |
| Recordatorio de pago | `recordatorio-pago.js` | todos los días 10 a. m. | `RECORDATORIO_PAGO_AUTOMATICO` | `KOMMO_BOT_RECORDATORIO_PAGO` |
| Pago recibido | `pago-recibido.js` | cada 10 min | `PAGO_RECIBIDO_AUTOMATICO` | `KOMMO_BOT_PAGO_RECIBIDO` |

- Todos vienen **apagados**; `prueba` manda UNA muestra a
  `CAMBIOS_TELEFONO_PRUEBA` y guarda la lista real; `si` manda a los clientes.
- **`envios_kommo`** (colección nueva, solo el servidor): una entrada por vuelta
  que manda: `{ tipo, modo, estado, cuando, enviados: [{nombre, telefono, fecha,
  muestra}], lesHabriaLlegado: [...] }` (`src/utils/registroDeEnvios.js`).
- Marcas en el pedido (una sola vez por pedido): `avisoPagoRecibido`,
  `avisoRecordatorioPago`, y en prueba `…Prueba`.
- **Recordatorio de pago**: `pagosPorRecordar` (`avisosDePago.js`): estado
  `pending_payment` o `payment_failed`, sin `paymentConfirmed`, próxima entrega
  en 3 días o menos. Lee solo los pedidos sin pagar. "Sin pagar" es lo que dice
  el SISTEMA: un pago confirmado en el chat y no en el panel recibiría el
  recordatorio. Por eso arranca en prueba.
- **Pago recibido**: lee los pedidos con `pointsAwardedAt` de la última media
  hora (lo escriben la confirmación del panel y el pago con tarjeta).
- El envío de cambios corrido a mano después del cierre del sábado (por ejemplo
  un viernes) ya no le manda link al del sábado: solo al del lunes.

## Los avisos alrededor de la entrega (4 oct 2026)

Pedido de Jan: "todas las difusiones automáticas que necesitamos". Cuatro más,
con el MISMO recorrido que la renovación (`src/utils/avisoDelDia.js`): apagados
por defecto, `prueba` = UNA muestra a `CAMBIOS_TELEFONO_PRUEBA` con la lista real
en `envios_kommo`, constancia en `envios_del_dia/{tipo}_{fecha}` (nunca dos
veces), sin rellenos, uno por persona y con tope. A quién: `src/utils/avisosDeEntrega.js`
(la misma función arma la lista del panel). Tests: `avisosDeEntrega.test.js`.

| Envío | Función | Cuándo (Costa Rica) | A quién | Interruptor | Bot | Plantilla |
|---|---|---|---|---|---|---|
| Hoy te llega | `hoy-te-llega.js` | L/M/S 7 a. m. | todo el que recibe hoy (pagado, no cancelado) | `HOY_TE_LLEGA_AUTOMATICO` | `KOMMO_BOT_HOY_TE_LLEGA` | `hoy_te_llega` (Utilidad) |
| Guía de congelado | `guia-de-congelado.js` | L/M/S 3 p. m. | la PRIMERA entrega de cada pedido fue hoy | `GUIA_CONGELADO_AUTOMATICO` | `KOMMO_BOT_GUIA_CONGELADO` | `guia_de_congelado` (Utilidad, imagen) |
| ¿Qué tal todo? | `que-tal-todo.js` | D/Ma/J 11 a. m. | cliente NUEVO cuya primera entrega fue ayer | `QUE_TAL_AUTOMATICO` | `KOMMO_BOT_QUE_TAL` | `que_tal_todo` (Utilidad) |
| Volver a invitar | `volver-a-invitar.js` | martes 10 a. m. | última entrega hace 14–21 días y nada después | `VOLVER_A_INVITAR_AUTOMATICO` | `KOMMO_BOT_VOLVER_A_INVITAR` | `volver_a_invitar` (Marketing) |

- **Lecturas:** hoy-te-llega y la guía leen solo los pedidos de HOY; ¿qué tal?
  los de ayer + una consulta `telefono in [variantes]` por cada primera entrega
  (para saber si es nuevo); volver a invitar, los pedidos con entregas de hace 3
  semanas a 6 adelante, una vez por semana.
- **"Nuevo"** = ningún otro pedido vivo de ese teléfono tiene entregas antes. Si
  el número está escrito de una forma rara, puede salir como nuevo un cliente
  viejo: se le pregunta "¿qué tal?" de más, nada grave.
- **Volver a invitar** es Marketing: Meta lo cobra y puede no entregarlo a quien
  recibió muchas promociones.
- Los textos de las plantillas: `docs/KOMMO_CONFIGURACION.md`, "Los avisos de la entrega".

## La conexión con Kommo: `kommo-sync` (5 oct 2026)

Fase 1 de `docs/PLAN_DIFUSIONES_AUTOMATICAS.md` (en la carpeta principal). Cada
10 minutos lee la **API de eventos** de Kommo y deja una ficha por cliente en
`kommo_contactos/{8 dígitos}`: `ultimoEntrante`, `ultimoSaliente`,
`contactoBueno` (el del último mensaje = chat vivo), `chatVivo`, `etapa`
(`{estado, pipeline, leadId, cuando}`), `noMolestarDesde` (etiqueta
`no-molestar` en Kommo, 30 días) y `contactos` (todos los ids de ese número).
Lógica pura y pruebas: `src/utils/kommoSync.js`, `kommoSync.test.js`.

- **No le manda nada a nadie.** Solo lee de Kommo y escribe en Firestore.
- **Kommo entrega SIEMPRE lo más nuevo primero** (ignora `order`). Por eso se lee
  por ventanas cerradas `[desde, hasta]` de 12 h, de atrás hacia adelante; si una
  ventana no cabe en la vuelta, se parte a la mitad. `kommo_sync/estado.cursor`
  = último segundo leído completo.
- **La primera vez** arranca 30 días atrás (~25.000 eventos) y avanza 20 páginas
  por vuelta: unas 2–3 h para quedar al día.
- **Lecturas de Firestore: 2 por vuelta** (`kommo_sync/estado` y
  `kommo_sync/indice` = contacto → teléfono). Escribe solo las fichas que
  cambiaron. Nunca baja `kommo_contactos` entero.
- **WhatsApp viejo:** al número viejo no le entra ni le sale nada (el envío falla
  con 3137 y no deja evento): todo mensaje del registro es del canal bueno. Un
  número que no tuvo ningún mensaje no queda marcado como vivo.
- Apagar: `KOMMO_SYNC_AUTOMATICO=no` en Netlify.
- Reglas de Firestore de `kommo_contactos` / `kommo_sync`: todavía no (el panel
  las va a leer en la fase 2; el servidor escribe con el SDK de administrador).

## El link de Gina: packs mensuales (29 set 2026)

Gina no entra al panel. Su link `bikitchencr.com/packs-mensuales/<código>`
le muestra en qué semana va cada pack, **por renovar** y **terminados**, con la
misma cuenta que Packs Mensuales del panel (`packsParaGina.js`). **Sin
teléfonos, direcciones, correos ni montos.**

- Se saca en Panel → Packs Mensuales → **"Link para Gina"** (solo el dueño).
- `netlify/functions/packs-gina.js` firma el código con `CAMBIOS_SECRETO` y
  otro texto adentro. Si el link se filtra, se cambia `VERSION` en ese archivo
  y el viejo deja de abrir, sin tocar los links de cambios.
- Lecturas: las fechas de hace 2 semanas a 5 adelante, no la colección
  entera; guarda la lista 5 minutos.

## Reglas de seguridad que no se quitan

1. La nota libre del cliente no puede disparar un cambio en cocina: la palabra
   "cambiar" se escribe como "cambio" en `cambiosPorEntrega`
   (`textoParaLaHoja`). Gina la lee; la cocina no la aplica sola.
2. El servidor valida TODO de nuevo (hora, lista de Gina, máximo). La página no
   es de confiar.
3. Se escribe con `update()` por el id real del documento: si no existe, falla
   (nada de documentos fantasma — regla 17 de CLAUDE.md).
4. La página del cliente solo recibe el primer nombre. Nunca teléfono, dirección
   ni correo.
5. `CAMBIOS_SECRETO` no se cambia una vez en uso: invalida todos los links ya
   mandados.
6. **Nunca a quien no tiene nada que ver.** Quién recibe lo decide el sistema,
   nunca Kommo: solo pedidos vivos con entrega ese sábado o lunes, **sin
   teléfonos de relleno** (8888-8888, 8000-XXXX: `esTelefonoDeRelleno`) y **un
   mensaje por persona** (`destinatariosUnicos`). Si salen más de 150, no manda
   nada. En modo `prueba`, solo al número de Jan.
7. **Los bots de Kommo van SIN disparador.** Kommo mete solo "Cualquier
   conversación nueva" al guardar un bot, y el editor no lo muestra: después de
   guardar, confirmarlo en la LISTA de bots. Un bot con mensaje y ese
   disparador le escribiría a todo el que escriba por primera vez.

## Cómo lo aplica la cocina (y un límite conocido)

`leerCambioDePack` busca el ingrediente **por nombre** en los platos del menú:
"Cambiar Pure de papa por Arroz blanco" cambia el puré en TODOS los platos que
lo llevan. Por eso la página también lo muestra cambiado en todos y lo cuenta
como un solo cambio.

**Límite:** si el mismo nombre está en el almuerzo y en la cena (p. ej. "Arroz
con peregil"), el cambio se aplica en las dos tablas. Pasa igual con las notas
escritas a mano. Si molesta, la solución va en la hoja (otra cuenta), no acá.

## Configuración (una sola vez)

En **Netlify → Environment variables**:

| Variable | Para qué |
|---|---|
| `CAMBIOS_SECRETO` | Texto largo al azar. Firma los links. **No cambiarlo después** |
| `SITIO_URL` | Opcional. Por defecto `https://bikitchencr.com` |
| `KOMMO_BOT_CAMBIOS` | Id del Salesbot "menú + cambios" |
| `KOMMO_CAMPO_LINK_CAMBIOS` | Id del campo del contacto donde va el link |
| `KOMMO_BOT_RENOVACION` | Opcional. Bot para la última entrega |
| `KOMMO_CAMPO_AVANCE`, `KOMMO_CAMPO_PROXIMA_ENTREGA`, `KOMMO_CAMPO_PACK` | Opcionales |
| `CAMBIOS_ENVIO_AUTOMATICO` | `no` (por defecto) · `prueba` · `si` |
| `CAMBIOS_TELEFONO_PRUEBA` | El número al que manda en modo `prueba` |

**Guía paso a paso de Kommo (para Jan, Gina o Claude en Chrome):
`docs/KOMMO_CONFIGURACION.md`.** Con los links fijos no hace falta el campo
"Link cambios"; lo de abajo es para el link personal por cliente.

En **Kommo** (lo hace Gina o quien administre la cuenta):
1. Crear un campo de contacto de texto, p. ej. "Link cambios". Su id se ve en
   Panel → Listas de Difusión → Enviar por Kommo → *Revisar mi cuenta*.
2. Crear la plantilla de WhatsApp y **que Meta la apruebe** (fuera de la
   ventana de 24 h solo pasan plantillas aprobadas). Ejemplo:
   > ¡Hola {{nombre}}! 🍽️ Ya está el menú de esta semana. Si querés cambiar algo
   > de tu pack, elegilo acá hasta el miércoles 8 p. m.: {{Link cambios}}
3. Crear el Salesbot que manda esa plantilla. Igual para la de renovación.

## Cómo se opera cada semana

- **Con el botón:** Panel → **Cambios de la semana** → *Generar links* → abajo,
  *Enviar por Kommo* (probar con un número primero). O *Copiar todos* para
  mandarlos a mano.
- **Automático:** con `CAMBIOS_ENVIO_AUTOMATICO=si` sale solo el miércoles a las
  8 a. m. Antes, correrlo una semana en `prueba`.
- **Después de las 8 p. m.:** en la misma pantalla se ve quién contestó y qué
  pidió. La hoja ya lo tiene; no hay que copiar nada.

## Pruebas

`cambiosDeLaSemana.test.js`, `funcionCambiosSemana.test.js`,
`envioDeCambios.test.js`, `funcionCambiosMiercoles.test.js`,
`pantallasCambiosSemana.test.jsx` (también el link fijo), `sincroniaDeProteinas.test.js`. Incluyen una prueba con el lector REAL de la
hoja (`leerCambioDePack`) y la de `[object Object]`.

## Pendiente

- Probar contra Firebase y Kommo reales (todo está probado con simulaciones).
- Renovar DESDE el link (elegir pack y fecha → pedido pendiente de pago).
- Confirmar el cierre para entregas de miércoles a viernes.
