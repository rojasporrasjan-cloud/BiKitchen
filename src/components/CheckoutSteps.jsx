import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ArrowLeft, ArrowRight, User, MapPin, CreditCard, Check,
    ShoppingBag, Tag, Phone, Mail, FileText, Calendar, MessageSquare,
    Loader2, CheckCircle, AlertCircle, Truck, Plus, Bookmark, ChevronDown, Clock, Lock as LucideLock
} from 'lucide-react';
import { useCart, REFERRAL_DISCOUNT_CRC } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import useSavedAddresses from '../hooks/useSavedAddresses';
import useOrderHistory from '../hooks/useOrderHistory';
import { AddressSelector } from './AddressManager';
import PayPalButton from './PayPalButton';
import { useContactConfig } from '../context/ContactConfigContext';
import { getSourceLabel } from '../services/sourceTracking';
import { useWhatsApp } from '../hooks/useWhatsApp';
import { WHATSAPP_PHONE, formatWhatsAppDisplay } from '../config/whatsappMessages';
import { toCRInternational } from '../utils/phoneUtils';
import { trackInitiateCheckout, trackPurchase, trackContact, trackAddPaymentInfo } from '../services/facebookPixel';
import ShippingZoneSelector from './ShippingZoneSelector';
import NMIPaymentModal from './NMIPaymentModal';
import { useOrders } from '../context/OrdersContext';
import { getScheduleFromOrder } from '../utils/orderDates';
// TILOPAY: Desactivado temporalmente - pendiente aprobación
// import { processTilopayPayment } from '../utils/tilopayClient';
import { upsertClient } from '../services/clientService';
import { formatPrice, formatProteinList } from '../utils/formatters';

const STEPS = [
    { id: 1, name: 'Datos', icon: User },
    { id: 2, name: 'Entrega', icon: Truck },
    { id: 3, name: 'Pago', icon: CreditCard },
    { id: 4, name: 'Confirmar', icon: Check }
];

// Generar próximas fechas de entrega disponibles con reglas de corte
// blockedDates: array de strings YYYY-MM-DD cargados desde Firestore config/delivery
const getNextDeliveryDates = (blockedDates = []) => {
    const dates = [];
    const now = new Date();
    const deliveryDays = [1, 3, 6]; // Lunes=1, Miércoles=3, Sábado=6

    // Función para obtener la fecha límite de pedido para una fecha de entrega
    const getDeadline = (deliveryDate) => {
        const deadline = new Date(deliveryDate);
        deadline.setHours(22, 0, 0, 0); // 10:00 PM

        const day = deliveryDate.getDay();
        if (day === 1) { // Lunes -> Viernes anterior (3 días antes por cierre domingos)
            deadline.setDate(deliveryDate.getDate() - 3);
        } else if (day === 3) { // Miércoles -> Lunes anterior (2 días antes)
            deadline.setDate(deliveryDate.getDate() - 2);
        } else if (day === 6) { // Sábado -> Jueves anterior (2 días antes)
            deadline.setDate(deliveryDate.getDate() - 2);
        }
        return deadline;
    };

    for (let i = 0; i < 21; i++) { // Próximos 21 días
        const date = new Date(now);
        date.setDate(now.getDate() + i);
        date.setHours(0, 0, 0, 0); // Normalizar a medianoche

        if (deliveryDays.includes(date.getDay())) {
            const deadline = getDeadline(date);

            // Si aún no ha pasado la fecha límite
            if (now < deadline) {
                // Formato YYYY-MM-DD local
                const value = date.getFullYear() + '-' +
                    String(date.getMonth() + 1).padStart(2, '0') + '-' +
                    String(date.getDate()).padStart(2, '0');

                if (blockedDates.includes(value)) {
                    continue; // Saltar esta fecha
                }

                dates.push({
                    date: date,
                    value: value,
                    dayName: date.toLocaleDateString('es-CR', { weekday: 'long' }),
                    dayNumber: date.getDate(),
                    month: date.toLocaleDateString('es-CR', { month: 'short' }),
                    isNextWeek: i > 7
                });
            }
        }

        if (dates.length >= 6) break; // Mostrar hasta 6 fechas disponibles
    }

    return dates;
};

const PAYMENT_METHODS = [
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, description: 'Coordinar pago por WhatsApp', color: 'green', recommended: true },
    { id: 'sinpe', name: 'SINPE Móvil', icon: Phone, description: 'Transferencia inmediata', color: 'blue' },
    { id: 'transfer', name: 'Transferencia', icon: CreditCard, description: 'Transferencia bancaria', color: 'purple' },
    { id: 'nmi', name: 'Tarjeta de Débito / Crédito', icon: CreditCard, description: 'Pago seguro con tarjeta', color: 'blue', recommended: true }
    // PayPal desactivado como se solicitó
    // { id: 'paypal', name: 'PayPal', icon: CreditCard, description: 'Próximamente', color: 'gray', disabled: true, comingSoon: true }
    // TILOPAY: Desactivado temporalmente - reemplazado por BAC (NMI)
    // { id: 'tilopay', name: 'Tarjeta', icon: CreditCard, description: 'Pago seguro con tarjeta', color: 'blue', recommended: true },
];

