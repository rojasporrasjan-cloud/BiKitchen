import { useState, useEffect } from 'react';

export function usePromoBanner() {
    const [isBannerVisible, setIsBannerVisible] = useState(() => {
        return window.__PROMO_BANNER_VISIBLE__ ?? false;
    });

    useEffect(() => {
        const handleBannerChange = (e) => {
            const visible = e.detail?.visible ?? false;
            window.__PROMO_BANNER_VISIBLE__ = visible;
            setIsBannerVisible(visible);
        };

        if (window.__PROMO_BANNER_VISIBLE__ !== undefined) {
            setIsBannerVisible(window.__PROMO_BANNER_VISIBLE__);
        }

        window.addEventListener('promoBannerChange', handleBannerChange);
        return () => window.removeEventListener('promoBannerChange', handleBannerChange);
    }, []);

    return isBannerVisible;
}

