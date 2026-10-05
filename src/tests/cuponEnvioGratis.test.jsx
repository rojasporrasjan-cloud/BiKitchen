import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * Cupón de envío gratis: el envío tiene que quedar en 0 en TODO (lo que ve la
 * clienta, lo que se guarda en el pedido y el total), no solo en el total.
 * Antes la compra decía "Envío ₡6.000" con el total ya sin envío, y el pedido
 * se guardaba con costo_envio 6000 (Priscilla Garro, 5 oct 2026).
 */

vi.mock('firebase/analytics', () => ({ getAnalytics: vi.fn(() => ({})), logEvent: vi.fn() }));
vi.mock('../firebase/config', () => ({ db: {}, auth: {}, storage: {} }));
vi.mock('../context/ShippingDiscountContext', () => ({
    useShippingDiscount: () => ({ discountConfig: { enabled: false, percentage: 0 } })
}));
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ currentUser: null, isAdmin: () => false, isSuperAdmin: () => false })
}));
// Santa Ana: ₡3.000 por envío. Un mensual son 4 envíos con 50 % → ₡6.000.
vi.mock('../context/ShippingContext', () => ({
    useShipping: () => ({
        getShippingCost: () => 3000,
        getZoneById: () => ({ id: 'santa-ana', name: 'Santa Ana' }),
        zoneRequiresContact: () => false,
        SHIPPING_ZONES: []
    })
}));
vi.mock('../services/facebookPixel', () => ({ trackAddToCart: vi.fn(), trackInitiateCheckout: vi.fn() }));
vi.mock('../utils/firestoreCoupons', () => ({
    validateCoupon: async (code) => ({
        valid: true, discount: 0, discountText: 'Envío gratis', type: 'free_shipping',
        coupon: { id: 'c1', code: code.toUpperCase(), type: 'free_shipping', value: 0 }
    }),
    useCoupon: vi.fn()
}));

const { CartProvider, useCart } = await import('../context/CartContext');

function Compra() {
    const { getShippingCostFinal, getTotalWithShipping, applyCoupon } = useCart();
    return (
        <div>
            <span data-testid="envio">{getShippingCostFinal()}</span>
            <span data-testid="total">{getTotalWithShipping()}</span>
            <button type="button" onClick={() => applyCoupon('priscilla-envio')}>aplicar</button>
        </div>
    );
}

describe('cupón de envío gratis', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('bikitchen-cart', JSON.stringify([
            { id: 'pack-mensual-bajo', name: 'PACK MENSUAL BAJO CALORIAS', plan: 'monthly', price: 77500, quantity: 1 }
        ]));
        localStorage.setItem('bikitchen-shipping-zone', 'santa-ana');
    });

    it('sin cupón cobra el envío del mensual', () => {
        render(<CartProvider><Compra /></CartProvider>);
        expect(screen.getByTestId('envio').textContent).toBe('6000');
        expect(screen.getByTestId('total').textContent).toBe('83500');
    });

    it('con el cupón el envío es 0 en todo, no solo en el total', async () => {
        render(<CartProvider><Compra /></CartProvider>);
        fireEvent.click(screen.getByText('aplicar'));
        await waitFor(() => expect(screen.getByTestId('envio').textContent).toBe('0'));
        expect(screen.getByTestId('total').textContent).toBe('77500');
    });
});
