import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

/**
 * Las dos pantallas del link de cambios, usadas como las usaría una persona.
 */

const estado = vi.hoisted(() => ({ enviado: null, pedidos: [], opciones: [], buscado: null }));

vi.mock('../firebase/config', () => ({ db: {}, auth: { currentUser: { getIdToken: async () => 't' } }, storage: {} }));
vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));
vi.mock('../components/PageTransition', () => ({ default: ({ children }) => children }));
vi.mock('../hooks/useWhatsApp', () => ({ useWhatsApp: () => ({ getWhatsAppUrl: () => 'https://wa.me/x' }) }));
vi.mock('../hooks/usePedidosDeFechas', () => ({ default: () => ({ pedidos: estado.pedidos, cargando: false, error: null }) }));
vi.mock('../hooks/useSubstitutions', () => ({ useSubstitutions: () => ({ substitutions: { proteins: ['Estofado de res casero'], vegetables: [], carbos: ['Arroz blanco'] } }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isSuperAdmin: () => true }) }));
vi.mock('../components/admin/EnvioKommo', () => ({ default: ({ destinatarios }) => <p>Kommo: {destinatarios.length}</p> }));
vi.mock('../utils/firestoreMenus', () => ({
    getOfficialMenus: async () => ({
        bajoCalorias: [
            { numero: 1, proteina: 'Filet de tilapia empanizado', vegetal: 'Relish de vegetales', carbo: 'Pure de papa' },
            { numero: 2, proteina: 'Pollo mostaza miel', vegetal: 'Guiso de ayote y maiz', carbo: 'Pure de papa' }
        ]
    })
}));

const DATOS = {
    nombre: 'Ana', pack: 'Pack Mensual Bajo en Calorías', fecha: '2026-10-03',
    cierreEnPalabras: 'miércoles 30 de setiembre, 8 p. m.', cerrada: false, guardado: null,
    permitido: {
        tipo: 'menu', familia: 'bajoCalorias', packs: 1, maxCambios: 2, cenas: [],
        almuerzos: [
            { numero: 1, proteina: 'Filet de tilapia empanizado', vegetal: 'Relish de vegetales', carbo: 'Pure de papa' },
            { numero: 2, proteina: 'Pollo mostaza miel', vegetal: 'Guiso de ayote y maiz', carbo: 'Pure de papa' }
        ],
        opciones: { proteina: ['Estofado de res casero'], vegetal: [], carbo: ['Arroz blanco'] }
    }
};

beforeEach(() => {
    estado.enviado = null;
    globalThis.fetch = vi.fn(async (_url, { body }) => {
        const cuerpo = JSON.parse(body);
        if (cuerpo.accion === 'guardar') { estado.enviado = cuerpo; return { ok: true, json: async () => ({ ok: true }) }; }
        if (cuerpo.accion === 'buscar') {
            estado.buscado = cuerpo;
            return cuerpo.nombre === 'Ana'
                ? { ok: true, json: async () => ({ opciones: estado.opciones }) }
                : { ok: false, json: async () => ({ error: 'No encontramos un pedido con ese número y ese nombre para esta semana.' }) };
        }
        if (cuerpo.accion === 'generar') {
            return { ok: true, json: async () => ({ links: cuerpo.pedidos.map(p => ({ id: p.id, url: `https://bk/cambios/${p.id}` })) }) };
        }
        return { ok: true, json: async () => DATOS };
    });
});

const { default: CambiosSemanaPage } = await import('../pages/CambiosSemanaPage');
const { default: CambiosSemanaView } = await import('../pages/admin/CambiosSemanaView');
const { default: BuscarCambiosPage } = await import('../pages/BuscarCambiosPage');
const { proximoCiclo } = await import('../utils/envioDeCambios');

