import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useContactConfig } from '../../context/ContactConfigContext';
import { Phone, Save, RefreshCw, CheckCircle, AlertCircle, MessageCircle } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

export default function WhatsAppConfigView() {
    const { whatsappPhone, whatsappPhoneAlt, loading } = useContactConfig();
    const [newPhone, setNewPhone] = useState('');
    const [newPhoneAlt, setNewPhoneAlt] = useState('');
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleUpdateNumbers = async (e) => {
        e.preventDefault();

        if (!newPhone && !newPhoneAlt) {
            setMessage({ type: 'error', text: 'Debes ingresar al menos un número' });
            return;
        }

        setUpdating(true);
        setMessage({ type: '', text: '' });

        try {
            const configRef = doc(db, 'config', 'contact');
            await setDoc(configRef, {
                whatsappPhone: newPhone || whatsappPhone,
                whatsappPhoneAlt: newPhoneAlt || whatsappPhoneAlt,
                updatedAt: new Date().toISOString(),
                description: 'Configuración de números de WhatsApp para BiKitchen'
            });

            setMessage({
                type: 'success',
                text: '✅ Números actualizados exitosamente. Los cambios se reflejan en tiempo real.'
            });
            setNewPhone('');
            setNewPhoneAlt('');

            setTimeout(() => {
                setMessage({ type: '', text: '' });
            }, 5000);
        } catch (error) {
            console.error('Error:', error);
            setMessage({
                type: 'error',
                text: '❌ Error al actualizar: ' + error.message
            });
        } finally {
            setUpdating(false);
        }
    };

    const quickSetTest = () => {
        setNewPhone('50685067200');
    };

    const quickSetProduction = () => {
        setNewPhone('50685067200');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-bikitchen-orange" />
                    <p className="text-gray-600">Cargando configuración...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl">
            <AdminPageHeader
                icon={MessageCircle}
                title="Configuración de WhatsApp"
                subtitle="Gestiona los números de WhatsApp para contacto con clientes"
                gradient="from-green-500 via-emerald-400 to-teal-400"
                stats={[
                    { value: whatsappPhone || 'N/A', label: 'Principal' },
                    { value: whatsappPhoneAlt || 'N/A', label: 'Alternativo' }
                ]}
            />

            {/* Números Actuales */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Números Activos
                </h2>
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Número Principal</p>
                            <p className="text-2xl font-bold text-green-600">{whatsappPhone}</p>
                        </div>
                        <a
                            href={`https://wa.me/${whatsappPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Probar
                        </a>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                        <div>
                            <p className="text-sm text-gray-600 font-medium">Número Alternativo</p>
                            <p className="text-xl font-bold text-blue-600">{whatsappPhoneAlt}</p>
                        </div>
                        <a
                            href={`https://wa.me/${whatsappPhoneAlt}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Probar
                        </a>
                    </div>
                </div>
            </div>

            {/* Formulario de Actualización */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Actualizar Números
                </h2>

                {message.text && (
                    <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                        {message.type === 'success' ? (
                            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        )}
                        <p className="text-sm font-medium">{message.text}</p>
                    </div>
                )}

                <form onSubmit={handleUpdateNumbers} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nuevo Número Principal
                        </label>
                        <input
                            type="text"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="Ej: 50685067200"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Formato: código de país + número (sin espacios ni guiones)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nuevo Número Alternativo
                        </label>
                        <input
                            type="text"
                            value={newPhoneAlt}
                            onChange={(e) => setNewPhoneAlt(e.target.value)}
                            placeholder="Ej: 50688311500"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={updating || (!newPhone && !newPhoneAlt)}
                            className="flex-1 bg-bikitchen-orange hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {updating ? (
                                <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                    Actualizando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Accesos Rápidos */}
            <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Accesos Rápidos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={quickSetTest}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        📱 Número de Pruebas (8506-7200)
                    </button>
                    <button
                        onClick={quickSetProduction}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        🚀 Número de Producción (85067200)
                    </button>
                </div>
                <p className="text-sm text-gray-600 mt-4">
                    ℹ️ Los cambios se reflejan automáticamente en toda la aplicación en tiempo real
                </p>
            </div>
        </div>
    );
}
