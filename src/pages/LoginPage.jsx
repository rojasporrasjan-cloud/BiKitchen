import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowLeft, AlertCircle, User, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import WelcomeCouponModal from '../components/WelcomeCouponModal';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [registeredName, setRegisteredName] = useState('');

    const { login, register, resetPassword } = useAuth();
    const { getWhatsAppUrl } = useWhatsApp();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);

        let result;
        if (isLogin) {
            result = await login(email, password);
        } else {
            if (!name.trim()) {
                setError('El nombre es requerido');
                setLoading(false);
                return;
            }
            result = await register(email, password, name);
        }

        if (result.success) {
            if (!isLogin) {
                // Si es registro, mostrar modal de bienvenida con cupón
                setRegisteredName(name);
                setShowWelcomeModal(true);
            } else {
                // Si es login, redirigir al inicio
                navigate('/');
            }
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    const handleCloseWelcomeModal = () => {
        setShowWelcomeModal(false);
        navigate('/');
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setInfo('');
        setEmail('');
        setPassword('');
        setName('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-bikitchen-beige via-white to-orange-50 flex items-center justify-center p-4">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-bikitchen-orange/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-bikitchen-gold/10 rounded-full blur-3xl"></div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Back button */}
                <Link
                    to="/"
                    className="inline-flex items-center gap-2 text-gray-600 hover:text-bikitchen-orange:text-bikitchen-gold mb-6 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span>Volver al inicio</span>
                </Link>

                {/* Login Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center bg-white rounded-2xl p-3 shadow-lg mb-4">
                            <img
                                src="/assets/logo.jpg"
                                alt="BiKitchen"
                                className="h-16 w-auto object-contain block mx-auto"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
                        </h1>
                        <p className="text-gray-500 mt-2">
                            {isLogin ? 'Accede a tu cuenta BiKitchen' : 'Únete a la comunidad BiKitchen'}
                        </p>
                    </div>

                    {/* Mensajes */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3"
                        >
                            <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                            <p className="text-red-600 text-sm">{error}</p>
                        </motion.div>
                    )}
                    {info && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700"
                        >
                            {info}
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Name (Register only) */}
                        {!isLogin && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                            >
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nombre Completo
                                </label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Tu nombre"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                                    />
                                </div>
                            </motion.div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="tu@email.com"
                                    required
                                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent outline-none transition-all text-gray-900 placeholder-gray-400"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {isLogin && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setError('');
                                        setInfo('');
                                        if (!email) {
                                            setError('Ingresa tu correo para recuperar tu contraseña');
                                            return;
                                        }
                                        const result = await resetPassword(email);
                                        if (result.success) {
                                            setInfo('Te enviamos un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
                                        } else {
                                            setError(result.error);
                                        }
                                    }}
                                    className="mt-2 text-xs text-bikitchen-orange hover:text-bikitchen-orange-dark font-semibold"
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                            )}
                        </div>

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-bikitchen-orange to-orange-500 hover:from-bikitchen-orange-dark hover:to-orange-600 text-white font-bold py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <>
                                    {isLogin ? <LogIn size={20} /> : <UserPlus size={20} />}
                                    <span>{isLogin ? 'Iniciar Sesión' : 'Registrarse'}</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Toggle Mode */}
                    <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                        <p className="text-sm text-gray-500">
                            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                            <button
                                onClick={toggleMode}
                                className="ml-2 text-bikitchen-orange hover:text-bikitchen-orange-dark font-bold transition-colors"
                            >
                                {isLogin ? 'Regístrate aquí' : 'Inicia sesión'}
                            </button>
                        </p>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-6">
                        ¿Necesitas ayuda?{' '}
                        <a
                            href={getWhatsAppUrl('Hola, necesito ayuda con mi cuenta 🔐')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-bikitchen-orange hover:text-bikitchen-orange-dark"
                        >
                            Contáctanos
                        </a>
                    </p>
                </div>
            </motion.div>

            {/* Modal de Bienvenida con Cupón */}
            <WelcomeCouponModal
                isOpen={showWelcomeModal}
                onClose={handleCloseWelcomeModal}
                userName={registeredName}
            />
        </div>
    );
}
