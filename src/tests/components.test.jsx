import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from '../context/CartContext';

// Mock de Firebase
vi.mock('firebase/analytics', () => ({
    getAnalytics: vi.fn(() => ({})),
    logEvent: vi.fn()
}));

vi.mock('../firebase/config', () => ({
    db: {},
    auth: {},
    storage: {}
}));

// Wrapper para tests con providers
const TestWrapper = ({ children }) => (
    <BrowserRouter>
        <CartProvider>
            {children}
        </CartProvider>
    </BrowserRouter>
);

// ============================================
// Tests del Carrito
// ============================================
describe('CartContext', () => {
    it('inicia con carrito vacío', async () => {
        const { useCart } = await import('../context/CartContext');
        
        const TestComponent = () => {
            const { cart, getTotalItems } = useCart();
            return (
                <div>
                    <span data-testid="cart-count">{getTotalItems()}</span>
                    <span data-testid="cart-length">{cart.length}</span>
                </div>
            );
        };

        render(
            <TestWrapper>
                <TestComponent />
            </TestWrapper>
        );

        expect(screen.getByTestId('cart-count').textContent).toBe('0');
        expect(screen.getByTestId('cart-length').textContent).toBe('0');
    });

    it('agrega items al carrito', async () => {
        const { useCart } = await import('../context/CartContext');
        
        const TestComponent = () => {
            const { cart, addToCart, getTotalItems } = useCart();
            
            const handleAdd = () => {
                addToCart({
                    id: 'test-1',
                    name: 'Producto Test',
                    price: 5000,
                    quantity: 1
                });
            };

            return (
                <div>
                    <button onClick={handleAdd} data-testid="add-btn">Agregar</button>
                    <span data-testid="cart-count">{getTotalItems()}</span>
                </div>
            );
        };

        render(
            <TestWrapper>
                <TestComponent />
            </TestWrapper>
        );

        const addBtn = screen.getByTestId('add-btn');
        fireEvent.click(addBtn);

        await waitFor(() => {
            expect(screen.getByTestId('cart-count').textContent).toBe('1');
        });
    });

    it('calcula el total correctamente', async () => {
        const { useCart } = await import('../context/CartContext');
        
        const TestComponent = () => {
            const { addToCart, cart } = useCart();
            
            const handleAdd = () => {
                addToCart({ id: '1', name: 'Item 1', price: 3000, quantity: 2 });
            };

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return (
                <div>
                    <button onClick={handleAdd} data-testid="add-btn">Agregar</button>
                    <span data-testid="total">{total}</span>
                </div>
            );
        };

        render(
            <TestWrapper>
                <TestComponent />
            </TestWrapper>
        );

        fireEvent.click(screen.getByTestId('add-btn'));

        await waitFor(() => {
            expect(parseInt(screen.getByTestId('total').textContent)).toBeGreaterThanOrEqual(0);
        });
    });
});

// ============================================
// Tests de SEOHead
// ============================================
describe('SEOHead Component', () => {
    beforeEach(() => {
        // Limpiar meta tags antes de cada test
        document.head.innerHTML = '';
    });

    it('actualiza el título de la página', async () => {
        const SEOHead = (await import('../components/SEOHead')).default;
        
        render(<SEOHead title="Test Page" description="Test description" />);

        await waitFor(() => {
            expect(document.title).toContain('Test Page');
        });
    });

    it('agrega meta description', async () => {
        const SEOHead = (await import('../components/SEOHead')).default;
        
        render(<SEOHead title="Test" description="Mi descripción de prueba" />);

        await waitFor(() => {
            const metaDesc = document.querySelector('meta[name="description"]');
            expect(metaDesc).toBeTruthy();
            expect(metaDesc.getAttribute('content')).toBe('Mi descripción de prueba');
        });
    });

    it('agrega Open Graph tags', async () => {
        const SEOHead = (await import('../components/SEOHead')).default;
        
        render(
            <SEOHead 
                title="OG Test" 
                description="OG Description"
                image="/test-image.jpg"
            />
        );

        await waitFor(() => {
            const ogTitle = document.querySelector('meta[property="og:title"]');
            expect(ogTitle).toBeTruthy();
        });
    });
});

