import { describe, it, expect } from 'vitest';
import {
    renderPlantilla,
    variablesDesconocidas,
    clientesConHuecos,
    PLANTILLAS_BASE
} from '../utils/plantillasDifusion';

const cliente = {
    nombre: 'Andrés Víquez Viquez',
    planes: ['Pack Keto Mensual'],
    zona: 'Guácima',
    ultimaEntrega: '2026-09-07',
    diasParaUltimaEntrega: 22
};

describe('Reemplazo de variables', () => {
    it('usa solo el primer nombre cuando se pide', () => {
        expect(renderPlantilla('Hola {{primerNombre}}!', cliente)).toBe('Hola Andrés!');
    });

    it('el nombre completo también', () => {
        expect(renderPlantilla('{{nombre}}', cliente)).toBe('Andrés Víquez Viquez');
    });

    it('la fecha sale escrita, no en formato de máquina', () => {
        const texto = renderPlantilla('Vence el {{ultimaEntrega}}', cliente);
        expect(texto).not.toContain('2026-09-07');
        expect(texto).toMatch(/setiembre|septiembre/i);
    });

    it('aguanta espacios adentro de las llaves', () => {
        expect(renderPlantilla('Hola {{ primerNombre }}', cliente)).toBe('Hola Andrés');
    });

    it('reemplaza la misma variable todas las veces que aparezca', () => {
        expect(renderPlantilla('{{primerNombre}}, {{primerNombre}}', cliente))
            .toBe('Andrés, Andrés');
    });

    it('cero es un valor válido, no un hueco', () => {
        const hoyMismo = { ...cliente, diasParaUltimaEntrega: 0 };
        expect(renderPlantilla('Faltan {{diasRestantes}} días', hoyMismo))
            .toBe('Faltan 0 días');
    });
});

describe('Errores de tipeo en las variables', () => {
    it('una variable mal escrita se deja visible en vez de dejar un hueco', () => {
        // Así el usuario lo ve en la vista previa y lo corrige
        expect(renderPlantilla('Hola {{nombrre}}', cliente)).toBe('Hola {{nombrre}}');
    });

    it('las reporta para poder avisar antes de mandar', () => {
        expect(variablesDesconocidas('Hola {{nombrre}} y {{pack}}')).toEqual(['nombrre']);
    });

    it('no repite la misma dos veces', () => {
        expect(variablesDesconocidas('{{xx}} {{xx}}')).toEqual(['xx']);
    });

    it('un texto sin variables no reporta nada', () => {
        expect(variablesDesconocidas('Hola a todos')).toEqual([]);
    });
});

describe('Clientes a los que les quedaría un hueco', () => {
    it('detecta al que no tiene el dato que pide la plantilla', () => {
        const sinZona = { ...cliente, nombre: 'Laura', zona: '' };
        const conHuecos = clientesConHuecos('Entregamos en {{zona}}', [cliente, sinZona]);
        expect(conHuecos).toHaveLength(1);
        expect(conHuecos[0].nombre).toBe('Laura');
    });

    it('una plantilla sin variables nunca deja huecos', () => {
        expect(clientesConHuecos('Mensaje fijo', [{ nombre: '' }])).toEqual([]);
    });

    it('una variable que no existe no cuenta como hueco', () => {
        // Esa la reporta variablesDesconocidas, no acá
        expect(clientesConHuecos('{{inventada}}', [cliente])).toEqual([]);
    });
});

describe('Plantillas de arranque', () => {
    it('todas usan variables válidas', () => {
        PLANTILLAS_BASE.forEach((p) => {
            expect(variablesDesconocidas(p.texto)).toEqual([]);
        });
    });

    it('se resuelven sin dejar llaves sueltas', () => {
        PLANTILLAS_BASE.forEach((p) => {
            expect(renderPlantilla(p.texto, cliente)).not.toMatch(/\{\{/);
        });
    });

    it('traen el campo para la plantilla aprobada de Meta', () => {
        // Vacío por ahora, pero tiene que existir para no migrar después
        PLANTILLAS_BASE.forEach((p) => {
            expect(p).toHaveProperty('nombreMeta');
        });
    });
});

describe('Variables del avance del pack', () => {
    const enCurso = {
        nombre: 'Angie Navarro',
        planes: ['Pack Desayunos Mensual'],
        entregasRestantes: 2,
        suscripcion: {
            total: 4, semanaActual: 3, etiqueta: 'Semana 3 de 4',
            proxima: '2026-08-17', finalizado: false
        }
    };

    it('dice en qué semana va', () => {
        expect(renderPlantilla('Vas en la semana {{semana}} de {{totalSemanas}}', enCurso))
            .toBe('Vas en la semana 3 de 4');
    });

    it('la etiqueta completa también sirve', () => {
        expect(renderPlantilla('{{avance}}', enCurso)).toBe('Semana 3 de 4');
    });

    it('cuántas entregas le quedan', () => {
        expect(renderPlantilla('Te quedan {{entregasRestantes}} entregas', enCurso))
            .toBe('Te quedan 2 entregas');
    });

    it('la próxima entrega sale escrita', () => {
        const texto = renderPlantilla('Tu próxima entrega: {{proximaEntrega}}', enCurso);
        expect(texto).not.toContain('2026-08-17');
        expect(texto).toMatch(/agosto/i);
    });

    it('un pedido de entrega única no inventa "semana 1 de 1"', () => {
        const unico = { nombre: 'Laura', suscripcion: { total: 1, semanaActual: 1, etiqueta: 'Semana 1 de 1' } };
        expect(renderPlantilla('{{avance}}', unico)).toBe('');
        expect(renderPlantilla('{{semana}}', unico)).toBe('');
    });

    it('a ese cliente se le avisa que le quedaría un hueco', () => {
        const unico = { nombre: 'Laura', suscripcion: { total: 1, semanaActual: 1, etiqueta: 'x' } };
        expect(clientesConHuecos('Vas en {{avance}}', [enCurso, unico])).toHaveLength(1);
    });

    it('cero entregas restantes es un valor válido, no un hueco', () => {
        const terminado = { ...enCurso, entregasRestantes: 0 };
        expect(renderPlantilla('{{entregasRestantes}}', terminado)).toBe('0');
        expect(clientesConHuecos('{{entregasRestantes}}', [terminado])).toEqual([]);
    });

    it('un cliente sin suscripción no revienta', () => {
        expect(renderPlantilla('{{avance}}{{semana}}{{proximaEntrega}}', { nombre: 'X' })).toBe('');
    });
});
