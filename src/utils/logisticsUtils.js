import { esIndividualEnLaHoja } from './packClassification';
import { porcionesDelPlato } from './porcionesDelPedido';

// Utilidades de logística para BiKitchen Food
// - Normalización de pedidos al modelo de platos/ingredientes
// - Asignación de tareas de empaquetado y cocina
// - Generación de estructuras para hojas de cocina y empaquetado

/**
 * Estructura esperada de "pedido":
 * {
 *   id: string,
 *   cliente: string,
 *   telefono?: string,
 *   direccion?: string,
 *   tipoMenu: string, // Full Pack, Keto, etc.
 *   cantidadMenus: number,
 *   fecha_entrega: string, // YYYY-MM-DD
 *   observaciones?: string,
 *   incluyeDesayuno?: boolean,
 *   // platos del menú ya resueltos contra el catálogo semanal
 *   platos: [
 *     {
 *       numero: 1 | 2 | 3 | 4 | 5,
 *       proteina: { nombre: string, gramosPorPorcion: number },
 *       carbo: { nombre: string, unidad: 'g' | 'taza', cantidadPorPorcion: number },
 *       vegetal: { nombre: string, unidad: 'g' | 'taza', cantidadPorPorcion: number }
 *     }
 *   ]
 * }
 *
 * Estructura esperada de "menus" (catálogo semanal):
 * {
 *   [tipoMenu: string]: {
 *     platos: [ ... misma estructura que pedido.platos ... ]
 *   }
 * }
 */

// --------- Helpers generales ---------

export function isTaza(value) {
  // Regla de negocio: 1, 2, 3 (y fracciones tipo 0.5) son tazas; 120, 150, 200, 300 son gramos
  // En esta utilidad asumimos que la unidad ya viene marcada en el objeto (g | taza),
  // pero dejamos este helper por si hace falta interpretar valores sueltos.
  if (typeof value !== 'number') return false;
  return value <= 5; // heurística simple
}

export function gramosDesdeTazas(tazas, gramosPorTaza = 250) {
  return (tazas || 0) * gramosPorTaza;
}

/**
 * Texto que nombra un Two Pack, escriba quien escriba.
 *
 * Cada fuente lo escribe distinto, y si la busqueda falla el pedido se cocina
 * como UN pack: al cliente le llega la mitad de lo que pago.
 *   checkout de la web  -> categoryLabel "Two Pack"
 *   Excel de Gina       -> "TWO PACK, CON DESAYUNOS" en OBSERVACIONES
 *   catalogo            -> "Plan Parejas" (packsData.js)
 *
 * OJO: "2 pack" queda fuera a proposito. En los chats "2 pack de 3 proteinas"
 * significa dos unidades de un individual, no un pack para dos personas.
 */
const TWO_PACK_TEXTO = /two[\s._-]*pack|(?:plan|pack)\s*(?:para\s*)?parejas?/i;

export function detectIsTwoPack(order) {
  if (!order) return false;
  const dice = (val) => TWO_PACK_TEXTO.test(String(val || ''));

  if (order.categoria === 'two_pack' || order.category === 'two_pack') return true;

  // Las observaciones cuentan: Gina escribe "TWO PACK" ahi, no en el nombre del pack.
  if ([order.categoryLabel, order.plan, order.tipoMenu,
       order.observaciones, order.notas, order.details?.notes].some(dice)) return true;

  const items = Array.isArray(order.items) ? order.items : (Array.isArray(order.menu) ? order.menu : []);
  return items.some(item =>
    item.category === 'two_pack'
    || [item.categoryLabel, item.nombre, item.planLabel,
        item.desc, item.descripcion, item.plan].some(dice)
  );
}

// --------- Normalización desde el formato actual de Firestore ---------

