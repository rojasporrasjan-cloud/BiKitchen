# Contexto — BiKitchen, hoja de producción

> Pegá este archivo completo como primer mensaje en la otra sesión de Claude.
> Generado el 9 de setiembre de 2026.
> Si algo acá contradice el código, gana el código: verificalo antes de actuar.

---

## 1. Qué es BiKitchen

Servicio de comida saludable a domicilio en Costa Rica (meal prep).
**Jan** es el dueño y **no es programador** — hay que explicarle en términos del
negocio, no del código. **Gina** maneja la cocina y es quien lee la hoja de
producción todos los días.

Los clientes compran **packs**: semanales, quincenales (2 entregas) o mensuales
(4 entregas). Un pack trae 5 platos. Se reparte **lunes, miércoles y sábado**.

La **hoja de producción** es la pantalla que le dice a la cocina qué cocinar y a
empaque qué meter en cada bolsa. Si un pedido no sale bien en esa hoja, alguien
no recibe su comida.

---

## 2. El ritmo de la semana

La cocina no recibe todo de una vez: los pedidos siguen entrando hasta el
sábado, así que la hoja se manda por partes.

| Día | Qué hoja sale |
|---|---|
| **Martes** | Empaque y cocina del miércoles |
| **Jueves** | Solo cocina — sábado completo + adelanto del lunes |
| **Viernes** | Empaque y cocina, descontando lo que ya salió el jueves |
| **Sábado** | Empaque del lunes y lo que falte de cocina |

La regla que sostiene todo: **cada hoja lleva solo lo que no se mandó antes**.
Si una tanda repite un pedido de la anterior, se cocina dos veces.

Del día de **adelanto** se preparan los packs mensuales y quincenales (ya están
pagados), pero **no los desayunos** — un gallo pinto con huevo no se puede dejar
hecho.

### Orden de empaque dentro de cada familia

Primero los packs **sin ningún cambio**, de corrida; después los que llevan un
cambio escrito, que se arman uno por uno. Y primero la corrida del sábado,
después la del lunes: los del lunes van a refri sin cerrar porque todavía les
faltan cenas y desayunos.

---

## 3. Dónde vive todo

| Cosa | Dónde |
|---|---|
| Proyecto | React + Vite, puerto `9999`. Firebase/Firestore `bikitchen-food`. Netlify |
| Pedidos | Colección `pedidos` en Firestore |
| Tandas ya enviadas | Colección `tandas_cocina` |
| La hoja | `/admin/print-production` |
| Código de la hoja | `src/pages/admin/PrintProductionView.jsx` |
| Reglas del proyecto | `CLAUDE.md` en la raíz — **leerlo siempre antes de editar** |
| Rama de trabajo | `release/hoja-produccion-y-seguridad` |

### Parámetros de la hoja (van en la URL)

| Parámetro | Qué hace |
|---|---|
| `date` | Fechas de entrega separadas por coma. Ej: `2026-09-12,2026-09-14` |
| `adelanto` | Cuáles de esas fechas van recortadas a mensuales y quincenales |
| `tanda=adelanto` | Recorta la tanda entera, no una fecha |
| `soloPacks` | Adelantar una sola familia. Ej: `bajoCalorias` |
| `view` | `all` · `empaque` · `cocina` |
| `rebajar` | Descontar lo que ya se mandó en tandas anteriores |

```
/admin/print-production?date=2026-09-12,2026-09-14&adelanto=2026-09-14
```

---

## 4. Cómo se ve un pedido

| Campo | Qué es |
|---|---|
| `id` | El id real del documento. **No es el mismo que `numeroOrden`** |
| `numeroOrden` | El número visible, tipo `#ORD-XXXX` |
| `cliente` | Nombre. La hoja agrupa por nombre |
| `plan` | Nombre del pack. De acá sale con qué familia del menú calza |
| `status` | Solo se cocina si está en la lista de abajo |
| `paymentStatus` | `paid` / `pending` |
| `fechas_entrega` | Arreglo de fechas `YYYY-MM-DD`. **Este es el que manda** |
| `fecha_entrega` | Una sola fecha (normalmente la primera). No usarla para filtrar |
| `cantidad` | Cuántos packs |
| `items[]` | Los platos. Dentro: `nombre`, `proteinas[]`, `medidas[]`, `cantidad` |
| `observaciones` | Cambios, alergias, notas de entrega |
| `telefono`, `zona_envio` | Entrega |

### Estados que sí se cocinan

```
confirmed · confirmado · pagado · preparing · preparando
making · ready · listo · in_transit · delivered · entregado
```

