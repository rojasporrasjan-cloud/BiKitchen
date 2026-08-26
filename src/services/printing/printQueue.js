/**
 * Cola de impresión de etiquetas.
 *
 * Existe porque un lote puede ser de 150 etiquetas y no se le pueden mandar 150
 * operaciones simultáneas a una impresora: se imprimen de una en una, en orden,
 * y el trabajo se puede cancelar a mitad.
 *
 * La cola no sabe nada de Bluetooth: solo llama `adapter.printLabel()`. El mismo
 * código va a servir para el adaptador real de la M110 sin cambios.
 *
 * Una etiqueta se cuenta como procesada SOLO cuando `printLabel()` resolvió. Si
 * la promesa se rechaza, la cola se detiene ahí y deja constancia de en cuál se
 * quedó, para poder retomar sin reimprimir lo que ya salió.
 */

export const JOB_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    ERROR: 'error'
};

export class PrintQueue {
    constructor(adapter) {
        this.adapter = adapter;
        this.reset();
    }

    reset() {
        this.labels = [];
        this.status = JOB_STATUS.PENDING;
        this.processed = 0;
        this.error = null;
        this.cancelRequested = false;
    }

    get pending() {
        return Math.max(0, this.labels.length - this.processed);
    }

    get total() {
        return this.labels.length;
    }

    snapshot() {
        return {
            status: this.status,
            total: this.total,
            processed: this.processed,
            pending: this.pending,
            error: this.error,
            isSimulated: !!this.adapter?.isSimulated
        };
    }

    cancel() {
        this.cancelRequested = true;
    }

    /**
     * Procesa el lote entero, avisando el progreso después de cada etiqueta.
     *
     * @param {Array} labels - etiquetas ya expandidas (una por envase)
     * @param {Function} onProgress - recibe el snapshot tras cada etiqueta
     */
    async run(labels, onProgress = () => {}) {
        this.reset();
        this.labels = labels || [];

        if (this.labels.length === 0) {
            this.status = JOB_STATUS.COMPLETED;
            onProgress(this.snapshot());
            return this.snapshot();
        }

        this.status = JOB_STATUS.PROCESSING;
        onProgress(this.snapshot());

        try {
            await this.adapter.connect();

            for (const label of this.labels) {
                if (this.cancelRequested) {
                    this.status = JOB_STATUS.CANCELLED;
                    onProgress(this.snapshot());
                    return this.snapshot();
                }

                await this.adapter.printLabel(label);
                this.processed++;
                onProgress(this.snapshot());
            }

            this.status = JOB_STATUS.COMPLETED;
        } catch (err) {
            this.status = JOB_STATUS.ERROR;
            this.error = err?.message || 'Error de comunicación con la impresora';
        } finally {
            try {
                await this.adapter.disconnect();
            } catch {
                // Cerrar la conexión no puede cambiar el resultado del lote.
            }
        }

        onProgress(this.snapshot());
        return this.snapshot();
    }
}
