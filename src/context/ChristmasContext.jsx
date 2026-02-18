import React, { createContext, useContext, useState, useEffect } from 'react';

const ChristmasContext = createContext();

export function useChristmas() {
    const context = useContext(ChristmasContext);
    if (!context) {
        throw new Error('useChristmas must be used within a ChristmasProvider');
    }
    return context;
}

export function ChristmasProvider({ children }) {
    const [isChristmasMode, setIsChristmasMode] = useState(false);

    // Save to localStorage when changed
    useEffect(() => {
        localStorage.setItem('bikitchen_christmas_mode', JSON.stringify(false));
        
        // Add/remove christmas class to body
        document.body.classList.remove('christmas-mode');
    }, [isChristmasMode]);

    const toggleChristmasMode = () => {
        setIsChristmasMode(prev => !prev);
    };

    const value = {
        isChristmasMode,
        toggleChristmasMode,
        setIsChristmasMode
    };

    return (
        <ChristmasContext.Provider value={value}>
            {children}
        </ChristmasContext.Provider>
    );
}

export default ChristmasContext;
