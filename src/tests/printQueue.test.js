import { describe, it, expect } from 'vitest';
import { PrintQueue, JOB_STATUS } from '../services/printing/printQueue';
import { MockPrinterAdapter, PRINTER_STATUS } from '../services/printing/PrinterAdapter';

const etiquetas = (n) => Array.from({ length: n }, (_, i) => ({
    type: 'Regular', protein: `Plato ${i}`, expirationDate: '28 agosto'
}));

describe('PrintQueue', () => {
    it('procesa el lote completo de a una etiqueta', async () => {
        const queue = new PrintQueue(new MockPrinterAdapter({ delayMs: 0 }));
        const resultado = await queue.run(etiquetas(10));

        expect(resultado.status).toBe(JOB_STATUS.COMPLETED);
        expect(resultado.processed).toBe(10);
        expect(resultado.pending).toBe(0);
    });

    it('informa el progreso después de cada etiqueta', async () => {
        const queue = new PrintQueue(new MockPrinterAdapter({ delayMs: 0 }));
        const vistos = [];
        await queue.run(etiquetas(5), s => vistos.push(s.processed));

        expect(vistos[0]).toBe(0);
        expect(vistos[vistos.length - 1]).toBe(5);
    });

    it('marca el lote como simulado cuando el adaptador lo es', async () => {
        const queue = new PrintQueue(new MockPrinterAdapter({ delayMs: 0 }));
        const resultado = await queue.run(etiquetas(2));

        expect(resultado.isSimulated).toBe(true);
    });

    it('se detiene al cancelar y deja constancia de lo que faltaba', async () => {
        const queue = new PrintQueue(new MockPrinterAdapter({ delayMs: 0 }));
        const resultado = await queue.run(etiquetas(40), s => {
            if (s.processed === 6) queue.cancel();
        });

        expect(resultado.status).toBe(JOB_STATUS.CANCELLED);
        expect(resultado.processed).toBe(6);
        expect(resultado.pending).toBe(34);
    });

    it('un fallo de comunicación no se reporta como éxito', async () => {
        const queue = new PrintQueue(new MockPrinterAdapter({ delayMs: 0, failEveryN: 4 }));
        const resultado = await queue.run(etiquetas(20));

        expect(resultado.status).toBe(JOB_STATUS.ERROR);
        expect(resultado.error).toBeTruthy();
        // Las 3 que sí salieron quedan contadas: reintentar no debe reimprimirlas.
        expect(resultado.processed).toBe(3);
    });

    it('un lote vacío termina sin tocar la impresora', async () => {
        const adapter = new MockPrinterAdapter({ delayMs: 0 });
        const queue = new PrintQueue(adapter);
        const resultado = await queue.run([]);

        expect(resultado.status).toBe(JOB_STATUS.COMPLETED);
        expect(resultado.total).toBe(0);
        expect(adapter.getStatus()).toBe(PRINTER_STATUS.DISCONNECTED);
    });

    it('no manda una etiqueta hasta que la anterior terminó', async () => {
        // De un lote de 11 salieron 9 y la décima cortada: la cola mandaba la
        // siguiente mientras la impresora seguía sacando papel.
        let imprimiendo = false;
        let solapes = 0;

        const lento = {
            isSimulated: false,
            connect: async () => {},
            disconnect: async () => {},
            getStatus: () => 'ready',
            printLabel: async () => {
                if (imprimiendo) solapes++;
                imprimiendo = true;
                await new Promise(r => setTimeout(r, 5));
                imprimiendo = false;
            }
        };

        const queue = new PrintQueue(lento);
        const resultado = await queue.run(etiquetas(11));

        expect(solapes).toBe(0);
        expect(resultado.processed).toBe(11);
        expect(resultado.status).toBe(JOB_STATUS.COMPLETED);
    });

    it('las 11 etiquetas del lote llegan a la impresora, en orden', async () => {
        const recibidas = [];
        const espia = {
            isSimulated: false,
            connect: async () => {},
            disconnect: async () => {},
            getStatus: () => 'ready',
            printLabel: async (l) => { recibidas.push(l.protein); }
        };

        const queue = new PrintQueue(espia);
        const lote = etiquetas(11);
        const resultado = await queue.run(lote);

        expect(recibidas).toHaveLength(11);
        expect(recibidas).toEqual(lote.map(l => l.protein));
        expect(resultado.processed).toBe(11);
    });

    it('si una falla a mitad, dice exactamente cuántas alcanzaron a salir', async () => {
        const queue = new PrintQueue(new MockPrinterAdapter({ delayMs: 0, failEveryN: 10 }));
        const resultado = await queue.run(etiquetas(11));

        expect(resultado.status).toBe(JOB_STATUS.ERROR);
        expect(resultado.processed).toBe(9);   // las 9 buenas quedan contadas
        expect(resultado.pending).toBe(2);     // y se sabe qué falta
    });

    it('cierra la conexión aunque el lote falle', async () => {
        const adapter = new MockPrinterAdapter({ delayMs: 0, failEveryN: 1 });
        const queue = new PrintQueue(adapter);
        await queue.run(etiquetas(3));

        expect(adapter.getStatus()).toBe(PRINTER_STATUS.DISCONNECTED);
    });
});
