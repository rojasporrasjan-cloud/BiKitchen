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
`pantallasCambiosSemana.test.jsx`. Incluyen una prueba con el lector REAL de la
hoja (`leerCambioDePack`) y la de `[object Object]`.

## Pendiente

- Probar contra Firebase y Kommo reales (todo está probado con simulaciones).
- Renovar DESDE el link (elegir pack y fecha → pedido pendiente de pago).
- Confirmar el cierre para entregas de miércoles a viernes.
