import { db } from '../firebase/config';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

/**
 * SCRIPT PARA ELIMINAR TODOS LOS DATOS
 * 
 * ⚠️ ADVERTENCIA: Este script eliminará TODOS los pedidos y clientes.
 * Solo ejecutar en desarrollo o cuando realmente quieras empezar de cero.
 * 
 * Para usar:
 * 1. Abre la consola del navegador en el panel de admin
 * 2. Ejecuta: await window.deleteAllData()
 */

export async function deleteAllOrders() {
    console.log('🗑️ Eliminando todos los pedidos...');
    
    try {
        const ordersSnapshot = await getDocs(collection(db, 'pedidos'));
        const batch = writeBatch(db);
        let count = 0;

        ordersSnapshot.docs.forEach((document) => {
            batch.delete(doc(db, 'pedidos', document.id));
            count++;
        });

        await batch.commit();
        console.log(`✅ ${count} pedidos eliminados de 'pedidos'`);
        
        return { success: true, count };
    } catch (error) {
        console.error('❌ Error eliminando pedidos:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteAllClients() {
    console.log('🗑️ Eliminando todos los clientes...');
    
    try {
        const clientsSnapshot = await getDocs(collection(db, 'users'));
        const batch = writeBatch(db);
        let count = 0;

        clientsSnapshot.docs.forEach((document) => {
            // No eliminar admins (puedes ajustar esta lógica)
            const data = document.data();
            if (!data.isAdmin) {
                batch.delete(doc(db, 'users', document.id));
                count++;
            }
        });

        await batch.commit();
        console.log(`✅ ${count} clientes eliminados de 'users'`);
        
        return { success: true, count };
    } catch (error) {
        console.error('❌ Error eliminando clientes:', error);
        return { success: false, error: error.message };
    }
}

export async function deleteAllData() {
    console.log('⚠️ ELIMINANDO TODOS LOS DATOS...');
    console.log('Esta acción no se puede deshacer.');
    
    const confirmDelete = window.confirm(
        '⚠️ ¿Estás SEGURO de que quieres eliminar TODOS los pedidos y clientes?\n\n' +
        'Esta acción NO se puede deshacer.\n\n' +
        'Presiona OK para continuar o Cancelar para abortar.'
    );
    
    if (!confirmDelete) {
        console.log('❌ Operación cancelada por el usuario');
        return { success: false, message: 'Cancelado por el usuario' };
    }
    
    try {
        // Eliminar pedidos
        const ordersResult = await deleteAllOrders();
        
        // Eliminar clientes
        const clientsResult = await deleteAllClients();
        
        console.log('✅ TODOS LOS DATOS HAN SIDO ELIMINADOS');
        console.log(`📊 Resumen:`);
        console.log(`   - Pedidos eliminados: ${ordersResult.count}`);
        console.log(`   - Clientes eliminados: ${clientsResult.count}`);
        
        alert(
            `✅ Datos eliminados exitosamente:\n\n` +
            `• ${ordersResult.count} pedidos\n` +
            `• ${clientsResult.count} clientes\n\n` +
            `La página se recargará.`
        );
        
        // Recargar la página
        window.location.reload();
        
        return {
            success: true,
            ordersDeleted: ordersResult.count,
            clientsDeleted: clientsResult.count
        };
    } catch (error) {
        console.error('❌ Error eliminando datos:', error);
        alert(`❌ Error: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// Exponer funciones globalmente para uso en consola
if (typeof window !== 'undefined') {
    window.deleteAllData = deleteAllData;
    window.deleteAllOrders = deleteAllOrders;
    window.deleteAllClients = deleteAllClients;
}
