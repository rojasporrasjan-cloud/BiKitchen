import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight, MessageSquare, Sparkles } from 'lucide-react';
import { useWhatsApp } from '../hooks/useWhatsApp';

// Testimonios REALES de clientes. Vacio a proposito.
//
// Aca habia seis personas inventadas (Maria Gonzalez, Carlos Rodriguez, Ana
// Martinez, Roberto Sanchez, Laura Jimenez y Diego Mora) con calificaciones y
// fechas falsas, publicadas con una insignia de "Verificado". Se quitaron: son
// resenas fabricadas, Google las penaliza y si un cliente nota una, deja de
// creerle al resto del sitio.
//
// Para agregar uno de verdad: pedile permiso al cliente, copia su mensaje tal
// como lo escribio y agrega un objeto con la misma forma. Con la lista vacia,
// la seccion sencillamente no se muestra.
//
//   { id: 1, name: "Nombre real", avatar: "NR", role: "Como se describe",
//     rating: 5, text: "Lo que escribio", date: "2026-09-01",
//     verified: true, pack: "El pack que compro" }
const TESTIMONIALS = [];

const StarRating = ({ rating, size = 16 }) => {
    return (
        <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <Star
                    key={star}
                    size={size}
                    className={`${
                        star <= rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                    }`}
                />
            ))}
        </div>
    );
};

const TestimonialCard = ({ testimonial, featured = false }) => {
    const colors = [
        'from-orange-500 to-red-500',
        'from-blue-500 to-purple-500',
        'from-green-500 to-teal-500',
        'from-pink-500 to-rose-500',
        'from-indigo-500 to-blue-500',
        'from-amber-500 to-orange-500'
    ];
    const colorIndex = testimonial.id % colors.length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`bg-white rounded-2xl p-6 shadow-lg border border-gray-100 ${
                featured ? 'md:col-span-2' : ''
            }`}
        >
            {/* Quote Icon */}
            <div className="mb-4">
                <Quote size={32} className="text-bikitchen-orange/20" />
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
                <StarRating rating={testimonial.rating} />
                <span className="text-sm text-gray-500">
                    {testimonial.rating}.0
                </span>
            </div>

            {/* Text */}
            <p className="text-gray-700 mb-6 leading-relaxed">
                "{testimonial.text}"
            </p>

            {/* Author */}
            <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[colorIndex]} flex items-center justify-center text-white font-bold`}>
                    {testimonial.avatar}
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">
                            {testimonial.name}
                        </h3>
                        {testimonial.verified && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                                ✓ Verificado
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-gray-500">
                        {testimonial.role} • {testimonial.pack}
                    </p>
                </div>
            </div>
        </motion.div>
    );
};

export default function TestimonialsSection() {
    const { getWhatsAppUrl } = useWhatsApp();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Auto-play carousel
    useEffect(() => {
        if (!isAutoPlaying || TESTIMONIALS.length === 0) return;
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % TESTIMONIALS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [isAutoPlaying]);

    // Sin testimonios reales no se muestra nada. Mejor una seccion menos que una
    // seccion con clientes inventados. Los hooks van arriba de este return
    // porque React exige que se ejecuten siempre, en el mismo orden.
    if (TESTIMONIALS.length === 0) return null;

    const nextSlide = () => {
        setIsAutoPlaying(false);
        setCurrentSlide((prev) => (prev + 1) % TESTIMONIALS.length);
    };

    const prevSlide = () => {
        setIsAutoPlaying(false);
        setCurrentSlide((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
    };

    // Calculate average rating
    const avgRating = (TESTIMONIALS.reduce((sum, t) => sum + t.rating, 0) / TESTIMONIALS.length).toFixed(1);

    return (
        <section className="py-20 bg-gradient-to-b from-white to-bikitchen-beige overflow-hidden">
            <div className="container">
                {/* Header */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full text-sm font-semibold mb-4"
                    >
                        <Sparkles size={16} />
                        Lo que dicen nuestros clientes
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
                    >
                        Testimonios Reales
                    </motion.h2>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-center gap-4"
                    >
                        <div className="flex items-center gap-2">
                            <StarRating rating={5} size={20} />
                            <span className="text-2xl font-bold text-gray-900">{avgRating}</span>
                        </div>
                        <span className="text-gray-500">
                            basado en {TESTIMONIALS.length}+ reseñas
                        </span>
                    </motion.div>
                </div>

                {/* Mobile Carousel */}
                <div className="md:hidden relative">
                    <div className="overflow-hidden">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                            >
                                <TestimonialCard testimonial={TESTIMONIALS[currentSlide]} />
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-center gap-4 mt-6">
                        <button
                            onClick={prevSlide}
                            aria-label="Ver el testimonio anterior"
                            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft size={20} aria-hidden="true" />
                        </button>

                        <div className="flex gap-2">
                            {TESTIMONIALS.map((_, index) => (
                                /* El punto visible mide 8 px, pero el area que se puede tocar
                                   es de 24x24: abajo de eso el dedo falla y Google lo marca. */
                                <button
                                    key={index}
                                    onClick={() => {
                                        setIsAutoPlaying(false);
                                        setCurrentSlide(index);
                                    }}
                                    aria-label={`Ver el testimonio ${index + 1} de ${TESTIMONIALS.length}`}
                                    aria-current={index === currentSlide ? 'true' : undefined}
                                    className="w-6 h-6 flex items-center justify-center"
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`h-2 rounded-full transition-all ${
                                            index === currentSlide
                                                ? 'w-6 bg-bikitchen-orange'
                                                : 'w-2 bg-gray-300'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={nextSlide}
                            aria-label="Ver el testimonio siguiente"
                            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50:bg-gray-700 transition-colors"
                        >
                            <ChevronRight size={20} aria-hidden="true" />
                        </button>
                    </div>
                </div>

                {/* Desktop Grid */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {TESTIMONIALS.slice(0, 6).map((testimonial, index) => (
                        <TestimonialCard 
                            key={testimonial.id} 
                            testimonial={testimonial}
                            featured={index === 0}
                        />
                    ))}
                </div>

                {/* Stats Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-12 bg-gradient-to-r from-bikitchen-orange to-orange-500 rounded-2xl p-6 md:p-8"
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-white text-center">
                        <div>
                            <p className="text-3xl md:text-4xl font-bold mb-1">500+</p>
                            <p className="text-white/80 text-sm">Clientes felices</p>
                        </div>
                        <div>
                            <p className="text-3xl md:text-4xl font-bold mb-1">{avgRating}</p>
                            <p className="text-white/80 text-sm">Calificación promedio</p>
                        </div>
                        <div>
                            <p className="text-3xl md:text-4xl font-bold mb-1">98%</p>
                            <p className="text-white/80 text-sm">Recomendarían</p>
                        </div>
                        <div>
                            <p className="text-3xl md:text-4xl font-bold mb-1">15k+</p>
                            <p className="text-white/80 text-sm">Comidas entregadas</p>
                        </div>
                    </div>
                </motion.div>

                {/* CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mt-8 text-center"
                >
                    <p className="text-gray-600 mb-4">
                        ¿Ya probaste BiKitchen? ¡Nos encantaría saber tu opinión!
                    </p>
                    <a
                        href={getWhatsAppUrl('Hola, quiero compartir mi experiencia ⭐')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 bg-white text-bikitchen-orange px-6 py-3 rounded-xl font-semibold hover:bg-gray-50:bg-gray-700 transition-colors border border-bikitchen-orange"
                    >
                        <MessageSquare size={20} />
                        Dejar mi Reseña
                    </a>
                </motion.div>
            </div>
        </section>
    );
}
