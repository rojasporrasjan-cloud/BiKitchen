import { useState } from 'react';

/**
 * SmoothImage - Componente de imagen SIN flasheo
 * Carga inmediata con placeholder visible hasta que termine de cargar
 */
export default function SmoothImage({
  src,
  alt,
  className = '',
  placeholderColor = 'bg-gray-100',
  aspectRatio = 'aspect-video',
  objectFit = 'object-cover',
  priority = false,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className={`${aspectRatio} ${placeholderColor} flex items-center justify-center ${className}`}>
        <span className="text-gray-400 text-sm">Error al cargar</span>
      </div>
    );
  }

  return (
    <div className={`relative ${aspectRatio} ${placeholderColor} overflow-hidden ${className}`}>
      {/* Placeholder - siempre visible detrás de la imagen para evitar flash blanco */}
      <div
        className={`absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100`}
        style={{
          pointerEvents: 'none'
        }}
      />

      {/* Imagen - fade in suave sobre el placeholder */}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="auto"
        onLoad={handleLoad}
        onError={handleError}
        className={`absolute inset-0 w-full h-full ${objectFit} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        style={{}}
        {...props}
      />
    </div>
  );
}
