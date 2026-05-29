# BiKitchen — Plan de Acción para 90/100
> Ordenado por: seguridad primero, mayor impacto primero, menor riesgo primero.
> Cada acción tiene criterio de éxito verificable. No avanzar si el criterio no se cumple.

---

## LEYENDA
- 🟢 RIESGO BAJO — cambio aislado, no puede romper funcionalidad
- 🟡 RIESGO MEDIO — toca archivo compartido, requiere verificación visual
- 🔴 RIESGO ALTO — toca pago/auth/carrito, prueba manual obligatoria
- ✅ COMPLETADO | ⏳ PENDIENTE | 🚫 BLOQUEADO (depende de otro)

---

## FASE 1 — GANAR 12 PUNTOS SIN RIESGO (solo agregar, nunca quitar)
*Ninguna acción de esta fase puede romper funcionalidad existente.*

### A1 🟢 Agregar HSTS + CSP en netlify.toml ✅
**Ganancia:** Seguridad +8
**Archivo:** `netlify.toml`
**Qué hacer:**
- Agregar `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- Agregar `Content-Security-Policy` permisiva (solo bloquea iframes externos)
**Criterio de éxito:** `curl -I https://bikitchencr.com | grep -i "strict-transport"` retorna el header
**Riesgo de romper:** 0 — son solo headers HTTP, no afectan código

---

### A2 🟢 Agregar aria-hidden a todos los blobs decorativos ✅
**Ganancia:** Accesibilidad +5, iOS +1
**Archivos afectados:** ~15 páginas y componentes
**Qué hacer:**
Agregar `aria-hidden="true"` a todos los `<div>` con `blur-3xl` o `blur-2xl` que sean decorativos.
```jsx
// Antes
<div className="absolute ... blur-3xl" />
// Después
<div className="absolute ... blur-3xl" aria-hidden="true" />
```
**Criterio de éxito:** `grep -rn "blur-3xl\|blur-2xl" src/ | grep -v "aria-hidden"` retorna 0
**Riesgo de romper:** 0 — solo agrega atributo HTML semántico

---

### A3 🟢 Crear og-image.jpg real ⏳
**Ganancia:** SEO +4, Conversión +2
**Qué hace el usuario:** Tomar foto de plato BiKitchen, 1200×630px, guardar como `/public/assets/og-image.jpg`
**Qué hace Claude:** Actualizar meta tags en `index.html` y `SEOHead.jsx` para apuntar a la imagen real
```html
<meta property="og:image" content="https://bikitchencr.com/assets/og-image.jpg" />
```
**Criterio de éxito:** Pegar URL en https://cards.twitter.com/validator y ver la imagen
**Riesgo de romper:** 0 — solo actualiza un meta tag

---

### A4 🟢 Corregir H1 duplicados en 3 páginas ✅
**Ganancia:** SEO +5
**Archivos:** `FidelidadPage.jsx`, `MisCuponesPage.jsx`, `TilopayReturnPage.jsx`
**Qué hacer:**
- `FidelidadPage.jsx` línea 280: `<h1>` → `<h2>`
- `MisCuponesPage.jsx` línea 83: `<h1>` → `<h2>`
- `TilopayReturnPage.jsx` líneas 181, 195, 218, 232: todos → `<h2>`
**Criterio de éxito:** `grep -c "<h1" src/pages/FidelidadPage.jsx` → retorna `1`
**Riesgo de romper:** 0 — solo cambia tag semántico, no afecta estilos (los estilos siguen igual)

---

### A5 🟢 Agregar noindex a páginas legales y privadas ✅
**Ganancia:** SEO +2 (Google gasta crawl budget en páginas sin valor)
**Archivos:** `CookiesPage.jsx`, `TerminosPage.jsx`, `PrivacidadPage.jsx`, `ReembolsosPage.jsx`
**Qué hacer:** Agregar `<SEOHead noindex />` o equivalente con `<meta name="robots" content="noindex,follow">`
**Criterio de éxito:** View-source de cada página → ver `noindex` en meta robots
**Riesgo de romper:** 0

---

### A6 🟢 Corregir AccesoDenegadoPage animate-pulse en blobs ✅
**Ganancia:** iOS +1
**Archivo:** `src/pages/AccesoDenegadoPage.jsx` líneas 13-14
**Qué hacer:** Eliminar `animate-pulse` y `delay-1000` de los dos blobs decorativos
**Criterio de éxito:** Página carga sin crash en iPhone con Safari
**Riesgo de romper:** 0 — solo afecta animación decorativa

---

## FASE 2 — GANAR 10 PUNTOS (cambios quirúrgicos seguros)
*Cada cambio afecta un solo archivo. Build obligatorio después de cada uno.*

### B1 🟡 Agregar noindex y SEOHead a páginas de usuario ✅
**Ganancia:** SEO +2, Calidad +1
**Archivos:** `MiCuentaPage.jsx`, `MisPedidosPage.jsx`
**Qué hacer:**
```jsx
<SEOHead
    title="Mi Cuenta | BiKitchen"
    description="Gestiona tu cuenta BiKitchen"
    noindex={true}
/>
```
**Criterio de éxito:** Build limpio. Meta robots noindex presente en HTML generado.

