# Carga del lunes 31 de agosto — lo que quedó hecho

Revisado contra tres fuentes a la vez: el chat de **VENTAS LUNES** (export completo +
los mensajes de hoy en WhatsApp Web hasta las 9:19 p.m.), la **hoja de Gina**
(`Tabla para resumenes- Lunes 31 AGOSTO - Parte final (2).xlsx`) y la **base de datos**.

---

## 0. El menú NO se tocó

Quedó el que ya estaba en la página, según tu indicación.

**Ojo con esto:** la hoja de Gina del lunes 31 trae **otro menú de Bajo Calorías**.

| | Sistema (lo que va a salir en las etiquetas) | Hoja de Gina del 31 |
|---|---|---|
| 1 | Albóndigas de res artesanales | Garbanzos con pollo |
| 2 | Pollo en salsa teriyaki | Fajitas de cerdo en salsa de mostaza |
| 3 | Lentejas con trocitos de cerdo | Pollo caribeño |
| 4 | Estofado de res | Carne mechada en salsa criolla |
| 5 | Pollo en salsa de curry y coco | Filet de pollo bañado en salsa criolla |

Las demás familias (Regular, Full Pack, Sin Carbos, Vegetariano, Casaditos) y los
desayunos **sí coinciden** exactamente entre la hoja de Gina y el sistema. La cena de
Sin Carbos y Regular también coincide. La única diferencia es Bajo Calorías.

Si al final hay que cambiarlo, es un solo cambio en Menús → Bajo Calorías (almuerzo y cena).

---

## 1. Pedidos creados — 18 en PENDIENTE, listos para que los apruebes

| Cliente | Pedido | Total | Nota |
|---|---|---|---|
| Alexa Astua | #ORD-DUPNHUMT2A | ₡95.950 | Menú personalizado **sin definir** — no está en ninguna hoja |
| Monserrat Gutiérrez | #ORD-DUPOEAYYXR | ₡93.890 | **Sin teléfono** (8888-8888) |
| Manuel Morales | #ORD-DUQLAPE7KE | ₡58.700 | Two pack regular |
| Sofia Gutiérrez | #ORD-DUQLH77HHE | ₡162.000 | Lentejas → Pollo Teriyaki |
| Carolina Guerrero | #ORD-DUQLQ6QOT1 | ₡28.850 | |
| Cesar Quesada Zamora | #ORD-DUQM2LLMAR | ₡30.350 | Tel 8789-4536 (de tu archivo de contactos) |
| Enid Calvo Cascante | #ORD-DURTTSYS6A | ₡53.500 | Familiar Deluxe |
| Rosaura de la Torre | #ORD-DURU216JV2 | ₡27.500 | Vegetales → crema de vegetales |
| Gerli Ramirez | #ORD-DUSC8QFBKN | ₡16.500 | **Zona en conflicto** (ver abajo) |
| Karen Villarreal | #ORD-DUSCGJE0RQ | ₡37.500 | 4 proteínas × 500 g |
| Raquel Lobo | #ORD-DUSCSYZTEO | ₡28.850 | 500 g en empaque de 250 g · tel 8840-6607 |
| Marcela Soto | #ORD-DUSU1MFZJF | ₡60.050 | Envío cortesía |
| Adriana Cubillo | #ORD-DUTBRMQVUA | ₡44.500 | **Sin medida** |
| Sara Padilla | #ORD-DUTC3QS9U8 | ₡45.100 | **Sin medida** · tel 8324-7796 |
| Alejandra Calderón | #ORD-DV9Z4B4EXW | ₡24.000 | Estaba en la hoja de Gina, no en el sistema |
| Jimena Bedoya | #ORD-DV9ZVFXSR9 | ₡28.850 | No come pescado |
| Christian Vargas | #ORD-DVAJ2B4YIY | ₡72.700 | 4 cambios de plato |
| Leo Heisterkamp | #ORD-DVAJDYRIUC | ₡70.800 | Two pack Full de 7 comidas |

Las medidas de los individuales van **escritas** en `items[].medidas`, no calculadas.

### Precios que hay que revisar antes de aprobar
Christian Vargas, Leo Heisterkamp y Jimena Bedoya **no traen precio en el chat ni en la
hoja**. Les puse el del catálogo y lo dejé anotado en el pedido. Los tres son de
"semana 2/3/4" de un plan que quizá ya está pagado — puede que el monto correcto sea ₡0.

---

## 2. El documento anterior estaba desactualizado

