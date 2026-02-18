import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
    const navigate = useNavigate();
    const { login, resetPassword, currentUser, isAdmin } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');

    // Si ya está logueado como admin, redirigir
    useEffect(() => {
        if (currentUser && isAdmin()) {
            navigate('/admin');
        }
    }, [currentUser, isAdmin, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);

        const result = await login(email, password);
        
        if (result.success) {
            if (result.role === 'admin') {
                navigate('/admin');
            } else {
                setError('No tienes permisos de administrador');
            }
        } else {
            setError(result.error);
        }
        
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <img src="/assets/logo.jpg" alt="BiKitchen" className="w-10 h-10 object-contain" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">BiKitchen Admin</h1>
                    <p className="text-gray-500">Ingresa para gestionar la operación.</p>
                </div>

                {/* Mensajes */}
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                        <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}
                {info && !error && (
                    <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                        {info}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                placeholder="admin@bikitchen.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
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
                            className="mt-2 text-xs text-orange-600 hover:text-orange-700 font-semibold"
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Verificando...</span>
                            </>
                        ) : (
                            'Iniciar Sesión'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
