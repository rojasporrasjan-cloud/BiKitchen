/**
 * Hook para funcionalidades nativas de Capacitor
 * Funciona tanto en web como en app nativa
 */

// Detectar si estamos en una app nativa
export const isNativeApp = () => {
    return window.Capacitor?.isNativePlatform?.() || false;
};

// Detectar plataforma
export const getPlatform = () => {
    if (typeof window === 'undefined') return 'web';
    return window.Capacitor?.getPlatform?.() || 'web';
};

/**
 * Hook para vibración háptica
 */
export function useHaptics() {
    const vibrate = async (style = 'light') => {
        if (!isNativeApp()) {
            // Fallback web: usar Vibration API si está disponible
            if ('vibrate' in navigator) {
                const duration = style === 'heavy' ? 50 : style === 'medium' ? 30 : 10;
                navigator.vibrate(duration);
            }
            return;
        }

        try {
            const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
            const styles = {
                light: ImpactStyle.Light,
                medium: ImpactStyle.Medium,
                heavy: ImpactStyle.Heavy,
            };
            await Haptics.impact({ style: styles[style] || ImpactStyle.Light });
        } catch (e) {
            console.warn('Haptics not available');
        }
    };

    const notification = async (type = 'success') => {
        if (!isNativeApp()) return;

        try {
            const { Haptics, NotificationType } = await import('@capacitor/haptics');
            const types = {
                success: NotificationType.Success,
                warning: NotificationType.Warning,
                error: NotificationType.Error,
            };
            await Haptics.notification({ type: types[type] || NotificationType.Success });
        } catch (e) {
            console.warn('Haptics not available');
        }
    };

    return { vibrate, notification };
}

/**
 * Hook para compartir nativo
 */
export function useNativeShare() {
    const share = async ({ title, text, url, files }) => {
        if (isNativeApp()) {
            try {
                const { Share } = await import('@capacitor/share');
                await Share.share({ title, text, url, files });
                return { success: true };
            } catch (e) {
                return { success: false, error: e };
            }
        }

        // Fallback web
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
                return { success: true };
            } catch (e) {
                return { success: false, error: e };
            }
        }

        // Copiar al portapapeles como último recurso
        try {
            await navigator.clipboard.writeText(url || text);
            return { success: true, copied: true };
        } catch (e) {
            return { success: false, error: e };
        }
    };

    return { share };
}

/**
 * Hook para notificaciones push
 */
export function usePushNotifications() {
    const register = async () => {
        if (!isNativeApp()) {
            // Fallback web: usar Web Push API
            if ('Notification' in window) {
                const permission = await Notification.requestPermission();
                return { granted: permission === 'granted' };
            }
            return { granted: false };
        }

        try {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            
            const permission = await PushNotifications.requestPermissions();
            if (permission.receive === 'granted') {
                await PushNotifications.register();
                return { granted: true };
            }
            return { granted: false };
        } catch (e) {
            return { granted: false, error: e };
        }
    };

    const addListeners = async (callbacks) => {
        if (!isNativeApp()) return;

        try {
            const { PushNotifications } = await import('@capacitor/push-notifications');

            if (callbacks.onRegistration) {
                PushNotifications.addListener('registration', callbacks.onRegistration);
            }
            if (callbacks.onNotification) {
                PushNotifications.addListener('pushNotificationReceived', callbacks.onNotification);
            }
            if (callbacks.onAction) {
                PushNotifications.addListener('pushNotificationActionPerformed', callbacks.onAction);
            }
        } catch (e) {
            console.warn('Push notifications not available');
        }
    };

    return { register, addListeners };
}

/**
 * Hook para cámara
 */
export function useCamera() {
    const takePhoto = async () => {
        if (!isNativeApp()) {
            // Fallback web: usar input file
            return new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.onchange = (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = () => resolve({ dataUrl: reader.result });
                        reader.readAsDataURL(file);
                    }
                };
                input.click();
            });
        }

        try {
            const { Camera, CameraResultType } = await import('@capacitor/camera');
            const photo = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.DataUrl,
            });
            return { dataUrl: photo.dataUrl };
        } catch (e) {
            return { error: e };
        }
    };

    return { takePhoto };
}

/**
 * Hook para geolocalización
 */
export function useGeolocation() {
    const getCurrentPosition = async () => {
        if (!isNativeApp()) {
            // Fallback web
            return new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                    }),
                    reject
                );
            });
        }

        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const pos = await Geolocation.getCurrentPosition();
            return {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
            };
        } catch (e) {
            return { error: e };
        }
    };

    return { getCurrentPosition };
}

/**
 * Hook para almacenamiento local seguro
 */
export function useSecureStorage() {
    const set = async (key, value) => {
        if (!isNativeApp()) {
            localStorage.setItem(key, JSON.stringify(value));
            return;
        }

        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.set({ key, value: JSON.stringify(value) });
        } catch (e) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    };

    const get = async (key) => {
        if (!isNativeApp()) {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        }

        try {
            const { Preferences } = await import('@capacitor/preferences');
            const { value } = await Preferences.get({ key });
            return value ? JSON.parse(value) : null;
        } catch (e) {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        }
    };

    const remove = async (key) => {
        if (!isNativeApp()) {
            localStorage.removeItem(key);
            return;
        }

        try {
            const { Preferences } = await import('@capacitor/preferences');
            await Preferences.remove({ key });
        } catch (e) {
            localStorage.removeItem(key);
        }
    };

    return { set, get, remove };
}

export default {
    isNativeApp,
    getPlatform,
    useHaptics,
    useNativeShare,
    usePushNotifications,
    useCamera,
    useGeolocation,
    useSecureStorage,
};
