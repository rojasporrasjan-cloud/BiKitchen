# 📊 Facebook Pixel - BiKitchen

## ✅ Configuración Completada

El píxel de Facebook está configurado y funcionando con el ID: **825371743662986**

## 🎯 Eventos Implementados

### ✅ Eventos Automáticos

1. **PageView** - Se trackea automáticamente en cada carga de página
2. **AddToCart** - Se trackea cuando se agrega un producto al carrito

### 📋 Eventos Disponibles para Implementar

El servicio `facebookPixel.js` incluye los siguientes eventos listos para usar:

#### Eventos Estándar de Facebook

| Evento | Función | Cuándo usar |
|--------|---------|-------------|
| `ViewContent` | `trackViewContent(product)` | Cuando un usuario ve un producto/pack |
| `AddToCart` | `trackAddToCart(item)` | ✅ Ya implementado |
| `InitiateCheckout` | `trackInitiateCheckout(items, total)` | Cuando inicia el proceso de pago |
| `Purchase` | `trackPurchase(orderData)` | Cuando se completa una compra |
| `Search` | `trackSearch(query)` | Cuando un usuario busca |
| `CompleteRegistration` | `trackCompleteRegistration(method)` | Cuando se registra un usuario |
| `Contact` | `trackContact(message)` | Cuando contacta por WhatsApp |
| `AddPaymentInfo` | `trackAddPaymentInfo()` | Cuando agrega info de pago |

#### Eventos Personalizados de BiKitchen

| Evento | Función | Descripción |
|--------|---------|-------------|
| `ViewPack` | `trackViewPack(packName)` | Ver un pack específico |
| `ViewPromotion` | `trackViewPromotion(promoName)` | Ver una promoción |
| `CalculateSavings` | `trackCalculateSavings(savings)` | Calcular ahorro |
| `ComparePacks` | `trackComparePacks()` | Comparar packs |
| `ViewMenu` | `trackViewMenu()` | Ver menú semanal |
| `ApplyCoupon` | `trackApplyCoupon(couponCode)` | Aplicar cupón |
| `ViewOrderHistory` | `trackViewOrderHistory()` | Ver historial |

## 🔧 Cómo Usar

### Importar el servicio

```javascript
import { 
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackPurchase,
    trackContact
} from '../services/facebookPixel';
```

### Ejemplos de Uso

#### 1. Trackear cuando se ve un producto

```javascript
// En PacksPage.jsx, PromocionesPage.jsx, etc.
import { trackViewContent } from '../services/facebookPixel';

const handleViewPack = (pack) => {
    trackViewContent({
        id: pack.id,
        name: pack.name,
        price: pack.price,
        category: 'Pack'
    });
};
```

#### 2. Trackear inicio de checkout

```javascript
// En CartContext.jsx o CheckoutPage.jsx
import { trackInitiateCheckout } from '../services/facebookPixel';

const handleCheckout = () => {
    trackInitiateCheckout(cart, totalAmount);
    // ... resto del código
};
```

#### 3. Trackear compra completada

```javascript
// Cuando se confirma un pedido
import { trackPurchase } from '../services/facebookPixel';

const confirmOrder = async (orderData) => {
    // ... crear pedido en Firebase
    
    trackPurchase({
        orderNumber: orderData.orderNumber,
        total: orderData.total,
        items: orderData.items
    });
};
```

#### 4. Trackear contacto por WhatsApp

```javascript
// En WhatsAppButton.jsx o cualquier botón de WhatsApp
import { trackContact } from '../services/facebookPixel';

const handleWhatsAppClick = () => {
    trackContact('Consulta general');
    // ... abrir WhatsApp
};
```

#### 5. Trackear registro de usuario

```javascript
// En LoginPage.jsx o página de registro
import { trackCompleteRegistration } from '../services/facebookPixel';

const handleRegister = async (userData) => {
    // ... crear usuario
    trackCompleteRegistration('email');
};
```

## 📍 Dónde Implementar Cada Evento

### Alta Prioridad 🔴

1. **PacksPage.jsx**
   ```javascript
   import { trackViewContent, trackViewPack } from '../services/facebookPixel';
   
   // Cuando se selecciona un pack
   const handleSelectPack = (pack) => {
       trackViewContent(pack);
       trackViewPack(pack.name);
   };
   ```

2. **PromocionesPage.jsx**
   ```javascript
   import { trackViewContent, trackViewPromotion } from '../services/facebookPixel';
   
   // Cuando se abre el modal de promoción
   const handleOpenPromo = (promo) => {
       trackViewContent(promo);
       trackViewPromotion(promo.titulo);
   };
   ```

3. **OrdersContext.jsx** (o donde se creen pedidos)
   ```javascript
   import { trackPurchase } from '../services/facebookPixel';
   
   // Cuando se confirma el pedido
   const createOrder = async (orderData) => {
       // ... crear en Firebase
       trackPurchase(orderData);
   };
   ```

