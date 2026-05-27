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

// Menús de Almuerzo
const ALMUERZO_TYPES = [
  { key: 'fullPack', label: 'Full Pack', emoji: '🍱', color: 'orange' },
  { key: 'keto', label: 'Keto', emoji: '🥑', color: 'green' },
  { key: 'bajoCalorias', label: 'Bajo Calorías', emoji: '🥗', color: 'emerald' },
  { key: 'sinCarbos', label: 'Sin Carbos', emoji: '🥩', color: 'red' },
  { key: 'regular', label: 'Regular', emoji: '🍽️', color: 'blue' },
  { key: 'vegetariano', label: 'Vegetariano', emoji: '🥬', color: 'lime' },
  { key: 'casaditos', label: 'Casaditos', emoji: '🍛', color: 'amber' }
];

// Menús de Cena (separados del almuerzo) - usan prefijo cena_
const CENA_TYPES = [
  { key: 'cena_fullPack', label: 'Cena Full Pack', emoji: '🌙', color: 'indigo', menuKey: 'fullPack' },
  { key: 'cena_keto', label: 'Cena Keto', emoji: '🌙', color: 'green', menuKey: 'keto' },
  { key: 'cena_bajoCalorias', label: 'Cena Bajo Calorías', emoji: '🌙', color: 'emerald', menuKey: 'bajoCalorias' },
  { key: 'cena_sinCarbos', label: 'Cena Sin Carbos', emoji: '🌙', color: 'red', menuKey: 'sinCarbos' },
  { key: 'cena_regular', label: 'Cena Regular', emoji: '🌙', color: 'blue', menuKey: 'regular' },
  { key: 'cena_vegetariano', label: 'Cena Vegetariano', emoji: '🌙', color: 'lime', menuKey: 'vegetariano' },
  { key: 'cena_casaditos', label: 'Cena Casaditos', emoji: '🌙', color: 'amber', menuKey: 'casaditos' }
];

// Packs especiales
const SPECIAL_TYPES = [
  { key: 'familiarPremium', label: 'Pack Familiar Premium', emoji: '👨‍👩‍👧‍👦', color: 'purple' },
  { key: 'familiarDeluxe', label: 'Pack Familiar Deluxe', emoji: '👑', color: 'pink' }
];

const MENU_TYPES = [...ALMUERZO_TYPES, ...CENA_TYPES, ...SPECIAL_TYPES];

/**
 * MenuTabs
 *
 * @param {string} value - Tipo de menú actualmente seleccionado
 * @param {function} onChange - Callback al cambiar de tab
 */
// Componente de botón de tab reutilizable
const TabButton = ({ item, active, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
      active
        ? 'text-white shadow-lg scale-[1.02]'
        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 hover:scale-[1.01]'
    }`}
  >
    {active && (
      <motion.span
        layoutId="menuTabHighlight"
        className="absolute inset-0 rounded-xl bg-gradient-to-r from-bikitchen-orange to-orange-500 shadow-md"
        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
      />
    )}
    <span className="relative z-10 text-base">{item.emoji}</span>
    <span className="relative z-10">{item.label}</span>
    {count > 0 && (
      <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
        active ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
      }`}>
        {count}
      </span>
    )}
  </button>
);

export default function MenuTabs({ value, onChange, menuCounts = {} }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
      {/* Sección Almuerzo */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <span>☀️</span> Menús de Almuerzo
        </h3>
        <div className="flex flex-wrap gap-2">
          {ALMUERZO_TYPES.map((t) => (
            <TabButton
              key={t.key}
              item={t}
              active={value === t.key}
              count={menuCounts[t.key] || 0}
              onClick={() => onChange(t.key)}
            />
          ))}
        </div>
      </div>

      {/* Sección Especiales */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <span>⭐</span> Packs Especiales
        </h3>
        <div className="flex flex-wrap gap-2">
          {SPECIAL_TYPES.map((t) => (
            <TabButton
              key={t.key}
              item={t}
              active={value === t.key}
              count={menuCounts[t.key] || 0}
              onClick={() => onChange(t.key)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
