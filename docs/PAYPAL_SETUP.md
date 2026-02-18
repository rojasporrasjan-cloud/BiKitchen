# Configuración de PayPal para BiKitchen

## Resumen
BiKitchen usa PayPal Smart Payment Buttons para procesar pagos de forma segura. Los pagos se procesan en USD y se convierten automáticamente desde colones (CRC).

## Configuración Actual
- **Tasa de cambio**: ₡515 CRC = $1 USD (configurable en `src/components/PayPalButton.jsx`)
- **Moneda**: USD
- **Modo**: Sandbox (pruebas)

---

## Pasos para Configurar PayPal en Producción

### 1. Crear cuenta de PayPal Business
1. Ve a [PayPal Business](https://www.paypal.com/cr/business)
2. Crea una cuenta de negocio o convierte tu cuenta personal a business

### 2. Acceder al Dashboard de Desarrollador
1. Ve a [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Inicia sesión con tu cuenta de PayPal Business

### 3. Crear una App
1. En el dashboard, ve a **Apps & Credentials**
2. Haz clic en **Create App**
3. Nombre: `BiKitchen Food`
4. Tipo: **Merchant**
5. Haz clic en **Create App**

### 4. Obtener el Client ID
1. Una vez creada la app, verás dos secciones:
   - **Sandbox**: Para pruebas
   - **Live**: Para producción
2. Copia el **Client ID** de la sección **Live**

### 5. Configurar Variables de Entorno
Edita el archivo `.env` en la raíz del proyecto:

```env
# Para producción
VITE_PAYPAL_CLIENT_ID=tu-client-id-live-aqui
VITE_PAYPAL_MODE=live
```

### 6. Verificar la Integración
1. Reinicia el servidor de desarrollo
2. Realiza un pedido de prueba
3. Verifica que el botón de PayPal cargue correctamente
4. Realiza un pago de prueba (en sandbox) o un pago real (en live)

---

## Estructura de Archivos

```
src/
├── components/
│   └── PayPalButton.jsx      # Componente de botones de PayPal
├── services/
│   └── paypalService.js      # Servicio para actualizar pedidos
└── ...

.env                          # Variables de entorno (NO subir a git)
.env.example                  # Ejemplo de variables de entorno
```

---

## Flujo de Pago

1. Usuario llega al paso 4 (Confirmación) del checkout
2. Si selecciona PayPal, se muestra el botón de PayPal SDK
3. Usuario hace clic en el botón de PayPal
4. Se abre el popup de PayPal para autenticarse
5. Usuario confirma el pago en PayPal
6. PayPal captura el pago y devuelve los detalles
7. Se crea el pedido en Firestore con estado `confirmed` y `paymentStatus: paid`
8. Se muestra la confirmación al usuario

---

## Datos Guardados en Firestore

Cuando un pago de PayPal es exitoso, se guardan los siguientes campos en el pedido:

```javascript
{
  // ... otros campos del pedido ...
  status: 'confirmed',
  paymentStatus: 'paid',
  paymentProvider: 'paypal',
  paypalTransactionId: 'XXXXX',      // ID de la transacción
  paypalCaptureId: 'XXXXX',          // ID de la captura
  paypalPayerEmail: 'email@...',     // Email del pagador
  paypalPayerName: 'Nombre',         // Nombre del pagador
  paypalAmount: '50.00',             // Monto en USD
  paypalCurrency: 'USD',             // Moneda
  paidAt: Timestamp                  // Fecha/hora del pago
}
```

---

## Cuentas de Prueba (Sandbox)

Para probar en sandbox, PayPal proporciona cuentas de prueba:

1. Ve a [Sandbox Accounts](https://developer.paypal.com/dashboard/accounts)
2. Usa las cuentas de prueba para simular pagos
3. Email típico: `sb-xxxxx@personal.example.com`
4. Contraseña: Se muestra en el dashboard

---

## Solución de Problemas

### El botón no carga
- Verifica que `VITE_PAYPAL_CLIENT_ID` esté configurado
- Revisa la consola del navegador para errores
- Asegúrate de que el dominio esté permitido en PayPal

### Error al capturar pago
- Verifica que la cuenta de PayPal tenga fondos (sandbox)
- Revisa los logs en la consola

### Tasa de cambio incorrecta
- Edita `EXCHANGE_RATE` en `src/components/PayPalButton.jsx`

---

## Contacto
Para soporte con la integración de PayPal, contacta al desarrollador.
