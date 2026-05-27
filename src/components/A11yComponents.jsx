/**
 * Componentes de Accesibilidad para BiKitchen
 */

/**
 * Skip Link - Permite saltar al contenido principal
 */
export function SkipLink({ targetId = 'main-content' }) {
    return (
        <a
            href={`#${targetId}`}
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-bikitchen-orange focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
        >
            Saltar al contenido principal
        </a>
    );
}

/**
 * Contenedor de contenido principal con landmark
 */
export function MainContent({ children, id = 'main-content' }) {
    return (
        <main id={id} tabIndex={-1} className="outline-none">
            {children}
        </main>
    );
}

/**
 * Anuncio para lectores de pantalla (live region)
 */
export function LiveAnnouncer({ message, type = 'polite' }) {
    return (
        <div
            role="status"
            aria-live={type}
            aria-atomic="true"
            className="sr-only"
        >
            {message}
        </div>
    );
}

/**
 * Texto solo visible para lectores de pantalla
 */
export function VisuallyHidden({ children, as: Component = 'span' }) {
    return (
        <Component className="sr-only">
            {children}
        </Component>
    );
}

/**
 * Botón accesible con estados claros
 */
export function AccessibleButton({
    children,
    onClick,
    disabled = false,
    loading = false,
    ariaLabel,
    ariaDescribedBy,
    ariaExpanded,
    ariaControls,
    ariaPressed,
    className = '',
    ...props
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            aria-expanded={ariaExpanded}
            aria-controls={ariaControls}
            aria-pressed={ariaPressed}
            aria-busy={loading}
            className={`
                focus:outline-none focus:ring-2 focus:ring-bikitchen-orange focus:ring-offset-2
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
            {...props}
        >
            {loading ? (
                <>
                    <span className="sr-only">Cargando...</span>
                    <span aria-hidden="true">{children}</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}

/**
 * Link accesible que abre en nueva pestaña
 */
export function ExternalLink({ href, children, className = '' }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`focus:outline-none focus:ring-2 focus:ring-bikitchen-orange focus:ring-offset-2 ${className}`}
        >
            {children}
            <span className="sr-only"> (abre en nueva pestaña)</span>
        </a>
    );
}

/**
 * Imagen accesible con alt obligatorio
 */
export function AccessibleImage({ src, alt, decorative = false, className = '', ...props }) {
    if (decorative) {
        return <img src={src} alt="" role="presentation" className={className} {...props} />;
    }
    
    return <img src={src} alt={alt} className={className} {...props} />;
}

/**
 * Grupo de radio buttons accesible
 */
export function RadioGroup({ 
    legend, 
    name, 
    options, 
    value, 
    onChange, 
    required = false,
    className = '' 
}) {
    return (
        <fieldset className={className}>
            <legend className="text-sm font-medium text-gray-700 mb-2">
                {legend}
                {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
            </legend>
            <div className="space-y-2" role="radiogroup" aria-required={required}>
                {options.map((option) => (
                    <label
                        key={option.value}
                        className="flex items-center gap-3 cursor-pointer group"
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={value === option.value}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-4 h-4 text-bikitchen-orange border-gray-300 focus:ring-bikitchen-orange focus:ring-2"
                            aria-describedby={option.description ? `${name}-${option.value}-desc` : undefined}
                        />
                        <span className="text-gray-700 group-hover:text-gray-900">
                            {option.label}
                        </span>
                        {option.description && (
                            <span id={`${name}-${option.value}-desc`} className="sr-only">
                                {option.description}
                            </span>
                        )}
                    </label>
                ))}
            </div>
        </fieldset>
    );
}

/**
 * Modal accesible con focus trap
 */
export function AccessibleModal({ 
    isOpen, 
    onClose, 
    title, 
    children,
    labelledBy,
    describedBy 
}) {
    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy || 'modal-title'}
            aria-describedby={describedBy}
            className="fixed inset-0 z-50 flex items-center justify-center"
        >
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50" 
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Content */}
            <div className="relative bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                {title && (
                    <h2 id="modal-title" className="text-xl font-bold mb-4">
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </div>
    );
}

/**
 * Tabla accesible
 */
export function AccessibleTable({ caption, headers, rows, className = '' }) {
    return (
        <table className={`w-full ${className}`}>
            {caption && (
                <caption className="sr-only">{caption}</caption>
            )}
            <thead>
                <tr>
                    {headers.map((header, index) => (
                        <th 
                            key={index} 
                            scope="col"
                            className="text-left p-3 bg-gray-50 font-medium text-gray-700"
                        >
                            {header}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                        {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="p-3">
                                {cell}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/**
 * Alerta accesible
 */
export function AccessibleAlert({ type = 'info', title, children, onDismiss }) {
    const types = {
        info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', role: 'status' },
        success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', role: 'status' },
        warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', role: 'alert' },
        error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', role: 'alert' }
    };

    const config = types[type];

    return (
        <div
            role={config.role}
            aria-live={type === 'error' || type === 'warning' ? 'assertive' : 'polite'}
            className={`${config.bg} ${config.border} ${config.text} border rounded-xl p-4`}
        >
            {title && <p className="font-semibold mb-1">{title}</p>}
            <p>{children}</p>
            {onDismiss && (
                <button
                    onClick={onDismiss}
                    aria-label="Cerrar alerta"
                    className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded"
                >
                    ×
                </button>
            )}
        </div>
    );
}

/**
 * Progress bar accesible
 */
export function AccessibleProgress({ value, max = 100, label }) {
    const percentage = Math.round((value / max) * 100);
    
    return (
        <div className="w-full">
            {label && (
                <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span>{percentage}%</span>
                </div>
            )}
            <div
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={label || `Progreso: ${percentage}%`}
                className="h-2 bg-gray-200 rounded-full overflow-hidden"
            >
                <div 
                    className="h-full bg-bikitchen-orange transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Hook para manejar focus trap en modales
 */
export function useFocusTrap(isActive) {
    const containerRef = { current: null };

    const handleKeyDown = (e) => {
        if (!isActive || !containerRef.current) return;

        const focusableElements = containerRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.key === 'Tab') {
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement?.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement?.focus();
            }
        }

        if (e.key === 'Escape') {
            // Permitir que el componente padre maneje el cierre
        }
    };

    return { containerRef, handleKeyDown };
}

export default {
    SkipLink,
    MainContent,
    LiveAnnouncer,
    VisuallyHidden,
    AccessibleButton,
    ExternalLink,
    AccessibleImage,
    RadioGroup,
    AccessibleModal,
    AccessibleTable,
    AccessibleAlert,
    AccessibleProgress,
    useFocusTrap
};
