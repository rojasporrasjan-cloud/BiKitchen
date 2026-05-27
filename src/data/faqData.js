import { 
    ShoppingBag, Truck, CreditCard, UtensilsCrossed, 
    HelpCircle, Sparkles, Target, Star, Gift, Info 
} from 'lucide-react';

export const FAQ_DATA = [
    {
        category: 'Cómo Comprar',
        icon: ShoppingBag,
        color: 'orange',
        questions: [
            {
                q: '¿Cuáles son los pasos para pedir?',
                a: '1. Elegí tu pack o platos en la web. 2. Nosotros cocinamos fresco el día anterior. 3. Te entregamos en tu puerta los Lunes, Miércoles o Sábados. 4. ¡Calentás 3-4 minutos y disfrutás!'
            },
            {
                q: '¿Cuándo cierran los pedidos?',
                a: 'Para entregas los Lunes: Cerrar Viernes 10pm. Para Miércoles: Cerrar Lunes 10pm. Para Sábados: Cerrar Jueves 10pm.'
            },
            {
                q: '¿Cómo pago mi pedido?',
                a: 'Aceptamos SINPE Móvil, transferencia bancaria y tarjetas de crédito/débito directamente en la web.'
            }
        ]
    },
    {
        category: 'BiPuntos (Fidelidad)',
        icon: Star,
        color: 'amber',
        questions: [
            {
                q: '¿Qué son los BiPuntos?',
                a: 'Es nuestro programa de lealtad. Ganás puntos con cada compra y completando misiones (como seguirnos en redes o dejar una reseña) para canjear por premios.'
            },
            {
                q: '¿Qué premios puedo canjear?',
                a: 'Podés canjear desde Envíos Gratis (300 pts), Postres (400 pts), hasta Platos Individuales (1200 pts) o descuentos de ₡10,000 (2500 pts).'
            },
            {
                q: '¿Cómo subo de nivel?',
                a: 'Empezás en Bronce. Conforme acumulás puntos totales (históricos), subís de nivel y desbloqueás multiplicadores para ganar puntos más rápido.'
            }
        ]
    },
    {
        category: 'Entregas y Zonas',
        icon: Truck,
        color: 'blue',
        questions: [
            {
                q: '¿En qué zonas entregan?',
                a: 'Cubrimos la mayor parte del GAM y Alajuela. Si tenés dudas de tu zona específica, escribinos por WhatsApp.'
            },
            {
                q: '¿Cuánto cuesta el envío?',
                a: 'El costo varía por zona. ¡Tip: Los planes mensuales tienen un 50% de descuento en todos los envíos!'
            }
        ]
    },
    {
        category: 'Nuestras Secciones',
        icon: Info,
        color: 'purple',
        questions: [
            {
                q: '¿Qué encuentro en el Menú?',
                a: 'En la sección "Menú" podés ver todos los platos individuales disponibles esta semana, con su información nutricional.'
            },
            {
                q: '¿Qué son los Packs?',
                a: 'Son combinaciones de comidas (4, 6, 10 o más) que te ayudan a ahorrar dinero y tiempo. Hay opciones para Keto, Saludable y más.'
            },
            {
                q: '¿Para qué sirve el Comparador?',
                a: 'Te ayuda a ver las diferencias entre nuestros packs para que elijas el que mejor se adapta a tus metas y presupuesto.'
            }
        ]
    },
    {
        category: 'Comidas y Calidad',
        icon: UtensilsCrossed,
        color: 'red',
        questions: [
            {
                q: '¿Las comidas son frescas?',
                a: '¡Sí! Nunca enviamos comida congelada. Se prepara el día anterior para que te dure 3-5 días frescos en la refri.'
            },
            {
                q: '¿Tienen opciones Keto?',
                a: 'Sí, tenemos una línea especializada Keto baja en carbohidratos, además de opciones saludables tradicionales.'
            }
        ]
    }
];