---

### B2 🟡 Limpiar console.log (122 eliminados de archivos críticos) ✅
**Ganancia:** Seguridad +3, Calidad +3
**Estrategia:** No limpiar todos de golpe (muy riesgoso). Limpiar por archivo al tocarlo.
**Orden de prioridad:**
1. `src/pages/PacksPage.jsx` — más visitado por clientes
2. `src/pages/LandingPage.jsx` — primera página
3. `src/components/CheckoutSteps.jsx` — proceso de pago (sensible)
4. `src/context/CartContext.jsx` — datos de carrito

**Regla:** Conservar `console.error` en bloques catch. Eliminar `console.log` de debug.
**Criterio de éxito:** `grep -c "console.log" src/pages/PacksPage.jsx` disminuye cada sesión.

---

### B3 🟡 Extraer `formatPrice` a utils/formatters.js ✅
**Ganancia:** Calidad código +2
**Problema actual:** `formatPrice` está definida en ~8 archivos distintos
**Qué hacer:**
1. Crear `src/utils/formatters.js` con la función canónica
2. En cada archivo que la tenga: reemplazar la definición local por el import
3. Hacer un archivo a la vez, build después de cada uno

```js
// src/utils/formatters.js
export const formatPrice = (price) => `₡${price.toLocaleString('es-CR')}`;
export const formatDate = (date) => new Date(date).toLocaleDateString('es-CR');
```
**Criterio de éxito:** `grep -rn "const formatPrice" src/` retorna solo 1 resultado (en formatters.js)

---

### B4 🟡 Eliminar whileHover/whileTap en componentes de clientes (~32 eliminados) ✅
**Ganancia:** iOS +4, Performance +1
**Problema:** 69 ocurrencias restantes
**Estrategia:** Reemplazar uno por uno, no en bloque

**Patrón de reemplazo:**
```jsx
// Antes (Framer — crea capa GPU)
<motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>

// Después (CSS — sin capa GPU)
<div className="hover:scale-105 active:scale-95 transition-transform duration-200">
```
**Prioridad:** Componentes en páginas que visitan CLIENTES (no admin).
**Criterio de éxito:** `grep -c "whileHover\|whileTap" src/pages/PacksPage.jsx` = 0

---

### B5 🟡 Skip-to-content link (accesibilidad) ✅
**Ganancia:** Accesibilidad +5
**Archivo:** `src/components/Navbar.jsx`
**Qué hacer:** Agregar al inicio del Navbar:
```jsx
<a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-bikitchen-orange focus:text-white focus:rounded-lg"
>
    Ir al contenido principal
</a>
```
Y en el `<main>` de cada página: `<main id="main-content">`
**Criterio de éxito:** Tab en teclado muestra el link visible

---

### B6 🟡 Reducir main bundle — separar contextos de App.jsx ⏳
**Ganancia:** Performance +4
**Problema:** `index.js` tiene 330KB porque carga todos los contextos eager
**Análisis necesario:** Revisar qué está en el chunk `index.js` que podría moverse
**Estrategia conservadora:** No tocar `App.jsx` en esta fase — solo evaluar qué podría separarse
**Criterio de éxito:** `index.js` < 300KB

---

## FASE 3 — GANAR 8 PUNTOS (refactoring de mediano riesgo)
*Requieren más cuidado. Un cambio a la vez. Build después de cada archivo.*

### C1 🟡 Refactorizar PacksPage.jsx (2169 líneas → extraer PackCard) ✅
**Ganancia:** Calidad +4, Performance +1
**Resultado:**
- `PackCard` + `PackSection` extraídos → `src/components/PackCard.jsx` (1037 líneas)
- `PACKS_ESPECIALES_BASE` movido a `src/data/packsData.js` (compartido)
- `PacksPage.jsx` reducido de 2169 → 1097 líneas (−50%)
- Build limpio ✅
**Criterio de éxito:** Build limpio + funcionalidad idéntica en /packs ✅

---

### C2 🟡 Reemplazar imágenes Unsplash en data/ con imágenes reales ⏳
**Ganancia:** Performance +2, SEO +2, Conversión +3
**Acción del usuario:** Fotografiar platos de BiKitchen → subir a Firebase Storage → reemplazar URLs
**Acción de Claude:** Actualizar `src/data/packsData.js` e `individualesData.js` con las nuevas URLs
**Criterio de éxito:** `grep -rn "unsplash.com" src/data/` retorna 0

---

### C3 🟡 Agregar CSP header completo en netlify.toml ✅
**Ganancia:** Seguridad +5
**PREREQUISITO:** Completar A1 primero ✅
**Qué hacer:** CSP que permite Firebase, YouTube, Unsplash pero bloquea scripts externos no autorizados
```toml
Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.googletagmanager.com; connect-src 'self' https://*.firebaseio.com https://*.googleapis.com; img-src 'self' data: https: blob:; frame-src https://www.youtube.com https://js.stripe.com;"
```
**CUIDADO:** Probar en staging antes de deploy a producción

