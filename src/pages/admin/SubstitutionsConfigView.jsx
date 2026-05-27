import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Plus, X, Save, RefreshCw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GROUPS = [
  { key: 'proteins',   label: 'Proteínas',      emoji: '🍗', placeholder: 'Ej: Pollo, Res, Cerdo...' },
  { key: 'vegetables', label: 'Vegetales',       emoji: '🥦', placeholder: 'Ej: Ensalada verde, Coliflor...' },
  { key: 'carbos',     label: 'Carbohidratos',   emoji: '🍚', placeholder: 'Ej: Arroz integral, Papa...' },
];

const DEFAULT_DATA = { proteins: [], vegetables: [], carbos: [] };

function Toast({ message, type = 'success', onHide }) {
  useEffect(() => {
    const t = setTimeout(onHide, 3000);
    return () => clearTimeout(t);
  }, [onHide]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-xl font-semibold text-sm text-white flex items-center gap-2 ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
      }`}
    >
      {type === 'error' ? '⚠️' : '✅'} {message}
    </motion.div>
  );
}

function GroupSection({ group, items, onChange }) {
  const [inputValue, setInputValue] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [dupWarning, setDupWarning] = useState(false);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (items.includes(trimmed)) {
      setDupWarning(true);
      setTimeout(() => setDupWarning(false), 2000);
      setInputValue('');
      return;
    }
    onChange([...items, trimmed]);
    setInputValue('');
  };

  const handleRemove = (item) => {
    onChange(items.filter((i) => i !== item));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAdd();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Collapsible header — using div, not button, to avoid nested-button issues */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((v) => !v); } }}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{group.emoji}</span>
          <div className="text-left">
            <h3 className="font-bold text-gray-900">{group.label}</h3>
            <p className="text-xs text-gray-400">{items.length} opción{items.length !== 1 ? 'es' : ''} configurada{items.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={18} className="text-gray-400" />
        </motion.div>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4 border-t border-gray-50">
              {/* Add input */}
              <div className="flex gap-2 pt-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={group.placeholder}
                  className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 transition-all ${
                    dupWarning ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!inputValue.trim()}
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                >
                  <Plus size={16} />
                  Añadir
                </button>
              </div>

              {/* Duplicate warning */}
              {dupWarning && (
                <p className="text-xs text-amber-600 font-semibold -mt-2">
                  ⚠️ Esa opción ya existe en la lista
                </p>
              )}

              {/* Pills */}
              {items.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  Sin opciones todavía. Añade la primera arriba.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-1.5 bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium group"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        className="w-4 h-4 rounded-full bg-gray-300 hover:bg-red-400 group-hover:bg-red-400 text-white flex items-center justify-center transition-colors ml-0.5"
                      >
                        <X size={10} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SubstitutionsConfigView() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [originalData, setOriginalData] = useState(DEFAULT_DATA);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const isDirty = JSON.stringify(data) !== JSON.stringify(originalData);

  useEffect(() => {
    setLoading(true);
    getDoc(doc(db, 'config', 'substitutions'))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          const parsed = {
            proteins:   Array.isArray(d.proteins)   ? d.proteins   : [],
            vegetables: Array.isArray(d.vegetables) ? d.vegetables : [],
            carbos:     Array.isArray(d.carbos)     ? d.carbos     : [],
          };
          setData(parsed);
          setOriginalData(parsed);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleGroupChange = (key, newItems) => {
    setData((prev) => ({ ...prev, [key]: newItems }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'config', 'substitutions'), {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      setOriginalData(data);
      setToast({ message: 'Opciones guardadas correctamente', type: 'success' });
    } catch (e) {
      console.error(e);
      setToast({ message: 'Error al guardar. Inténtalo de nuevo.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('¿Descartar todos los cambios sin guardar?')) return;
    setData(originalData);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opciones de Sustitución</h1>
          <p className="text-sm text-gray-500 mt-1">
            Los clientes podrán elegir estas opciones al pedir. Sin opciones = sin selector.
          </p>
        </div>
        {isDirty && (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            Sin guardar
          </span>
        )}
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-700 leading-relaxed">
        <strong>¿Cómo funciona?</strong> Configura aquí las proteínas alternativas disponibles.
        Al pedir un pack, el cliente verá los 5 platos de la semana y podrá indicar si quiere cambiar
        la proteína de algún plato específico. También puedes configurar opciones de vegetal y carbo
        para pedidos individuales.
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((group) => (
            <GroupSection
              key={group.key}
              group={group}
              items={data[group.key]}
              onChange={(newItems) => handleGroupChange(group.key, newItems)}
            />
          ))}
        </div>
      )}

      {/* Save bar */}
      <div className="flex gap-3 pt-2">
        {isDirty && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-sm transition-colors"
          >
            <RefreshCw size={16} />
            Descartar
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-sm"
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onHide={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
