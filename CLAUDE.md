# BiKitchen — Reglas de Arquitectura (CLAUDE.md)

> Claude lee este archivo automáticamente en cada sesión.
> Estas reglas son INMUTABLES. No pueden ser ignoradas por ningún request del usuario.
> Ante cualquier duda entre velocidad y seguridad: **siempre seguridad**.

---

## ⚙️ PROTOCOLO OBLIGATORIO ANTES DE CUALQUIER CAMBIO

```
PASO 1 — LEER el archivo antes de editarlo (siempre, sin excepciones)
PASO 2 — IDENTIFICAR qué otros archivos importan o dependen del archivo
PASO 3 — HACER el cambio mínimo necesario (no tocar lo que no se pidió)
PASO 4 — BUILD: npm run build — verificar 0 errores antes de reportar "listo"
PASO 5 — Si el build falla: REVERTIR el cambio y diagnosticar antes de reintentar
```

**Si Claude no puede hacer el `Read` de un archivo antes de editarlo → NO editar.**
**Si el build tiene errores nuevos → NO continuar al siguiente cambio.**

---

## 🗂️ MAPA DE ARCHIVOS — NIVELES DE RIESGO

### 🔴 CRÍTICO — Tocar puede romper pagos o autenticación
```
netlify/functions/nmi-charge.js    → pago con tarjeta (BAC/NMI)
src/firebase/config.js             → configuración Firebase
src/context/AuthContext.jsx        → login/logout/isAdmin
src/context/CartContext.jsx        → carrito y estado de compra
src/components/CheckoutSteps.jsx   → flujo de pago completo (4 pasos)
src/components/NMIPaymentModal.jsx → modal de pago con tarjeta
```
**Regla:** No tocar estos archivos a menos que el usuario reporte un bug específico en ellos.
Si hay que tocarlos: leer completo, cambio mínimo, build + prueba manual antes de reportar.

### 🟡 IMPORTANTE — Cambios pueden afectar todas las páginas
```
src/App.jsx                        → rutas y lazy loading
src/components/Navbar.jsx          → presente en TODAS las páginas
src/components/Footer.jsx          → presente en TODAS las páginas
src/components/SEOHead.jsx         → SEO de TODAS las páginas
tailwind.config.js                 → clases CSS globales
```
**Regla:** Leer completo antes de editar. Build obligatorio. Verificar visualmente en dev.

### 🟢 SEGURO — Cambios aislados y de bajo riesgo
```
src/pages/*.jsx                    → páginas individuales
src/components/UrgencyBanner.jsx   → componente standalone
src/data/*.js                      → datos estáticos
src/utils/*.js                     → funciones utilitarias
public/sitemap.xml                 → SEO estático
netlify.toml                       → headers y config (salvo functions)
```

---

## 📐 REGLA 1 — ESTRUCTURA ESTÁNDAR DE PÁGINAS

Toda página pública DEBE seguir exactamente esta estructura:

```jsx
// ✅ ESTRUCTURA CORRECTA
export default function MiPagina() {
    // 1. Hooks al tope (regla de React)
    const { getWhatsAppUrl } = useWhatsApp();

    return (
        <PageTransition>
            {/* 2. SEOHead SIEMPRE el primer hijo */}
            <SEOHead
                {...SEO_CONFIG.miPagina}
                structuredData={getBreadcrumbSchema([{
                    name: 'Nombre de Página',
                    url: 'https://bikitchencr.com/mi-ruta'
                }])}
            />

            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                {/* 3. Navbar siempre presente */}
                <Navbar />

                {/* 4. Contenido principal */}
                <main>...</main>

                {/* 5. Footer siempre al final */}
                <Footer />
            </div>
        </PageTransition>
    );
}
```

**Checklist página nueva:**
- [ ] Existe entrada en `SEO_CONFIG` en `SEOHead.jsx`
- [ ] Ruta agregada en `App.jsx` con `lazyWithRetry()`
- [ ] Ruta agregada en `sitemap.xml` (si es pública)
- [ ] Ruta en `robots.txt` (si es privada/autenticada → Disallow)
- [ ] Un único `<h1>` visible (ver Regla 2)

**Páginas autenticadas (sin SEO público):**
`MiCuentaPage, MisPedidosPage, MisCuponesPage, MiImpactoPage, RewardStore`

---

## 🏷️ REGLA 2 — UNA SOLA H1 POR PÁGINA (crítico para SEO)

