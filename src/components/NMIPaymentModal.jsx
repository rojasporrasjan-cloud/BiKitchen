import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Shield, Loader2, AlertCircle, CheckCircle, Lock as LucideLock, ChevronDown, ChevronUp } from 'lucide-react';
import { initGateway, authenticate3DS, processTransaction, unmount3DS } from '../utils/nmiClient';

// Helper to detect card type
const getCardType = (number) => {
    const re = {
        visa: /^4/,
        mastercard: /^5[1-5]/,
        amex: /^3[47]/,
        discover: /^6(?:011|5)/
    };
    for (const key in re) {
        if (re[key].test(number)) return key;
    }
    return 'generic';
};

const CardIcon = ({ type, className = "h-6 w-auto" }) => {
    const icons = {
        visa: "https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/visa.svg",
        mastercard: "https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/mastercard.svg",
        amex: "https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/amex.svg",
        discover: "https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/discover.svg",
        generic: null
    };

    if (!icons[type]) return <CreditCard className="text-gray-400" size={20} />;
    return <img src={icons[type]} alt={type} className={className} />;
};

/* BIKITCHEN_NMI_BUILD_20260328 */ export default function NMIPaymentModal({ isOpen, onClose, total, orderId, customerInfo, onPaymentSuccess }) {
    const [step, setStep] = useState('card'); // 'card', '3ds', 'processing', 'success', 'error'
    const [loading, setLoading] = useState(false);
    const [gateway, setGateway] = useState(null);
    const [error, setError] = useState(null);
    const [showBilling, setShowBilling] = useState(false);
    const [saveCard, setSaveCard] = useState(false);
    
    const [cardData, setCardData] = useState({
        number: '',
        exp: '',
        cvv: '',
        name: customerInfo?.nombre || '',
        zip: '',
        address: customerInfo?.direccion || '',
        city: customerInfo?.city || '',
    });

    const cardType = getCardType(cardData.number.replace(/\s/g, ''));

    useEffect(() => {
        if (isOpen) {
            initGateway()
                .then(setGateway)
                .catch(err => {
                    console.error('[NMI] Error initializing gateway:', err);
                    setError('No se pudo inicializar la plataforma de pago de forma segura.');
                });
        } else {
            // Modal is closing: unmount any active 3DS UI and reset state
            unmount3DS();
            setStep('card');
            setError(null);
            setLoading(false);
            setShowBilling(false);
            setCardData({
                number: '',
                exp: '',
                cvv: '',
                name: customerInfo?.nombre || '',
                zip: '',
                address: customerInfo?.direccion || '',
                city: customerInfo?.city || '',
            });
        }

        // Cleanup for real unmount
        return () => {
            unmount3DS();
        };
    }, [isOpen, customerInfo]);

    const handleCardChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (type === 'checkbox') {
            if (name === 'saveCard') setSaveCard(checked);
            return;
        }

        if (name === 'number') {
            const val = value.replace(/\s/g, '').replace(/\D/g, '');
            const formatted = val.match(/.{1,4}/g)?.join(' ') || '';
            setCardData(prev => ({ ...prev, [name]: formatted.slice(0, 19) }));
        } 
        else if (name === 'exp') {
            const val = value.replace(/\//g, '').replace(/\D/g, '');
            let formatted = val;
            if (val.length > 2) {
                formatted = val.slice(0, 2) + '/' + val.slice(2, 4);
            }
            setCardData(prev => ({ ...prev, [name]: formatted.slice(0, 5) }));
        }
        else if (name === 'cvv') {
            const val = value.replace(/\D/g, '');
            setCardData(prev => ({ ...prev, [name]: val.slice(0, 4) }));
        }
        else {
            setCardData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmitCard = async (e) => {
        e.preventDefault();
        if (!gateway) return;

        setLoading(true);
        setError(null);

        try {
            const nameParts = cardData.name.trim().split(' ');
            const firstName = nameParts[0] || 'Cliente';
            const lastName = nameParts.slice(1).join(' ') || 'BiKitchen';
            const [expMonth, expYear] = cardData.exp.split('/');

            const paymentInfo = {
                amount: total.toFixed(2),
                currency: 'CRC',
                cardNumber: cardData.number.replace(/\s/g, ''),
                cardExpMonth: expMonth,
                cardExpYear: '20' + expYear,
                firstName,
                lastName,
                email: customerInfo?.correo || 'cliente@test.com',
                address1: cardData.address || customerInfo?.direccion || 'San Jose',
                city: cardData.city || customerInfo?.city || 'San Jose',
                state: customerInfo?.state || 'SJ',
                zip: cardData.zip || '10101', // Keep for processTransaction later
                country: 'CR',
                orderid: orderId // Keep for processTransaction later
            };

            // Only recognized options for 3DS UI
            const authOptions = {
                ...paymentInfo,
                postalCode: paymentInfo.zip // Rename for 3DS
            };
            delete authOptions.zip;
            delete authOptions.orderid;

            setStep('3ds');
            
            // Start 3DS Authentication
            const authData = await authenticate3DS(gateway, authOptions);
            
            // Finalize Transaction
            setStep('processing');
            // Log ALL fields returned by Gateway.js 3DS for debugging
            console.log('[NMI] Datos de autenticación recibidos (COMPLETO):', JSON.stringify(authData));
            
            const result = await processTransaction({
                ...paymentInfo,
                ...authData,
                ccnumber: paymentInfo.cardNumber,
                ccexp: expMonth + expYear,
                cvv: cardData.cvv,
                // Pass directoryServerId for 3DS 2.0 (exact field name from Gateway.js confirmed via logs)
                directory_server_id: authData.directoryServerId || authData.directory_server_id || authData.dsTransactionId || '',
            });

            // Log the FULL NMI result for debugging
            console.log('[NMI] Result completo:', JSON.stringify(result));

            // --- Ground truth: authcode ---
            // BAC/NMI can return response=2 "Authentication Failed" on the 3DS post-validation
            // step AFTER the bank already authorized and charged the card.
            // If authcode is non-empty, the bank approved the charge — it went through.
            const bankApprovedByAuthcode = !!(result.authcode && result.authcode.trim() && result.authcode !== '');

            const isApproved = result.response === '1';
            const isDuplicate = (result.response === '2' || result.response === '3') &&
                                (result.responsetext?.toLowerCase().includes('duplicate') ||
                                 result.message?.toLowerCase().includes('duplicate'));
            // Auth Failed special case: NMI says declined but bank already charged (authcode present)
            const isAuthFailedButCharged = !isApproved && bankApprovedByAuthcode;

            if (isApproved || isDuplicate || isAuthFailedButCharged) {
                if (isDuplicate) {
                    console.log('[NMI] Transacción duplicada — el pago ya fue procesado previamente.');
                }
                if (isAuthFailedButCharged) {
                    console.log('[NMI] ⚠️ NMI reportó error pero authcode presente:', result.authcode, '— el banco SÃ cobró. Tratando como ÉXITO.');
                }

                setStep('success');
                if (saveCard) {
                    console.log('[NMI] User wants to save card preference');
                }

                const finalResult = {
                    ...result,
                    status: 'success',
                    isDuplicate: isDuplicate,
                    wasAuthFailedButCharged: isAuthFailedButCharged,
                    transactionid: result.transactionid || (isDuplicate ? 'DUPLICATE' : '')
                };

                setTimeout(() => onPaymentSuccess(finalResult), 2000);
            } else {
                // If it's a timeout error from our internal proxy check
                if (result.responsetext === 'TIMEOUT_LIMIT_REACHED') {
                    throw new Error(result.message || 'La conexión tardó demasiado.');
                }
                throw new Error(result.responsetext || 'La transacción fue declinada por el banco.');
            }
        } catch (err) {
            console.error('[NMI] Payment Error:', err);
            
            const errorMessage = err.message || '';
            
            if (errorMessage.includes('TIMEOUT') || errorMessage.includes('502') || errorMessage.includes('504')) {
                setError(
                    "⚠️ EL SERVIDOR TARDÓ DEMASIADO EN RESPONDER.\n\n" +
                    "Es posible que el pago se haya realizado con éxito pero la confirmación no llegó a tiempo.\n\n" +
                    "POR FAVOR: Revisa tu banca en línea o correo electrónico antes de reintentar para evitar un cobro doble."
                );
            } else if (errorMessage.includes('3DS') || errorMessage.includes('Inicialización')) {
                setError(`${errorMessage}\n\nNota: Parece haber un problema con la llave pública o la configuración 3DS.`);
            } else {
                setError(errorMessage || 'Ocurrió un error al procesar el pago.');
            }
            setStep('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={step !== 'processing' ? onClose : undefined}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 30 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 30 }}
                        className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                        {/* Header Section */}
                        <div className="p-8 pb-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shadow-inner">
                                    <Shield size={24} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Caja de Pago</h3>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 uppercase tracking-widest mt-0.5">
                                        <LucideLock size={12} strokeWidth={3} />
                                        <span>Seguro & Cifrado</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-2xl transition-all text-gray-400">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrolling Content */}
                        <div className="flex-1 overflow-y-auto p-8 pt-2 custom-scrollbar">
                            {step === 'card' && (
                                <form onSubmit={handleSubmitCard} className="space-y-6">
                                    {/* Virtual Card Preview */}
                                    <motion.div 
                                        layout
                                        className={`relative w-full aspect-[1.6/1] rounded-[1.5rem] p-6 text-white overflow-hidden shadow-2xl transition-all duration-500 ${
                                            cardType === 'visa' ? 'bg-gradient-to-br from-blue-600 to-indigo-800' :
                                            cardType === 'mastercard' ? 'bg-gradient-to-br from-red-600 to-orange-700' :
                                            cardType === 'amex' ? 'bg-gradient-to-br from-teal-500 to-emerald-700' :
                                            'bg-gradient-to-br from-gray-800 to-black'
                                        }`}
                                    >
                                        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
                                        <div className="relative h-full flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <div className="w-12 h-10 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md opacity-80" />
                                                <CardIcon type={cardType} className="h-8 w-auto filter brightness-0 invert" />
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <p className="text-2xl font-mono tracking-[0.2em]">
                                                    {cardData.number || '•••• •••• •••• ••••'}
                                                </p>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Titular</p>
                                                        <p className="font-bold tracking-tight truncate max-w-[180px]">
                                                            {cardData.name || 'NOMBRE COMPLETO'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1">Expira</p>
                                                        <p className="font-bold">{cardData.exp || 'MM/YY'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>

                                    {/* Form Fields */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Información de Pago</span>
                                            <span className="text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-lg">Total: ₡{total.toLocaleString('es-CR')}</span>
                                        </div>

                                        <div className="grid gap-4">
                                            <div className="relative group">
                                                <input
                                                    required name="name" value={cardData.name} onChange={handleCardChange}
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800"
                                                    placeholder="Nombre del Titular"
                                                />
                                            </div>

                                            <div className="relative group">
                                                <input
                                                    required name="number" value={cardData.number} onChange={handleCardChange}
                                                    inputMode="numeric"
                                                    autoComplete="cc-number"
                                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 tracking-widest"
                                                    placeholder="0000 0000 0000 0000"
                                                />
                                                <div className="absolute right-5 top-1/2 -translate-y-1/2">
                                                    <CardIcon type={cardType} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative group">
                                                    <input
                                                        required name="exp" value={cardData.exp} onChange={handleCardChange}
                                                        inputMode="numeric"
                                                        autoComplete="cc-exp"
                                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 text-center"
                                                        placeholder="MM/YY"
                                                    />
                                                </div>
                                                <div className="relative group">
                                                    <input
                                                        required 
                                                        name="cvv" 
                                                        type="tel" 
                                                        value={cardData.cvv} 
                                                        onChange={handleCardChange}
                                                        inputMode="numeric"
                                                        autoComplete="cc-csc"
                                                        maxLength={4}
                                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 text-center"
                                                        placeholder="CVV"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Save Card Toggle */}
                                        <div className="flex items-center justify-between py-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                                    <CheckCircle size={20} />
                                                </div>
                                                <label className="text-sm font-bold text-gray-700 cursor-pointer" htmlFor="save-card">Recordar esta tarjeta</label>
                                            </div>
                                            <input 
                                                id="save-card" type="checkbox" name="saveCard" checked={saveCard} onChange={handleCardChange}
                                                className="w-6 h-6 rounded-lg border-2 border-gray-200 text-orange-600 focus:ring-orange-500"
                                            />
                                        </div>

                                        {/* More Details / Billing Section */}
                                        <div className="pt-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setShowBilling(!showBilling)}
                                                className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-[0.2em] hover:text-orange-600 transition-colors"
                                            >
                                                {showBilling ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                Dirección de Facturación
                                            </button>

                                            <AnimatePresence>
                                                {showBilling && (
                                                    <motion.div 
                                                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden space-y-4 pt-4"
                                                    >
                                                        <input
                                                            name="address" value={cardData.address} onChange={handleCardChange}
                                                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800"
                                                            placeholder="Dirección"
                                                        />
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <input
                                                                name="city" value={cardData.city} onChange={handleCardChange}
                                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800"
                                                                placeholder="Ciudad"
                                                            />
                                                            <input
                                                                name="zip" value={cardData.zip} onChange={handleCardChange}
                                                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800"
                                                                placeholder="ZIP / CP"
                                                            />
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        type="submit"
                                        disabled={loading || !gateway}
                                        className="w-full py-5 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-[1.25rem] font-black text-lg shadow-xl shadow-orange-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                                    >
                                        {loading ? <Loader2 className="animate-spin" size={24} /> : (
                                            <>
                                                <Shield size={20} />
                                                PROCEDER AL PAGO
                                            </>
                                        )}
                                    </button>
                                </form>
                            )}

                            {/* Verification Steps Remain mostly same but improved UI */}
                            {step === '3ds' && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <motion.div 
                                        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-8 animate-pulse"
                                    >
                                        <Shield size={48} />
                                    </motion.div>
                                    <h4 className="text-2xl font-black text-gray-900 mb-2 text-center tracking-tight">Verificación de Seguridad</h4>
                                    <p className="text-base text-gray-500 text-center mb-10 px-4">Completa la validación 3D Secure en la ventana interactiva inferior para proteger tu compra.</p>
                                    
                                    <div id="three-ds-container" className="w-full border-4 border-dashed border-gray-100 rounded-[2rem] min-h-[450px] bg-gray-50 flex items-center justify-center relative overflow-auto">
                                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 pointer-events-none">
                                            <Loader2 size={40} className="animate-spin text-gray-400 mb-2" />
                                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Cargando Plataforma...</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 'processing' && (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <Loader2 size={64} className="text-orange-600 animate-spin mb-6" />
                                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">Finalizando Transacción</h4>
                                    <p className="text-gray-500 mt-2 text-center">Estamos procesando tu pago de forma segura con el banco.</p>
                                </div>
                            )}

                            {step === 'success' && (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <motion.div 
                                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                                        className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-6 shadow-xl shadow-green-100"
                                    >
                                        <CheckCircle size={48} />
                                    </motion.div>
                                    <h4 className="text-3xl font-black text-gray-900 tracking-tight">¡Pago Confirmado!</h4>
                                    <p className="text-gray-500 mt-3 max-w-[280px]">Tu pedido se ha procesado con éxito. Redirigiendo...</p>
                                </div>
                            )}

                            {step === 'error' && (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <motion.div 
                                        initial={{ y: 20 }} animate={{ y: 0 }}
                                        className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-6"
                                    >
                                        <AlertCircle size={48} />
                                    </motion.div>
                                    <h4 className="text-2xl font-black text-gray-900 tracking-tight">Transacción Fallida</h4>
                                    <div className="mt-4 px-6 py-4 bg-red-50 text-red-700 rounded-2xl font-bold text-sm border border-red-100 mb-8 max-w-full overflow-hidden" style={{whiteSpace: 'pre-line'}}>
                                        {error}
                                    </div>
                                    <div className="space-y-4 w-full px-8">
                                        <button
                                            onClick={() => { unmount3DS(); setStep('card'); }}
                                            className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black hover:bg-orange-700 transition-all shadow-lg shadow-orange-100"
                                        >
                                            REINTENTAR PAGO
                                        </button>
                                        <button onClick={onClose} className="w-full text-sm font-bold text-gray-400 hover:text-gray-600 tracking-widest uppercase">
                                            Cancelar pago
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Trusted Footer */}
                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4 hidden" />
                            <div className="flex items-center gap-1.5 grayscale">
                                <Shield size={14} />
                                <span className="text-[10px] font-black tracking-widest uppercase">PCI-DSS Compliant</span>
                            </div>
                            <div className="h-3 w-[1px] bg-gray-300" />
                            <div className="flex items-center gap-1.5">
                                <LucideLock size={12} />
                                <span className="text-[10px] font-black tracking-widest uppercase">SSL secure</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
