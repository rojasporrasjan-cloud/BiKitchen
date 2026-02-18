import React, { useState, useEffect } from 'react';

/**
 * CinematicGrain Component
 * 
 * Renders a fixed, full-screen SVG noise overlay to simulate film grain.
 * DISABLED on mobile devices for better performance.
 */
export default function CinematicGrain() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Detectar móvil por ancho de pantalla
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // No renderizar en móviles para mejor rendimiento
    if (isMobile) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9000] opacity-[0.03] mix-blend-overlay overflow-hidden">
            <svg className="absolute w-full h-full">
                <filter id="noiseFilter">
                    <feTurbulence
                        type="fractalNoise"
                        baseFrequency="0.80"
                        numOctaves="3"
                        stitchTiles="stitch"
                    />
                </filter>
                <rect width="100%" height="100%" filter="url(#noiseFilter)" className="animate-grain" />
            </svg>
        </div>
    );
}
