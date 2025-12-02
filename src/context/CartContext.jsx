import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem('bikitchen-cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    });
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('bikitchen-cart', JSON.stringify(cart));
    }, [cart]);

    const addToCart = (item) => {
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(
                cartItem => cartItem.id === item.id && cartItem.plan === item.plan
            );

            if (existingIndex >= 0) {
                const newCart = [...prevCart];
                newCart[existingIndex].quantity += 1;
                return newCart;
            } else {
                return [...prevCart, { ...item, quantity: 1 }];
            }
        });
        // Don't auto-open cart
    };

    const removeFromCart = (id, plan) => {
        setCart(prevCart => prevCart.filter(item => !(item.id === id && item.plan === plan)));
    };

    const updateQuantity = (id, plan, quantity) => {
        if (quantity <= 0) {
            removeFromCart(id, plan);
            return;
        }
        setCart(prevCart =>
            prevCart.map(item =>
                item.id === id && item.plan === plan
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCart([]);
    };

    const getTotalItems = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    const getTotalPrice = () => {
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    };

    const getWhatsAppMessage = () => {
        if (cart.length === 0) return '';

        let message = '🛒 *Pedido BiKitchen*\n\n';

        cart.forEach((item, index) => {
            message += `${index + 1}. *${item.name}*\n`;
            message += `   Plan: ${item.planLabel}\n`;
            message += `   Precio: ₡${item.price.toLocaleString('es-CR')}\n`;
            message += `   Cantidad: ${item.quantity}\n`;
            message += `   Subtotal: ₡${(item.price * item.quantity).toLocaleString('es-CR')}\n\n`;
        });

        message += `*Total: ₡${getTotalPrice().toLocaleString('es-CR')}*\n\n`;
        message += '¿Podrían confirmar mi pedido? Gracias! 😊';

        return encodeURIComponent(message);
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                getTotalItems,
                getTotalPrice,
                getWhatsAppMessage,
                isCartOpen,
                setIsCartOpen
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
