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
