/**
 * MenusView.jsx
 *
 * Vista para editar el menú oficial de BiKitchen.
 * Sin sistema de fechas - una única plantilla editable.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Eye, Save, RotateCcw, Sparkles, DollarSign, X, ChefHat, Utensils, Calendar, Coffee, Sun, Moon, Trash2, Plus, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';

import MenuTabs from '../components/menus/MenuTabs';
import MenuEditor from '../components/menus/MenuEditor';
import {
  getOfficialMenus,
  saveOfficialMenus,
  resetToDefaultMenus,
  getPackPrices,
  savePackPrices,
  DEFAULT_MENUS
} from '../utils/firestoreMenus';
import { clearAppCache, forceMenusReload } from '../utils/cacheUtils';

const EMPTY_MENUS = {
  desayuno: [],
  // Menús de Almuerzo
  fullPack: [],
  keto: [],
  bajoCalorias: [],
  sinCarbos: [],
  regular: [],
  vegetariano: [],
  casaditos: [],
  // Menús de Cena (estructura anidada)
  cena: {
    fullPack: [],
    keto: [],
    bajoCalorias: [],
    sinCarbos: [],
    regular: [],
    vegetariano: [],
    casaditos: []
  },
  // Packs especiales
  familiarPremium: [],
  familiarDeluxe: []
};

// Nota: Desayuno se edita por separado
// Almuerzo y Cena tienen menús SEPARADOS (cenaFullPack, cenaKeto, etc.)

// Estructura de precios por defecto (monthly ya incluye 10% de descuento)
const DEFAULT_PRICES = {
  '5_comidas': {
    title: '5 Comidas',
    packs: {
      'Pack Sin Carbos': { weekly: 24500, biweekly: 45600, monthly: 88200 },
      'Pack Bajo Calorías': { weekly: 25850, biweekly: 49000, monthly: 93060 },
      'Pack Regular': { weekly: 27850, biweekly: 52000, monthly: 100260 },
      'Pack Casaditos': { weekly: 27850, biweekly: 52000, monthly: 100260 },
      'Full Pack': { weekly: 33900, biweekly: 64000, monthly: 122040 },
      'Pack Vegetariano': { weekly: 27850, biweekly: 52000, monthly: 100260 },
      'Pack Keto': { weekly: 33900, biweekly: 64000, monthly: 122040 }
    }
  },
  '10_comidas': {
    title: '10 Comidas',
    packs: {
      'Pack Sin Carbos': { weekly: 49000, biweekly: 91000, monthly: 176400 },
      'Pack Bajo Calorías': { weekly: 51700, biweekly: 93000, monthly: 186120 },
      'Pack Regular': { weekly: 55700, biweekly: 100260, monthly: 200520 },
      'Pack Casaditos': { weekly: 55700, biweekly: 100260, monthly: 200520 },
      'Full Pack': { weekly: 67800, biweekly: 126000, monthly: 244080 },
      'Pack Vegetariano': { weekly: 55700, biweekly: 100260, monthly: 200520 },
      'Pack Keto': { weekly: 67800, biweekly: 126000, monthly: 244080 }
    }
  },
  '15_comidas': {
    title: '15 Comidas',
    packs: {
      'Pack Sin Carbos': { weekly: 61500, biweekly: 114500, monthly: 221400 },
      'Pack Bajo Calorías': { weekly: 65200, biweekly: 121200, monthly: 234720 },
      'Pack Regular': { weekly: 69700, biweekly: 128700, monthly: 250920 },
      'Pack Casaditos': { weekly: 69200, biweekly: 128700, monthly: 249120 },
      'Full Pack': { weekly: 81300, biweekly: 151300, monthly: 292680 },
      'Pack Vegetariano': { weekly: 69200, biweekly: 128700, monthly: 249120 },
      'Pack Keto': { weekly: 78000, biweekly: 151300, monthly: 280800 }
    }
  },
  'two_pack': {
    title: 'Two Pack',
    packs: {
      'Pack Sin Carbos': { weekly: 49000, biweekly: 91000, monthly: 147000 },
      'Pack Bajo Calorías': { weekly: 51700, biweekly: 93000, monthly: 155100 },
      'Pack Regular': { weekly: 55700, biweekly: 100260, monthly: 167100 },
      'Pack Casaditos': { weekly: 55700, biweekly: 100260, monthly: 167100 },
      'Full Pack': { weekly: 67800, biweekly: 126000, monthly: 203400 },
      'Pack Vegetariano': { weekly: 55700, biweekly: 100260, monthly: 167100 },
      'Pack Keto': { weekly: 67800, biweekly: 126000, monthly: 203400 }
    }
  }
};

export default function MenusView() {
  const [menus, setMenus] = useState(null); // Init as null to prevent accidental empty saves
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true); // Start loading true
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pricesOpen, setPricesOpen] = useState(false);
  const [prices, setPrices] = useState(DEFAULT_PRICES);
  const [currentMealType, setCurrentMealType] = useState('almuerzo'); // desayuno, almuerzo, cena
  const [currentType, setCurrentType] = useState('fullPack');
  const [selectedTypes, setSelectedTypes] = useState(['fullPack']); // Tipos de menú seleccionados para edición múltiple
  const [newProtein, setNewProtein] = useState(''); // Estado para input de proteína

  // Cargar menú oficial y precios al inicio
  useEffect(() => {
    const loadMenus = async () => {
      setLoading(true); // Ensure loading is true at start
      setLoadError(false);
      try {
        // Forzar recarga desde Firebase en Admin para siempre ver datos frescos
        const data = await getOfficialMenus(true);
        if (!data) throw new Error("No data received from Firestore");

        const normalized = { ...EMPTY_MENUS, ...data };

        // Forzar inicialización de menús familiares si están vacíos
        let needsSave = false;
        if (!normalized.familiarPremium || normalized.familiarPremium.length === 0) {
          normalized.familiarPremium = DEFAULT_MENUS.familiarPremium || [];
          needsSave = true;
        }
        if (!normalized.familiarDeluxe || normalized.familiarDeluxe.length === 0) {
          normalized.familiarDeluxe = DEFAULT_MENUS.familiarDeluxe || [];
          needsSave = true;
        }

        // Si se inicializaron menús vacíos, guardarlos
        if (needsSave) {
          await saveOfficialMenus(normalized);
          toast.success('✅ Menús familiares inicializados');
        }

        setMenus(normalized);

        // Cargar precios - hacer merge con los defaults
        const pricesData = await getPackPrices();
        if (pricesData) {
          // Merge: mantener estructura de DEFAULT_PRICES pero actualizar valores de Firestore
          const mergedPrices = { ...DEFAULT_PRICES };
          Object.keys(DEFAULT_PRICES).forEach(categoryKey => {
            if (pricesData[categoryKey]?.packs) {
              mergedPrices[categoryKey] = {
                ...DEFAULT_PRICES[categoryKey],
                packs: { ...DEFAULT_PRICES[categoryKey].packs }
              };
              Object.keys(DEFAULT_PRICES[categoryKey].packs).forEach(packName => {
                if (pricesData[categoryKey].packs[packName]) {
                  mergedPrices[categoryKey].packs[packName] = {
                    ...DEFAULT_PRICES[categoryKey].packs[packName],
                    ...pricesData[categoryKey].packs[packName]
                  };
                }
              });
            }
          });
          setPrices(mergedPrices);
        }

        toast.success('Menú oficial cargado');
      } catch (error) {
        console.error('[Menus] Error cargando menús:', error);
        setLoadError(true);
        setMenus(null); // Keep menus null to prevent editing empty state
        toast.error('Error CRÍTICO cargando menús. No se puede guardar.');
      } finally {
        setLoading(false);
      }
    };

    loadMenus();
  }, []);

  const handleMenusChange = (type, platos) => {
    if (!menus) return;
    // Detectar si es un menú de cena (cena_fullPack, cena_keto, etc.)
    const isCenaMenu = type.startsWith('cena_');

    if (isCenaMenu) {
      // Extraer el menuKey (fullPack, keto, etc.)
      const menuKey = type.replace('cena_', '');

      if (selectedTypes.length > 1) {
        // Edición múltiple para cena
        setMenus(prev => {
          if (!prev) return null;
          const updated = { ...prev, cena: { ...prev.cena } };
          selectedTypes.forEach(selectedType => {
            updated.cena[selectedType] = platos;
          });
          return updated;
        });
      } else {
        // Edición simple para cena
        setMenus((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            cena: {
              ...prev.cena,
              [menuKey]: platos
            }
          };
        });
      }
    } else {
      // Menús de almuerzo o desayuno
      if (selectedTypes.length > 1) {
        setMenus(prev => {
          if (!prev) return null;
          const updated = { ...prev };
          selectedTypes.forEach(selectedType => {
            updated[selectedType] = platos;
          });
          return updated;
        });
      } else {
        setMenus((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            [type]: platos
          };
        });
      }
    }
  };

  // Manejar cambio de precio
  const handlePriceChange = (category, packName, period, value) => {
    const numValue = parseInt(value) || 0;
    setPrices(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        packs: {
          ...prev[category].packs,
          [packName]: {
            ...prev[category].packs[packName],
            [period]: numValue
          }
        }
      }
    }));
  };

  // Guardar precios
  const handleSavePrices = async () => {
    try {
      setLoading(true);
      await savePackPrices(prices);
      toast.success('✅ Precios guardados correctamente');
      setPricesOpen(false);
    } catch (error) {
      console.error('[Menus] Error guardando precios:', error);
      toast.error('No se pudo guardar los precios.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!menus || loadError) {
      toast.error('⚠️ No se puede guardar: Error de carga o datos vacíos.');
      return;
    }
    try {
      setLoading(true);

      // Si hay múltiples tipos seleccionados, sincronizar todos con el contenido del tipo actual
      let menusToSave = { ...menus };

      if (selectedTypes.length > 1 && currentMealType !== 'desayuno' && currentMealType !== 'proteinas') {
        if (currentMealType === 'cena') {
          // Edición múltiple para cena: aplicar a todos los tipos de cena seleccionados
          const currentContent = menus.cena?.[currentType] || [];
          menusToSave.cena = { ...menus.cena };
          selectedTypes.forEach(type => {
            menusToSave.cena[type] = currentContent;
          });
        } else {
          // Edición múltiple para almuerzo
          const currentContent = menus[currentType];
          selectedTypes.forEach(type => {
            menusToSave[type] = currentContent;
          });
        }
      }

      console.log('[handleSave] Guardando menusToSave.cena:', menusToSave.cena);


      // Auto-Sync Removed: Users manage proteins manually in the "Proteínas" tab.


      await saveOfficialMenus(menusToSave, {
        invalidateCache: true
      });
      await savePackPrices(prices);

      // CRÍTICO: Recargar la página para asegurar que Gina vea los cambios guardados
      toast.success('✅ Menús y proteínas guardados correctamente.', { duration: 3000 });

      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('[Menus] Error guardando:', error);
      toast.error('❌ Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('¿Restaurar el menú a la plantilla original de BiKitchen?')) return;

    try {
      setLoading(true);
      const defaultMenus = await resetToDefaultMenus();
      setMenus({ ...EMPTY_MENUS, ...defaultMenus });
      setLoadError(false); // Reset error state on manual reset
      toast.success('Menú restaurado a la plantilla original');
    } catch (error) {
      console.error('[Menus] Error restaurando menús:', error);
      toast.error('No se pudo restaurar el menú.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = () => {
    if (!window.confirm('¿Limpiar el caché de la aplicación? Esto forzará que los móviles vean los cambios más recientes.')) return;

    try {
      clearAppCache();
      forceMenusReload();
      toast.success('✅ Caché limpiado. Los móviles verán los cambios al recargar la página.');
    } catch (error) {
      console.error('[Menus] Error limpiando caché:', error);
      toast.error('No se pudo limpiar el caché.');
    }
  };

  // Calcular contadores de platos por tipo de menú
  const menuCounts = useMemo(() => {
    if (!menus) return {};
    const counts = {};
    Object.entries(menus).forEach(([key, platos]) => {
      // Manejar menús de cena anidados
      if (key === 'cena' && typeof platos === 'object') {
        Object.entries(platos).forEach(([cenaKey, cenaPlatos]) => {
          counts[`cena_${cenaKey}`] = Array.isArray(cenaPlatos) ? cenaPlatos.length : 0;
        });
        return;
      }
      counts[key] = Array.isArray(platos) ? platos.length : 0;
    });
    return counts;
  }, [menus]);

  // Total de platos
  const totalPlatos = useMemo(() => {
    return Object.values(menuCounts).reduce((sum, count) => sum + count, 0);
  }, [menuCounts]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header mejorado */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-400 to-amber-400 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <ChefHat size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Menú Oficial BiKitchen</h1>
              <p className="text-white/80 text-sm mt-1">
                Configura los platos de cada tipo de menú semanal
              </p>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          <div className="flex gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{totalPlatos}</div>
              <div className="text-xs text-white/80">Platos totales</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{menus ? Object.keys(menus).length : 0}</div>
              <div className="text-xs text-white/80">Tipos de menú</div>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-white/20">
          <button
            type="button"
            onClick={() => setPricesOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
          >
            <DollarSign size={16} />
            Editar Precios
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-sm text-white hover:bg-white/30 transition-colors"
          >
            <Eye size={16} />
            Vista previa
          </button>

          <button
            type="button"
            onClick={handleClearCache}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500/90 backdrop-blur-sm text-sm text-white hover:bg-blue-600 transition-colors"
            title="Limpiar caché para que móviles vean los cambios"
          >
            <Trash2 size={16} />
            Limpiar Caché
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-sm text-white/80 hover:bg-white/20 transition-colors"
          >
            <RotateCcw size={16} />
            Restaurar
          </button>

          <div className="flex-1" />

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !menus || loadError}
            className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition-colors ${loading || !menus || loadError
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              : 'bg-white text-orange-600 hover:bg-orange-50'
              }`}
            title={loadError ? "Error de carga. No se puede guardar." : ""}
          >
            <Save size={16} />
            {loading ? 'Guardando...' : loadError ? 'Error (Backup Required)' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Tabs de tipo de comida (Desayuno/Almuerzo/Cena) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-white via-orange-50/30 to-white rounded-3xl p-6 shadow-xl border border-orange-100/50 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <Utensils size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-800">Tipo de comida</h3>
            <p className="text-xs text-gray-500">Selecciona qué menú deseas editar</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setCurrentMealType('desayuno')}
            className={`relative flex-1 flex flex-col items-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 ${currentMealType === 'desayuno'
              ? 'text-white shadow-2xl scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/80 hover:shadow-md hover:scale-102 bg-white/50'
              }`}
          >
            {currentMealType === 'desayuno' && (
              <motion.span
                layoutId="mealTypeHighlight"
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-400 to-orange-500 shadow-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <Coffee size={24} className="relative z-10" />
            <span className="relative z-10">Desayuno</span>
            {currentMealType === 'desayuno' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            )}
          </button>

          <button
            onClick={() => setCurrentMealType('almuerzo')}
            className={`relative flex-1 flex flex-col items-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 ${currentMealType === 'almuerzo'
              ? 'text-white shadow-2xl scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/80 hover:shadow-md hover:scale-102 bg-white/50'
              }`}
          >
            {currentMealType === 'almuerzo' && (
              <motion.span
                layoutId="mealTypeHighlight"
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-red-400 shadow-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <Sun size={24} className="relative z-10" />
            <span className="relative z-10">Almuerzo</span>
            {currentMealType === 'almuerzo' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            )}
          </button>

          <button
            onClick={() => setCurrentMealType('cena')}
            className={`relative flex-1 flex flex-col items-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 ${currentMealType === 'cena'
              ? 'text-white shadow-2xl scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/80 hover:shadow-md hover:scale-102 bg-white/50'
              }`}
          >
            {currentMealType === 'cena' && (
              <motion.span
                layoutId="mealTypeHighlight"
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-400 shadow-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <Moon size={24} className="relative z-10" />
            <span className="relative z-10">Cena</span>
            {currentMealType === 'cena' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            )}
          </button>

          <button
            onClick={() => setCurrentMealType('proteinas')}
            className={`relative flex-1 flex flex-col items-center gap-2 px-6 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 ${currentMealType === 'proteinas'
              ? 'text-white shadow-2xl scale-105'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/80 hover:shadow-md hover:scale-102 bg-white/50'
              }`}
          >
            {currentMealType === 'proteinas' && (
              <motion.span
                layoutId="mealTypeHighlight"
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-red-400 via-rose-500 to-pink-500 shadow-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <Utensils size={24} className="relative z-10" />
            <span className="relative z-10">Proteínas</span>
            {currentMealType === 'proteinas' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <span className="text-white text-xs">✓</span>
              </motion.div>
            )}
          </button>
        </div>
      </motion.div>

      {/* Mensaje informativo para desayunos */}
      <AnimatePresence mode="wait">
        {currentMealType === 'desayuno' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 rounded-3xl p-6 border-2 border-amber-200/50 shadow-lg backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Coffee size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                  Menú de Desayunos
                  <span className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded-full font-semibold">Único</span>
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Este menú se usa en el <strong className="text-orange-600">pack de 15 comidas</strong> y en el card de <strong className="text-orange-600">"Desayunos de la Semana"</strong> del catálogo.
                  <br />
                  <span className="inline-flex items-center gap-1 mt-2 text-xs text-amber-700">
                    <Sparkles size={14} />
                    Los cambios se sincronizarán automáticamente en ambos lugares.
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs de tipos de menú (solo para almuerzo/cena) */}
      <AnimatePresence mode="wait">
        {currentMealType !== 'desayuno' && currentMealType !== 'proteinas' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <MenuTabs
              value={currentType}
              onChange={(newType) => {
                setCurrentType(newType);
                // Al cambiar de tab, actualizar los tipos seleccionados
                if (!selectedTypes.includes(newType)) {
                  setSelectedTypes([newType]);
                }
              }}
              menuCounts={menuCounts}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className={`rounded-3xl p-6 border-2 shadow-lg backdrop-blur-sm mt-4 ${currentMealType === 'almuerzo'
                ? 'bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 border-orange-200/50'
                : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-indigo-200/50'
                }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${currentMealType === 'almuerzo'
                  ? 'bg-gradient-to-br from-orange-400 to-red-500'
                  : 'bg-gradient-to-br from-indigo-400 to-purple-500'
                  }`}>
                  {currentMealType === 'almuerzo' ? <Sun size={24} className="text-white" /> : <Moon size={24} className="text-white" />}
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
                    Menú de {currentMealType === 'almuerzo' ? 'Almuerzo' : 'Cena'}
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${currentMealType === 'almuerzo'
                      ? 'bg-orange-200 text-orange-800'
                      : 'bg-indigo-200 text-indigo-800'
                      }`}>
                      {currentMealType === 'almuerzo' ? 'Packs 5, 10 y 15' : 'SEPARADO'}
                    </span>
                  </h4>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {currentMealType === 'almuerzo'
                      ? (
                        <>
                          Este menú se usa en <strong className="text-orange-600">todos los packs de 5, 10 y 15 comidas</strong> para el almuerzo.
                          <br />
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-orange-700">
                            <Sparkles size={14} />
                            Edita aquí para actualizar todos los almuerzos.
                          </span>
                        </>
                      )
                      : (
                        <>
                          Este menú es <strong className="text-indigo-600">SEPARADO del almuerzo</strong>. Los packs de 10 y 15 comidas incluyen cena.
                          <br />
                          <span className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-700">
                            <Sparkles size={14} />
                            Edita aquí para cambiar SOLO los menús de cena.
                          </span>
                        </>
                      )
                    }
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gestor Manual de Proteínas (TAB Específico) */}
      <AnimatePresence mode="wait">
        {menus && currentMealType === 'proteinas' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50/50 border-2 border-red-200/60 rounded-3xl p-6 shadow-sm min-h-[400px]"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg">
                  <Utensils size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-xl">Proteínas para Packs</h3>
                  <p className="text-sm text-gray-600 max-w-md leading-relaxed mt-1">
                    Define qué proteínas pueden elegir los clientes en los "Pack de 3" y "Pack de 5".
                    <span className="block text-red-600 font-semibold mt-1">
                      * Esta lista es independiente del menú semanal.
                    </span>
                  </p>
                </div>
              </div>

              {/* Input para agregar nueva proteína */}
              <div className="flex gap-2 w-full sm:w-auto items-start">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Escribe una nueva proteína..."
                    value={newProtein}
                    onChange={(e) => setNewProtein(e.target.value)}
                    className="px-5 py-3 rounded-xl border-2 border-red-100 focus:ring-4 focus:ring-red-100 focus:border-red-400 outline-none w-full sm:w-80 transition-all font-medium text-gray-700 bg-white shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newProtein.trim()) {
                        const val = newProtein.trim();
                        const formatted = val.charAt(0).toUpperCase() + val.slice(1);

                        if (menus.proteinasDisponibles?.includes(formatted)) {
                          toast.error('Esa proteína ya existe');
                          return;
                        }

                        setMenus(prev => ({
                          ...prev,
                          proteinasDisponibles: [...(prev.proteinasDisponibles || []), formatted].sort()
                        }));
                        setNewProtein('');
                        toast.success('Proteína agregada');
                      }
                    }}
                    id="newProteinInputTab"
                  />
                  <div className="absolute right-3 top-3.5 text-xs font-bold text-gray-400 pointer-events-none">ENTER ↵</div>
                </div>
                <button
                  onClick={() => {
                    if (newProtein && newProtein.trim()) {
                      const val = newProtein.trim();
                      const formatted = val.charAt(0).toUpperCase() + val.slice(1);

                      if (menus.proteinasDisponibles?.includes(formatted)) {
                        toast.error('Esa proteína ya existe');
                        return;
                      }

                      setMenus(prev => ({
                        ...prev,
                        proteinasDisponibles: [...(prev.proteinasDisponibles || []), formatted].sort()
                      }));
                      setNewProtein('');
                      toast.success('Proteína agregada');
                    }
                  }}
                  className="bg-gradient-to-br from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white p-3.5 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <Plus size={24} />
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-red-100 shadow-sm min-h-[200px]">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">
                Proteínas Activas ({menus.proteinasDisponibles?.length || 0})
              </h4>

              <div className="flex flex-wrap gap-3">
                {(menus.proteinasDisponibles && menus.proteinasDisponibles.length > 0) ? (
                  menus.proteinasDisponibles.map((p, i) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      key={`${p}-${i}`}
                      className="flex items-center gap-3 pl-4 pr-2 py-2.5 bg-gray-50 hover:bg-white border-2 border-transparent hover:border-red-200 text-gray-700 font-semibold rounded-2xl transition-all group cursor-default shadow-sm hover:shadow-md"
                    >
                      <span className="text-base">{p}</span>
                      <button
                        onClick={() => {
                          setMenus(prev => ({
                            ...prev,
                            proteinasDisponibles: prev.proteinasDisponibles.filter((_, idx) => idx !== i)
                          }));
                          toast('Proteína eliminada', { icon: '🗑️' });
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                        title="Eliminar"
                      >
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))
                ) : (
                  <div className="w-full text-center py-12 text-gray-400 flex flex-col items-center gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                      <Package size={40} className="opacity-30" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-500">Lista vacía</p>
                      <p className="text-sm">Agrega opciones usando el campo de arriba.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <p className="text-sm text-red-600/80 font-medium bg-red-100/50 px-4 py-2 rounded-xl flex items-center gap-2">
                <Save size={16} />
                Recuerda guardar los cambios generales del menú para aplicar.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selector de tipos múltiples (solo para almuerzo/cena) */}
      {currentMealType !== 'desayuno' && currentMealType !== 'proteinas' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-white via-blue-50/20 to-white rounded-3xl p-6 shadow-xl border border-gray-100/50 mt-4"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-800">Edición Múltiple</h4>
              <p className="text-xs text-gray-500">Selecciona los tipos de menú que deseas editar simultáneamente</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { key: 'fullPack', label: 'Full Pack', emoji: '🍱', color: 'orange' },
              { key: 'keto', label: 'Keto', emoji: '🥑', color: 'green' },
              { key: 'bajoCalorias', label: 'Bajo Calorías', emoji: '🥗', color: 'emerald' },
              { key: 'sinCarbos', label: 'Sin Carbos', emoji: '🥩', color: 'red' },
              { key: 'regular', label: 'Regular', emoji: '🍽️', color: 'blue' },
              { key: 'vegetariano', label: 'Vegetariano', emoji: '🥬', color: 'lime' },
              { key: 'casaditos', label: 'Casaditos', emoji: '🍛', color: 'amber' }
            ].map(type => {
              const isSelected = selectedTypes.includes(type.key);
              const isCurrentType = currentType === type.key;

              return (
                <motion.label
                  key={type.key}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${isSelected
                    ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-400 shadow-lg'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
                    } ${isCurrentType ? 'ring-2 ring-orange-400 ring-offset-2' : ''
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTypes(prev => [...prev, type.key]);
                      } else {
                        // No permitir deseleccionar todos
                        if (selectedTypes.length > 1) {
                          setSelectedTypes(prev => prev.filter(t => t !== type.key));
                          // Si se deselecciona el tipo actual, cambiar al primer seleccionado
                          if (type.key === currentType) {
                            const remaining = selectedTypes.filter(t => t !== type.key);
                            setCurrentType(remaining[0]);
                          }
                        }
                      }
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{type.emoji}</span>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-blue-700' : 'text-gray-700'
                        }`}>
                        {type.label}
                      </span>
                    </div>
                  </div>
                  {isCurrentType && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg"
                    >
                      <span className="text-white text-xs font-bold">✓</span>
                    </motion.div>
                  )}
                </motion.label>
              );
            })}
          </div>

          {selectedTypes.length > 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 p-4 bg-blue-100 border border-blue-200 rounded-xl"
            >
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <strong>Edición múltiple activada:</strong> Los cambios se aplicarán a {selectedTypes.length} tipos de menú: {selectedTypes.map(t => {
                    const typeInfo = [
                      { key: 'fullPack', label: 'Full Pack' },
                      { key: 'keto', label: 'Keto' },
                      { key: 'bajoCalorias', label: 'Bajo Calorías' },
                      { key: 'sinCarbos', label: 'Sin Carbos' },
                      { key: 'regular', label: 'Regular' },
                      { key: 'vegetariano', label: 'Vegetariano' },
                      { key: 'casaditos', label: 'Casaditos' }
                    ].find(type => type.key === t);
                    return typeInfo?.label;
                  }).join(', ')}.
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Editor de platos para el tipo actual (Visible en todos SALVO proteínas) */}
      {menus && currentMealType !== 'proteinas' ? (
        <div className="mt-4">
          <MenuEditor
            platos={
              currentMealType === 'desayuno'
                ? menus.desayuno || []
                : currentMealType === 'cena'
                  ? menus.cena?.[currentType] || []
                  : menus[currentType] || []
            }
            onChange={(platos) => handleMenusChange(
              currentMealType === 'desayuno'
                ? 'desayuno'
                : currentMealType === 'cena'
                  ? `cena_${currentType}`
                  : currentType,
              platos
            )}
            menuType={currentMealType === 'desayuno' ? 'desayuno' : currentType}
          />
        </div>
      ) : (
        <div className="mt-12 text-center text-gray-400">
          {loading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
              <p>Cargando editor...</p>
            </div>
          ) : (
            <p>No se pudieron cargar los datos.</p>
          )}
        </div>
      )}

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
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-semibold mb-1">
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

              {menus && Object.entries(menus).map(([key, platosRaw], index) => {
                const platos = Array.isArray(platosRaw) ? platosRaw : [];

                const LABELS = {
                  desayuno: 'Desayunos',
                  fullPack: 'Full Pack',
                  keto: 'Keto',
                  bajoCalorias: 'Bajo en Calorías',
                  sinCarbos: 'Sin Carbos',
                  regular: 'Regular',
                  vegetariano: 'Vegetariano',
                  casaditos: 'Casaditos'
                };

                const subtitles = {
                  desayuno: 'Menú de desayunos para packs de 15 comidas',
                  fullPack: 'Plan completo para toda la semana',
                  keto: 'Opciones bajas en carbohidratos',
                  bajoCalorias: 'Opciones ligeras y balanceadas',
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
                        <h3 className="text-sm font-semibold text-orange-500 tracking-wide">
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
                          className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-100 p-3 text-xs space-y-1 shadow-sm flex flex-col justify-between min-h-[120px] hover:shadow-md hover:border-orange-100 transition-all"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-orange-500 text-[13px]">
                              Plato {p.numero || '-'}
                            </p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-100">
                              Menú del día
                            </span>
                          </div>
                          {key === 'desayuno' ? (
                            // Etiquetas para desayunos
                            <>
                              <p className="text-[11px]">
                                <span className="font-medium text-gray-600">🍳 Plato: </span>
                                <span className="text-gray-700">{p.proteina || 'Por definir'}</span>
                              </p>
                              <p className="text-[11px]">
                                <span className="font-medium text-gray-600">🧈 Acompañamiento: </span>
                                <span className="text-gray-700">{p.vegetal || 'Por definir'}</span>
                              </p>
                              <p className="text-[11px]">
                                <span className="font-medium text-gray-600">☕ Bebida: </span>
                                <span className="text-gray-700">{p.carbo || 'Por definir'}</span>
                              </p>
                            </>
                          ) : (
                            // Etiquetas para almuerzo/cena
                            <>
                              <p className="text-[11px]">
                                <span className="font-medium text-gray-600">
                                  {(key === 'familiarPremium' || key === 'familiarDeluxe') ? 'Platillo:' : 'Proteína:'}
                                </span>
                                <span className="text-gray-700">{p.proteina || 'Por definir'}</span>
                              </p>

                              {/* Mostrar vegetales solo si no es familiar o si tiene contenido */}
                              {(key !== 'familiarPremium' && key !== 'familiarDeluxe') && (
                                <p className="text-[11px]">
                                  <span className="font-medium text-gray-600">Vegetales: </span>
                                  <span className="text-gray-700">{p.vegetal || 'Por definir'}</span>
                                </p>
                              )}

                              {/* Mostrar carbohidratos solo si no es familiar o si tiene contenido */}
                              {(key !== 'familiarPremium' && key !== 'familiarDeluxe') && (
                                <p className="text-[11px]">
                                  <span className="font-medium text-gray-600">Carbohidratos: </span>
                                  <span className="text-gray-700">{p.carbo || 'Por definir'}</span>
                                </p>
                              )}
                            </>
                          )}
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

      {/* Modal de Edición de Precios */}
      <AnimatePresence>
        {pricesOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
            onClick={() => setPricesOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header del Modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-green-500 to-green-600">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <DollarSign size={24} />
                    Editar Precios de Packs
                  </h2>
                  <p className="text-sm text-green-100 mt-1">
                    Configura los precios semanal, quincenal y mensual de cada pack
                  </p>
                </div>
                <button
                  onClick={() => setPricesOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Contenido del Modal */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {prices && Object.entries(prices).map(([categoryKey, categoryData]) => (
                  <div key={categoryKey} className="mb-8 last:mb-0">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-sm">
                        {categoryKey === '5_comidas' ? '5' : categoryKey === '10_comidas' ? '10' : categoryKey === '15_comidas' ? '15' : '2x'}
                      </span>
                      {categoryData.title}
                    </h3>

                    <div className="bg-gray-50 rounded-xl p-4">
                      {/* Header de la tabla */}
                      <div className="grid grid-cols-4 gap-4 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div>Pack</div>
                        <div className="text-center">Semanal</div>
                        <div className="text-center">Quincenal</div>
                        <div className="text-center">Mensual</div>
                      </div>

                      {/* Filas de packs */}
                      <div className="space-y-2">
                        {categoryData?.packs && Object.entries(categoryData.packs).map(([packName, packPrices]) => (
                          <div key={packName} className="grid grid-cols-4 gap-4 items-center bg-white p-3 rounded-lg border border-gray-100">
                            <div className="font-medium text-gray-800 text-sm">{packName}</div>
                            <div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₡</span>
                                <input
                                  type="number"
                                  value={packPrices.weekly}
                                  onChange={(e) => handlePriceChange(categoryKey, packName, 'weekly', e.target.value)}
                                  className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-center"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₡</span>
                                <input
                                  type="number"
                                  value={packPrices.biweekly}
                                  onChange={(e) => handlePriceChange(categoryKey, packName, 'biweekly', e.target.value)}
                                  className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-center"
                                />
                              </div>
                            </div>
                            <div>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₡</span>
                                <input
                                  type="number"
                                  value={packPrices.monthly}
                                  onChange={(e) => handlePriceChange(categoryKey, packName, 'monthly', e.target.value)}
                                  className="w-full pl-7 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none text-center"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer del Modal */}
              <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setPricesOpen(false)}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePrices}
                  disabled={loading}
                  className="px-6 py-2.5 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Guardando...' : 'Guardar Precios'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
