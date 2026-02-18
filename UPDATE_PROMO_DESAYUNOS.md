# Script para Actualizar Promoción Mensual con Desayunos Gratis

## Instrucciones:

1. Ve al panel de administración: `/admin/promotions`
2. Busca la promoción "🎉 Promoción Mensual con Desayunos Gratis"
3. Haz clic en "Editar" (ícono de lápiz)
4. Actualiza los precios en la sección "Precios de Packs" con estos valores:

### Nuevos Precios (según imagen):

- **Pack Sin Carbos**: ₡89,900
- **Pack Bajo Calorías**: ₡99,500
- **Pack Regular**: ₡111,400
- **Pack Casaditos**: ₡111,400
- **Full Pack**: ₡135,600

## Alternativa - Script de Consola:

Si prefieres actualizar directamente desde la consola del navegador:

```javascript
// Ejecutar en la consola del navegador cuando estés en /admin/promotions
import { db } from './firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

async function actualizarPromoDesayunos() {
  const promosRef = collection(db, 'promociones');
  const snapshot = await getDocs(promosRef);
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.titulo && data.titulo.includes('Desayunos Gratis')) {
      console.log('Encontrada promoción:', data.titulo);
      
      // Nuevos precios según imagen
      const nuevosPrecios = [
        { nombre: 'Pack Sin Carbos', precio: 89900, precioRegular: 98000 },
        { nombre: 'Pack Bajo Calorías', precio: 99500, precioRegular: 103400 },
        { nombre: 'Pack Regular', precio: 111400, precioRegular: 111400 },
        { nombre: 'Pack Casaditos', precio: 111400, precioRegular: 111400 },
        { nombre: 'Full Pack', precio: 135600, precioRegular: 135600 }
      ];
      
      await updateDoc(doc(db, 'promociones', docSnap.id), {
        precios: nuevosPrecios,
        updatedAt: new Date()
      });
      
      console.log('✅ Promoción actualizada con nuevos precios');
      return;
    }
  }
  console.log('❌ No se encontró la promoción');
}

actualizarPromoDesayunos();
```

## Nota:
Los precios ya están actualizados en el código para futuras promociones que se creen desde el panel de admin.
