import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import MagneticButton from './MagneticButton';

const VideoHero = ({ videoSrc, posterSrc, title, subtitle, primaryCTA, secondaryCTA }) => {
    const videoRef = useRef(null);
    // El video pesa ~900 KB. Si se descarga junto con el HTML/CSS/JS compite por
    // ancho de banda y atrasa el primer pintado. En su lugar mostramos el poster
    // (46 KB) de inmediato y traemos el video cuando la pagina ya termino de cargar.
    const [cargarVideo, setCargarVideo] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    
    // Listener de scroll. Antes esto ademas corria un setInterval cada 100 ms
    // "por seguridad": 10 ejecuciones por segundo para siempre, aunque el evento
    // de scroll ya cubre el caso. Se quito porque cargaba el hilo principal.
    useEffect(() => {
        const checkScroll = () => {
            const currentY = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
            setIsScrolled(currentY > 15);
        };
        window.addEventListener('scroll', checkScroll, { passive: true });
        checkScroll();
        return () => window.removeEventListener('scroll', checkScroll);
    }, []);

    // Forced Playback para Low Power Mode (Safari/Chrome en cualquier dispositivo)
    useEffect(() => {
        const attemptPlay = () => {
            if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play()
                    .then(() => {
                        document.removeEventListener('click', attemptPlay);
                    })
                    .catch(() => {});
            }
        };
        document.addEventListener('click', attemptPlay);
        return () => document.removeEventListener('click', attemptPlay);
    }, []);

    // Derivar la URL del WebM desde la del MP4 (si existe en /videos/)
    const webmSrc = videoSrc?.replace(/\.mp4$/i, '.webm');

    // Disparar la descarga del video recien cuando el navegador quedo libre.
    useEffect(() => {
        let id;
        const arrancar = () => {
            id = window.requestIdleCallback
                ? window.requestIdleCallback(() => setCargarVideo(true), { timeout: 2500 })
                : setTimeout(() => setCargarVideo(true), 300);
        };
        if (document.readyState === 'complete') {
            arrancar();
        } else {
            window.addEventListener('load', arrancar, { once: true });
        }
        return () => {
            window.removeEventListener('load', arrancar);
            if (id == null) return;
            if (window.cancelIdleCallback) window.cancelIdleCallback(id); else clearTimeout(id);
        };
    }, []);

    // Asignamos el src a mano en vez de usar <source>: al agregar los <source> el
    // navegador ya arranca la descarga por su cuenta, y el load() que hace falta
    // para que React la note la arrancaba de nuevo, bajando el video dos veces.
    useEffect(() => {
        if (!cargarVideo) return;
        const video = videoRef.current;
        if (!video || video.src) return;

        const soportaWebm = webmSrc && video.canPlayType('video/webm; codecs="vp9"') !== '';
        video.src = soportaWebm ? webmSrc : videoSrc;
        video.load();
    }, [cargarVideo, webmSrc, videoSrc]);

    return (
        <section className="relative min-h-screen md:h-screen w-full overflow-hidden flex items-center bg-black" style={{ minHeight: '100vh' }}>
            {/* Background — video en todos los dispositivos */}
            <div className="absolute inset-0 z-0">
                {/* width/height son las medidas reales del archivo (1280x720). El CSS
                    igual lo estira a pantalla completa, pero sin estos atributos el
                    navegador no sabe que espacio reservar y al cargar el poster
                    reacomoda la pagina: eso solo costaba 0.10 de CLS. */}
                <video
                    ref={videoRef}
                    width={1280}
                    height={720}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="none"
                    poster={posterSrc}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="absolute inset-0 w-full h-full object-cover"
                >
                    {/* Sin <source>: el src se asigna en el efecto de arriba una vez que
                        la pagina termino de cargar. Hasta entonces solo se ve el poster
                        y no se descarga ni un byte de video. */}
                </video>

                {/* Overlays */}
                <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/50 via-black/5 to-black/50" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.2)_100%)] z-[2]" />
            </div>

            {/* Content Container - Ajustado para evitar cortes en iPhone pequeños

                IMPORTANTE: aca NO se usa el hook useIsMobile para elegir medidas.
                Ese hook arranca en "false" (escritorio) y recien despues de montar
                mide la pantalla real, asi que en un celular el hero se pintaba con
                los margenes de escritorio y saltaba a los de celular un instante
                despues: ese salto solo valia hasta 0.82 de CLS (el maximo aceptable
                es 0.1). Con clases responsive de Tailwind (md:) el navegador aplica
                la medida correcta desde el primer pintado y no hay salto. */}
            <div className="container relative z-10 mx-auto px-4 -mt-32 pt-20 pb-16 md:px-8 md:-mt-20 md:pt-24 md:pb-20">
                <div className="max-w-full text-center mx-auto md:max-w-5xl md:text-left md:mx-0">
                    {/* Subtitle */}
                    <motion.span
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/20 text-white font-semibold mb-4 tracking-wide text-xs md:text-sm md:px-4 md:py-2 md:mb-6"
                        initial={{ opacity: 0, x: -40, y: -20 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    >
                        <Sparkles className="text-bikitchen-gold w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" aria-hidden="true" />
                        {subtitle}
                    </motion.span>

                    {/* Title */}
                    <h1 className="font-black text-white mb-3 leading-tight drop-shadow-2xl text-3xl sm:text-4xl md:text-6xl lg:text-7xl md:leading-[1.05] md:mb-8">
                        {/* Cada palabra se anima por separado, pero el espacio entre ellas
                            debe ser un espacio REAL: si se simula con margen, Google y los
                            lectores de pantalla leen el título como una sola palabra pegada. */}
                        {title.split(' ').map((word, i, palabras) => (
                            <React.Fragment key={i}>
                                <motion.span
                                    className="inline-block"
                                    initial={{ opacity: 0, x: -50, y: 50 }}
                                    animate={{ opacity: 1, x: 0, y: 0 }}
                                    transition={{
                                        duration: 0.6,
                                        delay: 0.15 + (i * 0.05),
                                        ease: [0.25, 0.46, 0.45, 0.94]
                                    }}
                                >
                                    {word.toLowerCase() === 'saludable' ? (
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold">
                                            {word}
                                        </span>
                                    ) : word}
                                </motion.span>
                                {i < palabras.length - 1 && ' '}
                            </React.Fragment>
                        ))}
                    </h1>

                    {/* Description */}
                    <motion.p
                        className="text-white/90 leading-relaxed font-medium text-sm max-w-full text-center mx-auto mb-24 md:text-2xl md:max-w-2xl md:text-left md:mx-0 md:mb-10"
                        initial={{ opacity: 0, x: -40, y: 30 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        Comida real, hecha con amor y entregada directamente a tu puerta. Olvida la cocina, nosotros nos encargamos.
                    </motion.p>

                    {/* Buttons */}
                    <motion.div
                        className="flex items-center gap-3 flex-col w-full md:flex-row md:flex-wrap md:gap-4 md:w-auto"
                        initial={{ opacity: 0, x: -40, y: 30 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                    >
                        <MagneticButton as="div" className="w-full md:w-auto">
                            <Link
                                to={primaryCTA.link}
                                className="inline-flex items-center justify-center gap-2 bg-white hover:bg-white/90 text-black font-black rounded-2xl shadow-2xl transition-all duration-300 transform active:scale-95 w-full py-3 text-sm px-4 sm:py-4 sm:text-base md:w-auto md:px-10 md:py-5 md:text-xl"
                            >
                                {primaryCTA.text}
                                <ArrowRight className="w-4 h-4 md:w-6 md:h-6 shrink-0" aria-hidden="true" />
                            </Link>
                        </MagneticButton>

                        <Link
                            to={secondaryCTA.link}
                            className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 hover:scale-105 active:scale-95 text-white font-black rounded-2xl shadow-2xl border border-white/30 transition-all duration-200 w-full py-3 text-sm px-4 sm:py-4 sm:text-base md:w-auto md:px-10 md:py-5 md:text-xl"
                        >
                            {secondaryCTA.text}
                        </Link>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Scroll Indicator - v1.7 - Diseño Minimalista y Premium
                Queda SIEMPRE montado y solo cambia de opacidad. Antes entraba y salia
                del DOM con AnimatePresence y ese montaje generaba un salto de diseño
                de 0.10 de CLS por si solo (el limite para estar "bien" es 0.1). */}
            <div
                aria-hidden="true"
                /* absolute (dentro del <section>, que es relative) y NO fixed.
                   PageTransition envuelve la pagina en un motion.div que anima
                   y:15 -> 0; mientras dura esa animacion su transform se vuelve el
                   ancla de todo lo que sea position:fixed adentro, y al terminar
                   Framer quita el transform y el elemento salta casi una pantalla
                   entera. Ese solo salto valia 0.10 de CLS. */
                className={`pointer-events-none absolute left-0 right-0 bottom-[115px] md:bottom-10 z-[100] flex flex-col items-center transition-opacity duration-700 ${isScrolled ? 'opacity-0' : 'opacity-100'}`}
            >
                        {/* El rebote va en CSS (animate-rebote-suave), no en Framer:
                            una animacion infinita en JS corre en el hilo principal
                            en cada cuadro mientras la pagina este abierta. */}
                        <div className="flex flex-col items-center animate-rebote-suave">
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
                                    className="opacity-40" aria-hidden="true"
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
                                    className="drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" aria-hidden="true"
                                >
                                    <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
                                </svg>
                        </div>
                </div>
            </div>
        </section>
    );
};

export default VideoHero;