/**
 * Convierte los documentos actuales de la colección "pedidos" al modelo
 * normalizado de platos/ingredientes usado por el resto de utilidades.
 *
 * Formato de entrada típico (lo que guardamos hoy en Firestore):
 * {
 *   cliente, telefono, correo, direccion,
 *   plan, fecha_entrega, observaciones,
 *   incluyeDesayuno?,
 *   menu: [
 *     {
 *       nombre,          // nombre comercial del plato o menú
 *       proteina: '150g',
 *       carbo: '1 taza' o '250g' o '3000',
 *       ensalada: '1 taza' o '80g',
 *       cantidad: number  // porciones o cantidad de ese ítem
 *     }
 *   ]
 * }
 */
export function mapPedidosFromLegacy(rawPedidos) {
  if (!Array.isArray(rawPedidos)) return [];

  const parseCantidadUnidad = (valorCrudo) => {
    if (!valorCrudo) return { unidad: 'g', cantidad: 0 };

    if (typeof valorCrudo === 'number') {
      // Si es número, asumimos la regla de negocio tazas vs gramos
      if (valorCrudo <= 5) return { unidad: 'taza', cantidad: valorCrudo };
      return { unidad: 'g', cantidad: valorCrudo };
    }

    const texto = String(valorCrudo).toLowerCase().trim();

    // Buscar número dentro del texto (ej: "150g", "1 taza", "0.5 taza")
    const match = texto.match(/([0-9]+(?:\.[0-9]+)?)/);
    const num = match ? parseFloat(match[1]) : 0;

    if (texto.includes('taza')) {
      return { unidad: 'taza', cantidad: num || 0 };
    }

    // Si menciona g o gr asumimos gramos explícitos
    if (texto.includes('g')) {
      return { unidad: 'g', cantidad: num || 0 };
    }

    // Sin unidad explícita: aplicar la misma heurística numérica
    if (num <= 5) return { unidad: 'taza', cantidad: num || 0 };
    return { unidad: 'g', cantidad: num || 0 };
  };

  return rawPedidos.map((p) => {
    const platosNormalizados = [];

    // Numeración CORRIDA para todo el pedido.
    // Antes cada ítem numeraba desde 1 por su cuenta, así que en un pedido con
    // un pack de 5 proteínas más un individual, el individual quedaba con el
    // número 2 y buildKitchenSheetData —que agrupa por número— lo fusionaba con
    // el plato 2 del pack: el individual desaparecía de la hoja y sus porciones
    // se sumaban a la proteína equivocada.
    let numeroPlato = 0;

    /**
     * Aplica los cambios de proteína/vegetal/carbo que pidió el cliente.
     *
     * Se guardaban en el pedido y se veían en el correo y en el detalle del
     * admin, pero la hoja de cocina NO los leía: el cocinero preparaba la
     * proteína original y el cliente recibía algo que no había pedido.
     *
     * Se muestra "original → nuevo" en vez de reemplazar el nombre a secas,
     * para que se vea de dónde salió el cambio y para que esa porción quede
     * separada en los totales: hay que prepararla distinto.
     *
     * Dos formatos conviven:
     *   por plato   → { proteinChanges: [{ dishNumber, newValue }], ... }
     *   por ítem    → { protein, vegetal, carbo }   (packs familiares, individuales)
     *
     * @param {string} original - nombre actual del ingrediente
     * @param {object} custom - item.customizations
     * @param {string} campo - 'protein' | 'vegetal' | 'carbo'
     * @param {number} nroLocal - número del plato DENTRO del ítem (1..n)
     */
    const aplicarCambio = (original, custom, campo, nroLocal) => {
      if (!original || !custom) return original;

      const listas = { protein: 'proteinChanges', vegetal: 'vegeChanges', carbo: 'carboChanges' };
      const porPlato = Array.isArray(custom[listas[campo]]) ? custom[listas[campo]] : [];
      const cambio = porPlato.find(c => Number(c?.dishNumber) === nroLocal);
      const nuevo = cambio ? (cambio.newValue || cambio.newProtein) : custom[campo];

      if (!nuevo || nuevo === original) return original;
      return `${original} → ${nuevo}`;
    };

    (p.menu || p.items || []).forEach((item) => {
      const custom = item.customizations || null;
      // Extraer gramos de size o nombre (ej: "500g" o "Pack 5 Proteínas (250g)")
      const sizeMatch = String(item.size || item.nombre || '').match(/([0-9]+(?:\.[0-9]+)?)\s*g/i);
      const protMatchLegacy = String(item.proteina || '').match(/([0-9]+(?:\.[0-9]+)?)/);
      const gramosPorcionProteina = sizeMatch ? parseFloat(sizeMatch[1]) : (protMatchLegacy ? parseFloat(protMatchLegacy[1]) : 0);

      const carboInfo = parseCantidadUnidad(item.carbo);
      const ensaladaInfo = parseCantidadUnidad(item.ensalada);

      // Si tiene un array de proteinas (nuevo formato Checkout)
      if (Array.isArray(item.proteinas) && item.proteinas.length > 0) {
        item.proteinas.forEach((protName, idx) => {
          const carboName = (Array.isArray(item.carbos) && item.carbos[idx]) ? item.carbos[idx] : null;
          const vegName = (Array.isArray(item.vegetales) && item.vegetales[idx]) ? item.vegetales[idx] : null;
          
          platosNormalizados.push({
            numero: ++numeroPlato,
            // Cuántas veces pidió este ítem el cliente (ej: 2 packs iguales)
            cantidad: Number(item.cantidad) || 1,
            // Medida tal como la escribió Gina ("1 kg", "4 unidades", "1 molde
            // desechable"). Si viene, manda sobre cualquier cálculo.
            medida: (Array.isArray(item.medidas) && item.medidas[idx]) || null,
            // Cuantas veces se hace ESTE plato dentro de un pack. Un pack
            // PERSONALIZADO puede llevar 2 de una receta y 4 de otra: sin esto
            // el plato habia que repetirlo en la lista, y la hoja imprimia
            // "Plato 1 Albondigas (1)" / "Plato 2 Albondigas (1)" en vez de una
            // sola linea que diga 2. Le paso a Christopher Ulloa, 20 renglones.
            vecesPorPack: (Array.isArray(item.cantidades) && Number(item.cantidades[idx]) > 0)
              ? Number(item.cantidades[idx])
              : 1,
            proteina: {
              nombre: aplicarCambio(protName, custom, 'protein', idx + 1),
              gramosPorPorcion: gramosPorcionProteina || 0
            },
            carbo: {
              nombre: aplicarCambio(carboName, custom, 'carbo', idx + 1),
              unidad: 'g',
              cantidadPorPorcion: 0 // Si tuvieramos tazas, se extrae de size
            },
            vegetal: {
              nombre: aplicarCambio(vegName, custom, 'vegetal', idx + 1),
              unidad: 'g',
              cantidadPorPorcion: 0
            },
            descripcion: item.planLabel || item.categoryLabel || item.desc || item.descripcion || ''
          });
        });
      } else {
        // Formato Legacy
        platosNormalizados.push({
          numero: ++numeroPlato,
          // Individuales pedidos varias veces (ej: 3× Pollo Teriyaki)
          cantidad: Number(item.cantidad) || 1,
          // Misma regla que arriba: la medida escrita en el pedido manda.
          medida: (Array.isArray(item.medidas) && item.medidas[0]) || null,
          vecesPorPack: 1,
          // Los packs familiares y los individuales caen acá: el cambio viene
          // por ítem ({ protein, vegetal, carbo }), no por plato.
          proteina: {
            nombre: aplicarCambio(
              item.proteinaNombre || item.proteina || item.nombre || 'Proteína',
              custom, 'protein', 1
            ),
            gramosPorPorcion: gramosPorcionProteina || 0
          },
          carbo: {
            nombre: aplicarCambio(
              item.carboNombre || (item.carbo ? 'Carbohidrato' : null),
              custom, 'carbo', 1
            ),
            unidad: carboInfo.unidad,
            cantidadPorPorcion: carboInfo.cantidad
          },
          vegetal: {
            nombre: aplicarCambio(
              item.ensaladaNombre || (item.ensalada ? 'Vegetales' : null),
              custom, 'vegetal', 1
            ),
            unidad: ensaladaInfo.unidad,
            cantidadPorPorcion: ensaladaInfo.cantidad
          },
          descripcion: item.planLabel || item.categoryLabel || item.desc || item.descripcion || ''
        });
      }
    });

    const extractSubstitutionsSummary = (order) => {
      const itemsList = order.items || order.menu || order.details?.cart || order.cart || [];
      const subs = [];
      itemsList.forEach(item => {
        const c = item.customizations || {};
        (c.proteinChanges || []).forEach(d => subs.push(`Plato ${d.dishNumber} (${d.dishName || 'Proteína'}) → ${d.newValue}`));
        (c.vegeChanges || []).forEach(d => subs.push(`Plato ${d.dishNumber} (${d.dishName || 'Vegetal'}) → ${d.newValue}`));
        (c.carboChanges || []).forEach(d => subs.push(`Plato ${d.dishNumber} (${d.dishName || 'Carbo'}) → ${d.newValue}`));
        (c.dishChanges || []).forEach(d => subs.push(`Plato ${d.dishNumber} (${d.dishName || 'Plato'}) → ${d.newProtein || d.newValue}`));
        if (c.protein) subs.push(`Proteína → ${c.protein}`);
        if (c.vegetal) subs.push(`Vegetal → ${c.vegetal}`);
        if (c.carbo) subs.push(`Carbo → ${c.carbo}`);
        if (item.notas || item.notes || c.notes) {
          subs.push(`Notas: ${item.notas || item.notes || c.notes}`);
        }
      });
      return subs.join(' · ');
    };

    const subsText = extractSubstitutionsSummary(p);
    let rawObs = p.observaciones || p.details?.notes || '';
    if (subsText && !rawObs.includes(subsText)) {
      rawObs = rawObs ? `${rawObs} · ${subsText}` : subsText;
    }

    const isTwoPack = detectIsTwoPack(p);
    const baseQty = p.cantidadMenus || 1;
    const itemQty = (Array.isArray(p.items) && p.items[0]?.cantidad) || (Array.isArray(p.menu) && p.menu[0]?.cantidad) || 1;
    // "Two Pack" YA significa dos packs del mismo menu. Si el pedido ADEMAS trae
    // cantidad 2, esa es la cuenta escrita de otra forma —no dos cantidades que
    // se multipliquen—: a Enid Murillo y a Ericka Anderson les salian 4 packs en
    // la hoja del 31 de agosto y se cocinaban 20 platos de sobra.
    // Misma regla que cantidadDePacks: se toma el MAYOR, con piso de 2.
    // La cantidad puede venir en `cantidadMenus` (web) o en la del item (WhatsApp).
    // Mirando solo `cantidadMenus`, un pedido de "3x Pack Bajo Calorias" salia
    // como UN pack en la hoja de cierre y como TRES en la de produccion, que si
    // pasa por cantidadDePacks(). Resolverlo acá deja a las dos hojas iguales.
    //
    // Los INDIVIDUALES quedan fuera: su cantidad ya viaja dentro de cada plato y
    // contarla también acá la multiplicaria dos veces.
    const esIndividual = esIndividualEnLaHoja(p.plan || p.tipoMenu || '');
    const computedQty = isTwoPack
        ? Math.max(2, Number(p.cantidadMenus) || 0, Number(itemQty) || 1)
        : (esIndividual ? baseQty : Math.max(baseQty, Number(itemQty) || 1));

    return {
      id: p.id,
      cliente: p.cliente,
      telefono: p.telefono,
      direccion: p.direccion,
      zona_envio: p.zona_envio || p.zona_de_envio || p.zona || '',
      tipoMenu: p.tipoMenu || p.plan || 'Desconocido',
      plan: p.plan || null,
      cantidadMenus: computedQty,
      fecha_entrega: p.fecha_entrega,
      observaciones: rawObs,
      incluyeDesayuno: !!p.incluyeDesayuno || /desayun/i.test(p.plan || '') || /desayun/i.test(rawObs || '') || (Array.isArray(p.items || p.menu) && (p.items || p.menu).some(it => /desayun/i.test(it.nombre || ''))),
      // Cuantos packs de DESAYUNO. No siempre coincide con los del almuerzo:
      // Christopher Ulloa lleva un personalizado y DOS packs de desayunos.
      // null = usar el conteo del almuerzo, que es lo de siempre.
      packsDesayuno: Number(p.packsDesayuno) > 0 ? Number(p.packsDesayuno) : null,
      // Un agregado hecho a proposito al pedido de un cliente que YA tiene otro
      // ese dia (una reposicion, una proteina extra en una sola entrega de un
      // pack mensual). Sin esto la hoja lo fusiona con el principal y sus platos
      // se pierden — ver deduplicateOrdersByClient.
      noFusionar: !!p.noFusionar,
      categoria: p.categoria || (isTwoPack ? 'two_pack' : ''),
      categoryLabel: p.categoryLabel || (isTwoPack ? 'Two Pack' : ''),
      items: p.items || p.menu || [],
      rawPedido: p,
      platos: platosNormalizados.length > 0 ? platosNormalizados : (p.platos || [])
    };
  });
}