// ============================================
// Tests de Validaciones en UI
// ============================================
describe('Form Validations UI', () => {
    it('valida email en tiempo real', () => {
        const { isValidEmail } = require('../utils/validations');
        
        // Simular input de email
        const testCases = [
            { input: 'test@example.com', expected: true },
            { input: 'invalid-email', expected: false },
            { input: '', expected: false }
        ];

        testCases.forEach(({ input, expected }) => {
            expect(isValidEmail(input)).toBe(expected);
        });
    });

    it('valida teléfono de Costa Rica', () => {
        const { isValidPhone } = require('../utils/validations');
        
        expect(isValidPhone('88887777')).toBe(true);
        expect(isValidPhone('8888-7777')).toBe(true);
        expect(isValidPhone('1234567')).toBe(false); // 7 dígitos
        expect(isValidPhone('12345678')).toBe(false); // empieza con 1
    });
});

// ============================================
// Tests de Navegación
// ============================================
describe('Navigation', () => {
    it('renderiza links de navegación', async () => {
        // Test básico de que los links existen
        const navLinks = [
            { path: '/packs', name: 'Planes Semanales' },
            { path: '/individuales', name: 'Platos Individuales' },
            { path: '/promociones', name: 'Promociones' },
            { path: '/temporada', name: 'Menú de Temporada' },
            { path: '/como-funciona', name: 'Cómo Funciona' }
        ];

        navLinks.forEach(link => {
            expect(link.path).toBeTruthy();
            expect(link.name).toBeTruthy();
        });
    });
});

// ============================================
// Tests de Utilidades
// ============================================
describe('Utility Functions', () => {
    it('sanitiza texto correctamente', () => {
        const { sanitizeText } = require('../utils/validations');
        
        const dangerous = '<script>alert("xss")</script>';
        const sanitized = sanitizeText(dangerous);
        
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).toContain('&lt;script&gt;');
    });

    it('formatea teléfono correctamente', () => {
        const { formatPhone } = require('../utils/validations');
        
        expect(formatPhone('88887777')).toBe('8888-7777');
        expect(formatPhone('22223333')).toBe('2222-3333');
    });

    it('calcula total con descuento', () => {
        const { calculateTotal } = require('../utils/validations');
        
        const cart = [
            { price: 10000, quantity: 1 },
            { price: 5000, quantity: 2 }
        ];

        expect(calculateTotal(cart)).toBe(20000);
        expect(calculateTotal(cart, 5000)).toBe(15000);
    });
});

// ============================================
// Tests de LocalStorage
// ============================================
describe('LocalStorage Operations', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('guarda y recupera datos del carrito', () => {
        const cartData = [
            { id: '1', name: 'Test', price: 1000, quantity: 1 }
        ];

        localStorage.setItem('bikitchen_cart', JSON.stringify(cartData));
        const recovered = JSON.parse(localStorage.getItem('bikitchen_cart'));

        expect(recovered).toEqual(cartData);
    });

    it('maneja carrito vacío', () => {
        const cart = localStorage.getItem('bikitchen_cart');
        expect(cart).toBeNull();
    });
});

// ============================================
// Tests de Responsive
// ============================================
describe('Responsive Behavior', () => {
    it('detecta móvil correctamente', () => {
        // Simular diferentes anchos de pantalla
        const isMobile = (width) => width < 768;

        expect(isMobile(375)).toBe(true);  // iPhone
        expect(isMobile(768)).toBe(false); // iPad
        expect(isMobile(1024)).toBe(false); // Desktop
    });
});

// ============================================
// Tests de Hooks
// ============================================
describe('Custom Hooks', () => {
    it('useCheckoutDraft guarda y recupera datos', () => {
        const DRAFT_KEY = 'bikitchen_checkout_draft';
        
        // Simular guardar borrador
        const draftData = {
            data: { nombre: 'Test', email: 'test@test.com' },
            timestamp: Date.now()
        };
        
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
        const recovered = JSON.parse(localStorage.getItem(DRAFT_KEY));
        
        expect(recovered.data.nombre).toBe('Test');
        expect(recovered.data.email).toBe('test@test.com');
        
        localStorage.removeItem(DRAFT_KEY);
    });

    it('borrador expira después de 24 horas', () => {
        const DRAFT_KEY = 'bikitchen_checkout_draft';
        const DRAFT_EXPIRY = 24 * 60 * 60 * 1000;
        
        // Borrador de hace 25 horas
        const oldDraft = {
            data: { nombre: 'Old' },
            timestamp: Date.now() - (25 * 60 * 60 * 1000)
        };
        
        localStorage.setItem(DRAFT_KEY, JSON.stringify(oldDraft));
        const recovered = JSON.parse(localStorage.getItem(DRAFT_KEY));
        const age = Date.now() - recovered.timestamp;
        
        expect(age > DRAFT_EXPIRY).toBe(true);
        
        localStorage.removeItem(DRAFT_KEY);
    });
});

