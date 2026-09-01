/**
 * Arma la hoja de producción en Excel con el MISMO formato que Gina usa a mano,
 * para que no tenga que aprender otro y pueda seguir editándolo.
 *
 * El formato se copió de sus archivos reales ("Tabla para resumenes …"):
 *
 *   - Una pestaña con la lista de entregas del día
 *   - Una pestaña por familia de pack (Regular, Bajo Calorías, Sin Carbos…),
 *     con DOS menús lado a lado: el #1 en las columnas A-F y el #2 en H-M.
 *     El #2 es el menú de cena cuando ese día hay promo de almuerzo y cena.
 *   - Cada plato ocupa TRES filas —proteína, vegetal, carbo— con el número de
 *     plato y el conteo combinados verticalmente. Keto y Sin Carbos usan DOS,
 *     porque no llevan harina.
 *   - Debajo, el "Resumen por Menú" con lo que hay que cocinar en total
 *   - Pestañas aparte para Desayunos e Individuales
 *
 * Los anchos de columna también son los suyos: la B mide 70 porque los nombres
 * de los platos son largos y ella los lee de un vistazo.
 *
 * Este archivo SOLO da formato. Los datos los arma PrintProductionView, que es
 * donde ya vive la lógica probada de qué se cocina y para quién.
 */

import ExcelJS from 'exceljs';

/** El amarillo/naranja con que ella encabeza cada menú. */
const NARANJA = 'FFFFC000';

/** Los mismos colores de la hoja impresa, para que Gina reconozca las tablas. */
const SALMON = 'FFF4B084';        // cabecera de Desayunos
const SALMON_CLARO = 'FFFCE4D6';  // fila de títulos de Desayunos
const VERDE = 'FFE2F0D9';         // celda del cliente
const GRIS_TITULO = 'FFF2F2F2';   // cabecera de Individuales
const GRIS = 'FFF2F2F2';

/** Anchos de A-M: dos bloques de menú de seis columnas, con la G de separación. */
const ANCHOS = [12, 70, 12.9, 14.5, 37.8, 50.5, 11.5, 12, 60.9, 12, 14.5, 37.8, 50.5];

const ENCABEZADOS = ['# de Plato', 'Descripcion', 'Cantidad', 'Platos', 'Especificaciones', 'Cliente'];

const borde = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
};

const texto = (v) => (v === null || v === undefined) ? '' : String(v);

/**
 * Excel no acepta : \ / ? * [ ] en los nombres de pestaña, ni más de 31
 * caracteres. Sin esto el archivo se genera corrupto y no abre.
 */
const nombreDePestana = (nombre, usados) => {
    const limpio = texto(nombre).replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Hoja';
    let final = limpio;
    let n = 2;
    while (usados.has(final)) {
        const sufijo = ` (${n++})`;
        final = limpio.slice(0, 31 - sufijo.length) + sufijo;
    }
    usados.add(final);
    return final;
};

