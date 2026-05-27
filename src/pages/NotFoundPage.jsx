import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Home, ArrowLeft, ChefHat, UtensilsCrossed } from 'lucide-react';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-bikitchen-beige via-white to-orange-50 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-bikitchen-orange/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-bikitchen-gold/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Pattern */}
            <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.8)_1px,transparent_1px)] bg-[length:32px_32px]"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 text-center max-w-lg mx-auto"
            >
                {/* Animated Chef */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="relative mx-auto mb-8"
                >
                    <div className="w-32 h-32 bg-gradient-to-br from-bikitchen-orange/20 to-bikitchen-gold/20 rounded-full flex items-center justify-center mx-auto border border-bikitchen-orange/30">
                        <div className="w-24 h-24 bg-gradient-to-br from-bikitchen-orange/30 to-bikitchen-gold/30 rounded-full flex items-center justify-center">
                            <ChefHat size={48} className="text-bikitchen-orange" />
                        </div>
                    </div>

                    {/* Floating Icons */}
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
                        className="absolute -top-2 -right-2"
                    >
                        <div className="w-10 h-10 bg-bikitchen-orange/20 rounded-lg flex items-center justify-center border border-bikitchen-orange/30">
                            <UtensilsCrossed size={20} className="text-bikitchen-orange" />
                        </div>
                    </motion.div>

                    <motion.div
                        animate={{ y: [5, -5, 5] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="absolute -bottom-2 -left-2"
                    >
                        <div className="w-10 h-10 bg-bikitchen-gold/20 rounded-lg flex items-center justify-center border border-bikitchen-gold/30">
                            <Search size={20} className="text-bikitchen-gold" />
                        </div>
                    </motion.div>
                </motion.div>

                {/* Error Code */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4"
                >
                    <span className="text-7xl md:text-8xl font-black bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold bg-clip-text text-transparent">
                        404
                    </span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl md:text-3xl font-bold text-gray-900 mb-4"
                >
                    ¡Oops! Página no encontrada
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-600 mb-8 max-w-md mx-auto"
                >
                    Parece que este plato no está en nuestro menú.
                    La página que buscas no existe o ha sido movida.
                </motion.p>

                {/* Fun Message */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-bikitchen-orange/10 border border-bikitchen-orange/20 rounded-xl p-4 mb-8"
                >
                    <p className="text-gray-700 text-sm">
                        🍳 Mientras tanto, ¿qué tal si exploras nuestro delicioso menú?
                    </p>
                </motion.div>

                {/* Buttons */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.7 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors border border-gray-200"
                    >
                        <ArrowLeft size={20} />
                        Volver Atrás
                    </button>

                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-bikitchen-orange to-bikitchen-gold hover:from-bikitchen-orange-dark hover:to-yellow-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-bikitchen-orange/25"
                    >
                        <Home size={20} />
                        Ir al Inicio
                    </Link>
                </motion.div>

                {/* Quick Links */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-10 pt-8 border-t border-gray-200"
                >
                    <p className="text-gray-500 text-sm mb-4">Enlaces útiles:</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link to="/menu" className="text-bikitchen-orange hover:text-bikitchen-orange-dark font-medium text-sm transition-colors">
                            Ver Menú
                        </Link>
                        <Link to="/packs" className="text-bikitchen-orange hover:text-bikitchen-orange-dark font-medium text-sm transition-colors">
                            Nuestros Packs
                        </Link>
                        <Link to="/como-funciona" className="text-bikitchen-orange hover:text-bikitchen-orange-dark font-medium text-sm transition-colors">
                            Cómo Funciona
                        </Link>
                        <Link to="/nosotros" className="text-bikitchen-orange hover:text-bikitchen-orange-dark font-medium text-sm transition-colors">
                            Nosotros
                        </Link>
                    </div>
                </motion.div>

                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9 }}
                    className="mt-8"
                >
                    <Link to="/" className="inline-block">
                        <img
                            src="/assets/logo.png"
                            alt="BiKitchen"
                            className="h-14 w-auto mx-auto rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                        />
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
