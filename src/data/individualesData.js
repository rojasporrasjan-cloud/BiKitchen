// Categorías con emojis para mostrar en la UI
export const INDIVIDUALES_CATEGORIES = [
  'Pollo',
  'Res',
  'Cerdo',
  'Pescado',
  'Arroces',
  'Sopas',
  'Pastas',
  'Pasteles',
  'Picadillos',
  'Vegetales',
  'Compuestos',
  'Ensaladas',
  'Vegetariano',
  'Leguminosas',
  'Desayunos'
];

// Mapeo de categorías a emojis
export const CATEGORY_ICONS = {
  'Pollo': '🍗',
  'Res': '🥩',
  'Cerdo': '🐖',
  'Pescado': '🐟',
  'Arroces': '🍚',
  'Sopas': '🥣',
  'Pastas': '🍝',
  'Pasteles': '🥧',
  'Picadillos': '🥘',
  'Vegetales': '🥬',
  'Compuestos': '🍲',
  'Ensaladas': '🥗',
  'Vegetariano': '🌱',
  'Leguminosas': '🫘',
  'Desayunos': '🍳'
};

// Mapeo de categorías a unidades de medida
// Cada categoría tiene: unidadPequena, unidadGrande, labelPequeno, labelGrande
export const CATEGORY_UNITS = {
  'Pollo': { unidadPequena: '500 g', unidadGrande: '1 kg', labelPequeno: '500 g', labelGrande: '1 kg' },
  'Res': { unidadPequena: '500 g', unidadGrande: '1 kg', labelPequeno: '500 g', labelGrande: '1 kg' },
  'Cerdo': { unidadPequena: '500 g', unidadGrande: '1 kg', labelPequeno: '500 g', labelGrande: '1 kg' },
  'Pescado': { unidadPequena: '500 g', unidadGrande: '1 kg', labelPequeno: '500 g', labelGrande: '1 kg' },
  'Arroces': { unidadPequena: '4 tazas', unidadGrande: '6 tazas', labelPequeno: '4 tazas', labelGrande: '6 tazas' },
  'Sopas': { unidadPequena: '4 tazas', unidadGrande: '6 tazas', labelPequeno: '4 tazas', labelGrande: '6 tazas' },
  'Pastas': { unidadPequena: '4 porc.', unidadGrande: '8 porc.', labelPequeno: '4 porciones', labelGrande: '8 porciones' },
  'Pasteles': { unidadPequena: '4 porc.', unidadGrande: '8 porc.', labelPequeno: '4 porciones', labelGrande: '8 porciones' },
  'Picadillos': { unidadPequena: '4 tazas', unidadGrande: '6 tazas', labelPequeno: '4 tazas', labelGrande: '6 tazas' },
  'Vegetales': { unidadPequena: '4 tazas', unidadGrande: '6 tazas', labelPequeno: '4 tazas', labelGrande: '6 tazas' },
  'Compuestos': { unidadPequena: '4 porc.', unidadGrande: '8 porc.', labelPequeno: '4 porciones', labelGrande: '8 porciones' },
  'Ensaladas': { unidadPequena: '4 porc.', unidadGrande: '8 porc.', labelPequeno: '4 porciones', labelGrande: '8 porciones' },
  'Vegetariano': { unidadPequena: '4 porc.', unidadGrande: '8 porc.', labelPequeno: '4 porciones', labelGrande: '8 porciones' },
  'Leguminosas': { unidadPequena: '4 tazas', unidadGrande: '6 tazas', labelPequeno: '4 tazas', labelGrande: '6 tazas' },
  'Desayunos': { unidadPequena: '4 porciones', unidadGrande: '4 porciones', labelPequeno: '4 porciones', labelGrande: '4 porciones' }
};

// Función helper para obtener las unidades de un producto
export const getProductUnits = (categoria) => {
  return CATEGORY_UNITS[categoria] || { unidadPequena: '500 g', unidadGrande: '1 kg', labelPequeno: '500 g', labelGrande: '1 kg' };
};

