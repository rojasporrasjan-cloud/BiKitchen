import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { getOfficialMenus, ensureDesayunosExist } from '../../utils/firestoreMenus';
import { Utensils, ShoppingCart, Plus, Minus, MessageSquare, ChevronDown, Check, X, Coffee, Sun, Moon } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';

// Etiquetas legibles para cada tipo de menú de Firestore
const MENU_LABELS = {
  fullPack: 'Full Pack',
  keto: 'Keto',
  bajoCalorias: 'Bajo Calorías',
  sinCarbos: 'Sin Carbos',
  regular: 'Regular',
  vegetariano: 'Vegetariano',
  casaditos: 'Casaditos'
};

// Información de porciones por tipo de pack
const PACK_PORTIONS = {
  fullPack: {
    protein: '150g',
    carbos: 3,
    veggies: 2,
    description: 'Porción completa con máxima variedad',
    color: 'from-purple-500 to-indigo-500'
  },
  regular: {
    protein: '100g',
    carbos: 2,
    veggies: 1,
    description: 'Porción balanceada ideal para el día a día',
    color: 'from-blue-500 to-cyan-500'
  },
  bajoCalorias: {
    protein: '120g',
    carbos: 1,
    veggies: 2,
    description: 'Más vegetales, menos carbohidratos',
    color: 'from-green-500 to-emerald-500'
  },
  sinCarbos: {
    protein: '120g',
    carbos: 0,
    veggies: 3,
    description: 'Sin carbohidratos, máximos vegetales',
    color: 'from-red-500 to-orange-500'
  },
  keto: {
    protein: '200g',
    carbos: 0,
    veggies: 3,
    description: 'Alto en proteína y grasas saludables',
    color: 'from-amber-500 to-yellow-500'
  },
  vegetariano: {
    protein: 'Vegetal',
    carbos: 2,
    veggies: 2,
    description: 'Proteína 100% vegetal',
    color: 'from-lime-500 to-green-500'
  },
  casaditos: {
    protein: '100g',
    carbos: 2,
    veggies: 1,
    description: 'Estilo tradicional costarricense',
    color: 'from-orange-500 to-amber-500'
  }
};

// Tipos de comida disponibles
const MEAL_TYPES = {
  desayuno: { id: 'desayuno', label: 'Desayuno', icon: Coffee, color: 'bg-amber-500' },
  almuerzo: { id: 'almuerzo', label: 'Almuerzo', icon: Sun, color: 'bg-orange-500' },
  cena: { id: 'cena', label: 'Cena', icon: Moon, color: 'bg-indigo-500' }
};

