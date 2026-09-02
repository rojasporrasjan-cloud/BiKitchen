import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import SEOHead, { SEO_CONFIG, getBreadcrumbSchema } from '../components/SEOHead';
import { 
    Gift, Heart, Send, CreditCard, Check, Copy, 
    ArrowRight, Sparkles, MessageSquare, Mail, Calendar, AlertCircle, RefreshCw,
    Wallet, Smartphone, Building
} from 'lucide-react';
import { createCoupon } from '../utils/firestoreCoupons';
import { useAuth } from '../context/AuthContext';
import { useWhatsApp } from '../hooks/useWhatsApp';

const GIFT_CARD_AMOUNTS = [
    { value: 15000, label: '₡15,000', popular: false, meals: '~3 comidas' },
    { value: 25000, label: '₡25,000', popular: false, meals: '~5 comidas' },
    { value: 45000, label: '₡45,000', popular: true, meals: '~10 Almuerzos y Cenas' },
    { value: 65000, label: '₡65,000', popular: false, meals: '~15 comidas' },
    { value: 100000, label: '₡100,000', popular: false, meals: '~22 comidas' }
];

const OCCASIONS = [
    { id: 'birthday', label: 'Cumpleaños', emoji: '🎂' },
    { id: 'thanks', label: 'Agradecimiento', emoji: '🙏' },
    { id: 'love', label: 'Con Cariño', emoji: '❤️' },
    { id: 'congrats', label: 'Felicitaciones', emoji: '🎉' },
    { id: 'christmas', label: 'Navidad', emoji: '🎄' },
    { id: 'other', label: 'Otro', emoji: '🎁' }
];

