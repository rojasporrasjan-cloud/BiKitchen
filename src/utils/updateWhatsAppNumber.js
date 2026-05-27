import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

/**
 * Script para actualizar el número de WhatsApp en Firebase
 * 
 * Para usar:
 * 1. Abre la consola del navegador
 * 2. Ejecuta: await window.updateWhatsAppToProduction()
 */

export async function updateWhatsAppToProduction() {
    try {
        console.log('🔄 Actualizando número de WhatsApp a producción...');

        const configRef = doc(db, 'config', 'contact');

        await setDoc(configRef, {
            whatsappPhone: '50685067200', // Número de producción
            whatsappPhoneAlt: '50688311500',
            updatedAt: new Date().toISOString()
        });

        console.log('✅ Número actualizado exitosamente a: 7275-2645');
        alert('✅ Número de WhatsApp actualizado a 7275-2645\n\nLa página se recargará para aplicar los cambios.');

        // Recargar la página para aplicar cambios
        window.location.reload();

        return { success: true };
    } catch (error) {
        console.error('❌ Error actualizando número:', error);
        alert('❌ Error al actualizar el número de WhatsApp');
        return { success: false, error: error.message };
    }
}

// Exponer función globalmente
if (typeof window !== 'undefined') {
    window.updateWhatsAppToProduction = updateWhatsAppToProduction;
}
