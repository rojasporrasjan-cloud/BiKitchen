# Configuración de Números de WhatsApp

## 📱 Sistema Dinámico de WhatsApp

Los números de WhatsApp ahora se gestionan desde Firebase en tiempo real, permitiendo cambiar los números sin necesidad de redesplegar la aplicación.

## 🔧 Configuración Inicial

### 1. Configurar en Firebase Console

1. Ve a Firebase Console → Firestore Database
2. Crea una colección llamada `config`
3. Dentro de `config`, crea un documento con ID: `contact`
4. Agrega los siguientes campos:

```json
{
  "whatsappPhone": "50672752645",
  "whatsappPhoneAlt": "50688311500",
  "updatedAt": "2024-01-15T10:00:00.000Z",
  "description": "Configuración de números de WhatsApp para BiKitchen"
}
```

### 2. Usando el Script de Inicialización

Alternativamente, puedes usar el script automatizado:

```bash
# Asegúrate de tener las variables de entorno configuradas en .env
node scripts/initWhatsAppConfig.js
```

## 📞 Números Configurados

- **Número Principal (Pruebas)**: `50672752645`
- **Número Alternativo**: `50688311500`
- **Número de Producción**: `50685067200`

## 🔄 Cambiar Números

### Opción 1: Firebase Console (Recomendado)
1. Ve a Firestore → `config` → `contact`
2. Edita el campo `whatsappPhone`
3. Los cambios se reflejan automáticamente en la app (en tiempo real)

### Opción 2: Desde la Aplicación (Programáticamente)
```javascript
import { useContactConfig } from '../context/ContactConfigContext';

function MiComponente() {
  const { updateWhatsAppPhone } = useContactConfig();
  
  const cambiarNumero = async () => {
    await updateWhatsAppPhone('50685067200'); // Número de producción
  };
}
```

## 🎯 Uso en Componentes

### Hook useWhatsApp
```javascript
import { useWhatsApp } from '../hooks/useWhatsApp';

function MiComponente() {
  const { 
    whatsappPhone,        // Número principal actual
    getWhatsAppUrl,       // Función para generar URLs
    urls                  // URLs pre-construidas
  } = useWhatsApp();
  
  // Generar URL personalizada
  const url = getWhatsAppUrl('Hola, quiero información');
  
  // Usar URLs pre-construidas
  const urlInicio = urls.INICIO;
  const urlPackSemanal = urls.PACK_SEMANAL;
  
  return (
    <a href={url} target="_blank">
      Contactar por WhatsApp
    </a>
  );
}
```

## 📝 Componentes Actualizados

Los siguientes componentes ya usan el sistema dinámico:

- ✅ `WhatsAppButton.jsx` - Botón flotante
- ✅ `MisPedidosPage.jsx` - Consultas de pedidos
- ✅ `PromocionesPage.jsx` - Botones de promociones
- ✅ `TemporadaPage.jsx` - Pack navideño
- ⏳ `TerminosPage.jsx` - Pendiente
- ⏳ `Footer.jsx` - Pendiente
- ⏳ Otros componentes con botones de WhatsApp

## 🚀 Ventajas del Sistema

1. **Cambios en Tiempo Real**: No requiere redespliegue
2. **Pruebas Fáciles**: Cambia entre números de prueba y producción instantáneamente
3. **Centralizado**: Un solo lugar para gestionar todos los números
4. **Sincronización**: Todos los usuarios ven el mismo número actualizado

## ⚠️ Notas Importantes

- El número debe incluir el código de país (ej: `50660813117` para Costa Rica)
- No incluir espacios, guiones ni el símbolo `+`
- Los cambios se propagan automáticamente a todos los usuarios conectados
- Si Firebase falla, se usa el número por defecto configurado en `whatsappMessages.js`

## 🔐 Seguridad

Considera agregar reglas de seguridad en Firestore para proteger la configuración:

```javascript
// firestore.rules
match /config/{document} {
  allow read: if true;  // Todos pueden leer
  allow write: if request.auth != null && 
                  get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## 📊 Monitoreo

Para ver qué número está activo actualmente:

```javascript
import { useContactConfig } from '../context/ContactConfigContext';

function DebugComponent() {
  const { whatsappPhone, loading } = useContactConfig();
  
  if (loading) return <div>Cargando...</div>;
  
  return <div>Número activo: {whatsappPhone}</div>;
}
```
