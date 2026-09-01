/**
 * Dibujo de la etiqueta 30 × 20 mm para impresión térmica.
 *
 * Se dibuja en un canvas a la resolución REAL de la M110 (203 dpi), no a un
 * tamaño cómodo que después haya que escalar: a 240 × 160 px una fuente de 11 px
 * es exactamente lo que va a salir del cabezal. Así la vista previa en pantalla
 * no puede mentir sobre si un nombre largo cabe o no.
 *
 * Monocromo puro, sin grises: la impresora térmica solo sabe quemar o no quemar.
 */

/** 203 dpi es la resolución del cabezal de la M110. */
export const LABEL_DPI = 203;
export const LABEL_WIDTH_MM = 30;
export const LABEL_HEIGHT_MM = 20;

export const mmToPx = (mm) => Math.round((mm / 25.4) * LABEL_DPI);

export const LABEL_WIDTH_PX = mmToPx(LABEL_WIDTH_MM);   // 240
export const LABEL_HEIGHT_PX = mmToPx(LABEL_HEIGHT_MM); // 160

const PADDING = 8;
const FONT_FAMILY = 'Arial, Helvetica, sans-serif';

/**
 * Prepara el logo para impresión térmica.
 *
 * Recorta el blanco que rodea al archivo original (que es mucho) y lo pasa a
 * blanco y negro puro. Sin recortar, el logo ocuparía la mitad de la etiqueta
 * en márgenes vacíos.
 *
 * El resultado se cachea: no tiene sentido rehacerlo por cada etiqueta de un
 * lote de 150.
 */
let logoCache = null;

export const prepareLogo = (src = '/assets/logo.png', threshold = 200) => {
    if (logoCache) return logoCache;

    logoCache = new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const work = document.createElement('canvas');
            work.width = img.naturalWidth;
            work.height = img.naturalHeight;
            const wctx = work.getContext('2d', { willReadFrequently: true });
            wctx.drawImage(img, 0, 0);

            const { data } = wctx.getImageData(0, 0, work.width, work.height);
            let minX = work.width, minY = work.height, maxX = -1, maxY = -1;

            for (let y = 0; y < work.height; y++) {
                for (let x = 0; x < work.width; x++) {
                    const i = (y * work.width + x) * 4;
                    const alpha = data[i + 3];
                    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    if (alpha > 40 && luma < threshold) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX < 0) { resolve(null); return; }

            const out = document.createElement('canvas');
            out.width = maxX - minX + 1;
            out.height = maxY - minY + 1;
            const octx = out.getContext('2d');
            const salida = octx.createImageData(out.width, out.height);

            for (let y = 0; y < out.height; y++) {
                for (let x = 0; x < out.width; x++) {
                    const src_i = ((y + minY) * work.width + (x + minX)) * 4;
                    const dst_i = (y * out.width + x) * 4;
                    const alpha = data[src_i + 3];
                    const luma = 0.299 * data[src_i] + 0.587 * data[src_i + 1] + 0.114 * data[src_i + 2];
                    const tinta = alpha > 40 && luma < threshold;
                    salida.data[dst_i] = salida.data[dst_i + 1] = salida.data[dst_i + 2] = tinta ? 0 : 255;
                    salida.data[dst_i + 3] = 255;
                }
            }
            octx.putImageData(salida, 0, 0);
            resolve(out);
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });

    return logoCache;
};

/**
 * Parte un texto en las líneas que caben, achicando la fuente si hace falta.
 *
 * Estrategia, en orden: bajar el tamaño hasta `minSize` → partir en palabras
 * hasta `maxLines` → recortar con "…" la última línea. Nunca deja que el texto
 * se salga del ancho: en una etiqueta de 30 mm el desborde no se ve en pantalla
 * pero sale cortado en el papel.
 */
