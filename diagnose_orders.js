import { db } from './src/firebase/config.js';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function diagnose() {
    console.log("--- Diagnóstico de Pedidos ---");
    const q = query(collection(db, "pedidos"), limit(5));
    const snap = await getDocs(q);
    
    snap.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`Cliente: ${data.cliente || data.client}`);
        console.log(`Correo: ${data.correo}`);
        console.log(`Telefono: ${data.telefono}`);
        console.log(`Details Email: ${data.details?.email}`);
        console.log(`Details Phone: ${data.details?.phone}`);
        console.log(`Keys: ${Object.keys(data).join(', ')}`);
        console.log("----------------------------");
    });
}

diagnose();