`pending_payment` **no sale en la hoja**: un pedido sin confirmar no se cocina
porque puede que nunca se pague. `in_transit` sí cuenta — un mensual se despacha
la semana 1 y queda "en ruta", pero sus semanas 2, 3 y 4 todavía hay que
prepararlas.

---

## 5. Las trampas que cuestan comida

Cada una pasó de verdad y costó plata. Son el motivo de casi todo lo que está
construido.

### Trampa 1 — documentos fantasma

El `numeroOrden` **no** es el id del documento. Los pedidos que entraron por la
web tienen id aleatorio. Si se hace un `PATCH` usando el número de orden como id,
**no falla: crea un documento nuevo**. Así quedaron 13 documentos basura el 3 de
setiembre y las notas nunca llegaron a los pedidos de verdad.

→ Buscar el pedido por `numeroOrden`, tomar su `id` real, y recién ahí escribir.

### Trampa 2 — el Two Pack se duplica solo

Un pedido cuyo nombre dice "Two Pack" **ya vale por 2 packs**: el código
multiplica ×2 por su cuenta. Si además se guarda con cantidad 2, la hoja cocina
**4 packs**. Pasó con Marlon Camacho y Francisco González: 4 packs de más,
20 comidas.

→ Un Two Pack se carga siempre con `cantidad: 1` y el precio completo.

### Trampa 3 — dos pedidos del mismo cliente el mismo día

La hoja fusiona pedidos del mismo cliente por nombre o teléfono. Del segundo
**solo conserva observaciones y zona**: sus platos desaparecen de la hoja y de
las etiquetas. Le pasó a Carolina Acevedo, que llevaba pack + cinco individuales.

→ Si un cliente lleva pack e individuales el mismo día, meter todo como ítems de
**un solo pedido**. Después de cargar, revisar que el aviso de "fusionados" quede
vacío.

### Trampa 4 — el teléfono de relleno

Cuando un pedido no traía teléfono se ponía `8888-8888`. Como la fusión tomaba
"mismo teléfono = mismo cliente", dos personas sin relación se fusionaban y
**una desaparecía de la hoja**. Luis Carlos Monge se borró con sus 5 cenas y
nadie se enteró.

→ Ya está corregido, pero al meter pedidos sin teléfono verificar que el total de
clientes de la hoja no haya *bajado*.

### Trampa 5 — el `menu` viejo tapa a `items`

Un pedido puede traer dos listas: `menu` (formato viejo) e `items`. Si `menu`
quedó como un resumen de una línea, ganaba el resumen y el pedido salía **sin
platos**. A Xiomara Vílchez le imprimía una fila que decía "pack mensual
proteínas 250 g" en vez de sus cinco proteínas.

→ Al editar un pedido a mano, escribir las **dos listas iguales**.

### Trampa 6 — las medidas de los individuales

La porción de un individual va **escrita** en `items[].medidas`, nunca calculada.
El sistema adivinaba a partir del nombre y ponía cantidades falsas: "Pastel de
yuca (1 molde)" salía como 250 g y "Arroz con pollo" como 250 g cuando es 1 kg.

→ Copiar la medida tal cual la escribe Gina: 1 kg, 500 g, 4 unidades, 2 tazas,
1 molde desechable, 250 g.

### Trampa 7 — un pedido que no dice qué cocinar

Si el pack no calza con ninguna familia del menú **y** sus únicos "platos" son el
nombre del plan repetido, no hay de dónde sacar qué cocinar. La hoja dibujaba un
renglón genérico y se leía como si estuviera completo. Le pasó a Alejandra
Calderón: pedía 1 porción de 250 g en vez de sus 5 proteínas.

→ Ya avisa solo desde el 9 de setiembre (`pedidosQueNoDicenQueCocinar` en
`src/utils/revisionDeLaHoja.js`). Si sale el aviso, hay que escribirle los platos
de esa semana.

### Trampa 8 — cerrar el día mata packs a medio camino

"Cerrar un día completo" pasa el pedido **entero** a `delivered`, aunque sea un
mensual al que le quedan entregas. El pedido cae al historial y la cocina deja de
verlo. Se detectaron 33 pedidos así: clientes que pagaron 4 semanas y recibían 1.

### Lo que NO es un bug

"Menú personalizado" *no* significa una lista de platos aparte. Son los mismos
platos del menú de la semana con ingredientes cambiados (no chile dulce, cambiar
el carbo). Se cargan los platos del menú de su familia y las restricciones van en
`observaciones`.

