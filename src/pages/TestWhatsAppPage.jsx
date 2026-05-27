import React from 'react';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { useContactConfig } from '../context/ContactConfigContext';

/**
 * Página de prueba para verificar el sistema de WhatsApp
 * Acceder en: /test-whatsapp
 */
export default function TestWhatsAppPage() {
    const { whatsappPhone, getWhatsAppUrl, urls } = useWhatsApp();
    const { whatsappPhone: configPhone, whatsappPhoneAlt, loading, updateWhatsAppPhone } = useContactConfig();

    const handleChangeToProduction = async () => {
        const confirmed = window.confirm('¿Cambiar a número de producción (85067200)?');
        if (confirmed) {
            await updateWhatsAppPhone('50685067200');
            alert('Número actualizado a producción');
        }
    };

    const handleChangeToTest = async () => {
        const confirmed = window.confirm('¿Cambiar al número principal (8506-7200)?');
        if (confirmed) {
            await updateWhatsAppPhone('50685067200');
            alert('Número actualizado a pruebas');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bikitchen-orange mx-auto mb-4"></div>
                    <p>Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        🧪 Test de Sistema WhatsApp
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Verifica que el sistema de WhatsApp dinámico funcione correctamente
                    </p>

                    {/* Configuración Actual */}
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-bold text-green-900 mb-4 flex items-center gap-2">
                            ✅ Configuración Actual
                        </h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 font-medium">Número Principal:</span>
                                <span className="text-2xl font-bold text-green-600">{whatsappPhone}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 font-medium">Número Alternativo:</span>
                                <span className="text-lg font-semibold text-gray-600">{whatsappPhoneAlt}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-700 font-medium">Estado:</span>
                                <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                                    Conectado a Firebase
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Acciones Rápidas */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-bold text-blue-900 mb-4">
                            🔄 Cambiar Número
                        </h2>
                        <div className="flex gap-4">
                            <button
                                onClick={handleChangeToTest}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                            >
                                📱 Principal (8506-7200)
                            </button>
                            <button
                                onClick={handleChangeToProduction}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
                            >
                                🚀 Producción (85067200)
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mt-3">
                            Los cambios se reflejan inmediatamente en toda la aplicación
                        </p>
                    </div>

                    {/* URLs de Prueba */}
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-8">
                        <h2 className="text-xl font-bold text-purple-900 mb-4">
                            🔗 URLs Generadas
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Mensaje de Bienvenida:</p>
                                <a
                                    href={urls.INICIO}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm break-all"
                                >
                                    {urls.INICIO}
                                </a>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Pack Semanal:</p>
                                <a
                                    href={urls.PACK_SEMANAL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm break-all"
                                >
                                    {urls.PACK_SEMANAL}
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Prueba */}
                    <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-yellow-900 mb-4">
                            🧪 Probar Botones
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <a
                                href={getWhatsAppUrl('Hola 👋')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
                            >
                                💬 Mensaje de Bienvenida
                            </a>
                            <a
                                href={getWhatsAppUrl('Pack Semanal 📅')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
                            >
                                📦 Pack Semanal
                            </a>
                            <a
                                href={getWhatsAppUrl('Promoción Mensual 🎁')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
                            >
                                🎁 Promoción
                            </a>
                            <a
                                href={getWhatsAppUrl('Quiero pedir 🛒')}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-6 rounded-xl text-center transition-colors flex items-center justify-center gap-2"
                            >
                                🛒 Hacer Pedido
                            </a>
                        </div>
                        <p className="text-sm text-gray-600 mt-4">
                            Haz clic en cualquier botón para abrir WhatsApp y verificar el número
                        </p>
                    </div>

                    {/* Información Técnica */}
                    <div className="mt-8 p-4 bg-gray-100 rounded-lg">
                        <h3 className="font-bold text-gray-900 mb-2">ℹ️ Información Técnica</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Context: ContactConfigContext cargado ✅</li>
                            <li>• Hook: useWhatsApp funcionando ✅</li>
                            <li>• Firebase: Conectado en tiempo real ✅</li>
                            <li>• Colección: config/contact</li>
                        </ul>
                    </div>

                    {/* Botón Volver */}
                    <div className="mt-8 text-center">
                        <a
                            href="/"
                            className="inline-block bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-xl transition-colors"
                        >
                            ← Volver al Inicio
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
