// Zonas de envío y costos de BiKitchen 2026
// Organizado por provincia y distrito

export const SHIPPING_ZONES = [
    // ========== SAN JOSÉ ==========
    {
        id: 'sj-calle-blancos',
        name: 'San José - Calle Blancos',
        province: 'San José',
        areas: ['Calle Blancos'],
        cost: 2800
    },
    {
        id: 'sj-centro',
        name: 'San José Centro (Merced, Catedral)',
        province: 'San José',
        areas: ['Merced', 'Catedral', 'San José Centro'],
        cost: 3000
    },
    {
        id: 'sj-zapote-sfdr',
        name: 'Zapote / San Francisco de Dos Ríos',
        province: 'San José',
        areas: ['Zapote', 'San Francisco de Dos Ríos'],
        cost: 3000
    },
    {
        id: 'sj-uruca-pavas',
        name: 'La Uruca / Pavas / Mata Redonda',
        province: 'San José',
        areas: ['La Uruca', 'Pavas', 'Mata Redonda', 'Rohrmoser'],
        cost: 3000
    },
    {
        id: 'sj-hatillo-sebastian',
        name: 'Hatillo / San Sebastián',
        province: 'San José',
        areas: ['Hatillo', 'San Sebastián'],
        cost: 3000
    },
    {
        id: 'sj-escazu',
        name: 'Escazú (Centro, San Antonio, San Rafael)',
        province: 'San José',
        areas: ['Escazú', 'Escazú San Antonio', 'Escazú San Rafael'],
        cost: 3000
    },
    {
        id: 'sj-desamparados',
        name: 'Desamparados (todos los distritos)',
        province: 'San José',
        areas: ['Desamparados', 'San Miguel', 'San Juan de Dios', 'San Rafael Arriba', 'San Antonio', 'San Rafael Abajo', 'Gravilias'],
        cost: 3000
    },
    {
        id: 'sj-guadalupe',
        name: 'Guadalupe (todos los distritos)',
        province: 'San José',
        areas: ['Guadalupe', 'Mata de Plátano', 'Ipís', 'Rancho Redondo', 'Purral'],
        cost: 3000
    },
    {
        id: 'sj-santa-ana',
        name: 'Santa Ana (Centro, Pozos)',
        province: 'San José',
        areas: ['Santa Ana', 'Santa Ana Pozos'],
        cost: 3000
    },
    {
        id: 'sj-santa-ana-lejano',
        name: 'Santa Ana (Brasil, Piedades)',
        province: 'San José',
        areas: ['Santa Ana Brasil', 'Santa Ana Piedades'],
        cost: 3500
    },
    {
        id: 'sj-alajuelita',
        name: 'Alajuelita',
        province: 'San José',
        areas: ['Alajuelita'],
        cost: 3000
    },
    {
        id: 'sj-coronado',
        name: 'Coronado',
        province: 'San José',
        areas: ['Coronado', 'Vásquez de Coronado'],
        cost: 3000
    },
    {
        id: 'sj-tibas',
        name: 'Tibás',
        province: 'San José',
        areas: ['Tibás'],
        cost: 3000
    },
    {
        id: 'sj-moravia',
        name: 'Moravia (San Vicente, San Jerónimo, La Trinidad)',
        province: 'San José',
        areas: ['Moravia', 'San Vicente', 'San Jerónimo', 'La Trinidad'],
        cost: 3000
    },
    {
        id: 'sj-montes-oca',
        name: 'Montes de Oca (Pedro, Sabanilla, Mercedes, Rafael)',
        province: 'San José',
        areas: ['Montes de Oca', 'San Pedro', 'Sabanilla', 'Mercedes', 'San Rafael'],
        cost: 3000
    },
    {
        id: 'sj-curridabat',
        name: 'Curridabat (todos los distritos)',
        province: 'San José',
        areas: ['Curridabat', 'Granadilla', 'Sánchez', 'Tirrases'],
        cost: 3000
    },
    {
        id: 'sj-aserri',
        name: 'Aserrí',
        province: 'San José',
        areas: ['Aserrí'],
        cost: 3500
    },
    {
        id: 'sj-ciudad-colon',
        name: 'Ciudad Colón',
        province: 'San José',
        areas: ['Ciudad Colón'],
        cost: 3500
    },
    
    // ========== ALAJUELA ==========
    {
        id: 'al-centro',
        name: 'Alajuela Centro / San José / Río Segundo',
        province: 'Alajuela',
        areas: ['Alajuela', 'San José', 'Río Segundo', 'Desamparados Alajuela'],
        cost: 3000
    },
    {
        id: 'al-carrizal-sabanilla',
        name: 'Alajuela - Carrizal / Sabanilla / Tambor',
        province: 'Alajuela',
        areas: ['Carrizal', 'Sabanilla', 'Tambor', 'San Antonio'],
        cost: 3000
    },
    {
        id: 'al-guacima-turrucares',
        name: 'Alajuela - Guácima / Turrúcares / Garita',
        province: 'Alajuela',
        areas: ['Guácima', 'Turrúcares', 'Garita'],
        cost: 3500
    },
    {
        id: 'al-san-isidro-rafael',
        name: 'Alajuela - San Isidro / San Rafael',
        province: 'Alajuela',
        areas: ['San Isidro', 'San Rafael'],
        cost: 3500
    },
    {
        id: 'al-grecia',
        name: 'Grecia Centro',
        province: 'Alajuela',
        areas: ['Grecia', 'Grecia Centro'],
        cost: 3500
    },
    
    // ========== HEREDIA ==========
    {
        id: 'he-centro',
        name: 'Heredia Centro / Mercedes / San Francisco / Ulloa',
        province: 'Heredia',
        areas: ['Heredia', 'Heredia Centro', 'Mercedes', 'San Francisco', 'Ulloa'],
        cost: 3000
    },
    {
        id: 'he-barva',
        name: 'Barva / San José de la Montaña',
        province: 'Heredia',
        areas: ['Barva', 'San José de la Montaña'],
        cost: 3000
    },
    {
        id: 'he-santo-domingo',
        name: 'Santo Domingo',
        province: 'Heredia',
        areas: ['Santo Domingo'],
        cost: 3000
    },
    {
        id: 'he-santa-barbara',
        name: 'Santa Bárbara',
        province: 'Heredia',
        areas: ['Santa Bárbara'],
        cost: 3000
    },
    {
        id: 'he-san-rafael-isidro',
        name: 'San Rafael / San Isidro / San Antonio',
        province: 'Heredia',
        areas: ['San Rafael', 'San Isidro', 'San Antonio', 'La Ribera'],
        cost: 3000
    },
    {
        id: 'he-san-joaquin-pablo',
        name: 'San Joaquín / San Pablo',
        province: 'Heredia',
        areas: ['San Joaquín', 'San Pablo'],
        cost: 3000
    },
    {
        id: 'he-belen',
        name: 'Belén',
        province: 'Heredia',
        areas: ['Belén', 'San Antonio de Belén'],
        cost: 3000
    },
    
    // ========== CARTAGO ==========
    {
        id: 'ca-tres-rios',
        name: 'Tres Ríos / La Unión',
        province: 'Cartago',
        areas: ['Tres Ríos', 'La Unión'],
        cost: 3500
    },
    {
        id: 'ca-cartago-centro',
        name: 'Cartago Centro',
        province: 'Cartago',
        areas: ['Cartago', 'Cartago Centro'],
        cost: 6000
    },
    
    // ========== FUERA DE COBERTURA ==========
    {
        id: 'fuera-cobertura',
        name: 'Otra zona (consultar)',
        province: 'Otro',
        areas: [],
        cost: 6000,
        requiresContact: true
    }
];

