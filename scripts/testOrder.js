// Script para crear un pedido de prueba
// Ejecutar con: node scripts/testOrder.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAGxxqKMCsaIuT8OCFB4a6ypvlKdSfqFv8",
  authDomain: "bikitchen-app.firebaseapp.com",
  projectId: "bikitchen-app",
  storageBucket: "bikitchen-app.firebasestorage.app",
  messagingSenderId: "1003953062711",
  appId: "1:1003953062711:web:a9a5a9a9a9a9a9a9a9a9a9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const testOrder = {
  numeroOrden: `#ORD-${Math.floor(1000 + Math.random() * 9000)}`,
  cliente: "Cliente Prueba",
  telefono: "8888-8888",
  correo: "test@bikitchen.com",
  cedula: "1-2345-6789",
  direccion: "Grecia Centro, 100m norte del parque",
  referencias: "Casa color azul",
  zona_envio: "Grecia / Sarchí / Naranjo",
  zona_id: "grecia-sarchi-naranjo",
  ubicacion_fuera_cobertura: null,
  costo_envio: 1500,
  envio_por_confirmar: false,
  plan: "Pack Regular",
  fecha_entrega: new Date().toISOString().split('T')[0],
  horario_preferido: "9:00 AM - 2:00 PM",
  observaciones: "Pedido de prueba",
  menu: [
    {
      nombre: "Pack Regular",
      proteina: "150g",
      carbo: "100g",
      ensalada: "80g",
      cantidad: 1,
      precio: 24000
    }
  ],
  subtotal: 24000,
  descuento: 0,
  cupon: null,
  total: 25500, // 24000 + 1500 envío
  metodo_pago: "Efectivo",
  status: "pending",
  deliveryStatus: "pending",
  createdAt: new Date().toISOString(),
  // Campos para el modal de detalle
  details: {
    phone: "8888-8888",
    address: "Grecia Centro, 100m norte del parque",
    email: "test@bikitchen.com",
    zona: "Grecia / Sarchí / Naranjo",
    costoEnvio: 1500,
    fechaEntrega: new Date().toISOString().split('T')[0],
    horarioEntrega: "9:00 AM - 2:00 PM",
    cart: [
      {
        name: "Pack Regular",
        planLabel: "Semanal",
        price: 24000,
        quantity: 1
      }
    ]
  }
};

async function createTestOrder() {
  try {
    const docRef = await addDoc(collection(db, 'pedidos'), testOrder);
    console.log('✅ Pedido de prueba creado con ID:', docRef.id);
    console.log('📋 Número de orden:', testOrder.numeroOrden);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestOrder();
