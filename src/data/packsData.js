// Imágenes por defecto para cada pack (usadas cuando no hay imagen personalizada en Firebase)
export const DEFAULT_PACK_IMAGES = {
    'Pack Sin Carbos': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop&q=80',
    'Pack Bajo Calorías': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop&q=80',
    'Pack Regular': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop&q=80',
    'Pack Keto': 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop&q=80',
    'Pack Casaditos': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop&q=80',
    'Full Pack': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400&h=300&fit=crop&q=80',
    'Pack 3 Proteínas': 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400&h=300&fit=crop&q=80',
    'Pack 5 Proteínas': 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400&h=300&fit=crop&q=80',
    'Pack Familiar Premium': 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?w=400&h=300&fit=crop&q=80',
    'Pack Familiar Deluxe': 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?w=400&h=300&fit=crop&q=80',
};

export const PACK_TO_MENU_KEY = {
    'Full Pack': 'fullPack',
    'Pack Keto': 'keto',
    'Pack Bajo Calorías': 'bajoCalorias',
    'Pack Regular': 'regular',
    'Pack Sin Carbos': 'sinCarbos',
    'Pack Vegetariano': 'vegetariano',
    'Pack Casaditos': 'casaditos'
};

export const PACKS_DATA = {
    // ORDEN: Two Pack primero (25% OFF mensual), luego Familiar, después por número de comidas
    'two_pack': {
        title: 'Two Pack',
        subtitle: 'Dos personas - 5 comidas cada una • 25% OFF Pack Mensual',
        icon: '👥',
        monthlyDiscount: 25,
        shipping: {
            weekly: '🚚 Envío no incluido (según tu zona)',
            biweekly: '🚚 2 envíos semanales (se cobra el envío de tu zona × 2)',
            monthly: '🚚 4 envíos semanales (envío de tu zona × 4) • 10% dto.'
        },
        packs: [
            { name: 'Pack Sin Carbos', desc: '120g proteína + 3 vegetales', icon: '🥩', weekly: 49000, biweekly: 91000, monthly: 147000, monthlyOriginal: 196000 },
            { name: 'Pack Bajo Calorías', desc: '120g proteína + 2 vegetales + 1 carbo', icon: '🥗', weekly: 51700, biweekly: 93000, monthly: 155100, monthlyOriginal: 206800 },
            { name: 'Pack Regular', desc: '100g proteína + 1 vegetal + 2 carbos', icon: '🍱', weekly: 55700, biweekly: 100260, monthly: 167100, monthlyOriginal: 222800 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional costarricense', icon: '🍚', weekly: 55700, biweekly: 100260, monthly: 167100, monthlyOriginal: 222800 },
            { name: 'Full Pack', desc: '150g proteína + 3 carbos + 2 vegetales', icon: '🍽️', weekly: 67800, biweekly: 126000, monthly: 203400, monthlyOriginal: 271200 },
            { name: 'Pack Vegetariano', desc: 'Proteína vegetal + 2 vegetales + 2 carbos', icon: '🥦', weekly: 55700, biweekly: 100260, monthly: 167100, monthlyOriginal: 222800 },
            { name: 'Pack Keto', desc: '200g proteína + 3 vegetales', icon: '🥑', weekly: 67800, biweekly: 126000, monthly: 203400, monthlyOriginal: 271200, featured: true }
        ]
    },
    'familiar': {
        title: 'Pack Familiar',
        subtitle: 'Menús que varían cada semana',
        icon: '👨‍👩‍👧‍👦',
        shipping: {
            weekly: '🚚 Envío según zona',
            biweekly: '🚚 2 envíos semanales (se cobra el envío de tu zona × 2)',
            monthly: '🚚 4 envíos semanales (envío de tu zona × 4) • 50% dto. (Cartago no incluido)'
        },
        packs: [
            { name: 'Pack Familiar Premium', desc: 'Porciones grandes (4 porc. c/u)', icon: '👨‍👩‍👧‍👦', weekly: 41500, biweekly: 77200, monthly: 149400, featured: true },
            { name: 'Pack Familiar Deluxe', desc: 'Porciones completas (4 porc. c/u)', icon: '✨', weekly: 47500, biweekly: 88500, monthly: 171000, featured: true }
        ]
    },
    '5_comidas': {
        title: '5 Comidas a la Semana',
        subtitle: 'Lunes a Viernes - Perfecto para empezar',
        icon: '🥗',
        shipping: {
            weekly: '🚚 Envío no incluido (según tu zona)',
            biweekly: '🚚 2 envíos semanales (se cobra el envío de tu zona × 2)',
            monthly: '🚚 4 envíos semanales (envío de tu zona × 4) • 50% dto.'
        },
        packs: [
            { name: 'Pack Sin Carbos', desc: '120g proteína + 3 vegetales', icon: '🥩', weekly: 24500, biweekly: 45600, monthly: 78400, monthlyOriginal: 98000 },
            { name: 'Pack Bajo Calorías', desc: '120g proteína + 2 vegetales + 1 carbo', icon: '🥗', weekly: 25850, biweekly: 49000, monthly: 82720, monthlyOriginal: 103400 },
            { name: 'Pack Regular', desc: '100g proteína + 1 vegetal + 2 carbos', icon: '🍱', weekly: 27850, biweekly: 52000, monthly: 89120, monthlyOriginal: 111400 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional costarricense', icon: '🍚', weekly: 27850, biweekly: 52000, monthly: 89120, monthlyOriginal: 111400 },
            { name: 'Full Pack', desc: '150g proteína + 3 carbos + 2 vegetales', icon: '🍽️', weekly: 33900, biweekly: 64000, monthly: 108480, monthlyOriginal: 135600 },
            { name: 'Pack Vegetariano', desc: 'Proteína vegetal + 2 vegetales + 2 carbos', icon: '🥦', weekly: 27850, biweekly: 52000, monthly: 89120, monthlyOriginal: 111400 },
            { name: 'Pack Keto', desc: '200g proteína + 3 vegetales', icon: '🥑', weekly: 33900, biweekly: 64000, monthly: 108480, monthlyOriginal: 135600 }
        ]
    },
    '10_comidas': {
        title: '10 Comidas a la Semana',
        subtitle: 'Lunes a Viernes - Almuerzo y Cena',
        icon: '🍗',
        shipping: {
            weekly: '🚚 Envío no incluido (según tu zona)',
            biweekly: '🚚 2 envíos semanales (se cobra el envío de tu zona × 2)',
            monthly: '🚚 4 envíos semanales (envío de tu zona × 4) • 50% dto.'
        },
        packs: [
            { name: 'Pack Sin Carbos', desc: '120g proteína + 3 vegetales', icon: '🥩', weekly: 49000, biweekly: 91000, monthly: 156800, monthlyOriginal: 196000 },
            { name: 'Pack Bajo Calorías', desc: '120g proteína + 2 vegetales + 1 carbo', icon: '🥗', weekly: 51700, biweekly: 93000, monthly: 165440, monthlyOriginal: 206800 },
            { name: 'Pack Regular', desc: '100g proteína + 1 vegetal + 2 carbos', icon: '🍱', weekly: 55700, biweekly: 100260, monthly: 178240, monthlyOriginal: 222800 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional costarricense', icon: '🍚', weekly: 55700, biweekly: 100260, monthly: 178240, monthlyOriginal: 222800 },
            { name: 'Full Pack', desc: '150g proteína + 3 carbos + 2 vegetales', icon: '🍽️', weekly: 67800, biweekly: 126000, monthly: 216960, monthlyOriginal: 271200 },
            { name: 'Pack Vegetariano', desc: 'Proteína vegetal + 2 vegetales + 2 carbos', icon: '🥦', weekly: 55700, biweekly: 100260, monthly: 178240, monthlyOriginal: 222800 },
            { name: 'Pack Keto', desc: '200g proteína + 3 vegetales', icon: '🥑', weekly: 67800, biweekly: 126000, monthly: 216960, monthlyOriginal: 271200 }
        ]
    },
    'desayuno_almuerzo_cena': {
        title: 'Desayuno, Almuerzo y Cena',
        subtitle: '15 Comidas - Plan Completo',
        icon: '🌅',
        shipping: {
            weekly: '🚚 Envío no incluido (según tu zona)',
            biweekly: '🚚 2 envíos semanales (se cobra el envío de tu zona × 2)',
            monthly: '🚚 4 envíos semanales • ¡GRATIS! (aplican restricciones de zona)'
        },
        packs: [
            { name: 'Pack Sin Carbos', desc: '120g proteína + 3 vegetales', icon: '🥩', weekly: 61500, biweekly: 114500, monthly: 196800, monthlyOriginal: 246000 },
            { name: 'Pack Bajo Calorías', desc: '120g proteína + 2 vegetales + 1 carbo', icon: '🥗', weekly: 65200, biweekly: 121200, monthly: 208640, monthlyOriginal: 260800 },
            { name: 'Pack Regular', desc: '100g proteína + 1 vegetal + 2 carbos', icon: '🍱', weekly: 69700, biweekly: 128700, monthly: 223040, monthlyOriginal: 278800 },
            { name: 'Pack Casaditos', desc: 'Estilo tradicional costarricense', icon: '🍚', weekly: 69200, biweekly: 128700, monthly: 221440, monthlyOriginal: 276800 },
            { name: 'Full Pack', desc: '150g proteína + 3 carbos + 2 vegetales', icon: '🍽️', weekly: 81300, biweekly: 151300, monthly: 260160, monthlyOriginal: 325200 },
            { name: 'Pack Vegetariano', desc: 'Proteína vegetal + 2 vegetales + 2 carbos', icon: '🥦', weekly: 69200, biweekly: 128700, monthly: 221440, monthlyOriginal: 276800 },
            { name: 'Pack Keto', desc: '200g proteína + 3 vegetales', icon: '🥑', weekly: 78000, biweekly: 151300, monthly: 249600, monthlyOriginal: 312000 }
        ]
    },
    'proteinas': {
        title: 'Pack de Proteínas',
        subtitle: 'Menús que varían cada semana',
        icon: '🥩',
        shipping: {
            weekly: '🚚 Envío según zona',
            biweekly: '🚚 2 envíos semanales (se cobra el envío de tu zona × 2)',
            monthly: '🚚 4 envíos semanales (envío de tu zona × 4) • 50% dto. (Cartago no incluido)'
        },
        packs: [
            {
                name: 'Pack 3 Proteínas',
                desc: '3 proteínas a elegir (250g o 500g)',
                icon: '🍗',
                weekly: 13500, biweekly: 25100, monthly: 48600,
                weekly_500: 25850, biweekly_500: 48100, monthly_500: 93000
            },
            {
                name: 'Pack 5 Proteínas',
                desc: '5 proteínas a elegir (250g o 500g)',
                icon: '🥩',
                weekly: 21000, biweekly: 39000, monthly: 75600,
                weekly_500: 39950, biweekly_500: 74300, monthly_500: 143000,
                featured: true
            }
        ]
    },
    'desayunos': {
        title: 'Pack de Desayunos',
        subtitle: '5 opciones saludables para tu semana',
        icon: '🍳',
        shipping: {
            weekly: '🚚 Envío según zona',
            biweekly: '🚚 2 envíos semanales (se cobra el envío de tu zona × 2)',
            monthly: '🚚 4 envíos semanales (envío de tu zona × 4) • 50% dto.'
        },
        packs: [
            {
                name: 'Pack de Desayunos',
                desc: 'Menú semanal (Regular o Vegetariano)',
                icon: '🍳',
                weekly: 15000,
                featured: true
            }
        ]
    }
};