// --------- Asignación de empaquetado sin porcentajes ---------

/**
 * Asigna tareas de empaquetado equitativamente cuando no hay porcentajes.
 * Devuelve un arreglo de workers con el total de platos asignados y detalle por tipo de menú.
 */
export function assignPackagingTasks(pedidos, numWorkers, menus) {
  if (!numWorkers || numWorkers <= 0) return [];

  // Contar platos totales por tipo de menú
  const tareasPorMenu = {};
  let totalPlatos = 0;

  pedidos.forEach((pedido) => {
    const tipo = pedido.tipoMenu || pedido.plan || 'Desconocido';
    const platosPedido = (pedido.platos && pedido.platos.length) || 0;
    const cantidadMenus = pedido.cantidadMenus || 1;
    const platosTotalesPedido = platosPedido * cantidadMenus;

    tareasPorMenu[tipo] = (tareasPorMenu[tipo] || 0) + platosTotalesPedido;
    totalPlatos += platosTotalesPedido;
  });

  if (totalPlatos === 0) {
    return Array.from({ length: numWorkers }).map((_, idx) => ({
      nombre: `Trabajador ${idx + 1}`,
      totalPlatos: 0,
      tareas: {}
    }));
  }

  // Reparto básico: totalPlatos / numWorkers, con redondeo y sobrantes.
  const base = Math.floor(totalPlatos / numWorkers);
  let sobrantes = totalPlatos % numWorkers;

  const resultado = Array.from({ length: numWorkers }).map((_, idx) => ({
    nombre: `Trabajador ${idx + 1}`,
    totalPlatos: base + (sobrantes-- > 0 ? 1 : 0),
    tareas: {}
  }));

  // Distribuir tareas por tipo de menú de forma proporcional al total de platos por worker
  const tipos = Object.keys(tareasPorMenu);
  const totalPorTipo = tareasPorMenu;

  resultado.forEach((worker) => {
    let platosRestantesWorker = worker.totalPlatos;

    tipos.forEach((tipo, idxTipo) => {
      if (platosRestantesWorker <= 0) return;

      const proporcionTipo = totalPorTipo[tipo] / totalPlatos; // % de ese tipo sobre el total
      let asignados = Math.round(worker.totalPlatos * proporcionTipo);

      if (idxTipo === tipos.length - 1) {
        // Último tipo: asignar lo que quede
        asignados = platosRestantesWorker;
      }

      asignados = Math.min(asignados, platosRestantesWorker);
      if (asignados > 0) {
        worker.tareas[tipo] = (worker.tareas[tipo] || 0) + asignados;
        platosRestantesWorker -= asignados;
      }
    });
  });

  return resultado;
}

