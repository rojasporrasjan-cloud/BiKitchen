import React, { useRef, useEffect, useState } from 'react';

/**
 * VelocityText Component
 * 
 * Applies a skew transformation to text based on the user's scroll velocity.
 * This creates a dynamic, kinetic typography effect.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The text content.
 * @param {string} [props.className] - Additional CSS classes.
 * @param {number} [props.intensity=0.2] - The intensity of the skew effect.
 */
export default function VelocityText({ children, className = "", intensity = 0.2 }) {
    const textRef = useRef(null);
    const [skew, setSkew] = useState(0);
    const lastScrollY = useRef(0);
    const rafId = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const velocity = currentScrollY - lastScrollY.current;
            lastScrollY.current = currentScrollY;

            // Target skew based on velocity
            const targetSkew = velocity * intensity;

            // Apply directly for responsiveness, or use lerp for smoothness
            // Here we set it directly but let CSS transition handle the smoothing if needed
            // But for "velocity" feel, immediate reaction is often better, with decay.
            setSkew(targetSkew);

            // Reset skew when scrolling stops (handled by a timeout or decay loop)
            if (rafId.current) cancelAnimationFrame(rafId.current);
            rafId.current = requestAnimationFrame(decaySkew);
        };

        const decaySkew = () => {
            setSkew(prev => {
                if (Math.abs(prev) < 0.1) return 0;
                return prev * 0.9; // Decay factor
            });
            if (Math.abs(skew) > 0.1) {
                rafId.current = requestAnimationFrame(decaySkew);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafId.current) cancelAnimationFrame(rafId.current);
        };
    }, [intensity]); // Removed 'skew' to avoid dependency loop

    return (
        <div
            ref={textRef}
            className={`transition-transform duration-100 ease-out will-change-transform ${className}`}
            style={{ transform: `skewX(${-skew}deg)` }}
        >
            {children}
        </div>
    );
}
