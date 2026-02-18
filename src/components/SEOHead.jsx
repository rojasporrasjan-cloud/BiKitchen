import { useEffect } from 'react';

/**
 * SEOHead Component
 * Maneja meta tags dinámicos para cada página
 */
export default function SEOHead({ 
    title = 'BiKitchen Food', 
    description = 'Ingredientes frescos, sabor de casa. Comida saludable preparada para tu semana.',
    keywords = 'comida saludable, meal prep, Costa Rica, packs semanales, comida casera',
    image = '/assets/og-image.jpg',
    url = '',
    type = 'website'
}) {
    useEffect(() => {
        // Title
        document.title = title.includes('BiKitchen') ? title : `${title} | BiKitchen Food`;
        
        // Meta description
        updateMetaTag('description', description);
        
        // Keywords
        updateMetaTag('keywords', keywords);
        
        // Open Graph
        updateMetaTag('og:title', title, 'property');
        updateMetaTag('og:description', description, 'property');
        updateMetaTag('og:image', image, 'property');
        updateMetaTag('og:url', url || window.location.href, 'property');
        updateMetaTag('og:type', type, 'property');
        updateMetaTag('og:site_name', 'BiKitchen Food', 'property');
        
        // Twitter Card
        updateMetaTag('twitter:card', 'summary_large_image');
        updateMetaTag('twitter:title', title);
        updateMetaTag('twitter:description', description);
        updateMetaTag('twitter:image', image);
        
        // Canonical URL
        updateCanonical(url || window.location.href);
        
    }, [title, description, keywords, image, url, type]);

    return null;
}

function updateMetaTag(name, content, attribute = 'name') {
    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    
    if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
}

function updateCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');
    
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }
    
    link.setAttribute('href', url);
}

// Configuraciones SEO predefinidas para cada página
export const SEO_CONFIG = {
    home: {
        title: 'BiKitchen Food - Ingredientes Frescos, Sabor de Casa',
        description: 'Comida saludable preparada con ingredientes frescos y locales. Packs semanales y platos individuales. Delivery en Costa Rica.',
        keywords: 'comida saludable, meal prep, Costa Rica, packs semanales, comida casera, delivery comida'
    },
    packs: {
        title: 'Planes Semanales - Packs de Comida Saludable',
        description: 'Elige tu pack semanal de 5, 10 o 15 comidas. Ahorra tiempo y come saludable toda la semana con BiKitchen.',
        keywords: 'packs semanales, meal prep, comida semanal, ahorro comida, planes alimenticios'
    },
    individuales: {
        title: 'Platos Individuales - Menú del Día',
        description: 'Descubre nuestros platos individuales preparados diariamente. Opciones saludables y deliciosas para cada día.',
        keywords: 'platos individuales, comida del día, almuerzo saludable, comida casera'
    },
    
    promociones: {
        title: 'Promociones y Ofertas Especiales',
        description: 'Aprovecha nuestras promociones exclusivas. Descuentos en packs, combos especiales y más.',
        keywords: 'promociones, ofertas, descuentos, cupones, ahorro'
    },
    comoFunciona: {
        title: 'Cómo Funciona BiKitchen',
        description: 'Descubre cómo funciona nuestro servicio de comida saludable. Elige, pedí y recibí en tu puerta.',
        keywords: 'cómo funciona, proceso pedido, delivery, servicio comida'
    },
    nosotros: {
        title: 'Sobre Nosotros - Nuestra Historia',
        description: 'Conoce la historia de BiKitchen. Nuestra pasión por la comida saludable y el compromiso con la calidad.',
        keywords: 'sobre nosotros, historia, equipo, misión, valores'
    },
    faq: {
        title: 'Preguntas Frecuentes',
        description: 'Encuentra respuestas a las preguntas más comunes sobre nuestro servicio, entregas y productos.',
        keywords: 'preguntas frecuentes, FAQ, ayuda, soporte, dudas'
    },
    miCuenta: {
        title: 'Mi Cuenta',
        description: 'Gestiona tu cuenta, pedidos, direcciones y preferencias en BiKitchen.',
        keywords: 'mi cuenta, perfil, pedidos, configuración'
    },
    checkout: {
        title: 'Finalizar Pedido',
        description: 'Completa tu pedido de comida saludable. Entrega rápida y segura.',
        keywords: 'checkout, finalizar pedido, pago, entrega'
    },
    fidelidad: {
        title: 'Programa de Fidelidad - Gana Puntos',
        description: 'Acumula puntos con cada compra y canjéalos por descuentos exclusivos.',
        keywords: 'programa fidelidad, puntos, recompensas, descuentos'
    },
    referidos: {
        title: 'Programa de Referidos - Invita y Gana',
        description: 'Invita a tus amigos y ambos ganan descuentos. Comparte el sabor de BiKitchen.',
        keywords: 'referidos, invitar amigos, descuentos, compartir'
    },
    giftCards: {
        title: 'Gift Cards - Regala Sabor',
        description: 'Regala una experiencia culinaria. Gift cards de BiKitchen para cualquier ocasión.',
        keywords: 'gift cards, tarjetas regalo, regalar, ocasiones especiales'
    },
    calculadora: {
        title: 'Calculadora de Ahorro',
        description: 'Calcula cuánto puedes ahorrar con nuestros packs semanales vs cocinar en casa.',
        keywords: 'calculadora ahorro, comparar precios, ahorro semanal'
    },
    comparador: {
        title: 'Comparador de Packs',
        description: 'Compara nuestros diferentes packs y encuentra el ideal para ti.',
        keywords: 'comparador packs, elegir pack, comparar planes'
    }
};