// --------- Asignación con porcentajes ---------

/**
 * workers: {
 *   cocina: [{ nombre, porcentaje }],
 *   empaquetado: [{ nombre, porcentaje }]
 * }
 */
export function assignWorkload(pedidos, menus, workers) {
  const resultado = {
    empaquetado: [],
    cocina: []
  };

  // 1) Contar platos totales por tipo de menú
  const platosPorMenu = {};
  let totalPlatos = 0;

  pedidos.forEach((pedido) => {
    const tipo = pedido.tipoMenu || pedido.plan || 'Desconocido';
    const platosPedido = (pedido.platos && pedido.platos.length) || 0;
    const cantidadMenus = pedido.cantidadMenus || 1;
    const platosTotalesPedido = platosPedido * cantidadMenus;

    platosPorMenu[tipo] = (platosPorMenu[tipo] || 0) + platosTotalesPedido;
    totalPlatos += platosTotalesPedido;
  });

  // 2) Empaquetado
  const totalPorcentajesEmp = (workers?.empaquetado || []).reduce(
    (acc, w) => acc + (w.porcentaje || 0),
    0
  );

  (workers?.empaquetado || []).forEach((w) => {
    const factor = totalPorcentajesEmp > 0 ? w.porcentaje / totalPorcentajesEmp : 0;
    const totalPlatosWorker = Math.round(totalPlatos * factor);

    const tareas = {};
    Object.keys(platosPorMenu).forEach((tipo) => {
      const proporcionTipo = platosPorMenu[tipo] / totalPlatos;
      const asignadosTipo = Math.round(totalPlatosWorker * proporcionTipo);
      if (asignadosTipo > 0) tareas[tipo] = asignadosTipo;
    });

    resultado.empaquetado.push({
      nombre: w.nombre,
      totalPlatos: totalPlatosWorker,
      tareas
    });
  });

  // 3) Cocina: por ahora usamos la misma lógica pero hablamos de "tareas" en lugar de platos.
  const totalTareasCocina = totalPlatos; // 1 plato = 1 tarea de cocina (se puede refinar luego)
  const totalPorcentajesCocina = (workers?.cocina || []).reduce(
    (acc, w) => acc + (w.porcentaje || 0),
    0
  );

  (workers?.cocina || []).forEach((w) => {
    const factor = totalPorcentajesCocina > 0 ? w.porcentaje / totalPorcentajesCocina : 0;
    const totalTareasWorker = Math.round(totalTareasCocina * factor);

    const detalles = {};
    Object.keys(platosPorMenu).forEach((tipo) => {
      const proporcionTipo = platosPorMenu[tipo] / totalPlatos;
      const asignadasTipo = Math.round(totalTareasWorker * proporcionTipo);
      if (asignadasTipo > 0) detalles[tipo] = asignadasTipo;
    });

    resultado.cocina.push({
      nombre: w.nombre,
      totalTareas: totalTareasWorker,
      detalles
    });
  });

  return resultado;
}

