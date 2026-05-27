import React, { useState } from 'react';
import { useSubstitutions } from '../hooks/useSubstitutions';

const MAX_CHANGES = 2; // máximo de cambios permitidos por categoría

// ─── Sección de sustitución por plato para UNA categoría ───────────────────
function CategorySection({ emoji, label, dishes, options, changes, onChange, fieldKey }) {
  const count = changes.length;
  const atMax = count >= MAX_CHANGES;

  const getSelected = (dishNumber) =>
    changes.find((c) => c.dishNumber === dishNumber)?.newValue || '';

  const handleChange = (dish, dishNumber, newValue) => {
    // Siempre usamos proteina como nombre identificador del plato
    const dishName = dish.proteina || `Plato ${dishNumber}`;
    if (!newValue) {
      onChange(changes.filter((c) => c.dishNumber !== dishNumber));
    } else {
      const exists = changes.find((c) => c.dishNumber === dishNumber);
      if (exists) {
        onChange(changes.map((c) =>
          c.dishNumber === dishNumber ? { ...c, newValue } : c
        ));
      } else {
        onChange([...changes, { dishNumber, dishName, newValue }]);
      }
    }
  };

  // Para vegetal/carbo solo mostramos platos que tengan ese campo con valor
  const visibleDishes = fieldKey === 'proteina'
    ? dishes
    : dishes.filter((d) => d[fieldKey] && d[fieldKey] !== '—' && d[fieldKey].trim() !== '');

  if (visibleDishes.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {/* Header de la sección */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
          {emoji} {label}
        </p>
        {count > 0 && (
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full transition-colors ${
            atMax ? 'text-red-600 bg-red-50' : 'text-orange-500 bg-orange-50'
          }`}>
            {count}/{MAX_CHANGES}
          </span>
        )}
      </div>

      {/* Filas de platos */}
      <div className="space-y-1.5">
        {visibleDishes.slice(0, 5).map((dish, i) => {
          const dishNumber = dish.numero || (i + 1);
          const selected = getSelected(dishNumber);
          const disabled = atMax && !selected;
          const currentVal = dish[fieldKey] || 'Plato del día';

          return (
            <div key={dishNumber} className="flex items-center gap-2.5">
              <span className="w-5 h-5 bg-slate-100 text-slate-500 rounded-md flex items-center justify-center text-[10px] font-black shrink-0">
                {dishNumber}
              </span>
              <p className={`text-xs font-semibold flex-1 min-w-0 truncate ${
                disabled ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {currentVal}
              </p>
              <div className="relative shrink-0" style={{ width: '128px' }}>
                <select
                  value={selected}
                  onChange={(e) => handleChange(dish, dishNumber, e.target.value)}
                  disabled={disabled}
                  className={`w-full appearance-none rounded-xl px-3 py-1.5 pr-6 text-[11px] font-medium focus:outline-none focus:ring-2 focus:ring-orange-200 transition-all border ${
                    disabled
                      ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : selected
                        ? 'bg-orange-50 border-orange-300 text-orange-800 font-bold cursor-pointer'
                        : 'bg-slate-50 border-slate-200 text-slate-400 cursor-pointer'
                  }`}
                >
                  <option value="">Sin cambio</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
                {!disabled && (
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[8px]">▼</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Aviso de límite alcanzado */}
      {atMax && (
        <p className="text-[9px] text-orange-500 font-bold pl-0.5">
          Máximo {MAX_CHANGES} cambios por categoría
        </p>
      )}
    </div>
  );
}

// ─── Per-category dropdowns (IndividualesView y PacksPage) ──────────────────
const GROUPS = [
  { key: 'protein', label: 'Proteína',     emoji: '🍗', optionsKey: 'proteins'   },
  { key: 'vegetal', label: 'Vegetal',      emoji: '🥦', optionsKey: 'vegetables' },
  { key: 'carbo',   label: 'Carbohidrato', emoji: '🍚', optionsKey: 'carbos'     },
];

/**
 * SubstitutionPicker
 *
 * Modo por-plato (cuando se pasa `dishes`):
 *   value = { proteinChanges: [], vegeChanges: [], carboChanges: [] }
 *   Muestra 3 secciones con los 5 platos de la semana, máximo 2 cambios por sección.
 *
 * Modo por-categoría (sin `dishes`):
 *   value = { protein, vegetal, carbo }
 *   Un dropdown por categoría (para platos individuales / packs especiales).
 */
export default function SubstitutionPicker({ value = {}, onChange, dishes, hideEmpty = true }) {
  const { substitutions, loading } = useSubstitutions();
  const [open, setOpen] = useState(false);

  if (loading) return null;

  // ─── MODO POR-PLATO ───────────────────────────────────────────────────────
  if (dishes && dishes.length > 0) {
    const proteins   = substitutions.proteins   || [];
    const vegetables = substitutions.vegetables || [];
    const carbos     = substitutions.carbos     || [];

    const hasAny = (!hideEmpty) || proteins.length > 0 || vegetables.length > 0 || carbos.length > 0;
    if (!hasAny) return null;

    const proteinChanges = Array.isArray(value.proteinChanges) ? value.proteinChanges : [];
    const vegeChanges    = Array.isArray(value.vegeChanges)    ? value.vegeChanges    : [];
    const carboChanges   = Array.isArray(value.carboChanges)   ? value.carboChanges   : [];

    // Conteo total de cambios activos para mostrar en el botón cuando está cerrado
    const totalChanges = proteinChanges.length + vegeChanges.length + carboChanges.length;

    return (
      <div className="border border-slate-200 rounded-2xl overflow-hidden">
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🔄</span>
            <span className="text-xs font-bold text-slate-700">Personalizar platos</span>
            {totalChanges > 0 && !open && (
              <span className="text-[10px] font-black text-white bg-orange-500 px-2 py-0.5 rounded-full">
                {totalChanges} cambio{totalChanges !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span className={`text-slate-400 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* Contenido colapsable */}
        {open && (
          <div className="px-4 pb-4 pt-3 space-y-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400">
              Máximo {MAX_CHANGES} cambios por categoría
            </p>

            {proteins.length > 0 && (
              <CategorySection
                emoji="🍗" label="Proteína"
                dishes={dishes}
                options={proteins}
                changes={proteinChanges}
                onChange={(updated) => onChange?.({ ...value, proteinChanges: updated })}
                fieldKey="proteina"
              />
            )}

            {vegetables.length > 0 && (
              <CategorySection
                emoji="🥦" label="Vegetal"
                dishes={dishes}
                options={vegetables}
                changes={vegeChanges}
                onChange={(updated) => onChange?.({ ...value, vegeChanges: updated })}
                fieldKey="vegetal"
              />
            )}

            {carbos.length > 0 && (
              <CategorySection
                emoji="🍚" label="Carbohidrato"
                dishes={dishes}
                options={carbos}
                changes={carboChanges}
                onChange={(updated) => onChange?.({ ...value, carboChanges: updated })}
                fieldKey="carbo"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── MODO POR-CATEGORÍA (IndividualesView / PacksPage) ───────────────────
  const visibleGroups = GROUPS.filter(
    ({ optionsKey }) => !hideEmpty || (substitutions[optionsKey]?.length > 0)
  );

  if (visibleGroups.length === 0) return null;

  const handleChange = (groupKey, rawValue) => {
    onChange?.({ ...value, [groupKey]: rawValue === '' ? null : rawValue });
  };

  const totalSelected = visibleGroups.filter(({ key }) => value[key]).length;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">🔄</span>
          <span className="text-xs font-bold text-slate-700">Personalizar pedido</span>
          {totalSelected > 0 && !open && (
            <span className="text-[10px] font-black text-white bg-orange-500 px-2 py-0.5 rounded-full">
              {totalSelected} cambio{totalSelected !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className={`text-slate-400 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Contenido colapsable */}
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-slate-100">
          {visibleGroups.map(({ key, label, emoji, optionsKey }) => {
            const options  = substitutions[optionsKey] || [];
            const selected = value[key] ?? '';

            return (
              <div key={key} className="flex items-center gap-3">
                <span className="text-base shrink-0">{emoji}</span>
                <label className="text-xs font-bold text-slate-500 w-24 shrink-0">{label}</label>
                <div className="relative flex-1">
                  <select
                    value={selected ?? ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pr-8 text-sm font-medium text-slate-800 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all cursor-pointer"
                  >
                    <option value="">Del menú</option>
                    {options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▼</span>
                </div>
                {selected && (
                  <button
                    type="button"
                    onClick={() => handleChange(key, '')}
                    className="shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-500 hover:bg-orange-200 flex items-center justify-center text-[10px] font-black transition-colors"
                    title="Quitar selección"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Formatea sustituciones en string legible para WhatsApp / resumen de orden.
 * Maneja los tres formatos históricos.
 */
export function formatSubstitutions(customizations) {
  if (!customizations) return null;
  const parts = [];

  // Formato nuevo: por-plato con 3 categorías separadas
  if (Array.isArray(customizations.proteinChanges)) {
    customizations.proteinChanges.forEach((c) =>
      parts.push(`🍗 Plato ${c.dishNumber} (${c.dishName}) → ${c.newValue}`)
    );
  }
  if (Array.isArray(customizations.vegeChanges)) {
    customizations.vegeChanges.forEach((c) =>
      parts.push(`🥦 Plato ${c.dishNumber} (${c.dishName}) → ${c.newValue}`)
    );
  }
  if (Array.isArray(customizations.carboChanges)) {
    customizations.carboChanges.forEach((c) =>
      parts.push(`🍚 Plato ${c.dishNumber} (${c.dishName}) → ${c.newValue}`)
    );
  }

  // Formato anterior: dishChanges array unificado
  if (Array.isArray(customizations.dishChanges)) {
    customizations.dishChanges.forEach((c) =>
      parts.push(`🍗 Plato ${c.dishNumber} (${c.dishName}) → ${c.newProtein || c.newValue}`)
    );
  }

  // Formato legacy: por categoría global
  if (customizations.protein) parts.push(`Proteína: ${customizations.protein}`);
  if (customizations.vegetal) parts.push(`Vegetal: ${customizations.vegetal}`);
  if (customizations.carbo)   parts.push(`Carbo: ${customizations.carbo}`);

  return parts.length > 0 ? parts.join(' · ') : null;
}
