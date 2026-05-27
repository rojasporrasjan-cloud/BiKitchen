import { useEffect } from 'react';

const BASE_URL = 'https://bikitchencr.com';

/**
 * SEOHead Component
 * Maneja meta tags y structured data (JSON-LD) dinámicos para cada página.
 * Usar dentro de cada página pública para SEO correcto.
 */
export default function SEOHead({
    title = 'BiKitchen Food',
    description = 'Comida saludable preparada con ingredientes frescos. Packs semanales y platos individuales con delivery en Costa Rica.',
    keywords = 'comida saludable, meal prep, Costa Rica, packs semanales, delivery comida',
    image = `${BASE_URL}/assets/logo.png`,
    url = '',
    type = 'website',
    structuredData = null
}) {
    const fullTitle = title.includes('BiKitchen') ? title : `${title} | BiKitchen Food`;
    const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : BASE_URL);
    const absoluteImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

    useEffect(() => {
        // ── Title ──
        document.title = fullTitle;

        // ── Meta tags ──
        setMeta('description', description);
        setMeta('keywords', keywords);

        // ── Open Graph ──
        setMeta('og:title', fullTitle, 'property');
        setMeta('og:description', description, 'property');
        setMeta('og:image', absoluteImage, 'property');
        setMeta('og:url', canonicalUrl, 'property');
        setMeta('og:type', type, 'property');
        setMeta('og:site_name', 'BiKitchen Food', 'property');
        setMeta('og:locale', 'es_CR', 'property');

        // ── Twitter Card ──
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', fullTitle);
        setMeta('twitter:description', description);
        setMeta('twitter:image', absoluteImage);

        // ── Canonical URL ──
        setCanonical(canonicalUrl);

        // ── JSON-LD Structured Data ──
        const existingScript = document.getElementById('bk-json-ld');
        if (structuredData) {
            const json = JSON.stringify(structuredData);
            if (existingScript) {
                existingScript.textContent = json;
            } else {
                const script = document.createElement('script');
                script.id = 'bk-json-ld';
                script.type = 'application/ld+json';
                script.textContent = json;
                document.head.appendChild(script);
            }
        } else if (existingScript) {
            // Remove stale JSON-LD from a previous page
            existingScript.remove();
        }

        return () => {
            // Clean up JSON-LD on unmount so it doesn't bleed into the next page
            const s = document.getElementById('bk-json-ld');
            if (s) s.remove();
        };
    }, [fullTitle, description, keywords, absoluteImage, canonicalUrl, type, structuredData]);

    return null;
}

// ── Helpers ──────────────────────────────────────────────────

function setMeta(name, content, attribute = 'name') {
    let el = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attribute, name);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}

function setCanonical(href) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
    }
    link.setAttribute('href', href);
}

// ── Per-page SEO configs ──────────────────────────────────────