```
REGLA ABSOLUTA: exactamente 1 (un) <h1> por página en el DOM.
```

**Decisión de cuál H1 usar:**
| Situación | Solución |
|---|---|
| El héroe ya tiene H1 visual grande | Ese es el H1. Los demás títulos → `<h2>` |
| Necesito H1 optimizado para Google sin romper diseño | `<h1 className="sr-only">Título SEO</h1>` + el visual como `<h2>` |
| Hay H1 en un componente reutilizable | Cambiar a `<h2>` en el componente o recibir `as` prop |

**Páginas con H1 duplicado — CORREGIDAS ✅:**
- `FidelidadPage.jsx` — corregido (línea 280 → `<h2>`)
- `MisCuponesPage.jsx` — corregido (línea 83 → `<h2>`)
- `TilopayReturnPage.jsx` — corregido (3 estados → `<h2>`, solo el éxito mantiene `<h1>`)

**Verificación rápida:** `grep -n "<h1" src/pages/MiPagina.jsx` → debe retornar exactamente 1 línea.

---

## 📱 REGLA 3 — PROHIBICIONES iOS/GPU

Estas propiedades crean capas de composición persistentes que crashean iOS Safari:

### ❌ PROHIBIDO (nunca usar en componentes de clientes)
```css
backdrop-filter: blur()          → Tailwind: backdrop-blur-*
willChange: 'transform'          → en estilos inline style={{}}
willChange: 'opacity'            → en estilos inline style={{}}
transform: translate3d(0,0,0)    → hack de GPU forzado
style={{ transform: 'translateZ(0)' }}
```

### ❌ PROHIBIDO en Framer Motion
```jsx
<motion.div layout>              → crea capa persistente para cada render
<motion.div layout="position">   → ídem
```

### ⚠️ RESTRINGIDO — animate-pulse
```
PROHIBIDO en: blobs decorativos grandes (blur-2xl/blur-3xl + pulse)
PROHIBIDO en: overlays o fondos de sección completa
PROHIBIDO en: más de 3 elementos simultáneos en pantalla

PERMITIDO en: skeleton loaders (temporal, < 3s)
PERMITIDO en: dots/badges de estado pequeños (< 16px)
PERMITIDO en: UrgencyBanner modo "critical" (< 3h para cierre)
```

### ✅ ALTERNATIVAS SEGURAS
```jsx
// En vez de backdrop-blur → más opacidad en el fondo
className="bg-white/15"          // en vez de bg-white/10 backdrop-blur-md

// En vez de willChange en SmoothImage → CSS transition puro
className="transition-opacity duration-500"

// En vez de layout prop → entrance animation normal
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
// (sin layout, sin whileHover en el mismo elemento)
```

---

## 🎞️ REGLA 4 — USO DE FRAMER MOTION

**Jerarquía de preferencia (de mejor a peor performance):**

```
1. CSS Tailwind puro:     hover:scale-105, active:scale-95, transition-all
2. Framer entrance:       initial/animate/exit con viewport={{ once: true }}
3. Framer whileInView:    para animaciones al hacer scroll
4. Framer whileHover:     SOLO cuando CSS no alcanza (ej: animaciones complejas)
5. Framer layout:         ❌ PROHIBIDO en listas/cards de clientes
```

**Patrón correcto para cards:**
```jsx
// ✅ BIEN — hover CSS, entrance Framer
<motion.div
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    className="hover:-translate-y-1.5 active:scale-[0.98] transition-transform duration-300"
>

// ❌ MAL — whileHover crea capa JS persistente
<motion.div whileHover={{ y: -6 }} whileTap={{ scale: 0.98 }}>
```

**Patrón correcto para stagger (entrada escalonada):**
```jsx
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};
// Siempre viewport={{ once: true }} para no re-animar al hacer scroll up
```

---

## 🚫 REGLA 5 — NADA HARDCODEADO

Cada valor que podría cambiar va en un archivo de configuración, no en el JSX.