export default function MenuDetailsModalWithTabs({ menuKey, isOpen, onClose, packInfo, mealTypes = ['almuerzo'], customAction = null, customTabContent = {} }) {
  const [loading, setLoading] = useState(false);
  const [allMenus, setAllMenus] = useState({});
  const [currentMealType, setCurrentMealType] = useState(mealTypes[0] || 'almuerzo');
  const [title, setTitle] = useState('Menú semanal');
  const [debugInfo, setDebugInfo] = useState(null);
  const scrollContainerRef = useRef(null);

  // Estados para personalización
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  // Cart context
  const { addToCart } = useCart();

  // Precio base del pack
  const basePrice = packInfo?.numericPrice || 0;
  const unitPrice = basePrice;
  const totalPrice = unitPrice * quantity;

  // Añadir al carrito
  const handleAddToCart = () => {
    addToCart({
      id: `menu-${menuKey}-${Date.now()}`,
      name: title,
      desc: packInfo?.desc || 'Menú semanal BiKitchen',
      image: '/assets/menu-default.jpg', // FORZADO: Usar imagen local para evitar costos de Storage
      price: unitPrice,
      numericPrice: unitPrice,
      quantity: quantity,
      menuKey,
      plan: packInfo?.plan || 'Semanal',
      customizations: {
        notes: notes.trim()
      }
    });

    toast.success(`${title} añadido al carrito`);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setQuantity(1);
    setNotes('');
    setShowNotes(false);
  };

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setCurrentMealType(mealTypes[0] || 'almuerzo');
    }
  }, [isOpen, mealTypes]);

  // Cargar menús oficiales
  useEffect(() => {
    if (!isOpen || !menuKey) return;

    const load = async () => {
      setLoading(true);
      try {
        // Asegurar que los desayunos existan: ELIMINADO en cliente público
        // Solo el admin debe inicializar datos. Aquí solo leemos.
        // if (mealTypes.includes('desayuno')) {
        //   await ensureDesayunosExist();
        // }

        // Forzar recarga desde Firebase (bypass cache) cada vez que se abre el modal
        const data = await getOfficialMenus(true);

        // Cargar menús según el tipo de pack
        const menus = {};
        const debug = {
          menuKey,
          mealTypes: mealTypes.join(', '),
          almuerzosDisponibles: data[menuKey]?.length || 0,
          cenasDisponibles: data.cena?.[menuKey]?.length || 0,
          desayunosDisponibles: data.desayuno?.length || 0,
          menusLoaded: []
        };

        // Cargar desayuno si está en mealTypes
        if (mealTypes.includes('desayuno')) {
          // Si es pack vegetariano, usar desayunos vegetarianos
          if (menuKey === 'vegetariano') {
            menus.desayuno = data.desayunoVegetariano || [];
            debug.menusLoaded.push(`desayuno vegetariano: ${menus.desayuno.length} platos`);
          } else {
            menus.desayuno = data.desayuno || [];
            debug.menusLoaded.push(`desayuno: ${menus.desayuno.length} platos`);
          }
        }

        // Cargar almuerzo si está en mealTypes
        if (mealTypes.includes('almuerzo')) {
          const platosAlmuerzo = data[menuKey] || [];
          menus.almuerzo = platosAlmuerzo.slice(0, 5);
          debug.menusLoaded.push(`almuerzo: ${menus.almuerzo.length} platos`);
        }

        // Cargar cena si está en mealTypes
        if (mealTypes.includes('cena')) {
          const platosCena = data.cena?.[menuKey] || [];
          menus.cena = platosCena.slice(0, 5);
          debug.menusLoaded.push(`cena: ${menus.cena.length} platos`);
        }

        setDebugInfo(debug);
        setAllMenus(menus);
      } catch (e) {
        console.error('[MenuDetailsModal] Error loading menu details', e);
        // Mostrar mensaje de error al usuario en lugar de fallar silenciosamente
        alert('Error cargando el menú desde Firebase. Por favor, verifica que los menús estén configurados correctamente en el admin.');
        setAllMenus({});
      }
      setLoading(false);
    };

    load();
  }, [isOpen, menuKey, mealTypes]);

  useEffect(() => {
    if (!menuKey) return;
    const label = MENU_LABELS[menuKey] || menuKey;
    setTitle(`Menú ${label}`);
  }, [menuKey]);

  const portionInfo = PACK_PORTIONS[menuKey] || PACK_PORTIONS.regular;
  const currentDishes = allMenus[currentMealType] || [];

  // Detectar si es menú sin carbohidratos (Keto o Sin Carbos)
  const isNoCarbsMenu = menuKey === 'keto' || menuKey === 'sinCarbos' || menuKey === 'cenaKeto' || menuKey === 'cenaSinCarbos';

  // Verificar si hay contenido personalizado para la pestaña actual
  const hasCustomContent = customTabContent && customTabContent[currentMealType];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        {/* Header con gradiente naranja BiKitchen */}
        <DialogHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {packInfo?.icon || '🍽️'}
              </div>
              <div>
                <DialogTitle className="text-white text-lg">{title}</DialogTitle>
                <p className="text-white/80 text-sm">5 platos diferentes por semana</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        {/* Tabs de tipo de comida (solo si hay más de un tipo) */}
        {mealTypes.length > 1 && (
          <div className="px-4 pt-4">
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              {mealTypes.map(type => {
                const mealType = MEAL_TYPES[type];
                const Icon = mealType.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setCurrentMealType(type)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${currentMealType === type
                      ? `${mealType.color} text-white shadow-md`
                      : 'text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    <Icon size={16} />
                    {mealType.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contenido con scroll */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 min-h-0"
          style={{
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Contenido personalizado (ej: botón de WhatsApp) */}
          {hasCustomContent && (
            <div className="py-4">
              {customTabContent[currentMealType]}
            </div>
          )}

          {/* Card de información de porciones */}
          {!hasCustomContent && currentMealType !== 'desayuno' && (
            <div className={`bg-gradient-to-r ${portionInfo.color} rounded-2xl p-4 text-white shadow-lg`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">📏</span>
                <h4 className="font-bold text-sm">Cada plato incluye:</h4>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">🍗</div>
                  <div className="text-lg font-bold">{portionInfo.protein}</div>
                  <div className="text-xs text-white/80">Proteína</div>
                </div>

                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                  <div className="text-2xl mb-1">🥦</div>
                  <div className="text-lg font-bold">{portionInfo.veggies}</div>
                  <div className="text-xs text-white/80">{portionInfo.veggies === 1 ? 'Vegetal' : 'Vegetales'}</div>
                </div>

                {!isNoCarbsMenu ? (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">🍚</div>
                    <div className="text-lg font-bold">{portionInfo.carbos}</div>
                    <div className="text-xs text-white/80">{portionInfo.carbos === 1 ? 'Carbo' : 'Carbos'}</div>
                  </div>
                ) : (
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">🚫</div>
                    <div className="text-lg font-bold">0</div>
                    <div className="text-xs text-white/80">Sin carbos</div>
                  </div>
                )}
              </div>

              <p className="text-xs text-white/90 text-center italic">
                ✨ {portionInfo.description}
              </p>
            </div>
          )}

          {!hasCustomContent && loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              <span className="ml-3 text-gray-500">Cargando menú...</span>
            </div>
          )}

          {!hasCustomContent && !loading && currentDishes.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Utensils size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">No hay platos definidos para este menú.</p>

              {debugInfo && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-left text-xs">
                  <p className="font-bold text-yellow-800 mb-2">🔍 Info de debugging:</p>
                  <div className="space-y-1 text-yellow-700">
                    <p><strong>Pack:</strong> {debugInfo.menuKey}</p>
                    <p><strong>Tipos solicitados:</strong> {debugInfo.mealTypes}</p>
                    <p><strong>Tipo actual:</strong> {currentMealType}</p>
                    <p><strong>Almuerzos en Firebase:</strong> {debugInfo.almuerzosDisponibles}</p>
                    <p><strong>Cenas en Firebase:</strong> {debugInfo.cenasDisponibles}</p>
                    <p><strong>Desayunos en Firebase:</strong> {debugInfo.desayunosDisponibles}</p>
                    <p><strong>Menús cargados:</strong></p>
                    <ul className="ml-4 list-disc">
                      {debugInfo.menusLoaded.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista de platos */}
          {!hasCustomContent && !loading && currentDishes.length > 0 && (
            <>
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Platos de la semana - {MEAL_TYPES[currentMealType]?.label}
                </h4>
                <div className="space-y-2">
                  {currentDishes.map((dish, index) => (
                    <div
                      key={dish.numero}
                      className="bg-white border border-gray-100 rounded-xl p-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {dish.numero}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="space-y-1">
                            {currentMealType === 'desayuno' ? (
                              // Formato para desayunos - fallback robusto
                              <div className="flex items-start gap-2">
                                <span className="text-xs text-gray-500 mt-0.5">🍳</span>
                                <p className="text-sm font-medium text-gray-800">
                                  {dish.proteina || dish.descripcion || dish.nombre || <span className="text-gray-400 italic">Sin descripción</span>}
                                </p>
                              </div>
                            ) : (
                              // Formato para almuerzo/cena
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">🍗</span>
                                  <p className="text-sm font-medium text-gray-800">{dish.proteina}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">🥦</span>
                                  <p className="text-xs text-gray-600">{dish.vegetal || '—'}</p>
                                </div>

                                {!isNoCarbsMenu && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">🍚</span>
                                    <p className="text-xs text-gray-600">{dish.carbo || '—'}</p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Anotaciones especiales */}
          {!hasCustomContent && !loading && currentDishes.length > 0 && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" />
                Anotaciones especiales
              </h4>

              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Sin zanahoria, sin repollo, alergia a mariscos, preferencia de proteína..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer con botón de añadir al carrito */}
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-bold text-lg w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-orange-500">₡{totalPrice.toLocaleString('es-CR')}</p>
            </div>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl"
          >
            <ShoppingCart size={20} />
            Añadir al carrito
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