/** Encabezado naranja + las líneas de "CANTIDAD POR PLATO" + los títulos. */
function escribirCabecera(ws, col, bloque) {
    const titulo = ws.getRow(3).getCell(col);
    titulo.value = bloque.titulo;
    titulo.font = { bold: true, size: 14 };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NARANJA } };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.mergeCells(3, col, 3, col + 5);

    bloque.porciones.forEach((porcion, i) => {
        const fila = ws.getRow(4 + i);
        const etiqueta = fila.getCell(col);
        etiqueta.value = 'CANTIDAD POR PLATO';
        etiqueta.font = { bold: true, size: 12 };
        const valor = fila.getCell(col + 2);
        valor.value = porcion;
        valor.font = { size: 12 };
    });

    ENCABEZADOS.forEach((h, i) => {
        const cell = ws.getRow(7).getCell(col + i);
        cell.value = h;
        cell.font = { bold: true, size: 12 };
        cell.border = borde;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
}

/**
 * Los platos: tres filas cada uno (dos si el pack no lleva harina). El número de
 * plato y el total van combinados en vertical, igual que en su archivo.
 *
 * Los clientes se reparten una por fila —así los ve al lado del plato que está
 * empacando— y si sobran, siguen debajo del último plato.
 */
function escribirPlatos(ws, col, bloque) {
    const filasPorPlato = bloque.llevaCarbo ? 3 : 2;
    let fila = 8;

    const celdaCliente = (indice, filaExcel) => {
        const cliente = bloque.clientes[indice];
        if (!cliente) return;
        const r = ws.getRow(filaExcel);
        if (cliente.notas) {
            r.getCell(col + 4).value = cliente.notas;
            r.getCell(col + 4).alignment = { wrapText: true, vertical: 'middle' };
        }
        r.getCell(col + 5).value = cliente.etiqueta;
        r.getCell(col + 5).alignment = { wrapText: true, vertical: 'middle' };
    };

    bloque.platos.forEach((p, idx) => {
        const inicio = fila;

        const num = ws.getRow(fila).getCell(col);
        num.value = `Plato ${p.numero}`;
        num.font = { bold: true, size: 12 };
        num.alignment = { horizontal: 'center', vertical: 'middle' };

        const conteo = ws.getRow(fila).getCell(col + 3);
        // Un plato puede hacerse varias veces dentro del mismo pack
        // (PERSONALIZADO: 2 de una receta, 4 de otra).
        conteo.value = bloque.totalPlatos * (p.vecesPorPack || 1);
        conteo.font = { bold: true, size: 14 };
        conteo.alignment = { horizontal: 'center', vertical: 'middle' };

        const lineas = [
            { desc: p.proteina?.nombre, cant: p.proteina?.gramosPorPorcion, fondo: GRIS },
            { desc: p.vegetal?.nombre, cant: p.vegetal?.cantidadPorPorcion, fondo: null }
        ];
        if (bloque.llevaCarbo) {
            lineas.push({ desc: p.carbo?.nombre, cant: p.carbo?.cantidadPorPorcion, fondo: null });
        }

        lineas.forEach((l, i) => {
            const r = ws.getRow(fila + i);
            const desc = r.getCell(col + 1);
            desc.value = texto(l.desc);
            desc.font = { size: 12 };
            const cant = r.getCell(col + 2);
            cant.value = (l.cant === 0 || l.cant) ? l.cant : '';
            cant.alignment = { horizontal: 'center', vertical: 'middle' };
            if (l.fondo) {
                desc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: l.fondo } };
                cant.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: l.fondo } };
            }
            for (let c = 0; c < 6; c++) r.getCell(col + c).border = borde;
            celdaCliente(idx * filasPorPlato + i, fila + i);
        });

        ws.mergeCells(inicio, col, inicio + filasPorPlato - 1, col);
        ws.mergeCells(inicio, col + 3, inicio + filasPorPlato - 1, col + 3);
        fila += filasPorPlato;
    });

    // Si hay más clientes que filas de platos, siguen debajo — ninguno se pierde
    const usadas = bloque.platos.length * filasPorPlato;
    bloque.clientes.slice(usadas).forEach((_, i) => {
        celdaCliente(usadas + i, fila);
        for (let c = 4; c < 6; c++) ws.getRow(fila).getCell(col + c).border = borde;
        fila++;
    });

    return fila;
}

/** "Resumen por Menú": lo que se cocina en total, ingrediente por ingrediente. */
function escribirResumen(ws, col, filaInicio, bloque) {
    const t = ws.getRow(filaInicio).getCell(col + 1);
    t.value = 'Resumen por Menú';
    t.font = { bold: true, size: 13 };
    t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NARANJA } };

    const h = ws.getRow(filaInicio + 1);
    ['Descripcion', 'Cantidad'].forEach((v, i) => {
        const c = h.getCell(col + 1 + i);
        c.value = v;
        c.font = { bold: true, size: 12 };
        c.border = borde;
    });

    let f = filaInicio + 2;
    const total = bloque.totalPlatos || 0;

    bloque.platos.forEach(p => {
        const platos = total * (p.vecesPorPack || 1);
        const partes = [
            [p.proteina?.nombre, (p.proteina?.gramosPorPorcion || 0) * platos, 'g'],
            [p.vegetal?.nombre, (p.vegetal?.cantidadPorPorcion || 0) * platos, 'tazas']
        ];
        if (bloque.llevaCarbo) {
            partes.push([p.carbo?.nombre, (p.carbo?.cantidadPorPorcion || 0) * platos, 'tazas']);
        }
        partes.filter(([d]) => d && d !== '—').forEach(([desc, cant, unidad]) => {
            const r = ws.getRow(f++);
            r.getCell(col + 1).value = texto(desc);
            r.getCell(col + 2).value = `${Math.round(cant * 100) / 100} ${unidad}`;
            r.getCell(col + 1).border = borde;
            r.getCell(col + 2).border = borde;
        });
    });

    return f;
}

