import React from 'react';

/**
 * MagneticButton Component - Simplificado (sin efectos)
 * Solo renderiza el contenido sin animaciones
 */
export default function MagneticButton({ children, className = "", onClick, as: Tag = "div", ...props }) {
    return (
        <Tag
            className={className}
            onClick={onClick}
            {...props}
        >
            {children}
        </Tag>
    );
}
