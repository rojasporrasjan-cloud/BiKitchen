import React, { createContext, useContext } from 'react';

const AudioContext = createContext();

// Audio completamente deshabilitado - funciones vacías
export function AudioProvider({ children }) {
    // Funciones vacías que no hacen nada
    const playHover = () => {};
    const playClick = () => {};
    const playSuccess = () => {};
    const initAudio = () => {};

    return (
        <AudioContext.Provider value={{ playHover, playClick, playSuccess, isMuted: true, setIsMuted: () => {}, initAudio }}>
            {children}
        </AudioContext.Provider>
    );
}

export const useAudio = () => useContext(AudioContext);
