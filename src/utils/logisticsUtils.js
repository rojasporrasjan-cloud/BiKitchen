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

    // Cada entrada en p.menu la tratamos como un "plato" del 1 al N
    (p.menu || []).forEach((item, index) => {
      const numero = index + 1; // Plato 1, 2, 3...

      const protMatch = String(item.proteina || '').match(/([0-9]+(?:\.[0-9]+)?)/);
      const gramosPorcionProteina = protMatch ? parseFloat(protMatch[1]) : 0;

      const carboInfo = parseCantidadUnidad(item.carbo);
      const ensaladaInfo = parseCantidadUnidad(item.ensalada);

      platosNormalizados.push({
        numero,
        // Proteína siempre en gramos por porción
        proteina: {
          nombre: item.proteinaNombre || item.nombre || 'Proteína',
          gramosPorPorcion: gramosPorcionProteina || 0
        },
        // Carbohidrato puede ir en gramos o tazas
        carbo: {
          nombre: item.carboNombre || 'Carbohidrato',
          unidad: carboInfo.unidad,
          cantidadPorPorcion: carboInfo.cantidad
        },
        // Vegetal puede ir en gramos o tazas
        vegetal: {
          nombre: item.ensaladaNombre || 'Vegetales',
          unidad: ensaladaInfo.unidad,
          cantidadPorPorcion: ensaladaInfo.cantidad
        }
      });
    });

    return {
      id: p.id,
      cliente: p.cliente,
      telefono: p.telefono,
      direccion: p.direccion,
      tipoMenu: p.tipoMenu || p.plan || 'Desconocido',
      cantidadMenus: p.cantidadMenus || 1,
      fecha_entrega: p.fecha_entrega,
      observaciones: p.observaciones || '',
      incluyeDesayuno: !!p.incluyeDesayuno,
      platos: platosNormalizados
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
            totalTazas: 0
          },
          vegetal: {
            nombre: plato.vegetal?.nombre,
            totalGramos: 0,
            totalTazas: 0
          },
          totalPlatos: 0
        };
      }

      const agregado = porMenu[tipo].platos[key];
      agregado.totalPlatos += cantidadMenus;

      // Proteína siempre en gramos
      if (plato.proteina?.gramosPorPorcion) {
        agregado.proteina.totalGramos +=
          (plato.proteina.gramosPorPorcion || 0) * cantidadMenus;
      }

      // Carbohidrato puede estar en g o tazas
      if (plato.carbo) {
        if (plato.carbo.unidad === 'g') {
          agregado.carbo.totalGramos +=
            (plato.carbo.cantidadPorPorcion || 0) * cantidadMenus;
        } else {
          agregado.carbo.totalTazas +=
            (plato.carbo.cantidadPorPorcion || 0) * cantidadMenus;
        }
      }

      // Vegetal puede estar en g o tazas
      if (plato.vegetal) {
        if (plato.vegetal.unidad === 'g') {
          agregado.vegetal.totalGramos +=
            (plato.vegetal.cantidadPorPorcion || 0) * cantidadMenus;
        } else {
          agregado.vegetal.totalTazas +=
            (plato.vegetal.cantidadPorPorcion || 0) * cantidadMenus;
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
    observaciones: p.observaciones || '',
    incluyeDesayuno: !!p.incluyeDesayuno,
    platos: p.platos || [],
    empaquetador: empaquetadorPorCliente[p.cliente] || null
  }));

  const desayunos = clientes
    .filter((c) => c.incluyeDesayuno)
    .map((c) => ({ cliente: c.cliente, tipoMenu: c.tipoMenu }));

  return {
    clientes,
    desayunos
  };
}
