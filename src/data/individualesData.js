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
    imagen: 'https://images.unsplash.com/photo-1624726175512-19b9baf9fbd1?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tortas-carne-salsa',
    nombre: 'Tortas de carne en salsa',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Res',
    imagen: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'carne-mechada-res',
    nombre: 'Carne mechada de res',
    descripcion: '',
    precio500: 9350,
    precio1kg: 17800,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/6210876/pexels-photo-6210876.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'taco-alambre',
    nombre: 'Taco alambre',
    descripcion: '',
    precio500: 9550,
    precio1kg: 18150,
    categoria: 'Res',
    imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fajitas-lomo-encebolladas',
    nombre: 'Fajitas de lomo de res encebolladas',
    descripcion: '',
    precio500: 8800,
    precio1kg: 16800,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/7613568/pexels-photo-7613568.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'gordon-bleu-lomo-salsa-hongos',
    nombre: 'Gordon bleu lomo con salsa de hongos',
    descripcion: '',
    precio500: 14500,
    precio1kg: 27550,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/5718071/pexels-photo-5718071.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'fajitas-lomo-salsa-vino',
    nombre: 'Fajitas de lomo en salsa de vino',
    descripcion: '',
    precio500: 9550,
    precio1kg: 18150,
    categoria: 'Res',
    imagen: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'carne-molida-arreglada-salsa',
    nombre: 'Carne molida arreglada en salsa',
    descripcion: '',
    precio500: 7950,
    precio1kg: 15100,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/4871111/pexels-photo-4871111.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'fajitas-salsa-strogonoff',
    nombre: 'Fajitas en salsa strogonoff',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/6287525/pexels-photo-6287525.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'fajitas-lomo-chimichurri',
    nombre: 'Fajitas de lomo con chimichurri',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fajitas-hongos-salsa-blanca',
    nombre: 'Fajitas con hongos en salsa blanca',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/3535383/pexels-photo-3535383.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'bistec-lomo-encebollado',
    nombre: 'Bistec de lomo encebollado',
    descripcion: '',
    precio500: 8800,
    precio1kg: 16800,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/8697540/pexels-photo-8697540.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'trocitos-lomo-salsa-demiglase',
    nombre: 'Trocitos de lomo en salsa demiglase',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'fajitas-lomo-salsa-pimienta',
    nombre: 'Fajitas de lomo en salsa de pimienta',
    descripcion: '',
    precio500: 10350,
    precio1kg: 19665,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/769289/pexels-photo-769289.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: 'fajitas-lomo-salsa-criolla-tomate',
    nombre: 'Fajitas de lomo en salsa criolla de tomate',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Res',
    imagen: 'https://images.pexels.com/photos/6941010/pexels-photo-6941010.jpeg?auto=compress&cs=tinysrgb&w=800'
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
    imagen: 'https://cdn.pixabay.com/photo/2017/06/02/18/24/pork-2369174_1280.jpg'
  },
  {
    id: 'pulled-pork',
    nombre: 'Pulled pork',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2016/02/23/17/52/pork-1216039_1280.jpg'
  },
  {
    id: 'trocitos-cerdo-salsa-bbq',
    nombre: 'Trocitos de cerdo en salsa BBQ',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2017/03/27/14/56/bbq-2178720_1280.jpg'
  },
  {
    id: 'trocitos-cerdo-salsa-pina',
    nombre: 'Trocitos de cerdo salsa piña',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2017/09/16/15/23/barbecue-2754161_1280.jpg'
  },
  {
    id: 'trocitos-cerdo-naranja',
    nombre: 'Trocitos de cerdo a la naranja',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2016/11/21/14/33/orange-1840782_1280.jpg'
  },
  {
    id: 'trocitos-cerdo-salsa-criolla',
    nombre: 'Trocitos de cerdo en salsa criolla',
    descripcion: '',
    precio500: 8500,
    precio1kg: 16150,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2019/06/21/03/32/stew-4292434_1280.jpg'
  },
  {
    id: 'cerdo-salsa-chipotle',
    nombre: 'Cerdo en salsa chipotle',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2019/01/08/21/57/chipotle-3923589_1280.jpg'
  },
  {
    id: 'trocitos-cerdo-chimichurri',
    nombre: 'Trocitos de cerdo con chimichurri',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2019/09/28/16/39/meat-4501359_1280.jpg'
  },
  {
    id: 'bistec-cerdo-encebollado',
    nombre: 'Bistec de cerdo encebollado',
    descripcion: '',
    precio500: 8850,
    precio1kg: 16800,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2017/08/11/02/15/pork-2629074_1280.jpg'
  },
  {
    id: 'cerdo-mechado-salsa-tomate',
    nombre: 'Cerdo mechado en salsa de tomate',
    descripcion: '',
    precio500: 7800,
    precio1kg: 14850,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2020/01/22/08/40/stew-4780421_1280.jpg'
  },
  {
    id: 'cerdo-salsa-curry',
    nombre: 'Cerdo en salsa de curry',
    descripcion: '',
    precio500: 8850,
    precio1kg: 16800,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2016/02/13/12/26/curry-1196581_1280.jpg'
  },
  {
    id: 'cerdo-salsa-teriyaki',
    nombre: 'Cerdo en salsa teriyaki',
    descripcion: '',
    precio500: 8850,
    precio1kg: 16800,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2020/12/06/17/05/food-5800479_1280.jpg'
  },
  {
    id: 'cerdo-salsa-mostaza',
    nombre: 'Cerdo en salsa de mostaza',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2018/08/29/15/11/pork-3646441_1280.jpg'
  },
  {
    id: 'trocitos-cerdo-fritos',
    nombre: 'Trocitos de cerdo fritos',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2016/03/05/19/02/fried-pork-1239430_1280.jpg'
  },
  {
    id: 'trocitos-cerdo-salsa-agridulce',
    nombre: 'Trocitos de cerdo en salsa agridulce',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2018/11/09/21/41/sweet-and-sour-pork-3804539_1280.jpg'
  },
  {
    id: 'trocitos-cerdo-salsa-pimienta',
    nombre: 'Trocitos de cerdo en salsa de pimienta',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2016/04/02/00/42/pepper-1302243_1280.jpg'
  },
  {
    id: 'cochinita-pibil',
    nombre: 'Cochinita pibil',
    descripcion: '',
    precio500: 8950,
    precio1kg: 17000,
    categoria: 'Cerdo',
    imagen: 'https://cdn.pixabay.com/photo/2018/01/07/19/41/food-3061923_1280.jpg'
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
    imagen: 'https://images.unsplash.com/photo-1485921325833-c519f76c4927?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tilapia-salsa-mediterranea',
    nombre: 'Filet de tilapia en salsa mediterránea',
    descripcion: '',
    precio500: 10500,
    precio1kg: 19950,
    categoria: 'Pescado',
    imagen: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tilapia-salsa-roja',
    nombre: 'Filet de tilapia en salsa roja',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'deditos-tilapia-empanizadas',
    nombre: 'Deditos de tilapia empanizadas',
    descripcion: '',
    precio500: 10350,
    precio1kg: 19650,
    categoria: 'Pescado',
    imagen: 'https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tilapia-perejil-ajo',
    nombre: 'Filet de tilapia con perejil y ajo',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tilapia-menieur',
    nombre: 'Filet de tilapia a la menieur',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tilapia-empanizado',
    nombre: 'Filet de tilapia empanizado',
    descripcion: '',
    precio500: 10350,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tilapia-salsa-espinaca',
    nombre: 'Filet de tilapia en salsa espinaca',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tilapia-salsa-culantro',
    nombre: 'Filet de tilapia en salsa de culantro',
    descripcion: '',
    precio500: 9950,
    precio1kg: 18900,
    categoria: 'Pescado',
    imagen: 'https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'arroz-con-pollo',
    nombre: 'Arroz con pollo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9950,
    precio1kg: 14950,
    categoria: 'Arroces',
    imagen: 'https://images.unsplash.com/photo-1633321702518-7feccafb94d5?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'arroz-con-cerdo',
    nombre: 'Arroz con cerdo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9950,
    precio1kg: 14950,
    categoria: 'Arroces',
    imagen: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'arroz-cantones',
    nombre: 'Arroz estilo cantones',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9950,
    precio1kg: 14950,
    categoria: 'Arroces',
    imagen: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'arroz-jardinera',
    nombre: 'Arroz a la jardinera',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7200,
    precio1kg: 10800,
    categoria: 'Arroces',
    imagen: 'https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'arroz-palmito-vegetales',
    nombre: 'Arroz con palmito y vegetales',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9000,
    precio1kg: 13500,
    categoria: 'Arroces',
    imagen: 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'arroz-blanco',
    nombre: 'Arroz blanco',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5000,
    precio1kg: 7500,
    categoria: 'Arroces',
    imagen: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'olla-de-carne',
    nombre: 'Olla de carne',
    descripcion: '4 tazas / 6 tazas',
    precio500: 12000,
    precio1kg: 18000,
    categoria: 'Sopas',
    imagen: 'https://images.unsplash.com/photo-1594756202469-9ff9799b2e4e?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'sopa-de-pollo',
    nombre: 'Sopa de pollo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 12000,
    precio1kg: 18000,
    categoria: 'Sopas',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'sopa-albondigas',
    nombre: 'Sopa albóndigas',
    descripcion: '4 tazas / 6 tazas',
    precio500: 13000,
    precio1kg: 19500,
    categoria: 'Sopas',
    imagen: 'https://images.unsplash.com/photo-1529928520614-7c76e2d99120?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'sopa-negra-huevo',
    nombre: 'Sopa negra con huevo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 11400,
    precio1kg: 17100,
    categoria: 'Sopas',
    imagen: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'crema-brocoli',
    nombre: 'Crema brocoli',
    descripcion: '4 tazas / 6 tazas',
    precio500: 13000,
    precio1kg: 19500,
    categoria: 'Sopas',
    imagen: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1503766580805-931a4d5ad1a7?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'canelones-pollo-salsa-roja',
    nombre: 'Canelones rellenos con pollo en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'canelones-espinaca-queso-salsa-blanca',
    nombre: 'Canelones rellenos de espinaca y queso en salsa blanca',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1611270629569-8b357cb88da9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'canelones-queso-salsa-roja',
    nombre: 'Canelones rellenos con queso en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1587740908075-9e245070dfaa?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'spaghetti-bolonesa-carne',
    nombre: 'Spaghetti a la boloñesa con carne',
    descripcion: '4 porciones / 8 porciones',
    precio500: 9400,
    precio1kg: 18500,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'spaghetti-salsa-blanca-pollo',
    nombre: 'Spaguetti en salsa blanca con pollo',
    descripcion: '4 porciones / 8 porciones',
    precio500: 12800,
    precio1kg: 24350,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'spaghetti-pollo-pomodoro',
    nombre: 'Spaguettis con pollo en salsa pomodoro',
    descripcion: '4 porciones / 8 porciones',
    precio500: 8000,
    precio1kg: 15200,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'spaghetti-pesto-pollo',
    nombre: 'Spaguettis al pesto con pollo',
    descripcion: '4 porciones / 8 porciones',
    precio500: 10950,
    precio1kg: 20850,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'fetucchinni-alfredo',
    nombre: 'Fetucchinni alfredo',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11500,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'lasagna-pollo-salsa-roja',
    nombre: 'Lasagna de pollo en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'lasagna-carne-salsa-roja',
    nombre: 'Lasagna de carne en salsa roja',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11400,
    precio1kg: 21650,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'lasagna-pollo-salsa-blanca',
    nombre: 'Lasagna de pollo salsa blanca',
    descripcion: '4 porciones / 8 porciones',
    precio500: 12800,
    precio1kg: 24350,
    categoria: 'Pastas',
    imagen: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pastel-maduro-frijoles-queso',
    nombre: 'Pastel de maduro con frijoles y queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 9500,
    precio1kg: 18050,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pastel-papa-carne-queso',
    nombre: 'Pastel de papa carne y queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 11000,
    precio1kg: 21000,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pastel-yuca-carne',
    nombre: 'Pastel de yuca con carne',
    descripcion: '4 porciones / 8 porciones',
    precio500: 10500,
    precio1kg: 19950,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'arroz-palmito-salsa-blanca-gratinado',
    nombre: 'Arroz con palmito en salsa blanca gratinado',
    descripcion: '4 porciones / 8 porciones',
    precio500: 12500,
    precio1kg: 23000,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'enyucados-carne-molida',
    nombre: 'Enyucados con carne molida',
    descripcion: '4 porciones / 8 porciones',
    precio500: 7500,
    precio1kg: 14800,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tortas-yuca',
    nombre: 'Tortas de yuca',
    descripcion: '4 porciones / 8 porciones',
    precio500: 7500,
    precio1kg: 14250,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tortas-maduro-queso',
    nombre: 'Tortas maduro con queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 7500,
    precio1kg: 14250,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'croquetas-papa-jamon-queso',
    nombre: 'Croquetas de papa con jamón y queso',
    descripcion: '4 porciones / 8 porciones',
    precio500: 7850,
    precio1kg: 15700,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'platanos-maduros-almibar',
    nombre: 'Plátanos maduros en almíbar',
    descripcion: '4 porciones / 8 porciones',
    precio500: 5850,
    precio1kg: 11700,
    categoria: 'Pasteles',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'picadillo-papa-frijoles-blancos-carne',
    nombre: 'Picadillo de papa con frijoles blancos y carne mechada',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7850,
    precio1kg: 11650,
    categoria: 'Picadillos',
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'picadillo-papa-atun',
    nombre: 'Picadillo papa con atún',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7850,
    precio1kg: 11650,
    categoria: 'Picadillos',
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'picadillo-papa-carne-molida',
    nombre: 'Picadillo de papa con carne molida',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7850,
    precio1kg: 11650,
    categoria: 'Picadillos',
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'picadillo-chayote-carne',
    nombre: 'Picadillo chayote con carne',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5850,
    precio1kg: 8650,
    categoria: 'Picadillos',
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'picadillo-mixto-vegetales',
    nombre: 'Picadillo mixto de vegetales',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5850,
    precio1kg: 8650,
    categoria: 'Picadillos',
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'guiso-ayote-tierno-maiz',
    nombre: 'Guiso de ayote tierno con maíz',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5850,
    precio1kg: 8650,
    categoria: 'Picadillos',
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'picadillo-chayote-maiz-dulce',
    nombre: 'Picadillo chayote con maíz dulce',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5850,
    precio1kg: 8650,
    categoria: 'Picadillos',
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'picadillo-vainica-zanahoria',
    nombre: 'Picadillo vainica y zanahoria',
    descripcion: '4 tazas / 6 tazas',
    precio500: 6500,
    precio1kg: 9750,
    categoria: 'Picadillos',
    imagen: 'https://images.unsplash.com/photo-1574484284002-952d92456975?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pure-papa',
    nombre: 'Puré de papa',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7500,
    precio1kg: 11250,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1585672840563-f2af2ced55c9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pure-camote',
    nombre: 'Puré camote',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7500,
    precio1kg: 11250,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1585672840563-f2af2ced55c9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'yuca-frita',
    nombre: 'Yuca frita',
    descripcion: '4 tazas / 6 tazas',
    precio500: 5500,
    precio1kg: 8250,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1585672840563-f2af2ced55c9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'papitas-salteadas-romero',
    nombre: 'Papitas salteadas al romero',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7500,
    precio1kg: 11250,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'barbudos',
    nombre: 'Barbudos',
    descripcion: '6 unidades / 12 unidades',
    precio500: 8500,
    precio1kg: 11500,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'coliflor-envuelta-huevo',
    nombre: 'Coliflor envuelta en huevo',
    descripcion: '6 unidades / 12 unidades',
    precio500: 8850,
    precio1kg: 17500,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'chayote-envuelto-huevo',
    nombre: 'Chayote envuelto en huevo',
    descripcion: '6 unidades / 12 unidades',
    precio500: 6000,
    precio1kg: 12000,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tortas-espinaca-huevo',
    nombre: 'Tortas de espinaca con huevo',
    descripcion: '6 unidades / 12 unidades',
    precio500: 6150,
    precio1kg: 12300,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'zuchinnis-rellenos-pollo',
    nombre: 'Zuchinnis rellenos con pollo bañados en salsa criolla',
    descripcion: '4 unidades / 6 unidades',
    precio500: 9850,
    precio1kg: 14700,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'zuchinnis-rellenos-carne',
    nombre: 'Zuchinnis rellenos con carne molida bañados en salsa criolla',
    descripcion: '4 unidades / 6 unidades',
    precio500: 9850,
    precio1kg: 14700,
    categoria: 'Vegetales',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'estofado-res-papa-zanahoria',
    nombre: 'Estofado de carne res con papa y zanahoria',
    descripcion: '4 tazas / 6 tazas',
    precio500: 10500,
    precio1kg: 15750,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'estofado-cerdo-papa-zanahoria',
    nombre: 'Estofado de carne de cerdo con papa y zanahoria',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8850,
    precio1kg: 13250,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'trocitos-cerdo-platano-maduro',
    nombre: 'Trocitos de cerdo con platano maduro',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8950,
    precio1kg: 13400,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'chorizo-con-papas',
    nombre: 'Chorizo con papas',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7950,
    precio1kg: 11900,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pollo-papas-achiotado',
    nombre: 'Pollo con papas achiotado',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8950,
    precio1kg: 13400,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'salchichas-con-papas',
    nombre: 'Salchichas con papas',
    descripcion: '4 tazas / 6 tazas',
    precio500: 7950,
    precio1kg: 11900,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'flautas-pollo-salsa-roja-queso',
    nombre: 'Flautas de pollo con salsa roja y queso',
    descripcion: '4 porciones',
    precio500: 11400,
    precio1kg: 11400,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'burritos-pollo',
    nombre: 'Burritos de pollo (frijoles, queso y proteina)',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9400,
    precio1kg: 14000,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'burritos-carne',
    nombre: 'Burritos de carne (frijoles,queso y proteina)',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9400,
    precio1kg: 14000,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'quesadillas-pollo',
    nombre: 'Quesadillas de pollo (queso y pollo)',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8950,
    precio1kg: 13400,
    categoria: 'Compuestos',
    imagen: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ensalada-mediterranea',
    nombre: 'Ensalada mediterránea',
    descripcion: '4 porciones / 6 porciones',
    precio500: 7450,
    precio1kg: 11150,
    categoria: 'Ensaladas',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ensalada-rusa',
    nombre: 'Ensalada rusa',
    descripcion: '4 porciones / 6 porciones',
    precio500: 7500,
    precio1kg: 12000,
    categoria: 'Ensaladas',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ensalada-papa',
    nombre: 'Ensalada de papa',
    descripcion: '4 porciones / 6 porciones',
    precio500: 7500,
    precio1kg: 12000,
    categoria: 'Ensaladas',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ensalada-caracolitos-atun',
    nombre: 'Ensalada de caracolitos con atun',
    descripcion: '4 porciones / 6 porciones',
    precio500: 6500,
    precio1kg: 11500,
    categoria: 'Ensaladas',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'escabeche-verduras',
    nombre: 'Escabeche de verduras',
    descripcion: '4 porciones / 6 porciones',
    precio500: 7450,
    precio1kg: 13500,
    categoria: 'Ensaladas',
    imagen: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'lasagna-espinaca-queso-salsa-blanca',
    nombre: 'Lasagna de espinaca y queso en salsa blanca',
    descripcion: '4 porciones',
    precio500: 12500,
    precio1kg: 12500,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pastel-maduro-frijol-queso-veg',
    nombre: 'Pastel de maduro, frijol y queso',
    descripcion: '4 porciones',
    precio500: 9500,
    precio1kg: 9500,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'pastel-papa-espinaca-soya',
    nombre: 'Pastel de papa con espinaca o carne de soya',
    descripcion: '4 porciones',
    precio500: 11000,
    precio1kg: 11000,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'tortas-lentejas',
    nombre: 'Tortas de lentejas (6 unidades)',
    descripcion: '4 porciones',
    precio500: 7200,
    precio1kg: 7200,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'garbanzos-curry-espinacas',
    nombre: 'Garbanzos al curry y espinacas',
    descripcion: '4 porciones',
    precio500: 6500,
    precio1kg: 6500,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'lentejas-verduras',
    nombre: 'Lentejas con verduras',
    descripcion: '4 porciones',
    precio500: 7500,
    precio1kg: 7500,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'garbanzos-verduras',
    nombre: 'Garbanzos con verduras',
    descripcion: '4 porciones',
    precio500: 7500,
    precio1kg: 7500,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'frijoles-blancos-verduras',
    nombre: 'Frijoles blancos con verduras',
    descripcion: '4 porciones',
    precio500: 7950,
    precio1kg: 7950,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'canelones-espinaca-queso-veg',
    nombre: 'Canelones rellenos de espinaca y queso en salsa blanca',
    descripcion: '4 porciones',
    precio500: 13500,
    precio1kg: 13500,
    categoria: 'Vegetariano',
    imagen: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'chili-con-carne',
    nombre: 'Chili con carne',
    descripcion: '4 tazas / 6 tazas',
    precio500: 8500,
    precio1kg: 12750,
    categoria: 'Leguminosas',
    imagen: 'https://images.unsplash.com/photo-1504544750208-dc0358e63f7f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'cubaces-carne-cerdo-pollo',
    nombre: 'Cubaces con carne de cerdo o pollo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9850,
    precio1kg: 13750,
    categoria: 'Leguminosas',
    imagen: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'frijoles-blancos-carne-cerdo-pollo',
    nombre: 'Frijoles blancos con carne de cerdo o pollo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9500,
    precio1kg: 14250,
    categoria: 'Leguminosas',
    imagen: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'garbanzos-pollo-cerdo',
    nombre: 'Garbanzos con pollo o carne de cerdo',
    descripcion: '4 tazas / 6 tazas',
    precio500: 9500,
    precio1kg: 14250,
    categoria: 'Leguminosas',
    imagen: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'
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
    imagen: 'https://images.unsplash.com/photo-1533777324565-a040eb52fac1?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-omelet-espinaca-queso',
    nombre: 'Omelet con espinaca y queso',
    descripcion: '4 porciones',
    precio500: 8500,
    precio1kg: 8500,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-omelet-queso-jamon',
    nombre: 'Omelet con queso y jamón',
    descripcion: '4 porciones',
    precio500: 8850,
    precio1kg: 8850,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-huevos-rancheros',
    nombre: 'Huevos rancheros',
    descripcion: '4 porciones',
    precio500: 5500,
    precio1kg: 5500,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-tortas-huevo-cebolla',
    nombre: 'Tortas de huevo con cebolla',
    descripcion: '4 porciones',
    precio500: 5500,
    precio1kg: 5500,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-tostadas-francesas',
    nombre: 'Tostadas francesas con miel de maple',
    descripcion: '4 porciones',
    precio500: 9850,
    precio1kg: 9850,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-pancakes-miel',
    nombre: 'Pancakes con miel de maple',
    descripcion: '4 porciones',
    precio500: 10500,
    precio1kg: 10500,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1495214783159-3503fd1b572d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-huevos-tomate',
    nombre: 'Huevos con tomate',
    descripcion: '4 porciones',
    precio500: 5950,
    precio1kg: 5950,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-huevos-jamon',
    nombre: 'Huevos con jamón',
    descripcion: '4 porciones',
    precio500: 6300,
    precio1kg: 6300,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desayuno-huevos-cebolla',
    nombre: 'Huevos con cebolla',
    descripcion: '4 porciones',
    precio500: 5850,
    precio1kg: 5850,
    categoria: 'Desayunos',
    imagen: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
  }
];