export default function GiftCardsPage() {
    const { currentUser } = useAuth();
    const { getWhatsAppUrl } = useWhatsApp();
    const [step, setStep] = useState(1);
    const [selectedAmount, setSelectedAmount] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [occasion, setOccasion] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [senderName, setSenderName] = useState('');
    const [message, setMessage] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [giftCardCode, setGiftCardCode] = useState('');
    const [finalCardValue, setFinalCardValue] = useState(0);
    const [copied, setCopied] = useState(false);

    const currentAmount = selectedAmount || (customAmount ? parseInt(customAmount) : 0);

    const generateGiftCard = async () => {
        try {
            const amountToSave = currentAmount;
            // Generar código único
            const code = `GIFT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            
            // Guardar en Firestore como cupón inactivo
            await createCoupon({
                code: code,
                type: 'fixed',
                value: amountToSave,
                description: `Gift Card de ${senderName} para ${recipientName} (${occasion})`,
                active: false, // Inactivo hasta que se confirme el pago
                isGiftCard: true,
                paymentStatus: 'pending',
                paymentMethod: paymentMethod,
                recipientName,
                recipientEmail,
                recipientPhone,
                senderName,
                occasion,
                personalMessage: message,
                deliveryDate: deliveryDate || new Date().toISOString(),
                generatedBy: currentUser?.uid || null
            });

            setFinalCardValue(amountToSave);
            setGiftCardCode(code);
            setStep(5);

            // Intentar abrir WhatsApp automáticamente justo después de generar
            contactToPay(code, amountToSave, paymentMethod, senderName, recipientName);
        } catch (error) {
            console.error('Error generating gift card:', error);
            alert('Hubo un error al generar la tarjeta de regalo. Por favor intenta de nuevo.');
        }
    };

    const copyCode = () => {
        navigator.clipboard.writeText(giftCardCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const sendWhatsApp = () => {
        const msg = `✨ *¡UN REGALO ESPECIAL PARA TI!* ✨%0A%0A¡Hola *${recipientName}*! 👋%0A%0A*${senderName}* te ha enviado una *Tarjeta de Regalo BiKitchen* de ₡${finalCardValue.toLocaleString('es-CR')} para que disfrutes de comida saludable, deliciosa y balanceada directamente en tu puerta. 🥗🍱%0A%0A${message ? `💬 *Mensaje de ${senderName}:*%0A_"${message}"_%0A%0A` : ''}🎫 *TU CÓDIGO DE CANJE:*%0A\`${giftCardCode}\`%0A%0A---%0A💡 *¿CÓMO USAR TU REGALO?*%0A1️⃣ Entra a *bikitchenfood.com*%0A2️⃣ Elige tus platos o packs favoritos.%0A3️⃣ Al pagar, ingresa tu código en la casilla de cupones.%0A%0A¡Esperamos que lo disfrutes muchísimo! ✨🥑`;
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    };

    const contactToPay = (code = giftCardCode, value = finalCardValue, method = paymentMethod, sender = senderName, recipient = recipientName) => {
        const msg = `✨ *SOLICITUD DE GIFT CARD - BIKITCHEN* ✨%0A%0A¡Hola BiKitchen! 👋 Quiero coordinar el pago de mi nueva Tarjeta de Regalo.%0A%0A📋 *DETALLES DEL PEDIDO:*%0A🔹 *Código:* \`${code}\`%0A🔹 *Monto:* ₡${value.toLocaleString('es-CR')}%0A🔹 *Método preferido:* ${method === 'sinpe' ? '📱 SINPE Móvil' : '🏦 Transferencia'}%0A%0A👤 *DE:* ${sender}%0A🎁 *PARA:* ${recipient}%0A%0A¿Me podrían indicar los pasos para completar el pago y activarla? ¡Gracias! 🥗`;
        window.open(getWhatsAppUrl(msg), '_blank');
    };

    return (
        <PageTransition>
            <SEOHead
                {...SEO_CONFIG.giftCards}
                structuredData={getBreadcrumbSchema([{ name: 'Gift Cards', url: 'https://www.bikitchencr.com/gift-cards' }])}
            />
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero */}
                <section className="relative pt-32 pb-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl" aria-hidden="true"></div>
                    <div className="absolute bottom-0 left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" aria-hidden="true"></div>
                    
                    <div className="container relative z-10">
                        <div className="max-w-3xl mx-auto text-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl"
                            >
                                <Gift size={40} className="text-white" />
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
                            >
                                Tarjetas de Regalo
                            </motion.h1>
                            
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg text-gray-600"
                            >
                                El regalo perfecto: comida saludable para alguien especial
                            </motion.p>
                        </div>
                    </div>
                </section>

                {/* Progress Steps */}
                <section className="py-6">
                    <div className="container">
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-center justify-between">
                                {[
                                    { num: 1, label: 'Monto' },
                                    { num: 2, label: 'Mensaje' },
                                    { num: 3, label: 'Destino' },
                                    { num: 4, label: 'Pago' },
                                    { num: 5, label: 'Listo' }
                                ].map((s, index) => (
                                    <div key={s.num} className="flex items-center">
                                        <div className={`flex flex-col items-center ${index > 0 ? 'ml-4' : ''}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                                                step >= s.num 
                                                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white' 
                                                    : 'bg-gray-200 text-gray-500'
                                            }`}>
                                                {step > s.num ? <Check size={20} /> : s.num}
                                            </div>
                                            <span className={`text-xs mt-1 ${step >= s.num ? 'text-purple-600' : 'text-gray-400'}`}>
                                                {s.label}
                                            </span>
                                        </div>
                                        {index < 4 && (
                                            <div className={`w-12 md:w-20 h-1 mx-2 rounded ${
                                                step > s.num ? 'bg-gradient-to-r from-pink-500 to-purple-500' : 'bg-gray-200'
                                            }`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Content */}
                <section className="py-8">
                    <div className="container">
                        <div className="max-w-2xl mx-auto">
                            {/* Step 1: Amount */}
                            {step === 1 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
                                >
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        Elige el monto
                                    </h2>

                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                                        {GIFT_CARD_AMOUNTS.map((amount) => (
                                            <button
                                                key={amount.value}
                                                onClick={() => {
                                                    setSelectedAmount(amount.value);
                                                    setCustomAmount('');
                                                }}
                                                className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                                                    selectedAmount === amount.value
                                                        ? 'border-purple-500 bg-purple-50'
                                                        : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                            >
                                                {amount.popular && (
                                                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                                                        Popular
                                                    </span>
                                                )}
                                                <p className={`text-xl font-bold ${
                                                    selectedAmount === amount.value 
                                                        ? 'text-purple-600' 
                                                        : 'text-gray-900'
                                                }`}>
                                                    {amount.label}
                                                </p>
                                                <p className="text-xs text-gray-500">{amount.meals}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            O ingresa un monto personalizado
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₡</span>
                                            <input
                                                type="number"
                                                value={customAmount}
                                                onChange={(e) => {
                                                    setCustomAmount(e.target.value);
                                                    setSelectedAmount(null);
                                                }}
                                                placeholder="10,000"
                                                min="10000"
                                                className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">Mínimo ₡10,000</p>
                                    </div>

                                    <button
                                        onClick={() => setStep(2)}
                                        disabled={!currentAmount || currentAmount < 10000}
                                        className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        Continuar
                                        <ArrowRight size={20} />
                                    </button>
                                </motion.div>
                            )}

                            {/* Step 2: Personalize */}
                            {step === 2 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
                                >
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        Personaliza tu regalo
                                    </h2>

                                    {/* Occasion */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ocasión
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {OCCASIONS.map((occ) => (
                                                <button
                                                    key={occ.id}
                                                    onClick={() => setOccasion(occ.id)}
                                                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                                                        occasion === occ.id
                                                            ? 'border-purple-500 bg-purple-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                                >
                                                    <span className="text-2xl">{occ.emoji}</span>
                                                    <p className="text-xs mt-1 text-gray-600">{occ.label}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Recipient */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre del destinatario *
                                        </label>
                                        <input
                                            type="text"
                                            value={recipientName}
                                            onChange={(e) => setRecipientName(e.target.value)}
                                            placeholder="¿Para quién es?"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        />
                                    </div>

                                    {/* Sender */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tu nombre *
                                        </label>
                                        <input
                                            type="text"
                                            value={senderName}
                                            onChange={(e) => setSenderName(e.target.value)}
                                            placeholder="¿De parte de quién?"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        />
                                    </div>

                                    {/* Message */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Mensaje personalizado (opcional)
                                        </label>
                                        <textarea
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Escribe un mensaje especial..."
                                            rows={3}
                                            maxLength={200}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        />
                                        <p className="text-xs text-gray-500 text-right">{message.length}/200</p>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep(1)}
                                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                        >
                                            Atrás
                                        </button>
                                        <button
                                            onClick={() => setStep(3)}
                                            disabled={!recipientName || !senderName}
                                            className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            Continuar
                                            <ArrowRight size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 3: Delivery */}
                            {step === 3 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
                                >
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                                        ¿Cómo quieres enviarlo?
                                    </h2>

                                    {/* Preview Card */}
                                    <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <Gift size={32} />
                                            <span className="text-sm opacity-80">BiKitchen Gift Card</span>
                                        </div>
                                        <p className="text-3xl font-bold mb-2">₡{currentAmount.toLocaleString('es-CR')}</p>
                                        <p className="text-sm opacity-80">Para: {recipientName}</p>
                                        <p className="text-sm opacity-80">De: {senderName}</p>
                                        {occasion && (
                                            <p className="mt-2">
                                                {OCCASIONS.find(o => o.id === occasion)?.emoji} {OCCASIONS.find(o => o.id === occasion)?.label}
                                            </p>
                                        )}
                                    </div>

                                    {/* Email & Phone */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Email del destinatario *
                                            </label>
                                            <input
                                                type="email"
                                                value={recipientEmail}
                                                onChange={(e) => setRecipientEmail(e.target.value)}
                                                placeholder="correo@ejemplo.com"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                WhatsApp del destinatario *
                                            </label>
                                            <input
                                                type="tel"
                                                value={recipientPhone}
                                                onChange={(e) => setRecipientPhone(e.target.value)}
                                                placeholder="8888-8888"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                            />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-400 mb-6 italic">
                                        * Al menos uno de los dos es obligatorio para poder enviar el regalo.
                                    </p>

                                    {/* Delivery Date */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            <Calendar size={16} className="inline mr-1" />
                                            Fecha de envío
                                        </label>
                                        <input
                                            type="date"
                                            value={deliveryDate}
                                            onChange={(e) => setDeliveryDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Deja vacío para enviar ahora</p>
                                    </div>

                                    {/* Summary */}
                                    <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-gray-600">Tarjeta de Regalo</span>
                                            <span className="font-medium">₡{currentAmount.toLocaleString('es-CR')}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                                            <span>Total a pagar</span>
                                            <span className="text-purple-600">₡{currentAmount.toLocaleString('es-CR')}</span>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep(2)}
                                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                        >
                                            Atrás
                                        </button>
                                        <button
                                            onClick={() => setStep(4)}
                                            disabled={!recipientEmail && !recipientPhone}
                                            className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            <CreditCard size={18} />
                                            Continuar al Pago
                                        </button>
                                    </div>

                                    <p className="text-xs text-gray-500 text-center mt-4">
                                        Al continuar, te contactaremos por WhatsApp para coordinar el pago
                                    </p>
                                </motion.div>
                            )}

                            {/* Step 4: Payment Method */}
                            {step === 4 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-2xl shadow-xl p-6 md:p-8"
                                >
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                        <Wallet size={24} className="text-purple-500" />
                                        Método de Pago
                                    </h2>

                                    <div className="space-y-4 mb-8">
                                        <button
                                            onClick={() => setPaymentMethod('sinpe')}
                                            className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                                                paymentMethod === 'sinpe'
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                                    <Smartphone size={24} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-gray-900">SINPE Móvil</p>
                                                    <p className="text-xs text-gray-500">Pago inmediato desde tu celular</p>
                                                </div>
                                            </div>
                                            {paymentMethod === 'sinpe' && <Check size={20} className="text-purple-600" />}
                                        </button>

                                        <button
                                            onClick={() => setPaymentMethod('transferencia')}
                                            className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                                                paymentMethod === 'transferencia'
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                                    <Building size={24} />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-gray-900">Transferencia Bancaria</p>
                                                    <p className="text-xs text-gray-500">Manual (requiere comprobante)</p>
                                                </div>
                                            </div>
                                            {paymentMethod === 'transferencia' && <Check size={20} className="text-purple-600" />}
                                        </button>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setStep(3)}
                                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                        >
                                            Atrás
                                        </button>
                                        <button
                                            onClick={generateGiftCard}
                                            disabled={!paymentMethod}
                                            className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-100"
                                        >
                                            <MessageSquare size={18} />
                                            Confirmar y Pagar
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* Step 5: Complete */}
                            {step === 5 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-3xl shadow-2xl p-6 md:p-10 text-center relative overflow-hidden"
                                >
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-100 rounded-full blur-3xl opacity-50" aria-hidden="true"></div>
                                    <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-100 rounded-full blur-3xl opacity-50" aria-hidden="true"></div>

                                    <div className="relative z-10 font-sans">
                                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner relative">
                                            <Check size={44} className="text-green-500" />
                                            <motion.div 
                                                animate={{ scale: [1, 1.2, 1] }}
                                                transition={{ repeat: Infinity, duration: 2 }}
                                                className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"
                                            />
                                        </div>

                                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                                            ¡Tarjeta Generada! 🎊
                                        </h2>
                                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                                            El código de regalo ha sido creado exitosamente. Solo falta un paso para activarlo.
                                        </p>

                                        {/* Gift Card Design */}
                                        <div className="relative mb-10 group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                                            <div className="relative bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-2xl overflow-hidden border border-white/10">
                                                {/* Card Texture */}
                                                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', size: '20px 20px' }}></div>
                                                
                                                <div className="flex justify-between items-start mb-8 text-left">
                                                    <div>
                                                        <Gift size={32} className="mb-2" />
                                                        <h3 className="text-xl font-bold">BiKitchen Gift Card</h3>
                                                    </div>
                                                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
                                                        {occasion || 'Regalo Especial'}
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div>
                                                        <p className="text-xs opacity-70 uppercase tracking-widest font-bold mb-1">Para:</p>
                                                        <p className="text-2xl font-bold truncate">{recipientName}</p>
                                                    </div>

                                                    <div className="flex items-end justify-between gap-4">
                                                        <div className="flex-1 bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-4">
                                                            <p className="text-[10px] opacity-70 uppercase tracking-widest font-bold mb-2">Tu Código Privado:</p>
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span className="text-xl font-mono font-black tracking-widest">
                                                                    {giftCardCode}
                                                                </span>
                                                                <button
                                                                    onClick={copyCode}
                                                                    className={`p-2 rounded-xl transition-all ${
                                                                        copied ? 'bg-green-500' : 'bg-white/20 hover:bg-white/30 hover:scale-110 active:scale-95'
                                                                    }`}
                                                                >
                                                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="text-right pb-1">
                                                            <p className="text-xs opacity-70 font-bold mb-1">Valor:</p>
                                                            <p className="text-4xl font-black italic">₡{finalCardValue.toLocaleString('es-CR')}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Steps to activate */}
                                        <div className="bg-indigo-50 rounded-2xl p-6 mb-8 border border-indigo-100 text-left">
                                            <h4 className="font-bold text-indigo-900 text-sm mb-4 uppercase tracking-widest flex items-center gap-2">
                                                <RefreshCw size={16} className="animate-spin-slow" />
                                                Próximos pasos para activar:
                                            </h4>
                                            <div className="space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
                                                    <p className="text-sm text-indigo-900 font-medium">Comparte el código con tu amigo usando los botones de abajo.</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
                                                    <p className="text-sm text-indigo-900 font-medium">Contáctanos por WhatsApp para coordinar el pago (Sinpe o transferencia).</p>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="w-6 h-6 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
                                                    <p className="text-sm text-indigo-900 font-medium">Una vez confirmado el pago, activaremos tu código para que pueda ser usado.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Share Options */}
                                        <div className="space-y-4 mb-8">
                                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 mb-6">
                                                <p className="text-sm text-orange-800 font-bold mb-3 flex items-center gap-2">
                                                    <Smartphone size={18} />
                                                    Paso 1: Coordina el pago
                                                </p>
                                                <button
                                                    onClick={contactToPay}
                                                    className="w-full py-4 bg-bikitchen-orange text-white rounded-xl font-black hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-100"
                                                >
                                                    <MessageSquare size={24} />
                                                    Contactar para Pagar
                                                </button>
                                            </div>

                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Paso 2: ¡Envía tu regalo!</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <button
                                                    onClick={sendWhatsApp}
                                                    className="py-5 bg-[#25D366]/10 text-[#25D366] border-2 border-[#25D366]/20 rounded-[1.25rem] font-black hover:bg-[#25D366]/20 transition-all flex items-center justify-center gap-3 group active:scale-95"
                                                >
                                                    <MessageSquare size={24} className="group-hover:rotate-12 transition-transform" />
                                                    <span className="text-lg">Enviar WhatsApp</span>
                                                </button>
                                                {recipientEmail && (
                                                    <button
                                                        onClick={() => {
                                                            const subject = `🎁 ¡Hola ${recipientName}! ${senderName} te envió un regalo delicioso 🥗`;
                                                            const body = `¡Hola ${recipientName}!\n\n${senderName} te ha enviado una Tarjeta de Regalo BiKitchen por ₡${finalCardValue.toLocaleString('es-CR')} para que disfrutes de comida saludable directamente en tu puerta.\n\n${message ? `Tu amigo dice: "${message}"\n\n` : ''}✨ Tu Código de Canje: ${giftCardCode}\n\n¿Cómo usarla?\n1. Entra a bikitchenfood.com\n2. Escoge tus platos favoritos.\n3. Al pagar, ingresa el código en la casilla de cupones.\n\n¡Esperamos que te encante!\n\nAtentamente,\nEl Equipo de BiKitchen Food`;
                                                            window.open(`mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                                                        }}
                                                        className="py-5 bg-gray-100 text-gray-700 rounded-[1.25rem] font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                                                    >
                                                        <Mail size={24} />
                                                        <span className="text-lg">Enviar por Correo</span>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-400 italic">
                                                * Nota: El código solo será válido una vez que el pago sea confirmado por BiKitchen.
                                            </p>
                                        </div>

                                        <Link
                                            to="/"
                                            className="inline-flex items-center gap-2 text-purple-600 font-bold hover:text-purple-700 group transition-all"
                                        >
                                            <ArrowRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
                                            Volver al inicio
                                        </Link>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Info Section */}
                {step === 1 && (
                    <section className="py-12">
                        <div className="container">
                            <div className="max-w-4xl mx-auto">
                                <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                                    ¿Por qué regalar BiKitchen?
                                </h3>
                                <div className="grid md:grid-cols-3 gap-6">
                                    <div className="text-center">
                                        <div className="w-14 h-14 bg-pink-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <Heart size={28} className="text-pink-500" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Regalo con Amor</h4>
                                        <p className="text-sm text-gray-600">
                                            Demuestra que te importa su bienestar regalando comida saludable
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <Sparkles size={28} className="text-purple-500" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Fácil de Usar</h4>
                                        <p className="text-sm text-gray-600">
                                            El destinatario solo ingresa el código al hacer su pedido
                                        </p>
                                    </div>
                                    <div className="text-center">
                                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <Send size={28} className="text-blue-500" />
                                        </div>
                                        <h4 className="font-semibold text-gray-900 mb-2">Envío Instantáneo</h4>
                                        <p className="text-sm text-gray-600">
                                            Envía por WhatsApp o email al instante o programa la fecha
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                <Footer />
            </div>
        </PageTransition>
    );
}
