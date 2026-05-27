import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, Check } from 'lucide-react';
import { getBannerCoupon } from '../utils/firestoreCoupons';
import { useChristmas } from '../context/ChristmasContext';

/**
 * Banner promocional dinámico
 * Muestra el cupón configurado con showInBanner: true desde Firebase
 */
export default function PromoBanner() {
    const { isChristmasMode } = useChristmas();
    const [coupon, setCoupon] = useState(null);
    // Estado para controlar si ya se cerró el banner para ESTE cupón específico
    const [dismissed, setDismissed] = useState(false);

    // Cargar cupón con banner activo
    useEffect(() => {
        const loadBannerCoupon = async () => {
            const bannerCoupon = await getBannerCoupon();
            setCoupon(bannerCoupon);

            // Verificar si este cupón específico ya fue descartado
            if (bannerCoupon) {
                const isDismissed = sessionStorage.getItem(`promo_dismissed_${bannerCoupon.id}`) === 'true';
                setDismissed(isDismissed);

                // Emitir evento
                window.dispatchEvent(new CustomEvent('promoBannerChange', {
                    detail: { visible: bannerCoupon.showInBanner && !isDismissed }
                }));
            }
        };
        loadBannerCoupon();
    }, []); // Cargar al montar


    const bannerRef = React.useRef(null);

    // Emitir evento cuando cambia el estado del banner
    useEffect(() => {
        const isVisible = !!coupon && coupon.showInBanner && !dismissed;
        window.dispatchEvent(new CustomEvent('promoBannerChange', {
            detail: { visible: isVisible }
        }));
    }, [coupon, dismissed]);

    // Calcular altura y actualizar variable CSS
    useEffect(() => {
        const updateHeight = () => {
            if (bannerRef.current) {
                const height = bannerRef.current.offsetHeight;
                document.documentElement.style.setProperty('--promo-banner-height', `${height}px`);
            } else {
                document.documentElement.style.removeProperty('--promo-banner-height');
            }
        };

        // Actualizar al montar y cuando cambie el cupón
        updateHeight();

        // Observer para cambios de tamaño
        const resizeObserver = new ResizeObserver(updateHeight);
        if (bannerRef.current) {
            resizeObserver.observe(bannerRef.current);
        }

        window.addEventListener('resize', updateHeight);

        return () => {
            window.removeEventListener('resize', updateHeight);
            resizeObserver.disconnect();
            document.documentElement.style.removeProperty('--promo-banner-height');
        };
    }, [coupon, dismissed]);

    const handleDismiss = () => {
        if (coupon?.id) {
            setDismissed(true);
            sessionStorage.setItem(`promo_dismissed_${coupon.id}`, 'true');
            // Emitir evento inmediatamente
            window.dispatchEvent(new CustomEvent('promoBannerChange', {
                detail: { visible: false }
            }));
        }
    };

    const handleCopyCode = async () => {
        if (coupon?.code) {
            try {
                await navigator.clipboard.writeText(coupon.code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Error copying code:', err);
            }
        }
    };

    // No mostrar si no hay cupón, está cerrado, o no tiene banner activo
    if (!coupon || dismissed || !coupon.showInBanner) return null;

    // Generar mensaje del banner
    const getMessage = () => {
        if (coupon.bannerMessage) {
            return coupon.bannerMessage;
        }
        // Mensaje por defecto basado en el tipo de cupón
        switch (coupon.type) {
            case 'percentage':
                return `Código: ${coupon.code} = ${coupon.value}% OFF`;
            case 'fixed':
                return `Código: ${coupon.code} = ₡${coupon.value.toLocaleString('es-CR')} OFF`;
            case 'free_shipping':
                return `Código: ${coupon.code} = Envío Gratis`;
            default:
                return `Código: ${coupon.code}`;
        }
    };

    // Color de fondo del banner
    const bgColor = isChristmasMode ? '#dc2626' : (coupon.bannerBgColor || '#f97316');

    return (
        <motion.div
            ref={bannerRef}
            data-promo-banner="true"
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 py-1.5 px-3 text-center shadow-lg"
            style={{
                backgroundColor: bgColor,
                color: coupon.bannerTextColor || '#ffffff'
            }}
        >
            <div className="container flex items-center justify-center gap-2 pr-8">
                <span className="text-sm">{coupon.bannerEmoji || '🎉'}</span>
                <p className="text-[11px] md:text-xs font-medium">
                    {getMessage().split(coupon.code).map((part, index, array) => (
                        <React.Fragment key={index}>
                            {part}
                            {index < array.length - 1 && (
                                <button
                                    onClick={handleCopyCode}
                                    className="inline-flex items-center gap-1 font-bold bg-white/30 px-1.5 py-0.5 rounded text-[10px] md:text-xs hover:bg-white/40 transition-colors cursor-pointer"
                                    title="Copiar código"
                                >
                                    {coupon.code}
                                    {copied ? (
                                        <Check size={10} className="inline" />
                                    ) : (
                                        <Copy size={10} className="inline opacity-70" />
                                    )}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </p>
                <span className="text-sm">{coupon.bannerEmoji || '🎉'}</span>
            </div>
            <button
                onClick={handleDismiss}
                className="absolute right-2 top-1/2 -translate-y-1/2 hover:opacity-100 opacity-80 p-1 text-xs transition-opacity"
                style={{ color: coupon.bannerTextColor || '#ffffff' }}
                aria-label="Cerrar banner"
            >
                <X size={14} />
            </button>
        </motion.div>
    );
}
