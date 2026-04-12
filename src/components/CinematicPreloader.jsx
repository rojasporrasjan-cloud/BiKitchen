import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function CinematicPreloader() {
    const [loading, setLoading] = useState(true);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        // Tiempo más corto en móviles para mejor UX
        const isMobile = window.innerWidth < 768;
        const loadTime = isMobile ? 1000 : 2000;
        const exitTime = isMobile ? 500 : 1000;

        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => {
                setLoading(false);
            }, exitTime);
        }, loadTime);

        return () => clearTimeout(timer);
    }, []);

    if (!loading) return null;

    return (
        <div className={`fixed top-0 left-0 w-screen h-screen z-[10000] bg-[#FF671D] text-white transition-all duration-1000 ease-in-out ${exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 text-center"
                >
                    {/* Logo container with white background for contrast */}
                    <div className="bg-white rounded-3xl p-4 shadow-2xl inline-flex items-center justify-center mx-auto border-2 border-white/50">
                        <img
                            src="/assets/logo.png"
                            alt="BiKitchen Food"
                            className="h-24 md:h-32 w-auto object-contain block"
                        />
                    </div>
                    {/* Brand text */}
                    <p className="text-white/90 text-sm font-medium mt-6 tracking-widest uppercase block">
                        Comida saludable
                    </p>
                </motion.div>
            </div>

            {/* Curtain Effect */}
            <div className={`absolute inset-0 bg-[#FF671D] z-[-1] transition-transform duration-1000 ease-in-out origin-top ${exiting ? 'scale-y-0' : 'scale-y-100'}`}></div>
        </div>
    );
}
