/**
 * El mensaje de Gina con lo que sobró, pegado tal cual.
 *
 * Lo que más importa: una línea que NO se entienda no se descuenta y se avisa.
 * Descontar de menos hace que falte comida el sábado, y eso no se ve hasta ese
 * día — cuando ya no hay nada que hacer.
 */

import { describe, it, expect } from 'vitest';
import { leerSobrantes, partirLinea, sobranteDelRenglon } from '../utils/leerSobrantesPegados';
import { claveDeProduccion } from '../utils/produccionAcumulada';

describe('partirLinea', () => {

    it('aguanta la cantidad al final', () => {
        expect(partirLinea('Carne mechada 3 kg'))
            .toEqual({ nombre: 'Carne mechada', cantidadTexto: '3 kg' });
    });

    it('aguanta la cantidad al inicio', () => {
        expect(partirLinea('3 kg de carne mechada'))
            .toEqual({ nombre: 'carne mechada', cantidadTexto: '3 kg' });
    });

    it('aguanta los dos puntos', () => {
        expect(partirLinea('Carne mechada: 3 kg'))
            .toEqual({ nombre: 'Carne mechada', cantidadTexto: '3 kg' });
    });

    it('aguanta las viñetas que pone WhatsApp', () => {
        expect(partirLinea('- Carne mechada 3 kg').nombre).toBe('Carne mechada');
        expect(partirLinea('• Carne mechada 3 kg').nombre).toBe('Carne mechada');
    });

    it('descarta los encabezados y saludos', () => {
        expect(partirLinea('Sobró:')).toBeNull();
        expect(partirLinea('quedaron')).toBeNull();
        expect(partirLinea('  ')).toBeNull();
    });

    it('una línea sin cantidad se devuelve entera, para avisarla', () => {
        expect(partirLinea('Quedó media olla de arroz'))
            .toEqual({ nombre: 'Quedó media olla de arroz', cantidadTexto: '' });
    });
});

describe('leerSobrantes', () => {

    // Un mensaje como el que manda Gina de verdad
    const MENSAJE = `Sobró:
Carne mechada 3 kg
2 kg de pollo a la toscana
Vegetales mixtos: 10 tazas
Puré de papa 6 tazas
Quedó media olla de arroz`;

    const r = leerSobrantes(MENSAJE);

    it('entiende las tres formas de escribirlo', () => {
        expect(r.cocinado[claveDeProduccion('Carne mechada', 'g')]).toBe(3000);
        expect(r.cocinado[claveDeProduccion('pollo a la toscana', 'g')]).toBe(2000);
        expect(r.cocinado[claveDeProduccion('Vegetales mixtos', 'taza(s)')]).toBe(10);
        expect(r.cocinado[claveDeProduccion('Puré de papa', 'taza(s)')]).toBe(6);
    });

    it('lo que no entiende NO lo descuenta, lo avisa', () => {
        // "media olla" no es una cantidad que la hoja sepa manejar
        expect(r.sinEntender).toEqual(['Quedó media olla de arroz']);
        expect(r.reconocidos).toHaveLength(4);
    });

    it('usa el mismo nombre que la hoja', () => {
        // "Carne mechada en salsa criolla" es la misma olla que "Carne mechada"
        const uno = leerSobrantes('Carne mechada en salsa criolla 5 kg');
        expect(uno.cocinado[claveDeProduccion('Carne mechada', 'g')]).toBe(5000);
    });

    it('el mismo plato en dos líneas se suma', () => {
        const dos = leerSobrantes('Carne mechada 3 kg\nCarne mechada en salsa 2 kg');
        expect(dos.cocinado[claveDeProduccion('Carne mechada', 'g')]).toBe(5000);
    });

    it('los kilos pasan a gramos, como los lleva la hoja', () => {
        const kg = leerSobrantes('Pollo al ajillo 1.5 kg');
        expect(kg.cocinado[claveDeProduccion('Pollo al ajillo', 'g')]).toBe(1500);
    });

    it('un mensaje vacío no rompe nada', () => {
        expect(leerSobrantes('').reconocidos).toEqual([]);
        expect(leerSobrantes(null).cocinado).toEqual({});
    });

    it('un mensaje que no trae ninguna cantidad no descuenta nada', () => {
        // Mejor cero descuento que un descuento inventado
        const nada = leerSobrantes('Hola Jan\nQuedó poquito de todo\nGracias');
        expect(nada.cocinado).toEqual({});
        expect(nada.sinEntender).toContain('Quedó poquito de todo');
    });
});

/**
 * El mensaje real de Gina del viernes 11 de setiembre de 2026, con lo que quedó
 * del jueves y el viernes para el sábado.
 */
describe('el mensaje del 11 de setiembre', () => {

    const MENSAJE = `arroz con perejil unas 15 tazas
Carne en salsa 5 kg
Pollo en salsa hongos 7 kg
Pollo mediterráneo 4 kg
Cerdo BBQ 4 kg
Pollo al pesto no quedó

Picadillo mixto 2 tazas
Papas salteadas 2 tazas
Ensalada coleslaw 4 tazas`;

    const r = leerSobrantes(MENSAJE);

    it('lee las ocho cantidades sin dejar nada sin entender', () => {
        expect(r.reconocidos).toHaveLength(8);
        expect(r.sinEntender).toEqual([]);
    });

    it('"unas" no se le pega al nombre', () => {
        // "arroz con perejil unas" no calzaría con ningún renglón
        const arroz = r.reconocidos.find(x => /arroz/i.test(x.nombre));
        expect(arroz.nombre).toBe('arroz con perejil');
        expect(arroz.cantidad).toBe(15);
    });

    it('"no quedó" es cero, no un error', () => {
        // Gina lo escribió bien y dice justo lo que pasa: no hay qué descontar
        expect(r.reconocidos.some(x => /pesto/i.test(x.nombre))).toBe(false);
        expect(r.sinEntender.some(x => /pesto/i.test(x))).toBe(false);
    });

    it('los kilos pasan a gramos', () => {
        expect(r.reconocidos.find(x => /Carne en salsa/i.test(x.nombre)).cantidad).toBe(5000);
        expect(r.reconocidos.find(x => /hongos/i.test(x.nombre)).cantidad).toBe(7000);
    });

    it('CALZA con los renglones aunque Gina escriba distinto', () => {
        // Esto es lo que decide si los kilos se descuentan o se vuelven a cocinar
        const hongos = { name: 'Pollo en salsa de hongos', unit: 'g' };
        const cerdo = { name: 'Cerdo en salsa BBQ', unit: 'g' };

        expect(sobranteDelRenglon(hongos, r.reconocidos)).toBe(7000);
        expect(sobranteDelRenglon(cerdo, r.reconocidos)).toBe(4000);
    });

    it('no le descuenta a un renglón que no es', () => {
        // "Pollo en salsa de hongos" no le resta al "Pollo al pesto"
        expect(sobranteDelRenglon({ name: 'Pollo al pesto', unit: 'g' }, r.reconocidos)).toBe(0);
        expect(sobranteDelRenglon({ name: 'Arroz blanco', unit: 'taza(s)' }, r.reconocidos)).toBe(0);
    });

    it('no cruza unidades', () => {
        // 4 tazas de coleslaw no son 4 gramos
        expect(sobranteDelRenglon({ name: 'Ensalada coleslaw', unit: 'g' }, r.reconocidos)).toBe(0);
        expect(sobranteDelRenglon({ name: 'Ensalada coleslaw', unit: 'taza(s)' }, r.reconocidos)).toBe(4);
    });
});
