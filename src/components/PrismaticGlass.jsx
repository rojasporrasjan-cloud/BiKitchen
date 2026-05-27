import React from 'react';

/**
 * PrismaticGlass Component
 * 
 * A wrapper component that applies a "prismatic" glass effect.
 * On hover, it reveals a chromatic aberration (RGB split) and a shining animation.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The content to be wrapped.
 * @param {string} [props.className] - Additional CSS classes.
 */
export default function PrismaticGlass({ children, className = "" }) {
    return (
        <div className={`relative group ${className}`}>
            {/* RGB Split Layers - Visible on Hover */}
            <div className="absolute inset-0 bg-inherit rounded-inherit opacity-0 group-hover:opacity-70 transition-opacity duration-200 blur-[2px] translate-x-[-2px] translate-y-[-2px] bg-red-500 mix-blend-screen pointer-events-none z-0"></div>
            <div className="absolute inset-0 bg-inherit rounded-inherit opacity-0 group-hover:opacity-70 transition-opacity duration-200 blur-[2px] translate-x-[2px] translate-y-[2px] bg-blue-500 mix-blend-screen pointer-events-none z-0"></div>

            {/* Main Content Container */}
            <div className="relative z-10 bg-white/80 backdrop-blur-md border border-white/40 shadow-xl transition-all duration-500 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:border-white/60 overflow-hidden">

                {/* Iridescent Shine */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-gradient-to-tr from-transparent via-white to-transparent -translate-x-full group-hover:animate-shine pointer-events-none"></div>

                {children}
            </div>
        </div>
    );
}
