import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente para proteger rutas que requieren autenticación
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes hijos a renderizar si está autenticado
 * @param {boolean} props.requireAdmin - Si es true, requiere rol de admin
 */
export default function ProtectedRoute({ children, requireAdmin = false, requireDriver = false }) {
    const { currentUser, isAdmin, isDriver, loading } = useAuth();
    const location = useLocation();

    // Mostrar loading mientras se verifica la autenticación
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-bikitchen-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 font-medium">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    // Si no está autenticado, redirigir a página de acceso denegado
    if (!currentUser) {
        return <Navigate to="/acceso-denegado" state={{ from: location }} replace />;
    }

    // Si requiere admin y no es admin, redirigir a acceso denegado
    if (requireAdmin && !isAdmin()) {
        return <Navigate to="/acceso-denegado" state={{ from: location }} replace />;
    }

    // Si requiere repartidor y no es repartidor, redirigir a acceso denegado
    if (requireDriver && !isDriver()) {
        return <Navigate to="/acceso-denegado" state={{ from: location }} replace />;
    }

    return children;
}
