# Contexto — BiKitchen, hoja de producción

> Pegá este archivo completo como primer mensaje en la otra sesión de Claude.
> Actualizado el 10 de setiembre de 2026.
> Si algo acá contradice el código, gana el código: verificalo antes de actuar.

---

## 1. Qué es BiKitchen

Servicio de comida saludable a domicilio en Costa Rica (meal prep).
**Jan** es el dueño y **no es programador** — hay que explicarle en términos del
negocio, no del código. **Gina** maneja la cocina y es quien lee la hoja de
producción todos los días.

Los clientes compran **packs**: semanales, quincenales (2 entregas) o mensuales
(4 entregas). Un pack trae 5 platos. Se reparte **lunes, miércoles y sábado**.

La **hoja de producción** le dice a la cocina qué cocinar y a empaque qué meter
en cada bolsa. Si un pedido no sale bien ahí, alguien no recibe su comida.

---

## 2. El ritmo de la semana

| Día | Qué hoja sale |
|---|---|
| **Martes** | Empaque y cocina del miércoles |
| **Jueves** | Solo cocina — sábado completo + adelanto del lunes |
| **Viernes** | Empaque y cocina, descontando lo del jueves |
| **Sábado** | Empaque del lunes y lo que falte de cocina |

**Cada hoja lleva solo lo que no se mandó antes.** Si una tanda repite un pedido
de la anterior, se cocina dos veces.

### Reglas de la cocina que hay que respetar

- **Del día de adelanto SÍ van los desayunos.** Gina los hace el jueves.
  (Ojo: en agosto había dicho lo contrario y el filtro quedó en el código; ver
  la sección 6.)
- **El keto y los familiares NO se hacen el jueves** — esos van el viernes.
- **Empaque son dos corridas**: primero la del sábado (se cierra ese día),
  después la del lunes (va a refri sin cerrar, le faltan cenas y desayunos).
- Dentro de cada corrida: primero los packs **sin cambios**, de corrida;
  después los que llevan cambio escrito, uno por uno.

### Los interruptores de la hoja

Arriba de la hoja hay casillas que cambian qué entra:

| Interruptor | Default | Qué hace |
|---|---|---|
| Viendo TODO (sin rebajar) | prendido | No descuenta lo ya cocinado |
| CON los desayunos del adelanto | **prendido** | Incluye los desayunos del lunes |
| SIN keto ni familiares | apagado | Los deja para el viernes |

---

## 3. Dónde vive todo

| Cosa | Dónde |
|---|---|
| Proyecto | React + Vite, puerto `9999`. Firestore `bikitchen-food`. Netlify |
| Pedidos | Colección `pedidos` |
| Tandas ya enviadas | Colección `tandas_cocina` |
| La hoja | `/admin/print-production` |
| Código de la hoja | `src/pages/admin/PrintProductionView.jsx` |
| Menús de Gina | `C:\Users\rojas\Desktop\bikitchen\menus\*.xlsx` |
| Reglas del proyecto | `CLAUDE.md` — **leerlo antes de editar** |
| Rama de trabajo | `release/hoja-produccion-y-seguridad` |

### Parámetros de la hoja (URL)

| Parámetro | Qué hace |
|---|---|
| `date` | Fechas separadas por coma: `2026-09-12,2026-09-14` |
| `adelanto` | Cuáles van recortadas a mensuales y quincenales |
| `tanda=adelanto` | Recorta la tanda entera |
| `soloPacks` | Adelantar una sola familia |
| `view` | `all` · `empaque` · `cocina` |
| `rebajar` | Descontar tandas anteriores |

---

## 4. Cómo se ve un pedido

| Campo | Qué es |
|---|---|
| `id` | El id real del documento. **No es el `numeroOrden`** |
| `numeroOrden` | El número visible, `#ORD-XXXX` |
| `cliente` | Nombre. La hoja agrupa por nombre |
| `plan` | Nombre del pack. De acá sale la familia del menú |
| `status` | Solo se cocina si está en la lista de abajo |
| `fechas_entrega` | Arreglo `YYYY-MM-DD`. **Este manda** |
| `fecha_entrega` | Una sola fecha. No usarla para filtrar |
| `items[]` | `nombre`, `proteinas[]`, `medidas[]`, `cantidad` |
| `observaciones` | Cambios, alergias, notas |

