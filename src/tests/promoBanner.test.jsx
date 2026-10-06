import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * 6 oct 2026: el cupón HOY5 se marcó "mostrar en banner" y el sitio entero dejó
 * de cargar ("copied is not defined"). La franja tiene que poder mostrar un
 * cupón con su botón de copiar sin romperse.
 */

vi.mock('../utils/firestoreCoupons', () => ({
    getBannerCoupon: async () => ({
        id: 'x', code: 'HOY5', type: 'percentage', value: 5, showInBanner: true,
        bannerMessage: 'Hoy 5% con el cupón HOY5'
    })
}));
vi.mock('../context/ChristmasContext', () => ({ useChristmas: () => ({ isChristmasMode: false }) }));
// jsdom no trae ResizeObserver (la franja lo usa para medir su alto)
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };

const { default: PromoBanner } = await import('../components/PromoBanner');

describe('la franja de promoción', () => {
    it('muestra el cupón con su botón de copiar sin romper la página', async () => {
        render(<PromoBanner />);
        expect((await screen.findAllByText(/HOY5/)).length).toBeGreaterThan(0);
    });
});
