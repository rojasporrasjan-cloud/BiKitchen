import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote, ChevronLeft, ChevronRight, MessageSquare, Sparkles } from 'lucide-react';
import { useWhatsApp } from '../hooks/useWhatsApp';

// Testimonios de ejemplo - En producción vendrían de Firestore
const TESTIMONIALS = [
    {
        id: 1,
        name: 'María González',
        avatar: 'MG',
        role: 'Profesional ocupada',
        rating: 5,
        text: 'BiKitchen cambió mi vida. Ya no tengo que preocuparme por cocinar después de un largo día de trabajo. La comida es deliciosa y siempre llega fresca.',
        date: '2024-11-15',
        verified: true,
        pack: 'Almuerzo y Cena'
    },
    {
        id: 2,
        name: 'Carlos Rodríguez',
        avatar: 'CR',
        role: 'Padre de familia',
        rating: 5,
        text: 'Excelente servicio. Mi familia está encantada con la variedad del menú. Los niños ahora comen más saludable y yo ahorro tiempo para estar con ellos.',
        date: '2024-11-10',
        verified: true,
        pack: 'Pack Familiar'
    },
    {
        id: 3,
        name: 'Ana Martínez',
        avatar: 'AM',
        role: 'Emprendedora',
        rating: 5,
        text: 'La mejor inversión que he hecho. El tiempo que ahorro cocinando lo dedico a mi negocio. Además, las porciones son perfectas y muy bien balanceadas.',
        date: '2024-11-08',
        verified: true,
        pack: 'Pack 15 Comidas'
    },
    {
        id: 4,
        name: 'Roberto Sánchez',
        avatar: 'RS',
        role: 'Deportista',
        rating: 4,
        text: 'Me encanta poder personalizar las proteínas. Como atleta, necesito comidas con buen aporte nutricional y BiKitchen cumple perfectamente.',
        date: '2024-11-05',
        verified: true,
        pack: 'Almuerzo y Cena'
    },
    {
        id: 5,
        name: 'Laura Jiménez',
        avatar: 'LJ',
        role: 'Estudiante universitaria',
        rating: 5,
        text: 'Perfecto para la vida universitaria. Comida casera sin tener que cocinar. El Two Pack que comparto con mi roommate nos sale súper bien.',
        date: '2024-10-28',
        verified: true,
        pack: 'Two Pack'
    },
    {
        id: 6,
        name: 'Diego Mora',
        avatar: 'DM',
        role: 'Trabajador remoto',
        rating: 5,
        text: 'Trabajando desde casa es fácil descuidar la alimentación. Con BiKitchen tengo comidas saludables listas en minutos. 100% recomendado.',
        date: '2024-10-25',
        verified: true,
        pack: 'Almuerzo y Cena'
    }
];

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
                        <h4 className="font-semibold text-gray-900">
                            {testimonial.name}
                        </h4>
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
        if (!isAutoPlaying) return;
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % TESTIMONIALS.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [isAutoPlaying]);

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
                            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50:bg-gray-700 transition-colors"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <div className="flex gap-2">
                            {TESTIMONIALS.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setIsAutoPlaying(false);
                                        setCurrentSlide(index);
                                    }}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                        index === currentSlide
                                            ? 'w-6 bg-bikitchen-orange'
                                            : 'bg-gray-300'
                                    }`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={nextSlide}
                            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50:bg-gray-700 transition-colors"
                        >
                            <ChevronRight size={20} />
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
