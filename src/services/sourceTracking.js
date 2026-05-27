/**
 * Source Tracking Service
 * Captura y persiste la fuente de donde viene el usuario (UTM parameters, Referrers)
 */

const STORAGE_KEY = 'bikitchen_user_source';

/**
 * Captura los parámetros UTM de la URL y el Referrer
 */
export const captureSource = () => {
    if (typeof window === 'undefined') return;

    try {
        const urlParams = new URLSearchParams(window.location.search);
        const referrer = document.referrer;

        let sourceData = {};

        // 1. Capturar parámetros UTM estándar
        const utmSource = urlParams.get('utm_source');
        const utmMedium = urlParams.get('utm_medium');
        const utmCampaign = urlParams.get('utm_campaign');
        const gclid = urlParams.get('gclid'); // Google Click ID

        if (utmSource || utmMedium || utmCampaign || gclid) {
            sourceData = {
                source: utmSource || (gclid ? 'google_ads' : 'direct'),
                medium: utmMedium || (gclid ? 'cpc' : 'none'),
                campaign: utmCampaign || 'none',
                type: 'utm',
                timestamp: new Date().toISOString()
            };
        }
        // 2. Si no hay UTM, intentar detectar por Referrer
        else if (referrer) {
            const referrerUrl = new URL(referrer);
            const host = referrerUrl.hostname.toLowerCase();

            if (host.includes('facebook.com') || host.includes('fb.me')) {
                sourceData = { source: 'facebook', medium: 'social', type: 'referrer', timestamp: new Date().toISOString() };
            } else if (host.includes('instagram.com')) {
                sourceData = { source: 'instagram', medium: 'social', type: 'referrer', timestamp: new Date().toISOString() };
            } else if (host.includes('google.com')) {
                sourceData = { source: 'google', medium: 'organic', type: 'referrer', timestamp: new Date().toISOString() };
            } else if (host.includes('tiktok.com')) {
                sourceData = { source: 'tiktok', medium: 'social', type: 'referrer', timestamp: new Date().toISOString() };
            } else if (!host.includes(window.location.hostname)) {
                sourceData = { source: host, medium: 'referral', type: 'referrer', timestamp: new Date().toISOString() };
            }
        }

        // Solo guardar si detectamos algo nuevo y no tenemos nada previo
        // O si detectamos parámetros UTM (que tienen prioridad sobre referrer previo)
        if (Object.keys(sourceData).length > 0) {
            const existingSource = getCapturedSource();

            // Los UTMs sobreescriben a los Referrers orgánicos
            if (!existingSource || sourceData.type === 'utm') {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(sourceData));
                console.log('[SourceTracking] Fuente detectada y guardada:', sourceData);
            }
        }
    } catch (error) {
        console.error('[SourceTracking] Error capturando fuente:', error);
    }
};

/**
 * Obtiene la fuente guardada
 */
export const getCapturedSource = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
};

/**
 * Formatea la fuente para mostrarla de forma legible
 */
export const getSourceLabel = () => {
    const data = getCapturedSource();
    if (!data) return 'Directo / Desconocido';

    if (data.type === 'utm') {
        return `${data.source} (${data.medium})${data.campaign !== 'none' ? ` - Campaña: ${data.campaign}` : ''}`;
    }

    return `${data.source} (${data.medium})`;
};

export default {
    captureSource,
    getCapturedSource,
    getSourceLabel
};
