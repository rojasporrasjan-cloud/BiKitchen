/**
 * PayPalButton.jsx
 * 
 * Componente que renderiza los Smart Payment Buttons de PayPal.
 * Usa el SDK oficial de PayPal para procesar pagos.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Configuración de PayPal
const PAYPAL_CONFIG = {
    // TODO: Reemplazar con tu Client ID real de PayPal
    // Sandbox para pruebas, Live para producción
    clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb', // 'sb' es sandbox de prueba
    currency: 'USD',
    intent: 'capture'
};

// Tasa de cambio CRC → USD (actualizar según necesidad)
const EXCHANGE_RATE = 515;

export default function PayPalButton({ 
    totalCRC, 
    orderData,
    onSuccess, 
    onError,
    onCancel,
    disabled = false 
}) {
    const paypalRef = useRef(null);
    const [sdkReady, setSdkReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Convertir colones a USD
    const totalUSD = (totalCRC / EXCHANGE_RATE).toFixed(2);

    // Cargar el SDK de PayPal
    useEffect(() => {
        const loadPayPalScript = () => {
            // Si ya existe el script, no lo cargamos de nuevo
            if (window.paypal) {
                setSdkReady(true);
                setLoading(false);
                return;
            }

            // Verificar si ya hay un script cargándose
            const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
            if (existingScript) {
                existingScript.addEventListener('load', () => {
                    setSdkReady(true);
                    setLoading(false);
                });
                return;
            }

            // Crear y cargar el script
            const script = document.createElement('script');
            script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&currency=${PAYPAL_CONFIG.currency}&intent=${PAYPAL_CONFIG.intent}`;
            script.async = true;
            
            script.onload = () => {
                setSdkReady(true);
                setLoading(false);
            };
            
            script.onerror = () => {
                setError('Error al cargar PayPal. Por favor recarga la página.');
                setLoading(false);
            };

            document.body.appendChild(script);
        };

        loadPayPalScript();
    }, []);

    // Renderizar los botones de PayPal cuando el SDK esté listo
    useEffect(() => {
        if (!sdkReady || !window.paypal || !paypalRef.current) return;

        // Limpiar botones anteriores
        paypalRef.current.innerHTML = '';

        window.paypal.Buttons({
            // Estilo de los botones
            style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'paypal',
                height: 50
            },

            // Crear la orden en PayPal
            createOrder: (data, actions) => {
                return actions.order.create({
                    purchase_units: [{
                        description: `Pedido BiKitchen #${orderData.orderNumber}`,
                        amount: {
                            currency_code: PAYPAL_CONFIG.currency,
                            value: totalUSD
                        },
                        reference_id: orderData.orderNumber,
                        custom_id: JSON.stringify({
                            orderNumber: orderData.orderNumber,
                            totalCRC: totalCRC,
                            timestamp: Date.now()
                        })
                    }],
                    application_context: {
                        brand_name: 'BiKitchen Food',
                        shipping_preference: 'NO_SHIPPING'
                    }
                });
            },

            // Cuando el usuario aprueba el pago
            onApprove: async (data, actions) => {
                try {
                    // Capturar el pago
                    const details = await actions.order.capture();
                    
                    console.log('[PayPal] Pago capturado:', details);

                    // Llamar callback de éxito con los detalles
                    if (onSuccess) {
                        onSuccess({
                            transactionId: details.id,
                            status: details.status,
                            payer: {
                                email: details.payer?.email_address,
                                name: `${details.payer?.name?.given_name || ''} ${details.payer?.name?.surname || ''}`.trim()
                            },
                            amount: {
                                value: details.purchase_units[0]?.amount?.value,
                                currency: details.purchase_units[0]?.amount?.currency_code
                            },
                            captureId: details.purchase_units[0]?.payments?.captures?.[0]?.id,
                            rawDetails: details
                        });
                    }
                } catch (err) {
                    console.error('[PayPal] Error capturando pago:', err);
                    if (onError) {
                        onError(err);
                    }
                }
            },

            // Cuando el usuario cancela
            onCancel: (data) => {
                console.log('[PayPal] Pago cancelado:', data);
                if (onCancel) {
                    onCancel(data);
                }
            },

            // Cuando hay un error
            onError: (err) => {
                console.error('[PayPal] Error:', err);
                if (onError) {
                    onError(err);
                }
            }
        }).render(paypalRef.current);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sdkReady, totalUSD, orderData, onSuccess, onError, onCancel]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-6 bg-gray-50 rounded-xl">
                <Loader2 className="w-6 h-6 animate-spin text-[#0070ba]" />
                <span className="ml-2 text-gray-600">Cargando PayPal...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <p className="text-red-600 text-sm">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="mt-2 text-sm text-red-700 underline"
                >
                    Recargar página
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Info del monto - Solo muestra colones al usuario */}
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 text-center">
                <p className="text-lg font-bold text-gray-800">
                    Total a pagar: <span className="text-bikitchen-orange">₡{totalCRC.toLocaleString('es-CR')}</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Pago seguro con tarjeta de crédito o débito
                </p>
            </div>

            {/* Contenedor de botones PayPal */}
            <div 
                ref={paypalRef} 
                className={`paypal-button-container ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
            />

            {/* Tarjetas aceptadas - Temporalmente oculto
            <div className="flex items-center justify-center gap-3 py-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-5 opacity-70" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-5 opacity-70" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg" alt="Amex" className="h-5 opacity-70" />
            </div>
            */}

            {/* Seguridad */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Pago 100% seguro y encriptado</span>
            </div>
        </div>
    );
}