// --------- Generación de datos para hoja de cocina ---------

/**
 * Devuelve una estructura consolidada para hoja de cocina.
 * No genera el PDF directamente: sólo calcula los totales por plato/ingrediente y observaciones.
 */
export function buildKitchenSheetData(pedidos, menus, options = {}) {
  const porMenu = {};
  const observacionesPorMenu = {};
  const desayunos = [];

  pedidos.forEach((pedido) => {
    const tipo = pedido.tipoMenu || pedido.plan || 'Desconocido';

    if (!porMenu[tipo]) {
      porMenu[tipo] = {
        tipoMenu: tipo,
        platos: {} // numeroPlato -> agregados
      };
      observacionesPorMenu[tipo] = [];
    }

    if (pedido.observaciones) {
      observacionesPorMenu[tipo].push({
        cliente: pedido.cliente,
        observaciones: pedido.observaciones
      });
    }

    if (pedido.incluyeDesayuno) {
      desayunos.push({
        cliente: pedido.cliente,
        tipoMenu: tipo
      });
    }

    (pedido.platos || []).forEach((plato) => {
      const key = plato.numero || 1;
      if (!porMenu[tipo].platos[key]) {
        porMenu[tipo].platos[key] = {
          numero: key,
          proteina: { nombre: plato.proteina?.nombre, totalGramos: 0 },
          carbo: {
            nombre: plato.carbo?.nombre,
            totalGramos: 0,
            totalTazas: 0,
            cantidadBase: 0,
            unidadBase: 'g'
          },
          vegetal: {
            nombre: plato.vegetal?.nombre,
            totalGramos: 0,
            totalTazas: 0,
            cantidadBase: 0,
            unidadBase: 'g'
          },
          totalPlatos: 0
        };
      }

      const agregado = porMenu[tipo].platos[key];

      // Cuántas porciones de ESTE plato hay que preparar. La regla vive en
      // un solo lugar porque las etiquetas, el empaque y la cocina tienen que
      // dar el mismo número: multiplicar cantidadMenus por la cantidad del ítem
      // contaba dos veces el mismo dato y a quien lleva 3 packs le cocinaba 9.
      const factor = porcionesDelPlato(pedido, plato);

      agregado.totalPlatos += factor;

      // Proteína siempre en gramos
      if (plato.proteina?.gramosPorPorcion) {
        agregado.proteina.totalGramos +=
          (plato.proteina.gramosPorPorcion || 0) * factor;
        // Guardar porción base (asumimos que es la misma para todos si es el mismo plato)
        agregado.proteina.gramosPorPorcion = plato.proteina.gramosPorPorcion;
      }

      // Carbohidrato puede estar en g o tazas
      if (plato.carbo) {
        agregado.carbo.unidadBase = plato.carbo.unidad;
        agregado.carbo.cantidadBase = plato.carbo.cantidadPorPorcion || 0;

        if (plato.carbo.unidad === 'g') {
          agregado.carbo.totalGramos +=
            (plato.carbo.cantidadPorPorcion || 0) * factor;
        } else {
          agregado.carbo.totalTazas +=
            (plato.carbo.cantidadPorPorcion || 0) * factor;
        }
      }

      // Vegetal puede estar en g o tazas
      if (plato.vegetal) {
        agregado.vegetal.unidadBase = plato.vegetal.unidad;
        agregado.vegetal.cantidadBase = plato.vegetal.cantidadPorPorcion || 0;

        if (plato.vegetal.unidad === 'g') {
          agregado.vegetal.totalGramos +=
            (plato.vegetal.cantidadPorPorcion || 0) * factor;
        } else {
          agregado.vegetal.totalTazas +=
            (plato.vegetal.cantidadPorPorcion || 0) * factor;
        }
      }
    });
  });

  const marginPercent = typeof options === 'number' ? options : (options?.marginPercent ?? 30);
  const factorMargen = 1 + (marginPercent / 100);

  // Post-procesar con el margen de producción (merma de cocina Gina)
  Object.values(porMenu).forEach(group => {
    Object.values(group.platos).forEach(plato => {
      plato.totalPlatosNeto = plato.totalPlatos;
      plato.totalPlatosCocina = Math.ceil(plato.totalPlatos * factorMargen);

      if (plato.proteina) {
        plato.proteina.totalGramosNeto = plato.proteina.totalGramos;
        plato.proteina.totalGramosCocina = Math.round((plato.proteina.totalGramos || 0) * factorMargen);
      }
      if (plato.carbo) {
        plato.carbo.totalGramosNeto = plato.carbo.totalGramos;
        plato.carbo.totalGramosCocina = Math.round((plato.carbo.totalGramos || 0) * factorMargen);
        plato.carbo.totalTazasNeto = plato.carbo.totalTazas;
        plato.carbo.totalTazasCocina = Math.round((plato.carbo.totalTazas || 0) * factorMargen * 10) / 10;
      }
      if (plato.vegetal) {
        plato.vegetal.totalGramosNeto = plato.vegetal.totalGramos;
        plato.vegetal.totalGramosCocina = Math.round((plato.vegetal.totalGramos || 0) * factorMargen);
        plato.vegetal.totalTazasNeto = plato.vegetal.totalTazas;
        plato.vegetal.totalTazasCocina = Math.round((plato.vegetal.totalTazas || 0) * factorMargen * 10) / 10;
      }
    });
  });

  return {
    porMenu,
    observacionesPorMenu,
    desayunos,
    marginPercent
  };
}

