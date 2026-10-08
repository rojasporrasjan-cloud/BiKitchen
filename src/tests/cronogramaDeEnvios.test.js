import { describe, it, expect } from 'vitest';
import { TIPOS_DE_ENVIO, modosDeEnvio } from '../utils/registroDeEnvios';
import { cronEnPalabras, proximaVez, momentosDeLaSemana } from '../utils/horarioDeEnvios';
import { PROCESOS_DEL_SISTEMA } from '../utils/cronogramaDeMensajes';

import { config as cambios } from '../../netlify/functions/cambios-miercoles.js';
import { config as renovacion } from '../../netlify/functions/renovacion-del-dia.js';
import { config as recordatorio } from '../../netlify/functions/recordatorio-pago.js';
import { config as pagoRecibido } from '../../netlify/functions/pago-recibido.js';
import { config as hoyTeLlega } from '../../netlify/functions/hoy-te-llega.js';
import { config as guia } from '../../netlify/functions/guia-de-congelado.js';
import { config as queTal } from '../../netlify/functions/que-tal-todo.js';
import { config as volver } from '../../netlify/functions/volver-a-invitar.js';
import { config as cierre } from '../../netlify/functions/cierre-de-pedidos.js';
import { config as sync } from '../../netlify/functions/kommo-sync.js';
import { config as ventas } from '../../netlify/functions/ventas-por-envio.js';

/**
 * Jan, 8 oct 2026: el panel tiene que decir a qué hora sale cada mensaje.
 * El panel lee TIPOS_DE_ENVIO; Netlify, el `config` de cada función. Si
 * alguien cambia uno sin el otro, esta prueba falla.
 */
const FUNCIONES = {
    'cambios-miercoles': cambios, 'renovacion-del-dia': renovacion, 'recordatorio-pago': recordatorio,
    'pago-recibido': pagoRecibido, 'hoy-te-llega': hoyTeLlega, 'guia-de-congelado': guia,
    'que-tal-todo': queTal, 'volver-a-invitar': volver, 'cierre-de-pedidos': cierre,
    'kommo-sync': sync, 'ventas-por-envio': ventas
};

describe('el horario del panel es el horario real', () => {
    it.each(TIPOS_DE_ENVIO.map(t => [t.id, t]))('%s', (_, tipo) => {
        expect(FUNCIONES[tipo.funcion], `falta la función ${tipo.funcion}`).toBeTruthy();
        expect(tipo.horario).toBe(FUNCIONES[tipo.funcion].schedule);
        expect(tipo.plantilla).toBeTruthy();
        expect(['Servicio', 'Marketing']).toContain(tipo.clase);
    });

    it.each(PROCESOS_DEL_SISTEMA.map(p => [p.id, p]))('proceso %s', (id, p) => {
        expect(p.horario).toBe(FUNCIONES[id].schedule);
    });
});

describe('los horarios en palabras, en hora de Costa Rica', () => {
    it('traduce el cron UTC', () => {
        expect(cronEnPalabras('0 15 * * 1,4,5')).toBe('Lunes, jueves y viernes · 9:00 a. m.');
        expect(cronEnPalabras('0 21 * * 1,3,6')).toBe('Lunes, miércoles y sábado · 3:00 p. m.');
        expect(cronEnPalabras('0 14 * * 3')).toBe('Miércoles · 8:00 a. m.');
        expect(cronEnPalabras('*/10 * * * *')).toBe('Todos los días · cada 10 min');
        expect(cronEnPalabras('30 5 * * *')).toBe('Todos los días · 11:30 p. m.');
    });

    it('si al restar 6 horas cambia el día, cambia el día', () => {
        // 03:00 UTC del martes = 9:00 p. m. del lunes en Costa Rica
        expect(cronEnPalabras('0 3 * * 2')).toBe('Lunes · 9:00 p. m.');
        expect(momentosDeLaSemana('0 3 * * 2')).toEqual([{ dia: 1, hora: 21, minuto: 0 }]);
    });

    it('la próxima vez que sale', () => {
        // Jueves 8 oct 2026, 11:45 a. m. CR: el cierre de hoy (9 a. m.) ya pasó → viernes 9 a. m.
        const ahora = new Date('2026-10-08T17:45:00Z');
        expect(proximaVez('0 15 * * 1,4,5', ahora).toISOString()).toBe('2026-10-09T15:00:00.000Z');
        // La renovación del sábado 10 a. m.
        expect(proximaVez('0 16 * * 1,3,6', ahora).toISOString()).toBe('2026-10-10T16:00:00.000Z');
        expect(proximaVez('*/10 * * * *', ahora)).toBeNull();
    });
});

describe('el panel ve qué bot usa cada envío', () => {
    it('trae los ids de los bots (no son secretos) y los tres del cierre', () => {
        const m = modosDeEnvio({
            CIERRE_PEDIDOS_AUTOMATICO: 'prueba', KOMMO_BOT_CIERRE_MIERCOLES: '117463',
            KOMMO_BOT_CIERRE_SABADO: '117640', KOMMO_BOT_CIERRE_LUNES: '117642', KOMMO_TOKEN: 'secreto'
        });
        expect(m['cierre-pedidos'].bots).toEqual(['117463', '117640', '117642']);
        expect(JSON.stringify(m)).not.toContain('secreto');
    });
});
