/**
 * MenuEditor.jsx
 *
 * Editor visual de platos para un tipo de menú semanal.
 * Muestra los platos como cards con inputs para proteína, vegetales y carbohidratos.
 *
 * @author: Alejandro R.
 * @date: 2025-12-01
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

/**
 * MenuEditor
 *
 * @param {Array} platos - Lista de platos del tipo actual
 * @param {function} onChange - Callback con la lista actualizada de platos
 */
export default function MenuEditor({ platos, onChange }) {
  const handleFieldChange = (index, field, value) => {
    const updated = platos.map((p, i) =>
      i === index
        ? {
            ...p,
            [field]: value
          }
        : p
    );
    onChange(updated);
  };

  const addPlato = () => {
    const nextNumero = (platos[platos.length - 1]?.numero || 0) + 1;
    onChange([
      ...platos,
      {
        numero: nextNumero,
        proteina: '',
        vegetal: '',
        carbo: ''
      }
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {platos.map((plato, index) => (
          <motion.div
            key={plato.numero || index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Plato {plato.numero}</h3>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                Menú del día
              </span>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                  Proteína
                </label>
                <input
                  type="text"
                  value={plato.proteina || ''}
                  onChange={(e) => handleFieldChange(index, 'proteina', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                  placeholder="Ej: Pollo BBQ"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                  Vegetales
                </label>
                <input
                  type="text"
                  value={plato.vegetal || ''}
                  onChange={(e) => handleFieldChange(index, 'vegetal', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                  placeholder="Ej: Ensalada criolla"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                  Carbohidratos
                </label>
                <input
                  type="text"
                  value={plato.carbo || ''}
                  onChange={(e) => handleFieldChange(index, 'carbo', e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-500"
                  placeholder="Ej: Puré de papa"
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={addPlato}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-emerald-300 text-emerald-700 text-sm bg-emerald-50 hover:bg-emerald-100 transition-colors"
      >
        <Plus size={16} />
        Agregar plato
      </button>
    </div>
  );
}
