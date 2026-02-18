import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldX, Home, ArrowLeft, Lock, AlertTriangle } from 'lucide-react';

export default function AccesoDenegadoPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 text-center max-w-lg mx-auto"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", delay: 0.2 }}
                    className="relative mx-auto mb-8"
                >
                    <div className="w-32 h-32 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                        <div className="w-24 h-24 bg-gradient-to-br from-red-500/30 to-orange-500/30 rounded-full flex items-center justify-center">
                            <ShieldX size={48} className="text-red-400" />
                        </div>
                    </div>
                    
                    {/* Floating Icons */}
                    <motion.div
                        animate={{ y: [-5, 5, -5] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                        className="absolute -top-2 -right-2"
                    >
                        <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-500/30">
                            <Lock size={20} className="text-red-400" />
                        </div>
                    </motion.div>
                    
                    <motion.div
                        animate={{ y: [5, -5, 5] }}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                        className="absolute -bottom-2 -left-2"
                    >
                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                            <AlertTriangle size={20} className="text-orange-400" />
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
                    <span className="text-7xl md:text-8xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                        403
                    </span>
                </motion.div>

                {/* Title */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-2xl md:text-3xl font-bold text-white mb-4"
                >
                    Acceso Denegado
                </motion.h1>

                {/* Description */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-gray-400 mb-8 max-w-md mx-auto"
                >
                    ¡Ups! No tienes permisos para acceder a esta área. 
                    Esta sección está reservada para administradores de BiKitchen.
                </motion.p>

                {/* Info Box */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 backdrop-blur-sm"
                >
                    <p className="text-gray-300 text-sm">
                        🔒 Si crees que deberías tener acceso, contacta al equipo de BiKitchen.
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
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors border border-white/10"
                    >
                        <ArrowLeft size={20} />
                        Volver Atrás
                    </button>
                    
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-bikitchen-orange to-orange-500 hover:from-bikitchen-orange-dark hover:to-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/25"
                    >
                        <Home size={20} />
                        Ir al Inicio
                    </Link>
                </motion.div>

                {/* Footer */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-12"
                >
                    <Link to="/" className="inline-block">
                        <img 
                            src="/assets/logo.jpg" 
                            alt="BiKitchen" 
                            className="h-10 w-auto mx-auto rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                        />
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    );
}
