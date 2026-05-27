import { useState, useCallback } from 'react';
import {
    sendOrderConfirmation,
    sendOrderStatusUpdate,
    sendWelcomeEmail
} from '../services/emailService';

/**
 * Hook para enviar emails desde componentes
 */
export function useEmail() {
    const [sending, setSending] = useState(false);
    const [lastResult, setLastResult] = useState(null);

    // Enviar confirmación de pedido
    const sendConfirmation = useCallback(async (orderData) => {
        setSending(true);
        try {
            const result = await sendOrderConfirmation(orderData);
            setLastResult(result);
            return result;
        } finally {
            setSending(false);
        }
    }, []);

    // Enviar actualización de estado
    const sendStatusUpdate = useCallback(async (orderData, newStatus) => {
        setSending(true);
        try {
            const result = await sendOrderStatusUpdate(orderData, newStatus);
            setLastResult(result);
            return result;
        } finally {
            setSending(false);
        }
    }, []);

    // Enviar email de bienvenida
    const sendWelcome = useCallback(async (userData) => {
        setSending(true);
        try {
            const result = await sendWelcomeEmail(userData);
            setLastResult(result);
            return result;
        } finally {
            setSending(false);
        }
    }, []);

    return {
        sending,
        lastResult,
        sendConfirmation,
        sendStatusUpdate,
        sendWelcome
    };
}

export default useEmail;
