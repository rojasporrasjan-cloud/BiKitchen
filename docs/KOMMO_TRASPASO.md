# Kommo automatizado — TRASPASO (para seguir desde otra cuenta de Claude)

> Escrito el 6 oct 2026 por la cuenta que lo construyó. Leerlo ENTERO antes de
> tocar algo de Kommo. Complementa (no reemplaza) a:
> - `docs/AUTOMATIZACION.md` — cómo funciona cada envío por dentro (contratos de datos)
> - `docs/KOMMO_CONFIGURACION.md` — plantillas, bots y campos en Kommo, paso a paso
> - `docs/PLAN_DIFUSIONES_AUTOMATICAS.md` — el plan por fases y las reglas de marketing
> - `CONTEXTO.md` (raíz) — bitácora de todo el negocio. Al terminar, anotar ahí.

## 1. Qué quiere Jan

"Dejar Kommo automatizado": que los WhatsApp a clientes salgan solos, a la hora
correcta, sin mandar de más, y que el panel sepa qué pasa en Kommo. Jan no es
programador: se le habla **en español** (voseo, Costa Rica), simple, sin jerga.

## 2. Cómo está HOY (6 oct 2026)

### Publicado y corriendo

| Pieza | Qué hace | Estado |
|---|---|---|
| `kommo-sync` (cada 10 min) | Lee eventos de Kommo (mensajes, etapas, etiqueta `no-molestar`) y arma una ficha por teléfono en `kommo_contactos/{8 dígitos}` | **Publicado 6 oct 5:18 a. m.** Primera vuelta: 1.843 eventos, 178 fichas. Se estaba poniendo al día con los últimos 30 días |
| Avisos alrededor de la entrega | hoy-te-llega, guía de congelado, ¿qué tal?, volver a invitar | Publicados (fase 0). Interruptores en **prueba** (4 oct) |
| Pago recibido / recordatorio de pago / renovación / cambios del miércoles | — | Publicados. Ver tabla de la sección 3 |
| Link fijo `/cambios` que reconoce al cliente | — | Publicado |

### Publicado el 6 oct 2026 ~8 a. m. (deploy `dd3effe`, etiqueta `deploy-2026-10-06-cierres`)

Lo de la tabla de abajo YA ESTÁ en producción. Además, ese mismo día:
- Plantillas **`cierre_pedidos_sabado`** (cierra 8:00 p. m.) y **`cierre_pedidos_lunes`**
  (cierra 8:30 p. m., la hora que usó Gina el 2 oct) enviadas a Meta → **En análisis**.
  Mismo texto que `cierre_pedidos_miercoles`, Marketing, Español ES, sin encabezado.
- Netlify: `KOMMO_BOT_CIERRE_MIERCOLES` = 117463 y `CIERRE_PEDIDOS_AUTOMATICO` =
  `prueba` (creadas) + redeploy para que las funciones las vean. El primer cierre
  en prueba sale el **lunes 12 oct 2 p. m.**: muestra a Jan, lista real en Listas de Difusión.
- **Falta:** cuando Meta apruebe las 2 plantillas, crear sus bots (un paso
  Mensaje, SIN disparador) y poner `KOMMO_BOT_CIERRE_SABADO` /
  `KOMMO_BOT_CIERRE_LUNES` en Netlify + redeploy. Hasta entonces el jueves y el
  viernes la función responde `sin-configurar` y no manda nada.

| Commit | Qué |
|---|---|
| `2a13180` | **Cierre de pedidos automático** (`netlify/functions/cierre-de-pedidos.js` + `src/utils/cierresDePedidos.js`): lunes, jueves y viernes 2 p. m., a clientes que ya compraron para ese día de reparto y no tienen entrega. Reglas de marketing: máx. 2 por persona por semana, nada a `no molestar`, presupuesto US$80/mes. `volver-a-invitar` pasa por las mismas reglas. Listas de Difusión muestra la lista del próximo cierre, la conexión con Kommo y el gasto del mes |
| `7e4d8bd` | Arreglo de `kommo-sync`: al ponerse al día ya no achica la ventana por falta de páginas |

Pruebas: `src/tests/cierreDePedidos.test.js` (14), `src/tests/cierreEnElPanel.test.jsx` (1),
`src/tests/kommoSync.test.js` (12). Build OK. Publicado con el sí de Jan.

**OJO Netlify:** un cambio de variable NO llega a las funciones hasta el próximo
deploy (Deploys → Trigger deploy → Deploy project).

## 3. Todos los envíos automáticos

Todos usan el mismo patrón: interruptor en Netlify `no` (o sin poner) → nada ·
`prueba` → UNA muestra al `CAMBIOS_TELEFONO_PRUEBA` y la lista real queda en
`envios_kommo` · `si` → a los clientes. Constancia en `envios_del_dia` para no
repetir. Tope por envío: si la lista sale más grande, NO manda nada.

