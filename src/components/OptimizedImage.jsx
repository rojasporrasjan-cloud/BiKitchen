import { useState, useRef, useEffect } from 'react';

/**
 * OptimizedImage - Imagen optimizada con WebP y srcset responsive
 * 
 * Características:
 * - Soporte WebP con fallback
 * - Srcset para diferentes tamaños de pantalla
 * - Lazy loading nativo
 * - Placeholder mientras carga
 * - Blur-up effect
 */
export default function OptimizedImage({
    src,
    alt = '',
    width,
    height,
    sizes = '100vw',
    className = '',
    wrapperClassName = '',
    priority = false, // Si es true, no usa lazy loading
    placeholder = 'blur', // 'blur' | 'empty' | 'skeleton'
    blurDataURL,
    quality = 80,
    onLoad,
    onError,
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);

    // Generar srcset para diferentes tamaños
    const generateSrcSet = (baseSrc) => {
        if (!baseSrc) return '';
        
        // Si es una URL externa o de assets, retornar como está
        if (baseSrc.startsWith('http') || baseSrc.startsWith('/assets')) {
            return baseSrc;
        }

        const widths = [320, 640, 768, 1024, 1280, 1536];
        return widths
            .map(w => `${baseSrc}?w=${w}&q=${quality} ${w}w`)
            .join(', ');
    };

    // Detectar soporte WebP
    const supportsWebP = () => {
        if (typeof window === 'undefined') return false;
        const canvas = document.createElement('canvas');
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    };

    // Convertir extensión a WebP si es soportado
    const getOptimizedSrc = (originalSrc) => {
        if (!originalSrc) return '';
        if (hasError) return originalSrc;
        
        // Si ya es WebP o es una URL externa, retornar como está
        if (originalSrc.endsWith('.webp') || originalSrc.startsWith('http')) {
            return originalSrc;
        }

        // Intentar usar versión WebP si existe
        if (supportsWebP()) {
            return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        }

        return originalSrc;
    };

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        onError?.();
    };

    const optimizedSrc = getOptimizedSrc(src);
    const aspectRatio = width && height ? height / width : undefined;

    return (
        <div 
            className={`relative overflow-hidden ${wrapperClassName}`}
            style={aspectRatio ? { paddingBottom: `${aspectRatio * 100}%` } : undefined}
        >
            {/* Placeholder */}
            {placeholder === 'skeleton' && !isLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            
            {placeholder === 'blur' && blurDataURL && !isLoaded && (
                <img
                    src={blurDataURL}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover filter blur-lg scale-110"
                    aria-hidden="true"
                />
            )}

            {/* Imagen principal con picture para WebP fallback */}
            <picture>
                {/* WebP source */}
                {!hasError && src && !src.startsWith('http') && (
                    <source
                        type="image/webp"
                        srcSet={generateSrcSet(src.replace(/\.(jpg|jpeg|png)$/i, '.webp'))}
                        sizes={sizes}
                    />
                )}
                
                {/* Fallback original */}
                <img
                    ref={imgRef}
                    src={hasError ? src : optimizedSrc}
                    srcSet={!hasError ? generateSrcSet(src) : undefined}
                    sizes={sizes}
                    alt={alt}
                    width={width}
                    height={height}
                    loading={priority ? 'eager' : 'lazy'}
                    decoding={priority ? 'sync' : 'async'}
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`
                        ${aspectRatio ? 'absolute inset-0' : ''} 
                        w-full h-full object-cover
                        transition-opacity duration-300
                        ${isLoaded ? 'opacity-100' : 'opacity-0'}
                        ${className}
                    `}
                    {...props}
                />
            </picture>
        </div>
    );
}

/**
 * Imagen de fondo optimizada
 */
export function OptimizedBackgroundImage({
    src,
    children,
    className = '',
    overlay = false,
    overlayColor = 'rgba(0,0,0,0.4)',
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        if (!src) return;
        
        const img = new Image();
        img.src = src;
        img.onload = () => setIsLoaded(true);
    }, [src]);

    return (
        <div
            className={`relative bg-gray-200 ${className}`}
            {...props}
        >
            {/* Background image */}
            <div
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-500 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundImage: `url(${src})` }}
            />

            {/* Overlay */}
            {overlay && (
                <div 
                    className="absolute inset-0" 
                    style={{ backgroundColor: overlayColor }}
                />
            )}

            {/* Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

/**
 * Hook para generar blur placeholder
 */
export function useBlurPlaceholder(src) {
    const [blurDataURL, setBlurDataURL] = useState(null);

    useEffect(() => {
        if (!src) return;

        // Crear un canvas pequeño para generar blur
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Tamaño muy pequeño para blur
            canvas.width = 10;
            canvas.height = 10;
            
            ctx.drawImage(img, 0, 0, 10, 10);
            setBlurDataURL(canvas.toDataURL('image/jpeg', 0.1));
        };
    }, [src]);

    return blurDataURL;
}

/**
 * Componente para imágenes de producto
 */
export function ProductImage({ 
    src, 
    alt, 
    badge,
    className = '' 
}) {
    return (
        <div className={`relative aspect-square overflow-hidden rounded-xl ${className}`}>
            <OptimizedImage
                src={src}
                alt={alt}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                placeholder="skeleton"
                className="group-hover:scale-105 transition-transform duration-300"
            />
            
            {badge && (
                <span className="absolute top-2 left-2 px-2 py-1 bg-bikitchen-orange text-white text-xs font-bold rounded-lg">
                    {badge}
                </span>
            )}
        </div>
    );
}