### ❌ NUNCA hardcodear en componentes:
```jsx
// Números de teléfono
href="https://wa.me/50685067200"          // ❌
href={getWhatsAppUrl('mensaje')}           // ✅ usar hook

// Precios
price: 22000                               // ❌ como valor final
price: packPrices.fiveComidas              // ✅ desde Firebase/estado

// URLs externas propias
"https://bikitchencr.com/packs"           // ❌ en medio del código
`${BASE_URL}/packs`                        // ✅ constante de SEOHead

// Colores hex
style={{ color: '#FF671D' }}               // ❌
className="text-bikitchen-orange"          // ✅

// Textos de error repetidos
"Error al agregar al carrito"              // ❌ como string suelto
ERROR_MESSAGES.ADD_TO_CART                 // ✅ constante importada

// IDs de Firebase (colecciones) como strings sueltos
getDocs(collection(db, 'orders'))          // ⚠️ aceptable si es una sola vez
// Si se repite en 3+ lugares → extraer a COLLECTIONS constante
```

### ✅ Dónde van los valores:
| Tipo de valor | Archivo |
|---|---|
| Número de WhatsApp | `src/context/ContactConfigContext.jsx` + Firebase |
| Precios fallback | `src/components/SEOHead.jsx` (BIKITCHEN_PRICES) |
| Mensajes de WhatsApp | `src/config/whatsappMessages.js` |
| Colores de marca | `tailwind.config.js` |
| URL base del sitio | `src/components/SEOHead.jsx` (BASE_URL) |
| Nombres de colecciones Firebase | `src/firebase/collections.js` (crear cuando haya 3+) |
| Textos de error del usuario | Inline está OK si no se repiten |

---

## 🧹 REGLA 6 — CÓDIGO LIMPIO (DRY + KISS)

### DRY — Don't Repeat Yourself
```jsx
// ❌ MAL — formatPrice definido en cada archivo
const formatPrice = (p) => `₡${p.toLocaleString('es-CR')}`;

// ✅ BIEN — importar de un solo lugar
import { formatPrice } from '../utils/formatters';
// (crear src/utils/formatters.js si no existe)
```

**Señales de que hay código duplicado:**
- La misma función de `formatPrice` está en múltiples archivos → extraer
- El mismo bloque de `getDeliveryDates()` en más de un lugar → extraer a utils
- El mismo JSX de "card de pack" en más de un componente → crear componente

### KISS — Keep It Simple, Stupid
```jsx
// ❌ COMPLEJO — IIFE innecesario en JSX
{(() => {
    const val = calcularAlgo();
    return <div>{val}</div>;
})()}

// ✅ SIMPLE — useMemo o variable fuera del return
const val = useMemo(() => calcularAlgo(), [dep]);
return <div>{val}</div>;
```

### Funciones: máximo 30 líneas
Si una función supera 30 líneas → probable señal de que hace demasiado → dividir.

### Componentes: máximo 300 líneas
Si un componente supera 300 líneas → extraer sub-componentes.
`PacksPage.jsx` tiene ~1900 líneas → refactoring necesario (ver Plan de Acción).

---

## ♿ REGLA 7 — ACCESIBILIDAD (aria)

**Todo elemento decorativo debe tener `aria-hidden="true"`:**
```jsx
// ✅ CORRECTO — blobs decorativos
<div className="absolute ... blur-3xl" aria-hidden="true" />

// ✅ CORRECTO — íconos decorativos sin texto
<span className="text-2xl" aria-hidden="true">🍳</span>

// ✅ CORRECTO — watermark/texto visual
<p className="text-[18vw] ..." aria-hidden="true">BIKITCHEN</p>
```

**Texto solo para screen readers:**
```jsx
// Para SEO-only H1 o labels para lectores de pantalla
<h1 className="sr-only">Título para Google</h1>
<span className="sr-only">Descripción accesible</span>
```

**Links y botones deben tener texto descriptivo:**
```jsx
// ❌ MAL — screen reader dice "link"
<Link to="/packs"><ArrowRight /></Link>

// ✅ BIEN
<Link to="/packs" aria-label="Ver planes semanales de comida">
    <ArrowRight aria-hidden="true" />
</Link>
```

**Imágenes:**
```jsx
// ✅ Alt descriptivo con keyword
<img src={url} alt="Pack Keto BiKitchen — 5 almuerzos frescos sin carbohidratos" />

// Para imágenes puramente decorativas
<img src={decorativa} alt="" aria-hidden="true" />
```

---

## 🔇 REGLA 8 — CONSOLE.LOG (seguridad + limpieza)

**Estado actual: 423 en producción — TODO están expuestos al navegador del cliente.**

