/**
 * AdminCard.jsx
 * 
 * Componente reutilizable para cards/secciones del admin
 * con diseño moderno y consistente
 */

import React from 'react';
import { motion } from 'framer-motion';

export default function AdminCard({ 
  children, 
  title,
  subtitle,
  icon: Icon,
  className = '',
  gradient = false,
  delay = 0
}) {
  const baseClasses = gradient
    ? 'bg-gradient-to-br from-white via-orange-50/30 to-white'
    : 'bg-white';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`${baseClasses} rounded-3xl p-6 shadow-xl border border-gray-100/50 backdrop-blur-sm ${className}`}
    >
      {(title || Icon) && (
        <div className="flex items-center gap-3 mb-6">
          {Icon && (
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Icon size={20} className="text-white" />
            </div>
          )}
          {title && (
            <div>
              <h3 className="text-base font-bold text-gray-800">{title}</h3>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </motion.div>
  );
}