// --------- Generación de datos para hoja de empaque ---------

export function buildPackagingSheetData(pedidos, menus, workloadInfo) {
  // workloadInfo viene opcionalmente de assignPackagingTasks o assignWorkload
  const empaquetadorPorCliente = {};

  if (workloadInfo?.empaquetado) {
    // Reparto simple de clientes a empaquetadores en base al orden
    const allClients = pedidos.map((p) => p.cliente);
    let idxWorker = 0;
    allClients.forEach((cliente) => {
      const worker = workloadInfo.empaquetado[idxWorker];
      if (worker) {
        empaquetadorPorCliente[cliente] = worker.nombre;
        idxWorker = (idxWorker + 1) % workloadInfo.empaquetado.length;
      }
    });
  }

  const clientes = pedidos.map((p) => {
    const parts = [];
    const cleanObs = (str) => {
      if (!str) return '';
      return str
        .replace(/\b\d{2,3}g\s+prote[ií]na(?:\s*[\+\,\-]\s*\d+\s*(?:veg|vegetales|carbo|harinas?))*/gi, '')
        .replace(/^\s*[\-\–\—\·\|\,\s]+|\s*[\-\–\—\·\|\,\s]+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    const pObsClean = cleanObs(p.observaciones);
    if (pObsClean) parts.push(pObsClean);

    const detailsNotesClean = cleanObs(p.details?.notes);
    if (detailsNotesClean && !parts.includes(detailsNotesClean)) {
      parts.push(detailsNotesClean);
    }

    const items = p.items || p.menu || [];
    items.forEach(item => {
      const itemObsClean = cleanObs(item.observaciones);
      if (itemObsClean && !parts.includes(itemObsClean)) {
        parts.push(itemObsClean);
      }

      if (item.desc && item.desc.trim()) {
        const isDefaultMacroOrPlan = /mensual|semanal|quincenal|\d{2,3}g\s+prote[ií]na/i.test(item.desc);
        if (!isDefaultMacroOrPlan) {
          const descClean = cleanObs(item.desc);
          if (descClean && !parts.includes(descClean)) {
            parts.push(descClean);
          }
        }
      }

      const cambioMatch = String(item.nombre || '').match(/\b(?:cambiar|con\s|sin\s|nota)\s+.+/i);
      if (cambioMatch && !parts.some(pt => pt.toLowerCase().includes(cambioMatch[0].toLowerCase()))) {
        parts.push(cambioMatch[0].trim());
      }
    });

    const isTwoPack = detectIsTwoPack(p);
    const computedQty = p.cantidadMenus || (isTwoPack ? ((Array.isArray(p.items) && p.items[0]?.cantidad) || 1) * 2 : ((Array.isArray(p.items) && p.items[0]?.cantidad) || 1));

    return {
      cliente: p.cliente,
      tipoMenu: p.tipoMenu || p.plan || 'Desconocido',
      plan: p.plan || null, // nombre comercial del pack (Full Pack, Bajo Calorías, etc.)
      cantidadMenus: computedQty, // número de packs de ese menú para este pedido (Two Pack = 2)
      // Los packs de DESAYUNO se cuentan aparte de los de almuerzo.
      packsDesayuno: Number(p.packsDesayuno) > 0 ? Number(p.packsDesayuno) : null,
      observaciones: parts.join(' · '),
      incluyeDesayuno: !!p.incluyeDesayuno || /desayun/i.test(p.plan || '') || /desayun/i.test(p.observaciones || '') || (Array.isArray(p.items) && p.items.some(it => /desayun/i.test(it.nombre || ''))),
      platos: p.platos || [],
      empaquetador: empaquetadorPorCliente[p.cliente] || null,
      categoria: p.categoria || p.category || (p.platos && p.platos[0]?.category) || '',
      categoryLabel: p.categoryLabel || (p.platos && p.platos[0]?.categoryLabel) || '',
      zona_envio: p.zona_envio || '',
      rawPedido: p
    };
  });

  const desayunos = clientes
    .filter((c) => c.incluyeDesayuno)
    .map((c) => ({ cliente: c.cliente, tipoMenu: c.tipoMenu }));

  return {
    clientes,
    desayunos
  };
}