```jsx
// ❌ NUNCA agregar
console.log('debug:', data);

// ✅ Usar wrapper condicional (solo desarrollo)
const isDev = import.meta.env.DEV;
if (isDev) console.log('debug:', data);

// ✅ O simplemente eliminar cuando ya no se necesita
// (la mayoría son de desarrollo temporal que nadie limpió)
```

**Al tocar cualquier archivo, eliminar los console.log del área modificada.**
No hay que limpiar todo de una vez — ir limpiando por archivo conforme se trabaja.

**console.error en catch blocks → MANTENER** (son errores reales que hay que ver):
```jsx
// ✅ Este SÍ se mantiene
catch (error) {
    console.error('[PacksPage] Error cargando precios:', error);
}
```

---

## 🏷️ REGLA 9 — CONVENCIONES DE NOMBRES

### Archivos
```
Componentes React:        PascalCase.jsx        → UserCard.jsx, PackModal.jsx
Hooks personalizados:     camelCase.js          → useWhatsApp.js, useIsMobile.js
Utilidades/helpers:       camelCase.js          → formatters.js, firestoreMenus.js
Datos estáticos:          camelCase.js          → packsData.js, individualesData.js
Constantes:               UPPER_SNAKE_CASE      → PACK_FILTERS, DELIVERY_DAYS
Contextos:                PascalCaseContext.jsx  → CartContext.jsx
```

### Variables y funciones
```jsx
// Handlers de eventos → handle + Evento
const handleAddToCart = () => {};
const handleFilterChange = (filterId) => {};

// Booleanos → is/has/can/should
const isLoading = false;
const hasDiscount = true;
const canCheckout = cart.length > 0;

// Getters → get + Nombre
const getWhatsAppUrl = (msg) => {};
const getFilteredPacks = (packs) => {};

// Formatters → format + Tipo
const formatPrice = (num) => {};
const formatDate = (date) => {};

// Constantes globales → UPPER_SNAKE_CASE
const MAX_SUBSTITUTIONS = 2;
const DELIVERY_DAYS = [1, 3, 6]; // Lunes, Miércoles, Sábado
```

### Clases Tailwind — orden estándar
```jsx
// Orden: layout → display → tamaño → espaciado → colores → tipografía → efectos
className="relative flex items-center w-full px-4 py-2 bg-white text-gray-900 font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
```

---

## 📦 REGLA 10 — IMPORTS Y DEPENDENCIAS

**Orden de imports en cada archivo:**
```jsx
// 1. React y hooks de React
import React, { useState, useEffect, useMemo } from 'react';

// 2. Librerías externas (react-router, framer-motion, lucide-react)
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';

// 3. Componentes propios del proyecto
import Navbar from '../components/Navbar';
import SEOHead from '../components/SEOHead';

// 4. Hooks personalizados
import useWhatsApp from '../hooks/useWhatsApp';
import useIsMobile from '../hooks/useIsMobile';

// 5. Contextos
import { useCart } from '../context/CartContext';

// 6. Utils y datos
import { formatPrice } from '../utils/formatters';
import { PACK_FILTERS } from '../data/packsData';
```

**Antes de agregar una librería nueva:**
1. `npm ls nombre-libreria` → verificar si ya está instalada
2. `npm run build` → anotar tamaño total actual
3. Instalar y hacer build → comparar tamaño
4. Si aumenta más de 20KB minificado → documentar en este CLAUDE.md por qué vale la pena

**Para librerías grandes (>50KB) → siempre lazy:**
```jsx
// ✅ Lazy loading de librerías pesadas
const HeavyComponent = lazyWithRetry(() => import('./HeavyComponent'));
```

---

## 🎨 REGLA 11 — COLORES Y DISEÑO (sin hardcodear)

**Colores definidos en `tailwind.config.js` — siempre usar las clases:**
```
bikitchen-orange      → #FF671D  — color principal de marca
bikitchen-orange-dark → #E85A15  — hover del naranja
bikitchen-gold        → #E9A84A  — color secundario/CTA
bikitchen-beige       → #FDF8F0  — fondo claro de páginas
```

```jsx
// ❌ PROHIBIDO
style={{ backgroundColor: '#FF671D' }}
style={{ color: '#E9A84A' }}

// ✅ CORRECTO
className="bg-bikitchen-orange"
className="text-bikitchen-gold"
```

