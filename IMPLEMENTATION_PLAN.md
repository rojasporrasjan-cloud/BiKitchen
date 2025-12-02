# Big Kitchen Admin Panel - Plan de Implementación

## ✅ Módulos Ya Implementados

### 1. Autenticación
- ✅ Login básico (src/pages/admin/Login.jsx)
- ⚠️ Pendiente: Integrar Firebase Auth completo

### 2. Dashboard
- ✅ Panel principal con métricas (src/pages/admin/DashboardView.jsx)
- ✅ Resumen de ventas, pedidos activos, stock bajo
- ✅ Top productos y pedidos recientes

### 3. Pedidos
- ✅ Vista Kanban (src/pages/admin/OrdersView.jsx)
- ✅ Integración con Firebase
- ⚠️ Pendiente: Generación de hojas de cocina/empaque

### 4. Inventario
- ✅ Control de stock (src/pages/admin/InventoryView.jsx)
- ✅ Alertas de stock bajo
- ⚠️ Pendiente: Descuento automático al crear pedidos

### 5. Clientes
- ✅ Gestión de clientes (src/pages/admin/ClientsView.jsx)
- ✅ CRUD completo con Firebase
- ⚠️ Pendiente: Historial de pedidos por cliente

### 6. Producción
- ✅ Vista de cocina (src/pages/admin/KitchenView.jsx)
- ✅ Empaque (src/pages/admin/PackagingView.jsx)
- ✅ Despacho (src/pages/admin/DeliveryView.jsx)

---

## 🚧 Módulos Pendientes

### 7. Compras/Proveedores
**Archivo**: `src/pages/admin/PurchasesView.jsx`
**Funcionalidades**:
- Registrar compras a proveedores
- Campos: proveedor, producto, cantidad, costo, fecha
- Actualizar inventario automáticamente
- Historial de compras

### 8. Hojas Automáticas
**Archivos**: 
- `src/pages/admin/KitchenSheetView.jsx`
- `src/pages/admin/PackingSheetView.jsx`

**Funcionalidades**:
- Generar PDF con jspdf o react-to-print
- Agrupar pedidos por menú y día
- Calcular totales de ingredientes
- Vista imprimible

### 9. Configuración
**Archivo**: `src/pages/admin/SettingsView.jsx`
**Funcionalidades**:
- Gestionar planes de comida
- Tipos de menú
- Logo y datos de empresa
- Configuración de Firebase

---

## 📋 Estructura de Datos en Firestore

### Colección: `pedidos`
```javascript
{
  cliente: "María López",
  clienteId: "ref_a_cliente",
  plan: "Semanal - Bajo en carbohidratos",
  menu: [
    {
      nombre: "Pollo con brócoli",
      proteina: "150g",
      carbo: "50g",
      ensalada: "100g"
    }
  ],
  fecha_entrega: "2025-12-01",
  fecha_creacion: timestamp,
  estado: "pendiente", // pendiente, en_produccion, empacado, entregado
  observaciones: "sin sal",
  total: 25000
}
```

### Colección: `clientes`
```javascript
{
  nombre: "María López",
  telefono: "+506 8888-8888",
  correo: "maria@example.com",
  direccion: "San José, Escazú",
  fechaRegistro: timestamp,
  totalPedidos: 15,
  ultimoPedido: timestamp
}
```

### Colección: `inventario`
```javascript
{
  nombre: "Pollo Orgánico",
  categoria: "Proteína",
  unidad: "kg",
  cantidadDisponible: 25,
  puntoReposicion: 10,
  costoUnitario: 8500,
  proveedor: "Granja Verde"
}
```

### Colección: `compras`
```javascript
{
  proveedor: "Granja Verde",
  productos: [
    {
      nombre: "Pollo Orgánico",
      cantidad: 50,
      costoUnitario: 8500
    }
  ],
  costoTotal: 425000,
  fecha: timestamp,
  factura: "F-001234"
}
```

### Colección: `planes`
```javascript
{
  nombre: "Semanal - Bajo en Carbohidratos",
  tipo: "semanal", // semanal, quincenal, mensual
  precio: 25000,
  comidas: 5,
  descripcion: "5 comidas bajas en carbohidratos"
}
```

---

## 🎨 Mejoras de UI Pendientes

1. **Tema Verde Esmeralda**
   - Actualizar colores primarios en tailwind.config.js
   - Color principal: #10b981 (verde esmeralda)
   
2. **Logo**
   - Añadir logo de Big Kitchen en navbar
   - Usar componente de imagen o SVG

3. **Iconos en Sidebar**
   - Ya implementado con lucide-react

---

## 📦 Dependencias Adicionales Necesarias

```bash
npm install jspdf jspdf-autotable react-to-print
```

Para generación de PDFs y hojas imprimibles.

---

## 🔄 Próximos Pasos Inmediatos

1. ✅ Módulo de Clientes (COMPLETADO)
2. 🔄 Módulo de Compras/Proveedores
3. 🔄 Generación de Hojas (Cocina y Empaque)
4. 🔄 Configuración
5. 🔄 Mejorar autenticación con Firebase Auth
6. 🔄 Implementar descuento automático de inventario

---

## 🎯 Prioridad Alta

- **Hojas de Cocina y Empaque**: Es la funcionalidad más crítica para el negocio
- **Integración completa con Firebase**: Asegurar que todos los módulos estén conectados
- **Mobile Responsive**: Verificar que todo funcione perfecto en móviles

---

**Última actualización**: 2025-11-30
**Estado del proyecto**: 60% completado
