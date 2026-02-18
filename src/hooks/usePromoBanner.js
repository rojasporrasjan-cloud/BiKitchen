import { useState, useEffect } from 'react';

export function usePromoBanner() {
    const [isBannerVisible, setIsBannerVisible] = useState(false);

    useEffect(() => {
        const handleBannerChange = (e) => {
            setIsBannerVisible(e.detail?.visible ?? false);
        };

        // Check initial state if possible or wait for event
        // Since the event is dispatched on mount of PromoBanner, we should catch it if we mount after.
        // However, custom events are not persistent. 
        // We might need to check a global flag or just rely on the event if PromoBanner mounts/updates.

        window.addEventListener('promoBannerChange', handleBannerChange);
        return () => window.removeEventListener('promoBannerChange', handleBannerChange);
    }, []);

    return isBannerVisible;
}