**Inline styles — solo cuando Tailwind no puede:**
```jsx
// ✅ Aceptable para valores dinámicos que Tailwind no soporta
style={{ paddingTop: `calc(${bannerHeight}px + 76px)` }}
style={{ bottom: isMobile ? '115px' : '40px' }}

// ❌ No aceptable cuando existe clase Tailwind equivalente
style={{ display: 'flex' }}      // usar flex
style={{ color: 'white' }}       // usar text-white
style={{ fontWeight: 'bold' }}   // usar font-bold
```

**Tailwind clases dinámicas — usar objeto completo, nunca concatenar:**
```jsx
// ❌ MAL — Tailwind purge no puede detectar esto
const color = 'orange';
className={`bg-${color}-500`}

// ✅ BIEN — clase completa siempre presente en el string
className={isActive ? 'bg-orange-500 text-white' : 'bg-white text-gray-700'}
```

---

## 🔐 REGLA 12 — SEGURIDAD

### Variables de entorno
```jsx
// ❌ NUNCA en código fuente
const API_KEY = 'sk-live-abc123';

// ✅ Solo via import.meta.env
const apiKey = import.meta.env.VITE_MI_API_KEY;
```

**Variables en `.env` (no commitear):**
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=...
```

### Headers de Netlify (netlify.toml)
**Actuales ✅:** X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
**Faltantes ❌ (pendiente):** Content-Security-Policy, Strict-Transport-Security (HSTS)

### Rutas de admin — siempre protegidas
```jsx
// Toda ruta /admin/* debe tener guard
if (!isAdmin) return <Navigate to="/acceso-denegado" />;
```

### Datos sensibles
- Dirección, teléfono de clientes: solo visible con `isAdmin === true`
- Números de tarjeta: NUNCA en Firestore, solo pasan por NMI (nunca logear)
- SINPE: número receptor no logear en console ni enviar a analytics

---

## ⚡ REGLA 13 — PERFORMANCE Y BUNDLE

**Límites de bundle (no superar):**
```
index.js (main chunk):      330 KB actual → objetivo 250 KB
vendor-framer.js:           123 KB → no agregar dependencias de Framer
vendor-firebase-*.js:       350 KB total → normal, no modificar
vendor-pdf.js:              619 KB → admin only, lazy ✅ nunca mover a eager
```

**No agregar a la página principal (index.js):**
- Librerías de gráficos (chart.js, recharts)
- Librerías de exportación (jsPDF, xlsx)
- Componentes de admin
- Librerías de fecha pesadas (date-fns completo — importar solo módulos)

**Lazy loading — siempre `lazyWithRetry` (no `React.lazy`):**
```jsx
// ✅ CORRECTO — usando el wrapper que ya existe en App.jsx
const MiPagina = lazyWithRetry(() => import('./pages/MiPagina'));

// ❌ MAL — no tiene retry automático para iOS
const MiPagina = React.lazy(() => import('./pages/MiPagina'));
```

**Solo `LandingPage` carga eager** (primera página que ve el usuario):
```jsx
import LandingPage from './pages/LandingPage'; // eager — no lazyWithRetry
```

---

## 🌐 REGLA 14 — SEO (cada cambio de contenido importa)

**Para cada página pública:**
```
Title: [Keyword principal] | BiKitchen [Costa Rica]
- Longitud: 50-60 caracteres
- Incluir ciudad/país para SEO local

Description: Acción + Beneficio + CTA. 140-160 caracteres.
- Incluir keyword principal
- Incluir ciudad para búsquedas locales

H1: Exactamente uno, con keyword principal
```

**Keywords principales (usar en títulos, H1, y descripción):**
```
comida saludable Costa Rica
meal prep Costa Rica
comida a domicilio San José / Escazú / Heredia / GAM
packs semanales / planes semanales de comida
keto | sin carbos | vegetariano | familiar
almuerzo delivery GAM
```

**JSON-LD — nunca tocar la estructura, solo los datos:**
Las funciones `getPacksSchema()`, `getFAQSchema()`, `getHomeSchemas()` están en
`src/components/SEOHead.jsx`. Si cambian datos de packs/FAQ → actualizar ahí.

**Internal links — siempre `<Link to="">` (React Router), nunca `<a href="">`:**
```jsx
// ❌ MAL — recarga la página completa
<a href="/packs">Ver planes</a>

// ✅ BIEN — SPA navigation sin recarga
<Link to="/packs">Ver planes</Link>

