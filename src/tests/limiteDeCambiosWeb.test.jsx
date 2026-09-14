import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

/**
 * La tienda web: 2 cambios EN TOTAL por pack. Antes eran 2 por categoría y un
 * cliente podía hacer 6.
 */

vi.mock('../hooks/useSubstitutions', () => ({
    useSubstitutions: () => ({
        loading: false,
        substitutions: { proteins: ['Tilapia', 'Lomo'], vegetables: ['Brócoli'], carbos: ['Puré'] }
    })
}));

const { default: SubstitutionPicker } = await import('../components/SubstitutionPicker');

const PLATOS = [1, 2, 3, 4, 5].map(n => ({ numero: n, proteina: `Pollo ${n}`, vegetal: `Vegetal ${n}`, carbo: `Arroz ${n}` }));

const Envoltura = ({ alCambiar }) => {
    const [valor, setValor] = useState({ proteinChanges: [], vegeChanges: [], carboChanges: [] });
    return <SubstitutionPicker dishes={PLATOS} value={valor} onChange={(v) => { setValor(v); alCambiar(v); }} />;
};

describe('límite de cambios en la web', () => {
    it('con 2 cambios de proteína ya no deja cambiar vegetales ni harinas', () => {
        let ultimo;
        render(<Envoltura alCambiar={(v) => { ultimo = v; }} />);
        fireEvent.click(screen.getByRole('button'));

        const selects = () => [...document.querySelectorAll('select')];
        // 5 de proteína, 5 de vegetal, 5 de harina
        expect(selects()).toHaveLength(15);

        fireEvent.change(selects()[0], { target: { value: 'Tilapia' } });
        fireEvent.change(selects()[1], { target: { value: 'Lomo' } });
        expect(ultimo.proteinChanges).toHaveLength(2);

        const [prote, vege, carbo] = [selects().slice(0, 5), selects().slice(5, 10), selects().slice(10, 15)];
        expect(prote.slice(2).every(s => s.disabled)).toBe(true);
        expect(vege.every(s => s.disabled)).toBe(true);
        expect(carbo.every(s => s.disabled)).toBe(true);
        // Los ya elegidos se pueden seguir cambiando o quitar
        expect(prote[0].disabled).toBe(false);
        expect(screen.getByText(/llevás 2/)).toBeTruthy();
    });

    it('quitar uno vuelve a habilitar los demás', () => {
        render(<Envoltura alCambiar={() => {}} />);
        fireEvent.click(screen.getByRole('button'));
        const selects = () => [...document.querySelectorAll('select')];
        fireEvent.change(selects()[0], { target: { value: 'Tilapia' } });
        fireEvent.change(selects()[5], { target: { value: 'Brócoli' } });
        expect(selects()[10].disabled).toBe(true);
        fireEvent.change(selects()[0], { target: { value: '' } });
        expect(selects()[10].disabled).toBe(false);
    });
});