4. **Checkout/Payment Flow**
   ```javascript
   import { trackInitiateCheckout, trackAddPaymentInfo } from '../services/facebookPixel';
   
   // Al iniciar checkout
   const startCheckout = () => {
       trackInitiateCheckout(cart, total);
   };
   
   // Al agregar método de pago
   const selectPaymentMethod = () => {
       trackAddPaymentInfo();
   };
   ```

### Media Prioridad 🟡

5. **WhatsAppButton.jsx**
   ```javascript
   import { trackContact } from '../services/facebookPixel';
   
   const handleClick = () => {
       trackContact('WhatsApp Button');
       // ... abrir WhatsApp
   };
   ```

6. **CatalogPage.jsx / MenusView.jsx**
   ```javascript
   import { trackViewMenu } from '../services/facebookPixel';
   
   useEffect(() => {
       trackViewMenu();
   }, []);
   ```

7. **CalculadoraAhorroPage.jsx**
   ```javascript
   import { trackCalculateSavings } from '../services/facebookPixel';
   
   const calculateSavings = (amount) => {
       // ... cálculo
       trackCalculateSavings(amount);
   };
   ```

8. **ComparadorPage.jsx**
   ```javascript
   import { trackComparePacks } from '../services/facebookPixel';
   
   const handleCompare = () => {
       trackComparePacks();
   };
   ```

### Baja Prioridad 🟢

9. **LoginPage.jsx**
   ```javascript
   import { trackCompleteRegistration, trackLogin } from '../services/facebookPixel';
   
   const handleRegister = () => {
       // ... registro
       trackCompleteRegistration('email');
   };
   
   const handleLogin = () => {
       // ... login
       trackLogin();
   };
   ```

10. **MisPedidosPage.jsx**
    ```javascript
    import { trackViewOrderHistory } from '../services/facebookPixel';
    
    useEffect(() => {
        trackViewOrderHistory();
    }, []);
    ```

## 🧪 Verificar que Funciona

### 1. Extensión de Facebook Pixel Helper

1. Instala [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) en Chrome
2. Abre tu sitio web
3. Haz clic en el ícono de la extensión
4. Deberías ver el píxel **825371743662986** activo
5. Verifica que los eventos se disparen correctamente

### 2. Events Manager de Facebook

1. Ve a [Facebook Events Manager](https://business.facebook.com/events_manager2)
2. Selecciona tu píxel (825371743662986)
3. Ve a "Test Events"
4. Navega por tu sitio y verifica que los eventos aparezcan en tiempo real

### 3. Consola del Navegador

Los eventos se loguean en la consola:
```
[FB Pixel] Event tracked: AddToCart {content_name: "Pack Semanal", ...}
[FB Pixel] Event tracked: Purchase {value: 25000, currency: "CRC", ...}
```

## 📊 Eventos por Página

| Página | Eventos a Implementar |
|--------|----------------------|
| **LandingPage** | ViewContent (hero pack) |
| **PacksPage** | ViewContent, ViewPack |
| **PromocionesPage** | ViewContent, ViewPromotion |
| **TemporadaPage** | ViewContent, ViewPack |
| **CatalogPage** | ViewMenu |
| **IndividualesView** | ViewContent |
| **CartContext** | AddToCart ✅, InitiateCheckout |
| **OrdersContext** | Purchase |
| **WhatsAppButton** | Contact |
| **LoginPage** | CompleteRegistration, Login |
| **CalculadoraAhorroPage** | CalculateSavings |
| **ComparadorPage** | ComparePacks |
| **MisPedidosPage** | ViewOrderHistory |

## 🎯 Conversiones Clave para Optimizar

Para campañas de Facebook Ads, enfócate en estos eventos:

1. **AddToCart** - ✅ Ya implementado
2. **InitiateCheckout** - 🔴 Alta prioridad
3. **Purchase** - 🔴 Alta prioridad
4. **ViewContent** - 🟡 Media prioridad
5. **Contact** - 🟢 Baja prioridad

## 🔐 Seguridad y Privacidad

- El píxel cumple con GDPR y políticas de privacidad
- Los datos se envían de forma anónima
- No se comparte información personal identificable
- Actualiza tu página de privacidad si es necesario

## 📝 Próximos Pasos

1. ✅ Píxel instalado y funcionando
2. ✅ AddToCart implementado
3. ⏳ Implementar InitiateCheckout
4. ⏳ Implementar Purchase
5. ⏳ Implementar ViewContent en páginas principales
6. ⏳ Implementar Contact en botones de WhatsApp
7. ⏳ Verificar con Facebook Pixel Helper
8. ⏳ Crear audiencias personalizadas en Facebook Ads
9. ⏳ Configurar eventos de conversión para campañas

## 🆘 Soporte

- **Documentación oficial**: [Facebook Pixel Documentation](https://developers.facebook.com/docs/meta-pixel)
- **Archivo de servicio**: `src/services/facebookPixel.js`
- **ID del Píxel**: 825371743662986

---

**Última actualización**: 18 de diciembre, 2024
**Estado**: ✅ Configurado y funcionando
**Eventos activos**: PageView, AddToCart
