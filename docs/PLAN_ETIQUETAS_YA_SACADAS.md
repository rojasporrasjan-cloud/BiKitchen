# Plan — Etiquetas ya sacadas

Qué falta implementar para que la pantalla de Impresión recuerde qué etiquetas ya
salieron y ofrezca imprimir **solo lo nuevo**.

Escrito el 28 ago 2026. Nada de esto está hecho todavía.

---

## El problema

Hoy, cada vez que se abre la pantalla se calcula el lote completo del día. Si Jan
imprime las 212 etiquetas del sábado y a la mañana siguiente entra un pedido más,
la única opción es volver a imprimir todo o ir buscando a mano los grupos nuevos
con el botón de reimprimir.

## Qué se quiere

1. Al terminar de imprimir un lote, queda registrado que esas etiquetas ya salieron.
2. Al volver a entrar, la pantalla ofrece por defecto **solo lo que falta**.
3. Un check para volver a sacar todas cuando haga falta.

---

## Modelo de datos

Se registra por **pedido**, no por grupo de etiquetas. Los grupos suman varios
clientes ("Albóndigas × 14"), así que no se puede saber cuál de esos 14 envases
ya salió; el pedido sí es la unidad que entra o no entra.

Colección nueva `etiquetas_impresas`, un documento por fecha de producción:

```
etiquetas_impresas/2026-08-29
{
  fecha: '2026-08-29',
  pedidos: {
    '<idDePedido>': {
      huella: 'a3f9…',            // ver abajo
      etiquetas: 10,              // cuántas salieron de ese pedido
      impresoAt: '2026-08-28T22:14:03.120Z',
      impresoPor: 'jan@…'
    },
    …
  },
  actualizadoAt: '…'
}
```

Va en su propia colección y no dentro del pedido a propósito: un pedido mensual
se imprime en cuatro fechas distintas y cada una tiene que quedar aparte.

### La huella

Un hash corto de lo que afecta a las etiquetas de ese pedido:

```
cliente + plan + cantidadMenus + platos (nombres) + lleva cena + lleva desayunos
```

**No** incluye zona, teléfono ni observaciones administrativas: cambiar la zona no
obliga a reimprimir.

Si la huella guardada difiere de la actual, ese pedido vuelve a contar como
pendiente y se marca en pantalla como **"cambió después de imprimirse"**, que es
distinto de "nuevo". Esto responde la duda que quedó abierta: un cliente ya
impreso al que se le agrega un producto **sí** aparece de nuevo, pero señalado,
para que Jan decida si reimprime todo lo suyo o solo lo que agregó.

---

## Archivos

| Archivo | Qué hacer |
|---|---|
| `src/services/printing/etiquetasImpresas.js` | **Nuevo.** `leerImpresas(fecha)`, `marcarImpresas(fecha, pedidos, usuario)`, `huellaDePedido(pedido)`. Mismo patrón que `printerSettings.js`: localStorage + Firestore, y si Firestore falla se sigue con lo local. |
| `src/utils/labels/labelDomain.js` | `buildLabelBatch(rawOrders, date, menus, opciones)` acepta `{ soloPendientes: Set<idPedido> }`. Filtra ANTES de agrupar, para que las cantidades de cada grupo salgan ya correctas. Devolver también `pendientes`, `impresos` y `cambiados` para la pantalla. |
| `src/pages/admin/PrinterView.jsx` | Estado `impresas`; check "Volver a sacar todas"; llamar `marcarImpresas()` cuando la cola termine **en estado completado** (no si se canceló a la mitad). |
| `src/components/admin/PrintJobSidebar.jsx` | Mostrar "18 nuevas · 194 ya impresas" y el check. |

---

## Cuidados

- **Marcar solo lo que de verdad salió.** `PrintQueue` ya cuenta `processed`: si el
  lote se corta a la mitad, marcar únicamente los pedidos cuyas etiquetas se
  completaron. Marcar de más es peor que marcar de menos — un envase sin etiqueta
  se nota al empacar; uno que nunca se imprimió porque el sistema creyó que sí, no.
- **Las divisorias no cuentan.** No son de ningún pedido.
- **Reimprimir no marca.** El botón de reimprimir es para reponer una etiqueta
  dañada; no cambia lo ya registrado.
- **La cuota de Firebase.** Escribir un documento por lote, no uno por etiqueta.
- **Simulación no marca.** En modo simulación no sale papel, así que no puede
  quedar como impreso.

---

## Pruebas

En `src/tests/etiquetasImpresas.test.js`:

- Un pedido nuevo aparece como pendiente y los ya impresos no.
- Cambiar el plato de un pedido impreso lo devuelve a pendientes, marcado como cambiado.
- Cambiar la zona o el teléfono **no** lo devuelve a pendientes.
- Con `soloPendientes`, las cantidades de cada grupo bajan (no se imprimen 14
  albóndigas cuando solo falta 1 cliente).
- Un lote cortado a la mitad marca solo los pedidos completados.
- El check de "todas" devuelve el lote completo.

---

## Orden sugerido

1. `huellaDePedido()` + sus pruebas — es el corazón y se prueba sin UI.
2. `etiquetasImpresas.js` (guardado).
3. El filtro en `buildLabelBatch`.
4. La UI y el check.

Los pasos 1 a 3 se pueden hacer y probar enteros sin tocar la pantalla.

---

## Aparte: revisar el checkout

Detectado el 28 ago 2026 y **sin resolver**: el pedido `#ORD-CH4EQH90XJ` de
sebastian Villegas le confirmó al cliente entregas los **sábados** 29 ago / 5, 12,
19 set, pero en Firestore quedaron los **lunes** 31 ago / 7, 14, 21 set. Los dos
pedidos que hizo esa noche (uno quedó cancelado) tienen las fechas corridas igual.

Se corrigió a mano el pedido confirmado para que entrara a la hoja del sábado,
pero **no se buscó la causa**. Si el checkout está corriendo las fechas, le puede
estar pasando a más clientes sin que nadie lo note hasta que reclaman.
