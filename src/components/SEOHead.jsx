import { useEffect } from 'react';
import { WHATSAPP_PHONE, WHATSAPP_PHONE_DISPLAY } from '../config/whatsappMessages';

const BASE_URL = 'https://bikitchencr.com';
const PHONE = WHATSAPP_PHONE_DISPLAY;

/**
 * SEOHead — inyecta meta tags y JSON-LD dinámicamente por página.
 * Soporta múltiples schemas pasando structuredData como array u objeto.
 */
export default function SEOHead({
    title = 'BiKitchen Food',
    description = 'Meal prep y comida saludable a domicilio en Costa Rica. Packs semanales de 5 a 15 almuerzos frescos listos para calentar con delivery al GAM.',
    keywords = 'comida saludable Costa Rica, meal prep, packs semanales, delivery almuerzo saludable, comida a domicilio San José, BiKitchen',
    image = `${BASE_URL}/assets/og-image.png`,
    url = '',
    type = 'website',
    structuredData = null,
    noindex = false
}) {
    const fullTitle = title.includes('BiKitchen') ? title : `${title} | BiKitchen`;
    const canonicalUrl = url || (typeof window !== 'undefined' ? window.location.href : BASE_URL);
    const absoluteImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;

    // Stringify structuredData to detect changes in useEffect
    const sdKey = structuredData ? JSON.stringify(structuredData) : '';

    useEffect(() => {
        // ── Title ──
        document.title = fullTitle;

        // ── Core meta ──
        setMeta('description', description);
        setMeta('keywords', keywords);
        setMeta('author', 'BiKitchen Food');
        setMeta('robots', noindex
            ? 'noindex, nofollow'
            : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

        // ── Geo meta (local SEO Costa Rica) ──
        setMeta('geo.region', 'CR-SJ');
        setMeta('geo.placename', 'San José, Costa Rica');
        setMeta('geo.position', '9.9281;-84.0907');
        setMeta('ICBM', '9.9281, -84.0907');

        // ── Open Graph ──
        setMeta('og:title', fullTitle, 'property');
        setMeta('og:description', description, 'property');
        setMeta('og:image', absoluteImage, 'property');
        setMeta('og:image:width', '1200', 'property');
        setMeta('og:image:height', '630', 'property');
        setMeta('og:image:alt', 'BiKitchen - Comida saludable a domicilio en Costa Rica', 'property');
        setMeta('og:url', canonicalUrl, 'property');
        setMeta('og:type', type, 'property');
        setMeta('og:site_name', 'BiKitchen Food', 'property');
        setMeta('og:locale', 'es_CR', 'property');

        // ── Twitter Card ──
        setMeta('twitter:card', 'summary_large_image');
        setMeta('twitter:title', fullTitle);
        setMeta('twitter:description', description);
        setMeta('twitter:image', absoluteImage);
        setMeta('twitter:image:alt', 'BiKitchen - Comida saludable a domicilio en Costa Rica');
        setMeta('twitter:site', '@bikitchencr');

        // ── Canonical URL ──
        setCanonical(canonicalUrl);

        // ── JSON-LD Structured Data ──
        // Limpia scripts previos de SEOHead
        document.querySelectorAll('script[data-bk-ld]').forEach(s => s.remove());

        const schemas = structuredData
            ? (Array.isArray(structuredData) ? structuredData : [structuredData])
            : [];

        schemas.forEach((schema, i) => {
            const script = document.createElement('script');
            script.setAttribute('data-bk-ld', String(i));
            script.type = 'application/ld+json';
            script.textContent = JSON.stringify(schema);
            document.head.appendChild(script);
        });

        return () => {
            document.querySelectorAll('script[data-bk-ld]').forEach(s => s.remove());
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fullTitle, description, keywords, absoluteImage, canonicalUrl, type, sdKey, noindex]);

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

// ── Configuraciones SEO por página ──────────────────────────

export const SEO_CONFIG = {
    home: {
        title: 'BiKitchen | Comida Saludable a Domicilio en Costa Rica',
        description: 'Meal prep y comida saludable a domicilio en Costa Rica. Packs de 5 a 15 almuerzos frescos listos para calentar. Keto, Sin Carbos, Vegetariano, Familiar y más. Delivery al GAM.',
        keywords: 'comida saludable Costa Rica, meal prep Costa Rica, packs semanales comida, delivery almuerzo saludable, comida a domicilio San José, comida keto Costa Rica, almuerzo semanal entrega, BiKitchen',
        url: `${BASE_URL}/`
    },
    packs: {
        title: 'Planes Semanales de Comida Saludable | BiKitchen Costa Rica',
        description: 'Planes semanales de comida saludable en Costa Rica. Keto, Sin Carbos, Vegetariano, Familiar, Full Pack y más. 5 a 15 almuerzos frescos con delivery al GAM. ¡Ordená hoy!',
        keywords: 'packs semanales comida Costa Rica, planes alimenticios saludables, meal prep San José, keto delivery Costa Rica, pack sin carbos, almuerzo semanal saludable, comida lista para calentar, plan bajo calorías',
        url: `${BASE_URL}/packs`
    },
    individuales: {
        title: 'Platos Individuales Saludables a Domicilio | BiKitchen CR',
        description: 'Platos individuales saludables listos para calentar. Almuerzos balanceados con proteína, vegetal y carbo. Pedí por unidades o combos. Delivery en Costa Rica al GAM.',
        keywords: 'platos individuales saludables Costa Rica, almuerzo a domicilio, comida del día saludable, menú saludable entrega, proteína vegetal carbo, plato balanceado delivery',
        url: `${BASE_URL}/individuales`
    },
    menu: {
        title: 'Menú Semanal de Comida Saludable | BiKitchen Costa Rica',
        description: 'Explorá el menú semanal completo de BiKitchen. Proteínas, vegetales y carbohidratos frescos de esta semana. Pedí tu almuerzo saludable con delivery en Costa Rica.',
        keywords: 'menú semanal saludable Costa Rica, menú del día, platos balanceados semana, catálogo comidas saludables, proteínas semanales delivery',
        url: `${BASE_URL}/menu`
    },
    promociones: {
        title: 'Promociones y Ofertas en Comida Saludable | BiKitchen CR',
        description: 'Aprovechá nuestras promociones en packs de comida saludable. Descuentos en planes mensuales, combos especiales y ofertas limitadas. ¡Ahorrá en tu alimentación saludable!',
        keywords: 'promociones comida saludable Costa Rica, ofertas meal prep, descuentos packs semanales, combos comida sana, ofertas delivery almuerzo San José',
        url: `${BASE_URL}/promociones`
    },
    comoFunciona: {
        title: 'Cómo Funciona el Delivery de Comida | BiKitchen Costa Rica',
        description: 'Así funciona BiKitchen: elegís tu plan, cocinamos fresco con ingredientes de calidad y te entregamos listo para calentar. Delivery lunes, miércoles y sábados al GAM.',
        keywords: 'cómo funciona meal prep Costa Rica, delivery comida saludable proceso, pedido comida online Costa Rica, entrega comida semanal, lunes miércoles sábados delivery',
        url: `${BASE_URL}/como-funciona`
    },
    nosotros: {
        title: 'Quiénes Somos | BiKitchen Comida Saludable Costa Rica',
        description: 'Conocé a BiKitchen: cocinamos comida saludable con ingredientes frescos y locales en Costa Rica. Nuestra misión es hacerte la vida más fácil con alimentación sana y deliciosa.',
        keywords: 'BiKitchen Costa Rica, quiénes somos, historia BiKitchen, comida saludable hecha en casa, misión BiKitchen, meal prep costarricense',
        url: `${BASE_URL}/nosotros`
    },
    faq: {
        title: 'Preguntas Frecuentes sobre Delivery de Comida | BiKitchen',
        description: '¿Tenés dudas sobre BiKitchen? Respondemos tus preguntas sobre pedidos, delivery, pagos, zonas de entrega, packs y personalización. Todo lo que necesitás saber.',
        keywords: 'preguntas frecuentes BiKitchen, FAQ delivery comida Costa Rica, dudas meal prep, cómo pedir, zonas entrega GAM, pagos SINPE móvil, comida fresca a domicilio',
        url: `${BASE_URL}/faq`
    },
    miCuenta: {
        title: 'Mi Cuenta — BiKitchen',
        description: 'Gestioná tus pedidos, direcciones de entrega y preferencias en tu cuenta BiKitchen.',
        keywords: 'mi cuenta BiKitchen, mis pedidos, perfil usuario',
        url: `${BASE_URL}/mi-cuenta`
    },
    checkout: {
        title: 'Finalizar Pedido — BiKitchen',
        description: 'Completá tu pedido de comida saludable. Entrega rápida y pago seguro con tarjeta o SINPE Móvil.',
        keywords: 'checkout, finalizar pedido, pago seguro, SINPE móvil, tarjeta crédito',
        url: `${BASE_URL}/checkout`
    },
    fidelidad: {
        title: 'BiPuntos | Programa de Fidelidad | BiKitchen Costa Rica',
        description: 'Acumulá BiPuntos con cada compra y canjealos por premios: envíos gratis, postres, platos individuales y descuentos hasta ₡10,000. ¡Premios desde 300 puntos!',
        keywords: 'programa fidelidad comida Costa Rica, puntos BiKitchen, BiPuntos, recompensas comida saludable, canjear puntos, envío gratis',
        url: `${BASE_URL}/fidelidad`
    },
    referidos: {
        title: 'Referidos | Invitá y Ganá Descuentos | BiKitchen CR',
        description: 'Invitá amigos a BiKitchen y ambos ganan descuentos en comida saludable. Compartí el sabor y ganá crédito en tu próxima compra.',
        keywords: 'referidos BiKitchen, invitar amigos Costa Rica, descuentos comida saludable, ganar créditos, programa referidos',
        url: `${BASE_URL}/referidos`
    },
    giftCards: {
        title: 'Gift Cards de Comida Saludable | BiKitchen Costa Rica',
        description: 'Regalá una experiencia de comida saludable. Gift cards de BiKitchen para cumpleaños, aniversarios y cualquier ocasión especial en Costa Rica. ¡El regalo perfecto!',
        keywords: 'gift cards comida saludable Costa Rica, tarjetas regalo, regalar comida sana, presente saludable, BiKitchen gift card, regalo original Costa Rica',
        url: `${BASE_URL}/gift-cards`
    },
    calculadora: {
        title: 'Calculadora de Ahorro en Comida | BiKitchen Costa Rica',
        description: 'Calculá cuánto dinero y tiempo ahorrás eligiendo BiKitchen vs cocinar o pedir comida. ¡Los resultados te van a sorprender! Meal prep inteligente en Costa Rica.',
        keywords: 'calculadora ahorro comida Costa Rica, cuánto cuesta meal prep, ahorro vs cocinar, presupuesto comida saludable, cuánto ahorro BiKitchen',
        url: `${BASE_URL}/calculadora`
    },
    comparador: {
        title: 'Comparador de Planes de Comida | BiKitchen Costa Rica',
        description: 'Comparás todos los planes de BiKitchen y encontrás el ideal para tu estilo de vida y presupuesto. Keto, Regular, Full Pack, Familiar, Sin Carbos y más.',
        keywords: 'comparar packs comida Costa Rica, elegir plan meal prep, diferencias packs BiKitchen, keto vs regular vs full pack, mejor plan alimenticio',
        url: `${BASE_URL}/comparador`
    }
};

// ── JSON-LD Schema Templates ──────────────────────────────────

/**
 * Schemas completos para la home page.
 * Incluye: WebSite (SearchAction) + LocalBusiness/FoodEstablishment.
 */
export const getHomeSchemas = () => [
    // 1. WebSite con SearchAction — Google puede mostrar buscador en el SERP
    {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${BASE_URL}/#website`,
        name: 'BiKitchen Food',
        alternateName: 'BiKitchen CR',
        url: BASE_URL,
        description: 'Meal prep y comida saludable a domicilio en Costa Rica',
        inLanguage: 'es-CR',
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${BASE_URL}/menu?q={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        }
    },
    // 2. LocalBusiness + FoodEstablishment — crucial para SEO local
    {
        '@context': 'https://schema.org',
        '@type': ['FoodEstablishment', 'LocalBusiness'],
        '@id': `${BASE_URL}/#business`,
        name: 'BiKitchen Food',
        legalName: 'BiKitchen Food',
        url: BASE_URL,
        logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/assets/logo.png`,
            width: 640,
            height: 412
        },
        image: `${BASE_URL}/assets/og-image.png`,
        description: 'Servicio de meal prep y comida saludable a domicilio en Costa Rica. Packs semanales de 5 a 15 almuerzos frescos listos para calentar. Opciones Keto, Sin Carbos, Vegetariano, Bajo Calorías y Familiar con delivery al GAM.',
        telephone: PHONE,
        address: {
            '@type': 'PostalAddress',
            addressCountry: 'CR',
            addressRegion: 'San José',
            addressLocality: 'San José'
        },
        geo: {
            '@type': 'GeoCoordinates',
            latitude: 9.9281,
            longitude: -84.0907
        },
        areaServed: [
            { '@type': 'City', name: 'San José' },
            { '@type': 'City', name: 'Escazú' },
            { '@type': 'City', name: 'Santa Ana' },
            { '@type': 'City', name: 'Heredia' },
            { '@type': 'City', name: 'Alajuela' },
            { '@type': 'City', name: 'Cartago' },
            { '@type': 'City', name: 'Curridabat' },
            { '@type': 'City', name: 'La Unión' },
            { '@type': 'City', name: 'Desamparados' },
            { '@type': 'AdministrativeArea', name: 'Gran Área Metropolitana de Costa Rica' }
        ],
        servesCuisine: [
            'Comida Saludable',
            'Meal Prep',
            'Keto',
            'Vegetariana',
            'Baja en Calorías',
            'Sin Carbohidratos',
            'Costarricense'
        ],
        hasMenu: `${BASE_URL}/packs`,
        menu: `${BASE_URL}/packs`,
        priceRange: '₡₡',
        currenciesAccepted: 'CRC',
        paymentAccepted: 'Cash, Credit Card, SINPE Móvil, Transferencia Bancaria',
        openingHoursSpecification: [
            {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: 'Monday',
                description: 'Día de entrega — pedidos cierran el viernes anterior a las 10pm'
            },
            {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: 'Wednesday',
                description: 'Día de entrega — pedidos cierran el lunes anterior a las 10pm'
            },
            {
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: 'Saturday',
                description: 'Día de entrega — pedidos cierran el jueves anterior a las 10pm'
            }
        ],
        sameAs: [
            'https://www.instagram.com/bikitchencr',
            'https://www.facebook.com/bikitchencr',
            `https://wa.me/${WHATSAPP_PHONE}`
        ],
        knowsAbout: [
            'Meal Prep', 'Comida Saludable', 'Dieta Keto', 'Alimentación Vegetariana',
            'Bajo en Calorías', 'Delivery de Comida', 'Costa Rica'
        ]
    }
];

/**
 * Schema ItemList para la página de Planes/Packs.
 */
export const getPacksSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Planes Semanales de Comida Saludable — BiKitchen Costa Rica',
    description: 'Packs de comida saludable semanal con delivery en el GAM de Costa Rica. Opciones keto, vegetariano, sin carbos, bajo calorías, familiar y más.',
    url: `${BASE_URL}/packs`,
    numberOfItems: 10,
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Pack Regular — Almuerzo Semanal Saludable', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 2, name: 'Full Pack — Pack Completo 5 Almuerzos Premium', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 3, name: 'Pack Keto — Plan Ketogénico Semanal', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 4, name: 'Pack Sin Carbos — Bajo en Carbohidratos', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 5, name: 'Pack Bajo Calorías — Ideal para Dieta', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 6, name: 'Pack Vegetariano — Sin Carne Semanal', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 7, name: 'Pack Familiar Premium — 4 Porciones por Plato', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 8, name: 'Pack Casaditos — Casado Costarricense Semanal', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 9, name: 'Two Pack — 10 Almuerzos para Dos Personas', url: `${BASE_URL}/packs` },
        { '@type': 'ListItem', position: 10, name: 'Pack de Desayunos — Desayunos Saludables Semanales', url: `${BASE_URL}/packs` }
    ]
});