export default function CheckoutSteps({ isOpen, onClose }) {
    const {
        cart,
        getSubtotal,
        getDiscount,
        getTotalPrice,
        getTotalWithShipping,
        getPaymentMethodAdjustment,
        clearCart,
        appliedCoupon,
        markCouponAsUsed,
        // Envío
        selectedZone,
        updateShippingZone,
        getShippingCostFinal,
        getSelectedZoneInfo,
        isZoneOutOfCoverage,
        SHIPPING_ZONES,
        appliedReferral
    } = useCart();
    const { currentUser, isAdmin } = useAuth();
    const { updateOrderStatus } = useOrders();
    const { addresses, addAddress, getDefaultAddress, hasAddresses } = useSavedAddresses();
    const { addOrderToHistory } = useOrderHistory();
    const { whatsappPhone, getWhatsAppUrl } = useWhatsApp();

    // Función simple de formateo para el mensaje de texto
    const formatPriceMsg = formatPrice;

    const generateOrderSummary = () => {
        // Usar detalles guardados si la orden está completa, de lo contrario usar estado actual del carrito
        const orderItems = orderComplete && lastOrderDetails ? lastOrderDetails.items : cart;
        const currentTotal = orderComplete && lastOrderDetails ? lastOrderDetails.total : getTotalWithShipping();
        const currentSubtotal = orderComplete && lastOrderDetails ? lastOrderDetails.subtotal : getSubtotal();
        const currentZone = orderComplete && lastOrderDetails ? lastOrderDetails.zoneName : (getSelectedZoneInfo()?.name);
        const currentShipping = orderComplete && lastOrderDetails ? lastOrderDetails.costoEnvio : getShippingCostFinal();
        const currentDiscount = orderComplete && lastOrderDetails ? lastOrderDetails.descuento : getDiscount();
        const currentCode = orderComplete && lastOrderDetails && lastOrderDetails.cupon ? lastOrderDetails.cupon : (appliedCoupon?.code);

        let summary = `*¡Hola! Acabo de hacer un pedido en la web* 🛒\n\n`;
        summary += `*Orden:* ${orderNumber}\n`;
        summary += `*Cliente:* ${formData.nombre}\n`;
        if (formData.metodoPago === 'sinpe') summary += `*Pago:* SINPE Móvil (Adjunto comprobante)\n`;
        if (formData.metodoPago === 'transfer') summary += `*Pago:* Transferencia (Adjunto comprobante)\n`;
        if (formData.metodoPago === 'whatsapp') summary += `*Pago:* A coordinar\n`;

        summary += `\n*Detalle del Pedido:*\n`;

        orderItems.forEach(item => {
            summary += `• ${item.quantity}x ${item.name}`;
            if (item.planLabel && item.planLabel !== 'Mensual') summary += ` (${item.planLabel})`;
            // Si es mensual y es pack, ya suele decirse el precio total
            summary += `\n`;

            // Proteínas
            if (item.proteinas && Array.isArray(item.proteinas) && item.proteinas.length > 0) {
                summary += `  └ Proteínas: ${formatProteinList(item.proteinas)}\n`;
            } else if (item.desc && item.desc.includes('Incluye:')) {
                // Fallback si la descripción tiene las proteínas (caso legacy o duplicado)
                summary += `  └ ${item.desc}\n`;
            }
        });

        if (currentDiscount > 0) {
            summary += `\nSubtotal: ${formatPriceMsg(currentSubtotal)}`;
            summary += `\nDescuento (${currentCode || 'Cupón'}): -${formatPriceMsg(currentDiscount)}`;
        }

        if (currentShipping !== null && currentShipping > 0) {
            summary += `\nEnvío: ${formatPriceMsg(currentShipping)}`;
        } else if (isZoneOutOfCoverage() || (orderComplete && lastOrderDetails?.envioPorConfirmar)) {
            summary += `\nEnvío: Por confirmar ⚠️`;
        }

        summary += `\n*Total a Pagar:* ${formatPriceMsg(currentTotal)}`;

        return summary;
    };

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const isSubmittingRef = useRef(false);
    const isCompletingRef = useRef(false);
    const [orderComplete, setOrderComplete] = useState(false);
    const [lastOrderDetails, setLastOrderDetails] = useState(null); // Snapshot de la orden al completar
    const [orderNumber, setOrderNumber] = useState('');
    const [pointsEarned, setPointsEarned] = useState(0);
    const [selectedAddressId, setSelectedAddressId] = useState(null);
    const [useNewAddress, setUseNewAddress] = useState(false);
    const [saveNewAddress, setSaveNewAddress] = useState(false);
    const [blockedDeliveryDates, setBlockedDeliveryDates] = useState([]);

    // Load blocked delivery dates from Firestore config/delivery
    useEffect(() => {
        getDoc(doc(db, 'config', 'delivery'))
            .then(snap => {
                if (snap.exists()) {
                    const dates = snap.data().blockedDates;
                    if (Array.isArray(dates)) setBlockedDeliveryDates(dates);
                }
            })
            .catch(() => { /* use empty array fallback on error */ });
    }, []);

    // BAC (NMI) states — persistido en sessionStorage para sobrevivir remounts tras pago fallido
    const [pendingOrderDocId, setPendingOrderDocId] = useState(
        () => sessionStorage.getItem('bk_pending_order_id') || null
    );
    const [showNMIModal, setShowNMIModal] = useState(false);
    // Valores congelados al abrir el modal — no cambian aunque el carrito/zona cambie
    const [nmiRequestId, setNmiRequestId] = useState(null);
    const [nmiTotal, setNmiTotal] = useState(0);
    const [nmiDocId, setNmiDocId] = useState(null); // Firestore doc ID capturado sincrónicamente

    // Sanitize helpers
    const stripUndefined = (val) => {
        if (Array.isArray(val)) {
            return val.filter(v => v !== undefined).map(stripUndefined);
        }
        if (val && typeof val === 'object') {
            // Preserve Firebase special objects (serverTimestamp, FieldValue, etc.)
            if (val._methodName || val.constructor?.name === 'FieldValue' || val.constructor?.name === 'Timestamp') {
                return val; // Don't process Firebase special objects
            }
            const out = {};
            for (const [k, v] of Object.entries(val)) {
                if (v === undefined) continue;
                out[k] = stripUndefined(v);
            }
            return out;
        }
        return val;
    };

    // Obtener cantidad de envíos según los planes del carrito
    const getShipmentCountFromCart = () => {
        let shipmentCount = 1;
        cart.forEach(item => {
            const plan = (item.plan || '').toLowerCase();
            if (plan === 'monthly') {
                shipmentCount = Math.max(shipmentCount, 4);
            } else if (plan === 'biweekly') {
                shipmentCount = Math.max(shipmentCount, 2);
            }
        });
        return shipmentCount;
    };

    // Calcular programa de entregas a partir de una fecha base
    const computeDeliverySchedule = (baseDateStr) => {
        return getScheduleFromOrder({
            items: cart,
            fecha_entrega: baseDateStr
        });
    };

    // Track InitiateCheckout cuando se abre el modal
    useEffect(() => {
        if (isOpen && cart.length > 0) {
            const total = getTotalWithShipping();
            trackInitiateCheckout(cart, total);
        }
    }, [isOpen]);

    // Form data
    // Cargar datos del checkout desde localStorage
    const [formData, setFormData] = useState(() => {
        try {
            const saved = localStorage.getItem('bikitchen-checkout-form');
            if (saved) {
                const data = JSON.parse(saved);
                // Check expiration (2 hours)
                if (data._expiresAt && Date.now() > data._expiresAt) {
                    localStorage.removeItem('bikitchen-checkout-form');
                } else {
                    // Remove internal metadata fields
                    delete data._savedAt;
                    delete data._expiresAt;
                    // Never load cedula from localStorage (sensitive field)
                    delete data.cedula;
                    return data;
                }
            }
        } catch (error) {
            console.error('Error loading checkout form:', error);
        }
        return {
            // Step 1: Datos personales
            nombre: '',
            telefono: '',
            correo: '',
            cedula: '',
            // Step 2: Entrega
            direccion: '',
            referencias: '',
            fechaEntrega: '',
            fechasEntrega: [],
            direccionFueraCobertura: '', // Para zonas fuera de cobertura
            // Step 3: Pago
            metodoPago: 'whatsapp',
            observaciones: ''
        };
    });

    const [errors, setErrors] = useState({});

    // Guardar datos del checkout en localStorage cuando cambien
    useEffect(() => {
        // Don't persist cedula (sensitive field) + add 2-hour expiration
        const formToSave = {
            nombre: formData.nombre,
            telefono: formData.telefono,
            correo: formData.correo,
            direccion: formData.direccion,
            referencias: formData.referencias,
            fechaEntrega: formData.fechaEntrega,
            fechasEntrega: formData.fechasEntrega,
            direccionFueraCobertura: formData.direccionFueraCobertura,
            metodoPago: formData.metodoPago,
            observaciones: formData.observaciones,
            _savedAt: Date.now(),
            _expiresAt: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
        };
        localStorage.setItem('bikitchen-checkout-form', JSON.stringify(formToSave));
    }, [formData]);

    useEffect(() => {
        const schedule = computeDeliverySchedule(formData.fechaEntrega);
        setFormData(prev => {
            const prevSched = prev.fechasEntrega || [];
            const same = prevSched.length === schedule.length && prevSched.every((d, i) => d === schedule[i]);
            if (same) return prev;
            return { ...prev, fechasEntrega: schedule };
        });
    }, [formData.fechaEntrega, cart]);

    // Autocompletar datos del usuario logueado
    useEffect(() => {
        const loadUserData = async () => {
            if (isOpen && currentUser) {
                try {
                    // Cargar datos del usuario desde Firestore
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setFormData(prev => ({
                            ...prev,
                            nombre: prev.nombre || userData.name || currentUser.displayName || '',
                            correo: prev.correo || userData.email || currentUser.email || '',
                            telefono: prev.telefono || userData.phone || userData.telefono || '',
                            direccion: prev.direccion || userData.direccion || ''
                        }));
                    } else {
                        // Si no hay documento, usar datos básicos de auth
                        setFormData(prev => ({
                            ...prev,
                            nombre: prev.nombre || currentUser.displayName || '',
                            correo: prev.correo || currentUser.email || ''
                        }));
                    }
                } catch (error) {
                    console.error('Error loading user data:', error);
                    // Usar datos básicos de auth como fallback
                    setFormData(prev => ({
                        ...prev,
                        correo: prev.correo || currentUser.email || ''
                    }));
                }
            }
        };
        loadUserData();
    }, [isOpen, currentUser]);

    // Seleccionar dirección por defecto al abrir
    useEffect(() => {
        if (isOpen && hasAddresses && !selectedAddressId) {
            const defaultAddr = getDefaultAddress();
            if (defaultAddr) {
                setSelectedAddressId(defaultAddr.id);
                setFormData(prev => ({
                    ...prev,
                    direccion: prev.direccion || defaultAddr.direccion,
                    referencias: prev.referencias || defaultAddr.referencias || ''
                }));
            }
        }
    }, [isOpen, hasAddresses]);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const validateStep = (step) => {
        const newErrors = {};

        if (step === 1) {
            if (!formData.nombre.trim()) newErrors.nombre = 'Nombre requerido';
            if (!formData.telefono.trim()) newErrors.telefono = 'Teléfono requerido';
            else if (!toCRInternational(formData.telefono)) newErrors.telefono = 'Ingresa un teléfono válido de 8 dígitos';
            if (!formData.correo.trim()) newErrors.correo = 'Correo requerido';
            else if (!/\S+@\S+\.\S+/.test(formData.correo)) newErrors.correo = 'Correo inválido';
        }

        if (step === 2) {
            if (!selectedZone) newErrors.zona = 'Selecciona tu zona de entrega';
            if (isZoneOutOfCoverage() && !formData.direccionFueraCobertura.trim()) {
                newErrors.direccionFueraCobertura = 'Indica tu ubicación para verificar cobertura';
            }
            if (!formData.direccion.trim()) newErrors.direccion = 'Dirección requerida';
            if (!formData.fechaEntrega) newErrors.fechaEntrega = 'Selecciona un día de entrega';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const nextStep = () => {
        if (validateStep(currentStep)) {
            // Track cuando llega al paso de pago
            if (currentStep === 2) {
                trackAddPaymentInfo();
            }
            setCurrentStep(prev => Math.min(prev + 1, 4));
        }
    };

    const prevStep = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // Generar número de orden — timestamp completo + base36 random para evitar colisiones
    const generateOrderNumber = () => {
        const ts = Date.now().toString(36).toUpperCase().slice(-6);
        const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
        return `#ORD-${ts}${rand}`;
    };

    // Manejar éxito de PayPal
    const handlePayPalSuccess = async (paypalDetails) => {
        setLoading(true);
        try {
            const newOrderNumber = pendingOrderDocId ? orderNumber : generateOrderNumber();

            // Si ya hay un pedido pendiente, actualizarlo
            if (pendingOrderDocId) {
                const orderRef = doc(db, 'pedidos', pendingOrderDocId);
                await updateDoc(orderRef, {
                    status: 'confirmed',
                    paymentStatus: 'paid',
                    paymentProvider: 'paypal',
                    paypalTransactionId: paypalDetails.transactionId,
                    paypalCaptureId: paypalDetails.captureId,
                    paypalPayerEmail: paypalDetails.payer?.email,
                    paypalPayerName: paypalDetails.payer?.name,
                    paypalAmount: paypalDetails.amount?.value,
                    paypalCurrency: paypalDetails.amount?.currency,
                    paidAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            } else {
                // Crear nuevo pedido con pago completado
                await createOrderWithPayment(newOrderNumber, paypalDetails);
            }

            // Marcar cupón como usado
            if (appliedCoupon) {
                await markCouponAsUsed(currentUser?.uid || formData.correo);
            }

            // Finalizar orden - Esto agregará los puntos centralizadamente
            // (NO agregar puntos aquí para evitar duplicación con handleOrderCompletion)
            await handleOrderCompletion({
                ...paypalDetails,
                orderNumber: newOrderNumber,
                metodoPago: 'paypal'
            });

        } catch (error) {
            console.error('[PayPal] Error procesando pago:', error);
            alert('Hubo un error procesando tu pago. Por favor contacta a soporte.');
        } finally {
            setLoading(false);
        }
    };

    // Crear pedido con información de pago de PayPal
    const createOrderWithPayment = async (orderNum, paypalDetails) => {
        const subtotal = getSubtotal();
        const discount = getDiscount();
        const shippingCost = getShippingCostFinal();
        const zoneInfo = getSelectedZoneInfo();
        const total = getTotalWithShipping();
        const inferredPlan = cart[0]?.name || 'Pedido Web';

        const orderData = {
            numeroOrden: orderNum,
            cliente: formData.nombre,
            telefono: formData.telefono,
            correo: formData.correo,
            cedula: formData.cedula || '-',
            direccion: formData.direccion,
            referencias: formData.referencias || '',
            zona_envio: isZoneOutOfCoverage() ? 'Fuera de cobertura' : (zoneInfo?.name || 'No especificada'),
            zona_id: selectedZone || null,
            ubicacion_fuera_cobertura: isZoneOutOfCoverage() ? formData.direccionFueraCobertura : null,
            costo_envio: shippingCost,
            envio_por_confirmar: false,
            plan: inferredPlan,
            fecha_entrega: formData.fechaEntrega,
            fechas_entrega: computeDeliverySchedule(formData.fechaEntrega),
            horario_preferido: '9:00 AM - 2:00 PM',
            items: cart.map(item => ({
                name: item.name || '',
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0,
                total: (Number(item.price) || 0) * (Number(item.quantity) || 0),
                desc: item.desc || '',
                proteinas: Array.isArray(item.proteinas) ? item.proteinas : undefined,
                customizations: stripUndefined(item.customizations || {})
            })),
            subtotal,
            descuento: discount,
            cupon_aplicado: appliedCoupon ? appliedCoupon.code : null,
            total,
            metodo_pago: 'paypal',
            observaciones: formData.observaciones || '',
            status: 'confirmed',
            paymentStatus: 'paid',
            paymentProvider: 'paypal',
            paypalTransactionId: paypalDetails.transactionId,
            paypalCaptureId: paypalDetails.captureId,
            paypalPayerEmail: paypalDetails.payer?.email,
            paypalPayerName: paypalDetails.payer?.name,
            paypalAmount: paypalDetails.amount?.value,
            paypalCurrency: paypalDetails.amount?.currency,
            paidAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            userId: currentUser?.uid || null,
            fuente: getSourceLabel()
        };

        const safePayPalOrder = stripUndefined(orderData);
        await addDoc(collection(db, 'pedidos'), safePayPalOrder);
    };

    // Manejar error de PayPal
    const handlePayPalError = (error) => {
        console.error('[PayPal] Error:', error);
        alert('Hubo un error con PayPal. Por favor intenta de nuevo o elige otro método de pago.');
        setLoading(false);
    };

    // Manejar cancelación de PayPal
    const handlePayPalCancel = () => {
        // No hacer nada especial, el usuario puede intentar de nuevo
    };

    const handleSubmit = async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        if (cart.length === 0) {
            isSubmittingRef.current = false;
            alert('Tu carrito está vacío.');
            return;
        }

        if (!validateStep(currentStep)) {
            isSubmittingRef.current = false;
            return;
        }

        setLoading(true);

        try {
            const newOrderNumber = generateOrderNumber();
            const inferredPlan = cart[0]?.name || 'Pedido Web';

            const subtotal = getSubtotal();
            const discount = getDiscount();
            const shippingCost = getShippingCostFinal();
            const zoneInfo = getSelectedZoneInfo();
            const paymentAdjustment = getPaymentMethodAdjustment(formData.metodoPago);
            const total = getTotalWithShipping() + paymentAdjustment;
            const deliverySchedule = computeDeliverySchedule(formData.fechaEntrega);

             const productionOrder = {
                numeroOrden: newOrderNumber,
                userId: currentUser?.uid || null, // Vínculo CRUCIAL para historial senior
                cliente: formData.nombre,
                telefono: formData.telefono,
                correo: formData.correo?.toLowerCase().trim(), // Normalización forzada
                cedula: formData.cedula || '-',
                direccion: formData.direccion,
                referencias: formData.referencias || '',
                zona_envio: isZoneOutOfCoverage() ? 'Fuera de cobertura' : (zoneInfo?.name || 'No especificada'),
                zona_id: selectedZone || null,
                ubicacion_fuera_cobertura: isZoneOutOfCoverage() ? formData.direccionFueraCobertura : null,
                costo_envio: shippingCost,
                envio_por_confirmar: false,
                plan: inferredPlan,
                fecha_entrega: formData.fechaEntrega,
                fechas_entrega: deliverySchedule,
                horario_preferido: '9:00 AM - 2:00 PM',
                observaciones: formData.observaciones || '',
                items: cart.map(item => ({
                    nombre: item.name || '',
                    proteina: item.protein || '',
                    carbo: item.carbs || '',
                    ensalada: item.veggies || '',
                    cantidad: Number(item.quantity) || 1,
                    precio: Number(item.price) || 0,
                    total: (Number(item.price) || 0) * (Number(item.quantity) || 1), // Añadido para admin
                    category: item.category ?? null,
                    categoryLabel: item.categoryLabel ?? null,
                    // `plan` ('weekly' | 'biweekly' | 'monthly') es lo que usa
                    // getScheduleFromOrder para saber cuántas entregas tocan. Antes no
                    // se guardaba y quedaba solo planLabel, que es texto para mostrar:
                    // si no decía "quincenal" o "mensual", la hoja de producción veía
                    // una sola entrega y las demás semanas no se cocinaban.
                    plan: item.plan ?? null,
                    planLabel: item.planLabel ?? null,
                    proteinas: Array.isArray(item.proteinas) ? item.proteinas : undefined,
                    carbos: Array.isArray(item.carbos) ? item.carbos : undefined,
                    vegetales: Array.isArray(item.vegetales) ? item.vegetales : undefined,
                    desc: item.desc || undefined,
                    customizations: stripUndefined(item.customizations || {})
                })),
                subtotal: Number(subtotal) || 0,
                descuento: Number(discount) || 0,
                cupon: appliedCoupon?.code || null,
                referral_code: appliedReferral?.code || null,
                referral_uid: appliedReferral?.referrerUid || null,
                metodo_pago: formData.metodoPago === 'nmi' ? 'Tarjeta' : formData.metodoPago,
                ajuste_metodo_pago: paymentAdjustment > 0 ? paymentAdjustment : undefined,
                total: Number(total) || 0,
                status: 'pending_payment', // Pendiente de pago - no confirmado aún
                paymentConfirmed: false, // Se marca true cuando admin confirma pago
                pointsAwarded: false, // Se marca true cuando se dan los puntos
                pointsToAward: Math.floor(total * 0.02), // Puntos que se darán al confirmar (2%)
                fuente: getSourceLabel(),
                createdAt: serverTimestamp()
            };


            // Guardar en Firestore (colección unificada 'pedidos')
            // IMPORTANTE: el write debe completarse en el servidor antes de abrir WhatsApp.
            // Usamos { source: 'server' } implícitamente al esperar la promesa — si hay
            // problemas de red, el error se propaga y detenemos el flujo para no perder pedidos.
            const safeOrder = stripUndefined(productionOrder);

            let orderRefId = pendingOrderDocId;
            try {
                if (orderRefId) {
                    // Intentar actualizar el borrador existente
                    try {
                        await updateDoc(doc(db, 'pedidos', orderRefId), {
                            ...safeOrder,
                            updatedAt: serverTimestamp()
                        });
                    } catch (updateErr) {
                        // ID caducado (not-found) o sin permisos para actualizar → crear pedido nuevo
                        if (updateErr.code === 'not-found' || updateErr.code === 'permission-denied') {
                            sessionStorage.removeItem('bk_pending_order_id');
                            const orderRef = await addDoc(collection(db, 'pedidos'), safeOrder);
                            orderRefId = orderRef.id;
                            sessionStorage.setItem('bk_pending_order_id', orderRefId);
                            setPendingOrderDocId(orderRefId);
                        } else {
                            throw updateErr; // Re-lanzar errores de red u otros
                        }
                    }
                } else {
                    const orderRef = await addDoc(collection(db, 'pedidos'), safeOrder);
                    orderRefId = orderRef.id;
                    sessionStorage.setItem('bk_pending_order_id', orderRefId);
                    setPendingOrderDocId(orderRefId);
                }
            } catch (firestoreError) {
                console.error('[OrderCreation] Error guardando en Firestore:', firestoreError);
                setLoading(false);
                isSubmittingRef.current = false;
                alert('Hubo un problema de conexión al guardar tu pedido. Por favor verificá tu internet e intentá de nuevo.');
                return;
            }

            setLoading(false); // Just in case, so it shows numbers during transition

            // Si es Tarjeta (BAC / NMI), abrir el modal y no finalizar aún
            // trackPurchase para NMI se dispara después de confirmar pago (en onPaymentSuccess)
            if (formData.metodoPago === 'nmi') {
                setOrderNumber(newOrderNumber);
                // Congelar valores al momento de abrir el modal — inmunes a re-renders
                const frozenTotal = getTotalWithShipping() + getPaymentMethodAdjustment('nmi');
                setNmiTotal(frozenTotal);
                setNmiDocId(orderRefId);
                setNmiRequestId(`${orderRefId}-${Date.now()}`);
                setShowNMIModal(true);
                setLoading(false);
                return;
            }

            // Para SINPE, WhatsApp o Transferencia, abrimos WhatsApp PRIMERO (antes de limpiar el carrito)
            if (['whatsapp', 'sinpe', 'transfer'].includes(formData.metodoPago)) {
                // Formatear items para WhatsApp
                const itemsLines = cart.map(item => {
                    const lineTotal = (Number(item.price) || 0) * (Number(item.quantity) || 0);
                    const tags = [];
                    if (item.categoryLabel) tags.push(item.categoryLabel);
                    if (item.planLabel) tags.push(item.planLabel);
                    const tagStr = tags.length ? ` (${tags.join(' · ')})` : '';
                    const base = `• ${item.quantity}× ${item.name}${tagStr}`;
                    const extras = [];
                    if (Array.isArray(item.proteinas) && item.proteinas.length) {
                        extras.push(`   └ Proteínas: ${formatProteinList(item.proteinas)}`);
                    }
                    if (item.protein) extras.push(`   └ Proteína: ${item.protein}`);
                    // Sustituciones por plato — formato nuevo (3 categorías separadas)
                    if (Array.isArray(item.customizations?.proteinChanges)) {
                        item.customizations.proteinChanges.forEach(c =>
                            extras.push(`   └ 🍗 Plato ${c.dishNumber} (${c.dishName}) → ${c.newValue}`)
                        );
                    }
                    if (Array.isArray(item.customizations?.vegeChanges)) {
                        item.customizations.vegeChanges.forEach(c =>
                            extras.push(`   └ 🥦 Plato ${c.dishNumber} (${c.dishName}) → ${c.newValue}`)
                        );
                    }
                    if (Array.isArray(item.customizations?.carboChanges)) {
                        item.customizations.carboChanges.forEach(c =>
                            extras.push(`   └ 🍚 Plato ${c.dishNumber} (${c.dishName}) → ${c.newValue}`)
                        );
                    }
                    // Formato anterior: dishChanges unificado
                    if (Array.isArray(item.customizations?.dishChanges)) {
                        item.customizations.dishChanges.forEach(c =>
                            extras.push(`   └ 🍗 Plato ${c.dishNumber} (${c.dishName}) → ${c.newProtein || c.newValue}`)
                        );
                    }
                    // Formato legacy: categorías globales
                    if (item.customizations?.protein) extras.push(`   └ Proteína: ${item.customizations.protein}`);
                    if (item.customizations?.vegetal)  extras.push(`   └ Vegetal: ${item.customizations.vegetal}`);
                    if (item.customizations?.carbo)    extras.push(`   └ Carbo: ${item.customizations.carbo}`);
                    if (item.customizations?.notes) extras.push(`   └ Notas: ${item.customizations.notes}`);
                    extras.push(`   └ ₡${lineTotal.toLocaleString('es-CR')}`);
                    return [base, ...extras].join('\n');
                }).join('\n\n');

                let message = `🛒 *NUEVO PEDIDO ${newOrderNumber}*\n\n`;
                message += `━━━━━━━━━━━━━━━━━━━━\n`;
                message += `📦 *ITEMS DEL PEDIDO*\n\n`;
                message += `${itemsLines}\n\n`;
                message += `━━━━━━━━━━━━━━━━━━━━\n`;
                message += `💰 *RESUMEN*\n`;
                message += `Total: ₡${total.toLocaleString('es-CR')}\n\n`;
                message += `👤 *CLIENTE*: ${formData.nombre}\n`;
                message += `🚚 *ENTREGA*: ${formData.fechaEntrega}\n`;
                message += `💳 *PAGO*: ${formData.metodoPago.toUpperCase()}\n`;

                if (formData.observaciones) {
                    message += `📝 *NOTAS*: ${formData.observaciones}\n`;
                }

                const url = getWhatsAppUrl(message);
                window.open(url, '_blank');
            }

            // Finalizar orden (Notificaciones, Puntos, Limpiar Carrito)
            await handleOrderCompletion({
                orderNumber: newOrderNumber,
                docId: orderRefId
            });

        } catch (error) {
            console.error('Error creating order:', error);
            alert('Error al crear el pedido. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
    };

    /**
     * Centraliza la finalización de un pedido: 
     * - Envío de notificaciones (Admin y Cliente)
     * - Gestión de cupones y puntos
     * - Limpieza de estado local
     */
    const handleOrderCompletion = async (orderDetails) => {
        try {
            const currentOrderNumber = orderDetails.orderNumber || orderNumber;

            // Prevenir ejecución duplicada (idempotencia)
            if (isCompletingRef.current || orderComplete) {
                return;
            }
            isCompletingRef.current = true;

            const subtotal = getSubtotal();
            let discount = getDiscount();
            const shippingCost = getShippingCostFinal();
            const zoneInfo = getSelectedZoneInfo();
            const paymentAdj = getPaymentMethodAdjustment(formData.metodoPago);
            let total = getTotalWithShipping() + paymentAdj;
            const deliverySchedule = computeDeliverySchedule(formData.fechaEntrega);

            // Validar self-referral para cualquier usuario (guest o logueado)
            if (appliedReferral) {
                try {
                    const referralRef = doc(db, 'referral_codes', appliedReferral.code.toUpperCase());
                    const referralSnap = await getDoc(referralRef);
                    if (referralSnap.exists()) {
                        const referrerEmail = referralSnap.data().referrerEmail?.toLowerCase();
                        const customerEmail = (currentUser?.email || formData.correo)?.toLowerCase();
                        if (referrerEmail && customerEmail && referrerEmail === customerEmail) {
                            console.warn('[Checkout] Self-referral detectado. Cancelando descuento de referral.');
                            discount = getDiscount() - REFERRAL_DISCOUNT_CRC;
                            total = subtotal - discount + shippingCost;
                            // Corregir el documento ya guardado en Firestore
                            const selfReferralDocId = orderDetails.docId || pendingOrderDocId;
                            if (selfReferralDocId) {
                                try {
                                    await updateDoc(doc(db, 'pedidos', selfReferralDocId), {
                                        descuento: discount,
                                        total: total,
                                        referral_code: null,
                                        referral_uid: null
                                    });
                                } catch (e) {
                                    console.warn('[Checkout] No se pudo corregir descuento en Firestore:', e);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.warn('[Checkout] Error validando self-referral:', error);
                }
            }

            // 1. Obtener etiquetas legibles y datos finales (ya definidos arriba)
            const paymentMethodLabel = PAYMENT_METHODS.find(m => m.id === formData.metodoPago)?.name || formData.metodoPago;

            // 2. Preparar el objeto de datos UNIVERSAL para todos los correos
            const fullOrderData = {
                orderNumber: currentOrderNumber,
                cliente: formData.nombre,
                telefono: formData.telefono,
                correo: formData.correo,
                cedula: formData.cedula || 'N/A',
                items: [...cart], // Clonar para evitar cambios por referencia
                subtotal: subtotal,
                descuento: discount,
                cupon: appliedCoupon?.code || null,
                total: total,
                costoEnvio: getShippingCostFinal(),
                envioPorConfirmar: false,
                direccion: formData.direccion,
                ubicacionFueraCobertura: isZoneOutOfCoverage() ? formData.direccionFueraCobertura : null,
                referencias: formData.referencias || 'Sin referencias',
                zona: isZoneOutOfCoverage() ? 'Fuera de cobertura' : (zoneInfo?.name || 'No especificada'),
                fechasEntrega: deliverySchedule,
                metodoPago: paymentMethodLabel,
                transactionId: orderDetails?.paymentResult?.transactionid || orderDetails?.paymentResult?.id || orderDetails?.id || null,
                observaciones: formData.observaciones || 'Sin observaciones',
                fuente: 'Web App (Final)',
                orderDate: new Date().toLocaleDateString('es-CR')
            };

            // 1.5 Registrar/Actualizar cliente en el CRM
            try {
                await upsertClient({
                    nombre: formData.nombre,
                    telefono: formData.telefono,
                    correo: formData.correo,
                    direccion: formData.direccion
                });
            } catch (crmErr) {
                console.error('⚠️ Error detallado CRM:', crmErr);
            }

            // 1.6 Actualizar estado en Firestore si tenemos el ID del documento
            // Esto es CRUCIAL para que en el Admin salga como "confirmado" inmediatamente si es pago digital
            const docIdToUpdate = orderDetails.docId || pendingOrderDocId;
            

            if (docIdToUpdate) {
                try {
                    const orderRef = doc(db, 'pedidos', docIdToUpdate);
                    const updates = {
                        updatedAt: serverTimestamp()
                    };

                    // Si es tarjeta o PayPal, ya está pagado
                    if (['nmi', 'paypal', 'tilopay'].includes(formData.metodoPago)) {
                        updates.status = 'confirmed';
                        updates.paymentStatus = 'paid';
                        updates.paymentConfirmed = true;
                        if (orderDetails.paymentResult?.transactionid) {
                            updates.transactionId = orderDetails.paymentResult.transactionid;
                        }
                    } else {
                        // Para otros métodos, lo dejamos en pending_payment pero actualizamos el timestamp
                        updates.status = 'pending_payment';
                    }

                    await updateDoc(orderRef, updates);
                } catch (dbErr) {
                    console.error('⚠️ Error actualizando estado en Firestore:', dbErr);
                }
            }

            // 2. Enviar notificaciones por email (Admin y Cliente)
            let adminResult = null;
            let customerResult = null;
            try {
                const { sendOrderNotification, sendCustomerOrderConfirmation } = await import('../services/emailNotifications');

                // Admin (Gina) - Con logging detallado
                adminResult = await sendOrderNotification(fullOrderData);
                if (!adminResult?.success) {
                    console.warn(`⚠️ Fallo al enviar email a admin: ${adminResult?.error || 'Unknown error'}`);
                }

                // Cliente - Con logging detallado
                customerResult = await sendCustomerOrderConfirmation(fullOrderData);
                if (!customerResult?.success) {
                    console.warn(`⚠️ Fallo al enviar email a cliente: ${customerResult?.error || 'Unknown error'}`);
                }
            } catch (emailErr) {
                console.error('⚠️ Error crítico en notificaciones email:', emailErr);
                adminResult = { success: false, error: emailErr.message };
            }

            // 2b. Dejar rastro del envío en el pedido.
            // Sin esto, un correo que no sale sólo queda en la consola del cliente y
            // el admin no tiene forma de saber que la notificación nunca llegó.
            if (docIdToUpdate) {
                try {
                    await updateDoc(doc(db, 'pedidos', docIdToUpdate), {
                        // 'pending' = se mandó pero no llegó confirmación a tiempo; con
                        // keepalive lo más probable es que sí haya salido.
                        emailAdminStatus: adminResult?.success ? 'sent' : (adminResult?._pending ? 'pending' : 'failed'),
                        emailAdminError: adminResult?.success ? null : (adminResult?.error || 'Sin respuesta de EmailJS'),
                        emailClienteStatus: customerResult?.success ? 'sent' : (customerResult?._pending ? 'pending' : 'failed'),
                        emailClienteError: customerResult?.success ? null : (customerResult?.error || 'Sin respuesta de EmailJS'),
                        emailCheckedAt: new Date().toISOString()
                    });
                } catch (logErr) {
                    console.warn('[Checkout] No se pudo guardar el estado del correo:', logErr.message);
                }
            }

            // 3. Puntos de fidelidad se otorgan cuando el admin confirma la orden (ver OrdersContext.updateOrderStatus)
            // Los puntos ya NO se dan en checkout, solo cuando admin cambia status a 'confirmed'

            // 4. Marcar cupón como usado
            if (appliedCoupon) {
                try {
                    await markCouponAsUsed(currentUser?.uid || formData.correo);
                } catch (couponErr) {
                    console.error('⚠️ Error al marcar cupón:', couponErr);
                }
            }

            // 4b. Marcar que el usuario usó un código de referido (para evitar reutilización)
            if (appliedReferral && currentUser?.uid) {
                try {
                    await updateDoc(doc(db, 'users', currentUser.uid), {
                        hasUsedReferral: true
                    });
                } catch (refMarkErr) {
                    console.warn('⚠️ No se pudo marcar hasUsedReferral:', refMarkErr);
                }
            }

            // 5. Guardar en historial local
            addOrderToHistory({
                orderNumber: currentOrderNumber,
                items: cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price
                })),
                subtotal,
                discount,
                shippingCost,
                shippingZone: zoneInfo?.name || null,
                coupon: appliedCoupon?.code || null,
                total,
                customerName: formData.nombre,
                customerPhone: formData.telefono,
                customerEmail: formData.correo,
                address: formData.direccion,
                deliveryDate: formData.fechaEntrega,
                deliveryTime: '9:00 AM - 2:00 PM',
                paymentMethod: formData.metodoPago
            });

            // 6. Guardar snapshot para la vista de éxito
            setLastOrderDetails({
                items: [...cart],
                total: total,
                subtotal: subtotal,
                descuento: discount,
                costoEnvio: shippingCost,
                envioPorConfirmar: false,
                cupon: appliedCoupon?.code,
                zoneName: zoneInfo?.name
            });

            // 7. Finalizar UI
            setOrderNumber(currentOrderNumber);
            setOrderComplete(true);
            clearCart();

            // Limpiar sessionStorage de pedido pendiente (evita reutilización en nueva orden)
            sessionStorage.removeItem('bk_pending_order_id');
            setPendingOrderDocId(null);

            // Limpiar datos del formulario de localStorage
            localStorage.removeItem('bikitchen-checkout-form');

        } catch (error) {
            console.error('❌ Error crítico en handleOrderCompletion:', error);
            // Mostrar éxito de todos modos si el pedido ya está en DB
            setOrderComplete(true);
        } finally {
            isCompletingRef.current = false;
        }
    };

    const handleClose = () => {
        if (orderComplete) {
            setOrderComplete(false);
            setCurrentStep(1);
            const emptyForm = {
                nombre: '', telefono: '', correo: '', cedula: '',
                direccion: '', referencias: '', fechaEntrega: '',
                direccionFueraCobertura: '',
                metodoPago: 'whatsapp', observaciones: ''
            };
            setFormData(emptyForm);
            // Limpiar localStorage después de completar pedido
            localStorage.removeItem('bikitchen-checkout-form');
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-bikitchen-orange to-orange-500 p-4 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Finalizar Pedido</h2>
                            <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Progress Steps */}
                        {!orderComplete && (
                            <div className="flex items-center justify-between">
                                {STEPS.map((step, index) => (
                                    <div key={step.id} className="flex items-center">
                                        <div className={`flex flex-col items-center ${index > 0 ? 'ml-2' : ''}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep > step.id
                                                ? 'bg-white text-bikitchen-orange'
                                                : currentStep === step.id
                                                    ? 'bg-white text-bikitchen-orange'
                                                    : 'bg-white/30 text-white'
                                                }`}>
                                                {currentStep > step.id ? (
                                                    <Check size={20} />
                                                ) : (
                                                    <step.icon size={20} />
                                                )}
                                            </div>
                                            <span className={`text-xs mt-1 ${currentStep >= step.id ? 'text-white' : 'text-white/60'}`}>
                                                {step.name}
                                            </span>
                                        </div>
                                        {index < STEPS.length - 1 && (
                                            <div className={`w-8 h-0.5 mx-1 mt-[-16px] ${currentStep > step.id ? 'bg-white' : 'bg-white/30'
                                                }`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <AnimatePresence mode="wait">
                            {orderComplete ? (
                                <motion.div
                                    key="complete"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="text-center py-6"
                                >
                                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Clock size={32} className="text-orange-500" />
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                        ¡Pedido Recibido!
                                    </h3>

                                    {/* Estado del pedido */}
                                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${formData.metodoPago === 'nmi' && orderComplete
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${formData.metodoPago === 'nmi' && orderComplete
                                                ? 'bg-green-500'
                                                : 'bg-orange-500 animate-pulse'
                                            }`}></div>
                                        {formData.metodoPago === 'nmi' && orderComplete ? 'Pago Procesado' : 'Pendiente de pago'}
                                    </div>

                                    {/* Número de orden prominente */}
                                    <div className="bg-gray-900 text-white rounded-2xl p-5 mb-4 mx-auto max-w-xs">
                                        <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider">
                                            Tu número de orden
                                        </p>
                                        <p className="text-3xl font-mono font-bold text-bikitchen-orange">
                                            {orderNumber}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-2">
                                            📋 Guarda este número para confirmar tu pago
                                        </p>
                                    </div>

                                    {/* Instrucciones de pago según método */}
                                    {formData.metodoPago === 'sinpe' && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-left">
                                            <p className="text-sm font-semibold text-blue-800 mb-3">
                                                📱 SINPE Móvil
                                            </p>
                                            <div className="space-y-3">
                                                <div className="bg-white rounded-lg p-3">
                                                    <p className="text-xs text-gray-500 mb-1">Opción 1:</p>
                                                    <p className="text-xl font-mono font-bold text-gray-900">8831-7663</p>
                                                    <p className="text-xs text-gray-500 mt-1">Nombre: Gina Marozzi Li</p>
                                                </div>
                                                <div className="bg-white rounded-lg p-3">
                                                    <p className="text-xs text-gray-500 mb-1">Opción 2:</p>
                                                    <p className="text-xl font-mono font-bold text-gray-900">8831-1500</p>
                                                    <p className="text-xs text-gray-500 mt-1">Nombre: Gabriela Li Carmona</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3 mt-3">
                                                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                                <p className="text-xs text-amber-900">
                                                    Estos números son <span className="font-bold">solo para hacer el pago</span>.
                                                    No mandes el comprobante ahí — enviálo con el botón verde de abajo,
                                                    o a nuestro WhatsApp <span className="font-bold">{formatWhatsAppDisplay(whatsappPhone || WHATSAPP_PHONE)}</span>.
                                                </p>
                                            </div>

                                            <p className="text-xs text-gray-600 mt-3 mb-3">
                                                Incluye tu número de orden <span className="font-bold">{orderNumber}</span> en la descripción del SINPE
                                            </p>
                                            <a
                                                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Acabo de hacer el SINPE para mi pedido ${orderNumber} ✅\n\n${generateOrderSummary()}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                                            >
                                                <MessageSquare size={20} />
                                                Enviar comprobante con Detalle
                                            </a>
                                        </div>
                                    )}

                                    {formData.metodoPago === 'transfer' && (
                                        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4 text-left">
                                            <p className="text-sm font-semibold text-purple-800 mb-3">
                                                🏦 Transferencia Bancaria
                                            </p>

                                            {/* BAC */}
                                            <div className="bg-white rounded-lg p-3 mb-3 space-y-2">
                                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                                    <span className="font-bold text-red-600 text-sm">BAC Credomatic</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">A nombre de:</p>
                                                    <p className="font-semibold text-gray-900 text-sm">Gabriela Li Carmona</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Cuenta BAC:</p>
                                                    <p className="font-mono text-sm font-bold text-gray-900">940987399</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">IBAN:</p>
                                                    <p className="font-mono text-sm font-bold text-gray-900 break-all">CR22010200009409873999</p>
                                                </div>
                                            </div>

                                            {/* Mutual Alajuela */}
                                            <div className="bg-white rounded-lg p-3 mb-3 space-y-2">
                                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                                    <span className="font-bold text-orange-600 text-sm">Mutual Alajuela</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">A nombre de:</p>
                                                    <p className="font-semibold text-gray-900 text-sm">Gabriela Li Carmona</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Cuenta:</p>
                                                    <p className="font-mono text-sm font-bold text-gray-900">112-100-100214947</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">IBAN:</p>
                                                    <p className="font-mono text-sm font-bold text-gray-900 break-all">CR07080312001002149474</p>
                                                </div>
                                            </div>

                                            <p className="text-xs text-gray-600 mb-3">
                                                Incluye tu número de orden <span className="font-bold">{orderNumber}</span> en la descripción
                                            </p>
                                            <a
                                                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Acabo de hacer la transferencia para mi pedido ${orderNumber} ✅\n\n${generateOrderSummary()}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                                            >
                                                <MessageSquare size={20} />
                                                Enviar comprobante con Detalle
                                            </a>
                                        </div>
                                    )}

                                    {formData.metodoPago === 'whatsapp' && (
                                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left">
                                            <p className="text-sm font-semibold text-green-800 mb-2">
                                                💬 Coordinar por WhatsApp
                                            </p>
                                            <p className="text-sm text-green-700 mb-3">
                                                Te ayudaremos a coordinar el método de pago que prefieras.
                                            </p>
                                            <a
                                                href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Quiero coordinar el pago de mi pedido ${orderNumber} 💳\n\n${generateOrderSummary()}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
                                            >
                                                <MessageSquare size={20} />
                                                Abrir WhatsApp con Detalle
                                            </a>
                                        </div>
                                    )}

                                    {/* Puntos pendientes */}
                                    {pointsEarned > 0 && (
                                        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 mb-4">
                                            <p className="text-xs text-gray-600">
                                                ⏳ Al confirmar tu pago ganarás
                                            </p>
                                            <p className="text-lg font-bold text-yellow-600">
                                                +{pointsEarned} puntos
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleClose}
                                        className="w-full bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
                                    >
                                        Cerrar
                                    </button>
                                </motion.div>
                            ) : (
                                <>
                                    {/* Step 1: Datos Personales */}
                                    {currentStep === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                                Datos Personales
                                            </h3>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Nombre Completo *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.nombre}
                                                    onChange={(e) => updateField('nombre', e.target.value)}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 ${errors.nombre ? 'border-red-500' : 'border-gray-200'
                                                        }`}
                                                    placeholder="Ej: María González"
                                                />
                                                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Teléfono *
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={formData.telefono}
                                                    onChange={(e) => updateField('telefono', e.target.value)}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 ${errors.telefono ? 'border-red-500' : 'border-gray-200'
                                                        }`}
                                                    placeholder="Ej: 8888-8888"
                                                />
                                                {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Correo Electrónico *
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.correo}
                                                    onChange={(e) => updateField('correo', e.target.value)}
                                                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 ${errors.correo ? 'border-red-500' : 'border-gray-200'
                                                        }`}
                                                    placeholder="correo@ejemplo.com"
                                                />
                                                {errors.correo && <p className="text-red-500 text-xs mt-1">{errors.correo}</p>}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Cédula (opcional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.cedula}
                                                    onChange={(e) => updateField('cedula', e.target.value)}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                                    placeholder="Para factura electrónica"
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 2: Entrega */}
                                    {currentStep === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                                Datos de Entrega
                                            </h3>

                                            {/* Selector de Zona de Envío - Componente Visual Mejorado */}
                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                                                        <Truck size={16} className="text-white" />
                                                    </div>
                                                    Zona de Entrega *
                                                </label>

                                                <ShippingZoneSelector
                                                    selectedZone={selectedZone}
                                                    onZoneChange={updateShippingZone}
                                                    error={errors.zona}
                                                />

                                                {errors.zona && (
                                                    <div className="flex items-center gap-2 mt-2 text-red-600">
                                                        <AlertCircle size={14} />
                                                        <p className="text-sm font-medium">{errors.zona}</p>
                                                    </div>
                                                )}

                                                {/* Mostrar costo de envío seleccionado */}
                                                {selectedZone && getSelectedZoneInfo() && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={`mt-3 p-4 rounded-2xl shadow-sm ${isZoneOutOfCoverage()
                                                            ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-300'
                                                            : 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300'
                                                            }`}
                                                    >
                                                        {isZoneOutOfCoverage() ? (
                                                            <div className="space-y-3">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center flex-shrink-0">
                                                                        <AlertCircle size={16} className="text-white" />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-bold text-yellow-900">Zona fuera de cobertura directa</p>
                                                                        <p className="text-xs text-yellow-800 mt-1 leading-relaxed">
                                                                            Escribe tu ubicación exacta y te confirmaremos disponibilidad
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-sm font-semibold text-yellow-900 mb-2">
                                                                        📍 ¿Dónde te encuentras? *
                                                                    </label>
                                                                    <input
                                                                        type="text"
                                                                        value={formData.direccionFueraCobertura}
                                                                        onChange={(e) => updateField('direccionFueraCobertura', e.target.value)}
                                                                        className="w-full px-4 py-3 text-base border-2 border-yellow-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-500/30 bg-white shadow-sm"
                                                                        placeholder="Ej: San Carlos, Ciudad Quesada"
                                                                        style={{ fontSize: '16px' }}
                                                                    />
                                                                    {errors.direccionFueraCobertura && (
                                                                        <div className="flex items-center gap-2 mt-2 text-red-600">
                                                                            <AlertCircle size={14} />
                                                                            <p className="text-sm font-medium">{errors.direccionFueraCobertura}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                                                                        <Truck size={18} className="text-white" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-green-700 font-medium">Costo de envío</p>
                                                                        <p className="text-lg font-black text-green-900">
                                                                            ₡{getShippingCostFinal().toLocaleString('es-CR')}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                                                    <CheckCircle size={24} className="text-green-600" />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )}
                                            </div>

                                            {/* Direcciones guardadas */}
                                            {hasAddresses && !useNewAddress ? (
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Selecciona una dirección guardada
                                                    </label>
                                                    <AddressSelector
                                                        addresses={addresses}
                                                        selectedId={selectedAddressId}
                                                        onSelect={(addr) => {
                                                            setSelectedAddressId(addr.id);
                                                            updateField('direccion', addr.direccion);
                                                            updateField('referencias', addr.referencias || '');
                                                        }}
                                                        onAddNew={() => setUseNewAddress(true)}
                                                    />
                                                    {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>}
                                                </div>
                                            ) : (
                                                <>
                                                    {hasAddresses && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setUseNewAddress(false)}
                                                            className="text-sm text-bikitchen-orange font-medium hover:underline flex items-center gap-1"
                                                        >
                                                            <Bookmark size={14} />
                                                            Usar dirección guardada
                                                        </button>
                                                    )}

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Dirección de Entrega *
                                                        </label>
                                                        <textarea
                                                            value={formData.direccion}
                                                            onChange={(e) => updateField('direccion', e.target.value)}
                                                            rows={2}
                                                            className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20 ${errors.direccion ? 'border-red-500' : 'border-gray-200'
                                                                }`}
                                                            placeholder="Dirección completa con señas"
                                                        />
                                                        {errors.direccion && <p className="text-red-500 text-xs mt-1">{errors.direccion}</p>}
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Referencias (opcional)
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={formData.referencias}
                                                            onChange={(e) => updateField('referencias', e.target.value)}
                                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                                            placeholder="Ej: Portón negro, casa esquinera"
                                                        />
                                                    </div>

                                                    {/* Opción para guardar */}
                                                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-xl">
                                                        <div
                                                            onClick={() => setSaveNewAddress(!saveNewAddress)}
                                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${saveNewAddress
                                                                ? 'bg-bikitchen-orange border-bikitchen-orange'
                                                                : 'border-gray-300'
                                                                }`}
                                                        >
                                                            {saveNewAddress && <Check size={12} className="text-white" />}
                                                        </div>
                                                        <span className="text-sm text-gray-700">
                                                            Guardar esta dirección para futuros pedidos
                                                        </span>
                                                    </label>
                                                </>
                                            )}

                                            <div>
                                                <label className="flex items-center gap-2 text-sm font-black text-gray-800 mb-4 uppercase tracking-widest">
                                                    <Calendar size={18} className="text-orange-600" />
                                                    Día de Entrega
                                                </label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {getNextDeliveryDates(blockedDeliveryDates).map((dateObj) => (
                                                        <button
                                                            key={dateObj.value}
                                                            type="button"
                                                            onClick={() => updateField('fechaEntrega', dateObj.value)}
                                                            className={`relative p-3 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 overflow-hidden group ${formData.fechaEntrega === dateObj.value
                                                                ? 'border-orange-600 bg-orange-600 shadow-lg shadow-orange-100'
                                                                : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            {formData.fechaEntrega === dateObj.value && (
                                                                // Sin layoutId: la animación compartida de Framer crea una capa de
                                                                // GPU persistente que puede colgar iOS Safari dentro del checkout.
                                                                <div
                                                                    className="absolute inset-0 bg-gradient-to-br from-orange-500 to-orange-600"
                                                                    aria-hidden="true"
                                                                />
                                                            )}
                                                            <p className={`relative z-10 text-[10px] font-black uppercase tracking-widest ${formData.fechaEntrega === dateObj.value ? 'text-orange-100' : 'text-gray-400'}`}>
                                                                {dateObj.dayName.substring(0, 3)}
                                                            </p>
                                                            <p className={`relative z-10 text-xl font-black ${formData.fechaEntrega === dateObj.value ? 'text-white' : 'text-gray-900'}`}>
                                                                {dateObj.dayNumber}
                                                            </p>
                                                            <p className={`relative z-10 text-[10px] font-bold ${formData.fechaEntrega === dateObj.value ? 'text-orange-100' : 'text-gray-500'}`}>
                                                                {dateObj.month.toUpperCase()}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                                {errors.fechaEntrega && <p className="text-red-500 text-xs mt-2 font-bold">{errors.fechaEntrega}</p>}
                                            </div>

                                            {/* Horario de entrega - Info fija */}
                                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <Truck size={20} className="text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-blue-900">Horario de entrega</p>
                                                        <p className="text-sm text-blue-700 mt-1">
                                                            <span className="font-semibold">9:00 AM - 2:00 PM</span>
                                                        </p>
                                                        <p className="text-xs text-blue-600 mt-1">
                                                            Según recorrido del repartidor. Te contactaremos antes de llegar.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 3: Pago */}
                                    {currentStep === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                                Método de Pago
                                            </h3>

                                            <div className="space-y-3">
                                                {PAYMENT_METHODS
                                                    .map((method) => (
                                                        <button
                                                            key={method.id}
                                                            type="button"
                                                            onClick={() => !method.disabled && updateField('metodoPago', method.id)}
                                                            disabled={method.disabled}
                                                            className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 relative ${method.disabled
                                                                ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                                                                : formData.metodoPago === method.id
                                                                    ? method.id === 'nmi'
                                                                        ? 'border-orange-500 bg-orange-50/50 shadow-lg shadow-orange-100'
                                                                        : 'border-bikitchen-orange bg-bikitchen-orange/5 shadow-md shadow-orange-50'
                                                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 shadow-sm'
                                                                }`}
                                                        >
                                                            {method.recommended && (
                                                                <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-green-500 to-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10 uppercase tracking-wider">
                                                                    Recomendado
                                                                </span>
                                                            )}
                                                            {method.comingSoon && (
                                                                <span className="absolute -top-2 right-3 bg-gray-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                                                    Próximamente
                                                                </span>
                                                            )}
                                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${method.disabled ? 'bg-gray-100 text-gray-400' :
                                                                method.color === 'green' ? 'bg-green-100 text-green-600' :
                                                                    method.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                                                        method.color === 'purple' ? 'bg-purple-100 text-purple-600' :
                                                                            'bg-gray-100 text-gray-400'
                                                                }`}>
                                                                <method.icon size={24} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <p className={`font-semibold ${method.disabled ? 'text-gray-400' : 'text-gray-900'}`}>{method.name}</p>
                                                                    {method.id === 'nmi' && (
                                                                        <div className="flex items-center gap-2 opacity-90 group-hover:opacity-100 transition-all">
                                                                            <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/visa.svg" alt="Visa" className="h-[14px] w-auto" />
                                                                            <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/mastercard.svg" alt="MC" className="h-[18px] w-auto" />
                                                                            <img src="https://cdn.jsdelivr.net/gh/aaronfagan/svg-credit-card-payment-icons@master/flat/amex.svg" alt="Amex" className="h-[16px] w-auto" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className={`text-sm ${method.disabled ? 'text-gray-400' : 'text-gray-500'}`}>{method.description}</p>
                                                                {method.id === 'nmi' && formData.metodoPago === 'nmi' && (
                                                                    <motion.div
                                                                        initial={{ opacity: 0, y: 5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-green-600 uppercase tracking-tight"
                                                                    >
                                                                        <LucideLock size={10} strokeWidth={3} />
                                                                        <span>Pago 100% Seguro</span>
                                                                    </motion.div>
                                                                )}
                                                            </div>
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method.disabled
                                                                ? 'border-gray-300'
                                                                : formData.metodoPago === method.id
                                                                    ? 'border-bikitchen-orange bg-bikitchen-orange'
                                                                    : 'border-gray-300'
                                                                }`}>
                                                                {formData.metodoPago === method.id && !method.disabled && (
                                                                    <Check size={12} className="text-white" />
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}
                                            </div>

                                            {/* Aviso cuando el método de pago no aplica para algún descuento */}
                                            {getPaymentMethodAdjustment(formData.metodoPago) > 0 && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                                    <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                                                    <div className="text-sm text-amber-800">
                                                        <p className="font-semibold">Descuento no aplica con este método de pago</p>
                                                        <p className="text-xs mt-0.5">
                                                            Algunos packs tienen descuentos que no son válidos con este método. Total ajustado:{' '}
                                                            <strong>₡{(getTotalWithShipping() + getPaymentMethodAdjustment(formData.metodoPago)).toLocaleString('es-CR')}</strong>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Observaciones (opcional)
                                                </label>
                                                <textarea
                                                    value={formData.observaciones}
                                                    onChange={(e) => updateField('observaciones', e.target.value)}
                                                    rows={2}
                                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-bikitchen-orange/20"
                                                    placeholder="Alergias, preferencias, instrucciones especiales..."
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* Step 4: Confirmar */}
                                    {currentStep === 4 && (
                                        <motion.div
                                            key="step4"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <h3 className="text-lg font-bold text-gray-900 mb-4">
                                                Confirmar Pedido
                                            </h3>

                                            {/* Order Summary */}
                                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                    <ShoppingBag size={18} />
                                                    Resumen del Pedido
                                                </h4>
                                                <div className="space-y-3 max-h-48 overflow-y-auto">
                                                    {cart.map((item, index) => (
                                                        <div key={`${item.id || 'item'}-${index}`} className="space-y-1">
                                                            <div className="flex justify-between text-sm">
                                                                <span className="text-gray-600">
                                                                    {item.quantity}× {item.name}
                                                                </span>
                                                                <span className="font-medium text-gray-900">
                                                                    ₡{((item.price || 0) * item.quantity).toLocaleString('es-CR')}
                                                                </span>
                                                            </div>
                                                            {/* Sustituciones — todos los formatos */}
                                                            {(() => {
                                                                const c = item.customizations || {};
                                                                const lines = [];
                                                                // Formato nuevo
                                                                (c.proteinChanges || []).forEach(d => lines.push(`🍗 Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}`));
                                                                (c.vegeChanges    || []).forEach(d => lines.push(`🥦 Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}`));
                                                                (c.carboChanges   || []).forEach(d => lines.push(`🍚 Plato ${d.dishNumber} (${d.dishName}) → ${d.newValue}`));
                                                                // Formato anterior
                                                                (c.dishChanges    || []).forEach(d => lines.push(`🍗 Plato ${d.dishNumber} (${d.dishName}) → ${d.newProtein || d.newValue}`));
                                                                // Legacy global
                                                                if (c.vegetal)  lines.push(`🥦 Vegetal: ${c.vegetal}`);
                                                                if (c.carbo)    lines.push(`🍚 Carbo: ${c.carbo}`);
                                                                if (c.protein)  lines.push(`🍗 Proteína: ${c.protein}`);
                                                                if (lines.length === 0) return null;
                                                                return (
                                                                    <div className="text-xs text-orange-600 italic pl-4 space-y-0.5">
                                                                        {lines.map((l, i) => <div key={i}>{l}</div>)}
                                                                    </div>
                                                                );
                                                            })()}
                                                            {item.customizations?.notes && (
                                                                <div className="text-xs text-orange-600 italic pl-4">
                                                                    📝 {item.customizations.notes}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="border-t border-gray-200 pt-2 space-y-1">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-600">Subtotal productos</span>
                                                        <span>₡{getSubtotal().toLocaleString('es-CR')}</span>
                                                    </div>
                                                    {appliedCoupon && getDiscount() > 0 && (
                                                        <div className="flex justify-between text-sm text-green-600">
                                                            <span className="flex items-center gap-1">
                                                                <Tag size={12} />
                                                                {appliedCoupon.code}
                                                            </span>
                                                            <span>-₡{getDiscount().toLocaleString('es-CR')}</span>
                                                        </div>
                                                    )}
                                                    {/* Costo de envío */}
                                                    {selectedZone && getSelectedZoneInfo() && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-600 flex items-center gap-1">
                                                                <Truck size={12} />
                                                                Envío ({getSelectedZoneInfo()?.name?.split('/')?.[0]?.trim() ?? 'Envío'})
                                                            </span>
                                                            <span>₡{getShippingCostFinal().toLocaleString('es-CR')}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-200 mt-2">
                                                        <span>Total</span>
                                                        <span className="text-bikitchen-orange">
                                                            {`₡${(getTotalWithShipping() + getPaymentMethodAdjustment(formData.metodoPago)).toLocaleString('es-CR')}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Customer Info Summary */}
                                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                    <User size={18} />
                                                    Datos del Cliente
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-gray-500">Nombre:</span>
                                                        <p className="font-medium text-gray-900">{formData.nombre}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500">Teléfono:</span>
                                                        <p className="font-medium text-gray-900">{formData.telefono}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delivery Info Summary */}
                                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                                    <Truck size={18} />
                                                    Entrega
                                                </h4>
                                                {getSelectedZoneInfo() && (
                                                    <p className="text-sm">
                                                        <span className="font-medium text-gray-900">Zona:</span>
                                                        <span className="text-gray-600 ml-1">{getSelectedZoneInfo()?.name ?? '—'}</span>
                                                    </p>
                                                )}
                                                <p className="text-sm text-gray-600">{formData.direccion}</p>
                                                <p className="text-sm">
                                                    <span className="text-bikitchen-orange font-medium">{formData.fechaEntrega}</span>
                                                    <span className="text-gray-500"> • 9:00 AM - 2:00 PM</span>
                                                </p>
                                                {Array.isArray(formData.fechasEntrega) && formData.fechasEntrega.length > 1 && (
                                                    <div className="mt-2 text-sm">
                                                        <p className="font-medium text-gray-900">Entregas programadas</p>
                                                        <ul className="list-disc pl-5 text-gray-600">
                                                            {formData.fechasEntrega.map((d, idx) => (
                                                                <li key={d || `date-${idx}`}>{d} • 9:00 AM - 2:00 PM</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Payment Method */}
                                            <div className={`rounded-xl p-4 ${formData.metodoPago === 'paypal'
                                                ? 'bg-[#0070ba]/10 border-2 border-[#0070ba]'
                                                : 'bg-gray-50'
                                                }`}>
                                                <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-2">
                                                    <CreditCard size={18} />
                                                    Método de Pago
                                                </h4>
                                                <p className="text-sm text-gray-600 mb-3">
                                                    {PAYMENT_METHODS.find(m => m.id === formData.metodoPago)?.name}
                                                </p>

                                                {/* PayPal Smart Buttons */}
                                                {formData.metodoPago === 'paypal' && (
                                                    <div className="mt-4">
                                                        <PayPalButton
                                                            totalCRC={getTotalWithShipping()}
                                                            orderData={{
                                                                orderNumber: orderNumber || generateOrderNumber(),
                                                                cliente: formData.nombre,
                                                                items: cart
                                                            }}
                                                            onSuccess={handlePayPalSuccess}
                                                            onError={handlePayPalError}
                                                            onCancel={handlePayPalCancel}
                                                            disabled={loading}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Aviso para zona fuera de cobertura */}
                                            {isZoneOutOfCoverage() && (
                                                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
                                                    <div className="flex items-start gap-3">
                                                        <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-yellow-800">Confirmar disponibilidad de envío</p>
                                                            <p className="text-sm text-yellow-700 mt-1">
                                                                Tu zona <span className="font-medium">"{formData.direccionFueraCobertura}"</span> está fuera de nuestra cobertura directa.
                                                            </p>
                                                            <p className="text-sm text-yellow-700 mt-2">
                                                                Al confirmar, te enviaremos un mensaje por WhatsApp para verificar si podemos hacer el envío y el costo.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer */}
                    {!orderComplete && (
                        <div className="border-t border-gray-100 p-4 flex gap-3">
                            {currentStep > 1 && (
                                <button
                                    onClick={prevStep}
                                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                                >
                                    <ArrowLeft size={18} />
                                    Atrás
                                </button>
                            )}

                            {currentStep < 4 ? (
                                <button
                                    onClick={nextStep}
                                    className="flex-1 py-3 px-4 bg-bikitchen-orange text-white rounded-xl font-medium hover:bg-bikitchen-orange-dark transition-colors flex items-center justify-center gap-2"
                                >
                                    Siguiente
                                    <ArrowRight size={18} />
                                </button>
                            ) : formData.metodoPago === 'paypal' ? (
                                // Para PayPal, el botón está integrado arriba con el SDK
                                loading ? (
                                    <div className="flex-1 py-3 px-4 bg-[#0070ba] text-white rounded-xl font-medium flex items-center justify-center gap-2">
                                        <Loader2 size={18} className="animate-spin" />
                                        Procesando pago...
                                    </div>
                                ) : (
                                    <div className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 rounded-xl text-sm text-center">
                                        👆 Usa el botón de PayPal arriba para completar tu pago
                                    </div>
                                )
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading || cart.length === 0}
                                    className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <Check size={18} />
                                            Confirmar Pedido
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>
            {/* BAC (NMI) Payment Modal - Conditionally rendered to ensure fresh state */}
            {showNMIModal && (
                <NMIPaymentModal
                    isOpen={showNMIModal}
                    onClose={async () => { 
                        const orderIdToUpdate = nmiDocId || pendingOrderDocId;
                        if (orderIdToUpdate) {
                            try {
                                await updateDoc(doc(db, 'pedidos', orderIdToUpdate), {
                                    pendingReason: 'El cliente cerró la ventana de pago sin completar la transacción.',
                                    updatedAt: serverTimestamp()
                                });
                            } catch (e) {
                                console.error('[Checkout] Error saving close reason:', e);
                            }
                        }
                        setShowNMIModal(false); 
                        setNmiRequestId(null); 
                        setNmiDocId(null); 
                        setNmiTotal(0); 
                    }}
                    total={nmiTotal}
                    orderId={orderNumber}
                    requestId={nmiRequestId}
                    customerInfo={formData}
                    onPaymentValidationFailed={async (reason) => {
                        const orderIdToUpdate = nmiDocId || pendingOrderDocId;
                        if (orderIdToUpdate) {
                            try {
                                await updateDoc(doc(db, 'pedidos', orderIdToUpdate), {
                                    pendingReason: `Validación fallida: ${reason}`,
                                    updatedAt: serverTimestamp()
                                });
                            } catch (error) {}
                        }
                    }}
                    onPaymentError={async (errorData) => {
                        // Guardar el error de pago en Firestore — nmiDocId capturado sincrónicamente
                        const orderIdToUpdate = nmiDocId || pendingOrderDocId;
                        if (orderIdToUpdate) {
                            try {
                                await updateDoc(doc(db, 'pedidos', orderIdToUpdate), {
                                    status: 'payment_failed',
                                    paymentStatus: 'failed',
                                    paymentError: errorData.errorMessage,
                                    isPaymentError: true,
                                    paymentErrorAt: serverTimestamp(),
                                    updatedAt: serverTimestamp()
                                });
                            } catch (error) {
                                console.error('[Checkout] Error guardando error de pago:', error);
                            }
                        }
                    }}
                    onSwitchToSinpe={async () => {
                        const orderIdToUpdate = nmiDocId || pendingOrderDocId;
                        setShowNMIModal(false);
                        setFormData(prev => ({ ...prev, metodoPago: 'sinpe' }));
                        
                        if (orderIdToUpdate) {
                            try {
                                await updateDoc(doc(db, 'pedidos', orderIdToUpdate), {
                                    metodo_pago: 'sinpe',
                                    details: { ...formData, paymentMethod: 'sinpe' },
                                    pendingReason: 'Cambio a SINPE tras rechazo de tarjeta',
                                    updatedAt: serverTimestamp()
                                });
                                // Llamar a handleOrderCompletion para mostrar pantalla de éxito SINPE
                                await handleOrderCompletion({
                                    orderNumber: orderNumber,
                                    docId: orderIdToUpdate,
                                    metodoPago: 'sinpe'
                                });
                            } catch (error) {
                                console.error('[Checkout] Error switching to SINPE:', error);
                            }
                        }
                    }}
                    onPaymentSuccess={async (nmiResult) => {
                        // 1. Obtener el ID del pedido — nmiDocId está capturado sincrónicamente al abrir el modal
                        const orderIdToUpdate = nmiDocId || pendingOrderDocId;


                        // 2. Actualizar el pedido en Firestore a 'confirmed' y 'paid'
                        // Esto AUTOMÁTICAMENTE otorgará los puntos en OrdersContext
                        let firestoreOk = false;
                        try {
                            if (orderIdToUpdate) {
                                await updateOrderStatus(orderIdToUpdate, 'confirmed', {
                                    paymentStatus: 'paid',
                                    paymentProvider: 'Tarjeta',
                                    transactionId: nmiResult.transactionid || nmiResult.transaction_id || 'NMI',
                                    isDuplicateDetection: nmiResult.isDuplicate || false,
                                    paidAt: serverTimestamp(),
                                    updatedAt: serverTimestamp(),
                                    nmiDetails: stripUndefined(nmiResult)
                                });
                                firestoreOk = true;
                            }
                        } catch (error) {
                            console.error('[Checkout] ❌ Error actualizando pedido tras pago NMI:', error);
                            try {
                                // ¿El servidor (nmi-charge.js) ya otorgó los puntos de este pedido?
                                // Si sí, actualizamos el estado pero NO volvemos a sumarlos.
                                let alreadyAwarded = false;
                                try {
                                    const prevSnap = await getDoc(doc(db, 'pedidos', orderIdToUpdate));
                                    alreadyAwarded = prevSnap.exists() && prevSnap.data().pointsAwarded === true;
                                } catch {
                                    // Si no se puede leer, asumimos que ya se otorgaron:
                                    // es preferible no dar puntos a darlos dos veces.
                                    alreadyAwarded = true;
                                }

                                await updateDoc(doc(db, 'pedidos', orderIdToUpdate), {
                                    status: 'confirmed',
                                    paymentStatus: 'paid',
                                    paymentConfirmed: true,
                                    pointsAwarded: true,
                                    pointsAwardedAt: new Date().toISOString(),
                                    transactionId: nmiResult.transactionid || 'NMI',
                                    updatedAt: serverTimestamp()
                                });

                                // Award points in fallback
                                const pointsToAward = Math.floor((getTotalWithShipping() + getPaymentMethodAdjustment(formData.metodoPago)) * 0.02);
                                if (formData.correo && pointsToAward > 0 && !alreadyAwarded) {
                                    try {
                                        const pointsRef = doc(db, "loyalty", formData.correo.toLowerCase());
                                        const { increment, setDoc } = await import('firebase/firestore');
                                        await setDoc(pointsRef, {
                                            email: formData.correo.toLowerCase(),
                                            points: increment(pointsToAward),
                                            totalEarned: increment(pointsToAward),
                                            lastUpdated: new Date().toISOString()
                                        }, { merge: true });
                                    } catch (ptsErr) {
                                        console.error('[Checkout] Error saving points in fallback:', ptsErr);
                                    }
                                }
                                firestoreOk = true;
                            } catch (fallbackErr) {
                                console.error('[Checkout] ❌ Fallback también falló:', fallbackErr);
                                // El pago SÍ se realizó — alertar al equipo
                                alert(`Tu pago fue procesado exitosamente (ID: ${nmiResult.transactionid || 'NMI'}).\nContáctanos en WhatsApp para confirmar tu pedido #${orderIdToUpdate}.`);
                            }
                        }

                        // 3. Track Purchase real (solo una vez, cuando el banco confirmó)
                        try {
                            trackPurchase({ orderNumber, items: cart, total: getTotalWithShipping() + getPaymentMethodAdjustment(formData.metodoPago) });
                        } catch (e) { /* no bloquear si falla pixel */ }

                        // 4. Finalizar orden CENTRALIZADAMENTE
                        await handleOrderCompletion({
                            orderNumber: orderNumber,
                            docId: orderIdToUpdate,
                            metodoPago: 'nmi',
                            paymentResult: nmiResult
                        });

                        // 4. Cerrar el modal y limpiar estado de orden pendiente
                        setShowNMIModal(false);
                        sessionStorage.removeItem('bk_pending_order_id');
                        setPendingOrderDocId(null);
                        setNmiRequestId(null);
                        setNmiDocId(null);
                        setNmiTotal(0);
                    }}
                />
            )}
        </AnimatePresence>
    );
}
