/**
 * cloudinaryService.js
 * Servicio de subida de imágenes a Cloudinary (reemplaza Firebase Storage)
 * 
 * Configuración requerida en .env:
 *   VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
 *   VITE_CLOUDINARY_UPLOAD_PRESET=bikitchen_uploads
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

if (!CLOUD_NAME) {
    console.warn('[Cloudinary] VITE_CLOUDINARY_CLOUD_NAME no está configurado en .env');
}

/**
 * Optimiza una imagen localmente con canvas antes de subirla
 * @param {File} file - Archivo de imagen original
 * @param {number} maxSize - Tamaño máximo en píxeles (ancho o alto)
 * @returns {Promise<Blob>} Imagen optimizada como WebP
 */
export const optimizeImage = (file, maxSize = 1200, quality = 0.8) =>
    new Promise((resolve, reject) => {
        try {
            const imgEl = new Image();
            const reader = new FileReader();
            reader.onload = (e) => {
                imgEl.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const w = imgEl.naturalWidth || imgEl.width;
                    const h = imgEl.naturalHeight || imgEl.height;
                    const scale = Math.min(1, maxSize / Math.max(w, h));
                    canvas.width = Math.max(1, Math.round(w * scale));
                    canvas.height = Math.max(1, Math.round(h * scale));
                    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error('Error al optimizar imagen'));
                        },
                        'image/webp',
                        quality
                    );
                };
                imgEl.onerror = reject;
                imgEl.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        } catch (err) {
            reject(err);
        }
    });

/**
 * Sube una imagen a Cloudinary usando un preset sin firma (unsigned)
 * @param {File|Blob} file - Archivo de imagen
 * @param {string} folder - Carpeta en Cloudinary (ej: 'bikitchen/packs')
 * @param {object} options - Opciones adicionales
 * @param {function} options.onProgress - Callback de progreso (0-100)
 * @returns {Promise<{ url: string, publicId: string, secureUrl: string }>}
 */
export const uploadImage = async (file, folder = 'bikitchen', options = {}) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error(
            'Cloudinary no está configurado. Agrega VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET al archivo .env'
        );
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', folder);

    // Crear XMLHttpRequest para poder reportar progreso
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && options.onProgress) {
                const percent = Math.round((event.loaded / event.total) * 100);
                options.onProgress(percent);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    resolve({
                        url: data.secure_url,
                        secureUrl: data.secure_url,
                        publicId: data.public_id,
                        width: data.width,
                        height: data.height,
                        format: data.format,
                        bytes: data.bytes
                    });
                } catch (e) {
                    reject(new Error('Error al parsear respuesta de Cloudinary'));
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    reject(new Error(err?.error?.message || `Error ${xhr.status} al subir imagen`));
                } catch {
                    reject(new Error(`Error ${xhr.status} al subir imagen`));
                }
            }
        };

        xhr.onerror = () => reject(new Error('Error de red al subir imagen a Cloudinary'));
        xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado al subir imagen'));
        xhr.timeout = 60000; // 60 segundos

        xhr.open('POST', url);
        xhr.send(formData);
    });
};

/**
 * Sube una imagen con optimización automática (redimensiona + convierte a WebP)
 * @param {File} file - Archivo de imagen original
 * @param {string} folder - Carpeta en Cloudinary
 * @param {object} options - { maxSize, onProgress }
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const uploadOptimizedImage = async (file, folder = 'bikitchen', options = {}) => {
    const { maxSize = 1200, quality = 0.8, onProgress } = options;

    // Optimizar localmente antes de subir
    const optimizedBlob = await optimizeImage(file, maxSize, quality);

    // Subir a Cloudinary
    return uploadImage(optimizedBlob, folder, { onProgress });
};

/**
 * Genera una URL de Cloudinary con transformaciones (resize, formato, calidad)
 * @param {string} publicId - El public_id del asset en Cloudinary
 * @param {object} transforms - { width, height, quality, format }
 * @returns {string} URL optimizada
 */
export const getOptimizedUrl = (publicId, transforms = {}) => {
    if (!publicId || !CLOUD_NAME) return publicId;

    const { width = 'auto', height, quality = 'auto', format = 'webp' } = transforms;
    const parts = [`c_limit,w_${width}`];
    if (height) parts.push(`h_${height}`);
    parts.push(`q_${quality}`, `f_${format}`);

    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${parts.join(',')}/${publicId}`;
};

/**
 * Convierte una imagen HEIC a JPG antes de subirla (para fotos de iPhone)
 * @param {File} file - Archivo HEIC/HEIF
 * @returns {Promise<File>} Archivo JPG convertido
 */
export const convertHeicToJpg = async (file) => {
    try {
        const heic2any = (await import('heic2any')).default;
        const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
        const blob = Array.isArray(result) ? result[0] : result;
        const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
        return new File([blob], newFileName, { type: 'image/jpeg' });
    } catch (error) {
        throw new Error(`No se pudo convertir ${file.name}. Intenta convertirlo manualmente a JPG.`);
    }
};

export default {
    uploadImage,
    uploadOptimizedImage,
    getOptimizedUrl,
    optimizeImage,
    convertHeicToJpg,
};
