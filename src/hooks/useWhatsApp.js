import { useContactConfig } from '../context/ContactConfigContext';
import { WHATSAPP_MESSAGES } from '../config/whatsappMessages';

/**
 * Hook personalizado para manejar URLs de WhatsApp
 * Usa el número de WhatsApp desde Firebase en tiempo real
 */
export const useWhatsApp = () => {
    const { whatsappPhone, whatsappPhoneAlt, loading } = useContactConfig();

    /**
     * Genera una URL de WhatsApp con mensaje prellenado
     * @param {string} message - Mensaje a enviar
     * @param {boolean} useAltPhone - Si usar el número alternativo
     * @returns {string} URL de WhatsApp
     */
    const getWhatsAppUrl = (message, useAltPhone = false) => {
        const phone = useAltPhone ? whatsappPhoneAlt : whatsappPhone;
        return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    };

    /**
     * Genera URL de WhatsApp para consulta de pedido específico
     * @param {string} orderNumber - Número de pedido
     * @returns {string} URL de WhatsApp
     */
    const getOrderInquiryUrl = (orderNumber) => {
        return getWhatsAppUrl(`Hola, tengo una consulta sobre mi pedido ${orderNumber} 📦`);
    };

    /**
     * Genera URL de WhatsApp para compartir (sin número destino)
     * @param {string} message - Mensaje a compartir
     * @returns {string} URL de WhatsApp
     */
    const getShareWhatsAppUrl = (message) => {
        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    };

    /**
     * URLs pre-construidas para uso común
     */
    const urls = {
        // Menú principal - activa bienvenida del bot
        INICIO: getWhatsAppUrl(WHATSAPP_MESSAGES.BIENVENIDA),
        
        // Packs
        PACK_SEMANAL: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_SEMANAL),
        PACK_QUINCENAL: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_QUINCENAL),
        PACK_MENSUAL: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_MENSUAL),
        PACK_NAVIDENO: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_NAVIDENO),
        PACK_FAMILIAR: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_FAMILIAR),
        PACK_ALMUERZO_CENA: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_ALMUERZO_CENA),
        TWO_PACK: getWhatsAppUrl(WHATSAPP_MESSAGES.TWO_PACK),
        PACK_PROTEINAS: getWhatsAppUrl(WHATSAPP_MESSAGES.PACK_PROTEINAS),
        
        // Información
        DIAS_ENTREGA: getWhatsAppUrl(WHATSAPP_MESSAGES.DIAS_ENTREGA),
        ZONAS: getWhatsAppUrl(WHATSAPP_MESSAGES.ZONAS_COBERTURA),
        INFO: getWhatsAppUrl(WHATSAPP_MESSAGES.INFORMACION),
        
        // Promociones
        PROMOCION: getWhatsAppUrl(WHATSAPP_MESSAGES.PROMOCION_MENSUAL),
        
        // Pedidos
        PEDIR: getWhatsAppUrl(WHATSAPP_MESSAGES.QUIERO_PEDIR),
        
        // Soporte
        AYUDA: getWhatsAppUrl(WHATSAPP_MESSAGES.AYUDA_GENERAL),
        AYUDA_CUENTA: getWhatsAppUrl(WHATSAPP_MESSAGES.AYUDA_CUENTA),
    };

    return {
        whatsappPhone,
        whatsappPhoneAlt,
        loading,
        getWhatsAppUrl,
        getOrderInquiryUrl,
        getShareWhatsAppUrl,
        urls
    };
};

export default useWhatsApp;