| Envío | Función | Cuándo (CR) | Interruptor | Bot (id) | Plantilla |
|---|---|---|---|---|---|
| Menú y cambios | `cambios-miercoles` | miércoles 8 a. m. | `CAMBIOS_ENVIO_AUTOMATICO` | `KOMMO_BOT_CAMBIOS` = 115866 | `cambios_personal` |
| Renovación | `renovacion-del-dia` | L/M/S 10 a. m. | `RENOVACION_AUTOMATICA` | `KOMMO_BOT_RENOVACION` = 117251 | `renovacion_pack` |
| Recordatorio de pago | `recordatorio-pago` | diario 10 a. m. | `RECORDATORIO_PAGO_AUTOMATICO` | `KOMMO_BOT_RECORDATORIO_PAGO` = 117247 | — |
| Pago recibido | `pago-recibido` | cada 10 min | `PAGO_RECIBIDO_AUTOMATICO` | `KOMMO_BOT_PAGO_RECIBIDO` = 117249 | `pago_recibido` |
| Hoy te llega | `hoy-te-llega` | L/M/S 7 a. m. | `HOY_TE_LLEGA_AUTOMATICO` | `KOMMO_BOT_HOY_TE_LLEGA` = 117253 | `hoy_te_llega` |
| Guía de congelado | `guia-de-congelado` | L/M/S 3 p. m. | `GUIA_CONGELADO_AUTOMATICO` | `KOMMO_BOT_GUIA_CONGELADO` = 117259 | `guia_de_congelado` |
| ¿Qué tal todo? | `que-tal-todo` | D/M/J 11 a. m. | `QUE_TAL_AUTOMATICO` | `KOMMO_BOT_QUE_TAL` = 117257 | `que_tal_todo` |
| Volver a invitar (marketing) | `volver-a-invitar` | martes 10 a. m. | `VOLVER_A_INVITAR_AUTOMATICO` | `KOMMO_BOT_VOLVER_A_INVITAR` = 117255 | `volver_a_invitar` (15 % desc.) |
| **Cierre de pedidos (marketing)** | `cierre-de-pedidos` | L/J/V 2 p. m. | `CIERRE_PEDIDOS_AUTOMATICO` | `KOMMO_BOT_CIERRE_MIERCOLES` = 117463 · `KOMMO_BOT_CIERRE_SABADO` = **falta** · `KOMMO_BOT_CIERRE_LUNES` = **falta** | `cierre_pedidos_miercoles` ✅ · sábado y lunes **por crear** |
| Conexión con Kommo | `kommo-sync` | cada 10 min | `KOMMO_SYNC_AUTOMATICO` (sin poner = corre; `no` = apagado) | — | — (solo lee) |

Modos según el último resumen de Netlify (4 oct 2026): todos los avisos en
`prueba`; `CAMBIOS_ENVIO_AUTOMATICO` sin cambiar (verificar). **Antes de prender
algo, confirmar el valor real en Netlify** (Site configuration → Environment variables).

Otras variables (no secretas): campos de contacto en Kommo — Link cambios
`2457274`, Pack `2457276`, `KOMMO_CAMPO_ENTREGA` = 2459925,
`KOMMO_CAMPO_CIERRE_CAMBIOS` = 2459927; `KOMMO_CAMPO_PRIMER_NOMBRE` (saludo con el
primer nombre; el campo hay que crearlo en Kommo si no existe). Secretas
(NUNCA mostrarlas ni copiarlas): `KOMMO_TOKEN`, `CAMBIOS_SECRETO`, Firebase, NMI.

## 4. Datos en Firestore (solo el servidor los toca)

| Colección | Qué guarda |
|---|---|
| `kommo_contactos/{tel8}` | Ficha por cliente: `ultimoEntrante`, `ultimoSaliente`, `etapa`, `noMolestarDesde`, `contactos` (ids de Kommo), `marketing: { '2026-W41': n }`, `ultimaDifusion` |
| `kommo_sync/estado` | Cursor de lectura (`cursor`, `ventana`, `ultimaVuelta`, `alDia`, `totalEventos`) |
| `kommo_sync/indice` | contacto de Kommo → teléfono (para no preguntar dos veces) |
| `kommo_presupuesto/{AAAA-MM}` | `mensajes` de marketing del mes (US$0,074 c/u, tope US$80) |
| `envios_kommo` | Registro de cada vuelta de cada envío (lo muestra Listas de Difusión) |
| `envios_del_dia/{tipo}_{clave}` | Constancia para no mandar dos veces |

Regla 17 de `CLAUDE.md` (plan Spark, 50.000 lecturas/día): **nunca** bajar
colecciones enteras. El panel lee el estado por la función `kommo` (acción
`envios`), no directo (las reglas de Firestore no le dan permiso al navegador).

