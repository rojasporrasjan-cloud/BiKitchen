/**
 * Las categorías de gastos: las mismas de la lista que mandó Gina (9 oct 2026).
 * `id` es lo que se guarda en Firestore: NO cambiarlo (los gastos viejos lo usan).
 * El nombre y el ejemplo sí se pueden cambiar sin miedo.
 *
 * `sube`: true si el gasto sube y baja con lo que se vende (comida, empaque,
 * choferes, gas). Sirve para el punto de equilibrio.
 */
export const CATEGORIAS_GASTO = [
    { id: 'carnes', nombre: 'Carnes', emoji: '🥩', ejemplo: 'Pollo 20 kg', sube: true },
    { id: 'verduras', nombre: 'Verduras', emoji: '🥦', ejemplo: 'Feria, verdura de la semana', sube: true },
    { id: 'mayca', nombre: 'MAYCA e insumos', emoji: '🛒', ejemplo: 'Arroz, aceite, especias', sube: true },
    { id: 'empaques', nombre: 'Empaques', emoji: '📦', ejemplo: 'Tazas, bolsas, etiquetas', sube: true },
    { id: 'gas', nombre: 'Gas', emoji: '🔥', ejemplo: 'Cilindro', sube: true },
    { id: 'choferes', nombre: 'Choferes y mensajerías', emoji: '🚚', ejemplo: 'Ruta de Kenneth', sube: true },
    { id: 'anuncios', nombre: 'Anuncios', emoji: '📣', ejemplo: 'Meta (Facebook e Instagram)' },
    { id: 'influencers', nombre: 'Influencers', emoji: '⭐', ejemplo: 'Comida para influencer' },
    { id: 'salarios', nombre: 'Salarios', emoji: '👩‍🍳', ejemplo: 'Planilla de la semana' },
    { id: 'servicios', nombre: 'Alquiler y servicios', emoji: '🏠', ejemplo: 'Alquiler, luz, agua' },
    { id: 'apps', nombre: 'Apps e internet', emoji: '📱', ejemplo: 'Kommo, internet' },
    { id: 'prestamos', nombre: 'Préstamos', emoji: '🏦', ejemplo: 'Cuota del préstamo' },
    { id: 'gasolina', nombre: 'Gasolina', emoji: '⛽', ejemplo: 'Gasolina del carro' },
    { id: 'otros', nombre: 'Otros', emoji: '➕', ejemplo: 'Escribí qué fue' }
];

export const FORMAS_DE_PAGO = ['SINPE', 'Efectivo', 'Tarjeta', 'Transferencia'];

/** El monto más grande que se acepta de una vez (evita un cero de más: ₡4 500 000 en vez de ₡450 000). */
export const MONTO_MAXIMO = 10_000_000;

export const categoriaDe = (id) => CATEGORIAS_GASTO.find(c => c.id === id) || CATEGORIAS_GASTO.at(-1);
