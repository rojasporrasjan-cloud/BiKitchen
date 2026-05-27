/**
 * AdminPageHeader.jsx
 * 
 * Componente reutilizable para headers de páginas del admin
 * con diseño moderno, gradientes y animaciones
 */

import React from 'react';
import { motion } from 'framer-motion';

export default function AdminPageHeader({
  icon: Icon,
  title,
  subtitle,
  stats = [],
  actions = [],
  gradient = 'from-orange-500 via-orange-400 to-amber-400'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`bg-gradient-to-r ${gradient} rounded-3xl p-4 md:p-6 text-white shadow-2xl border border-white/20`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
            className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-xl"
          >
            <Icon size={32} className="text-white" />
          </motion.div>
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-2xl sm:text-3xl font-bold"
            >
              {title}
            </motion.h1>
            {subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-white/80 text-sm mt-1"
              >
                {subtitle}
              </motion.p>
            )}
          </div>
        </div>

        {/* Estadísticas rápidas */}
        {stats.length > 0 && (
          <div className="flex gap-4 flex-wrap">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="bg-white/20 backdrop-blur-sm rounded-2xl px-5 py-3 text-center shadow-lg hover:bg-white/30 transition-all"
              >
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-white/80 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      {actions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex gap-2 flex-wrap mt-6 pt-6 border-t border-white/20"
        >
          {actions}
        </motion.div>
      )}
    </motion.div>
  );
}
