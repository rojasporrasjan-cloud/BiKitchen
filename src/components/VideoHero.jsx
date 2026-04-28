import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Play, Volume2, VolumeX } from 'lucide-react';
import { Link } from 'react-router-dom';
import MagneticButton from './MagneticButton';
import useIsMobile from '../hooks/useIsMobile';

const VideoHero = ({ videoSrc, title, subtitle, primaryCTA, secondaryCTA }) => {
    const videoRef = useRef(null);
    const isMobile = useIsMobile();
    const [isScrolled, setIsScrolled] = React.useState(false);
    
    // Listener de scroll ultra-seguro (Evento + Intervalo)
    useEffect(() => {
        const checkScroll = () => {
            const currentY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
            setIsScrolled(currentY > 15);
        };
        window.addEventListener('scroll', checkScroll, { passive: true });
        const interval = setInterval(checkScroll, 100);
        checkScroll();
        return () => {
            window.removeEventListener('scroll', checkScroll);
            clearInterval(interval);
        };
    }, []);
    
    // Usar scrollYProgress (0 a 1) para mayor robustez en cualquier dispositivo
    const { scrollYProgress } = useScroll();
    const opacityScroll = useTransform(scrollYProgress, [0, 0.02], [1, 0]);

    // Forced Playback for iOS Low Power Mode
    useEffect(() => {
        const attemptPlay = () => {
            if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play()
                    .then(() => {
                        console.log("Video started playing after interaction");
                        // Remove listener once played
                        document.removeEventListener('click', attemptPlay);
                        document.removeEventListener('touchstart', attemptPlay);
                    })
                    .catch(error => {
                        console.log("Playback attempt failed:", error);
                    });
            }
        };

        document.addEventListener('click', attemptPlay);
        document.addEventListener('touchstart', attemptPlay);

        return () => {
            document.removeEventListener('click', attemptPlay);
            document.removeEventListener('touchstart', attemptPlay);
        };
    }, []);

    return (
        <section className="relative min-h-screen md:h-screen w-full overflow-hidden flex items-center bg-black" style={{ minHeight: '100dvh' }}>
            {/* Background Video Layers */}
            <div className="absolute inset-0 z-0">
                {/* Layer 1: Blurred Background (Full Screen) - Desktop Only */}
                {!isMobile && (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 opacity-85 scale-100"
                    >
                        <source src={videoSrc} type="video/mp4" />
                    </video>
                )}

                {/* Layer 2: Mobile Video - Full Screen 9:16 Format */}
                {isMobile && (
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover z-1 opacity-100"
                    >
                        <source src={videoSrc} type="video/mp4" />
                    </video>
                )}

                {/* Layer 3: Desktop Video */}
                {!isMobile && (
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover z-1 opacity-100"
                    >
                        <source src={videoSrc} type="video/mp4" />
                    </video>
                )}

                {/* Overlays */}
                <div className={`absolute inset-0 z-[2] ${isMobile ? 'bg-gradient-to-b from-black/40 via-transparent to-black/60' : 'bg-gradient-to-b from-black/50 via-black/5 to-black/50'}`} />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] z-[2]" />
            </div>

            {/* Content Container - Ajustado para evitar cortes en iPhone pequeños */}
            <div className={`container relative z-10 mx-auto ${isMobile ? 'px-4 -mt-32 pt-20 pb-16' : 'px-6 md:px-8 -mt-20 pt-20 md:pt-24 pb-20'}`}>
                <div className={isMobile ? 'max-w-full text-center mx-auto' : 'max-w-5xl'}>
                    {/* Subtitle */}
                    <motion.span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold mb-4 tracking-wide ${isMobile ? 'text-xs' : 'text-sm px-4 py-2 mb-6'}`}
                        initial={{ opacity: 0, x: -40, y: -20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.9, delay: 1.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Sparkles size={isMobile ? 14 : 16} className="text-bikitchen-gold" />
                        {subtitle}
                    </motion.span>

                    {/* Title */}
                    <h1 className={`font-black text-white mb-3 leading-tight drop-shadow-2xl ${isMobile ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl md:leading-[1.05] md:mb-8'}`}>
                        {title.split(' ').map((word, i) => (
                            <motion.span
                                key={i}
                                className="inline-block mr-[0.2em]"
                                initial={{ opacity: 0, x: -50, y: 50 }}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                transition={{
                                    duration: 1,
                                    delay: 1.5 + (i * 0.18),
                                    ease: [0.25, 0.46, 0.45, 0.94]
                                }}
                            >
                                {word.toLowerCase() === 'saludable' ? (
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold">
                                        {word}
                                    </span>
                                ) : word}
                            </motion.span>
                        ))}
                    </h1>

                    {/* Description */}
                    <motion.p
                        className={`text-white/90 leading-relaxed font-medium ${isMobile ? 'text-sm max-w-full text-center mx-auto mb-24' : 'text-lg md:text-2xl max-w-2xl mb-5 md:mb-10'}`}
                        initial={{ opacity: 0, x: -40, y: 30 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 1, delay: 2.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        Comida real, hecha con amor y entregada directamente a tu puerta. Olvida la cocina, nosotros nos encargamos.
                    </motion.p>

                    {/* Buttons */}
                    <motion.div
                        className={`flex ${isMobile ? 'gap-3 flex-col w-full' : 'flex-wrap gap-4'} items-center`}
                        initial={{ opacity: 0, x: -40, y: 30 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 1, delay: 3.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        <MagneticButton as="div" className={isMobile ? 'w-full' : ''}>
                            <Link
                                to={primaryCTA.link}
                                className={`inline-flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black font-black rounded-2xl shadow-2xl transition-all duration-300 transform active:scale-95 ${isMobile ? 'w-full py-3 text-sm px-4 sm:py-4 sm:text-base' : 'px-8 md:px-10 py-4 md:py-5 text-lg md:text-xl'}`}
                            >
                                {primaryCTA.text}
                                <ArrowRight size={isMobile ? 16 : 24} />
                            </Link>
                        </MagneticButton>

                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={isMobile ? 'w-full' : ''}
                        >
                            <Link
                                to={secondaryCTA.link}
                                className={`inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white font-black rounded-2xl shadow-2xl border border-white/30 transition-all duration-300 ${isMobile ? 'w-full py-3 text-sm px-4 sm:py-4 sm:text-base' : 'px-8 md:px-10 py-4 md:py-5 text-lg md:text-xl'}`}
                            >
                                {secondaryCTA.text}
                            </Link>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Scroll Indicator - v1.7 - Diseño Minimalista y Premium */}
            <AnimatePresence>
                {!isScrolled && (
                    <motion.div
                        key="scroll-indicator"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.8 }}
                        className="pointer-events-none fixed left-0 right-0 z-[100] flex flex-col items-center"
                        style={{ bottom: isMobile ? '115px' : '40px' }}
                    >
                        <motion.div
                            animate={{ y: [0, 15, 0] }}
                            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                            className="flex flex-col items-center"
                        >
                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] mb-4">Descubrir</span>
                            <div className="flex flex-col items-center -space-y-3">
                                <svg
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="opacity-40"
                                >
                                    <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                                </svg>
                                <svg
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                                >
                                    <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                                </svg>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default VideoHero;