export const SEO_CONFIG = {
    home: {
        title: 'BiKitchen Food | Comida Saludable a Domicilio en Costa Rica',
        description: 'Comida saludable lista para calentar. Packs semanales de 5, 10 o 15 comidas con delivery en Costa Rica. Keto, vegetariano, bajo calorías y más.',
        keywords: 'comida saludable Costa Rica, meal prep, packs semanales, delivery comida saludable, almuerzo saludable, BiKitchen',
        url: 'https://bikitchencr.com/'
    },
    packs: {
        title: 'Planes Semanales | Packs de Comida Saludable — BiKitchen',
        description: 'Elige tu pack semanal: 5, 10 o 15 comidas saludables listas para calentar. Opciones Full Pack, Keto, Bajo Calorías, Sin Carbos y Vegetariano. Delivery en Costa Rica.',
        keywords: 'packs semanales comida, meal prep Costa Rica, comida semanal saludable, planes alimenticios, keto Costa Rica',
        url: 'https://bikitchencr.com/packs'
    },
    individuales: {
        title: 'Platos Individuales | Menú del Día — BiKitchen',
        description: 'Platos individuales saludables listos para calentar. Almuerzos balanceados con proteína, vegetal y carbo. Pide por unidades o combos. Delivery en Costa Rica.',
        keywords: 'platos individuales saludables, almuerzo a domicilio Costa Rica, comida del día, menú saludable',
        url: 'https://bikitchencr.com/individuales'
    },
    menu: {
        title: 'Menú Semanal | Catálogo de Comidas — BiKitchen',
        description: 'Explora el menú semanal completo de BiKitchen. Conoce qué proteínas, vegetales y carbohidratos preparamos esta semana.',
        keywords: 'menú semanal, catálogo comidas, proteínas, vegetales, menú saludable Costa Rica',
        url: 'https://bikitchencr.com/menu'
    },
    promociones: {
        title: 'Promociones y Ofertas | Descuentos en Comida — BiKitchen',
        description: 'Aprovecha nuestras promociones exclusivas: descuentos en packs, combos especiales y ofertas limitadas. ¡Ordena y ahorra en comida saludable!',
        keywords: 'promociones comida saludable, ofertas meal prep, descuentos packs, combos comida Costa Rica',
        url: 'https://bikitchencr.com/promociones'
    },
    comoFunciona: {
        title: 'Cómo Funciona | Pedidos y Delivery — BiKitchen',
        description: 'Así funciona BiKitchen: elige tu plan, nosotros cocinamos con ingredientes frescos y te lo entregamos listo para calentar. Delivery en Costa Rica.',
        keywords: 'cómo funciona meal prep, delivery comida saludable, proceso pedido, entrega comida',
        url: 'https://bikitchencr.com/como-funciona'
    },
    nosotros: {
        title: 'Quiénes Somos | Nuestra Historia — BiKitchen',
        description: 'Conoce a BiKitchen: cocinamos comida saludable con ingredientes frescos y locales en Costa Rica. Nuestra misión es hacerte la vida más fácil y deliciosa.',
        keywords: 'BiKitchen Costa Rica, quiénes somos, comida saludable hecha en casa, misión',
        url: 'https://bikitchencr.com/nosotros'
    },
    faq: {
        title: 'Preguntas Frecuentes — BiKitchen',
        description: 'Respuestas a las preguntas más comunes sobre nuestros packs, delivery, pagos y personalización. ¿Tienes dudas? Aquí las resolvemos.',
        keywords: 'preguntas frecuentes BiKitchen, FAQ, dudas, cómo pedir, entrega, pagos',
        url: 'https://bikitchencr.com/faq'
    },
    miCuenta: {
        title: 'Mi Cuenta — BiKitchen',
        description: 'Gestiona tus pedidos, direcciones de entrega y preferencias en tu cuenta BiKitchen.',
        keywords: 'mi cuenta, mis pedidos, perfil BiKitchen',
        url: 'https://bikitchencr.com/mi-cuenta'
    },
    checkout: {
        title: 'Finalizar Pedido — BiKitchen',
        description: 'Completa tu pedido de comida saludable. Entrega rápida y pago seguro.',
        keywords: 'checkout, finalizar pedido, pago, entrega',
        url: 'https://bikitchencr.com/checkout'
    },
    fidelidad: {
        title: 'Programa de Fidelidad | Gana Puntos — BiKitchen',
        description: 'Acumula puntos con cada compra y canjéalos por descuentos exclusivos en BiKitchen.',
        keywords: 'programa fidelidad, puntos, recompensas, descuentos',
        url: 'https://bikitchencr.com/fidelidad'
    },
    referidos: {
        title: 'Programa de Referidos | Invita y Gana — BiKitchen',
        description: 'Invita amigos a BiKitchen y ambos ganan descuentos. Comparte el sabor saludable.',
        keywords: 'referidos, invitar amigos, descuentos, compartir',
        url: 'https://bikitchencr.com/referidos'
    },
    giftCards: {
        title: 'Gift Cards | Regala Comida Saludable — BiKitchen',
        description: 'Regala una experiencia culinaria saludable. Gift cards de BiKitchen para cualquier ocasión especial.',
        keywords: 'gift cards, tarjetas regalo, regalar, BiKitchen',
        url: 'https://bikitchencr.com/gift-cards'
    },
    calculadora: {
        title: 'Calculadora de Ahorro | ¿Cuánto Ahorrás? — BiKitchen',
        description: 'Calcula cuánto dinero y tiempo ahorrás al mes eligiendo los packs de BiKitchen vs cocinar o comprar comida por tu cuenta.',
        keywords: 'calculadora ahorro, comparar precios, ahorro semanal, meal prep vs cocinar',
        url: 'https://bikitchencr.com/calculadora'
    },
    comparador: {
        title: 'Comparador de Packs | Elige el Mejor Plan — BiKitchen',
        description: 'Compara todos los packs de BiKitchen y encuentra el ideal para tu estilo de vida y presupuesto.',
        keywords: 'comparar packs, elegir plan, diferencias packs, keto vs regular',
        url: 'https://bikitchencr.com/comparador'
    }
};

// ── JSON-LD Structured Data Templates ────────────────────────

/**
 * Schema.org FoodEstablishment para BiKitchen
 * Usar en LandingPage para Google Rich Results.
 */
export const BIKITCHEN_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: 'BiKitchen Food',
    description: 'Servicio de comida saludable preparada con ingredientes frescos. Packs semanales y platos individuales con delivery en Costa Rica.',
    url: 'https://bikitchencr.com',
    logo: 'https://bikitchencr.com/assets/logo.png',
    image: 'https://bikitchencr.com/assets/logo.png',
    telephone: '+506',
    servesCuisine: ['Saludable', 'Costarricense', 'Keto', 'Vegetariano', 'Bajo en calorías'],
    hasMenu: 'https://bikitchencr.com/packs',
    priceRange: '₡₡',
    currenciesAccepted: 'CRC',
    paymentAccepted: 'Cash, Credit Card, SINPE Móvil',
    address: {
        '@type': 'PostalAddress',
        addressCountry: 'CR',
        addressRegion: 'San José'
    },
    areaServed: {
        '@type': 'Country',
        name: 'Costa Rica'
    },
    offers: {
        '@type': 'Offer',
        description: 'Packs semanales de comida saludable',
        url: 'https://bikitchencr.com/packs',
        priceCurrency: 'CRC'
    }
};
