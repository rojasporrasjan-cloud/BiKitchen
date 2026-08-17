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

    return {
      id: p.id,
      cliente: p.cliente,
      telefono: p.telefono,
      direccion: p.direccion,
      zona_envio: p.zona_envio || p.zona_de_envio || p.zona || '',
      tipoMenu: p.tipoMenu || p.plan || 'Desconocido',
      plan: p.plan || null,
      cantidadMenus: p.cantidadMenus || 1,
      fecha_entrega: p.fecha_entrega,
      observaciones: rawObs,
      incluyeDesayuno: !!p.incluyeDesayuno,
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
export function buildKitchenSheetData(pedidos, menus) {
  const porMenu = {};
  const observacionesPorMenu = {};
  const desayunos = [];

  pedidos.forEach((pedido) => {
    const tipo = pedido.tipoMenu || pedido.plan || 'Desconocido';
    const cantidadMenus = pedido.cantidadMenus || 1;

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

      // Cuántas porciones de ESTE plato hay que preparar.
      // cantidadMenus multiplica el pedido entero; plato.cantidad viene de la
      // cantidad del ítem (ej: 3× Pollo Teriyaki). Antes solo se usaba el primero,
      // que nunca se escribe en Firestore y siempre valía 1: por eso un ítem
      // pedido 3 veces se cocinaba una sola vez.
      const factor = cantidadMenus * (plato.cantidad || 1);

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

  return {
    porMenu,
    observacionesPorMenu,
    desayunos
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

  const clientes = pedidos.map((p) => ({
    cliente: p.cliente,
    tipoMenu: p.tipoMenu || p.plan || 'Desconocido',
    plan: p.plan || null, // nombre comercial del pack (Full Pack, Bajo Calorías, etc.)
    cantidadMenus: p.cantidadMenus || 1, // número de packs de ese menú para este pedido
    observaciones: p.observaciones || '',
    incluyeDesayuno: !!p.incluyeDesayuno,
    platos: p.platos || [],
    empaquetador: empaquetadorPorCliente[p.cliente] || null,
    categoria: p.categoria || p.category || (p.platos && p.platos[0]?.category) || '',
    categoryLabel: p.categoryLabel || (p.platos && p.platos[0]?.categoryLabel) || '',
    zona_envio: p.zona_envio || '',
    rawPedido: p
  }));

  const desayunos = clientes
    .filter((c) => c.incluyeDesayuno)
    .map((c) => ({ cliente: c.cliente, tipoMenu: c.tipoMenu }));

  return {
    clientes,
    desayunos
  };
}
