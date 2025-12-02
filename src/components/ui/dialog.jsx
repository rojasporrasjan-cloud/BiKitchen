import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Dialog - Modal overlay con posición fija absoluta
 * Usa createPortal para renderizar fuera del árbol DOM normal
 * y evitar problemas de scroll/posicionamiento
 */
export function Dialog({ open, onOpenChange, children }) {
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
  };

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (open) {
      // Pausar Lenis si existe
      if (window.lenis) {
        window.lenis.stop();
      }
      
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Reanudar Lenis
        if (window.lenis) {
          window.lenis.start();
        }
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  if (!open) return null;

  // Usar portal para renderizar en el body, fuera del árbol normal
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Overlay oscuro - cubre toda la pantalla */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Contenedor del modal */}
      <div className="relative z-10 w-full max-w-xl">
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child, { onClose: handleClose })
            : child
        )}
      </div>
    </div>,
    document.body
  );
}

export function DialogContent({ children, className = '', onClose, showCloseButton = false }) {
  const handleClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleClick}
      className={`relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col ${className}`}
      style={{
        maxHeight: '90vh',
        animation: 'dialogEnter 0.25s ease-out'
      }}
    >
      {/* Botón cerrar - solo si showCloseButton es true */}
      {showCloseButton && onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      )}
      {children}
      
      {/* Animación de entrada */}
      <style>{`
        @keyframes dialogEnter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export function DialogHeader({ children, className = '' }) {
  return (
    <div className={`flex-shrink-0 px-6 py-5 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({ children, className = '' }) {
  return (
    <h2 className={`text-xl font-bold leading-tight ${className}`}>
      {children}
    </h2>
  );
}
