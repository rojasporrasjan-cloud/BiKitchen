/**
 * Protocolo de la Phomemo M110.
 *
 * No hay documentación oficial. Estos bytes salen del reverse-engineering de la
 * comunidad, verificados contra dos proyectos independientes:
 *   https://github.com/vivier/phomemo-tools   (sniffing de la app Android)
 *   https://github.com/mkuhlmann/pyphomemo    (específico para M110)
 *
 * Los mismos bytes están replicados en tools/phomemo/print_test.py, que es la
 * prueba de laboratorio fuera del navegador. Si algo cambia acá, cambia allá.
 */

/** Cabezal físico de la M110: 384 puntos a 203 dpi (≈ 48 mm). */
export const HEAD_DOTS = 384;
export const BLE_SERVICE = 0xff00;
export const BLE_SERVICE_UUID = '0000ff00-0000-1000-8000-00805f9b34fb';

/**
 * Lo que la impresora ANUNCIA por Bluetooth, que no es lo mismo que expone.
 *
 * La M110 de BiKitchen se anuncia con el servicio af30 y con el número de serie
 * por nombre ("Q199E4382000066"). El ff00 —donde se imprime de verdad— solo
 * aparece una vez conectada.
 *
 * Chrome filtra por lo anunciado, así que buscar por ff00 no la encontraba
 * nunca: el diálogo salía vacío y había que recurrir a "mostrar todos".
 * Confirmado escaneando con Python:
 *   16:CB:A9:58:EF:B4  Q199E4382000066
 *      servicios anunciados: 0000af30-0000-1000-8000-00805f9b34fb
 */
export const BLE_ADVERTISED_SERVICE_UUID = '0000af30-0000-1000-8000-00805f9b34fb';
export const BLE_WRITE_UUID = '0000ff02-0000-1000-8000-00805f9b34fb';
export const BLE_NOTIFY_UUID = '0000ff03-0000-1000-8000-00805f9b34fb';
export const CHUNK_SIZE = 128;

/**
 * Lo mas chico que se manda de un golpe.
 *
 * Un BLE sin negociar acepta 20 bytes por escritura. Si un modelo no traga los
 * 128 de la M110, el adaptador va bajando hasta aca antes de darse por vencido.
 */
export const CHUNK_MINIMO = 20;

/**
 * Los servicios BLE donde suelen vivir estas impresoras.
 *
 * Chrome solo deja MIRAR los servicios que se pidieron de antemano: lo que no
 * este en esta lista es invisible aunque la impresora lo tenga. Por eso, cuando
 * se conecto una impresora que no era la M110, no habia manera de descubrirle
 * nada — ni siquiera para diagnosticar.
 */
export const SERVICIOS_CONOCIDOS = [
    BLE_SERVICE_UUID,                            // ff00 - Phomemo M110
    BLE_ADVERTISED_SERVICE_UUID,                 // af30 - lo que anuncia la M110
    '000018f0-0000-1000-8000-00805f9b34fb',      // ESC/POS de muchas termicas
    '0000fee7-0000-1000-8000-00805f9b34fb',      // otra comun en termicas
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',      // UART transparente (Microchip/ISSC)
    'e7810a71-73ae-499d-8c15-faa9aef0c3f2',      // otra de etiquetadoras
    '0000ffe0-0000-1000-8000-00805f9b34fb'       // modulos HM-10 y sus clones
];
export const CHUNK_DELAY_MS = 20;

/**
 * La M110 espera SIEMPRE la línea completa del cabezal: 48 bytes.
 *
 * Mandar solo los 30 bytes de una etiqueta de 30 mm hace que la impresora
 * acepte los datos sin imprimir nada. El contenido va centrado dentro de los
 * 384 puntos (es lo que declara el perfil "m110" de phomymo: widthBytes 48,
 * alignment center).
 */
export const HEAD_BYTES = HEAD_DOTS / 8;

/** ESC @ — reinicia la impresora. Va antes que cualquier otra cosa. */
export const cmdInit = () => new Uint8Array([0x1b, 0x40]);

/** Velocidad de impresión: 1 (lenta y nítida) .. 5 (rápida). */
export const cmdSpeed = (v = 3) => new Uint8Array([0x1b, 0x4e, 0x0d, v]);

/** Densidad / oscuridad: 1 .. 15. */
export const cmdDensity = (v = 15) => new Uint8Array([0x1b, 0x4e, 0x04, v]);

/** 0x0a = etiquetas con separación (las nuestras). 0x0b sería papel continuo. */
export const cmdMediaLabels = () => new Uint8Array([0x1f, 0x11, 0x0a]);

export const cmdRasterHeader = (widthBytes, lines) => new Uint8Array([
    0x1d, 0x76, 0x30, 0x00,
    widthBytes & 0xff, (widthBytes >> 8) & 0xff,
    lines & 0xff, (lines >> 8) & 0xff
]);

export const cmdFooter = () => new Uint8Array([0x1f, 0xf0, 0x05, 0x00, 0x1f, 0xf0, 0x03, 0x00]);

/**
 * Mapa de bits → bytes para el cabezal.
 *
 * Bit en 1 = quemar, MSB = punto más a la izquierda. `bits` viene de
 * canvasToMonochrome(), donde 1 ya significa negro.
 *
 * @param {{ width, height, bits }} mono
 * @param {number} xOffset - desplazamiento horizontal en puntos
 * @param {number} widthBytes - bytes por línea a enviar
 */
export const packRaster = (mono, xOffset = 0, widthBytes = null) => {
    const bytesPorLinea = widthBytes || Math.ceil(mono.width / 8);
    const salida = new Uint8Array(bytesPorLinea * mono.height);

    for (let y = 0; y < mono.height; y++) {
        for (let byteIdx = 0; byteIdx < bytesPorLinea; byteIdx++) {
            let byte = 0;
            for (let bit = 0; bit < 8; bit++) {
                const x = byteIdx * 8 + bit - xOffset;
                if (x >= 0 && x < mono.width && mono.bits[y * mono.width + x]) {
                    byte |= 0x80 >> bit;
                }
            }
            salida[y * bytesPorLinea + byteIdx] = byte;
        }
    }

    return { data: salida, widthBytes: bytesPorLinea, lines: mono.height };
};
