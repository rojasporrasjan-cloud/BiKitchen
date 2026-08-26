/**
 * Adaptador real: Phomemo M110 por Web Bluetooth.
 *
 * Implementa la misma interfaz que MockPrinterAdapter (ver PrinterAdapter.js),
 * así que la cola y la pantalla no distinguen uno de otro.
 *
 * SIN VALIDAR CONTRA PAPEL. El protocolo está tomado de dos proyectos de
 * reverse-engineering y los bytes se verificaron byte a byte contra
 * tools/phomemo/print_test.py, pero hasta que no salga una etiqueta física
 * bien impresa esto no se puede dar por bueno.
 *
 * Limitaciones de Web Bluetooth, a tener presentes:
 *   - Solo Chrome y Edge. Firefox y Safari no lo soportan.
 *   - Exige HTTPS o localhost.
 *   - `requestDevice()` tiene que salir de un clic real del usuario, por eso
 *     está separado de `connect()`: la cola llama a connect() después de varios
 *     `await` y para entonces el navegador ya no acepta abrir el diálogo.
 *   - La M110 no informa por BLE si el papel salió bien. Lo máximo que podemos
 *     afirmar es que aceptó los bytes.
 */

import { PRINTER_STATUS } from './PrinterAdapter';
import {
    BLE_SERVICE_UUID, BLE_ADVERTISED_SERVICE_UUID, BLE_WRITE_UUID, BLE_NOTIFY_UUID,
    CHUNK_SIZE, CHUNK_DELAY_MS, HEAD_DOTS, HEAD_BYTES,
    cmdInit, cmdSpeed, cmdDensity, cmdMediaLabels, cmdRasterHeader, cmdFooter, packRaster
} from './phomemoProtocol';
import { renderLabel, canvasToMonochrome, mmToPx } from '../../utils/labels/labelRenderer';
import { DEFAULT_SETTINGS } from './printerSettings';

const esperar = (ms) => new Promise(r => setTimeout(r, ms));

/** Cuál impresora se eligió la última vez, para volver a ella sin preguntar. */
const DEVICE_KEY = 'bikitchen_printer_device_id';
const DEVICE_NAME_KEY = 'bikitchen_printer_device_name';

/** Nombre de la última impresora usada, aunque el navegador ya no la recuerde. */
export const ultimaImpresora = () => {
    try { return localStorage.getItem(DEVICE_NAME_KEY); } catch { return null; }
};

/**
 * ¿Puede el navegador reconectar sin volver a preguntar?
 *
 * Chrome solo expone `getDevices()` con la opción
 * chrome://flags/#enable-web-bluetooth-new-permissions-backend activada.
 * Sin eso, tras recargar hay que autorizar la impresora de nuevo con un clic.
 */
export const puedeReconectarSolo = () =>
    !!(typeof navigator !== 'undefined' && navigator.bluetooth && navigator.bluetooth.getDevices);

export const webBluetoothDisponible = () =>
    typeof navigator !== 'undefined' && !!navigator.bluetooth;

export class PhomemoM110Adapter {
    /**
     * @param settings - ver printerSettings.js (tamaño, corrimientos, densidad)
     * @param logo - canvas de prepareLogo(), o null para usar el texto
     */
    constructor(settings = {}, logo = null) {
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        this.logo = logo;

        this.status = PRINTER_STATUS.DISCONNECTED;
        this.isSimulated = false;
        this.name = 'Phomemo M110';
        this.device = null;
        this.characteristic = null;
        this.notifyChar = null;
        // Lo último que contestó la impresora. Sirve para diagnosticar sin
        // tener que abrir la consola del navegador.
        this.lastResponses = [];
        this.bytesSent = 0;
        this.labelsPrinted = 0;
    }

    /**
     * Abre el diálogo del navegador para elegir la impresora.
     * TIENE que llamarse desde el manejador de un clic.
     *
     * @param {boolean} mostrarTodos - si el filtro por nombre no la encuentra
     */
    /**
     * Recupera la impresora ya autorizada, sin diálogo ni clic.
     *
     * Al recargar la página se pierde el objeto del dispositivo y había que
     * volver a elegirlo a mano cada vez. Chrome recuerda lo que ya autorizaste
     * y lo devuelve por `getDevices()`, así que la reconexión es automática.
     *
     * Devuelve el nombre si la encontró, o null si hay que pedirla de nuevo.
     */
    async restoreDevice() {
        if (!webBluetoothDisponible() || !navigator.bluetooth.getDevices) return null;

        try {
            const conocidos = await navigator.bluetooth.getDevices();
            if (!conocidos || conocidos.length === 0) return null;

            const guardado = localStorage.getItem(DEVICE_KEY);
            const elegido = conocidos.find(d => d.id === guardado) || conocidos[0];
            if (!elegido) return null;

            this.device = elegido;
            this.name = elegido.name || 'Phomemo M110';
            this.device.addEventListener('gattserverdisconnected', () => {
                this.status = PRINTER_STATUS.DISCONNECTED;
                this.characteristic = null;
            });
            return this.name;
        } catch (err) {
            console.warn('[M110] No se pudo recuperar la impresora autorizada:', err.message);
            return null;
        }
    }