// Excepción: links externos y WhatsApp
<a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
```

---

## 📋 REGLA 15 — CHECKLIST OBLIGATORIO PRE-DEPLOY

```
BUILD Y CÓDIGO:
[ ] npm run build sin errores (warning de vendor-pdf es normal)
[ ] No hay imports de archivos que no existen
[ ] No hay console.log nuevos sin wrapper isDev

SEO:
[ ] Páginas nuevas tienen SEOHead con título y descripción únicos
[ ] No hay más de 1 <h1> por página (grep -n "<h1" src/pages/MiPagina.jsx)
[ ] Sitemap actualizado si se agregaron rutas públicas nuevas
[ ] robots.txt actualizado si se agregaron rutas privadas nuevas

iOS/PERFORMANCE:
[ ] No hay backdrop-blur nuevo en componentes de clientes
[ ] No hay willChange inline en componentes de listas
[ ] No hay layout prop en Framer Motion en cards o listas
[ ] Imágenes tienen alt text

ACCESIBILIDAD:
[ ] Blobs/orbs decorativos tienen aria-hidden="true"
[ ] Íconos decorativos tienen aria-hidden="true"
[ ] Botones de ícono tienen aria-label descriptivo

FUNCIONALIDAD:
[ ] WhatsApp links usan useWhatsApp() hook (no hardcodeado)
[ ] Links internos usan <Link to=""> (no <a href="">)
[ ] Formularios de checkout no fueron modificados sin prueba de flujo completo
```

---

## 🚨 REGLA 16 — CUANDO ALGO SE ROMPE

**Si el build falla:**
```bash
# 1. Leer el error exacto
npm run build 2>&1 | grep "error" | head -20

# 2. Identificar el archivo y línea
# 3. Revertir SOLO el último cambio — nunca resetear todo
# 4. No continuar con otros cambios hasta resolver este
```

**Si una página crashea en producción (especialmente iOS):**
1. El crash de iOS es silencioso — revisar en Safari DevTools → Consola
2. Buscar en el componente que crashea: `blur-`, `willChange`, `backdrop-blur`, `layout=`
3. Si es de Firebase: revisar `error.code` en la consola, buscar en Firebase Console

**Si los estilos no aparecen:**
```jsx
// Tailwind no purga clases dinámicas concatenadas:
// ❌ NO: className={`bg-${color}-500`}
// ✅ SÍ: className={color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'}
```

**Si hay conflicto de imports circular:**
```bash
# Detectar:
grep -rn "import.*from.*miArchivo" src/
# Solución: extraer el tipo/constante compartida a un archivo neutro (types.js, constants.js)
```

---

## 📊 SCORE Y DEUDA TÉCNICA CONOCIDA (28 mayo 2026 — sesión 2)

| Categoría | Score | Peso | Problemas conocidos |
|---|---|---|---|
| 🔍 SEO | 76 | 15% | Sin og-image.jpg real (Jan debe fotografiar) |
| ⚡ Performance | 63 | 20% | index.js 330KB (objetivo 250), ~60 Unsplash externas |
| 📱 iOS/Mobile | 82 | 20% | ~37 whileHover restantes (admin/secundarios) |
| 🔐 Seguridad | 74 | 15% | ~301 console.log restantes (bajaron de 423) |
| 💻 Calidad código | 60 | 15% | 26 TODOs, 0 PropTypes, PacksPage 1900 líneas |
| ♿ Accesibilidad | 58 | 10% | Algunos aria-labels de botones icono pendientes |
| 💰 Conversión/UX | 73 | 5% | Testimonios placeholder, sin og-image social |
| **TOTAL** | **~78** | 100% | |

**Score ponderado actual: ~78/100** (fue 64/100 al inicio de esta sesión)
**Objetivo: 90/100** (100 requiere TypeScript + tests E2E + fotos propias)

**Nuevas utilidades disponibles:**
- `src/utils/formatters.js` — `formatPrice`, `formatPriceRaw`, `formatDiscount`
- `src/components/SEOHead.jsx` — nuevo prop `noindex={true}`

---

## 🗺️ PLAN DE ACCIÓN (ver PLAN_100.md para la lista detallada)

Las acciones para llegar al 90+ están en `PLAN_100.md` con:
- Riesgo de cada cambio (🟢/🟡/🔴)
- Ganancia de score estimada
- Orden de ejecución seguro
- Criterio de éxito verificable
