/**
 * Lo que el cronograma del panel muestra además de los envíos automáticos
 * (esos viven en TIPOS_DE_ENVIO de registroDeEnvios.js con su horario).
 *
 * Jan, 8 oct 2026: "todo tiene que estar en nuestro panel admin: qué plantilla,
 * qué bot está activo, a qué horas se va a mandar el mensaje".
 *
 * Al cambiar algo en Kommo (un bot nuevo, una plantilla aprobada), anotarlo acá
 * y en docs/KOMMO_TRASPASO.md.
 */

/** Funciones que corren solas y NO mandan WhatsApp. */
export const PROCESOS_DEL_SISTEMA = [
    { id: 'kommo-sync', label: 'Conexión con Kommo', horario: '*/10 * * * *', detalle: 'Lee los chats y arma la ficha de cada cliente (no manda nada).' },
    { id: 'ventas-por-envio', label: 'Cuánto vendió cada mensaje', horario: '30 5 * * *', detalle: 'Calcula las ventas de los envíos (no manda nada).' }
];

/** Bots que viven dentro de Kommo, con su propio disparador (no los prende el panel). */
export const BOTS_DE_KOMMO = [
    { nombre: 'Bot- Bievenida', bot: '50218', cuando: 'Cada chat nuevo (lead creado)', estado: 'Activo en Kommo', detalle: 'Primer mensaje a quien escribe por primera vez.' },
    { nombre: 'Seguimiento', bot: '53594', cuando: 'Al mover el lead de etapa', estado: 'Activo en Kommo', detalle: 'Lo dispara el equipo al mover el lead.' }
];

/** Plantillas aprobadas por Meta, con bot, que hoy se mandan a mano desde Listas de Difusión. */
export const PLANTILLAS_A_MANO = [
    { nombre: 'Pasate al mensual', plantilla: 'pasate_al_mensual_desayunos', bot: '117990', clase: 'Marketing', para: 'A quien compra semanal: desayunos de regalo el primer mes (también sale solo los martes, ver arriba)' },
    { nombre: 'Menú de la semana — Keto', plantilla: 'menu_semana_keto', bot: '117996', clase: 'Marketing', para: 'Clientes keto' },
    { nombre: 'Menú de la semana — Bajo en calorías', plantilla: 'menu_semana_bajo_calorias', bot: '117998', clase: 'Marketing', para: 'Clientes bajo en calorías' },
    { nombre: 'Menú de la semana — Casaditos', plantilla: 'menu_semana_casaditos', bot: '118000', clase: 'Marketing', para: 'Clientes de casaditos' },
    { nombre: 'Menú de la semana — Familiar', plantilla: 'menu_semana_familiar', bot: '118002', clase: 'Marketing', para: 'Clientes de packs familiares (link a /packs)' },
    { nombre: 'Te extrañamos', plantilla: 'te_extranamos', bot: '118004', clase: 'Marketing', para: 'Sin pedir hace 2–3 meses: "¿qué no te gustó?"' },
    { nombre: 'Promo proteínas (miércoles)', plantilla: 'promo_miercoles_proteinas_foto', bot: '117994', clase: 'Marketing', para: '5 proteínas de 500 g + 2 guarniciones de regalo (con imagen)' },
    { nombre: 'Promo HOY5', plantilla: 'promo_hoy5_martes_6_oct', bot: '117648', clase: 'Marketing', para: '5 % de descuento (fue solo el 6 oct)' },
    { nombre: 'Two pack: renovación con regalía', plantilla: 'two_pack_renovacion_regalia', bot: '117650', clase: 'Marketing', para: 'Desayunos de regalo si renuevan en octubre' }
];

/** Lo que Jan aprobó y todavía se está haciendo (8 oct 2026). */
export const EN_CONSTRUCCION = [
    { nombre: 'Bot de bienvenida mejorado', detalle: 'En segundos: precios, link a planes, días, zonas y "¿qué buscás?". El texto está en docs/BIENVENIDA_PARA_GINA.md: falta que Gina lo apruebe.' },
    { nombre: 'Volver a invitar al 10 %', detalle: 'Plantilla nueva con 10 % (la aprobada dice 15 %).' },
    { nombre: 'Renovar antes', detalle: 'Una semana antes de la última entrega, además del día final. Necesita plantilla nueva.' },
    { nombre: 'Ofrecer cenas, desayunos e individuales al confirmar', detalle: 'Para que cada cliente lleve más. Necesita plantilla nueva.' }
]

/** Costo aproximado por mensaje (Meta, Costa Rica). Servicio dentro de 24 h es gratis. */
export const COSTO_POR_CLASE = { Marketing: 'US$0,074 c/u (cuenta en el tope de US$200 al mes)', Servicio: 'Más barato que marketing; gratis si el cliente escribió en las últimas 24 h' };
