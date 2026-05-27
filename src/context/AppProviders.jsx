import React from 'react';
import { AuthProvider } from './AuthContext';
import { ContactConfigProvider } from './ContactConfigContext';
import { ShippingDiscountProvider } from './ShippingDiscountContext';
import { AudioProvider } from './AudioContext';
import { ThemeProvider } from './ThemeContext';
import { ChristmasProvider } from './ChristmasContext';
import { CartProvider } from './CartContext';
import { OrdersProvider } from './OrdersContext';
import { MenusProvider } from './MenusContext';
import { UIProvider } from './UIContext';
import { ShippingProvider } from './ShippingContext';

/**
 * AppProviders - Unified component to wrap the application with all necessary contexts.
 * This ensures a consistent provider hierarchy and helps prevent context errors.
 */
export const AppProviders = ({ children }) => {
    return (
        <AuthProvider>
            <UIProvider>
                <ContactConfigProvider>
                    <ShippingProvider>
                        <ShippingDiscountProvider>
                            <AudioProvider>
                                <ThemeProvider>
                                    <ChristmasProvider>
                                        <CartProvider>
                                            <OrdersProvider>
                                                <MenusProvider>
                                                    {children}
                                                </MenusProvider>
                                            </OrdersProvider>
                                        </CartProvider>
                                    </ChristmasProvider>
                                </ThemeProvider>
                            </AudioProvider>
                        </ShippingDiscountProvider>
                    </ShippingProvider>
                </ContactConfigProvider>
            </UIProvider>
        </AuthProvider>
    );
};
