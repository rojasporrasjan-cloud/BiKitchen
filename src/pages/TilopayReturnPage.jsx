import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Home, ShoppingBag } from 'lucide-react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useCart } from '../context/CartContext';
import { upsertClient } from '../services/clientService';

export default function TilopayReturnPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { clearCart } = useCart();
    
    const [status, setStatus] = useState('loading'); // loading, success, error, cancelled
    const [orderNumber, setOrderNumber] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const processReturn = async () => {
            try {
                // Obtener parámetros de la URL que Tilopay envía
                // Los nombres exactos dependen de la configuración de Tilopay
                const tilopayStatus = searchParams.get('status') || searchParams.get('result') || searchParams.get('code');
                const tilopayOrderId = searchParams.get('order') || searchParams.get('orderNumber') || searchParams.get('reference');
                const tilopayMessage = searchParams.get('message') || searchParams.get('description') || '';
                const tilopayTransactionId = searchParams.get('transactionId') || searchParams.get('transaction_id') || searchParams.get('id');
                
                
                // También intentar recuperar de localStorage
                const savedOrder = localStorage.getItem('bikitchen-tilopay-order');
                let savedOrderData = null;
                if (savedOrder) {
                    try {
                        savedOrderData = JSON.parse(savedOrder);
                    } catch (e) {
                        console.error('Error parsing saved order:', e);
                    }
                }
                
                const finalOrderNumber = tilopayOrderId || savedOrderData?.orderNumber || '';
                setOrderNumber(finalOrderNumber);
                
                // Determinar el estado del pago
                // Los valores exactos dependen de Tilopay; estos son los más comunes
                const successStatuses = ['approved', 'success', '1', 'completed', 'paid'];
                const cancelledStatuses = ['cancelled', 'canceled', 'cancel'];
                
                const isSuccess = successStatuses.some(s => 
                    tilopayStatus?.toLowerCase() === s || 
                    searchParams.get('approved') === 'true'
                );
                const isCancelled = cancelledStatuses.some(s => 
                    tilopayStatus?.toLowerCase() === s
                );
                
                if (isSuccess) {
                    // Pago exitoso - actualizar el pedido en Firestore
                    if (finalOrderNumber) {
                        try {
                            // Buscar el pedido por número de orden
                            const pedidosRef = collection(db, 'pedidos');
                            const q = query(pedidosRef, where('numeroOrden', '==', finalOrderNumber));
                            const snapshot = await getDocs(q);
                            
                            if (!snapshot.empty) {
                                const pedidoDoc = snapshot.docs[0];
                                const orderData = pedidoDoc.data();

                                // Solo proceder si no estaba ya marcado como pagado para evitar duplicar emails
                                if (orderData.paymentStatus !== 'paid') {
                                    await updateDoc(doc(db, 'pedidos', pedidoDoc.id), {
                                        status: 'confirmed',
                                        paymentStatus: 'paid',
                                        paymentProvider: 'tilopay',
                                        tilopayTransactionId: tilopayTransactionId || null,
                                        tilopayStatus: tilopayStatus,
                                        paidAt: new Date().toISOString(),
                                        updatedAt: new Date().toISOString()
                                    });

                                    // Preparar datos para los emails
                                    try {
                                        const { sendOrderNotification, sendCustomerOrderConfirmation } = await import('../services/emailNotifications');
                                        const { getScheduleFromOrder } = await import('../utils/orderDates');

                                        const schedule = getScheduleFromOrder({
                                            ...orderData,
                                            id: pedidoDoc.id
                                        });

                                        const fullOrderDataForEmail = {
                                            orderNumber: orderData.numeroOrden || finalOrderNumber,
                                            orderDate: orderData.createdAt
                                                ? (orderData.createdAt.seconds
                                                    ? new Date(orderData.createdAt.seconds * 1000).toLocaleDateString('es-CR')
                                                    : new Date(orderData.createdAt).toLocaleDateString('es-CR'))
                                                : new Date().toLocaleDateString('es-CR'),
                                            cliente: orderData.cliente,
                                            telefono: orderData.telefono,
                                            correo: orderData.correo,
                                            items: orderData.items,
                                            total: orderData.total,
                                            subtotal: orderData.subtotal,
                                            descuento: orderData.descuento_aplicado || 0,
                                            costoEnvio: orderData.costo_envio,
                                            zona: orderData.zona_envio,
                                            direccion: orderData.direccion,
                                            referencias: orderData.detalles_direccion,
                                            metodoPago: 'tilopay',
                                            fechaEntrega: orderData.fecha_entrega,
                                            fechasEntrega: schedule,
                                            observaciones: orderData.observaciones,
                                            cedula: orderData.cedula
                                        };

                                        // 1.5 Registrar/Actualizar cliente en el CRM
                                        try {
                                            await upsertClient({
                                                nombre: orderData.cliente,
                                                telefono: orderData.telefono,
                                                correo: orderData.correo,
                                                direccion: orderData.direccion
                                            });
                                        } catch (crmErr) {
                                            console.error('[CRM] Error registrando cliente desde Tilopay:', crmErr);
                                        }

                                        // Enviar emails asíncronamente
                                        sendOrderNotification(fullOrderDataForEmail).catch(e => console.error('Error email admin:', e));
                                        sendCustomerOrderConfirmation(fullOrderDataForEmail).catch(e => console.error('Error email cliente:', e));
                                        
                                    } catch (notifErr) {
                                        console.error('[TilopayReturn] Error al cargar o enviar notificaciones:', notifErr);
                                    }
                                } else {
                                }
                            }
                        } catch (updateError) {
                            console.error('[TilopayReturn] Error actualizando pedido:', updateError);
                        }
                    }
                    
                    // Limpiar carrito y localStorage
                    clearCart();
                    localStorage.removeItem('bikitchen-tilopay-order');
                    localStorage.removeItem('bikitchen-checkout-form');
                    
                    setStatus('success');
                    setMessage('¡Tu pago ha sido procesado exitosamente!');
                } else if (isCancelled) {
                    setStatus('cancelled');
                    setMessage('El pago fue cancelado. Puedes intentar de nuevo.');
                } else {
                    // Error o estado desconocido
                    setStatus('error');
                    setMessage(tilopayMessage || 'Hubo un problema procesando tu pago. Por favor intenta de nuevo o contacta a soporte.');
                }
                
            } catch (error) {
                console.error('[TilopayReturn] Error:', error);
                setStatus('error');
                setMessage('Error procesando la respuesta del pago.');
            }
        };
        
        processReturn();
    }, [searchParams, clearCart]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-bikitchen-beige to-white flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                {status === 'loading' && (
                    <>
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Procesando pago...
                        </h2>
                        <p className="text-gray-600">
                            Por favor espera mientras verificamos tu pago.
                        </p>
                    </>
                )}
                
                {status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 mb-2">
                            ¡Pago exitoso! — BiKitchen
                        </h1>
                        <p className="text-gray-600 mb-4">
                            {message}
                        </p>
                        {orderNumber && (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                                <p className="text-sm text-green-700">Número de orden</p>
                                <p className="text-xl font-bold text-green-800">{orderNumber}</p>
                            </div>
                        )}
                        <p className="text-sm text-gray-500 mb-6">
                            Recibirás un correo de confirmación con los detalles de tu pedido.
                        </p>
                    </>
                )}
                
                {status === 'cancelled' && (
                    <>
                        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-10 h-10 text-yellow-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Pago cancelado
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {message}
                        </p>
                    </>
                )}
                
                {status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            Error en el pago
                        </h2>
                        <p className="text-gray-600 mb-6">
                            {message}
                        </p>
                    </>
                )}
                
                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                    >
                        <Home size={18} />
                        Ir al inicio
                    </button>
                    
                    {(status === 'cancelled' || status === 'error') && (
                        <button
                            onClick={() => navigate('/packs')}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white rounded-xl font-medium transition-colors"
                        >
                            <ShoppingBag size={18} />
                            Volver a intentar
                        </button>
                    )}
                    
                    {status === 'success' && (
                        <button
                            onClick={() => navigate('/mis-pedidos')}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-bikitchen-orange hover:bg-bikitchen-orange-dark text-white rounded-xl font-medium transition-colors"
                        >
                            <ShoppingBag size={18} />
                            Ver mis pedidos
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