    async requestDevice(mostrarTodos = false) {
        if (!webBluetoothDisponible()) {
            throw new Error('Este navegador no soporta Web Bluetooth. Usá Chrome o Edge.');
        }

        // Se filtra por lo que la impresora ANUNCIA (af30 y su número de serie),
        // no por el servicio de impresión ff00: ese solo aparece una vez
        // conectada, así que filtrar por él dejaba el diálogo vacío.
        const opciones = mostrarTodos
            ? { acceptAllDevices: true, optionalServices: [BLE_SERVICE_UUID] }
            : {
                filters: [
                    { services: [BLE_ADVERTISED_SERVICE_UUID] },
                    { namePrefix: 'M110' },
                    { namePrefix: 'Phomemo' },
                    { namePrefix: 'Q' }   // la serie con la que se anuncia esta M110
                ],
                optionalServices: [BLE_SERVICE_UUID, BLE_ADVERTISED_SERVICE_UUID]
            };

        this.device = await navigator.bluetooth.requestDevice(opciones);
        this.name = this.device.name || 'Phomemo M110';
        // Recordarla para reconectar sola después de recargar la página.
        try {
            localStorage.setItem(DEVICE_KEY, this.device.id);
            localStorage.setItem(DEVICE_NAME_KEY, this.name);
        } catch { /* opcional */ }

        this.device.addEventListener('gattserverdisconnected', () => {
            this.status = PRINTER_STATUS.DISCONNECTED;
            this.characteristic = null;
        });

        return this.device.name;
    }

    async connect() {
        if (!this.device) {
            throw new Error('Todavía no elegiste la impresora. Tocá "Conectar impresora" primero.');
        }

        if (this.characteristic && this.device.gatt?.connected) {
            this.status = PRINTER_STATUS.READY;
            return;
        }

        this.status = PRINTER_STATUS.CONNECTING;
        try {
            const server = await this.device.gatt.connect();
            // Descubrir servicios inmediatamente después de conectar falla a
            // veces: la impresora necesita un instante.
            await esperar(100);
            const service = await server.getPrimaryService(BLE_SERVICE_UUID);
            this.characteristic = await service.getCharacteristic(BLE_WRITE_UUID);

            // Escuchar el canal de estado ANTES de mandar nada.
            //
            // No es opcional: desde Python la impresora imprime y contesta
            // "01 01" a cada bloque, y la única diferencia con el navegador
            // —que aceptaba todo sin imprimir— era tener esta suscripción
            // abierta. La M110 parece necesitar el canal activo para procesar
            // el trabajo.
            try {
                this.notifyChar = await service.getCharacteristic(BLE_NOTIFY_UUID);
                this.lastResponses = [];
                this.notifyChar.addEventListener('characteristicvaluechanged', (e) => {
                    const v = new Uint8Array(e.target.value.buffer);
                    this.lastResponses.push([...v].map(b => b.toString(16).padStart(2, '0')).join(' '));
                    if (this.lastResponses.length > 40) this.lastResponses.shift();
                });
                await this.notifyChar.startNotifications();
            } catch (err) {
                // Si no se puede escuchar, se sigue: mejor intentar imprimir
                // que bloquear el trabajo por el canal de diagnóstico.
                console.warn('[M110] No se pudo abrir el canal de estado:', err.message);
            }

            this.status = PRINTER_STATUS.READY;
        } catch (err) {
            this.status = PRINTER_STATUS.ERROR;
            throw new Error(`No se pudo conectar con la impresora: ${err.message}`);
        }
    }

    async disconnect() {
        try {
            if (this.device?.gatt?.connected) this.device.gatt.disconnect();
        } finally {
            this.characteristic = null;
            this.status = PRINTER_STATUS.DISCONNECTED;
        }
    }

    getStatus() {
        return this.status;
    }

    async #write(bytes) {
        const c = this.characteristic;
        if (!c) throw new Error('La impresora se desconectó');

