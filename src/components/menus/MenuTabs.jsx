/**
 * MenuTabs.jsx
 *
 * Pestañas para seleccionar el tipo de menú semanal (Full Pack, Keto, etc.).
 * Usado dentro de MenusView.
 *
 * @author: Alejandro R.
 * @date: 2025-12-01
 */

import React from 'react';
import { motion } from 'framer-motion';

const MENU_TYPES = [
  { key: 'fullPack', label: 'Full Pack' },
  { key: 'keto', label: 'Keto' },
  { key: 'bajoCalorias', label: 'Bajo Calorías' },
  { key: 'ceroCarbos', label: 'Cero Carbos' },
  { key: 'regular', label: 'Regular' },
  { key: 'vegetariano', label: 'Vegetariano' },
  { key: 'casaditos', label: 'Casaditos' }
];

/**
 * MenuTabs
 *
 * @param {string} value - Tipo de menú actualmente seleccionado
 * @param {function} onChange - Callback al cambiar de tab
 */
export default function MenuTabs({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
      {MENU_TYPES.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`relative px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-colors duration-200 flex items-center gap-1.5 ${
              active
                ? 'text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {active && (
              <motion.span
                layoutId="menuTabHighlight"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-orange-400 shadow-sm"
                transition={{ type: 'spring', bounce: 0.25, duration: 0.3 }}
              />
            )}
            <span className="relative z-10">{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}
