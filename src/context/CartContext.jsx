import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { validateCoupon as validateCouponAPI, useCoupon } from '../utils/firestoreCoupons';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { trackAddToCart, trackInitiateCheckout } from '../services/facebookPixel';
import { useShippingDiscount } from './ShippingDiscountContext';
import { useAuth } from './AuthContext';
import { useShipping } from './ShippingContext';

const CartContext = createContext();

// Constante para descuento de referral — sincronizar en getDiscount() y en el toast
export const REFERRAL_DISCOUNT_CRC = 5000;

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try {
            const savedCart = localStorage.getItem('bikitchen-cart');
            if (!savedCart) return [];
            const parsed = JSON.parse(savedCart);
            // Sanity check: descartar items con precio no-positivo o cantidad inválida
            // (previene manipulación de localStorage)
            return Array.isArray(parsed)
                ? parsed.filter(item =>
                    item &&
                    typeof item.price === 'number' && item.price > 0 &&
                    typeof item.quantity === 'number' && item.quantity > 0
                )
                : [];
        } catch (error) {
            console.error('Error loading cart:', error);
            return [];
        }
    });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [notification, setNotification] = useState(null);

    // Estado del cupón
    const [appliedCoupon, setAppliedCoupon] = useState(() => {
        try {
            const savedCoupon = localStorage.getItem('bikitchen-coupon');
            return savedCoupon ? JSON.parse(savedCoupon) : null;
        } catch (error) {
            return null;
        }
    });
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState(null);

    // Estado de Referido
    const [appliedReferral, setAppliedReferral] = useState(() => {
        try {
            const savedReferral = localStorage.getItem('bikitchen-referral');
            return savedReferral ? JSON.parse(savedReferral) : null;
        } catch (error) {
            return null;
        }
    });
    const [referralLoading, setReferralLoading] = useState(false);
    const [referralError, setReferralError] = useState(null);

    // Estado de zona de envío
    const [selectedZone, setSelectedZone] = useState(() => {
        try {
            const savedZone = localStorage.getItem('bikitchen-shipping-zone');
            return savedZone || null;
        } catch (error) {
            return null;
        }
    });
    const [shippingDiscount, setShippingDiscount] = useState(0); // Porcentaje de descuento en envío
    const storageWarningShownRef = useRef(false);

    const { discountConfig } = useShippingDiscount();
    const { currentUser, isAdmin } = useAuth();
    const { getShippingCost: getStaticShippingCost, getZoneById, zoneRequiresContact, SHIPPING_ZONES } = useShipping();

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        try {
            localStorage.setItem('bikitchen-cart', JSON.stringify(cart));
        } catch (e) {
            if (cart.length > 0 && !storageWarningShownRef.current) {
                storageWarningShownRef.current = true;
                showNotification('Modo privado: el carrito no se guardará si recargas la página.', 'warning');
            }
        }
    }, [cart]);

    // Save referral to localStorage
    useEffect(() => {
        try {
            if (appliedReferral) {
                localStorage.setItem('bikitchen-referral', JSON.stringify(appliedReferral));
            } else {
                localStorage.removeItem('bikitchen-referral');
            }
        } catch (e) { /* private mode */ }
    }, [appliedReferral]);

    // Save shipping zone to localStorage
    useEffect(() => {
        try {
            if (selectedZone) {
                localStorage.setItem('bikitchen-shipping-zone', selectedZone);
            } else {
                localStorage.removeItem('bikitchen-shipping-zone');
            }
        } catch (e) { /* private mode */ }
    }, [selectedZone]);

    // Re-validar cupón cuando cambia el usuario (login/logout)
    useEffect(() => {
        const validateUserCoupon = async () => {
            if (!appliedCoupon) return;

            if (!currentUser) {
                // Siempre limpiar el cupón al hacer logout para que no pase a otro usuario
                setAppliedCoupon(null);
                return;
            }

            // Si el usuario se loguea y el cupón es de uso único, verificar si ya lo usó
            if (appliedCoupon.singleUsePerUser) {
                const result = await validateCouponAPI(appliedCoupon.code, getSubtotal(), currentUser.uid);
                if (!result.valid) {
                    setAppliedCoupon(null);
                    setCouponError(result.error);
                    showNotification(`Cupón removido: ${result.error}`, 'error');
                }
            }
        };

        validateUserCoupon();
    }, [currentUser]);

    // Calcular descuento de envío automáticamente basado en los planes del carrito
    // - 15 Comidas mensual: 100% descuento (GRATIS)
    // - Promoción con desayunos: 10% descuento
    // - Two Pack mensual: 10% descuento en envío
    // - Plan mensual (otros packs): 50% descuento
    // - Plan quincenal: 0% descuento (SIN DESCUENTO)
    // - Plan semanal: 0% descuento
    useEffect(() => {
        if (cart.length === 0) {
            setShippingDiscount(0);
            return;
        }

        // Si hay un descuento global activo, usar ese porcentaje
        // Pero mantener lógica específica si es mayor (ej: 100% gratis)
        let maxDiscount = discountConfig.enabled ? discountConfig.percentage : 0;

        cart.forEach(item => {
            const plan = item.plan?.toLowerCase() || '';
            const planLabel = item.planLabel?.toLowerCase() || '';
            const name = item.name?.toLowerCase() || '';
            const itemId = item.id?.toLowerCase() || '';
            const promoTitle = item.promoTitle?.toLowerCase() || '';

            // Campo explícito en el producto (más confiable que string matching)
            if (typeof item.shippingDiscountPct === 'number') {
                maxDiscount = Math.max(maxDiscount, item.shippingDiscountPct);
            }

            // 15 Comidas (Desayuno, Almuerzo y Cena) mensual: ENVÍO GRATIS (100%)
            if (plan === 'monthly' && (planLabel.includes('15') || (name.includes('desayuno') && name.includes('almuerzo') && name.includes('cena')))) {
                maxDiscount = 100; // Envío GRATIS
            }

            // Reglas acumulativas (se queda con el mayor descuento posible)

            // Promoción mensual con desayunos gratis: 10% descuento (NO aplica si es quincenal)
            if (plan !== 'biweekly' && (planLabel.includes('desayunos gratis') || promoTitle.includes('desayunos gratis') || name.includes('desayunos gratis'))) {
                maxDiscount = Math.max(maxDiscount, 10);
            }

            // Promoción mensual con 50% descuento envío
            if (planLabel.includes('50% envío') || (promoTitle.includes('50%') && promoTitle.includes('descuento'))) {
                maxDiscount = Math.max(maxDiscount, 50);
            }

            // Two Pack mensual: 10% base, pero si es mensual aplica la regla de 50% abajo
            if (plan === 'monthly' && itemId.includes('two_pack')) {
                maxDiscount = Math.max(maxDiscount, 10);
            }

            // REGLA GENERAL: Plan mensual (cualquier pack): 50% descuento en envío mínimo
            if (plan === 'monthly') {
                maxDiscount = Math.max(maxDiscount, 50);
            }

            // Plan quincenal y semanal: 0% descuento (SIN DESCUENTO)
        });

        // REGLA MAESTRA PARA ADMINS: Siempre 100% descuento en envío para pruebas
        if (isAdmin && isAdmin()) {
            maxDiscount = 100;
        }

        setShippingDiscount(maxDiscount);
    }, [cart, discountConfig]);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        // Duración de 10 segundos para móviles (10000ms)
        setTimeout(() => setNotification(null), 10000);
    };

    const dismissNotification = () => {
        setNotification(null);
    };

    const addToCart = (item) => {
        setCart(prevCart => {
            const existingIndex = prevCart.findIndex(
                cartItem => cartItem.id === item.id && cartItem.plan === item.plan
            );

            if (existingIndex >= 0) {
                const newCart = [...prevCart];
                newCart[existingIndex].quantity += (item.quantity || 1);
                return newCart;
            } else {
                return [...prevCart, { ...item, quantity: item.quantity || 1 }];
            }
        });

        // Track Facebook Pixel - AddToCart
        trackAddToCart(item);

        // Don't auto-open cart
        showNotification(`${item.name} se añadió al carrito`);
    };

    const removeFromCart = (id, plan) => {
        setCart(prevCart => prevCart.filter(item => !(item.id === id && item.plan === plan)));
    };

    const updateQuantity = (id, plan, quantity) => {
        if (quantity <= 0) {
            removeFromCart(id, plan);
            return;
        }
        setCart(prevCart =>
            prevCart.map(item =>
                item.id === id && item.plan === plan
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCart([]);
        setAppliedCoupon(null);
        setCouponError(null);
        setAppliedReferral(null);
        setReferralError(null);
        setSelectedZone(null);
        setShippingDiscount(0);
    };

    // Obtener costo de envío base (multiplicado por cantidad de envíos según plan)
    const getShippingCostBase = () => {
        if (!selectedZone) return 0;
        const costPerShipment = getStaticShippingCost(selectedZone);

        // Determinar cantidad de envíos según el plan del carrito
        let shipmentCount = 1; // Por defecto: 1 envío (semanal)

        cart.forEach(item => {
            const plan = item.plan?.toLowerCase() || '';

            if (plan === 'monthly') {
                shipmentCount = Math.max(shipmentCount, 4); // Mensual: 4 envíos
            } else if (plan === 'biweekly') {
                shipmentCount = Math.max(shipmentCount, 2); // Quincenal: 2 envíos
            }
            // Semanal: 1 envío (ya está por defecto)
        });

        return costPerShipment * shipmentCount;
    };

    // Obtener costo de envío con descuento aplicado
    const getShippingCostFinal = () => {
        // Si el producto de prueba está en el carrito, el envío es SIEMPRE 0.
        // Buscamos por ID, por nombre que contenga "PRUEBA" o por precio exacto de 100.
        const hasTestProduct = cart.some(item =>
            (item.id || '').toLowerCase().includes('test-nmi-prod') ||
            (item.name || '').toUpperCase().includes('PRUEBA') ||
            item.price === 100
        );

        // REGLA PARA ADMINS: Envío gratis siempre para facilitar pruebas en el dominio real
        const isUserAdmin = isAdmin && isAdmin();

        if (hasTestProduct || isUserAdmin) return 0;

        const baseCost = getShippingCostBase();
        if (baseCost === null || baseCost === 0) return baseCost;

        const discount = Math.round(baseCost * (shippingDiscount / 100));
        return baseCost - discount;
    };

    // Obtener información de la zona seleccionada
    const getSelectedZoneInfo = () => {
        if (!selectedZone) return null;
        return getZoneById(selectedZone);
    };

    // Verificar si la zona requiere contacto por WhatsApp
    const isZoneOutOfCoverage = () => {
        return zoneRequiresContact(selectedZone);
    };

    // Actualizar zona de envío
    const updateShippingZone = (zoneId) => {
        setSelectedZone(zoneId);
    };

    // Actualizar descuento de envío (para planes mensuales)
    const updateShippingDiscount = (percent) => {
        setShippingDiscount(percent);
    };

    const getTotalItems = () => {
        return cart.reduce((total, item) => total + item.quantity, 0);
    };

    // Subtotal sin descuento
    const getSubtotal = () => {
        return cart.reduce((total, item) => {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 0;
            return total + (price * quantity);
        }, 0);
    };

    // Calcular descuento (Cupones + Referidos)
    const getDiscount = () => {
        let totalDiscount = 0;
        const subtotal = getSubtotal();

        // Descuento de cupón
        if (appliedCoupon) {
            switch (appliedCoupon.type) {
                case 'percentage':
                    let d = Math.round(subtotal * (appliedCoupon.value / 100));
                    if (appliedCoupon.maxDiscount && d > appliedCoupon.maxDiscount) {
                        d = appliedCoupon.maxDiscount;
                    }
                    totalDiscount += d;
                    break;
                case 'fixed':
                    totalDiscount += appliedCoupon.value;
                    break;
                case 'free_shipping':
                    // Se maneja aparte
                    break;
            }
        }

        // Descuento de referido (₡5,000 fijo - Alineado con ReferidosPage.jsx)
        if (appliedReferral) {
            totalDiscount += REFERRAL_DISCOUNT_CRC;
        }

        return Math.min(totalDiscount, subtotal);
    };

    // Total con descuento aplicado (sin envío)
    const getTotalPrice = () => {
        return Math.max(0, getSubtotal() - getDiscount());
    };

    // Total final incluyendo envío
    const getTotalWithShipping = () => {
        const productTotal = getTotalPrice();
        const shippingCost = getShippingCostFinal();

        // Si el cupón es de envío gratis
        if (appliedCoupon?.type === 'free_shipping') {
            return productTotal;
        }

        return productTotal + (shippingCost || 0);
    };

    const getPaymentMethodAdjustment = (paymentMethod) => {
        if (!paymentMethod) return 0;
        return cart.reduce((adj, item) => {
            if (
                item.discountMetodos &&
                item.discountMetodos.length > 0 &&
                !item.discountMetodos.includes(paymentMethod) &&
                item.originalPrice &&
                item.originalPrice > item.price
            ) {
                adj += (item.originalPrice - item.price) * (Number(item.quantity) || 1);
            }
            return adj;
        }, 0);
    };

    // Aplicar cupón
    // userId es opcional - si se proporciona, se verifica si el usuario ya usó el cupón
    const applyCoupon = async (code, userId = null) => {
        setCouponLoading(true);
        setCouponError(null);

        // Deduplicación: prevenir re-aplicar el mismo cupón
        if (appliedCoupon?.code === code.trim().toUpperCase()) {
            setCouponLoading(false);
            setCouponError('Este cupón ya está aplicado');
            return { success: false, message: 'Este cupón ya está aplicado' };
        }

        try {
            const result = await validateCouponAPI(code, getSubtotal(), userId);

            if (result.valid) {
                setAppliedCoupon({
                    id: result.coupon.id,
                    code: result.coupon.code,
                    type: result.coupon.type,
                    value: result.coupon.value,
                    maxDiscount: result.coupon.maxDiscount,
                    discountText: result.discountText,
                    discount: result.discount,
                    singleUsePerUser: result.coupon.singleUsePerUser || false
                });
                showNotification(`¡Cupón "${code}" aplicado! ${result.discountText}`, 'success');
                return { success: true, message: result.discountText };
            } else {
                setCouponError(result.error);
                return { success: false, message: result.error };
            }
        } catch (error) {
            const errorMsg = 'Error al aplicar el cupón';
            setCouponError(errorMsg);
            return { success: false, message: errorMsg };
        } finally {
            setCouponLoading(false);
        }
    };

    // Remover cupón
    const removeCoupon = () => {
        setAppliedCoupon(null);
        setCouponError(null);
        showNotification('Cupón removido', 'success');
    };

    // Aplicar código de referido
    const applyReferralCode = async (code) => {
        if (!code) return { success: false, message: 'Ingresa un código' };

        setReferralLoading(true);
        setReferralError(null);

        try {
            const q = query(collection(db, 'referral_codes'), where('code', '==', code.toUpperCase().trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setReferralError('Código de referido no válido');
                return { success: false, message: 'Código no encontrado' };
            }

            const referralData = querySnapshot.docs[0].data();

            // No puedes referirte a ti mismo
            if (currentUser && referralData.uid === currentUser.uid) {
                setReferralError('No puedes usar tu propio código');
                return { success: false, message: 'No puedes usar tu propio código' };
            }

            // Verificar si el usuario ya usó un código de referido anteriormente
            if (currentUser) {
                try {
                    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userSnap.exists() && userSnap.data().hasUsedReferral) {
                        setReferralError('Ya usaste un código de referido antes');
                        return { success: false, message: 'Solo puedes usar un código de referido por cuenta' };
                    }
                } catch (e) {
                    // Si no se puede verificar, permitir continuar (no bloquear el checkout)
                    console.warn('[Cart] No se pudo verificar historial de referido:', e);
                }
            }

            setAppliedReferral({
                code: referralData.code,
                referrerUid: referralData.uid,
                referrerName: referralData.name
            });

            showNotification(`¡Código de referido aplicado! Descuento de ₡${REFERRAL_DISCOUNT_CRC.toLocaleString('es-CR')} activado.`, 'success');
            return { success: true };
        } catch (error) {
            console.error('Error applying referral:', error);
            setReferralError('Error al validar código');
            return { success: false, message: 'Error de conexión' };
        } finally {
            setReferralLoading(false);
        }
    };

    const removeReferral = () => {
        setAppliedReferral(null);
        setReferralError(null);
        showNotification('Código de referido removido', 'success');
    };

    // Marcar cupón como usado (llamar al completar pedido)
    // userId es opcional - si se proporciona, se registra en el array de usuarios que han usado el cupón
    const markCouponAsUsed = async (userId = null) => {
        if (appliedCoupon?.id) {
            await useCoupon(appliedCoupon.id, userId);
        }
    };

    const getWhatsAppMessage = () => {
        if (cart.length === 0) return '';

        let message = '🛒 *Pedido BiKitchen*\n\n';

        cart.forEach((item, index) => {
            message += `${index + 1}. *${item.name}*\n`;
            message += `   Plan: ${item.planLabel}\n`;
            message += `   Precio: ₡${(Number(item.price) || 0).toLocaleString('es-CR')}\n`;
            message += `   Cantidad: ${item.quantity}\n`;
            message += `   Subtotal: ₡${((Number(item.price) || 0) * (Number(item.quantity) || 0)).toLocaleString('es-CR')}\n\n`;
        });

        const subtotal = getSubtotal();
        const discount = getDiscount();
        const shippingCost = getShippingCostFinal();
        const zoneInfo = getSelectedZoneInfo();

        if (appliedCoupon && discount > 0) {
            message += `Subtotal: ₡${subtotal.toLocaleString('es-CR')}\n`;
            message += `🎟️ Cupón (${appliedCoupon.code}): -₡${discount.toLocaleString('es-CR')}\n`;
        }

        // Agregar información de envío
        if (zoneInfo) {
            message += `\n🚚 *Zona de entrega:* ${zoneInfo.name}\n`;
            if (shippingCost !== null && shippingCost > 0) {
                message += `   Costo de envío: ₡${shippingCost.toLocaleString('es-CR')}\n`;
            } else if (shippingCost === null) {
                message += `   Costo de envío: Por confirmar\n`;
            }
        }

        message += `\n*Total: ₡${getTotalWithShipping().toLocaleString('es-CR')}*`;

        if (appliedCoupon) {
            message += ` (con cupón ${appliedCoupon.code})`;
        }

        message += '\n\n¿Podrían confirmar mi pedido? Gracias! 😊';

        return encodeURIComponent(message);
    };

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                getTotalItems,
                getSubtotal,
                getDiscount,
                getTotalPrice,
                getTotalWithShipping,
                getPaymentMethodAdjustment,
                getWhatsAppMessage,
                isCartOpen,
                setIsCartOpen,
                notification,
                showNotification,
                // Cupones
                appliedCoupon,
                couponLoading,
                couponError,
                applyCoupon,
                removeCoupon,
                markCouponAsUsed,
                // Envío
                selectedZone,
                shippingDiscount,
                updateShippingZone,
                updateShippingDiscount,
                getShippingCostBase,
                getShippingCostFinal,
                getSelectedZoneInfo,
                isZoneOutOfCoverage,
                SHIPPING_ZONES,
                // Referidos
                appliedReferral,
                referralLoading,
                referralError,
                applyReferralCode,
                removeReferral,
                dismissNotification
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
