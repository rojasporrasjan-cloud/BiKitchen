import { useState, useRef, useEffect } from 'react';

/**
 * LazyImage - Componente de imagen con carga diferida
 * 
 * Características:
 * - Carga imágenes solo cuando son visibles (IntersectionObserver)
 * - Placeholder con skeleton mientras carga
 * - Transición suave al cargar
 * - Fallback para errores
 * - Soporte para blur placeholder
 */
export default function LazyImage({
    src,
    alt = '',
    className = '',
    wrapperClassName = '',
    placeholderColor = 'bg-gray-200',
    aspectRatio = null, // ej: "aspect-video", "aspect-square"
    objectFit = 'object-cover',
    fallbackSrc = '/assets/placeholder-food.jpg',
    threshold = 0.1, // Cuánto del elemento debe ser visible para cargar
    rootMargin = '100px', // Cargar antes de que sea visible
    onLoad,
    onError,
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);
    const containerRef = useRef(null);

    // Intersection Observer para detectar cuando la imagen es visible
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                threshold,
                rootMargin
            }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [threshold, rootMargin]);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    const handleError = () => {
        setHasError(true);
        onError?.();
    };

    const imageSrc = hasError ? fallbackSrc : src;

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${aspectRatio || ''} ${wrapperClassName}`}
        >
            {/* Placeholder/Skeleton */}
            <div
                className={`absolute inset-0 ${placeholderColor} transition-opacity duration-300 ${
                    isLoaded ? 'opacity-0' : 'opacity-100'
                }`}
            >
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>

            {/* Imagen real - solo se carga cuando está en vista */}
            {isInView && (
                <img
                    ref={imgRef}
                    src={imageSrc}
                    alt={alt}
                    loading="lazy"
                    decoding="async"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`w-full h-full ${objectFit} transition-opacity duration-500 ${
                        isLoaded ? 'opacity-100' : 'opacity-0'
                    } ${className}`}
                    {...props}
                />
            )}
        </div>
    );
}

/**
 * LazyBackgroundImage - Imagen de fondo con carga diferida
 */
export function LazyBackgroundImage({
    src,
    children,
    className = '',
    placeholderColor = 'bg-gray-200',
    threshold = 0.1,
    rootMargin = '100px',
    overlay = false,
    overlayColor = 'bg-black/40',
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [threshold, rootMargin]);

    // Precargar imagen
    useEffect(() => {
        if (isInView && src) {
            const img = new Image();
            img.src = src;
            img.onload = () => setIsLoaded(true);
        }
    }, [isInView, src]);

    return (
        <div
            ref={containerRef}
            className={`relative ${placeholderColor} ${className}`}
            {...props}
        >
            {/* Background image */}
            <div
                className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ backgroundImage: isInView ? `url(${src})` : 'none' }}
            />

            {/* Overlay opcional */}
            {overlay && (
                <div className={`absolute inset-0 ${overlayColor}`} />
            )}

            {/* Contenido */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}

/**
 * LazyAvatar - Avatar con carga diferida
 */
export function LazyAvatar({
    src,
    alt = '',
    size = 'md',
    fallbackInitial = '?',
    className = '',
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    const sizeClasses = {
        xs: 'w-6 h-6 text-xs',
        sm: 'w-8 h-8 text-sm',
        md: 'w-10 h-10 text-base',
        lg: 'w-12 h-12 text-lg',
        xl: 'w-16 h-16 text-xl',
        '2xl': 'w-20 h-20 text-2xl'
    };

    if (!src || hasError) {
        return (
            <div
                className={`${sizeClasses[size]} rounded-full bg-bikitchen-orange/10 text-bikitchen-orange flex items-center justify-center font-semibold ${className}`}
                {...props}
            >
                {fallbackInitial}
            </div>
        );
    }

    return (
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden relative ${className}`} {...props}>
            {/* Placeholder */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}
            
            <img
                src={src}
                alt={alt}
                loading="lazy"
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                    isLoaded ? 'opacity-100' : 'opacity-0'
                }`}
            />
        </div>
    );
}

/**
 * ImageGallery - Galería de imágenes con lazy loading
 */
export function ImageGallery({
    images = [],
    columns = 3,
    gap = 4,
    aspectRatio = 'aspect-square',
    onImageClick
}) {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
        6: 'grid-cols-6'
    };

    return (
        <div className={`grid ${gridCols[columns]} gap-${gap}`}>
            {images.map((image, index) => (
                <button
                    key={image.id || index}
                    onClick={() => onImageClick?.(image, index)}
                    className="group relative overflow-hidden rounded-xl"
                >
                    <LazyImage
                        src={image.src || image.url || image}
                        alt={image.alt || `Image ${index + 1}`}
                        aspectRatio={aspectRatio}
                        className="group-hover:scale-105 transition-transform duration-300"
                    />
                    {image.title && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <span className="text-white text-sm font-medium">{image.title}</span>
                        </div>
                    )}
                </button>
            ))}
        </div>
    );
}

/**
 * Hook para precargar imágenes
 */
export function useImagePreloader(imageSources = []) {
    const [loadedImages, setLoadedImages] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (imageSources.length === 0) {
            setIsLoading(false);
            return;
        }

        let loadedCount = 0;
        const total = imageSources.length;

        imageSources.forEach((src) => {
            const img = new Image();
            img.src = src;
            
            img.onload = () => {
                loadedCount++;
                setLoadedImages(prev => ({ ...prev, [src]: true }));
                setProgress(Math.round((loadedCount / total) * 100));
                
                if (loadedCount === total) {
                    setIsLoading(false);
                }
            };
            
            img.onerror = () => {
                loadedCount++;
                setLoadedImages(prev => ({ ...prev, [src]: false }));
                setProgress(Math.round((loadedCount / total) * 100));
                
                if (loadedCount === total) {
                    setIsLoading(false);
                }
            };
        });
    }, [imageSources.join(',')]);

    return { loadedImages, isLoading, progress };
}
