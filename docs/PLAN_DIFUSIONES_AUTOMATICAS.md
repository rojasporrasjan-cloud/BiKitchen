# Plan: difusiones automáticas con Kommo, conectadas al panel

> Pedido de Jan (5 oct 2026): "tendría que estar bien conectado con Kommo para que
> se esté actualizando… ya quiero empezar a mandar mensajes automáticos cada
> ciertas horas y días".
> Punto de partida: la difusión manual del 5 oct (cierre del miércoles, 85
> enviados), registrada en `admin_config/difusion_2026-10-05_cierre-miercoles`.

> **ESTADO (6 oct 2026):** fase 0 ✅ publicada · fase 1 (`kommo-sync`) ✅ publicada
> 6 oct · fase 2 ✅ resuelta dentro de Listas de Difusión (no hizo falta pantalla
> nueva) y fase 3 ✅ construida como `cierre-de-pedidos` con reglas de marketing,
> SIN publicar todavía · fase 4 pendiente (plantillas de sábado y lunes).
> Decisiones de Jan: 2 por semana, no molestar 30 días, US$80/mes, cierres solo a
> clientes. Detalle y cómo seguir: **`docs/KOMMO_TRASPASO.md`**.

## Qué se quiere al final

1. El panel **sabe en todo momento** qué pasa en Kommo con cada cliente: si
   escribió, si se le mandó algo (y quién: bot o persona), en qué etapa está,
   si dijo "no me interesa", si su chat está en el WhatsApp viejo.
