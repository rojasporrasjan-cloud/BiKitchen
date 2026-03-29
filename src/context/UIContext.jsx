import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export function useUI() {
    return useContext(UIContext);
}

export function UIProvider({ children }) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMobileMenu = (open) => {
        setIsMobileMenuOpen(open !== undefined ? open : (prev => !prev));
    };

    return (
        <UIContext.Provider value={{ isMobileMenuOpen, setIsMobileMenuOpen, toggleMobileMenu }}>
            {children}
        </UIContext.Provider>
    );
}
