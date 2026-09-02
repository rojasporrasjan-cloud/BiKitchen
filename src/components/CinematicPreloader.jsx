import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// Duracion de la intro. Antes eran 1000 ms en movil y 2000 ms en desktop, mas
// 500-1000 ms de salida: hasta 3 segundos con el contenido real tapado, que es
// justo lo que Google mide como LCP. La marca se sostiene igual en 600 ms.
const INTRO_MS = 600;
const SALIDA_MS = 300;

// Si el visitante ya vio la intro en esta sesion, no se la repetimos: navegar
// entre paginas no deberia volver a esperar.
function yaVioLaIntro() {
    try {
        return sessionStorage.getItem('bk_intro_vista') === '1';
    } catch {
        return false; // modo privado / cookies bloqueadas
    }
}

export default function CinematicPreloader() {
    const [loading, setLoading] = useState(() => !yaVioLaIntro());
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (!loading) return;

        const timer = setTimeout(() => {
            setExiting(true);
            setTimeout(() => {
                setLoading(false);
                try {
                    sessionStorage.setItem('bk_intro_vista', '1');
                } catch {
                    // modo privado: simplemente se vuelve a ver, no es un error
                }
            }, SALIDA_MS);
        }, INTRO_MS);

        return () => clearTimeout(timer);
    }, [loading]);

    if (!loading) return null;

    return (
        <div className={`fixed top-0 left-0 w-screen h-screen z-[10000] bg-[#FF671D] text-white transition-all duration-300 ease-in-out ${exiting ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
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
            <div className={`absolute inset-0 bg-[#FF671D] z-[-1] transition-transform duration-300 ease-in-out origin-top ${exiting ? 'scale-y-0' : 'scale-y-100'}`}></div>
        </div>
    );
}
