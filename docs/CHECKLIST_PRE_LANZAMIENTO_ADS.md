# 🚀 Checklist Pre-Lanzamiento de Publicidad

## Estado: LISTO PARA RECIBIR TRÁFICO PAGADO

---

## ✅ COMPLETADO - Seguridad

- [x] **Firebase Security Rules implementadas**
  - Archivo: `firestore.rules`
  - Protege pedidos, inventario, cupones
  - Usuarios solo ven sus propios datos
  - Admin tiene acceso completo
  - **ACCIÓN REQUERIDA:** Desplegar reglas (ver `docs/DEPLOY_FIREBASE_RULES.md`)

---

## ✅ COMPLETADO - Tracking de Conversiones

### **Meta Pixel (Facebook/Instagram Ads)**
- [x] Pixel ID: `825371743662986` instalado
- [x] Evento `PageView` (automático)
- [x] Evento `ViewContent` (páginas de productos)
- [x] Evento `AddToCart` (agregar al carrito)
- [x] Evento `InitiateCheckout` (abrir checkout) ✨ NUEVO
- [x] Evento `AddPaymentInfo` (seleccionar método de pago) ✨ NUEVO
- [x] Evento `Purchase` (completar pedido) ✨ NUEVO
- [x] Evento `Lead` (contacto por WhatsApp)