export const individualesData = [
  // ============================================================
  // PRODUCTO DE PRUEBA (PRODUCCIÓN)
  // ============================================================
  {
    id: 'test-nmi-prod',
    nombre: '🛠️ PRUEBA PRODUCCIÓN (₡100)',
    descripcion: 'Producto temporal para verificar cobro real en BAC. Se eliminará tras la prueba.',
    precio500: 100,
    precio1kg: 100,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80'
  },

  // ============================================================
  // POLLO (500 gramos / 1 kg)
  // ============================================================
  {
    id: 'fajitas-pollo-encebollados',
    nombre: 'Fajitas de pollo encebollados',
    descripcion: '',
    precio500: 7850,
    precio1kg: 14925,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-mechado-salsa-tomate',
    nombre: 'Pollo mechado en salsa tomate',
    descripcion: '',
    precio500: 7850,
    precio1kg: 14925,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-relleno-espinaca-queso',
    nombre: 'Pollo relleno con espinaca y queso',
    descripcion: '',
    precio500: 10500,
    precio1kg: 19950,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-al-pesto',
    nombre: 'Pollo al pesto',
    descripcion: '',
    precio500: 7850,
    precio1kg: 14925,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-espinaca',
    nombre: 'Pollo en salsa espinaca',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'deditos-pollo-empanizados',
    nombre: 'Deditos de pollo empanizados',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-bbq',
    nombre: 'Pollo en salsa bbq',
    descripcion: '',
    precio500: 7850,
    precio1kg: 14925,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-blanca',
    nombre: 'Pollo en salsa blanca',
    descripcion: '',
    precio500: 9500,
    precio1kg: 18050,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1606728035253-49e8a23146de?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-hongos',
    nombre: 'Pollo en salsa de hongos',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'gordon-bleu-pollo-salsa-hongos',
    nombre: 'Gordon bleu (4 porciones) con salsa de hongos',
    descripcion: '',
    precio500: 13500,
    precio1kg: 25650,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1604908177453-7462950a6a3b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-a-la-naranja',
    nombre: 'Pollo a la naranja',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-chipotle',
    nombre: 'Pollo en salsa chipotle',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-strogonoff',
    nombre: 'Pollo en salsa strogonoff',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1619894991209-9f9694be045a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'filet-pollo-plancha',
    nombre: 'Filet de pollo a la plancha',
    descripcion: '',
    precio500: 7850,
    precio1kg: 14925,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'milanesa-pollo',
    nombre: 'Milanesa de pollo',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1599921841143-819065a55cc6?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-mostaza',
    nombre: 'Pollo en salsa de mostaza',
    descripcion: '',
    precio500: 7850,
    precio1kg: 14925,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-a-la-toscana',
    nombre: 'Pollo a la toscana',
    descripcion: '',
    precio500: 8850,
    precio1kg: 16815,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-teriyaki',
    nombre: 'Pollo en salsa teriyaki',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'filet-pollo-ajillo',
    nombre: 'Filet de pollo al ajillo',
    descripcion: '',
    precio500: 7850,
    precio1kg: 14925,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-curry',
    nombre: 'Pollo en salsa de curry',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-salsa-caribena',
    nombre: 'Pollo en salsa caribeña',
    descripcion: '',
    precio500: 8950,
    precio1kg: 16815,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-a-la-napolitana',
    nombre: 'Pollo a la napolitana',
    descripcion: '',
    precio500: 8950,
    precio1kg: 16815,
    categoria: 'Pollo',
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
  },

  // ============================================================
  // CARNE DE RES (500 gramos / 1 kg)
  // ============================================================
  {
    id: 'fajitas-lomo-salsa-hongos',
    nombre: 'Fajitas de lomo en salsa de hongos',
    descripcion: '',
    precio500: 9550,
    precio1kg: 18150,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776137841/bikitchen/individuales/fajitas_lomo_salsa_hongos.jpg'
  },
  {
    id: 'tortas-carne-salsa',
    nombre: 'Tortas de carne en salsa',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Res',
    imagen: '/assets/individuales/tortas_carne_salsa_caseras.png'
  },
  {
    id: 'carne-mechada-res',
    nombre: 'Carne mechada de res',
    descripcion: '',
    precio500: 9350,
    precio1kg: 17800,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776137843/bikitchen/individuales/carne_mechada_res.jpg'
  },
  {
    id: 'taco-alambre',
    nombre: 'Taco alambre',
    descripcion: '',
    precio500: 9550,
    precio1kg: 18150,
    categoria: 'Res',
    imagen: '/assets/individuales/taco_alambre.png'
  },
  {
    id: 'fajitas-lomo-encebolladas',
    nombre: 'Fajitas de lomo de res encebolladas',
    descripcion: '',
    precio500: 8800,
    precio1kg: 16800,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138109/bikitchen/individuales/fajitas_lomo_encebolladas.jpg'
  },
  {
    id: 'gordon-bleu-lomo-salsa-hongos',
    nombre: 'Gordon bleu lomo con salsa de hongos',
    descripcion: '',
    precio500: 14500,
    precio1kg: 27550,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138109/bikitchen/individuales/gordon_bleu_lomo_res.jpg'
  },
  {
    id: 'fajitas-lomo-salsa-vino',
    nombre: 'Fajitas de lomo en salsa de vino',
    descripcion: '',
    precio500: 9550,
    precio1kg: 18150,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138110/bikitchen/individuales/fajitas_vino_tinto.jpg'
  },
  {
    id: 'carne-molida-arreglada-salsa',
    nombre: 'Carne molida arreglada en salsa',
    descripcion: '',
    precio500: 7950,
    precio1kg: 15100,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138186/bikitchen/individuales/carne_molida_arreglada_salsa.jpg'
  },
  {
    id: 'fajitas-salsa-strogonoff',
    nombre: 'Fajitas en salsa strogonoff',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138187/bikitchen/individuales/fajitas_strogonoff.jpg'
  },
  {
    id: 'fajitas-lomo-chimichurri',
    nombre: 'Fajitas de lomo con chimichurri',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138188/bikitchen/individuales/fajitas_lomo_chimichurri.jpg'
  },
  {
    id: 'fajitas-hongos-salsa-blanca',
    nombre: 'Fajitas con hongos en salsa blanca',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138493/bikitchen/individuales/fajitas_hongos_salsa_blanca.jpg'
  },
  {
    id: 'bistec-lomo-encebollado',
    nombre: 'Bistec de lomo encebollado',
    descripcion: '',
    precio500: 8800,
    precio1kg: 16800,
    categoria: 'Res',
    imagen: '/assets/individuales/bistec_lomo_encebollado_premium.png'
  },
  {
    id: 'fajitas-lomo-salsa-demiglase',
    nombre: 'Fajitas de lomo en salsa demiglase',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: '/assets/individuales/fajitas_lomo_demiglase_premium.png'
  },
  {
    id: 'fajitas-lomo-salsa-pimienta',
    nombre: 'Fajitas de lomo en salsa de pimienta',
    descripcion: '',
    precio500: 10350,
    precio1kg: 19665,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138495/bikitchen/individuales/fajitas_lomo_pimienta.jpg'
  },
  {
    id: 'fajitas-lomo-salsa-criolla-tomate',
    nombre: 'Fajitas de lomo en salsa criolla de tomate',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138496/bikitchen/individuales/fajitas_lomo_salsa_criolla.jpg'
  },

  // ============================================================
  // CARNE DE CERDO (500 gramos / 1 kg)
  // ============================================================
  {
    id: 'fajitas-cerdo-encebolladas',
    nombre: 'Fajitas de carne de cerdo encebolladas',
    descripcion: '',
    precio500: 7800,
    precio1kg: 14850,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776138853/bikitchen/individuales/fajitas_cerdo_encebolladas.jpg',
    isBestValue: true,
    macros: { p: '32g', c: '5g', f: '14g' }
  },
  {
    id: 'pulled-pork',
    nombre: 'Pulled pork',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: '/assets/individuales/pulled_pork.png',
    isPopular: true,
    macros: { p: '40g', c: '2g', f: '18g' }
  },
  {
    id: 'trocitos-cerdo-salsa-bbq',
    nombre: 'Trocitos de cerdo en salsa BBQ',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167290/bikitchen/individuales/trocitos_cerdo_bbq.jpg'
  },
  {
    id: 'trocitos-cerdo-salsa-pina',
    nombre: 'Trocitos de cerdo salsa piña',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167291/bikitchen/individuales/trocitos_cerdo_pina.jpg'
  },
  {
    id: 'trocitos-cerdo-naranja',
    nombre: 'Trocitos de cerdo a la naranja',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167229/bikitchen/individuales/trocitos_cerdo_naranja.jpg'
  },
  {
    id: 'trocitos-cerdo-salsa-criolla',
    nombre: 'Trocitos de cerdo en salsa criolla',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167229/bikitchen/individuales/trocitos_cerdo_salsa_criolla.jpg'
  },
  {
    id: 'cerdo-salsa-chipotle',
    nombre: 'Cerdo en salsa chipotle',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167230/bikitchen/individuales/cerdo_salsa_chipotle.jpg'
  },
  {
    id: 'trocitos-cerdo-chimichurri',
    nombre: 'Trocitos de cerdo con chimichurri',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167586/bikitchen/individuales/trocitos_cerdo_chimichurri.jpg'
  },
  {
    id: 'bistec-cerdo-encebollado',
    nombre: 'Bistec de cerdo encebollado',
    descripcion: '',
    precio500: 8850,
    precio1kg: 16800,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167587/bikitchen/individuales/bistec_cerdo_encebollado.jpg'
  },
  {
    id: 'cerdo-mechado-salsa-tomate',
    nombre: 'Cerdo mechado en salsa de tomate',
    descripcion: '',
    precio500: 7800,
    precio1kg: 14850,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167587/bikitchen/individuales/cerdo_mechado_salsa_tomate.jpg'
  },
  {
    id: 'cerdo-salsa-curry',
    nombre: 'Cerdo en salsa de curry',
    descripcion: '',
    precio500: 8850,
    precio1kg: 16800,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776168005/bikitchen/individuales/cerdo_salsa_curry.jpg'
  },
  {
    id: 'cerdo-salsa-teriyaki',
    nombre: 'Cerdo en salsa teriyaki',
    descripcion: '',
    precio500: 8850,
    precio1kg: 16800,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167926/bikitchen/individuales/cerdo_salsa_teriyaki.jpg'
  },
  {
    id: 'cerdo-salsa-mostaza',
    nombre: 'Cerdo en salsa de mostaza',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167873/bikitchen/individuales/cerdo_salsa_mostaza.jpg'
  },
  {
    id: 'trocitos-cerdo-fritos',
    nombre: 'Trocitos de cerdo fritos',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776167873/bikitchen/individuales/trocitos_cerdo_fritos.jpg'
  },
  {
    id: 'trocitos-cerdo-salsa-agridulce',
    nombre: 'Trocitos de cerdo en salsa agridulce',
    descripcion: 'Trocitos de cerdo sin empanizar en salsa agridulce con trozos de piña.',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: '/assets/individuales/cerdo_agridulce_premium.png'
  },
  {
    id: 'trocitos-cerdo-salsa-pimienta',
    nombre: 'Trocitos de cerdo en salsa de pimienta',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776168059/bikitchen/individuales/trocitos_cerdo_salsa_pimienta.jpg'
  },
  {
    id: 'cochinita-pibil',
    nombre: 'Cochinita pibil',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776168059/bikitchen/individuales/cochinita_pibil.jpg'
  },

  // ============================================================
  // PESCADO (500 gramos / 1 kg)
  // ============================================================
  {
    id: 'tilapia-al-ajillo',
    nombre: 'Filet de tilapia al ajillo',
    descripcion: '',
    precio500: 9750,
    precio1kg: 18500,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176044/bikitchen/individuales/tilapia_al_ajillo.jpg'
  },
  {
    id: 'tilapia-salsa-mediterranea',
    nombre: 'Filet de tilapia en salsa mediterránea',
    descripcion: '',
    precio500: 10500,
    precio1kg: 19950,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176045/bikitchen/individuales/tilapia_salsa_mediterranea.jpg'
  },
  {
    id: 'tilapia-salsa-roja',
    nombre: 'Filet de tilapia en salsa roja',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176045/bikitchen/individuales/tilapia_salsa_roja.jpg'
  },
  {
    id: 'deditos-tilapia-empanizadas',
    nombre: 'Deditos de tilapia empanizadas',
    descripcion: '',
    precio500: 10350,
    precio1kg: 19650,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176046/bikitchen/individuales/deditos_tilapia_empanizadas.jpg'
  },
  {
    id: 'tilapia-perejil-ajo',
    nombre: 'Filet de tilapia con perejil y ajo',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176046/bikitchen/individuales/tilapia_perejil_ajo.jpg'
  },
  {
    id: 'tilapia-menieur',
    nombre: 'Filet de tilapia a la menieur',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176047/bikitchen/individuales/tilapia_menieur.jpg'
  },
  {
    id: 'tilapia-empanizado',
    nombre: 'Filet de tilapia empanizado',
    descripcion: '',
    precio500: 10350,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176060/bikitchen/individuales/tilapia_empanizado.jpg'
  },
  {
    id: 'tilapia-salsa-espinaca',
    nombre: 'Filet de tilapia en salsa espinaca',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176061/bikitchen/individuales/tilapia_salsa_espinaca.jpg'
  },
  {
    id: 'tilapia-salsa-culantro',
    nombre: 'Filet de tilapia en salsa de culantro',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176061/bikitchen/individuales/tilapia_salsa_culantro.jpg'
  },

  // ============================================================
  // ARROCES (4 tazas / 6 tazas)
  // ============================================================
  {
    id: 'gallo-pinto',
    nombre: 'Gallo pinto',
    descripcion: '4 tazas / 6 tazas',
    precio500: 6500,
    precio1kg: 9850,
    categoria: 'Arroces',
    imagen: '/assets/individuales/gallo_pinto_premium.png'
  },
  {
    id: 'arroz-con-pollo',
    nombre: 'Arroz con pollo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9950,
    precio1kg: 14950,
    categoria: 'Arroces',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776194407/bikitchen/individuales/arroz_con_pollo.jpg'
  },
  {
    id: 'arroz-con-cerdo',
    nombre: 'Arroz con cerdo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9950,
    precio1kg: 14950,
    categoria: 'Arroces',
    imagen: '/assets/individuales/arroz_con_cerdo_premium.png'
  },
  {
    id: 'arroz-cantones',
    nombre: 'Arroz estilo cantones',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9950,
    precio1kg: 14950,
    categoria: 'Arroces',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776194410/bikitchen/individuales/arroz_cantones.jpg'
  },
  {
    id: 'arroz-jardinera',
    nombre: 'Arroz a la jardinera',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7200,
    precio1kg: 10800,
    categoria: 'Arroces',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776194411/bikitchen/individuales/arroz_jardinera.jpg'
  },
  {
    id: 'arroz-palmito-vegetales',
    nombre: 'Arroz con palmito y vegetales',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9000,
    precio1kg: 13500,
    categoria: 'Arroces',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776194412/bikitchen/individuales/arroz_palmito_vegetales.jpg'
  },
  {
    id: 'arroz-blanco',
    nombre: 'Arroz blanco',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5000,
    precio1kg: 7500,
    categoria: 'Arroces',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776195935/bikitchen/individuales/arroz_blanco.jpg'
  },

  // ============================================================
  // SOPAS Y CREMAS (4 tazas / 6 tazas)
  // ============================================================
  {
    id: 'sopa-azteca',
    nombre: 'Sopa Azteca con tortillas y queso',
    descripcion: '4 tazas / 6 tazas',
    precio500: 14000,
    precio1kg: 21000,
    categoria: 'Sopas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776304481/bikitchen/individuales/sopa_azteca.jpg'
  },
  {
    id: 'olla-de-carne',
    nombre: 'Olla de carne',
    descripcion: '4 tazas / 6 tazas',
    precio500: 12000,
    precio1kg: 18000,
    categoria: 'Sopas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776304482/bikitchen/individuales/olla_de_carne.jpg'
  },
  {
    id: 'sopa-de-pollo',
    nombre: 'Sopa de pollo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 12000,
    precio1kg: 18000,
    categoria: 'Sopas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776304483/bikitchen/individuales/sopa_de_pollo.jpg'
  },
  {
    id: 'sopa-albondigas',
    nombre: 'Sopa albóndigas',
    descripcion: '4 tazas / 6 tazas',
    precio500: 13000,
    precio1kg: 19500,
    categoria: 'Sopas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776304484/bikitchen/individuales/sopa_albondigas.jpg'
  },
  {
    id: 'sopa-negra-huevo',
    nombre: 'Sopa negra con huevo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 11400,
    precio1kg: 17100,
    categoria: 'Sopas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776304485/bikitchen/individuales/sopa_negra_huevo.jpg'
  },
  {
    id: 'crema-brocoli',
    nombre: 'Crema brocoli',
    descripcion: '4 tazas / 6 tazas',
    precio500: 13000,
    precio1kg: 19500,
    categoria: 'Sopas',
    imagen: '/assets/individuales/crema_brocoli_premium.png'
  },
  {
    id: 'crema-ayote',
    nombre: 'Crema ayote',
    descripcion: '4 tazas / 6 tazas',
    precio500: 12500,
    precio1kg: 18750,
    categoria: 'Sopas',
    imagen: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'crema-vegetales',
    nombre: 'Crema de vegetales',
    descripcion: '4 tazas / 6 tazas',
    precio500: 12500,
    precio1kg: 18750,
    categoria: 'Sopas',
    imagen: '/assets/individuales/crema_vegetales_premium.png'
  },

  // ============================================================
  // PASTAS (4 porciones / 8 porciones)
  // ============================================================
  {
    id: 'canelones-carne-molida-salsa-roja',
    nombre: 'Canelones relleno con carne molida en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776195936/bikitchen/individuales/canelones_carne_molida_salsa_roja.jpg'
  },
  {
    id: 'canelones-pollo-salsa-roja',
    nombre: 'Canelones rellenos con pollo en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776195937/bikitchen/individuales/canelones_pollo_salsa_roja.jpg'
  },
  {
    id: 'canelones-espinaca-queso-salsa-blanca',
    nombre: 'Canelones rellenos de espinaca y queso en salsa blanca',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776195938/bikitchen/individuales/canelones_espinaca_queso_salsa_blanca.jpg'
  },
  {
    id: 'canelones-queso-salsa-roja',
    nombre: 'Canelones rellenos con queso en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776195937/bikitchen/individuales/canelones_queso_salsa_roja.jpg'
  },
  {
    id: 'spaghetti-bolonesa-carne',
    nombre: 'Spaghetti a la boloñesa con carne',
    descripcion: '4 porciones / 8 porciones',
    precio500: 9400,
    precio1kg: 18500,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776273815/bikitchen/individuales/spaghetti_bolonesa_carne.jpg'
  },
  {
    id: 'spaghetti-salsa-blanca-pollo',
    nombre: 'Spaguetti en salsa blanca con pollo',
    descripcion: '4 porciones / 8 porciones',
    precio500: 12800,
    precio1kg: 24350,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776273836/bikitchen/individuales/spaghetti_salsa_blanca_pollo.jpg'
  },
  {
    id: 'spaghetti-pollo-pomodoro',
    nombre: 'Spaguettis con pollo en salsa pomodoro',
    descripcion: '4 porciones / 8 porciones',
    precio500: 8000,
    precio1kg: 15200,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776273427/bikitchen/individuales/spaghetti_pollo_pomodoro.jpg'
  },
  {
    id: 'spaghetti-pesto-pollo',
    nombre: 'Spaguettis al pesto con pollo',
    descripcion: '4 porciones / 8 porciones',
    precio500: 10950,
    precio1kg: 20850,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776273435/bikitchen/individuales/spaghetti_pesto_pollo.jpg'
  },
  {
    id: 'fetucchinni-alfredo',
    nombre: 'Fetucchinni alfredo',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11500,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776273443/bikitchen/individuales/fetucchinni_alfredo.jpg'
  },
  {
    id: 'lasagna-pollo-salsa-roja',
    nombre: 'Lasagna de pollo en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776273451/bikitchen/individuales/lasagna_pollo_salsa_roja.jpg'
  },
  {
    id: 'lasagna-carne-salsa-roja',
    nombre: 'Lasagna de carne en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776273461/bikitchen/individuales/lasagna_carne_salsa_roja.jpg'
  },
  {
    id: 'lasagna-pollo-salsa-blanca',
    nombre: 'Lasagna de pollo salsa blanca',
    descripcion: '4 porciones / 8 porciones',
    precio500: 12800,
    precio1kg: 24350,
    categoria: 'Pastas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776273470/bikitchen/individuales/lasagna_pollo_salsa_blanca.jpg'
  },

  // ============================================================
  // PASTELES Y ANTOJITOS (4 porciones / 8 porciones)
  // ============================================================
  {
    id: 'pastel-tortilla-pollo-queso',
    nombre: 'Pastel de tortilla, pollo y queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 9500,
    precio1kg: 18050,
    categoria: 'Pasteles',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776311255/bikitchen/individuales/pastel_tortilla_pollo_queso.jpg'
  },
  {
    id: 'pastel-maduro-frijoles-queso',
    nombre: 'Pastel de maduro con frijoles y queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 9500,
    precio1kg: 18050,
    categoria: 'Pasteles',
    imagen: '/assets/individuales/pastel_maduro_frijoles_queso.png'
  },
  {
    id: 'pastel-papa-carne-queso',
    nombre: 'Pastel de papa carne y queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11000,
    precio1kg: 21000,
    categoria: 'Pasteles',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776360272/bikitchen/individuales/pastel_papa_carne_queso.jpg'
  },
  {
    id: 'pastel-yuca-carne',
    nombre: 'Pastel de yuca con carne',
    descripcion: '4 porciones / 8 porciones',
    precio500: 10500,
    precio1kg: 19950,
    categoria: 'Pasteles',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776360273/bikitchen/individuales/pastel_yuca_carne.jpg'
  },
  {
    id: 'arroz-palmito-salsa-blanca-gratinado',
    nombre: 'Arroz con palmito en salsa blanca gratinado',
    descripcion: '4 porciones / 8 porciones',
    precio500: 12500,
    precio1kg: 23000,
    categoria: 'Pasteles',
    imagen: '/assets/individuales/arroz_palmito_gratinado.png'
  },
  {
    id: 'enyucados-carne-molida',
    nombre: 'Enyucados con carne molida',
    descripcion: '4 porciones / 8 porciones',
    precio500: 7500,
    precio1kg: 14800,
    categoria: 'Pasteles',
    imagen: '/assets/individuales/enyucados_carne_molida.png'
  },
  {
    id: 'tortas-yuca',
    nombre: 'Tortas de yuca',
    descripcion: '4 porciones / 8 porciones',
    precio500: 7500,
    precio1kg: 14250,
    categoria: 'Pasteles',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776360275/bikitchen/individuales/tortas_yuca.jpg'
  },
  {
    id: 'tortas-maduro-queso',
    nombre: 'Tortas maduro con queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 7500,
    precio1kg: 14250,
    categoria: 'Pasteles',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776360276/bikitchen/individuales/tortas_maduro_queso.jpg'
  },
  {
    id: 'croquetas-papa-jamon-queso',
    nombre: 'Croquetas de papa con jamón y queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 7850,
    precio1kg: 15700,
    categoria: 'Pasteles',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776360276/bikitchen/individuales/croquetas_papa_jamon_queso.jpg'
  },
  {
    id: 'platanos-maduros-almibar',
    nombre: 'Plátanos maduros en almíbar',
    descripcion: '4 porciones / 8 porciones',
    precio500: 5850,
    precio1kg: 11700,
    categoria: 'Pasteles',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776360277/bikitchen/individuales/platanos_maduros_almibar.jpg'
  },

  // ============================================================
  // PICADILLOS (4 tazas / 6 tazas)
  // ============================================================
  {
    id: 'picadillo-fiesta',
    nombre: 'Picadillo fiesta (papa con carne mechada)',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7850,
    precio1kg: 11650,
    categoria: 'Picadillos',
    imagen: '/assets/individuales/picadillo_fiesta.png'
  },
  {
    id: 'picadillo-papa-frijoles-blancos-carne',
    nombre: 'Picadillo de papa con frijoles blancos y carne mechada',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7850,
    precio1kg: 11650,
    categoria: 'Picadillos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776274594/bikitchen/individuales/picadillo_papa_frijoles_blancos_carne.jpg'
  },
  {
    id: 'picadillo-papa-atun',
    nombre: 'Picadillo papa con atún',
    descripcion: 'Dardos de papa con atún finamente desmenuzado, sazonado con olores.',
    precio500: 7850,
    precio1kg: 11650,
    categoria: 'Picadillos',
    imagen: '/assets/individuales/picadillo_papa_atun_premium.png'
  },
  {
    id: 'picadillo-papa-carne-molida',
    nombre: 'Picadillo de papa con carne molida',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7850,
    precio1kg: 11650,
    categoria: 'Picadillos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776274595/bikitchen/individuales/picadillo_papa_carne_molida.jpg'
  },
  {
    id: 'picadillo-chayote-carne',
    nombre: 'Picadillo chayote con carne',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5850,
    precio1kg: 8650,
    categoria: 'Picadillos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776274596/bikitchen/individuales/picadillo_chayote_carne.jpg'
  },
  {
    id: 'picadillo-mixto-vegetales',
    nombre: 'Picadillo mixto de vegetales',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5850,
    precio1kg: 8650,
    categoria: 'Picadillos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776274596/bikitchen/individuales/picadillo_mixto_vegetales.jpg'
  },
  {
    id: 'guiso-ayote-tierno-maiz',
    nombre: 'Guiso de ayote tierno con maíz',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5850,
    precio1kg: 8650,
    categoria: 'Picadillos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776274597/bikitchen/individuales/guiso_ayote_tierno_maiz_dulce.jpg'
  },
  {
    id: 'picadillo-chayote-maiz-dulce',
    nombre: 'Picadillo chayote con maíz dulce',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5850,
    precio1kg: 8650,
    categoria: 'Picadillos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776274598/bikitchen/individuales/picadillo_chayote_maiz_dulce.jpg'
  },
  {
    id: 'picadillo-vainica-zanahoria',
    nombre: 'Picadillo vainica y zanahoria',
    descripcion: '4 tazas / 6 tazas',
    precio500: 6500,
    precio1kg: 9750,
    categoria: 'Picadillos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776274599/bikitchen/individuales/picadillo_vainica_zanahoria.jpg'
  },

  // ============================================================
  // VEGETALES Y GUARNICIONES
  // ============================================================
  {
    id: 'vegetales-salteados',
    nombre: 'Vegetales salteados',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7500,
    precio1kg: 11250,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303295/bikitchen/individuales/vegetales_salteados.jpg'
  },
  {
    id: 'pure-papa',
    nombre: 'Puré de papa',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7500,
    precio1kg: 11250,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303296/bikitchen/individuales/pure_papa.jpg'
  },
  {
    id: 'pure-camote',
    nombre: 'Puré camote',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7500,
    precio1kg: 11250,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303297/bikitchen/individuales/pure_camote.jpg'
  },
  {
    id: 'yuca-frita',
    nombre: 'Yuca frita',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5500,
    precio1kg: 8250,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303297/bikitchen/individuales/yuca_frita.jpg'
  },
  {
    id: 'papitas-salteadas-romero',
    nombre: 'Papitas salteadas al romero',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7500,
    precio1kg: 11250,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303298/bikitchen/individuales/papitas_romero.jpg'
  },
  {
    id: 'barbudos',
    nombre: 'Barbudos',
    descripcion: '6 unidades / 12 unidades',
    precio500: 8500,
    precio1kg: 11500,
    categoria: 'Vegetales',
    imagen: '/assets/individuales/barbudos_premium.png'
  },
  {
    id: 'coliflor-envuelta-huevo',
    nombre: 'Coliflor envuelta en huevo',
    descripcion: '6 unidades / 12 unidades',
    precio500: 8850,
    precio1kg: 17500,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303299/bikitchen/individuales/coliflor_envuelta_huevo.jpg'
  },
  {
    id: 'chayote-envuelto-huevo',
    nombre: 'Chayote envuelto en huevo',
    descripcion: '6 unidades / 12 unidades',
    precio500: 6000,
    precio1kg: 12000,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303299/bikitchen/individuales/chayote_envuelto_huevo.jpg'
  },
  {
    id: 'tortas-espinaca-huevo',
    nombre: 'Tortas de espinaca con huevo',
    descripcion: '6 unidades / 12 unidades',
    precio500: 6150,
    precio1kg: 12300,
    categoria: 'Vegetales',
    imagen: '/assets/individuales/tortas_espinaca_premium.png'
  },
  {
    id: 'zuchinnis-rellenos-pollo',
    nombre: 'Zuchinnis rellenos con pollo bañados en salsa criolla',
    descripcion: '4 unidades / 6 unidades',
    precio500: 9850,
    precio1kg: 14700,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303301/bikitchen/individuales/zuchinnis_rellenos_pollo.jpg'
  },
  {
    id: 'zuchinnis-rellenos-carne',
    nombre: 'Zuchinnis rellenos con carne molida bañados en salsa criolla',
    descripcion: '4 unidades / 6 unidades',
    precio500: 9850,
    precio1kg: 14700,
    categoria: 'Vegetales',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776303301/bikitchen/individuales/zuchinnis_rellenos_carne.jpg'
  },

  // ============================================================
  // PLATILLOS COMPUESTOS (4 tazas / 6 tazas)
  // ============================================================
  {
    id: 'estofado-pollo-papa-zanahoria',
    nombre: 'Estofado de pollo con papa y zanahoria',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8950,
    precio1kg: 13400,
    categoria: 'Compuestos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776361868/bikitchen/individuales/estofado_pollo_papa_zanahoria.jpg'
  },
  {
    id: 'estofado-res-papa-zanahoria',
    nombre: 'Estofado de carne res con papa y zanahoria',
    descripcion: '4 tazas / 6 tazas',
    precio500: 10500,
    precio1kg: 15750,
    categoria: 'Compuestos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776361869/bikitchen/individuales/estofado_res_papa_zanahoria.jpg'
  },
  {
    id: 'estofado-cerdo-papa-zanahoria',
    nombre: 'Estofado de carne de cerdo con papa y zanahoria',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8850,
    precio1kg: 13250,
    categoria: 'Compuestos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776361870/bikitchen/individuales/estofado_cerdo_papa_zanahoria.jpg'
  },
  {
    id: 'trocitos-cerdo-platano-maduro',
    nombre: 'Trocitos de cerdo con platano maduro',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8950,
    precio1kg: 13400,
    categoria: 'Compuestos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776361871/bikitchen/individuales/trocitos_cerdo_platano_maduro.jpg'
  },
  {
    id: 'chorizo-con-papas',
    nombre: 'Chorizo con papas',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7950,
    precio1kg: 11900,
    categoria: 'Compuestos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776361872/bikitchen/individuales/chorizo_con_papas.jpg'
  },
  {
    id: 'pollo-papas-achiotado',
    nombre: 'Pollo con papas achiotado',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8950,
    precio1kg: 13400,
    categoria: 'Compuestos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776361872/bikitchen/individuales/pollo_papas_achiotado.jpg'
  },
  {
    id: 'salchichas-con-papas',
    nombre: 'Salchichas con papas',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7950,
    precio1kg: 11900,
    categoria: 'Compuestos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776361873/bikitchen/individuales/salchichas_con_papas.jpg'
  },
  {
    id: 'flautas-pollo-salsa-roja-queso',
    nombre: 'Flautas de pollo (harina) en salsa criolla',
    descripcion: 'Flautas de harina rellenas de pollo, bañadas en salsa criolla de tomate y queso mozzarella gratinado.',
    precio500: 11400,
    precio1kg: 11400,
    categoria: 'Compuestos',
    imagen: '/assets/individuales/flautas_harina_criolla_premium.png'
  },
  {
    id: 'burritos-pollo',
    nombre: 'Burritos de pollo (frijoles molidos, queso y pollo)',
    descripcion: 'Burritos rellenos de frijoles molidos, queso y pollo.',
    precio500: 9400,
    precio1kg: 14000,
    categoria: 'Compuestos',
    imagen: '/assets/individuales/burritos_premium.png'
  },
  {
    id: 'burritos-carne',
    nombre: 'Burritos de carne (frijoles molidos, queso y carne)',
    descripcion: 'Burritos rellenos de frijoles molidos, queso y carne.',
    precio500: 9400,
    precio1kg: 14000,
    categoria: 'Compuestos',
    imagen: '/assets/individuales/burritos_premium.png'
  },
  {
    id: 'quesadillas-pollo',
    nombre: 'Quesadillas de pollo (queso y pollo)',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8950,
    precio1kg: 13400,
    categoria: 'Compuestos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776391967/bikitchen/individuales/quesadillas_pollo.jpg'
  },

  // ============================================================
  // ENSALADAS (4 porciones / 6 porciones)
  // ============================================================
  {
    id: 'ensalada-coleslaw',
    nombre: 'Ensalada coleslaw',
    descripcion: '4 porciones / 6 porciones',
    precio500: 6850,
    precio1kg: 10275,
    categoria: 'Ensaladas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776392738/bikitchen/individuales/ensalada_coleslaw.jpg'
  },
  {
    id: 'ensalada-mediterranea',
    nombre: 'Ensalada mediterránea',
    descripcion: 'Tomate, aceitunas, cebolla, pepinos en cuadros y vinagre balsámico. No lleva lechuga.',
    precio500: 7450,
    precio1kg: 11150,
    categoria: 'Ensaladas',
    imagen: '/assets/individuales/ensalada_mediterranea_premium.png'
  },
  {
    id: 'ensalada-rusa',
    nombre: 'Ensalada rusa',
    descripcion: '4 porciones / 6 porciones',
    precio500: 7500,
    precio1kg: 12000,
    categoria: 'Ensaladas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776392740/bikitchen/individuales/ensalada_rusa.jpg'
  },
  {
    id: 'ensalada-papa',
    nombre: 'Ensalada de papa',
    descripcion: 'Papa con abundante mayonesa, cremosa y deliciosa.',
    precio500: 7500,
    precio1kg: 12000,
    categoria: 'Ensaladas',
    imagen: '/assets/individuales/ensalada_papa_premium.png'
  },
  {
    id: 'ensalada-caracolitos-atun',
    nombre: 'Ensalada de caracolitos con atun',
    descripcion: '4 porciones / 6 porciones',
    precio500: 6500,
    precio1kg: 11500,
    categoria: 'Ensaladas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776392741/bikitchen/individuales/ensalada_caracolitos_atun.jpg'
  },
  {
    id: 'escabeche-verduras',
    nombre: 'Escabeche de verduras',
    descripcion: 'Verduras variadas en una rica salsa de tomate.',
    precio500: 7450,
    precio1kg: 13500,
    categoria: 'Ensaladas',
    imagen: '/assets/individuales/escabeche_verduras_premium.png'
  },

  // ============================================================
  // OPCIONES VEGETARIANAS (4 porciones)
  // ============================================================
  {
    id: 'lasagna-vegetariana',
    nombre: 'Lasagna vegetariana',
    descripcion: '4 porciones',
    precio500: 11000,
    precio1kg: 11000,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176314/bikitchen/individuales/lasagna_vegetariana.jpg'
  },
  {
    id: 'lasagna-espinaca-queso-salsa-blanca',
    nombre: 'Lasagna de espinaca y queso en salsa blanca',
    descripcion: '4 porciones',
    precio500: 12500,
    precio1kg: 12500,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176315/bikitchen/individuales/lasagna_espinaca_queso_salsa_blanca.jpg'
  },
  {
    id: 'pastel-maduro-frijol-queso-veg',
    nombre: 'Pastel de maduro, frijol y queso',
    descripcion: '4 porciones',
    precio500: 9500,
    precio1kg: 9500,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176316/bikitchen/individuales/pastel_maduro_frijol_queso_veg.jpg'
  },
  {
    id: 'pastel-papa-espinaca-soya',
    nombre: 'Pastel de papa con espinaca o carne de soya',
    descripcion: '4 porciones',
    precio500: 11000,
    precio1kg: 11000,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776192190/bikitchen/individuales/pastel_papa_espinaca_soya.jpg'
  },
  {
    id: 'tortas-lentejas',
    nombre: 'Tortas de lentejas (6 unidades)',
    descripcion: '4 porciones',
    precio500: 7200,
    precio1kg: 7200,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776176318/bikitchen/individuales/tortas_lentejas.jpg'
  },
  {
    id: 'garbanzos-curry-espinacas',
    nombre: 'Garbanzos al curry y espinacas',
    descripcion: '4 porciones',
    precio500: 6500,
    precio1kg: 6500,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776192191/bikitchen/individuales/garbanzos_curry_espinacas.jpg'
  },
  {
    id: 'lentejas-verduras',
    nombre: 'Lentejas con verduras',
    descripcion: '4 porciones',
    precio500: 7500,
    precio1kg: 7500,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776192191/bikitchen/individuales/lentejas_verduras.jpg'
  },
  {
    id: 'garbanzos-verduras',
    nombre: 'Garbanzos con verduras',
    descripcion: '4 porciones',
    precio500: 7500,
    precio1kg: 7500,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776192192/bikitchen/individuales/garbanzos_verduras.jpg'
  },
  {
    id: 'frijoles-blancos-verduras',
    nombre: 'Frijoles blancos con verduras',
    descripcion: '4 porciones',
    precio500: 7950,
    precio1kg: 7950,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776192193/bikitchen/individuales/frijoles_blancos_verduras.jpg'
  },
  {
    id: 'canelones-espinaca-queso-veg',
    nombre: 'Canelones rellenos de espinaca y queso en salsa blanca',
    descripcion: '4 porciones',
    precio500: 13500,
    precio1kg: 13500,
    categoria: 'Vegetariano',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776192193/bikitchen/individuales/canelones_espinaca_queso_veg.jpg'
  },

  // ============================================================
  // LEGUMINOSAS (4 tazas / 6 tazas)
  // ============================================================
  {
    id: 'frijoles-rojos-arreglados',
    nombre: 'Frijoles rojos arreglados',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5500,
    precio1kg: 8250,
    categoria: 'Leguminosas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776193836/bikitchen/individuales/frijoles_rojos_arreglados.jpg'
  },
  {
    id: 'chili-con-carne',
    nombre: 'Chili con carne',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8500,
    precio1kg: 12750,
    categoria: 'Leguminosas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776193839/bikitchen/individuales/chili_con_carne.jpg'
  },
  {
    id: 'cubaces-carne-cerdo-pollo',
    nombre: 'Cubaces con carne de cerdo o pollo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9850,
    precio1kg: 13750,
    categoria: 'Leguminosas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776193841/bikitchen/individuales/cubaces_carne_cerdo_pollo.jpg'
  },
  {
    id: 'frijoles-blancos-carne-cerdo-pollo',
    nombre: 'Frijoles blancos con carne de cerdo o pollo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9500,
    precio1kg: 14250,
    categoria: 'Leguminosas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776193842/bikitchen/individuales/frijoles_blancos_carne_cerdo_pollo.jpg'
  },
  {
    id: 'garbanzos-pollo-cerdo',
    nombre: 'Garbanzos con pollo o carne de cerdo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9500,
    precio1kg: 14250,
    categoria: 'Leguminosas',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776193844/bikitchen/individuales/garbanzos_pollo_cerdo.jpg'
  },

  // ============================================================
  // DESAYUNOS (4 porciones)
  // ============================================================
  {
    id: 'desayuno-gallo-pinto',
    nombre: 'Gallo pinto',
    descripcion: '4 porciones',
    precio500: 6000,
    precio1kg: 6000,
    categoria: 'Desayunos',
    imagen: '/assets/individuales/gallo_pinto_premium.png'
  },
  {
    id: 'desayuno-omelet-espinaca-queso',
    nombre: 'Omelet con espinaca y queso',
    descripcion: '4 porciones',
    precio500: 8500,
    precio1kg: 8500,
    categoria: 'Desayunos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776393057/bikitchen/individuales/omelet_espinaca_queso.jpg'
  },
  {
    id: 'desayuno-omelet-queso-jamon',
    nombre: 'Omelet con queso y jamón',
    descripcion: '4 porciones',
    precio500: 8850,
    precio1kg: 8850,
    categoria: 'Desayunos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776393057/bikitchen/individuales/omelet_queso_jamon.jpg'
  },
  {
    id: 'desayuno-huevos-rancheros',
    nombre: 'Huevos rancheros',
    descripcion: '4 porciones',
    precio500: 5500,
    precio1kg: 5500,
    categoria: 'Desayunos',
    imagen: 'https://res.cloudinary.com/ddx6sns1g/image/upload/v1776393058/bikitchen/individuales/huevos_rancheros.jpg'
  },
  {
    id: 'desayuno-tortas-huevo-cebolla',
    nombre: 'Tortas de huevo con cebolla',
    descripcion: '4 porciones',
    precio500: 5500,
    precio1kg: 5500,
    categoria: 'Desayunos',
    imagen: '/assets/individuales/tortas_huevo_cebolla.png'
  },
  {
    id: 'desayuno-tostadas-francesas',
    nombre: 'Tostadas francesas con miel de maple',
    descripcion: '4 porciones',
    precio500: 9850,
    precio1kg: 9850,
    categoria: 'Desayunos',
    imagen: '/assets/individuales/tostadas_francesas_maple.png'
  },
  {
    id: 'desayuno-pancakes-miel',
    nombre: 'Pancakes con miel de maple',
    descripcion: '4 porciones',
    precio500: 10500,
    precio1kg: 10500,
    categoria: 'Desayunos',
    imagen: '/assets/individuales/pancakes_miel_maple.png'
  },
  {
    id: 'desayuno-huevos-tomate',
    nombre: 'Huevos con tomate',
    descripcion: '4 porciones',
    precio500: 5950,
    precio1kg: 5950,
    categoria: 'Desayunos',
    imagen: '/assets/individuales/huevos_con_tomate.png'
  },
  {
    id: 'desayuno-huevos-jamon',
    nombre: 'Huevos con jamón',
    descripcion: '4 porciones',
    precio500: 6300,
    precio1kg: 6300,
    categoria: 'Desayunos',
    imagen: '/assets/individuales/huevos_con_jamon.png'
  },
  {
    id: 'desayuno-huevos-cebolla',
    nombre: 'Huevos con cebolla',
    descripcion: '4 porciones',
    precio500: 5850,
    precio1kg: 5850,
    categoria: 'Desayunos',
    imagen: '/assets/individuales/huevos_con_cebolla.png'
  }
];

// ─── SEO: slug helpers ───────────────────────────────────────────────────────

/** Convert a product name to a URL-safe slug */
export const getProductSlug = (nombre) =>
  nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip accent marks (á→a, é→e …)
    .replace(/[^a-z0-9\s]/g, '')       // keep only letters, digits, spaces
    .trim()
    .replace(/\s+/g, '-');             // spaces → hyphens

/** Lookup map: slug → product object (excludes admin test products) */
export const productsBySlug = Object.fromEntries(
  individualesData
    .filter(p => !p.id?.includes('test'))
    .map(p => [getProductSlug(p.nombre), p])
);

// ─── Upsell suggestions (imported in CartDrawer to avoid loading full array) ─

export const UPSELL_INDIVIDUAL_PRODUCTS = [
  { id: 'ensalada-coleslaw',     nombre: 'Ensalada coleslaw',     categoria: 'Ensaladas', precio500: 6850 },
  { id: 'desayuno-gallo-pinto',  nombre: 'Gallo pinto',           categoria: 'Desayunos', precio500: 6000 },
  { id: 'ensalada-mediterranea', nombre: 'Ensalada mediterránea', categoria: 'Ensaladas', precio500: 7450 },
];