## 5. Lo que falta, en orden

1. ~~Publicar~~ ✅ 6 oct.
2. **Fase 4 — bots del cierre del sábado y del lunes.** Las plantillas ya se
   mandaron a Meta el 6 oct (se crean por la interfaz en `/chats/tools/templates/`:
   la API de plantillas está bloqueada, "Only integrations"). Cuando estén
   **Aprobado**: crear un bot por plantilla (un paso Mensaje, **SIN disparador**)
   y poner sus ids en Netlify: `KOMMO_BOT_CIERRE_SABADO`,
   `KOMMO_BOT_CIERRE_LUNES`; después Trigger deploy.
3. ~~Netlify miércoles~~ ✅ 6 oct. Una semana en prueba: cada lunes, jueves y
   viernes a las 2 p. m. le llega la muestra a Jan y la lista real aparece en
   Listas de Difusión → "Cierre de pedidos". Si Jan la aprueba → `si` (+ redeploy).
4. Prender de a uno los avisos que siguen en `prueba`, con el sí de Jan.
5. Bot "Ahora no": que ponga la etiqueta `no-molestar` en el lead (kommo-sync
   ya la lee y deja 30 días sin marketing).
6. Ideas que quedaron: medir cuántos compran en las 72 h después de cada
   difusión (cruzar `envios_kommo` con pedidos nuevos por teléfono); lista de
   contactos con chat en el WhatsApp viejo (source 55646, error 3137) para limpiarlos.

## 6. Cómo se trabaja (no saltarse nada)

- **Dónde:** la automatización se publica desde la carpeta hermana
  `bk-solo-automatizacion` (un `git worktree`, rama
  `automatizacion/link-personal-y-pago`), NO desde `BiKitchen-main`, que tiene
  trabajo de la hoja de producción sin publicar de la otra cuenta.
- **Antes de publicar:** `git fetch origin && git merge origin/main` (la otra
  cuenta publica cosas), pruebas y build. Las pruebas necesitan las claves de
  Firebase de la carpeta principal (el worktree no tiene `.env`):
  `set -a; . ../BiKitchen-main/.env; set +a; npx vitest run` y `npm run build`.
  Hay ~10 pruebas del importador (`adrianMorera`, `andresPalavicini`, …) que
  fallan porque dependen de la fecha de hoy: ya fallaban, no son de Kommo.
- **Publicar = `git push origin HEAD:main`** (Netlify publica solo). Antes:
  etiquetas `produccion-antes-<fecha>-<tema>` en `origin/main` y
  `deploy-<fecha>-<tema>` en HEAD, y empujarlas. **Siempre con el sí de Jan.
  Nunca viernes ni sábado** (son días de producción).
- **Después de publicar:** revisar los logs en Netlify → proyecto `bikitchen`
  → Functions → la función → Function log → "Last hour".
- **Kommo desde Chrome:** Jan tiene la sesión abierta en su Chrome. La API v4
  se usa desde la página con `fetch('/api/v4/…', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })`.
  Los chats se leen en `/leads/detail/{id}` con `.js-notes` (abrirlos los marca
  como leídos). Solo LEER salvo pedido explícito: no mandar mensajes, no
  activar bots, no tocar leads.

## 7. Trampas conocidas de Kommo (ya costaron tiempo)

- `/api/v4/events` devuelve SIEMPRE lo más nuevo primero (ignora `order`): se
  lee por ventanas cerradas `filter[created_at][from|to]`.
- Los eventos no traen el texto del mensaje ni distinguen bot de persona.
- `/api/v4/bots/run` funciona; crear plantillas por API NO.
- Al guardar un bot, Kommo le mete un disparador solo: cancelarlo y revisar en
  la lista que ninguno tenga. **Bots SIEMPRE sin disparador** (los dispara el código).
- Un mismo teléfono puede tener 2 contactos: se usa el más nuevo (`elMasNuevo`).
- Chats en el WhatsApp viejo (source 55646) dan error 3137: no llegan.
- Plantillas de marketing: Meta puede no entregarlas si la persona recibió
  muchas promociones. Por eso los topes.

## 8. Decisiones de Jan (no cambiarlas sin preguntar)

- Máximo **2 mensajes de marketing por persona por semana** (5 oct).
- "No me interesa" / etiqueta `no-molestar` = **30 días** sin marketing (5 oct).
- **Presupuesto de marketing: US$80 al mes** (6 oct).
- Cierres: **solo a clientes que ya compraron**, no a interesados (6 oct).
- Calendario de cierres: lunes → miércoles, jueves → sábado, viernes → lunes,
  a las 2 p. m. (aprobado el 5 oct).
- Volver a invitar con **15 % de descuento** (4 oct).
- Toda programación nueva arranca en **prueba**.
