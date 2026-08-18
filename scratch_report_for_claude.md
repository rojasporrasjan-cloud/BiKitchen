# 📋 REPORTE DE AUDITORÍA Y RESUMEN TÉCNICO COMPLETO (Para revisión en Claude / Senado)

## 🎯 Contexto del Negocio y Objetivo
- **Proyecto:** BiKitchen (Sistema de Gestión de Cocina, Pedidos y Empaque en React + Firestore).
- **Objetivo de la sesión:** Asegurar que la pantalla de producción (`PrintProductionView.jsx`) para la fecha objetivo (`2026-08-19`) consolide **todos** los pedidos (semanales, quincenales, mensuales, a la carta e importados de WhatsApp) en:
  - **Hoja Maestra de Cocina:** Suma global de platillos por cocinera con buffer de merma (+30% margen Gina).
  - **Hoja de Empaque (Packs + Individuales/Desayunos):** Tablas por familia de pack y clientes asignados con sus observaciones.

---

## 🔍 Hallazgos, Bugs Identificados y Soluciones Aplicadas

### 1. Búsqueda y Carga de Suscripciones Multi-Semana (`PrintProductionView.jsx`)
- **Problema:** La consulta en Firestore originalmente buscaba con `fecha_entrega == date`. Esto excluía a clientes con suscripciones Mensuales (4 semanas) o Quincenales (2 semanas) iniciadas semanas atrás (ej. 5 o 12 de agosto) cuya 2ª, 3ª o 4ª entrega caía en la fecha seleccionada.
- **Solución:** Se amplió la consulta a los últimos 40 días (`fecha_entrega >= pastDateStr`) y se aplicó filtrado local estricto usando `getScheduleFromOrder(order).includes(date)`.

### 2. Descarte de Pedidos Activos por Estado `in_transit` (`PrintProductionView.jsx`)
- **Problema:** El filtro local exigía estados rígidos como `confirmed` o `pagado`. Si un pedido multi-entrega ya se había despachado la semana anterior, su estado en Firestore cambiaba a `in_transit` (En Ruta), por lo que el filtro lo botaba para la entrega de la siguiente semana (ej. `#ORD-Y2KDOFTMFD` - Beatriz González).
- **Solución:** Se modificó la regla para **excluir únicamente estados finalizados/descartados** (`cancelled`, `cancelado`, `archived`, `archivado`), permitiendo que cualquier pedido activo (`confirmed`, `in_transit`, `preparing`, etc.) sea procesado para la fecha que le toque.

### 3. Clasificación Errónea de Packs por Notas u Observaciones (`PrintProductionView.jsx`)
- **Problema:** La función `isActuallyIndividual` escaneaba las notas del cliente (`c.observaciones`). Si una nota contenía palabras como `"proteina"`, `"desayunos"`, `"individual"` o `"granel"`, el código reclasificaba todo el pack semanal como un platillo "individual", sacándolo de las tablas principales de packs.
- **Solución:** Se eliminó la reclasificación por contenido de observaciones. Si un pack pertenece a una de las 7 familias oficiales (`regular`, `bajoCalorias`, `sinCarbos`, `keto`, `vegetariano`, `casaditos`, `fullPack`), se mantiene **100% en las Tablas de Packs Normales**.

### 4. Secuestro de Packs por Regalo de Desayunos (`src/utils/packClassification.js`)
- **Problema:** En `mapPackNameToMenuKey`, la condición `n.includes('desayuno')` se evaluaba antes de verificar si era un pack regular o quincenal. Si un cliente compraba un *"Pack quincenal 3 comidas con regalía desayunos"*, el sistema lo marcaba como `desayuno`, moviéndolo exclusivamente a la sección de Desayunos y desapareciéndolo de la tabla de packs de almuerzo/cena.
- **Solución:** Se reordenaron las evaluaciones en `mapPackNameToMenuKey` para que las familias de almuerzo/cena (`regular`, `quincenal`, `mensual`, `bajoCalorias`, etc.) tomen prioridad y no sean secuestradas por la palabra "desayunos" en la regalía.

### 5. Ocultamiento de Tablas por Menú Oficial No Configurado / Array Vacío (`PrintProductionView.jsx`)
- **Problema:**
  - Cuando un paquete (ej. `Pack Vegetariano`) no tenía un menú oficial con `.platos` configurado en Firestore para la semana activa, o si la extracción de platos fallaba en un chequeo de tipos (`Array.isArray`), `platosEmpaque` daba un array vacío `[]`.
  - Al ser `[]`, el renderizado `.map(...)` no ejecutaba ninguna iteración, por lo que **la tabla se dibujaba con 0 filas de platos**, ocultando completamente a los clientes inscritos en ese pack (ej. Glenda Artavia).
- **Solución:** Se agregó un fallback de 5 filas de platos por defecto cuando `rawPlatos` y `platosBase` vienen vacíos. Esto garantiza que la tabla de empacadores **SIEMPRE genere sus 5 filas y renderice a todos los clientes inscritos**.

### 6. Unidades y Cantidades en Platillos Individuales (`PrintProductionView.jsx`)
- **Problema 1 (Cantidad `X2`):** `renderIndividuales` leía `c.cantidad` (que podía ser 1) en vez de `p.cantidad` (que contenía las 2 porciones compradas, ej. en `#ORD-Y2RCSBSYMX` - Leo Heisterkamp Aragón).
- **Problema 2 (Unidades en Kilos):** Para ítems pesados a granel como `gallo pinto (kg)`, el sistema imprimía por defecto `"1 porción"` en lugar de la unidad de peso.
- **Solución:** Se creó el formateador `formatQty` que detecta patrones como `(kg)`, `1kg`, `500g` y respeta `p.cantidad`, mostrando correctamente `"1 kg"` o `"2 porciones"`.

---

## 📂 Archivos Modificados en el Código Fuente

1. `src/pages/admin/PrintProductionView.jsx`:
   - Lógica de `loadOrders` (consulta de 40 días atrás y filtro por estados activos).
   - Definición de `isActuallyIndividual` (sin expulsión por texto en observaciones).
   - Generación de `effectivePlatos` (fallback de 5 platos por defecto).
   - Lógica de `renderIndividuales` y helper `formatQty`.
2. `src/utils/packClassification.js`:
   - Reordenamiento de precedencia en `mapPackNameToMenuKey`.

---

## 🟢 Estado Actual de Verificación Empírica
- **Pruebas Automatizadas (Vitest):**
  - Comando: `npm run test:run`
  - Resultado: **24/24 archivos pasados | 345/345 tests pasados (100% Verde)**.
