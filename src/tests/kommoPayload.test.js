import { describe, it, expect } from 'vitest';
import {
    enLotes,
    soloDigitos,
    telefonosDeContacto,
    indicePorTelefono,
    etiquetaDeSegmento,
    payloadContacto,
    separarNuevosYExistentes,
    payloadEjecutarBot,
    estimarLlamadas,
    LOTE_CONTACTOS,
    LOTE_BOTS
} from '../utils/kommoPayload';

const cliente = {
    nombre: 'Angie Navarro',
    telefono: '88492466',
    telefonoOriginal: '8849-2466',
    correo: 'angie@gmail.com',
    zona: 'Alajuela',
    planes: ['Pack Desayunos Mensual'],
    entregasRestantes: 2,
    suscripcion: { total: 4, semanaActual: 3, etiqueta: 'Semana 3 de 4', proxima: '2026-08-17' }
};

const CAMPOS = {
    avance: 111, proximaEntrega: 222, entregasRestantes: 333, pack: 444, zona: 555
};

const valorDe = (payload, fieldId) =>
    payload.custom_fields_values.find((c) => c.field_id === fieldId)?.values[0]?.value;

describe('Lotes segun los limites de Kommo', () => {
    it('parte de a 50 los contactos', () => {
        const lotes = enLotes(Array.from({ length: 120 }, (_, i) => i), LOTE_CONTACTOS);
        expect(lotes.map((l) => l.length)).toEqual([50, 50, 20]);
    });

    it('parte de a 100 los bots', () => {
        const lotes = enLotes(Array.from({ length: 327 }, (_, i) => i), LOTE_BOTS);
        expect(lotes).toHaveLength(4);
        expect(lotes[3]).toHaveLength(27);
    });

    it('una lista vacía no genera lotes', () => {
        expect(enLotes([], 50)).toEqual([]);
    });
});

describe('Cruce de teléfonos con Kommo', () => {
    it('normaliza igual que la segmentación', () => {
        expect(soloDigitos('8849-2466')).toBe('88492466');
        expect(soloDigitos('+506 8849 2466')).toBe('88492466');
    });

    it('saca el teléfono de donde Kommo lo guarda', () => {
        const contactoKommo = {
            id: 900,
            custom_fields_values: [
                { field_code: 'EMAIL', values: [{ value: 'x@y.com' }] },
                { field_code: 'PHONE', values: [{ value: '+506 8849 2466' }, { value: '22001100' }] }
            ]
        };
        expect(telefonosDeContacto(contactoKommo)).toEqual(['88492466', '22001100']);
    });

    it('un contacto sin teléfono no rompe nada', () => {
        expect(telefonosDeContacto({ id: 1 })).toEqual([]);
        expect(telefonosDeContacto(null)).toEqual([]);
    });

    it('arma el índice para no preguntar uno por uno', () => {
        const indice = indicePorTelefono([
            { id: 900, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '8849-2466' }] }] },
            { id: 901, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '8721-6592' }] }] }
        ]);
        expect(indice.get('88492466')).toBe(900);
        expect(indice.get('87216592')).toBe(901);
    });

    it('si el número está repetido gana el primero, no se duplica', () => {
        const indice = indicePorTelefono([
            { id: 900, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '8849-2466' }] }] },
            { id: 999, custom_fields_values: [{ field_code: 'PHONE', values: [{ value: '8849-2466' }] }] }
        ]);
        expect(indice.get('88492466')).toBe(900);
        expect(indice.size).toBe(1);
    });
});

describe('Contacto que se le manda a Kommo', () => {
    const payload = payloadContacto(cliente, { camposIds: CAMPOS, segmentoId: 'renovacion' });

    it('manda el teléfono con field_code, que no cambia entre cuentas', () => {
        const tel = payload.custom_fields_values.find((c) => c.field_code === 'PHONE');
        expect(tel.values[0].value).toBe('8849-2466');
    });

    it('escribe el avance del pack, que es lo que Kommo no puede saber', () => {
        expect(valorDe(payload, CAMPOS.avance)).toBe('Semana 3 de 4');
        expect(valorDe(payload, CAMPOS.proximaEntrega)).toBe('2026-08-17');
        expect(valorDe(payload, CAMPOS.entregasRestantes)).toBe('2');
    });

    it('le pone la etiqueta del segmento para poder filtrar en Kommo', () => {
        expect(payload._embedded.tags).toEqual([{ name: 'bk-renovacion' }]);
        expect(etiquetaDeSegmento('dormidos')).toBe('bk-dormidos');
    });

    it('un campo que no está configurado en la cuenta simplemente no se manda', () => {
        const sinCampos = payloadContacto(cliente, { camposIds: {} });
        const soloCodigos = sinCampos.custom_fields_values.every((c) => c.field_code);
        expect(soloCodigos).toBe(true);
    });

    it('no manda vacíos: un pedido de entrega única no escribe "avance"', () => {
        const unico = { ...cliente, suscripcion: { total: 1, etiqueta: 'Semana 1 de 1' } };
        const p = payloadContacto(unico, { camposIds: CAMPOS });
        expect(valorDe(p, CAMPOS.avance)).toBeUndefined();
    });

    it('cero entregas restantes SÍ se manda, no es un vacío', () => {
        const p = payloadContacto({ ...cliente, entregasRestantes: 0 }, { camposIds: CAMPOS });
        expect(valorDe(p, CAMPOS.entregasRestantes)).toBe('0');
    });

    it('sin nombre no manda undefined a Firestore ni a Kommo', () => {
        expect(payloadContacto({}, {}).name).toBe('Sin nombre');
    });
});

describe('Quién se crea y quién se actualiza', () => {
    it('separa por si el teléfono ya existe en Kommo', () => {
        const indice = new Map([['88492466', 900]]);
        const { nuevos, existentes } = separarNuevosYExistentes(
            [cliente, { nombre: 'Nuevo', telefono: '87216592', telefonoOriginal: '8721-6592' }],
            indice
        );
        expect(existentes).toHaveLength(1);
        expect(existentes[0].id).toBe(900);
        expect(nuevos).toHaveLength(1);
        expect(nuevos[0].nombre).toBe('Nuevo');
    });

    it('con Kommo vacío todos son nuevos', () => {
        const { nuevos, existentes } = separarNuevosYExistentes([cliente], new Map());
        expect(nuevos).toHaveLength(1);
        expect(existentes).toEqual([]);
    });
});

describe('Lanzar el Salesbot', () => {
    it('arma el cuerpo que pide POST /api/v4/bots/run', () => {
        expect(payloadEjecutarBot(77, [900, 901])).toEqual([
            { bot_id: 77, entity_id: 900, entity_type: 'contacts' },
            { bot_id: 77, entity_id: 901, entity_type: 'contacts' }
        ]);
    });

    it('los ids van como número aunque lleguen como texto', () => {
        const [primero] = payloadEjecutarBot('77', ['900']);
        expect(primero.bot_id).toBe(77);
        expect(primero.entity_id).toBe(900);
    });
});

describe('Cuántas llamadas va a hacer', () => {
    it('lo calcula antes de arrancar para poder avisarle al usuario', () => {
        // 327 clientes nuevos + 327 envíos = 7 + 4
        expect(estimarLlamadas({ nuevos: 327, existentes: 0, aEnviar: 327 })).toBe(11);
    });

    it('sin nada que hacer, cero llamadas', () => {
        expect(estimarLlamadas({})).toBe(0);
    });
});
