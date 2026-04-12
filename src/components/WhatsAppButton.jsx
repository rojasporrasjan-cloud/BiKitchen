import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WHATSAPP_MESSAGES } from '../config/whatsappMessages';
import { trackEvent } from '../services/facebookPixel';

/**
 * WhatsApp Floating Button - BiKitchen Brand
 * Botón flotante para contacto directo por WhatsApp
 * Optimizado para móviles: sin animaciones pesadas
 * Número de WhatsApp cargado desde Firebase en tiempo real
 */
export default function WhatsAppButton() {
    const { isCartOpen } = useCart();
    const { getWhatsAppUrl } = useWhatsApp();
    const [isMobile, setIsMobile] = useState(false);
    
    useEffect(() => {
        setIsMobile(window.innerWidth < 768);
    }, []);
    
    // Mensaje para activar el flujo de bienvenida del bot (keyword: "Hola")
    const whatsappUrl = getWhatsAppUrl(WHATSAPP_MESSAGES.BIENVENIDA);

    // Track Lead event cuando se hace clic en WhatsApp
    const handleClick = () => {
        trackEvent('Lead', {
            content_name: 'WhatsApp Button Click',
            content_category: 'Contact'
        });
    };

    if (isCartOpen) return null;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="fixed bottom-24 md:bottom-8 right-6 z-40 group"
        >
            {/* Pulse animation - solo en desktop */}
            {!isMobile && (
                <span className="absolute inset-0 rounded-full bg-bikitchen-gold animate-ping opacity-25"></span>
            )}
            
            {/* Button */}
            <div className="relative flex items-center justify-center w-14 h-14 bg-bikitchen-gold hover:bg-bikitchen-gold-dark rounded-full shadow-lg active:scale-95 transition-transform duration-150">
                <svg 
                    viewBox="0 0 24 24" 
                    className="w-7 h-7 text-gray-900 fill-current"
                >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
            </div>

            {/* Tooltip - solo en desktop */}
            {!isMobile && (
                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="bg-gray-900 text-white text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap shadow-lg">
                        ¡Escríbenos!
                        <div className="absolute left-full top-1/2 -translate-y-1/2 border-8 border-transparent border-l-gray-900"></div>
                    </div>
                </div>
            )}
        </a>
    );
}