export const fitText = (ctx, text, { maxWidth, maxLines, maxSize, minSize, weight = 'normal' }) => {
    const clean = String(text || '').trim();
    if (!clean) return { lines: [], fontSize: maxSize };

    for (let size = maxSize; size >= minSize; size--) {
        ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
        const palabras = clean.split(/\s+/);
        const lines = [];
        let actual = '';

        for (const palabra of palabras) {
            const intento = actual ? `${actual} ${palabra}` : palabra;
            if (ctx.measureText(intento).width <= maxWidth) {
                actual = intento;
            } else {
                if (actual) lines.push(actual);
                actual = palabra;
            }
        }
        if (actual) lines.push(actual);

        if (lines.length <= maxLines && lines.every(l => ctx.measureText(l).width <= maxWidth)) {
            return { lines, fontSize: size };
        }
    }

    // Ni al mínimo cabe: recortar. Pasa con nombres muy largos de individuales.
    ctx.font = `${weight} ${minSize}px ${FONT_FAMILY}`;
    const palabras = clean.split(/\s+/);
    const lines = [];
    let actual = '';
    for (const palabra of palabras) {
        const intento = actual ? `${actual} ${palabra}` : palabra;
        if (ctx.measureText(intento).width <= maxWidth) {
            actual = intento;
        } else {
            if (actual) lines.push(actual);
            actual = palabra;
        }
        if (lines.length === maxLines) break;
    }
    if (lines.length < maxLines && actual) lines.push(actual);

    const ultima = lines[lines.length - 1] || '';
    if (ctx.measureText(ultima).width > maxWidth || lines.length === maxLines) {
        let recorte = ultima;
        while (recorte.length > 1 && ctx.measureText(`${recorte}…`).width > maxWidth) {
            recorte = recorte.slice(0, -1);
        }
        lines[lines.length - 1] = `${recorte}…`;
    }

    return { lines: lines.slice(0, maxLines), fontSize: minSize, truncated: true };
};

/**
 * Dibuja una etiqueta completa en el canvas.
 *
 * El contenido se reparte en tres zonas fijas —marca arriba, plato al centro,
 * vencimiento abajo— y el bloque central se centra verticalmente en el espacio
 * que le queda. Así una etiqueta con nombre corto y una con nombre de dos
 * líneas se ven igual de equilibradas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{ type, protein, expirationDate, brand }} label
 * @param {object} opts - widthMm, heightMm, logo y las opciones de diseño
 *                        (useLogo, showTipo, showVence, showDivider,
 *                         logoScale, dishScale, brandText)
 */