/**
 * Schema FAQPage — genera JSON-LD para la página de preguntas frecuentes.
 * Google puede mostrar las respuestas directamente en el SERP (rich results).
 */
export const getFAQSchema = () => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: '¿Cómo funciona el servicio de comida de BiKitchen?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Es muy sencillo: 1) Elegís tu pack o platos en bikitchencr.com. 2) Nosotros cocinamos fresco con ingredientes de calidad el día anterior a la entrega. 3) Te entregamos en tu puerta los Lunes, Miércoles o Sábados en el GAM. 4) Calentás 3-4 minutos y disfrutás!'
            }
        },
        {
            '@type': 'Question',
            name: '¿Cuándo cierran los pedidos de BiKitchen?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Para entregas los Lunes: pedidos cerrados el Viernes anterior a las 10pm. Para entregas los Miércoles: pedidos cerrados el Lunes a las 10pm. Para entregas los Sábados: pedidos cerrados el Jueves a las 10pm.'
            }
        },
        {
            '@type': 'Question',
            name: '¿Cómo puedo pagar mi pedido en BiKitchen?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Aceptamos SINPE Móvil, transferencia bancaria y tarjetas de crédito/débito (Visa y Mastercard) directamente en la web con pago 100% seguro.'
            }
        },
        {
            '@type': 'Question',
            name: '¿En qué zonas de Costa Rica hace delivery BiKitchen?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Cubrimos la mayor parte del Gran Área Metropolitana (GAM) y Alajuela: San José, Escazú, Santa Ana, Heredia, Cartago, Curridabat, Desamparados, La Unión y zonas aledañas. Si tenés dudas de tu zona, escribinos por WhatsApp al ' + PHONE + '.'
            }
        },
        {
            '@type': 'Question',
            name: '¿Cuánto cuesta el envío de BiKitchen?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'El costo de envío varía según la zona de entrega. Los planes mensuales tienen un 50% de descuento en todos los envíos, lo que los hace muy convenientes.'
            }
        },
        {
            '@type': 'Question',
            name: '¿La comida de BiKitchen es fresca o congelada?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'BiKitchen NUNCA envía comida congelada. Toda la comida se prepara fresca el día anterior a la entrega. Se conserva perfectamente 3-5 días en el refrigerador y se calienta en 3-4 minutos en microondas o sartén.'
            }
        },
        {
            '@type': 'Question',
            name: '¿Tienen opciones Keto o sin carbohidratos en BiKitchen?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Sí. Contamos con el Pack Keto (bajo en carbohidratos, alto en proteína y grasas saludables) y el Pack Sin Carbos. Ambos se preparan semanalmente con proteínas y vegetales frescos sin harinas ni carbohidratos de alto índice glucémico.'
            }
        },
        {
            '@type': 'Question',
            name: '¿Tienen pack vegetariano disponible?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Sí. El Pack Vegetariano incluye 5 almuerzos semanales sin carne, preparados con proteínas vegetales, legumbres, vegetales frescos y carbohidratos balanceados. Ideal para vegetarianos y personas que reducen su consumo de carne.'
            }
        },
        {
            '@type': 'Question',
            name: '¿Qué son los BiPuntos y cómo funcionan?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'BiPuntos es el programa de fidelidad de BiKitchen. Ganás puntos con cada compra y completando misiones (seguirnos en redes, dejar reseñas, etc.) para canjear por premios: envíos gratis (300 pts), postres (400 pts), platos individuales (1200 pts) o descuentos de ₡10,000 (2500 pts).'
            }
        },
        {
            '@type': 'Question',
            name: '¿Puedo personalizar mi pack o sustituir ingredientes en BiKitchen?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Sí. BiKitchen ofrece opciones de sustitución de proteínas, vegetales y carbohidratos en la mayoría de sus packs, según disponibilidad semanal. Podés indicar tus preferencias al momento de ordenar directamente en la web.'
            }
        }
    ]
});

/**
 * Schema BreadcrumbList — jerarquía de página para Google.
 * @param {Array} items - [{name, url}]
 */
export const getBreadcrumbSchema = (items) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
        ...items.map((item, i) => ({
            '@type': 'ListItem',
            position: i + 2,
            name: item.name,
            item: item.url
        }))
    ]
});

// Retrocompatibilidad — LandingPage usa BIKITCHEN_SCHEMA directamente
export const BIKITCHEN_SCHEMA = getHomeSchemas()[1];