---

## 6. Regla de Firebase: las menos lecturas posibles

BiKitchen está en el plan gratuito: **50.000 lecturas por día**, y al llegar al
tope Firebase deja de contestar y cualquier pantalla que se recargue sale en
blanco. El 3 de setiembre pasó de verdad, en plena preparación de la hoja del
sábado.

Orden en que hay que buscar la información:

1. **La pantalla del admin** — ya tiene los datos cargados; leer su DOM no gasta
   ni una lectura
2. **Los chats y archivos** — los .txt de WhatsApp, los Excel de Gina
3. **El código** — menús, precios y reglas viven en el repo
4. **Una consulta dirigida** — solo lo que hace falta
5. **Bajar la colección entera** — último recurso, una sola vez

Abrir la hoja de producción cuesta ~545 lecturas. La pantalla de Clientes ~1.090.

**Truco para no gastar nada:** con la hoja abierta, los pedidos ya están en
memoria. Se pueden sacar recorriendo el árbol interno de React
(`__reactContainer` → `memoizedState`) buscando un arreglo grande cuyos elementos
tengan `numeroOrden`. Cero lecturas.

---

## 7. Cómo verificar que una hoja está bien

El método que funciona: **construir por tu cuenta la lista de quién debería
salir, y compararla contra lo que la hoja realmente dibuja.**

1. De los pedidos, tomar los que tengan `status` que imprima y alguna fecha de
   la hoja
2. Aplicar la regla del adelanto: si todas sus entregas caen en día de adelanto,
   solo pasa si es mensual o quincenal (más de una fecha)
3. De la hoja, sacar los clientes dibujados con los botones
   `button[title^="Arreglar el pedido de"]`
4. Comparar las dos listas

**OJO — el error más fácil de cometer:** la hoja tiene **dos vistas excluyentes**,
"Ver Packs Normales" y "Ver Individuales y Desayunos". Una esconde a la otra. Si
solo mirás una, vas a creer que faltan clientes que sí están. Y la tabla de
INDIVIDUALES no usa botones: hay que leerla como texto.

**Que cuadren los packs:** cada familia tiene varias tablas (menú 1, con cambio,
cenas, menú propio). El número que dice **"N EN LA FAMILIA"** es la suma de todas
ellas. Si suman distinto, ahí hay algo.

**Verificado el 9 de setiembre de 2026** en la hoja del sábado 12 + lunes 14:
44 pedidos esperados = 44 que cuenta la hoja. 42 de 42 clientes salen.
Bajo Calorías 24+6+6+3=39 ✓, Sin Carbos 4+1+3=8 ✓, Casaditos 1+3+1+2=7 ✓,
Regular 3+2+2=7 ✓, Full Pack 1+1+2=4 ✓. Cero duplicados.

---

## 8. Qué está abierto al 9 de setiembre de 2026

| Caso | Qué pasa |
|---|---|
| **Alejandra Calderón** | Su lista de proteínas va en un pedido aparte que cambia cada semana. Solo existe para el 7 set. Falta armarle la del 14, 21 y 28 |
| **Edwin Pérez Alvarado** | Dos packs activos que se solapan, ₡94.890 cada uno, creados con 18 min de diferencia, zonas distintas (Aserrí vs Alajuela). Decidir cuál queda |
| **Randall Cerdas Corella** | 3 entregas guardadas pero la hoja le calcula 4 |
| **Alexandra** | Cambios que van en tazas y no entran al granel — ajustar a mano |
| **Menú del 16** | No se toca desde el 9 set. Puede estar saliendo el de la semana pasada |

---

## 9. Reglas de trabajo

Están completas en `CLAUDE.md`. Las que más importan:

- **Leer el archivo antes de editarlo.** Siempre, sin excepciones
- **Correr `npm run build`** y verificar 0 errores antes de decir "listo".
  Si falla, revertir el último cambio y diagnosticar
- **Archivos críticos que no se tocan** sin un bug reportado:
  `netlify/functions/nmi-charge.js`, `src/firebase/config.js`,
  `src/context/AuthContext.jsx`, `src/context/CartContext.jsx`,
  `src/components/CheckoutSteps.jsx`, `src/components/NMIPaymentModal.jsx`
- El proyecto tiene **152 archivos de tests, 1.657 pruebas**.
  Correr `npx vitest run` antes de subir
- Todo el código y los comentarios van **en español**, explicando el *por qué*
  con el caso real que lo originó
- Jan no es programador: explicarle en términos del negocio, no del código
