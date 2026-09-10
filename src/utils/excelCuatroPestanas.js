/**
 * El Excel de cuatro pestañas para Gina.
 *
 * La misma hoja de cocina mirada de cuatro formas, para que quede claro qué
 * falta cocinar sin tener que cruzar papeles:
 *
 *   1. SÁBADO COMPLETO            todo lo del sábado, sin descontar nada
 *   2. SÁBADO — FALTA             lo del sábado menos lo que ya cocinó el jueves
 *   3. LUNES MENSUALES/QUINCENALES  solo lo que se puede adelantar del lunes
 *   4. TODO — FALTA               sábado + lunes recurrentes, menos lo cocinado
 *
 * Las pestañas 1 y 3 son "cuánto pide el día". Las 2 y 4 son "cuánto hay que
 * poner en la olla hoy". Van separadas a propósito: si fueran una sola columna,
 * nadie sabría si el número ya trae el descuento o no, y esa duda se paga
 * cocinando de más o de menos.
 */

const NARANJA = 'FFFFC000';
const SALMON = 'FFF4B084';
const SALMON_CLARO = 'FFFCE4D6';
const VERDE = 'FFE2F0D9';
const GRIS = 'FFF2F2F2';

const borde = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
};

const pintar = (celda, color) => {
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
};

/** Excel no abre el archivo si el nombre de la pestaña trae : \ / ? * [ ] */
export const nombreDePestana = (texto) =>
    String(texto || 'Hoja').replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Hoja';

/**
 * Un nombre que no choque con las pestañas que ya tiene el libro.
 *
 * Desde que las tres exportaciones escriben en UN solo archivo, dos de ellas
 * pueden querer el mismo nombre. ExcelJS no lo perdona: tira una excepción y no
 * sale ningún archivo — justo cuando hay que mandarle la hoja a la cocina.
 */
export const nombreLibre = (wb, texto) => {
    const base = nombreDePestana(texto);
    if (!wb?.getWorksheet?.(base)) return base;
    for (let n = 2; n < 50; n++) {
        // El sufijo tiene que caber en los 31 caracteres que admite Excel
        const sufijo = ` (${n})`;
        const candidato = base.slice(0, 31 - sufijo.length) + sufijo;
        if (!wb.getWorksheet(candidato)) return candidato;
    }
    return `${base.slice(0, 25)} ${Date.now() % 10000}`;
};

/** "3,24 kg", "540 g", "12,5 tazas" */
export const cantidadLegible = (cantidad, unidad) => {
    const n = Number(cantidad) || 0;
    if (unidad === 'g') {
        if (n >= 1000) return `${(Math.round(n / 10) / 100).toLocaleString('es-CR')} kg`;
        return `${Math.round(n)} g`;
    }
    if (unidad === 'kg') return `${n.toLocaleString('es-CR')} kg`;
    const r = Math.round(n * 10) / 10;
    return `${r.toLocaleString('es-CR')} ${unidad === 'taza(s)' ? (r === 1 ? 'taza' : 'tazas') : unidad}`;
};

/**
 * En que bloque va cada renglon.
 *
 * Se agrupa por unidad porque el orden "de mayor a menor" solo tiene sentido
 * entre cosas comparables: 5000 g y 60 tazas no se pueden poner en la misma
 * lista ordenada por el numero, y si se hiciera las tazas quedarian siempre al
 * final aunque sean la olla mas grande del dia.
 */
export const grupoDeUnidad = (unidad) => {
    if (unidad === 'g' || unidad === 'kg') return 'PROTEINAS Y CARNES (en peso)';
    if (unidad === 'taza(s)') return 'VEGETALES, ARROCES Y GUARNICIONES (en tazas)';
    return 'OTROS (por unidad)';
};

export const ORDEN_DE_GRUPO = [
    'PROTEINAS Y CARNES (en peso)',
    'VEGETALES, ARROCES Y GUARNICIONES (en tazas)',
    'OTROS (por unidad)'
];