// Días de entrega disponibles
export const DELIVERY_DAYS = ['lunes', 'miércoles', 'sábado'];

// Horario de entrega
export const DELIVERY_SCHEDULE = {
    start: '9:00 AM',
    end: '2:00 PM',
    note: 'Según recorrido del repartidor'
};

// Obtener zona por ID
export const getZoneById = (zoneId) => {
    return SHIPPING_ZONES.find(zone => zone.id === zoneId);
};

// Obtener costo de envío por zona
export const getShippingCost = (zoneId) => {
    const zone = getZoneById(zoneId);
    return zone?.cost || 0;
};

// Verificar si la zona requiere contacto
export const zoneRequiresContact = (zoneId) => {
    const zone = getZoneById(zoneId);
    return zone?.requiresContact || false;
};

// Formatear precio
export const formatShippingCost = (cost) => {
    if (cost === null) return 'Consultar';
    return `₡${cost.toLocaleString('es-CR')}`;
};

// Calcular envío con descuento (para planes mensuales)
export const calculateShippingWithDiscount = (zoneId, discountPercent = 0) => {
    const baseCost = getShippingCost(zoneId);
    if (baseCost === null || baseCost === 0) return baseCost;
    
    const discount = Math.round(baseCost * (discountPercent / 100));
    return baseCost - discount;
};
