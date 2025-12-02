import React from 'react';

/**
 * CinematicGrain Component
 * 
 * Renders a fixed, full-screen SVG noise overlay to simulate film grain.
 * This adds a subtle texture and "organic" feel to the application.
 * 
 * It uses an SVG feTurbulence filter and CSS animation to move the noise pattern.
 * The overlay is pointer-events-none to ensure it doesn't interfere with interactions.
 */
export default function CinematicGrain() {
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