        // Con acuse (writeValue) el navegador espera a que la impresora
        // confirme cada bloque: eso es control de flujo de verdad. Sin acuse es
        // más rápido, pero en un lote largo se le llena el buffer y pierde
        // datos —así se cortó una etiqueta a mitad en un lote de 11—.
        if (this.settings.reliableWrite === false
            && c.properties?.writeWithoutResponse
            && c.writeValueWithoutResponse) {
            try {
                await c.writeValueWithoutResponse(bytes);
                return;
            } catch {
                // cae a writeValue
            }
        }
        await c.writeValue(bytes);
    }

    /**
     * Cuánto tarda la etiqueta en SALIR del cabezal.
     *
     * Transmitir los bytes no es imprimir: el papel avanza a unos 18 mm/s y
     * hasta que no termina, lo que se le mande encima se pierde. Se calcula
     * según el alto real de la etiqueta, con margen.
     */
    tiempoDeImpresionMs() {
        const fijado = Number(this.settings.interLabelDelayMs) || 0;
        if (fijado > 0) return fijado;

        const altoMm = Number(this.settings.heightMm) || 20;
        const MM_POR_SEGUNDO = 18;
        // 20 mm ≈ 1,1 s de papel. El margen cubre el arranque del motor.
        return Math.round((altoMm / MM_POR_SEGUNDO) * 1000) + 450;
    }

    /**
     * Pausa entre bloques de imagen.
     *
     * Con escritura confirmada no hace falta ninguna: el acuse de la impresora
     * YA es el control de flujo, y esperar además 20 ms por bloque le sumaba
     * 1,3 s a cada etiqueta sin ganar nada. Solo se espera cuando se escribe
     * sin acuse, que es cuando nadie regula el ritmo.
     */
    #pausaEntreBloques() {
        return this.settings.reliableWrite === false ? CHUNK_DELAY_MS : 0;
    }

    /**
     * Etiqueta → bytes del cabezal, pasando por el mismo dibujo que la vista previa.
     *
     * Se manda siempre la línea completa del cabezal (48 bytes) con la etiqueta
     * centrada, y encima se aplica la calibración que haya configurado el
     * usuario. El corrimiento vertical son líneas en blanco al inicio: la M110
     * no tiene comando para mover el origen, así que se empuja el contenido.
     */
    #rasterizar(label) {
        const s = this.settings;
        const canvas = document.createElement('canvas');
        renderLabel(canvas, label, {
            ...s,
            logo: s.useLogo ? this.logo : null
        });
        const mono = canvasToMonochrome(canvas);

        const centrado = Math.round((HEAD_DOTS - mono.width) / 2);
        const xOffset = Math.max(0, centrado + mmToPx(s.offsetXmm || 0));

        const { data, widthBytes, lines } = packRaster(mono, xOffset, HEAD_BYTES);

        const lineasArriba = Math.max(0, mmToPx(s.offsetYmm || 0));
        if (lineasArriba === 0) return { data, widthBytes, lines };

        const conMargen = new Uint8Array(widthBytes * (lines + lineasArriba));
        conMargen.set(data, widthBytes * lineasArriba);
        return { data: conMargen, widthBytes, lines: lines + lineasArriba };
    }

    async printLabel(label) {
        if (this.status !== PRINTER_STATUS.READY && this.status !== PRINTER_STATUS.PRINTING) {
            throw new Error('La impresora no está lista');
        }

        this.status = PRINTER_STATUS.PRINTING;
        this.lastResponses = [];
        this.bytesSent = 0;
        try {
            const { data, widthBytes, lines } = this.#rasterizar(label);

            await this.#write(cmdInit());                         await esperar(30);
            await this.#write(cmdSpeed(this.settings.speed));     await esperar(30);
            await this.#write(cmdDensity(this.settings.density)); await esperar(30);
            await this.#write(cmdMediaLabels());                  await esperar(30);
            await this.#write(cmdRasterHeader(widthBytes, lines));

            const pausaBloque = this.#pausaEntreBloques();
            for (let i = 0; i < data.length; i += CHUNK_SIZE) {
                const bloque = data.slice(i, i + CHUNK_SIZE);
                await this.#write(bloque);
                this.bytesSent += bloque.length;
                if (pausaBloque) await esperar(pausaBloque);
            }

            await esperar(120);
            await this.#write(cmdFooter());

            // Esperar a que el papel TERMINE de salir antes de dar la etiqueta
            // por hecha. La cola manda la siguiente en cuanto esto resuelve, y
            // si la impresora sigue ocupada, esa siguiente se pierde.
            await esperar(this.tiempoDeImpresionMs());

            this.labelsPrinted++;
            this.status = PRINTER_STATUS.READY;
        } catch (err) {
            this.status = PRINTER_STATUS.ERROR;
            throw err;
        }
    }
}
