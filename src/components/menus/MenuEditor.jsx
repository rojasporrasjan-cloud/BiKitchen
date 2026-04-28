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
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, GripVertical, Drumstick, Salad, Wheat } from 'lucide-react';

/**
 * MenuEditor
 *
 * @param {Array} platos - Lista de platos del tipo actual
 * @param {function} onChange - Callback con la lista actualizada de platos
 */
export default function MenuEditor({ platos, onChange, menuType = 'regular' }) {
  const isDesayuno = menuType === 'desayuno';
  const isCena = menuType.startsWith('cena'); // Detectar menús de cena
  const isSinCarbos = menuType === 'sinCarbos' || menuType === 'cenaSinCarbos';
  const isKeto = menuType === 'keto' || menuType === 'cenaKeto';
  const isFamiliar = menuType === 'familiarPremium' || menuType === 'familiarDeluxe';
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

  const removePlato = (index) => {
    if (!window.confirm(`¿Eliminar el Plato ${platos[index]?.numero}?`)) return;
    const updated = platos.filter((_, i) => i !== index);
    // Renumerar platos
    const renumbered = updated.map((p, i) => ({ ...p, numero: i + 1 }));
    onChange(renumbered);
  };

  // Calcular progreso de completitud
  const getCompleteness = (plato) => {
    // Para menús familiares, solo verificar que tenga proteína (nombre del platillo)
    if (isFamiliar) {
      return plato.proteina?.trim() ? 1 : 0;
    }
    let filled = 0;
    if (plato.proteina?.trim()) filled++;
    if (plato.vegetal?.trim()) filled++;
    // Si es sin carbos, no contar carbohidratos en el progreso
    if (!isSinCarbos && plato.carbo?.trim()) filled++;
    return isSinCarbos ? filled : (plato.carbo?.trim() ? filled + 1 : filled);
  };

  return (
    <div className="space-y-6">
      {/* Indicador de progreso */}
      {platos.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso del menú</span>
            <span className="text-sm font-bold text-orange-600">
              {platos.filter(p => isFamiliar ? getCompleteness(p) === 1 : getCompleteness(p) === 3).length} / {platos.length} platos completos
            </span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(platos.filter(p => isFamiliar ? getCompleteness(p) === 1 : getCompleteness(p) === 3).length / Math.max(platos.length, 1)) * 100}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Grid de platos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {platos.map((plato, index) => {
            const completeness = getCompleteness(plato);
            const isComplete = isFamiliar ? completeness === 1 : (isSinCarbos ? completeness === 2 : completeness === 3);
            
            return (
              <motion.div
                key={plato.numero || index}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className={`group bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all ${
                  isComplete 
                    ? 'border-green-200 bg-gradient-to-br from-white to-green-50/30' 
                    : 'border-gray-100 hover:border-orange-200'
                }`}
              >
                {/* Header del plato */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${
                  isComplete ? 'border-green-100 bg-green-50/50' : 'border-gray-50 bg-gray-50/50'
                } rounded-t-2xl`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                      isComplete 
                        ? 'bg-gradient-to-br from-green-400 to-green-500' 
                        : 'bg-gradient-to-br from-orange-400 to-orange-500'
                    }`}>
                      {plato.numero}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Plato {plato.numero}</h3>
                      {!isFamiliar && (
                        <div className="flex gap-1 mt-0.5">
                          {[0, 1, 2].map((i) => (
                            <div 
                              key={i} 
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < completeness ? 'bg-green-400' : 'bg-gray-200'
                              }`} 
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePlato(index)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar plato"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Campos del plato */}
                <div className="p-4 space-y-3">
                  {isFamiliar ? (
                    /* Formato especial para menús familiares: solo un campo */
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                        <span className="text-base">👨‍👩‍👧‍👦</span>
                        Platillo completo
                      </label>
                      <textarea
                        value={plato.proteina || ''}
                        onChange={(e) => handleFieldChange(index, 'proteina', e.target.value)}
                        rows={3}
                        className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all resize-none ${
                          plato.proteina?.trim() 
                            ? 'border-green-200 bg-green-50/30 focus:ring-green-100 focus:border-green-400' 
                            : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                        }`}
                        placeholder="Ej: Spaguettis en salsa pomodoro con pollo (4 porciones)"
                      />
                      <p className="text-xs text-gray-500 mt-1.5">💡 Incluye el nombre completo del platillo y las porciones</p>
                    </div>
                  ) : (
                    /* Formato normal para otros menús (incluyendo desayunos ahora): 3 campos */
                    <>
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                          {isDesayuno ? (
                            <>
                              <span className="text-base">🍳</span>
                              Plato principal
                            </>
                          ) : (
                            <>
                              <Drumstick size={12} className="text-orange-400" />
                              Proteína
                            </>
                          )}
                        </label>
                        <input
                          type="text"
                          value={plato.proteina || ''}
                          onChange={(e) => handleFieldChange(index, 'proteina', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                            plato.proteina?.trim() 
                              ? 'border-green-200 bg-green-50/30 focus:ring-green-100 focus:border-green-400' 
                              : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                          }`}
                          placeholder={isDesayuno ? "Ej: Gallo pinto con huevos, Tostadas francesas..." : "Ej: Pollo BBQ, Lomo en salsa..."}
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                          {isDesayuno ? (
                            <>
                              <span className="text-base">🧈</span>
                              Acompañamiento
                            </>
                          ) : (
                            <>
                              <Salad size={12} className="text-green-500" />
                              Vegetales
                            </>
                          )}
                        </label>
                        <input
                          type="text"
                          value={plato.vegetal || ''}
                          onChange={(e) => handleFieldChange(index, 'vegetal', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                            plato.vegetal?.trim() 
                              ? 'border-green-200 bg-green-50/30 focus:ring-green-100 focus:border-green-400' 
                              : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                          }`}
                          placeholder={isDesayuno ? "Ej: Queso fresco, Frutas frescas, Natilla..." : "Ej: Ensalada criolla, Vegetales al vapor..."}
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 mb-1">
                          {isDesayuno ? (
                            <>
                              <span className="text-base">☕</span>
                              Bebida
                            </>
                          ) : (
                            <>
                              <Wheat size={12} className="text-amber-500" />
                              Carbohidratos
                              {(isSinCarbos || isKeto) && (
                                <span className="ml-auto text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">🚫 Bloqueado</span>
                              )}
                            </>
                          )}
                        </label>
                        <input
                          type="text"
                          value={(isSinCarbos || isKeto) ? 'Sin carbohidratos' : (plato.carbo || '')}
                          onChange={(e) => handleFieldChange(index, 'carbo', e.target.value)}
                          disabled={isSinCarbos || isKeto}
                          className={`w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                            (isSinCarbos || isKeto)
                              ? 'border-red-200 bg-red-50/30 text-red-600 cursor-not-allowed opacity-75'
                              : plato.carbo?.trim() 
                                ? 'border-green-200 bg-green-50/30 focus:ring-green-100 focus:border-green-400' 
                                : 'border-gray-200 focus:ring-orange-100 focus:border-orange-400'
                          }`}
                          placeholder={isDesayuno ? "Ej: Café o jugo, Tortilla..." : "Ej: Arroz, Puré de papa, Pasta..."}
                          title={(isSinCarbos || isKeto) ? 'Este tipo de menú no incluye carbohidratos' : ''}
                        />
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Botón para agregar plato */}
        <motion.button
          type="button"
          onClick={addPlato}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-orange-200 bg-gradient-to-br from-orange-50/50 to-amber-50/50 text-orange-500 hover:border-orange-400 hover:bg-orange-50 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-orange-100 group-hover:bg-orange-200 flex items-center justify-center transition-colors">
            <Plus size={24} />
          </div>
          <span className="font-medium">Agregar plato</span>
          <span className="text-xs text-orange-400">Plato #{platos.length + 1}</span>
        </motion.button>
      </div>

      {/* Mensaje cuando no hay platos */}
      {platos.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="text-4xl mb-3">🍽️</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">Sin platos configurados</h3>
          <p className="text-sm text-gray-500 mb-4">Agrega platos para este tipo de menú</p>
          <button
            type="button"
            onClick={addPlato}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors"
          >
            <Plus size={18} />
            Agregar primer plato
          </button>
        </div>
      )}
    </div>
  );
}
