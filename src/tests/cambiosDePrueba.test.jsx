import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { armarPrueba, enviarPrueba, proximoSabado, pedidoDePrueba } from '../utils/cambiosDePrueba';
import { leerCambioDePack } from '../utils/desayunosPersonalizados';

/**
 * /cambios/prueba — Jan quiere probar el link "como si fuera un cliente".
 *
 * Tiene que ser la misma página y las mismas reglas que un cliente real, con el
 * menú real, pero sin tocar ningún pedido: si la prueba escribiera en la base,
 * la cocina terminaría cocinando un pack que no existe.
 */

vi.mock('../firebase/config', () => ({ db: {} }));
vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/Footer', () => ({ default: () => null }));
vi.mock('../components/PageTransition', () => ({ default: ({ children }) => children }));
vi.mock('../hooks/useWhatsApp', () => ({ useWhatsApp: () => ({ getWhatsAppUrl: () => 'https://wa.me/x' }) }));
vi.mock('firebase/firestore', () => ({
    doc: () => ({}),
    getDoc: async () => ({ exists: () => true, data: () => SUSTITUCIONES })
}));

const MENU = {
    bajoCalorias: [
        { numero: 1, proteina: 'Albóndigas de res', vegetal: 'Crema de ayote', carbo: 'Pure de papa' },
        { numero: 2, proteina: 'Pollo teriyaki', vegetal: 'Vegetales al vapor', carbo: 'Pure de papa' }
    ],
    regular: [{ numero: 1, proteina: 'Pollo al ajillo', vegetal: 'Picadillo mixto', carbo: 'Arroz frito' }],
    cena: { regular: [{ numero: 1, proteina: 'Cerdo en salsa de hongos', vegetal: 'Chayotes salteados', carbo: 'Arroz blanco' }] }
};
const SUSTITUCIONES = { proteins: ['Filet de pollo encebollado'], vegetables: ['Ensalada verde'], carbos: ['Arroz blanco'] };

vi.mock('../utils/firestoreMenus', () => ({ getOfficialMenus: async () => MENU }));

const fetchEspia = vi.fn();
beforeEach(() => { fetchEspia.mockReset(); globalThis.fetch = fetchEspia; });

describe('el modo prueba usa las reglas reales', () => {
    it('arma el menú del pack elegido, para el próximo sábado, abierto', async () => {
        const d = await armarPrueba('bajoCalorias');
        expect(d.prueba).toBe(true);
        expect(d.permitido.almuerzos).toHaveLength(2);
        expect(d.permitido.opciones.carbo).toEqual(['Arroz blanco']);
        expect(d.cerrada).toBe(false);
        expect(new Date(`${d.fecha}T12:00:00`).getDay()).toBe(6);
    });

    it('el pack con cena trae las cenas', async () => {
        const d = await armarPrueba('regularConCena');
        expect(d.permitido.cenas).toHaveLength(1);
    });

    it('el texto para la cocina es el que la hoja sabe leer', async () => {
        const d = await armarPrueba('bajoCalorias');
        const texto = enviarPrueba(d.permitido, { cambios: [{ comida: 'almuerzo', parte: 'carbo', de: 'Pure de papa', a: 'Arroz blanco' }], notas: '' });
        expect(texto).toBe('Cambiar Pure de papa por Arroz blanco');
        const cambio = leerCambioDePack(texto, MENU.bajoCalorias, 'Pack Bajo Calorías');
        expect(JSON.stringify(cambio)).toMatch(/Arroz blanco/);
    });

    it('rechaza lo mismo que rechazaría el servidor', async () => {
        const d = await armarPrueba('bajoCalorias');
        expect(() => enviarPrueba(d.permitido, { cambios: [{ comida: 'almuerzo', parte: 'carbo', de: 'Pure de papa', a: 'Pizza' }] }))
            .toThrow(/no está en las opciones/);
    });

    it('el pedido de mentira no tiene ni teléfono ni id', () => {
        const p = pedidoDePrueba('keto');
        expect(p.plan).toBe('Pack Keto');
        expect(p.telefono).toBeUndefined();
        expect(p.id).toBeUndefined();
    });

    it('el próximo sábado desde un miércoles', () => {
        expect(proximoSabado(new Date('2026-09-30T10:00:00'))).toBe('2026-10-03');
        expect(proximoSabado(new Date('2026-10-03T10:00:00'))).toBe('2026-10-10');
    });
});

describe('la página en /cambios/prueba', () => {
    it('se cambia como un cliente, muestra lo que le llegaría a la cocina y NO llama al servidor', async () => {
        const { default: CambiosSemanaPage } = await import('../pages/CambiosSemanaPage');
        render(
            <MemoryRouter initialEntries={['/cambios/prueba?pack=bajoCalorias']}>
                <Routes><Route path="/cambios/:codigo" element={<CambiosSemanaPage />} /></Routes>
            </MemoryRouter>
        );
        expect(await screen.findByText('Modo prueba: nada se guarda')).toBeTruthy();
        const plato1 = (await screen.findByText('Plato 1')).closest('li');
        fireEvent.click(within(plato1).getAllByText('Cambiar')[2]);
        fireEvent.click(screen.getByText('Arroz blanco'));
        expect(screen.getByText(/Llevás/).textContent).toMatch(/1 de 2/);

        await act(async () => { fireEvent.click(screen.getByText('Enviar mis cambios')); });

        expect(screen.getByText(/esto le llegaría a la hoja de cocina/i)).toBeTruthy();
        expect(screen.getByText('Cambiar Pure de papa por Arroz blanco')).toBeTruthy();
        expect(fetchEspia).not.toHaveBeenCalled();
    });
});