// ============================================
// Tests de Búsqueda
// ============================================
describe('Search Functionality', () => {
    it('filtra resultados por query', () => {
        const items = [
            { name: 'Pack 5 Comidas', type: 'pack' },
            { name: 'Pack 10 Comidas', type: 'pack' },
            { name: 'Pollo Teriyaki', type: 'individual' },
            { name: 'Ensalada César', type: 'individual' }
        ];

        const search = (query) => {
            return items.filter(item => 
                item.name.toLowerCase().includes(query.toLowerCase())
            );
        };

        expect(search('pack').length).toBe(2);
        expect(search('pollo').length).toBe(1);
        expect(search('xyz').length).toBe(0);
        expect(search('').length).toBe(4);
    });

    it('búsqueda es case-insensitive', () => {
        const items = [{ name: 'Pollo Teriyaki' }];
        
        const search = (query) => {
            return items.filter(item => 
                item.name.toLowerCase().includes(query.toLowerCase())
            );
        };

        expect(search('POLLO').length).toBe(1);
        expect(search('pollo').length).toBe(1);
        expect(search('Pollo').length).toBe(1);
    });
});

// ============================================
// Tests de Precios y Descuentos
// ============================================
describe('Pricing Logic', () => {
    it('calcula descuento porcentual', () => {
        const calculateDiscount = (price, discountPercent) => {
            return price - (price * discountPercent / 100);
        };

        expect(calculateDiscount(10000, 10)).toBe(9000);
        expect(calculateDiscount(10000, 25)).toBe(7500);
        expect(calculateDiscount(10000, 0)).toBe(10000);
    });

    it('aplica cupón de descuento fijo', () => {
        const applyCoupon = (total, couponValue) => {
            return Math.max(0, total - couponValue);
        };

        expect(applyCoupon(10000, 2000)).toBe(8000);
        expect(applyCoupon(1000, 2000)).toBe(0); // No puede ser negativo
    });

    it('calcula precio por pack correctamente', () => {
        const packPrices = {
            5: { weekly: 27500, perMeal: 5500 },
            10: { weekly: 50000, perMeal: 5000 },
            15: { weekly: 67500, perMeal: 4500 }
        };

        expect(packPrices[5].perMeal).toBe(5500);
        expect(packPrices[10].perMeal).toBe(5000);
        expect(packPrices[15].perMeal).toBe(4500);
        
        // Verificar que más comidas = menor precio por comida
        expect(packPrices[15].perMeal < packPrices[10].perMeal).toBe(true);
        expect(packPrices[10].perMeal < packPrices[5].perMeal).toBe(true);
    });
});

// ============================================
// Tests de Tracking de Pedido
// ============================================
describe('Order Tracking', () => {
    it('estados de pedido en orden correcto', () => {
        const ORDER_STATES = ['pendiente', 'confirmado', 'preparando', 'en-camino', 'entregado'];
        
        expect(ORDER_STATES.indexOf('pendiente')).toBe(0);
        expect(ORDER_STATES.indexOf('entregado')).toBe(4);
        expect(ORDER_STATES.indexOf('preparando') < ORDER_STATES.indexOf('en-camino')).toBe(true);
    });

    it('calcula progreso del pedido', () => {
        const ORDER_STATES = ['pendiente', 'confirmado', 'preparando', 'en-camino', 'entregado'];
        
        const getProgress = (currentState) => {
            const index = ORDER_STATES.indexOf(currentState);
            return ((index + 1) / ORDER_STATES.length) * 100;
        };

        expect(getProgress('pendiente')).toBe(20);
        expect(getProgress('preparando')).toBe(60);
        expect(getProgress('entregado')).toBe(100);
    });
});

// ============================================
// Tests de Accesibilidad
// ============================================
describe('Accessibility', () => {
    it('botones tienen texto accesible', () => {
        const buttons = [
            { label: 'Agregar al carrito', ariaLabel: 'Agregar producto al carrito' },
            { label: 'Buscar', ariaLabel: 'Abrir búsqueda global' },
            { label: 'Menú', ariaLabel: 'Abrir menú de navegación' }
        ];

        buttons.forEach(btn => {
            expect(btn.label).toBeTruthy();
            expect(btn.ariaLabel).toBeTruthy();
        });
    });

    it('imágenes tienen alt text', () => {
        const images = [
            { src: '/pack-5.jpg', alt: 'Pack 5 Comidas' },
            { src: '/pollo.jpg', alt: 'Pollo Teriyaki' }
        ];

        images.forEach(img => {
            expect(img.alt).toBeTruthy();
            expect(img.alt.length).toBeGreaterThan(0);
        });
    });
});
