/**
 * paypalService.js
 * 
 * Servicio para manejar pagos de PayPal y actualizar pedidos en Firestore.
 */

import { db } from '../firebase/config';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

/**
 * Actualiza un pedido en Firestore después de un pago exitoso de PayPal
 */
export async function updateOrderWithPayPalPayment(orderId, paypalDetails) {
    try {
        const orderRef = doc(db, 'pedidos', orderId);
        
        await updateDoc(orderRef, {
            // Estado del pedido
            status: 'confirmed',
            paymentStatus: 'paid',
            
            // Detalles de PayPal
            paymentProvider: 'paypal',
            paypalTransactionId: paypalDetails.transactionId,
            paypalCaptureId: paypalDetails.captureId || null,
            paypalPayerEmail: paypalDetails.payer?.email || null,
            paypalPayerName: paypalDetails.payer?.name || null,
            paypalAmount: paypalDetails.amount?.value || null,
            paypalCurrency: paypalDetails.amount?.currency || 'USD',
            
            // Timestamps
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log('[PayPal Service] Pedido actualizado:', orderId);
        return { success: true };
    } catch (error) {
        console.error('[PayPal Service] Error actualizando pedido:', error);
        throw error;
    }
}

/**
 * Verifica si un pedido ya fue pagado
 */
export async function isOrderPaid(orderId) {
    try {
        const orderRef = doc(db, 'pedidos', orderId);
        const orderSnap = await getDoc(orderRef);
        
        if (!orderSnap.exists()) {
            return false;
        }
        
        const data = orderSnap.data();
        return data.paymentStatus === 'paid';
    } catch (error) {
        console.error('[PayPal Service] Error verificando pago:', error);
        return false;
    }
}

/**
 * Formatea el monto de CRC a USD
 */
export function formatCRCtoUSD(amountCRC, exchangeRate = 515) {
    return (amountCRC / exchangeRate).toFixed(2);
}

/**
 * Obtiene la tasa de cambio CRC → USD desde Firestore config con fallback a env var
 */
export async function getExchangeRate() {
    try {
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');

        const configDoc = await getDoc(doc(db, 'config', 'payments'));
        if (configDoc.exists() && configDoc.data().exchangeRateCRCUSD) {
            const rate = configDoc.data().exchangeRateCRCUSD;
            console.log('[PayPal] Exchange rate from Firestore:', rate);
            return rate;
        }
    } catch (error) {
        console.warn('[PayPal] Could not fetch exchange rate from Firestore:', error.message);
    }

    // Fallback a env var o valor por defecto
    const envRate = parseFloat(import.meta.env.VITE_PAYPAL_EXCHANGE_RATE);
    const finalRate = !isNaN(envRate) ? envRate : 515;
    console.log('[PayPal] Using exchange rate:', finalRate);
    return finalRate;
}
