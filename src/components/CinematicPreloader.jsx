import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function CinematicPreloader() {
    const [loading, setLoading] = useState(true);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => {
                setLoading(false);
            }, 1000);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    if (!loading) return null;

    return (
        <div className={`fixed inset-0 z-[10000] flex items-center justify-center bg-[#1a3c1e] text-white transition-all duration-1000 ease-in-out ${exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className={`text-center transition-all duration-700 transform ${exiting ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}`}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10"
                >
                    <img
                        src="/assets/logo.jpg"
                        alt="BiKitchen Food"
                        className="h-24 md:h-32 w-auto object-contain mx-auto mb-8"
                    />
                </motion.div>
            </div>

            {/* Curtain Effect */}
            <div className={`absolute inset-0 bg-[#1a3c1e] z-[-1] transition-transform duration-1000 ease-in-out origin-top ${exiting ? 'scale-y-0' : 'scale-y-100'}`}></div>
        </div>
    );
}
