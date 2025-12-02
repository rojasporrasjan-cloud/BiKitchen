/**
 * MenusView.jsx
 *
 * Vista para editar el menú oficial de BiKitchen.
 * Sin sistema de fechas - una única plantilla editable.
 */

import React, { useEffect, useState } from 'react';
import { Eye, Save, RotateCcw, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import MenuTabs from '../components/menus/MenuTabs';
import MenuEditor from '../components/menus/MenuEditor';
import {
  getOfficialMenus,
  saveOfficialMenus,
  resetToDefaultMenus
} from '../utils/firestoreMenus';

const EMPTY_MENUS = {
  fullPack: [],
  keto: [],
  bajoCalorias: [],
  ceroCarbos: [],
  sinCarbos: [],
  regular: [],
  vegetariano: [],
  casaditos: []
};

export default function MenusView() {
  const [menus, setMenus] = useState(EMPTY_MENUS);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentType, setCurrentType] = useState('fullPack');

  // Cargar menú oficial al inicio
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getOfficialMenus();
        // Normalizar sinCarbos -> ceroCarbos
        const normalized = { ...EMPTY_MENUS, ...data };
        if (normalized.sinCarbos && !normalized.ceroCarbos) {
          normalized.ceroCarbos = normalized.sinCarbos;
        }
        setMenus(normalized);
        toast.success('Menú oficial cargado');
      } catch (error) {
        console.error('[Menus] Error cargando menús:', error);
        toast.error('Error al cargar el menú. Usando plantilla por defecto.');
      }
      setLoading(false);
    };

    load();
  }, []);

  const handleMenusChange = (type, platos) => {
    setMenus((prev) => ({
      ...prev,
      [type]: platos
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await saveOfficialMenus(menus, {
        lastModifiedBy: 'admin'
      });
      toast.success('✅ Menú oficial guardado correctamente');
    } catch (error) {
      console.error('[Menus] Error guardando menús:', error);
      toast.error('No se pudo guardar el menú.');
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!window.confirm('¿Restaurar el menú a la plantilla original de BiKitchen?')) return;
    
    try {
      setLoading(true);
      const defaultMenus = await resetToDefaultMenus();
      setMenus({ ...EMPTY_MENUS, ...defaultMenus });
      toast.success('Menú restaurado a la plantilla original');
    } catch (error) {
      console.error('[Menus] Error restaurando menús:', error);
      toast.error('No se pudo restaurar el menú.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Menú Oficial BiKitchen</h1>
          <p className="text-sm text-gray-500 mt-1">
            Edita el menú que se muestra en la web. Los cambios se aplican inmediatamente.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Eye size={16} />
            Vista previa
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-sm text-gray-600 hover:bg-gray-200 shadow-sm"
          >
            <RotateCcw size={16} />
            Restaurar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-sm text-white hover:bg-orange-600 shadow-md disabled:opacity-60"
          >
            <Save size={16} />
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Tabs de tipos de menú */}
      <MenuTabs value={currentType} onChange={setCurrentType} />

      {/* Editor de platos para el tipo actual */}
      <div className="mt-4">
        <MenuEditor platos={menus[currentType] || []} onChange={(platos) => handleMenusChange(currentType, platos)} />
      </div>

      {/* Modal de vista previa */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999] p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-1">
                    <Sparkles size={14} />
                    Vista previa para la web
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Menús oficiales BiKitchen</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Así verán los planes tus clientes en la página. Úsalo para revisar combinaciones y textos antes de publicar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="text-sm text-gray-500 hover:text-gray-800 px-3 py-1 rounded-lg hover:bg-gray-100"
                >
                  Cerrar
                </button>
              </div>

              {Object.entries(menus).map(([key, platosRaw], index) => {
                const platos = Array.isArray(platosRaw) ? platosRaw : [];

                const LABELS = {
                  fullPack: 'Full Pack',
                  keto: 'Keto',
                  bajoCalorias: 'Bajo en Calorías',
                  ceroCarbos: 'Cero Carbos',
                  sinCarbos: 'Sin Carbos',
                  regular: 'Regular',
                  vegetariano: 'Vegetariano',
                  casaditos: 'Casaditos'
                };

                const subtitles = {
                  fullPack: 'Plan completo para toda la semana',
                  keto: 'Opciones bajas en carbohidratos',
                  bajoCalorias: 'Opciones ligeras y balanceadas',
                  ceroCarbos: 'Sin carbohidratos añadidos',
                  sinCarbos: 'Sin carbohidratos añadidos',
                  regular: 'Menú tradicional balanceado',
                  vegetariano: 'Sin carne, lleno de vegetales',
                  casaditos: 'Estilo casero, tipo casado'
                };

                const title = LABELS[key] || key;
                const subtitle = subtitles[key] || '';

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    className="border border-gray-100 rounded-2xl p-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 tracking-wide">
                          {title}
                        </h3>
                        {subtitle && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {subtitle}
                          </p>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-[11px] text-gray-500 border border-gray-100">
                        {platos.length} platos
                      </span>
                    </div>

                    {platos.length === 0 && (
                      <p className="text-xs text-gray-500 italic">Sin platos definidos para este menú.</p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                      {platos.map((p, idx) => (
                        <motion.div
                          key={p.numero || idx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.03 + idx * 0.02 }}
                          className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 p-3 text-xs space-y-1 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md hover:border-emerald-100 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 text-[13px]">
                              Plato {p.numero || '-'}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                              Menú del día
                            </span>
                          </div>
                          <p className="text-[11px]">
                            <span className="font-medium text-gray-600">Proteína: </span>
                            <span className="text-gray-700">{p.proteina || 'Por definir'}</span>
                          </p>
                          <p className="text-[11px]">
                            <span className="font-medium text-gray-600">Vegetales: </span>
                            <span className="text-gray-700">{p.vegetal || 'Por definir'}</span>
                          </p>
                          <p className="text-[11px]">
                            <span className="font-medium text-gray-600">Carbohidratos: </span>
                            <span className="text-gray-700">{p.carbo || 'Por definir'}</span>
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