**Estados que se cocinan:** `confirmed` `confirmado` `pagado` `preparing`
`preparando` `making` `ready` `listo` `in_transit` `delivered` `entregado`.
`pending_payment` **no sale**.

---

## 5. Las trampas que cuestan comida

### 1 — Documentos fantasma
El `numeroOrden` no es el id del documento. Un `PATCH` con el número de orden
**no falla: crea un documento nuevo**. Buscar el pedido, tomar su `id` real.

### 2 — El Two Pack se duplica solo
"Two Pack" ya vale 2 packs; el código multiplica ×2. Cargarlo con cantidad 2
cocina **4**. Siempre `cantidad: 1`.

### 3 — Dos pedidos del mismo cliente el mismo día
La hoja los fusiona y del segundo solo conserva observaciones y zona: sus platos
desaparecen. Meter todo como ítems de **un solo pedido**.

### 4 — El teléfono de relleno
`8888-8888` hacía que dos personas se fusionaran y una desapareciera. Ya está
corregido, pero verificar que el total de clientes no baje.

### 5 — El `menu` viejo tapa a `items`
Si `menu` quedó como resumen de una línea, gana él y el pedido sale sin platos.
Al editar a mano, escribir **las dos listas iguales**.

### 6 — Las medidas de los individuales
Van **escritas** en `items[].medidas`, nunca calculadas. Copiar lo que escribe
Gina: `1 kg`, `500 g`, `4 unidades`, `1 molde desechable`.

### 7 — Un pedido que no dice qué cocinar
Si no calza con ninguna familia y sus "platos" son el nombre del plan repetido,
no hay qué cocinar. **Ya avisa solo** (`pedidosQueNoDicenQueCocinar`).

### 8 — Cerrar el día mata packs a medio camino
Pasa el pedido entero a `delivered` aunque le queden entregas.

### 9 — Entregas inventadas al importar
Una línea de ítem que empieza con número se leía como fecha: `3 Individuales…`
se volvía "3 de setiembre". **Corregido** el 10 set.

### 10 — "estilo X" NO es el mismo plato
La hoja junta platos parecidos y se queda con el nombre más largo.
"Mix de vegetales estilo Mediterráneo" se fusionaba con "Mix de vegetales" y la
cocina veía 58 porciones de un plato que no existía. **Corregido**: "estilo"
ahora distingue, igual que "y" y "con".

### Lo que NO es un bug
"Menú personalizado" no es una lista aparte: son los platos del menú semanal con
ingredientes cambiados.

---

## 6. Pantalla y Excel se contradecían

Dos veces apareció el mismo patrón: una regla aplicada **solo en la pantalla**
mientras el Excel —que es de donde Gina cocina— hacía otra cosa.

- **Los desayunos del adelanto**: la pantalla decía 4, el Excel 27. Gina cocinaba
  del Excel, por eso los hacía. Ya los dos aplican el mismo filtro.
- **El orden de la hoja de cocina**: la pantalla por TANDA, el Excel por unidad
  de mayor a menor. Ya los dos usan `ordenarPorTanda` + `conCabecerasDeTanda`.

**Al tocar cualquier regla de qué entra en la hoja, aplicarla sobre la lista de
pedidos (antes de armar nada), no en el render.** Así las dos salidas la ven.

---

## 7. Regla de Firebase: las menos lecturas posibles

Plan gratuito: **50.000 lecturas por día**. Al agotarse, Firestore contesta 429
y las pantallas salen en blanco. Ya pasó dos veces.

Orden para buscar información:
1. **La pantalla del admin** — ya tiene los datos; leer su DOM no gasta nada
2. Los chats y archivos
3. El código
4. Una consulta dirigida
5. Bajar la colección entera — último recurso

**Truco:** con la hoja abierta, sacar los pedidos del árbol de React
(`__reactContainer` → `memoizedState`, buscar un arreglo grande con
`numeroOrden`). Cero lecturas.

El contador de la barra ya es confiable: en setiembre siete pantallas leían sin
anotar y marcaba 20% con la cuota agotada.

---

## 8. Cómo verificar que una hoja está bien

**Construir por tu cuenta quién debería salir, y compararlo con lo que la hoja
dibuja.**

1. Pedidos con `status` que imprime y alguna fecha de la hoja
2. Regla del adelanto: si todas sus entregas caen en día de adelanto, solo pasa
   si tiene más de una fecha
3. De la hoja, los botones `button[title^="Arreglar el pedido de"]`
4. Comparar