Decía "todavía sin cargar", pero **8 de los 23 ya estaban en la base** desde el 28 de
agosto: Carolina Laurito, Javier Villarroel, Julio Martinez, Fabricio Lascaris,
Ricardo Perez, Ericka Anderson, Yendry Rodríguez y Milton Hernandez.
Si se cargaban de nuevo, quedaban ocho pedidos duplicados.

---

## 3. Errores que estaban en la base y quedaron corregidos

**Marlon Camacho y Francisco Gonzalez cocinaban el doble.**
Los dos son "Two Pack" y estaban guardados con `cantidad: 2`. Como el sistema ya duplica
solo al ver "Two Pack", la hoja los contaba **4 packs cada uno en vez de 2**: 4 packs de
más, 20 comidas. Los precios lo confirman — ₡147.000 y ₡167.100 son exactamente el
precio de UN Two Pack mensual en el catálogo. Corregido a `cantidad: 1`; el dinero no cambió.

**Ericka Anderson tenía mal las fechas.** El chat dice 31 ago, 7, **21** y 28 set —
se salta el 14. La base tenía 31, 7, 14, 21. Corregido, y le agregué "1 sin pescado, 1 sin cerdo".

**A Carolina Laurito le faltaba el cambio de plato** (2 platos de lentejas → pollo al pesto).

**Milton Hernandez** quedó con las medidas escritas (250 g × 5).

**Fátima Arauz** estaba para el miércoles 2 y 9 de setiembre; pasó al lunes 31 y 7 set.

**Andrea Marote** tenía la segunda entrega el 21 de setiembre, que no calza con un plan
de dos semanas. La moví al 31 según la hoja de Gina — **conviene confirmarlo**.

### Cambios de fecha
- **Christopher Ulloa** → del 31 al miércoles 2 de setiembre
- **Jason Barrantes** → del 31 al lunes 7 de setiembre (+ teléfono 7012-1247)

### Cambios de plato
Los 5 que ya estaban aplicados se verificaron y están bien: Diana Morera, Carlos
Martinez, Mauricio Vargas, Shirley Brizuela y Nancy Jimenez.

---

## 4. Carolina Acevedo — los individuales iban a desaparecer

Gina la tiene **dos veces** en la hoja: el pack quincenal y una lista de individuales
de ₡43.050. Al cargar los individuales como pedido aparte, la hoja los **fusionaba**
con el pack y **se perdían los cinco platos** (así funciona la deduplicación por cliente).

Los pasé como ítems dentro del pedido del pack (#ORD-C87LIXOEZA) y anulé el pedido
suelto. Ahora los seis salen juntos. **Los ₡43.050 siguen pendientes de cobro.**

---

## 5. Cosas sueltas que hay que resolver

- **Alexa Astua** lleva "menú personalizado" pero los platos no están escritos en
  ningún lado — ni en el chat ni en la hoja Personalizado de Gina.
- **Adriana Cubillo y Sara Padilla**: sus platos no traen medida.
- **Gerli Ramirez**: el mensaje de la 1:31 p.m. dice **Rohrmoser** y el de las 9:19 p.m.
  dice **GRECIA PUENTE PIEDRA**. La hoja de Gina y tu archivo de contactos dicen
  Rohrmoser, y el envío de ₡3.000 calza más con Rohrmoser. Lo dejé marcado como
  "CONFIRMAR" para que nadie despache a ciegas.
- **Monserrat Gutiérrez** sigue sin teléfono. Busqué en Kommo y en tu archivo de
  contactos y no aparece (hay una "Monserrat Bonilla" y una "Monserrat Morales", pero
  son otras personas).
- **Enid Murillo** lleva reposición **con el menú de la semana pasada**. Como el menú no
  se cambió, hoy le sale bien. Si algún día se cambia, hay que sacarla aparte.
- **Mauricio Vargas** tiene dos notas que se contradicen: "poner platos de lentejas y
  garbanzos con carne de cerdo" (vieja) y "dieta blanda, solo pescado, pollo o atún"
  (nueva, del 27 ago). Manda la nueva.

---

## 6. A Gina le faltan 8 clientes en su hoja

Están en la base para el 31 pero no en su lista: **Evelyn Jiménez Salas, Johnny Vargas
Mora, Kendall Barboza, Keylin Nuñes, Rudy Mora, Ericka Anderson, Karen Villarreal y
Sara Padilla.**

---

## 7. Control de que nadie se perdió

El teléfono de relleno 8888-8888 (Monserrat Gutiérrez) **no fusionó a nadie**: la
deduplicación por cliente quedó en cero fusiones. El total de clientes **subió**, no bajó.