export const renderLabel = (canvas, label, opts = {}) => {
    if (!canvas) return;

    const {
        showTipo = true,
        showVence = true,
        showDivider = true,
        logoScale = 1,
        dishScale = 1
    } = opts;

    const W = mmToPx(opts.widthMm || LABEL_WIDTH_MM);
    const H = mmToPx(opts.heightMm || LABEL_HEIGHT_MM);
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#000000';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center';

    const centro = W / 2;
    const anchoUtil = W - PADDING * 2;
    let y = PADDING;

    // ── Etiqueta divisoria ──
    // No es un envase: es el separador que se pega al empezar cada bloque para
    // partir la tira sobre la mesa. Va sin logo y sin vencimiento —solo el
    // nombre, lo más grande que quepa— y con marco para distinguirla de un
    // vistazo de las etiquetas de comida.
    if (label.divider) {
        const MARCO = 3;
        ctx.fillRect(0, 0, W, MARCO);
        ctx.fillRect(0, H - MARCO, W, MARCO);
        ctx.fillRect(0, 0, MARCO, H);
        ctx.fillRect(W - MARCO, 0, MARCO, H);

        const margen = MARCO + 4;
        const util = W - margen * 2;
        const titulo = fitText(ctx, String(label.type || '').toUpperCase(), {
            maxWidth: util, maxLines: 3, maxSize: 30, minSize: 11, weight: 'bold'
        });

        const alto = titulo.lines.length * (titulo.fontSize + 2);
        let cur = Math.max(margen, Math.round((H - alto) / 2));
        ctx.font = `bold ${titulo.fontSize}px ${FONT_FAMILY}`;
        titulo.lines.forEach(line => {
            ctx.fillText(line, centro, cur);
            cur += titulo.fontSize + 2;
        });

        return { truncated: !!titulo.truncated, width: W, height: H, divider: true };
    }

    // ── Marca: el logo si está disponible, si no el nombre en texto ──
    const textoMarca = opts.brandText ?? label.brand ?? 'BIKITCHEN FOOD';

    if (opts.logo) {
        const maxAlto = Math.round(H * 0.30 * logoScale);
        const escala = Math.min(anchoUtil / opts.logo.width, maxAlto / opts.logo.height);
        const w = Math.round(opts.logo.width * escala);
        const h = Math.round(opts.logo.height * escala);
        ctx.drawImage(opts.logo, Math.round((W - w) / 2), y, w, h);
        y += h;
    } else if (textoMarca) {
        const marca = fitText(ctx, textoMarca, {
            maxWidth: anchoUtil,
            maxLines: 1,
            maxSize: Math.round(20 * logoScale),
            minSize: 11,
            weight: 'bold'
        });
        ctx.font = `bold ${marca.fontSize}px ${FONT_FAMILY}`;
        marca.lines.forEach(line => {
            ctx.fillText(line, centro, y);
            y += marca.fontSize + 2;
        });
    }

    if (showDivider && (opts.logo || textoMarca)) {
        y += 3;
        ctx.fillRect(PADDING, y, anchoUtil, 2);
        y += 2;
    }
    const topeBloque = y + 5;

    // ── Vencimiento: anclado abajo, se reserva su espacio antes de nada más ──
    let piso = H - PADDING;
    let vence = null;
    if (showVence && label.expirationDate) {
        vence = fitText(ctx, `Vence ${label.expirationDate}`, {
            maxWidth: anchoUtil, maxLines: 1, maxSize: 18, minSize: 10
        });
        piso = H - PADDING - vence.fontSize - 2;
    }

    // ── Tipo + plato, centrados en lo que queda entre la raya y el vencimiento ──
    const tipo = (showTipo && label.type)
        ? fitText(ctx, label.type, { maxWidth: anchoUtil, maxLines: 1, maxSize: 17, minSize: 10 })
        : { lines: [], fontSize: 0 };

    const altoTipo = tipo.lines.length * (tipo.fontSize + 2);
    const disponible = piso - topeBloque;
    const SEPARACION = 4; // aire mínimo antes del vencimiento

    // El texto también tiene que caber A LO ALTO, no solo a lo ancho.
    // Con un nombre de dos líneas el bloque crecía hasta pegarse a "Vence":
    // se achica la fuente del plato hasta que quede separado.
    const topePlato = Math.max(14, Math.round(28 * dishScale));
    const minPlato = Math.max(8, Math.round(12 * dishScale));
    let plato = null;
    for (let tope = topePlato; tope >= minPlato; tope--) {
        plato = fitText(ctx, label.protein, {
            maxWidth: anchoUtil, maxLines: 2, maxSize: tope, minSize: minPlato, weight: 'bold'
        });
        const alto = plato.lines.length * (plato.fontSize + 2);
        if (altoTipo + alto + SEPARACION <= disponible) break;
    }

    const altoPlato = plato.lines.length * (plato.fontSize + 2);
    let cursor = topeBloque + Math.max(0, Math.round((disponible - altoTipo - altoPlato) / 2));

    ctx.font = `${tipo.fontSize}px ${FONT_FAMILY}`;
    tipo.lines.forEach(line => {
        ctx.fillText(line, centro, cursor);
        cursor += tipo.fontSize + 2;
    });

    ctx.font = `bold ${plato.fontSize}px ${FONT_FAMILY}`;
    plato.lines.forEach(line => {
        ctx.fillText(line, centro, cursor);
        cursor += plato.fontSize + 2;
    });

    if (vence) {
        ctx.font = `${vence.fontSize}px ${FONT_FAMILY}`;
        ctx.fillText(vence.lines[0] || '', centro, H - PADDING - vence.fontSize);
    }

    return { truncated: !!plato.truncated, width: W, height: H };
};

/**
 * Canvas → mapa de bits 1 por píxel (true = quemar).
 *
 * Es la forma en que la M110 espera la imagen. Todavía no se envía a ninguna
 * impresora: existe para que el adaptador real no tenga que reinventarlo y para
 * poder comprobar el rasterizado sin hardware.
 */
export const canvasToMonochrome = (canvas, threshold = 128) => {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    const bits = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        bits[i] = luma < threshold ? 1 : 0;
    }

    return { width, height, bits };
};