/** Una pestaña de familia: menú #1 en A-F y, si hay cenas, el #2 en H-M. */
function agregarPestanaFamilia(wb, usados, familia) {
    const ws = wb.addWorksheet(nombreDePestana(familia.titulo, usados), {
        views: [{ showGridLines: true }],
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });
    ANCHOS.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const bloques = [[1, familia.menu1], [8, familia.menu2]].filter(([, b]) => b);

    // Primero los dos menús, y solo entonces los resúmenes: así ambos arrancan
    // en la misma fila aunque un menú tenga más clientes que el otro.
    const finales = bloques.map(([col, bloque]) => {
        escribirCabecera(ws, col, bloque);
        return escribirPlatos(ws, col, bloque);
    });

    const filaResumen = Math.max(...finales) + 2;
    bloques.forEach(([col, bloque]) => escribirResumen(ws, col, filaResumen, bloque));
}

/** Pestaña de entregas del día: la lista que ella va marcando al despachar. */
function agregarPestanaEntregas(wb, usados, datos) {
    const ws = wb.addWorksheet(nombreDePestana(datos.etiquetaDia, usados), {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });
    [10, 12, 34, 26, 52, 60].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const titulo = ws.getRow(1).getCell(2);
    titulo.value = `Entregas del ${datos.etiquetaDia}`;
    titulo.font = { bold: true, size: 16 };
    ws.mergeCells(1, 2, 1, 6);

    ['', 'check', 'Cliente', 'Zona entrega', 'Paquete', 'Cambios'].forEach((h, i) => {
        const c = ws.getRow(2).getCell(i + 1);
        c.value = h;
        if (!h) return;
        c.font = { bold: true, size: 12 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NARANJA } };
        c.border = borde;
    });

    datos.entregas.forEach((e, i) => {
        const r = ws.getRow(3 + i);
        r.getCell(3).value = texto(e.cliente);
        r.getCell(4).value = texto(e.zona);
        r.getCell(5).value = texto(e.paquete);
        r.getCell(6).value = texto(e.cambios);
        r.getCell(6).alignment = { wrapText: true, vertical: 'top' };
        for (let c = 2; c <= 6; c++) r.getCell(c).border = borde;
    });

    const total = ws.getRow(4 + datos.entregas.length);
    total.getCell(3).value = `TOTAL: ${datos.entregas.length} entregas`;
    total.getCell(3).font = { bold: true, size: 12 };
}

/**
 * Desayunos, con el mismo formato que la hoja impresa: una fila por plato, y al
 * lado el cliente sobre fondo verde con su nota.
 */
function agregarPestanaDesayunos(wb, usados, desayunos) {
    const ws = wb.addWorksheet(nombreDePestana('Desayunos', usados), {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });
    [10, 56, 13, 40, 46].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const titulo = ws.getRow(1).getCell(1);
    titulo.value = `DESAYUNOS${desayunos.totalPlatos ? `  (${desayunos.totalPlatos} platos)` : ''}`;
    titulo.font = { bold: true, size: 20 };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SALMON } };
    ws.mergeCells(1, 1, 1, 5);
    ws.getRow(1).height = 30;

    ['Plato', 'Descripcion', 'Cantidad', 'NOTA', 'Cliente'].forEach((h, i) => {
        const c = ws.getRow(2).getCell(i + 1);
        c.value = h;
        c.font = { bold: true, size: 12 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SALMON_CLARO } };
        c.alignment = { horizontal: 'center', vertical: 'middle' };
        c.border = borde;
    });
    ws.getRow(2).height = 22;

    // Tantas filas como haga falta: los platos y los clientes no tienen por qué
    // ser la misma cantidad, y ninguno de los dos se puede quedar por fuera.
    const filas = Math.max(desayunos.platos.length, desayunos.clientes.length);
    for (let i = 0; i < filas; i++) {
        const r = ws.getRow(3 + i);
        const p = desayunos.platos[i];
        const c = desayunos.clientes[i];

        if (p) {
            r.getCell(1).value = i + 1;
            r.getCell(2).value = texto(p.proteina?.nombre || p.nombre);
            r.getCell(3).value = desayunos.totalPlatos;
        }
        if (c) {
            r.getCell(4).value = texto(c.notas);
            r.getCell(5).value = texto(c.etiqueta);
            r.getCell(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
            r.getCell(5).font = { bold: true, size: 11 };
        }

        r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        r.getCell(3).font = { bold: true, size: 12 };
        r.getCell(4).alignment = { wrapText: true, vertical: 'middle' };
        r.getCell(5).alignment = { wrapText: true, vertical: 'middle' };
        r.height = 26;
        for (let col = 1; col <= 5; col++) r.getCell(col).border = borde;
    }
}