/**
 * Escribe una pestaña.
 *
 * @param {object} wb            libro de ExcelJS
 * @param {object} opciones
 * @param {string} opciones.titulo
 * @param {string} opciones.explicacion  qué es esta pestaña, en una línea
 * @param {Array}  opciones.renglones    { name, unit, pide, hecho, falta, cocinera, empacaCocina, nota }
 * @param {boolean} opciones.conDescuento  si muestra las columnas de descuento
 */
export const agregarPestanaDeCocina = (wb, opciones) => {
    const { titulo, explicacion, renglones = [], conDescuento = false } = opciones;
    const ws = wb.addWorksheet(nombreLibre(wb, titulo), { views: [{ showGridLines: false }] });

    const columnas = conDescuento
        ? ['Preparación', 'Cocinera', 'Pide el día', 'Ya cocinado', 'FALTA COCINAR', 'Nota']
        : ['Preparación', 'Cocinera', 'Cantidad a cocinar', 'Nota'];

    ws.columns = conDescuento
        ? [{ width: 46 }, { width: 16 }, { width: 15 }, { width: 15 }, { width: 18 }, { width: 42 }]
        : [{ width: 46 }, { width: 16 }, { width: 20 }, { width: 46 }];

    const ultima = columnas.length;
    const col = (n) => String.fromCharCode(64 + n);

    // Título
    ws.mergeCells(`A1:${col(ultima)}1`);
    const t = ws.getCell('A1');
    t.value = titulo.toUpperCase();
    t.font = { name: 'Calibri', size: 14, bold: true };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    pintar(t, NARANJA);
    ws.getRow(1).height = 26;

    // Explicación
    ws.mergeCells(`A2:${col(ultima)}2`);
    const e = ws.getCell('A2');
    e.value = explicacion;
    e.font = { name: 'Calibri', size: 10, italic: true };
    e.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    pintar(e, GRIS);
    ws.getRow(2).height = 22;

    // Encabezados
    const cab = ws.getRow(3);
    columnas.forEach((h, i) => {
        const c = cab.getCell(i + 1);
        c.value = h;
        c.font = { name: 'Calibri', size: 11, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = borde;
        pintar(c, SALMON);
    });
    cab.height = 22;

    if (renglones.length === 0) {
        const fila = ws.getRow(4);
        ws.mergeCells(`A4:${col(ultima)}4`);
        const c = fila.getCell(1);
        c.value = 'No hay nada que cocinar en esta pestaña.';
        c.font = { name: 'Calibri', size: 11, italic: true };
        c.alignment = { horizontal: 'center' };
        c.border = borde;
        return ws;
    }

    let f = 4;
    let grupoActual = null;

    // Ordenado de mayor a menor DENTRO de cada grupo de unidad. Mezclarlos no
    // serviria: 5000 g y 60 tazas no se pueden comparar por el numero pelado, y
    // ordenarlos juntos pondria las tazas al final siempre.
    const ordenados = [...renglones].sort((a, b) => {
        const ga = ORDEN_DE_GRUPO.indexOf(grupoDeUnidad(a.unit));
        const gb = ORDEN_DE_GRUPO.indexOf(grupoDeUnidad(b.unit));
        if (ga !== gb) return ga - gb;
        const va = conDescuento ? (b.falta - a.falta) : (b.pide - a.pide);
        if (va !== 0) return va;
        return a.name.localeCompare(b.name);
    });

    ordenados.forEach(r => {
        const grupo = grupoDeUnidad(r.unit);
        if (grupo !== grupoActual) {
            grupoActual = grupo;
            ws.mergeCells(`A${f}:${col(ultima)}${f}`);
            const c = ws.getCell(`A${f}`);
            c.value = `${grupo}  —  de mayor a menor`;
            c.font = { name: 'Calibri', size: 12, bold: true };
            c.alignment = { horizontal: 'left', vertical: 'middle' };
            c.border = borde;
            pintar(c, SALMON_CLARO);
            ws.getRow(f).height = 20;
            f++;
        }

        const suya = r.cocinera || 'SIN ASIGNAR';
        const fila = ws.getRow(f);
        const valores = conDescuento
            ? [
                r.name,
                suya,
                cantidadLegible(r.pide, r.unit),
                r.hecho > 0 ? cantidadLegible(r.hecho, r.unit) : '—',
                cantidadLegible(r.falta, r.unit),
                r.nota || ''
            ]
            : [r.name, suya, cantidadLegible(r.pide, r.unit), r.nota || ''];

        valores.forEach((v, i) => {
            const c = fila.getCell(i + 1);
            c.value = v;
            c.border = borde;
            c.font = { name: 'Calibri', size: 10 };
            c.alignment = { vertical: 'middle', wrapText: i === valores.length - 1 };
        });

        // La columna que manda va en negrita
        const columnaFuerte = conDescuento ? 5 : 3;
        fila.getCell(columnaFuerte).font = { name: 'Calibri', size: 11, bold: true };
        fila.getCell(columnaFuerte).alignment = { horizontal: 'center', vertical: 'middle' };
        if (conDescuento) {
            fila.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
            fila.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
            // Lo que ya está hecho se pinta verde: no hay que volver a cocinarlo
            if (r.falta === 0) pintar(fila.getCell(5), VERDE);
        }
        if (r.empacaCocina) pintar(fila.getCell(1), 'FFFFF7DC');

        fila.height = 18;
        f++;
    });

    return ws;
};

/**
 * La pestaña con lo que Gina anotó y la hoja NO pudo descontar.
 *
 * Sale aparte y no mezclada con los números porque son cosas que alguien tiene
 * que mirar: unidades que la hoja no maneja ("40 porciones", "1 olla grande") e
 * instrucciones sueltas ("dejar salsa lista"). Esconderlas sería peor: se
 * cocinaría de más creyendo que no estaba hecho.
 */
export const agregarPestanaDeAvisos = (wb, adelanto) => {
    const ws = wb.addWorksheet(nombreLibre(wb, 'Revisar a mano'), { views: [{ showGridLines: false }] });
    ws.columns = [{ width: 55 }, { width: 30 }];

    let f = 1;
    const titulo = (texto, color) => {
        ws.mergeCells(`A${f}:B${f}`);
        const c = ws.getCell(`A${f}`);
        c.value = texto;
        c.font = { name: 'Calibri', size: 12, bold: true };
        pintar(c, color);
        c.border = borde;
        ws.getRow(f).height = 22;
        f++;
    };

    titulo('NO SE PUDO DESCONTAR — revisar contra la hoja', NARANJA);
    ws.getCell(`A${f}`).value = 'La hoja lleva gramos y tazas. Estas quedaron en otras unidades, así que NO se descontaron.';
    ws.getCell(`A${f}`).font = { name: 'Calibri', size: 10, italic: true };
    f += 2;

    (adelanto?.sinConvertir || []).forEach(x => {
        ws.getCell(`A${f}`).value = x.nombre;
        ws.getCell(`B${f}`).value = x.texto;
        ws.getCell(`A${f}`).border = borde;
        ws.getCell(`B${f}`).border = borde;
        f++;
    });

    f++;
    titulo('NOTAS DE GINA', SALMON);
    (adelanto?.notas || []).forEach(n => {
        ws.mergeCells(`A${f}:B${f}`);
        const c = ws.getCell(`A${f}`);
        c.value = n;
        c.alignment = { wrapText: true, vertical: 'middle' };
        c.border = borde;
        f++;
    });

    f++;
    titulo('SÍ SE DESCONTARON', VERDE);
    (adelanto?.descontados || []).forEach(d => {
        ws.getCell(`A${f}`).value = d.nombre;
        ws.getCell(`B${f}`).value = cantidadLegible(d.cantidad, d.unidad);
        ws.getCell(`A${f}`).border = borde;
        ws.getCell(`B${f}`).border = borde;
        f++;
    });

    return ws;
};

/**
 * La pestaña de EMPAQUE: quién recibe qué.
 *
 * Es otra pregunta que la de cocina. La cocina pregunta "cuánto hay que hacer
 * de cada cosa"; el empaque pregunta "qué le va a cada cliente". Por eso va en
 * su propia pestaña y ordenada por cliente, no por cantidad: quien empaca busca
 * un nombre, no el plato más grande.
 *
 * @param {object} wb
 * @param {object} opciones
 * @param {string} opciones.titulo
 * @param {string} opciones.explicacion
 * @param {Array}  opciones.clientes  { cliente, zona, paquete, cantidad, entregas, observaciones }
 */
export const agregarPestanaDeEmpaque = (wb, opciones) => {
    const { titulo, explicacion, clientes = [] } = opciones;
    const ws = wb.addWorksheet(nombreLibre(wb, titulo), { views: [{ showGridLines: false }] });

    ws.columns = [
        { width: 30 }, { width: 26 }, { width: 34 },
        { width: 10 }, { width: 12 }, { width: 44 }
    ];

    ws.mergeCells('A1:F1');
    const t = ws.getCell('A1');
    t.value = titulo.toUpperCase();
    t.font = { name: 'Calibri', size: 14, bold: true };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    pintar(t, NARANJA);
    ws.getRow(1).height = 26;

    ws.mergeCells('A2:F2');
    const e = ws.getCell('A2');
    e.value = explicacion;
    e.font = { name: 'Calibri', size: 10, italic: true };
    e.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    pintar(e, GRIS);
    ws.getRow(2).height = 22;

    const cab = ws.getRow(3);
    ['Cliente', 'Zona', 'Paquete', 'Packs', 'Entregas', 'Observaciones'].forEach((h, i) => {
        const c = cab.getCell(i + 1);
        c.value = h;
        c.font = { name: 'Calibri', size: 11, bold: true };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = borde;
        pintar(c, SALMON);
    });
    cab.height = 22;

    if (clientes.length === 0) {
        ws.mergeCells('A4:F4');
        const c = ws.getCell('A4');
        c.value = 'No hay nada que empacar en esta pestaña.';
        c.font = { name: 'Calibri', size: 11, italic: true };
        c.alignment = { horizontal: 'center' };
        c.border = borde;
        return ws;
    }

    // Por cliente: quien empaca busca un nombre
    const ordenados = [...clientes].sort((a, b) =>
        String(a.cliente || '').localeCompare(String(b.cliente || '')));

    let f = 4;
    ordenados.forEach(c => {
        const fila = ws.getRow(f);
        [
            c.cliente || '',
            c.zona || '',
            c.paquete || '',
            c.cantidad || 1,
            c.entregas > 1 ? `${c.entregas} entregas` : '1 entrega',
            c.observaciones || ''
        ].forEach((v, i) => {
            const celda = fila.getCell(i + 1);
            celda.value = v;
            celda.border = borde;
            celda.font = { name: 'Calibri', size: 10 };
            celda.alignment = { vertical: 'middle', wrapText: i === 5 || i === 2 };
        });

        fila.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
        fila.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        fila.getCell(4).font = { name: 'Calibri', size: 11, bold: true };

        // Los de mas de una entrega son los que se pueden adelantar
        if (c.entregas > 1) pintar(fila.getCell(5), VERDE);
        // Una observacion es un cambio que hay que respetar al empacar
        if (c.observaciones) pintar(fila.getCell(6), 'FFFFF2CC');

        fila.height = 20;
        f++;
    });

    // Total, para cuadrar contra las etiquetas
    const total = ordenados.reduce((acc, c) => acc + (Number(c.cantidad) || 1), 0);
    const fin = ws.getRow(f + 1);
    fin.getCell(3).value = 'TOTAL DE PACKS';
    fin.getCell(3).font = { name: 'Calibri', size: 11, bold: true };
    fin.getCell(3).alignment = { horizontal: 'right' };
    fin.getCell(4).value = total;
    fin.getCell(4).font = { name: 'Calibri', size: 12, bold: true };
    fin.getCell(4).alignment = { horizontal: 'center' };
    pintar(fin.getCell(4), SALMON_CLARO);
    fin.getCell(3).border = borde;
    fin.getCell(4).border = borde;

    return ws;
};

/**
 * El empaque agrupado POR PACK, que es como se arman las estaciones.
 *
 * `agregarPestanaDeEmpaque` da una lista plana por cliente, buena para
 * despachar. Pero para empacar hace falta lo contrario: todos los que llevan
 * Bajo Calorías juntos, con su cuenta, y las cenas en su propio bloque. Sin
 * eso hay que ir saltando por la lista buscando quién lleva qué.
 *
 * @param {object} wb
 * @param {object} opciones
 * @param {string} opciones.titulo
 * @param {string} opciones.explicacion
 * @param {Array}  opciones.grupos  { pack, clientes: [{ cliente, zona, packs, nota }] }
 */
export const agregarPestanaDeEmpaquePorPack = (wb, opciones) => {
    const { titulo, explicacion, grupos = [] } = opciones;
    const ws = wb.addWorksheet(nombreLibre(wb, titulo), { views: [{ showGridLines: false }] });
    ws.columns = [{ width: 38 }, { width: 34 }, { width: 9 }, { width: 60 }];

    ws.mergeCells('A1:D1');
    const t = ws.getCell('A1');
    t.value = titulo.toUpperCase();
    t.font = { name: 'Calibri', size: 14, bold: true };
    t.alignment = { horizontal: 'center', vertical: 'middle' };
    pintar(t, NARANJA);
    ws.getRow(1).height = 26;

    ws.mergeCells('A2:D2');
    const e = ws.getCell('A2');
    e.value = explicacion;
    e.font = { name: 'Calibri', size: 10, italic: true };
    e.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    pintar(e, GRIS);
    ws.getRow(2).height = 30;

    let f = 3;
    let totalPacks = 0;

    if (grupos.length === 0) {
        ws.mergeCells('A3:D3');
        const c = ws.getCell('A3');
        c.value = 'No hay nada que empacar por adelantado en esta fecha.';
        c.font = { name: 'Calibri', size: 11, italic: true };
        return ws;
    }

    grupos.forEach(({ pack, clientes = [] }) => {
        const suma = clientes.reduce((n, c) => n + (Number(c.packs) || 1), 0);
        totalPacks += suma;

        ws.mergeCells(`A${f}:D${f}`);
        const h = ws.getCell(`A${f}`);
        h.value = `${pack}  —  ${suma} pack${suma === 1 ? '' : 's'}, `
            + `${clientes.length} cliente${clientes.length === 1 ? '' : 's'}`;
        h.font = { name: 'Calibri', size: 12, bold: true };
        h.border = borde;
        pintar(h, SALMON_CLARO);
        ws.getRow(f).height = 20;
        f++;

        const cab = ws.getRow(f);
        ['Cliente', 'Zona', 'Packs', 'Observaciones'].forEach((x, i) => {
            const c = cab.getCell(i + 1);
            c.value = x;
            c.font = { name: 'Calibri', size: 11, bold: true };
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.border = borde;
            pintar(c, SALMON);
        });
        cab.height = 20;
        f++;

        clientes.forEach(c => {
            const fila = ws.getRow(f);
            [c.cliente, c.zona, Number(c.packs) || 1, c.nota || ''].forEach((v, i) => {
                const celda = fila.getCell(i + 1);
                celda.value = v;
                celda.font = { name: 'Calibri', size: 11, bold: i === 0 };
                celda.alignment = {
                    horizontal: i === 2 ? 'center' : 'left',
                    vertical: 'top',
                    wrapText: i === 3
                };
                celda.border = borde;
                if (i === 3 && v) pintar(celda, VERDE);
            });
            fila.height = String(c.nota || '').length > 70 ? 32 : 18;
            f++;
        });
        f++;
    });

    const fin = ws.getRow(f);
    fin.getCell(2).value = 'TOTAL DE PACKS';
    fin.getCell(2).font = { name: 'Calibri', size: 11, bold: true };
    fin.getCell(2).alignment = { horizontal: 'right' };
    fin.getCell(3).value = totalPacks;
    fin.getCell(3).font = { name: 'Calibri', size: 12, bold: true };
    fin.getCell(3).alignment = { horizontal: 'center' };
    pintar(fin.getCell(3), SALMON_CLARO);
    fin.getCell(2).border = borde;
    fin.getCell(3).border = borde;

    return ws;
};
