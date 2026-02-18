import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Save, AlertCircle, CheckCircle, Settings, Info } from 'lucide-react';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getEmailConfig } from '../services/emailNotifications';

export default function NotificationsConfigView() {
    const [notificationEmail, setNotificationEmail] = useState('ginamaroli@gmail.com');
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [emailJsConfig, setEmailJsConfig] = useState(null);

    // Cargar configuración actual
    useEffect(() => {
        loadConfig();
        setEmailJsConfig(getEmailConfig());
    }, []);

    const loadConfig = async () => {
        try {
            const configDoc = await getDoc(doc(db, 'config', 'notifications'));
            if (configDoc.exists()) {
                const data = configDoc.data();
                setNotificationEmail(data.email || 'ginamaroli@gmail.com');
                setEmailEnabled(data.enabled !== false); // Por defecto true
            }
        } catch (error) {
            console.error('Error loading notifications config:', error);
            showMessage('Error al cargar configuración', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        // Validar email
        if (!notificationEmail.trim()) {
            showMessage('El email es requerido', 'error');
            return;
        }

        if (!/\S+@\S+\.\S+/.test(notificationEmail)) {
            showMessage('Email inválido', 'error');
            return;
        }

        setSaving(true);
        try {
            await setDoc(doc(db, 'config', 'notifications'), {
                email: notificationEmail.trim().toLowerCase(),
                enabled: emailEnabled,
                updatedAt: new Date().toISOString()
            });

            showMessage('Configuración guardada correctamente', 'success');
        } catch (error) {
            console.error('Error saving notifications config:', error);
            showMessage('Error al guardar configuración', 'error');
        } finally {
            setSaving(false);
        }
    };

    const showMessage = (text, type) => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bikitchen-orange"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                    <Mail className="text-white" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Notificaciones por Email</h2>
                    <p className="text-gray-600">Configura dónde recibir notificaciones de nuevos pedidos</p>
                </div>
            </div>

            {/* EmailJS Status */}
            {emailJsConfig && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border-2 ${emailJsConfig.configured
                            ? 'bg-green-50 border-green-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                >
                    <div className="flex items-start gap-3">
                        {emailJsConfig.configured ? (
                            <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
                        ) : (
                            <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
                        )}
                        <div className="flex-1">
                            <h3 className={`font-semibold ${emailJsConfig.configured ? 'text-green-900' : 'text-yellow-900'
                                }`}>
                                {emailJsConfig.configured ? 'EmailJS Configurado' : 'EmailJS No Configurado'}
                            </h3>
                            <p className={`text-sm mt-1 ${emailJsConfig.configured ? 'text-green-700' : 'text-yellow-700'
                                }`}>
                                {emailJsConfig.configured
                                    ? 'El servicio de email está listo para enviar notificaciones.'
                                    : 'Necesitas configurar EmailJS para recibir notificaciones por email.'}
                            </p>
                            {!emailJsConfig.configured && (
                                <div className="mt-2 text-sm text-yellow-800">
                                    <p className="font-medium">Pasos para configurar:</p>
                                    <ol className="list-decimal list-inside mt-1 space-y-1">
                                        <li>Crear cuenta en <a href="https://www.emailjs.com/" target="_blank" rel="noopener noreferrer" className="underline">EmailJS</a></li>
                                        <li>Crear un servicio de email</li>
                                        <li>Crear una plantilla de notificación</li>
                                        <li>Agregar las credenciales al archivo .env.local</li>
                                    </ol>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Configuration Form */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
                <div className="space-y-6">
                    {/* Enable/Disable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                            <Settings className="text-gray-600" size={20} />
                            <div>
                                <h3 className="font-semibold text-gray-900">Notificaciones Activas</h3>
                                <p className="text-sm text-gray-600">Recibir email con cada nuevo pedido</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setEmailEnabled(!emailEnabled)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${emailEnabled ? 'bg-green-500' : 'bg-gray-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${emailEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Email Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email de Notificaciones
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="email"
                                value={notificationEmail}
                                onChange={(e) => setNotificationEmail(e.target.value)}
                                placeholder="correo@ejemplo.com"
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bikitchen-orange focus:border-transparent"
                                disabled={!emailEnabled}
                            />
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                            Los emails de notificación llegarán a esta dirección
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium">¿Cómo funciona?</p>
                            <p className="mt-1">
                                Cuando un cliente realiza un pedido, recibirás automáticamente un email con todos los detalles:
                                número de orden, items, datos del cliente, dirección de entrega y método de pago.
                            </p>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 bg-gradient-to-r from-bikitchen-orange to-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Guardar Configuración
                                </>
                            )}
                        </button>

                        {/* Success/Error Message */}
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${message.type === 'success'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                            >
                                {message.type === 'success' ? (
                                    <CheckCircle size={18} />
                                ) : (
                                    <AlertCircle size={18} />
                                )}
                                <span className="text-sm font-medium">{message.text}</span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Test Email Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl border border-purple-200 p-6"
            >
                <h3 className="font-semibold text-gray-900 mb-2">Próximamente: Email de Prueba</h3>
                <p className="text-sm text-gray-600 mb-4">
                    Podrás enviar un email de prueba para verificar que todo funciona correctamente.
                </p>
                <button
                    disabled
                    className="px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed text-sm"
                >
                    Enviar Email de Prueba (Próximamente)
                </button>
            </motion.div>
        </div>
    );
}
