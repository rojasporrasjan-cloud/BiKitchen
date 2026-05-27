/**
 * Netlify Serverless Function: nmi-status
 * 
 * Polling endpoint to verify payment status when a timeout or error occurs.
 * Supports both GET and POST requests for maximum compatibility.
 * 
 * Endpoint: /.netlify/functions/nmi-status
 */

import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Singleton para inicializar Firebase Admin una sola vez
 */
let db;
try {
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp() : getApp();
    db = getFirestore(app);
} catch (err) {
    console.error('[NMI Status] Error inicializando Firebase Admin:', err.message);
}

export const handler = async (event) => {
    // Manejo de CORS - Restricto solo a nuestro dominio
    // Determinar origen permitido para CORS
    const origin = event.headers.origin || '';
    const allowedOrigin = (origin.includes('bikitchencr.com') || origin.includes('localhost:5173') || origin.includes('127.0.0.1:5173')) 
        ? origin 
        : 'https://bikitchencr.com';

    const headers = {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Método no permitido' })
        };
    }

    let orderId;
    let numeroOrden;

    if (event.httpMethod === 'POST') {
        try {
            const body = JSON.parse(event.body || '{}');
            orderId = body.orderId || body.orderid || body.id;
            numeroOrden = body.numeroOrden;
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid JSON body' })
            };
        }
    } else {
        const params = event.queryStringParameters || {};
        orderId = params.orderId || params.orderid || params.id;
    }

    if (!orderId) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
                error: 'orderId is required', 
                response: '3', 
                responsetext: 'MISSING_ORDER_ID' 
            })
        };
    }

    try {
        const database = db;
        if (!database) {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({ 
                    error: 'Database service unavailable', 
                    response: '3', 
                    responsetext: 'DB_INIT_ERROR' 
                })
            };
        }

        // 1. Try searching by Firestore Document ID first (standard polling flow)
        let orderSnap = await database.collection('pedidos').doc(orderId).get();
        let orderData;

        if (orderSnap.exists) {
            orderData = orderSnap.data();
        } else {
            // 2. Fallback: Search by 'numeroOrden' field (e.g. #ORD-1234)
            // This handles cases where the frontend polls using the human-readable ID
            console.log(`[NMI Status] Order ${orderId} not found as DocID. Searching by numeroOrden...`);
            const querySnap = await database.collection('pedidos')
                .where('numeroOrden', '==', orderId)
                .limit(1)
                .get();
            
            if (!querySnap.empty) {
                orderSnap = querySnap.docs[0];
                orderData = orderSnap.data();
                orderId = orderSnap.id; // Correct the ID to the DocID for consistency
            }
        }

        if (!orderData) {
            console.warn(`[NMI Status] Order ${orderId} not found in Firestore.`);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({
                    response: '0',
                    responsetext: 'Order not found',
                    status: 'not_found'
                })
            };
        }

        /**
         * Status Mapping Logic
         * response '1' = Approved (Success)
         * response '2' = Declined (Failure)
         * response '0' = Pending / Processing (Not finished)
         */
        const status = (orderData.estado || orderData.pagoStatus || 'unknown').toLowerCase();
        let response = '0'; // Default to pending

        // Normalized success states
        const successStates = [
            'confirmed',
            'pago_confirmado',
            'pagado',
            'completado',
            'completed',
            'success',
            'approved',
            'verified',
            'paid'
            // 'procesando' excluido — es estado intermedio, no confirmación final
        ];

        // Normalized failure states
        const failureStates = [
            'pago_rechazado',
            'rechazado',
            'cancelado',
            'failed',
            'declined',
            'error',
            'timeout',
            'retry',
            'processing_manual'
        ];

        if (successStates.includes(status) || orderData.paymentConfirmed === true) {
            response = '1';
        } else if (failureStates.includes(status)) {
            response = '2';
        }

        console.log(`[NMI Status] Order ${orderId}: mapped from '${status}' to response '${response}'`);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                response,
                responsetext: status,
                authcode: orderData.authcode || orderData.transactionId || '',
                transactionid: orderData.transactionId || '',
                paymentStatus: status,
                orderid: orderId,
                _polled: true,
                _timestamp: new Date().toISOString()
            })
        };
    } catch (error) {
        console.error('[NMI Status] Internal Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error.message,
                response: '3',
                responsetext: 'INTERNAL_ERROR'
            })
        };
    }
};