**Verificación:**
- Instalar extensión: [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
- Ir a: https://bikitchencr.com
- Verificar que aparezcan eventos en la extensión

### **Google Analytics**
- [x] Analytics ID: `G-VJBDBGPHV6` configurado
- [x] Firebase Analytics integrado
- [x] Eventos automáticos habilitados

---

## ⚠️ PENDIENTE - Acciones Críticas

### **1. Desplegar Firebase Security Rules** 🔥
**Tiempo estimado:** 5 minutos  
**Prioridad:** CRÍTICA

```bash
# Opción A: Firebase Console
1. Ir a: https://console.firebase.google.com
2. Proyecto: bikitchen-app
3. Firestore Database → Rules
4. Copiar contenido de firestore.rules
5. Pegar y publicar

# Opción B: Firebase CLI
firebase deploy --only firestore:rules
```

**Sin esto, tu base de datos está ABIERTA al público.**

---

### **2. Configurar Conversiones en Meta Ads Manager**
**Tiempo estimado:** 10 minutos  
**Prioridad:** ALTA

1. **Ir a Meta Events Manager**
   - URL: https://business.facebook.com/events_manager2
   - Seleccionar Pixel ID: `825371743662986`

2. **Verificar eventos activos**
   - Debería ver: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase
   - Si no aparecen, hacer una compra de prueba

3. **Configurar eventos de conversión**
   - Ir a: Aggregated Event Measurement
   - Agregar dominio: `bikitchencr.com`
   - Priorizar eventos:
     1. Purchase (más importante)
     2. InitiateCheckout
     3. AddToCart
     4. Lead

4. **Crear audiencias personalizadas**
   - Visitantes de las últimas 30 días
   - Personas que iniciaron checkout pero no compraron
   - Compradores (para excluir de campañas de adquisición)

---

### **3. Probar Flujo Completo de Compra**
**Tiempo estimado:** 15 minutos  
**Prioridad:** ALTA

**Test End-to-End:**

1. **Agregar productos al carrito**
   - [ ] Agregar pack de 5 comidas
   - [ ] Verificar precio correcto
   - [ ] Aplicar cupón (si tienes uno activo)

2. **Iniciar checkout**
   - [ ] Llenar datos personales
   - [ ] Seleccionar zona de entrega
   - [ ] Verificar costo de envío
   - [ ] Seleccionar fecha de entrega

3. **Seleccionar método de pago**
   - [ ] Probar WhatsApp (debería abrir chat)
   - [ ] Probar SINPE (mostrar instrucciones)
   - [ ] Probar Transferencia (mostrar datos bancarios)

4. **Completar pedido**
   - [ ] Confirmar pedido
   - [ ] Verificar que aparece en admin
   - [ ] Verificar que se envió evento Purchase a Meta Pixel

5. **Verificar en Admin**
   - [ ] Login: https://bikitchencr.com/admin/login
   - [ ] Ver pedido en lista
   - [ ] Cambiar estado del pedido
   - [ ] Exportar hoja de cocina (PDF)

---

## 📊 Configuración de Campañas (Recomendado)

### **Estructura de Campañas Sugerida:**

#### **Campaña 1: Conversiones - Packs Semanales**
- **Objetivo:** Conversiones (Purchase)
- **Presupuesto:** ₡5,000 - ₡10,000/día
- **Audiencia:** 
  - Ubicación: Costa Rica (GAM, Heredia, Cartago, Alajuela)
  - Edad: 25-45 años
  - Intereses: Comida saludable, fitness, meal prep
- **Creativos:**
  - Imágenes de packs
  - Video de preparación
  - Testimonios
- **Llamado a acción:** "Ordena ahora"
- **Optimizar para:** Purchase

#### **Campaña 2: Tráfico - Conocimiento de Marca**
- **Objetivo:** Tráfico
- **Presupuesto:** ₡3,000 - ₡5,000/día
- **Audiencia:** Similar a Campaña 1 pero más amplia
- **Creativos:**
  - Contenido educativo
  - Beneficios de meal prep
  - Comparación de precios
- **Llamado a acción:** "Más información"
- **Optimizar para:** Landing Page Views

#### **Campaña 3: Retargeting**
- **Objetivo:** Conversiones
- **Presupuesto:** ₡2,000 - ₡3,000/día
- **Audiencia:**
  - Visitaron el sitio en últimos 7 días
  - Iniciaron checkout pero no compraron
  - Agregaron al carrito pero no compraron
- **Creativos:**
  - Recordatorio de carrito
  - Cupón de descuento especial
  - Urgencia (oferta limitada)
- **Optimizar para:** Purchase

---

## 🎯 Métricas Clave a Monitorear

### **Día 1-3 (Fase de Aprendizaje):**
- **CPM** (Costo por mil impresiones): ₡2,000 - ₡5,000
- **CTR** (Click-through rate): 1-3%
- **CPC** (Costo por clic): ₡500 - ₡1,500
- **Conversiones:** 1-5 pedidos/día

### **Día 4-7 (Optimización):**
- **CPM:** Debería estabilizarse
- **CTR:** Mejorar a 2-4%
- **CPC:** Reducir a ₡300 - ₡1,000
- **Conversiones:** 5-10 pedidos/día
- **ROAS** (Return on Ad Spend): Objetivo 2.0+ (₡2 de venta por cada ₡1 invertido)

### **Semana 2+ (Escalado):**
- **ROAS:** 3.0+ ideal
- **CAC** (Costo de Adquisición de Cliente): ₡3,000 - ₡8,000
- **LTV** (Lifetime Value): ₡30,000+ (clientes recurrentes)

---

## 🔍 Herramientas de Verificación

### **Antes de Lanzar:**
1. **Facebook Pixel Helper**
   - Instalar: https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc
   - Verificar eventos en cada página

2. **Google PageSpeed Insights**
   - URL: https://pagespeed.web.dev/
   - Probar: https://bikitchencr.com
   - Objetivo: Score 80+ en móvil

3. **Meta Pixel Test Events**
   - URL: https://business.facebook.com/events_manager2/test_events
   - Hacer compra de prueba
   - Verificar que aparece evento Purchase

4. **Google Analytics Real-Time**
   - URL: https://analytics.google.com
   - Navegar por el sitio
   - Verificar que apareces en tiempo real

---

## 💰 Información de Pagos (Para Clientes)

### **Métodos Activos:**
- ✅ **WhatsApp:** Coordinar pago (más popular)
- ✅ **SINPE Móvil:** 8831-1500 (Gabriela Li Carmona)
- ✅ **Transferencia:** Mutual Alajuela - Cuenta: 112-100-100214947
- ❌ **PayPal/Tarjeta:** Deshabilitado temporalmente

**Nota:** Todos los pedidos requieren confirmación manual de pago por admin.

---

## 📱 Contacto y Soporte

### **WhatsApp Principal:**
- Número: +506 8506-7200
- Configurado en Firebase (editable desde admin)

### **Email:**
- bikitchenfood@gmail.com

### **Redes Sociales:**
- Instagram: @bikitchenfood
- Facebook: BiKitchen Food

---

## ⚠️ Problemas Conocidos y Soluciones

### **1. Pedidos no aparecen en admin**
**Causa:** Firebase rules muy restrictivas o no desplegadas  
**Solución:** Verificar reglas en Firebase Console

### **2. Eventos de Meta Pixel no se disparan**
**Causa:** Ad blocker o extensiones de privacidad  
**Solución:** Probar en modo incógnito o con Facebook Pixel Helper

### **3. Costo de envío incorrecto**
**Causa:** Zona no seleccionada o fuera de cobertura  
**Solución:** Verificar zonas en `src/data/shippingZones.js`

### **4. Cupones no funcionan**
**Causa:** Cupón expirado o ya usado  
**Solución:** Verificar en admin → Cupones

---

## ✅ Checklist Final (Antes de Activar Ads)

### **Técnico:**
- [ ] Firebase Security Rules desplegadas
- [ ] Prueba de compra completa exitosa
- [ ] Meta Pixel verificado con Pixel Helper
- [ ] Google Analytics funcionando
- [ ] Admin puede ver y gestionar pedidos

### **Contenido:**
- [ ] Imágenes de productos optimizadas
- [ ] Descripciones claras y atractivas
- [ ] Precios correctos
- [ ] Información de envío actualizada

### **Operaciones:**
- [ ] Inventario suficiente para primeros pedidos
- [ ] Equipo listo para preparar comidas
- [ ] Logística de entrega confirmada
- [ ] Horarios de entrega definidos (Lunes, Miércoles, Sábado)

### **Marketing:**
- [ ] Creativos de ads preparados
- [ ] Copy de ads escrito
- [ ] Audiencias configuradas en Meta
- [ ] Presupuesto definido
- [ ] Estrategia de respuesta a mensajes lista

### **Legal:**
- [ ] Términos y condiciones publicados
- [ ] Política de privacidad publicada
- [ ] Política de cookies publicada
- [ ] Información de contacto visible

---

## 🎉 ¡Listo para Lanzar!

Una vez completado todo el checklist:

1. **Activar primera campaña con presupuesto bajo** (₡3,000/día)
2. **Monitorear primeras 24 horas de cerca**
3. **Responder rápido a mensajes de WhatsApp**
4. **Ajustar según resultados**
5. **Escalar gradualmente si ROAS > 2.0**

---

## 📞 Soporte Post-Lanzamiento

Si necesitas ayuda después de lanzar:
- Revisar métricas en Meta Ads Manager diariamente
- Ajustar presupuesto según rendimiento
- Pausar ads con ROAS < 1.0
- Escalar ads con ROAS > 3.0
- Crear nuevas audiencias basadas en compradores

**¡Éxito con el lanzamiento! 🚀**