2. Gina o Jan arman una **difusión programada** una sola vez ("cada lunes a las
   2 p. m., a los clientes de miércoles sin entrega, con la plantilla de
   cierre") y sale sola cada semana.
3. Cada envío queda **medido**: a cuántos llegó, cuántos fallaron y por qué,
   cuántos contestaron y **cuántos compraron** en los 3 días siguientes.
4. **Nadie recibe de más**: hay topes por persona, horario y presupuesto, y un
   botón para apagar todo.

## Las piezas

```
            Kommo                                  BiKitchen (Netlify + Firestore)
 ┌──────────────────────────┐     cada 10 min      ┌──────────────────────────────────┐
 │ eventos: mensajes        │ ───────────────────▶ │ kommo-sync  → kommo_contactos/   │
 │ entrantes y salientes,   │   (API de eventos)   │   {teléfono}: contacto bueno,    │
 │ cambios de etapa         │                      │   último mensaje, etapa, "no me  │
 └──────────────────────────┘                      │   interesa", WhatsApp viejo      │
            ▲                                      └──────────────────────────────────┘
            │ bots/run (plantilla aprobada)                     │
            │                                                   ▼
 ┌──────────────────────────┐   cada 15 min        ┌──────────────────────────────────┐
 │ Salesbot por plantilla   │ ◀─────────────────── │ difusiones-programadas           │
 │ (SIN disparador)         │                      │  lee difusiones_programadas/     │
 └──────────────────────────┘                      │  arma el público, aplica topes,  │
                                                   │  manda, anota en envios_kommo    │
                                                   └──────────────────────────────────┘
                                                                    │
                                                                    ▼
                                                   Panel → Difusiones: historial,
                                                   públicos, programar, resultados
```

### 1. Conexión con Kommo (`kommo-sync`, cada 10 minutos)

- Lee de la **API de eventos** de Kommo lo nuevo desde la última vuelta
  (mensajes entrantes y salientes, cambios de etapa). Es lo que ya se usó el 5
  oct y funciona con el token de Netlify.
- Por cada teléfono guarda un documento chico en `kommo_contactos/{8 dígitos}`:
  contacto bueno (el más nuevo, en el WhatsApp conectado), último mensaje del
  cliente, último mensaje enviado, última difusión, etapa del embudo, `noMolestar`
  y `whatsappViejo`.
- **"No me interesa"**: si el cliente toca "Ahora no", escribe "no me
  interesa", "no gracias", "stop", "baja"… queda `noMolestar` por 30 días
  (lo decide Jan; se puede quitar a mano).
- Lecturas de Firestore: casi nada (solo escribe lo que cambió). Escrituras:
  unas cientos por día, muy lejos del tope de 20.000.
- Ojo: Kommo **no dice si un mensaje lo mandó una persona o un bot**. Para lo
  nuestro da igual: si a alguien se le escribió hoy, no se le vuelve a escribir.

### 2. Panel → "Difusiones" (pantalla nueva, solo dueño)

- **Historial**: cada difusión (manual o automática) con enviados, fallidos y
  por qué, respuestas y compras en 72 h. La del 5 oct entra como la primera.
- **Públicos listos** (la misma función arma la lista en el panel y en el envío
  automático, como ya se hace con los avisos):
  | Público | Para qué |
  |---|---|
  | Clientes de **miércoles / sábado / lunes** sin entrega | Cierre de pedidos de ese día |
  | Interesados de los últimos N días (embudo de ventas) | Empujar la primera compra |
  | Terminaron hace 2–3 semanas | Volver a invitar (ya existe) |
  | Clientes nuevos sin segunda compra | Fidelizar |
- **Mandar ahora**: público + plantilla aprobada → muestra a tu número →
  confirmar → sale. Sin entrar a Kommo.
- **Limpieza**: lista de contactos con el chat en el WhatsApp viejo y de
  números mal escritos, para corregirlos.

### 3. Difusiones programadas (`difusiones-programadas`, cada 15 minutos)

Cada programación es un documento en `difusiones_programadas`:

| Campo | Ejemplo |
|---|---|
| nombre | Cierre del miércoles |
| público | clientes de miércoles sin entrega |
| plantilla / bot | `cierre_pedidos_miercoles` / 117463 |
| cuándo | lunes 2:00 p. m. |
| modo | apagado · prueba (solo a Jan) · prendido |
| tope | 150 personas |

La función mira cuáles tocan, arma el público **en ese momento** (así sale sin
los que compraron hasta esa hora), aplica las reglas de abajo, manda y lo anota.

### 4. Reglas que no se negocian (en el código, no en la pantalla)

1. **Una difusión de marketing por persona por día** y **máximo 2 por semana**
   (todas sumadas). Los avisos de servicio (pago recibido, hoy te llega) no cuentan.
2. Nunca a: quien ya compró para esa entrega, `noMolestar`, teléfonos de
   relleno, contactos con chat en el WhatsApp viejo, el número de Jan (salvo
   prueba), a quien se le escribió hoy.
3. Solo entre **8 a. m. y 7 p. m.**
4. Tope por envío; si el público sale más grande, **no manda nada** y avisa.
5. **Presupuesto mensual** (lo pone Jan): al llegar, se apagan las de marketing.
6. **Interruptor general** en el panel y en Netlify: apaga todo de una.
7. Toda programación nueva arranca en **prueba** una semana.

## Calendario sugerido (para arrancar)

| Cuándo | Qué | Público | Plantilla |
|---|---|---|---|
| Lunes 2 p. m. | Cierre del miércoles | Clientes de miércoles sin entrega | `cierre_pedidos_miercoles` ✅ |
| Jueves 2 p. m. | Cierre del sábado | Clientes de sábado sin entrega | `cierre_pedidos_sabado` (crear) |
| Viernes 2 p. m. | Cierre del lunes | Clientes de lunes sin entrega | `cierre_pedidos_lunes` (crear) |
| Miércoles 8 a. m. | Menú y cambios | Los que reciben sábado/lunes | ya existe |
| Martes 10 a. m. | Volver a invitar | Terminaron hace 2–3 semanas | ya existe |

Con el tope de 2 por semana, un cliente que es de miércoles y de sábado recibe
como mucho dos cierres, no tres.

## Costo estimado

Marketing ≈ US$0,074 por mensaje entregado (Costa Rica, aprox.).

| | Por semana | Por mes |
|---|---|---|
| 3 cierres × ~90 personas | ~US$20 | ~US$85 |
| Con el tope de 2 por semana por persona | ~US$15 | ~US$65 |

La primera semana se mide cuántos compran por cada envío: si un cierre de US$7
trae dos pedidos, se paga solo muchas veces. Si no, se ajusta el público.

## Fases

| Fase | Qué | Depende de |
|---|---|---|
| 0 | Publicar lo que ya está (4 avisos nuevos, contacto más nuevo, link de cambios que reconoce al cliente) | Sí de Jan |
| 1 | `kommo-sync` + `kommo_contactos` + reglas de Firestore | Fase 0 |
| 2 | Panel "Difusiones": historial, públicos, mandar ahora (prueba primero) | Fase 1 |
| 3 | Programadas + reglas + presupuesto + interruptor | Fase 2 |
| 4 | Plantillas de cierre del sábado y del lunes; una semana en prueba; prender | Fase 3 |

Cada fase se publica por separado, con build y pruebas, nunca viernes ni sábado.

## Lo que tiene que decidir Jan (con Gina)

1. ¿El calendario de arriba está bien (días y horas)?
2. ¿Tope por persona: 2 de marketing por semana?
3. ¿"No me interesa" = 30 días sin marketing, o para siempre?
4. ¿Presupuesto mensual para marketing? (sugerido: US$60–80)
5. ¿En los cierres van también los interesados del embudo, o solo clientes que
   ya compraron? (el 5 oct se mandó solo a clientes)

## Notas para quien lo programe

- Usa lo que ya existe: `enviarPorKommo` y `elMasNuevo` (contacto bueno),
  `avisoDelDia.js` (recorrido con prueba/tope/constancia), `registroDeEnvios.js`
  (`envios_kommo`), `TarjetaDeEnvio` (panel).
- Firestore Spark: el panel NO baja `kommo_contactos` entero; lee un resumen
  (`kommo_resumen/actual`) y listas paginadas. Regla 17 de CLAUDE.md.
- Reglas de Firestore nuevas: `kommo_contactos`, `difusiones_programadas`,
  `difusiones` (solo admin / solo servidor). Se despliegan aparte de Netlify.
- Bots de Kommo SIEMPRE sin disparador (Kommo lo mete solo al guardar:
  cancelarlo y confirmar en la lista).
