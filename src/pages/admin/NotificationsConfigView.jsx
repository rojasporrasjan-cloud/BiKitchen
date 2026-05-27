import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Save, AlertCircle, CheckCircle, Settings, Info } from 'lucide-react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getEmailConfig } from '../../services/emailNotifications';

export default function NotificationsConfigView() {
    const [notificationEmail, setNotificationEmail] = useState('');
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
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
                setNotificationEmail(data.email || '');
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
        // Validar email(s)
        if (!notificationEmail.trim()) {
            showMessage('El email es requerido', 'error');
            return;
        }

        // Validar que al menos el primer email sea válido
        const firstEmail = notificationEmail.split(',')[0].trim();
        if (!/\S+@\S+\.\S+/.test(firstEmail)) {
            showMessage('Email principal inválido', 'error');
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

    const handleSendTestEmail = async () => {
        if (!notificationEmail) {
            showMessage('Ingresa un email para la prueba', 'error');
            return;
        }

        setTestLoading(true);
        try {
            const { sendTestNotification } = await import('../../services/emailNotifications');
            // Tomar el primer email si hay varios
            const target = notificationEmail.split(',')[0].trim();
            const result = await sendTestNotification(target);
            
            if (result.success) {
                showMessage('✅ Email de prueba enviado!', 'success');
            } else {
                showMessage(`❌ Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error in test email:', error);
            showMessage('Error al enviar prueba', 'error');
        } finally {
            setTestLoading(false);
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
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Mail className="text-white" size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Notificaciones por Email</h2>
                    <p className="text-gray-600">Configura dónde recibir notificaciones de nuevos pedidos</p>
                </div>
            </div>

            {/* EmailJS Status Card */}
            {emailJsConfig && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-2xl border-2 ${emailJsConfig.configured
                            ? 'bg-green-50 border-green-100 shadow-sm'
                            : 'bg-yellow-50 border-yellow-100 shadow-sm'
                        }`}
                >
                    <div className="flex items-start gap-4">
                        <div className={`p-2 rounded-lg ${emailJsConfig.configured ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {emailJsConfig.configured ? (
                                <CheckCircle size={24} />
                            ) : (
                                <AlertCircle size={24} />
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className={`font-bold text-lg ${emailJsConfig.configured ? 'text-green-900' : 'text-yellow-900'
                                }`}>
                                {emailJsConfig.configured ? 'Sistema de Email Activo' : 'EmailJS Pendiente de Configurar'}
                            </h3>
                            <p className={`mt-1 ${emailJsConfig.configured ? 'text-green-700' : 'text-yellow-700'
                                }`}>
                                {emailJsConfig.configured
                                    ? 'El servicio de notificaciones automáticas está configurado correctamente.'
                                    : 'Es necesario configurar las claves de EmailJS en el servidor para que los correos salgan.'}
                            </p>
                            {!emailJsConfig.configured && (
                                <div className="mt-3 p-3 bg-white/50 rounded-lg text-sm text-yellow-800 border border-yellow-200/50">
                                    <p className="font-semibold mb-1">Pasos técnicos requeridos:</p>
                                    <ul className="list-disc list-inside space-y-0.5 opacity-80">
                                        <li>Configurar VITE_EMAILJS_SERVICE_ID</li>
                                        <li>Configurar VITE_EMAILJS_TEMPLATE_ID</li>
                                        <li>Configurar VITE_EMAILJS_PUBLIC_KEY</li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Main Configuration Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden"
            >
                {/* Enable/Disable Banner */}
                <div className={`p-4 flex items-center justify-between transition-colors ${emailEnabled ? 'bg-orange-50/50' : 'bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${emailEnabled ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-500'}`}>
                            <Settings size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Estado del Envío</h3>
                            <p className="text-xs text-gray-500">Activa o desactiva todas las alertas por correo</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setEmailEnabled(!emailEnabled)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all shadow-inner ${emailEnabled ? 'bg-bikitchen-orange' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${emailEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Email Input */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-bold text-gray-700">
                                Correos de Destino (Gina y otros)
                            </label>
                            <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Multi-Destinatario
                            </span>
                        </div>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-4 text-gray-400 group-focus-within:text-bikitchen-orange transition-colors" size={20} />
                            <textarea
                                value={notificationEmail}
                                onChange={(e) => setNotificationEmail(e.target.value)}
                                placeholder="ejemplo1@gmail.com, ejemplo2@gmail.com"
                                className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-bikitchen-orange transition-all outline-none resize-none min-h-[100px]"
                                disabled={!emailEnabled}
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                            <Info size={12} />
                            Separa varios correos con una coma ( , ) para que todos reciban la alerta.
                        </p>
                    </div>

                    {/* Test & Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-gray-50">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-bikitchen-orange to-orange-600 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-orange-200 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                            ) : (
                                <><Save size={20} /> Guardar Cambios</>
                            )}
                        </button>

                        <button
                            onClick={handleSendTestEmail}
                            disabled={testLoading || !emailEnabled}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border-2 border-purple-100 text-purple-600 px-6 py-3.2 rounded-xl font-bold hover:bg-purple-50 hover:border-purple-200 transition-all disabled:opacity-50"
                        >
                            {testLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-200 border-t-purple-600"></div>
                            ) : (
                                "Enviar Prueba"
                            )}
                        </button>

                        {/* Status Feedback */}
                        {message && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}
                            >
                                {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                                {message.text}
                            </motion.div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Technical Context Card */}
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex items-start gap-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                    <Info size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-blue-900 text-sm">¿Cómo funciona el envío?</h4>
                    <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                        El sistema utiliza <strong>EmailJS</strong> para enviar los correos sin necesidad de un servidor dedicado. 
                        Cuando un cliente termina su pago, el navegador envía la señal a EmailJS, quien se encarga de entregar 
                        el mensaje a los destinatarios configurados arriba. Las plantillas incluyen el resumen completo de items, 
                        fechas, cupones y montos.
                    </p>
                </div>
            </div>
        </div>
    );
}
