/**
 * Contrato entre BiKitchen y una impresora de etiquetas.
 *
 * La aplicación nunca debe saber si detrás hay Bluetooth, USB o un servicio
 * local: solo habla con esta interfaz. Así el día que la Phomemo M110 funcione,
 * lo único que cambia es qué adaptador se instancia.
 *
 * Implementaciones:
 *   MockPrinterAdapter        → simulación, sin hardware. Es lo que corre hoy.
 *   PhomemoM110PrinterAdapter → PENDIENTE. No existe todavía, y a propósito:
 *                               escribir código BLE/USB que nunca se probó
 *                               contra la impresora real daría la falsa
 *                               sensación de que la función está terminada.
 *
 * Cuando exista la impresora física, el adaptador real tiene que implementar
 * exactamente estos métodos y nada más. La cola (printQueue.js) y la pantalla
 * no deberían necesitar ni un cambio.
 */

export const PRINTER_STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    READY: 'ready',
    PRINTING: 'printing',
    ERROR: 'error'
};

/* eslint-disable no-unused-vars */

/**
 * @interface PrinterAdapter
 *
 * connect()            → Promise<void>   establece la conexión
 * disconnect()         → Promise<void>   la cierra
 * getStatus()          → string          uno de PRINTER_STATUS
 * printLabel(label)    → Promise<void>   imprime UNA etiqueta; resuelve solo
 *                                        cuando la capa de impresión aceptó el
 *                                        trabajo, no antes
 * isSimulated          → boolean         true = no sale papel. La UI lo usa para
 *                                        no decir nunca "impreso" cuando no lo está.
 */

/**
 * Adaptador de simulación.
 *
 * Recorre la misma máquina de estados que tendría el real, con una demora
 * configurable, para poder desarrollar y probar el flujo completo sin hardware.
 * NO produce etiquetas físicas y lo declara con `isSimulated`.
 */
export class MockPrinterAdapter {
    constructor({ delayMs = 40, failEveryN = 0 } = {}) {
        this.delayMs = delayMs;
        this.failEveryN = failEveryN;
        this.status = PRINTER_STATUS.DISCONNECTED;
        this.printed = 0;
        this.isSimulated = true;
        this.name = 'Simulador (sin impresora física)';
    }

    #wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async connect() {
        this.status = PRINTER_STATUS.CONNECTING;
        await this.#wait(this.delayMs * 3);
        this.status = PRINTER_STATUS.READY;
    }

    async disconnect() {
        await this.#wait(this.delayMs);
        this.status = PRINTER_STATUS.DISCONNECTED;
    }

    getStatus() {
        return this.status;
    }

    async printLabel(label) {
        if (this.status !== PRINTER_STATUS.READY && this.status !== PRINTER_STATUS.PRINTING) {
            throw new Error('La impresora simulada no está conectada');
        }
        this.status = PRINTER_STATUS.PRINTING;
        await this.#wait(this.delayMs);
        this.printed++;

        // Permite ejercitar el manejo de errores de la cola sin hardware.
        if (this.failEveryN > 0 && this.printed % this.failEveryN === 0) {
            this.status = PRINTER_STATUS.ERROR;
            throw new Error(`Fallo simulado al imprimir "${label?.protein || 'etiqueta'}"`);
        }

        this.status = PRINTER_STATUS.READY;
    }
}
