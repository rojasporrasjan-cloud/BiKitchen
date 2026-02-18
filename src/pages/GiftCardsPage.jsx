import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PageTransition from '../components/PageTransition';
import { 
    Gift, Heart, Send, CreditCard, Check, Copy, 
    ArrowRight, Sparkles, MessageSquare, Mail, Calendar
} from 'lucide-react';

const GIFT_CARD_AMOUNTS = [
    { value: 15000, label: '₡15,000', popular: false, meals: '~3 comidas' },
    { value: 25000, label: '₡25,000', popular: false, meals: '~5 comidas' },
    { value: 45000, label: '₡45,000', popular: true, meals: '~10 comidas' },
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
    const [step, setStep] = useState(1);
    const [selectedAmount, setSelectedAmount] = useState(null);
    const [customAmount, setCustomAmount] = useState('');
    const [occasion, setOccasion] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [senderName, setSenderName] = useState('');
    const [message, setMessage] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [giftCardCode, setGiftCardCode] = useState('');
    const [copied, setCopied] = useState(false);

    const finalAmount = selectedAmount || (customAmount ? parseInt(customAmount) : 0);

    const generateGiftCard = () => {
        // Generar código único
        const code = `GIFT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        setGiftCardCode(code);
        setStep(4);
    };

    const copyCode = () => {
        navigator.clipboard.writeText(giftCardCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const sendWhatsApp = () => {
        const msg = `🎁 *Tarjeta de Regalo BiKitchen*%0A%0A¡Hola ${recipientName}!%0A%0A${senderName} te ha enviado una tarjeta de regalo de ₡${finalAmount.toLocaleString('es-CR')} para que disfrutes de comida saludable.%0A%0A${message ? `Mensaje: "${message}"%0A%0A` : ''}Tu código: *${giftCardCode}*%0A%0AÚsalo en bikitchenfood.com`;
        window.open(`https://wa.me/?text=${msg}`, '_blank');
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white">
                <Navbar />

                {/* Hero */}
                <section className="relative pt-32 pb-12 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-purple-500/10"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                    
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
                                    { num: 2, label: 'Personalizar' },
                                    { num: 3, label: 'Enviar' },
                                    { num: 4, label: 'Listo' }
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
                                        {index < 3 && (
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
                                        disabled={!finalAmount || finalAmount < 10000}
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
                                        <p className="text-3xl font-bold mb-2">₡{finalAmount.toLocaleString('es-CR')}</p>
                                        <p className="text-sm opacity-80">Para: {recipientName}</p>
                                        <p className="text-sm opacity-80">De: {senderName}</p>
                                        {occasion && (
                                            <p className="mt-2">
                                                {OCCASIONS.find(o => o.id === occasion)?.emoji} {OCCASIONS.find(o => o.id === occasion)?.label}
                                            </p>
                                        )}
                                    </div>

                                    {/* Email (optional) */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email del destinatario (opcional)
                                        </label>
                                        <input
                                            type="email"
                                            value={recipientEmail}
                                            onChange={(e) => setRecipientEmail(e.target.value)}
                                            placeholder="correo@ejemplo.com"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        />
                                    </div>

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
                                            <span className="font-medium">₡{finalAmount.toLocaleString('es-CR')}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                                            <span>Total a pagar</span>
                                            <span className="text-purple-600">₡{finalAmount.toLocaleString('es-CR')}</span>
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
                                            onClick={generateGiftCard}
                                            className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
                                        >
                                            <CreditCard size={18} />
                                            Comprar Tarjeta
                                        </button>
                                    </div>

                                    <p className="text-xs text-gray-500 text-center mt-4">
                                        Al continuar, te contactaremos por WhatsApp para coordinar el pago
                                    </p>
                                </motion.div>
                            )}

                            {/* Step 4: Complete */}
                            {step === 4 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white rounded-2xl shadow-xl p-6 md:p-8 text-center"
                                >
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <Check size={40} className="text-green-500" />
                                    </div>

                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        ¡Tarjeta Creada!
                                    </h2>
                                    <p className="text-gray-600 mb-6">
                                        Tu tarjeta de regalo está lista para enviar
                                    </p>

                                    {/* Gift Card Code */}
                                    <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
                                        <p className="text-sm opacity-80 mb-2">Código de la tarjeta:</p>
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="text-3xl font-mono font-bold tracking-wider">
                                                {giftCardCode}
                                            </span>
                                            <button
                                                onClick={copyCode}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    copied ? 'bg-green-500' : 'bg-white/20 hover:bg-white/30'
                                                }`}
                                            >
                                                {copied ? <Check size={20} /> : <Copy size={20} />}
                                            </button>
                                        </div>
                                        <p className="text-2xl font-bold mt-4">₡{finalAmount.toLocaleString('es-CR')}</p>
                                    </div>

                                    {/* Share Options */}
                                    <div className="space-y-3 mb-6">
                                        <button
                                            onClick={sendWhatsApp}
                                            className="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <MessageSquare size={20} />
                                            Enviar por WhatsApp
                                        </button>
                                        {recipientEmail && (
                                            <button
                                                onClick={() => {
                                                    const subject = `🎁 ${senderName} te envió una Tarjeta de Regalo BiKitchen`;
                                                    const body = `¡Hola ${recipientName}!\n\n${senderName} te ha enviado una tarjeta de regalo de ₡${finalAmount.toLocaleString('es-CR')} para BiKitchen.\n\n${message ? `Mensaje: "${message}"\n\n` : ''}Tu código: ${giftCardCode}\n\nÚsalo en bikitchenfood.com`;
                                                    window.open(`mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                                                }}
                                                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Mail size={20} />
                                                Enviar por Email
                                            </button>
                                        )}
                                    </div>

                                    <p className="text-sm text-gray-500 mb-6">
                                        Te contactaremos por WhatsApp para coordinar el pago de la tarjeta.
                                        Una vez confirmado, el código estará activo.
                                    </p>

                                    <Link
                                        to="/"
                                        className="text-purple-600 font-medium hover:underline"
                                    >
                                        Volver al inicio
                                    </Link>
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