---

### C4 🟡 Sistema de debug unificado (reemplazar console.log) ✅
**Ganancia:** Seguridad +3, Calidad +3
**Qué hacer:**
1. Crear `src/utils/logger.js`:
```js
const isDev = import.meta.env.DEV;
export const log = (...args) => { if (isDev) console.log(...args); };
export const warn = (...args) => { if (isDev) console.warn(...args); };
export const error = console.error; // errores siempre visibles
```
2. Migrar gradualmente: cada vez que se toca un archivo, reemplazar sus console.log por `log()`
**Criterio de éxito:** En producción, console.log = 0

---

## FASE 4 — GANAR 5+ PUNTOS (requieren acciones del usuario)
*Claude no puede hacer estos solo. Requieren contenido, acceso externo, o decisiones de negocio.*

### D1 — Google Business Profile ⏳ (ACCIÓN DE JAN)
**Ganancia:** SEO +15 en búsquedas locales (impacto REAL mayor que cualquier código)
**URL:** https://business.google.com
**Qué subir:** Fotos de platos, horario de delivery, número de teléfono, dirección Alajuela
**Por qué importa:** Para "comida saludable Costa Rica" y "meal prep San José", Google Maps ranking es decisivo

---

### D2 — Testimonios reales de Google Reviews ⏳ (ACCIÓN DE JAN)
**Ganancia:** Conversión +5
**Qué hacer:**
1. Pedir a clientes actuales dejar reseña en Google Maps
2. Screenshot de las 5 mejores reseñas
3. Reemplazar testimonios placeholder en `TestimonialsSection.jsx` con reseñas reales
**Criterio de éxito:** Testimonios tienen nombre real, pack específico, y fecha real

---

### D3 — Video de "cómo funciona" en YouTube ⏳ (ACCIÓN DE JAN)
**Ganancia:** Conversión +4, SEO +2
**Qué grabar:** 60-90 segundos con iPhone, buena luz natural
- 0:00-0:15 "BiKitchen es comida real, lista para calentar"
- 0:15-0:35 Mostrar la pantalla de packs mientras navigás
- 0:35-0:50 "Pedís, nosotros cocinamos fresco al día siguiente"
- 0:50-1:05 "Llega a tu puerta el lunes, miércoles o sábado"
- 1:05-1:30 Abrir tupper, calentar, comer
**Subir a:** YouTube (gratis, 0 MB en Netlify)
**Luego:** Pegar el ID en `ComoFuncionaPage.jsx` donde dice `YOUTUBE_VIDEO_ID`

---

### D4 — Imágenes propias de BiKitchen ⏳ (ACCIÓN DE JAN)
**Ganancia:** Performance +3, SEO +3, Conversión +3, Credibilidad +10
**Qué fotografiar:**
- 1 foto hero de plato (1200×630px) → og-image
- 1 foto por tipo de pack (10 fotos, 400×300px)
- 1 foto del proceso de cocina
**Subir a:** Firebase Storage → reemplazar URLs de Unsplash en packsData.js

---

## RESUMEN DE GANANCIAS ESTIMADAS

| Fase | Acciones | Puntos a ganar | Score resultante |
|---|---|---|---|
| Inicial (28 may) | — | — | **64/100** |
| Fase 1 completada | A1-A6 | +18 | **~72/100** |
| Fase 2 (B1-B5) | B1-B5 ✅ | +10 | **~78/100** |
| Fase 3 (C1,C3,C4) | C1 ✅, C3 ✅, C4 ✅ | +12 | **~83/100** |
| **Actual** | — | — | **~83/100** |
| Fase 4 (usuario) | D1-D4 | +8 | **~90/100** |

**Para 95/100** se necesitaría además:
- TypeScript en archivos críticos (Cart, Auth, Checkout)
- Tests automatizados del flujo de pago
- PWA optimizada con offline-first

**Para 100/100** no es realista ni necesario:
- TypeScript completo en todos los archivos
- 100% coverage de tests
- Server-side rendering (cambio de arquitectura total)

---

## ORDEN DE EJECUCIÓN RECOMENDADO

```
Sesión 1 (hoy):      A1 → A2 → A4 → A6         (+14 puntos, 0 riesgo)
Sesión 2:            A3 → A5 → B5               (+9 puntos, con foto de Jan)
Sesión 3:            B2 (PacksPage) → B3         (+5 puntos, quirúrgico)
Sesión 4:            B4 (whileHover) → B1        (+5 puntos, quirúrgico)
Sesión 5:            C1 (PacksPage refactor)      (+5 puntos, cuidadoso)
Sesión 6:            C3 → C4                     (+8 puntos, seguridad)
Con Jan:             D1 → D3 → D2 → D4          (+8 puntos, contenido)
```

---
*Última actualización: 28 mayo 2026*