**Tres puntos ciegos que ya me hicieron dar falsas alarmas:**

- La hoja tiene **dos vistas excluyentes**: "Ver Packs Normales" y
  "Ver Individuales y Desayunos". Una esconde a la otra.
- Las **sub-filas tienen menos celdas** por los `rowSpan`: leer por índice fijo
  de columna se salta filas.
- La tabla de **INDIVIDUALES no usa botones**, hay que leerla como texto.

**Los packs cuadran** si las tablas de una familia (menú 1 + con cambio + cenas)
suman el número de "N EN LA FAMILIA".

**El granel** lleva 30% de merma (`MARGEN_COCINA = 1.30`) sobre lo que va a las
ollas; los individuales van sin merma. Las harinas dan exacto: porciones × 0,5 ×
1,30. El arroz: la olla grande = suma de sus arroces.

---

## 9. El menú — verificado el 10 de setiembre

Comparado el archivo `MENU DEL 08 AL 14 SETIEMBRE.xlsx` contra Firestore:

**Correctos:** bajoCalorias · regular · casaditos · fullPack · keto ·
familiarPremium · cena.bajoCalorias · cena.sinCarbos · cena.casaditos

**Diferencias encontradas:**

| Qué | Detalle |
|---|---|
| `sinCarbos` plato 1 | El sistema dice **"Chayotes salteados al ajillo"**; el archivo dice **"Chayotes a la parmesana"** |
| `familiarDeluxe` | Sobra **"Ensalada de papa"** — el archivo lleva 6 platos, el sistema 7 |
| `sinCarbos` y `keto` | Tienen carbos guardados. **La hoja los ignora** (esas familias no llevan carbo), así que no afecta la cocina |

**Aparte, no es el menú oficial:** el **menú personalizado de Dalia Parrales**
es el del **01 al 07** completo — sus once platos son de la semana pasada.
Son 3 packs.

---

## 10. Qué está abierto

| Caso | Qué pasa |
|---|---|
| **Menú de Dalia Parrales** | Es el del 01–07. Hay que rehacerlo con el de esta semana |
| **`sinCarbos` plato 1** | Decidir si es "a la parmesana" (archivo) o "al ajillo" (sistema) |
| **"Ensalada de papa"** | Sobra en el Deluxe. Rebeca ya la cambió por arroz con perejil |
| **Alejandra Calderón** | Su lista de proteínas va en pedido aparte cada semana. Falta la del 21 y 28 |
| **Giancarlo Longui** | Igual. Y su pedido `#ORD-V8CDDV53OI` tiene "Entregas" como cuarta proteína |
| **Edwin Pérez** | Dos packs activos que se solapan, ₡94.890 cada uno, zonas distintas |
| **Randall Cerdas** | 3 entregas guardadas, la hoja calcula 4. Su nota dice que las 3 son correctas |
| **Alexandra** | Su plato "Fajitas de pollo en salsa de hongos" sale sin cantidad: es 1 porción de 195 g |
| **Texto pegado** | `#ORD-V3U21O8FP2` plan "pack keto - Cambió:" · `#ORD-OVQR66061Q` zona "entrega: San Pedro" |
| **Sin teléfono** | Jeisson Cordero · Laura Fiorela · Martha Elena · Steven Mejías |
| **La merma del 30%** | Son 16 kg de proteína extra por hoja. Decidir con Gina si es real |

---

## 11. Reglas de trabajo

- **Leer el archivo antes de editarlo.** Siempre
- **`npm run build`** con 0 errores antes de decir "listo". Si falla, revertir
- **No cambiar una regla de negocio en silencio.** Si Gina dice lo contrario de
  lo que está escrito, hacer un **interruptor**, no un reemplazo. Las reglas del
  código traen su motivo y su costo
- **Verificar en la pantalla, no solo que compile.** El build no agarra
  `useMemo is not defined` ni una regla que no llega al Excel
- Archivos críticos que no se tocan: `nmi-charge.js`, `firebase/config.js`,
  `AuthContext.jsx`, `CartContext.jsx`, `CheckoutSteps.jsx`, `NMIPaymentModal.jsx`
- **160 archivos de tests, 1.722 pruebas.** Correr `npx vitest run` antes de subir
- Código y comentarios **en español**, explicando el *por qué* con el caso real
- Jan no es programador: hablarle del negocio, no del código