describe('la página del cliente', () => {

    it('cambia el puré en los DOS platos que lo llevan, cuenta uno, y manda el ingrediente', async () => {
        await act(async () => {
            render(<MemoryRouter initialEntries={['/cambios/abc']}><Routes><Route path="/cambios/:codigo" element={<CambiosSemanaPage />} /></Routes></MemoryRouter>);
        });
        expect(screen.getByText('¡Hola, Ana! 👋')).toBeTruthy();

        const plato1 = screen.getByText('Plato 1').closest('li');
        const botonesCambiar = within(plato1).getAllByText('Cambiar');
        fireEvent.click(botonesCambiar[botonesCambiar.length - 1]);        // la harina del plato 1
        fireEvent.click(screen.getByText('Arroz blanco'));

        expect(screen.getAllByText('Arroz blanco')).toHaveLength(2);        // plato 1 y plato 2
        expect(screen.getByText(/Llevás/).textContent).toMatch(/1 de 2/);

        await act(async () => { fireEvent.click(screen.getByText('Enviar mis cambios')); });
        expect(estado.enviado.cambios).toEqual([{ comida: 'almuerzo', parte: 'carbo', de: 'Pure de papa', a: 'Arroz blanco' }]);
        expect(screen.getByText('¡Listo! Ya tenemos tus cambios')).toBeTruthy();
        expect(screen.getByText(/Platos 1 y 2: Pure de papa → Arroz blanco/)).toBeTruthy();
    });
});

describe('la pantalla del panel', () => {

    it('lista a quién le llega, quién contestó y quién está en su última entrega', async () => {
        const { sabado } = proximoCiclo(new Date());
        estado.pedidos = [
            { id: 'p1', cliente: 'Ana Mora', telefono: '88110001', status: 'confirmed', plan: 'Pack Mensual Bajo en Calorías',
              items: [{ nombre: 'Pack Mensual Bajo en Calorías' }], fechas_entrega: ['2026-01-01', sabado],
              cambiosDelLink: { [sabado]: { cambios: [{ de: 'Pure de papa', a: 'Arroz blanco' }] } } },
            { id: 'p2', cliente: 'Beto Solís', telefono: '88110002', status: 'confirmed', plan: 'Pack Mensual Bajo en Calorías',
              items: [{ nombre: 'Pack Mensual Bajo en Calorías' }], fechas_entrega: [sabado, '2099-01-01'] }
        ];
        await act(async () => { render(<MemoryRouter><CambiosSemanaView /></MemoryRouter>); });

        expect(screen.getByText('2 clientes')).toBeTruthy();
        expect(screen.getByText('Pure de papa → Arroz blanco')).toBeTruthy();
        expect(screen.getByText('Última entrega — renovar')).toBeTruthy();

        await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Generar links/ })); });
        expect(screen.getByText('Kommo: 2')).toBeTruthy();
    });
});

describe('el link fijo /cambios', () => {
    const abrir = async () => {
        await act(async () => {
            render(<MemoryRouter initialEntries={['/cambios']}><Routes>
                <Route path="/cambios" element={<BuscarCambiosPage />} />
                <Route path="/cambios/:codigo" element={<CambiosSemanaPage />} />
            </Routes></MemoryRouter>);
        });
        fireEvent.change(screen.getByLabelText('Tu número de WhatsApp'), { target: { value: '8811 2233' } });
    };

    it('con un solo pack lo lleva directo a su menú para cambiar', async () => {
        estado.opciones = [{ pack: 'Pack Mensual Bajo en Calorías', fecha: '2026-10-03', ruta: '/cambios/abc' }];
        await abrir();
        fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Ana' } });
        await act(async () => { fireEvent.click(screen.getByText('Ver mi menú')); });
        expect(estado.buscado).toMatchObject({ telefono: '8811 2233', nombre: 'Ana' });
        expect(screen.getByText('¡Hola, Ana! 👋')).toBeTruthy();
    });

    it('con dos packs pregunta cuál', async () => {
        estado.opciones = [
            { pack: 'Pack Keto', fecha: '2026-10-03', ruta: '/cambios/uno' },
            { pack: 'Pack Vegetariano', fecha: '2026-10-05', ruta: '/cambios/dos' }
        ];
        await abrir();
        fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Ana' } });
        await act(async () => { fireEvent.click(screen.getByText('Ver mi menú')); });
        expect(screen.getByText('¿Qué pack querés cambiar?')).toBeTruthy();
        expect(screen.getByText('Pack Vegetariano')).toBeTruthy();
    });

    it('si no lo encuentra, lo dice sin mostrar nada de nadie', async () => {
        await abrir();
        fireEvent.change(screen.getByLabelText('Tu nombre'), { target: { value: 'Pedro' } });
        await act(async () => { fireEvent.click(screen.getByText('Ver mi menú')); });
        expect(screen.getByRole('alert').textContent).toMatch(/No encontramos/);
    });
});

