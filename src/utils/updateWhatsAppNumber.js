import { db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import { WHATSAPP_PHONE, WHATSAPP_PHONE_ALT, formatWhatsAppDisplay } from '../config/whatsappMessages';

/**
 * Restablece el número de WhatsApp en Firebase a los valores por defecto del código.
 *
 * ⚠️ Este módulo NO debe importarse de forma global (ej: en App.jsx).
 * Antes lo hacía y exponía la función en window para cualquier visitante,
 * lo que permitía sobreescribir el WhatsApp del sitio desde la consola.
 *
 * Para cambiar el número normalmente, usar /admin/whatsapp-config.
 */
export async function updateWhatsAppToProduction() {
    try {
        const configRef = doc(db, 'config', 'contact');

        await setDoc(configRef, {
            whatsappPhone: WHATSAPP_PHONE,
            whatsappPhoneAlt: WHATSAPP_PHONE_ALT,
            updatedAt: new Date().toISOString()
        });

        alert(`✅ Número de WhatsApp restablecido a ${formatWhatsAppDisplay()}\n\nLa página se recargará para aplicar los cambios.`);
        window.location.reload();

        return { success: true };
    } catch (error) {
        console.error('❌ Error actualizando número:', error);
        alert('❌ Error al actualizar el número de WhatsApp');
        return { success: false, error: error.message };
    }
}
