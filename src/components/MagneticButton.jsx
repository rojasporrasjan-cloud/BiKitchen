import React from 'react';

/**
 * MagneticButton Component - Simplificado (sin efectos)
 * Solo renderiza el contenido sin animaciones
 */
export default function MagneticButton({ children, className = "", onClick, as: Component = "div", ...props }) {
    return (
        <Component
            className={className}
            onClick={onClick}
            {...props}
        >
            {children}
        </Component>
    );
}
