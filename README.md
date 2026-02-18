# 🍽️ BiKitchen Food

**Ingredientes frescos, sabor de casa**

Aplicación web de e-commerce para servicio de comida saludable preparada. Incluye sistema de pedidos, packs semanales, panel de administración y más.

## 🚀 Características

### Cliente
- **Packs Semanales**: 5, 10 o 15 comidas con descuentos progresivos
- **Platos Individuales**: Menú diario con opciones variadas
- **Menú de Temporada**: Platos especiales según la estación
- **Carrito de Compras**: Con cupones de descuento
- **Checkout Multi-paso**: Datos, entrega, pago y confirmación
- **Múltiples Métodos de Pago**: PayPal, WhatsApp, SINPE, Transferencia
- **PWA**: Instalable en dispositivos móviles
- **Búsqueda Global**: Ctrl+K para buscar en toda la app
- **Sistema de Reseñas**: Calificaciones y comentarios
- **Tracking de Pedidos**: Estado en tiempo real
- **Compartir en Redes**: WhatsApp, Facebook, Twitter
- **Guardar Borrador**: No perder datos del checkout

### Panel Admin
- **Dashboard**: Estadísticas y métricas con gráficos
- **Gestión de Pedidos**: Estados, filtros y exportación
- **Calendario de Entregas**: Vista mensual/semanal
- **Inventario**: Control de ingredientes
- **Cupones y Promociones**: Crear y gestionar descuentos
- **Clientes**: Base de datos de clientes
- **Notificaciones**: Alertas en tiempo real de nuevos pedidos
- **Reportes**: Exportación a PDF

### Técnico
- **Skeleton Loaders**: Estados de carga elegantes
- **Lazy Loading**: Imágenes optimizadas
- **Prefetch**: Precarga de rutas populares
- **Capacitor Ready**: Preparado para app nativa iOS/Android
- **Accesibilidad**: ARIA labels y navegación por teclado

## 🛠️ Stack Tecnológico

- **Frontend**: React 19, Vite, TailwindCSS
- **Animaciones**: Framer Motion
- **Backend**: Firebase (Firestore, Auth, Storage, Analytics)
- **Icons**: Lucide React
- **Testing**: Vitest, Testing Library

## 📦 Instalación

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/bikitchen-food.git

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Build para producción
npm run build

# Ejecutar tests
npm run test
```

## 🔧 Configuración

### Variables de Entorno
Crear archivo `.env` con:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
```

### Firebase
1. Crear proyecto en Firebase Console
2. Habilitar Firestore, Authentication y Storage
3. Configurar reglas de seguridad

## 📁 Estructura del Proyecto

```
src/
├── components/     # Componentes reutilizables
├── context/        # Contextos de React (Cart, Auth, Theme)
├── data/           # Datos estáticos (packs, individuales)
├── firebase/       # Configuración de Firebase
├── hooks/          # Custom hooks
├── layouts/        # Layouts (Admin)
├── pages/          # Páginas públicas
│   └── admin/      # Páginas del panel admin
├── tests/          # Tests unitarios
├── utils/          # Utilidades y helpers
└── views/          # Vistas de secciones
```

## 🧪 Testing

```bash
# Ejecutar tests en modo watch
npm run test

# Ejecutar tests una vez
npm run test:run

# Ejecutar tests con coverage
npm run test:coverage
```

## 📱 PWA

La aplicación es una Progressive Web App:
- Instalable en dispositivos
- Funciona offline (páginas cacheadas)
- Notificaciones push (configurables)

## 🎨 Personalización

### Colores de Marca
Definidos en `tailwind.config.js`:
- **Primary (Orange)**: `#FF671D`
- **Secondary (Beige)**: `#B18978`
- **Gold**: `#E9A84A`

### SEO
Usar el componente `SEOHead` para meta tags dinámicos:
```jsx
import SEOHead, { SEO_CONFIG } from '../components/SEOHead';

<SEOHead {...SEO_CONFIG.home} />
```

## 📊 Analytics

Firebase Analytics integrado. Usar el hook `useAnalytics`:
```jsx
import useAnalytics from '../hooks/useAnalytics';

const { trackAddToCart, trackPurchase } = useAnalytics();
```

## 🔐 Autenticación

- Login con email/password
- Roles: Usuario y Admin
- Rutas protegidas para admin

## 📄 Licencia

Proyecto privado - BiKitchen Food © 2024

## 👥 Contacto

- **Web**: [bikitchenfood.com](https://bikitchenfood.com)
- **Instagram**: [@bikitchenfood](https://instagram.com/bikitchenfood)
- **WhatsApp**: +506 8506-7200
- **Email**: bikitchenfood@gmail.com