/**
 * Individuales, igual que en la hoja impresa: los productos de cada cliente uno
 * debajo del otro y su nombre en una sola celda verde al lado, combinada sobre
 * todas sus filas. Entre cliente y cliente va una fila en blanco.
 */
function agregarPestanaIndividuales(wb, usados, individuales) {
    const ws = wb.addWorksheet(nombreDePestana('Individuales', usados), {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
    });
    [58, 26, 52].forEach((w, i) => { ws.getColumn(i + 1).width = w; });

    const titulo = ws.getRow(1).getCell(1);
    titulo.value = 'I N D I V I D U A L E S';
    titulo.font = { bold: true, size: 16 };
    titulo.alignment = { horizontal: 'center', vertical: 'middle' };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_TITULO } };
    titulo.border = borde;
    ws.mergeCells(1, 1, 1, 3);
    ws.getRow(1).height = 28;

    let fila = 2;
    individuales.forEach((ind, idx) => {
        const lineas = ind.lineas.length ? ind.lineas : [{ desc: '—', cantidad: '' }];
        const inicio = fila;

        lineas.forEach(l => {
            const r = ws.getRow(fila++);
            r.getCell(1).value = texto(l.desc);
            r.getCell(1).alignment = { wrapText: true, vertical: 'middle' };
            r.getCell(2).value = texto(l.cantidad);
            r.getCell(2).font = { bold: true, size: 11 };
            r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
            r.height = 24;
            for (let col = 1; col <= 3; col++) r.getCell(col).border = borde;
        });

        // El nombre va una sola vez, combinado sobre todas sus filas
        const celda = ws.getRow(inicio).getCell(3);
        celda.value = ind.notas
            ? { richText: [
                { text: texto(ind.cliente), font: { bold: true, size: 11 } },
                { text: `\n(${texto(ind.notas)})`, font: { size: 9, color: { argb: 'FFC00000' } } }
            ] }
            : texto(ind.cliente);
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VERDE } };
        celda.font = { bold: true, size: 11 };
        celda.alignment = { wrapText: true, vertical: 'middle' };
        if (fila - inicio > 1) ws.mergeCells(inicio, 3, fila - 1, 3);

        // Fila en blanco separando un cliente del siguiente
        if (idx < individuales.length - 1) {
            const sep = ws.getRow(fila++);
            sep.height = 10;
            for (let col = 1; col <= 3; col++) sep.getCell(col).border = borde;
        }
    });
}

/**
 * Arma el libro completo.
 *
 * @param {object} datos
 * @param {string} datos.etiquetaDia  "MIERCOLES 26 AGOSTO"
 * @param {Array}  datos.entregas     [{ cliente, zona, paquete, cambios }]
 * @param {Array}  datos.familias     [{ titulo, menu1, menu2 }]
 * @param {object} [datos.desayunos]  { platos, clientes, totalPlatos }
 * @param {Array}  [datos.individuales]
 */
export function agregarHojasGina(wb, datos) {
    // Los nombres ya ocupados cuentan: el libro puede traer otras pestañas y
    // Excel no abre un archivo con dos hojas que se llamen igual.
    const usados = new Set(wb.worksheets.map(w => w.name));

    agregarPestanaEntregas(wb, usados, datos);
    (datos.familias || []).forEach(f => agregarPestanaFamilia(wb, usados, f));
    if (datos.desayunos?.clientes?.length) agregarPestanaDesayunos(wb, usados, datos.desayunos);
    if (datos.individuales?.length) agregarPestanaIndividuales(wb, usados, datos.individuales);

    return wb;
}

/** Igual que agregarHojasGina, pero creando el libro desde cero. */
export function construirLibroGina(datos) {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'BiKitchen';
    wb.created = new Date();
    return agregarHojasGina(wb, datos);
}

/** Genera y descarga el archivo con el nombre que ella usa. */
export async function descargarLibroGina(datos) {
    const wb = construirLibroGina(datos);
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tabla para resumenes ${datos.etiquetaDia}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
